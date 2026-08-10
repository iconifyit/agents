#!/usr/bin/env bash
#
# deploy-lib.sh — generic guarded deploy/run engine.
#
# A reusable, ACTION-AGNOSTIC wrapper that puts the same preflight + guardrails
# around any deploy/run command (cdk, terraform, serverless, a raw script, …).
# It is sourced by a thin `cli/deploy.sh` AFTER `cli/deploy.config.sh`. Do NOT
# edit this per stack — vendor a copy and put everything stack-specific in the
# config.
#
# Config contract (set/define in cli/deploy.config.sh before this is sourced):
#   STACK_NAME           string, for display                         (optional)
#   DEPLOY_TITLE         cyan banner title (default "<STACK> — CDK Deployment") (optional)
#   REQUIRED_TOOLS       array of CLIs that must be on PATH           (optional)
#   REQUIRED_VARS        array of env var names that must be set      (optional)
#   VERIFY_AWS_ACCOUNT   "true"|"false" (default true)                (optional)
#   READONLY_ARGS        array of args that mean "read-only" — skip   (optional)
#                        the confirmation + backup (e.g. synth diff plan)
#   BACKUP_BUCKET        S3 bucket to snapshot pre-action             (optional)
#   BACKUP_PREFIX        S3 key prefix under that bucket
#                        (required and non-empty when BACKUP_BUCKET is set)
#   run_action()         REQUIRED function — the command to wrap. Receives "$@".
#   build_artifacts()    optional — build steps (zip, layer install, …)
#   pre_deploy()         optional — runs after confirm, before run_action
#   post_deploy()        optional — runs after a successful run_action
#
# `HERE` (the repo root) must be exported by the thin deploy.sh before sourcing.

# ---------------------------------------------------------------------------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
error() { echo -e "${RED}ERROR: $1${NC}" >&2; exit 1; }
warn()  { echo -e "${YELLOW}WARNING: $1${NC}"; }
info()  { echo -e "${GREEN}$1${NC}"; }

# Banner rules + a titled section header (matches the gh-flickr deploy output).
hr()  { echo -e "${YELLOW}============================================${NC}"; }
hrc() { echo -e "${CYAN}============================================${NC}"; }
section() {
    echo ""
    hr
    echo -e "${YELLOW}    $1${NC}"
    hr
    echo ""
}
# Cyan title banner printed once at the top of a run.
title_banner() {
    echo ""
    hrc
    echo -e "${CYAN}    ${DEPLOY_TITLE:-${STACK_NAME:-Stack} — CDK Deployment}${NC}"
    hrc
    echo ""
}

# Robust .env loader — line-by-line, strips quotes, PRESERVES SPACES in values.
# Never `source`/`set -a` a .env: a value with a space (e.g. /Current Projects)
# would be parsed as a command and break the run.
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

# Dependency check — every tool in REQUIRED_TOOLS must be on PATH.
check_tools() {
    local missing=() t
    for t in "${REQUIRED_TOOLS[@]:-}"; do
        [ -z "$t" ] && continue
        command -v "$t" >/dev/null 2>&1 || missing+=("$t")
    done
    [ ${#missing[@]} -eq 0 ] || error "Missing required tools on PATH: ${missing[*]}"
}

# Required env vars — every name in REQUIRED_VARS must be non-empty.
require_vars() {
    local missing="" v
    for v in "${REQUIRED_VARS[@]:-}"; do
        [ -z "$v" ] && continue
        [ -n "${!v:-}" ] || missing="$missing $v"
    done
    # Names the environment, not `.env` specifically — these may legitimately
    # come from an export, CI secrets, or the shell, and blaming `.env` sends
    # debugging down the wrong path.
    [ -z "$missing" ] || error "Missing required environment variables (checked the environment, which may be populated from .env, exports, or CI):$missing"
    info "Environment variables validated."
}

# AWS account verification + confirmation (skipped when VERIFY_AWS_ACCOUNT=false).
verify_account() {
    [ "${VERIFY_AWS_ACCOUNT:-true}" = "true" ] || return 0
    if [ -z "${AWS_PROFILE:-}" ]; then
        read -rp "Enter AWS profile name: " AWS_PROFILE
        [ -n "$AWS_PROFILE" ] || error "AWS profile name is required."
        export AWS_PROFILE
    fi
    info "Using AWS_PROFILE: $AWS_PROFILE"
    aws sts get-caller-identity --profile "$AWS_PROFILE" >/dev/null 2>&1 \
        || error "Failed to authenticate with AWS profile '$AWS_PROFILE'. Check your credentials."
    ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query "Account" --output text)
    ACCOUNT_ALIAS=$(aws iam list-account-aliases --profile "$AWS_PROFILE" \
        --query "AccountAliases[0]" --output text 2>/dev/null || echo "no-alias")

    section "AWS ACCOUNT VERIFICATION"
    echo "  Profile:      $AWS_PROFILE"
    echo "  Account ID:   $ACCOUNT_ID"
    echo "  Account Name: $ACCOUNT_ALIAS"
    echo "  Region:       ${AWS_REGION:-us-east-1}"
    echo ""
    hr
    echo ""
    read -rp "Is this the correct AWS account? (y/n) " REPLY
    [[ $REPLY =~ ^[Yy]$ ]] || error "Deployment cancelled. Please set the correct AWS profile."
    info "AWS account confirmed."
}

# Final go/no-go (skipped in read-only mode, see main()).
confirm_action() {
    local branch sha msg
    branch=$(git -C "$HERE" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    sha=$(git -C "$HERE" rev-parse --short HEAD 2>/dev/null || echo "unknown")
    msg=$(git -C "$HERE" log -1 --format="%s" 2>/dev/null || echo "unknown")

    section "DEPLOYMENT SUMMARY"
    echo "  AWS Profile:  ${AWS_PROFILE:-n/a}"
    echo "  AWS Account:  ${ACCOUNT_ID:-n/a} (${ACCOUNT_ALIAS:-n/a})"
    echo "  Region:       ${AWS_REGION:-us-east-1}"
    echo "  Stack:        ${STACK_NAME:-n/a}"
    echo "  Branch:       $branch"
    echo "  Commit:       $sha — $msg"
    echo ""
    hr
    echo ""
    read -rp "Proceed with deployment? (y/n) " REPLY
    [[ $REPLY =~ ^[Yy]$ ]] || { info "Deployment cancelled."; exit 0; }
}

# Optional generic S3 backup + restore-on-failure trap (only if BACKUP_BUCKET set).
_backup_dir=""
_restore_on_failure() {
    local code=$?
    [[ -n "$_backup_dir" && -d "$_backup_dir" && $code -ne 0 ]] || return 0
    warn "Action failed (exit $code). Restoring s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/ from backup..."
    local f rel
    while IFS= read -r -d '' f; do
        rel="${f#"$_backup_dir"/}"
        aws s3 cp "$f" "s3://$BACKUP_BUCKET/$rel" \
            ${AWS_PROFILE:+--profile "$AWS_PROFILE"} --region "${AWS_REGION:-us-east-1}" --quiet \
            || warn "  failed to restore: $rel"
    done < <(find "$_backup_dir" -type f -print0)
}
backup_state() {
    [ -n "${BACKUP_BUCKET:-}" ] || return 0
    # BACKUP_PREFIX must be non-empty once BACKUP_BUCKET is set. Unset trips
    # `set -u` and aborts mid-deploy; empty is worse and silent — the URIs
    # collapse to "s3://bucket//", the sync pulls the whole bucket, and
    # _restore_on_failure derives keys relative to $_backup_dir with no prefix,
    # so a failed deploy would write every object back to the bucket root.
    [ -n "${BACKUP_PREFIX:-}" ] || error "BACKUP_BUCKET is set but BACKUP_PREFIX is empty or unset. Set a non-empty BACKUP_PREFIX, or unset BACKUP_BUCKET to skip backups."
    _backup_dir=$(mktemp -d "${TMPDIR:-/tmp}/deploy-backup-XXXXXX")
    info "Backing up s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/ ..."
    local n=0
    # Sync rather than list-then-copy. `--output text` returns the keys
    # tab-separated on one line, and an unquoted `for k in $keys` word-splits
    # on IFS — so a single key containing a space or tab silently became two
    # bogus keys, both copies failed, and the backup completed "successfully"
    # while missing objects. A partial backup is worse than none here, because
    # _restore_on_failure would then restore incomplete state over the real
    # bucket. `s3 sync` never parses keys.
    #
    # The prefix directory is preserved locally ("$_backup_dir/$BACKUP_PREFIX/")
    # because _restore_on_failure derives the destination key from the path
    # relative to $_backup_dir — mirroring the prefix keeps that mapping exact.
    # A sync failure is fatal, not a warning. BACKUP_BUCKET being set is an
    # explicit request for a restore-on-failure safety net; proceeding without
    # one because auth/region/network failed would deploy with no way back,
    # and the "nothing to back up" branch below would misreport the cause.
    # The profile flag is conditional because VERIFY_AWS_ACCOUNT=false skips
    # verify_account, which is the only place AWS_PROFILE gets set. A bare
    # "$AWS_PROFILE" would then abort under `set -u` before any backup ran.
    # Omitting the flag falls back to the default credential chain, which is
    # the whole point of running with account verification disabled (CI roles,
    # instance profiles, env-var credentials). Same form the CDK preset uses.
    if ! aws s3 sync "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/" "$_backup_dir/${BACKUP_PREFIX}/" \
        ${AWS_PROFILE:+--profile "$AWS_PROFILE"} --region "${AWS_REGION:-us-east-1}" --only-show-errors; then
        error "Backup of s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/ failed. Refusing to deploy without the backup that BACKUP_BUCKET requested."
    fi
    n=$(find "$_backup_dir" -type f | wc -l | tr -d '[:space:]')
    if [ "$n" -gt 0 ]; then
        info "  backed up $n object(s)"
        trap _restore_on_failure EXIT
    else
        warn "  nothing to back up."
        _backup_dir=""
    fi
}

# Orchestrator. The thin deploy.sh calls `main "$@"`.
main() {
    type run_action >/dev/null 2>&1 || error "cli/deploy.config.sh must define run_action()."

    # Read-only mode (e.g. synth/diff/plan): skip confirmation + backup.
    local readonly_mode=false a r
    for a in "$@"; do
        for r in "${READONLY_ARGS[@]:-}"; do
            [ -n "$r" ] && [ "$a" = "$r" ] && readonly_mode=true
        done
    done

    title_banner
    load_env_file
    check_tools
    type build_artifacts >/dev/null 2>&1 && build_artifacts
    verify_account
    require_vars
    if [ "$readonly_mode" != "true" ]; then
        confirm_action
        backup_state
        type pre_deploy >/dev/null 2>&1 && pre_deploy
    fi

    run_action "$@"

    [ "$readonly_mode" = "true" ] || { type post_deploy >/dev/null 2>&1 && post_deploy; }
}
