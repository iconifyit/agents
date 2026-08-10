---
name: deploy-script
description: >
  Config-driven, action-agnostic "guarded runner" for deploy scripts. Ships a
  generic engine (`deploy-lib.sh`) + a thin entry (`deploy.sh`) that are
  byte-identical everywhere, plus a per-stack config (`deploy.config.sh`) that is
  the ONLY bespoke file. The engine wraps any action (cdk/terraform/serverless/a
  raw command) in the mandatory guardrails — robust `.env` loading, tool +
  required-var checks, AWS account verification, final confirmation, optional
  state backup. Use whenever adding or fixing a deploy script. Claude AUTHORS the
  files; a human runs them.
---

# deploy-script

A deploy script is the single, human-run entry point for shipping a stack. Its
job is not just to run the action — it is to make a wrong, unconfirmed, or
misconfigured run *hard*. Rather than copy a 150-line bash script per stack and
let them drift, this skill ships a **config-driven guarded runner**:

| File | Per stack? | Role |
| --- | --- | --- |
| `cli/deploy-lib.sh` | **identical** | the engine — all guardrails + orchestration |
| `cli/deploy.sh` | **identical** | thin bootstrap: source config, source engine, `main "$@"` |
| `cli/deploy.config.sh` | **bespoke** | the ONLY file you edit per stack — pure declaration + `run_action()` |

The engine is **action-agnostic**: the config declares what to run via
`run_action()`, so the same guardrails wrap `cdk deploy`, `terraform apply`, a
`serverless` deploy, or a raw command. CDK is just the bundled preset.

## When to use

- A stack has no deploy script and you're asked to add one.
- An existing `deploy.sh` is missing guardrails (no account confirmation, no
  required-var check, fragile `.env` loading, `npx cdk`, …) — replace it with the
  engine + a config.

Claude authors the files; the human runs them (see the **never-deploy** rule).

## How to apply it to a stack

1. **Vendor the two identical files** into the repo's `cli/`: copy
   `deploy-lib.sh` and `deploy.sh` from this skill folder verbatim. They are
   vendored (not symlinked) so the script is self-contained for CI.
2. **Write `cli/deploy.config.sh`** — start from the matching preset in this
   skill folder (`deploy.config.cdk.sh` for a CDK stack) and fill in the
   declarations + `run_action()`. This is the only thinking step.
3. **Verify:** `bash -n cli/deploy.sh cli/deploy-lib.sh cli/deploy.config.sh`
   (parse-only). Do **not** run the deploy.
4. **Hand off.** The human runs `bash cli/deploy.sh`.

## The config contract

`cli/deploy.config.sh` is sourced before the engine. It declares:

| Name | Type | Meaning |
| --- | --- | --- |
| `STACK_NAME` | string | shown in the summary |
| `REQUIRED_TOOLS` | array | CLIs that must be on PATH (dependency check) |
| `REQUIRED_VARS` | array | env var names that must be non-empty |
| `VERIFY_AWS_ACCOUNT` | `true`/`false` | run the AWS account-confirm prompt (default `true`; set `false` for non-AWS actions) |
| `READONLY_ARGS` | array | args that mean "read-only" (e.g. `synth diff plan`) — skip confirmation + backup |
| `BACKUP_BUCKET` / `BACKUP_PREFIX` | string | optional pre-action S3 snapshot + restore-on-failure |
| `run_action()` | **function (required)** | the command the guardrails wrap; receives `"$@"` |
| `build_artifacts()` | function (optional) | build steps (zip, layer install) — runs every command |
| `pre_deploy()` / `post_deploy()` | function (optional) | run around a non-read-only `run_action` |

## Engine flow (fixed, in `deploy-lib.sh`)

```text
main "$@":
  require run_action()                         # config must define it
  detect read-only mode (args ∈ READONLY_ARGS)
  load_env_file                                # robust parser (below)
  check_tools                                  # REQUIRED_TOOLS on PATH
  build_artifacts        (if defined)
  verify_account                               # guardrail: account confirm (unless VERIFY_AWS_ACCOUNT=false)
  require_vars                                 # guardrail: REQUIRED_VARS present
  if not read-only:
      confirm_action                           # guardrail: final go/no-go
      backup_state       (if BACKUP_BUCKET)    # snapshot + restore-on-failure trap
      pre_deploy         (if defined)
  run_action "$@"                              # the wrapped action
  post_deploy            (if defined, not read-only)
```

## Non-negotiable guardrails (the reason the engine exists)

1. **AWS account verification** before any deploy — `aws sts get-caller-identity`,
   print Profile / Account / Alias / Region, prompt `correct account? (y/n)`,
   abort on anything but yes. (`VERIFY_AWS_ACCOUNT=false` only for non-AWS actions.)
2. **Final confirmation** — print the summary, prompt `Proceed? (y/n)`. Skipped
   only in read-only mode.
3. **Required-var validation** — collect and report ALL missing `REQUIRED_VARS`
   at once, before touching the action.
4. **Tool/dependency check** — every `REQUIRED_TOOLS` entry must be on PATH.
5. **Robust `.env` loading** — line-by-line, strip quotes, honor `export `,
   PRESERVE SPACES. **Never** `set -a; . .env` / `source .env`: a value with a
   space (e.g. `DROPBOX_MONITORED_ROOT=/Current Projects`) is parsed as a command
   and the deploy breaks.
6. **Run the LOCAL `cdk` binary** (CDK preset) — `"$HERE/node_modules/.bin/cdk"`,
   never `npx cdk`/bare `cdk`: a global dotenvx-wrapped shim can shadow the CLI
   and exit 0 without synthesizing — a silent no-op deploy.
7. **Read-only actions stay fast** — args in `READONLY_ARGS` (e.g. `synth`,
   `diff`) skip confirmation + backup.
8. **Claude never runs it** — author the files; the human deploys.

## The robust `.env` loader (in the engine — do not reinvent per stack)

```bash
load_env_file() {
    local ENV_FILE="${1:-$HERE/.env}"
    [ -f "$ENV_FILE" ] || { warn "Env file $ENV_FILE not found. Skipping."; return 0; }
    info "Loading env vars from $ENV_FILE"
    local key value
    while IFS='=' read -r key value || [ -n "$key" ]; do
        key="$(echo "$key" | xargs)"
        [[ -z "$key" || "$key" == \#* ]] && continue
        [[ "$key" == export* ]] && key="$(echo "${key#export }" | xargs)"
        value="${value%\"}"; value="${value#\"}"; value="${value%\'}"; value="${value#\'}"
        export "$key=$value"
    done < "$ENV_FILE"
}
```

## CDK preset (`deploy.config.cdk.sh`)

The bundled preset wires the engine for a CDK stack: `REQUIRED_TOOLS=(aws node
npm)` (cdk is invoked via the local binary, not PATH), `READONLY_ARGS=(synth diff
ls list)`, a `build_artifacts()` that `npm install`s any `LAYER_DIRS`, and a
`run_action()` that runs the **local** cdk binary:

```bash
run_action() {
    local cmd="${1:-deploy}"
    "$HERE/node_modules/.bin/cdk" "$cmd" "$STACK_NAME" ${AWS_PROFILE:+--profile "$AWS_PROFILE"}
}
```

Invocation: `bash cli/deploy.sh` (deploy), `bash cli/deploy.sh synth` / `diff`
(read-only).

## Optional: pre-action state backup

If the stack owns mutable state a bad run could corrupt (e.g. ingest cursors in
S3), set `BACKUP_BUCKET`/`BACKUP_PREFIX`. The engine snapshots that prefix to a
temp dir and installs an `EXIT` trap that restores it on non-zero exit. Omit when
the stack only writes new objects.

## Notes & caveats

- **Vendored, not symlinked.** `deploy-lib.sh` + `deploy.sh` are copied into each
  repo so the deploy is self-contained in CI. This skill is the single source of
  truth — when the engine changes, re-vendor.
- **Lambda zip hash-skip:** for stacks that bundle a `lambda.zip`, do the
  hash-and-skip-if-unchanged in `build_artifacts()`. The zip is a gitignored
  build artifact — absent in a clean checkout — so any test needs to build first.
- **`--no-package-lock`** on layer `npm install` so a deploy leaves no untracked
  lockfile.
- Relates to the **never-deploy** rule (Claude authors, human runs) and the
  **command-narration** preference (explain state-changing steps).
- Engine reference derived from `gh-flickr/cli/deploy.sh`.
