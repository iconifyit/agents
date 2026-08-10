---
name: deploy-script
description: >
  Add (or fix) a guarded deploy script for a stack using the config-driven
  `deploy-script` skill. Vendor the identical engine (`deploy-lib.sh`) + thin
  entry (`deploy.sh`), then write the only bespoke file — `deploy.config.sh` —
  from the matching preset. The engine supplies the mandatory guardrails (robust
  `.env` loading, tool + required-var checks, AWS account verification, final
  confirmation, optional state backup) around a config-declared action. Claude
  authors the files; a human runs them.
---

# deploy-script

Stand up or repair a stack's deploy script to the standardized **config-driven guarded runner**. This workflow drives the `deploy-script` skill end to end.

## Trigger

Use when asked to add a deploy script to a stack that lacks one, or to bring an existing one up to standard (missing account confirmation, fragile `.env` loading via `source`/`set -a`, `npx cdk`/global shim, no required-var or tool checks, etc.).

## Steps

1. **Invoke the `deploy-script` skill.** It ships the engine (`deploy-lib.sh`), the thin entry (`deploy.sh`), a CDK preset (`deploy.config.cdk.sh`), and the guardrail reference — follow it.
2. **Vendor the two identical files.** Copy `deploy-lib.sh` and `deploy.sh` from the skill folder into the repo's `cli/` verbatim (vendored, not symlinked, so the script is self-contained for CI). Never edit these per stack.
3. **Analyze the stack** to fill the config: the stack/app name, the action to wrap (`cdk deploy` via the local binary, `terraform apply`, …), required env vars (AWS account/region + the stack's own creds/tokens), required tools, the read-only args (`synth`/`diff`/`plan`), build artifacts (Lambda zip, layer), and any mutable state a bad run could corrupt (→ `BACKUP_BUCKET`/`BACKUP_PREFIX`).
4. **Write `cli/deploy.config.sh`** — the only bespoke file — starting from the matching preset (`deploy.config.cdk.sh` for CDK). Declare `STACK_NAME`, `REQUIRED_TOOLS`, `REQUIRED_VARS`, `VERIFY_AWS_ACCOUNT`, `READONLY_ARGS`, the optional backup vars, and define `run_action()` (plus `build_artifacts()` / `pre_deploy()` / `post_deploy()` as needed).
5. **Verify.** `bash -n cli/deploy.sh cli/deploy-lib.sh cli/deploy.config.sh` (parse-only). Do **not** run the deploy.
6. **Hand off.** Claude authors the files; the human runs `bash cli/deploy.sh` — never deploy.

## Conditions

- The `deploy-script` skill is available (synced into `~/.claude/skills/`).
- For the bundled CDK preset, the target is a CDK stack (`cdk.json` / `aws-cdk-lib` app). Other actions are supported via a custom `run_action()`.
- If the deploy files are tracked, follow the repo's git workflow (branch + PR).

## Output

A `cli/` containing the vendored `deploy-lib.sh` + `deploy.sh` and a stack-specific `cli/deploy.config.sh` — guardrailed, robust `.env` loading, the local cdk binary (CDK preset) — verified to parse and ready for a human to run.
