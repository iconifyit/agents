#!/usr/bin/env bash
#
# deploy.config.cdk.sh — CDK PRESET. Copy to `cli/deploy.config.sh` and fill in.
#
# This is the ONLY bespoke file per stack. The engine (cli/deploy-lib.sh) and the
# thin entry (cli/deploy.sh) are byte-identical everywhere — vendor them as-is.
#
# Usage once installed:
#   bash cli/deploy.sh           # deploy (full guardrails: confirm + backup)
#   bash cli/deploy.sh synth     # read-only — skips confirmation + backup
#   bash cli/deploy.sh diff      # read-only — skips confirmation + backup

# --- Declarations -----------------------------------------------------------

# Shown in the deployment summary.
STACK_NAME="MyServiceStack"

# Banner title. The engine defaults to "<STACK> — Deployment" because it is
# action-agnostic; name the tool here, where CDK is actually the action.
DEPLOY_TITLE="${STACK_NAME} — CDK Deployment"

# CLIs that must be on PATH. `cdk` is invoked via the LOCAL binary below (not on
# PATH), so it is intentionally NOT listed here.
REQUIRED_TOOLS=(aws node npm)

# Env vars that must be set (loaded from .env or the environment) before deploy.
# AWS_PROFILE, EXPECTED_AWS_ACCOUNT, VERIFY_AWS_ACCOUNT and STACK_NAME are
# required by the engine itself, so they need not be repeated here.
REQUIRED_VARS=(AWS_ACCOUNT_ID AWS_REGION)

# The account id AWS_PROFILE must resolve to. REQUIRED — the engine compares the
# resolved caller identity against this and aborts on a mismatch, so an action
# cannot land in the wrong account even when the profile is wrong.
EXPECTED_AWS_ACCOUNT="123456789012"

# Verify the resolved AWS account before deploying. REQUIRED, and must be
# exactly "true" or "false" — any other value aborts rather than silently
# skipping the check. "false" skips the account comparison but NOT the
# AWS_PROFILE requirement; nothing ever falls back to ambient credentials.
VERIFY_AWS_ACCOUNT=true

# AWS_PROFILE is REQUIRED and is deliberately NOT defaulted here. Set it in
# .env (or export it) per checkout. The engine exits when it is unset rather
# than letting cdk fall back to the ambient default profile — which, in a
# checkout on a machine configured with several AWS accounts, is how an action
# reaches the wrong one.

# CDK subcommands that are read-only — skip the confirmation + backup.
READONLY_ARGS=(synth diff ls list)

# Optional pre-action S3 snapshot with restore-on-failure (e.g. ingest cursors).
# Leave unset to disable.
# BACKUP_BUCKET="my-service-state"
# BACKUP_PREFIX="cursors"

# Lambda layer directories to `npm install` before synth. Empty = none.
LAYER_DIRS=()

# --- Hooks ------------------------------------------------------------------

# Build artifacts before deploy (runs for every command, incl. synth/diff).
# Helpers info()/warn()/error() come from the engine, resolved at call time.
build_artifacts() {
    local dir
    for dir in "${LAYER_DIRS[@]:-}"; do
        [ -z "$dir" ] && continue
        info "Installing layer deps: $dir"
        ( cd "$HERE/$dir" && npm install --omit=dev --no-audit --no-fund --no-package-lock )
    done
}

# REQUIRED. The command the guardrails wrap. Uses the LOCAL cdk binary because a
# global dotenvx-wrapped `cdk` shim shadows it and exits 0 without synthesizing.
run_action() {
    local cmd="${1:-deploy}"
    # --profile is unconditional: require_config() has already established that
    # AWS_PROFILE is set. Omitting the flag would let cdk fall back to the
    # ambient default profile.
    "$HERE/node_modules/.bin/cdk" "$cmd" "$STACK_NAME" --profile "$AWS_PROFILE"
}

# Optional. Runs after a successful deploy (not for synth/diff). Use for
# next-steps output, registering a webhook, starting a poller, etc.
# post_deploy() {
#     info "Deploy complete. Next steps:"
#     echo "  1. ..."
# }
