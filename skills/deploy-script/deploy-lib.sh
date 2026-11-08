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
#   STACK_NAME           string, names the stack                      (REQUIRED)
#   AWS_PROFILE          the AWS profile every action runs as          (REQUIRED)
#   EXPECTED_AWS_ACCOUNT the account id the profile MUST resolve to    (REQUIRED)
#   VERIFY_AWS_ACCOUNT   exactly "true" or "false"                     (REQUIRED)
#   DEPLOY_TITLE         cyan banner title (default "<STACK> — Deployment")     (optional)
#                        Set it per stack to name the tool (e.g. "CDK Deployment").
#   REQUIRED_TOOLS       array of CLIs that must be on PATH           (optional)
#   REQUIRED_VARS        array of env var names that must be set      (optional)
#   READONLY_ARGS        array of read-only commands; a run whose     (optional)
#                        FIRST argument is one skips the confirmation
#                        + backup (e.g. synth diff plan)
#   BACKUP_BUCKET        S3 bucket to snapshot pre-action             (optional)
#   BACKUP_PREFIX        S3 key prefix under that bucket
#                        (required and non-empty when BACKUP_BUCKET is set)
#   run_action()         REQUIRED function — the command to wrap. Receives "$@".
#   build_artifacts()    optional — build steps (zip, layer install, …)
#   pre_deploy()         optional — runs after confirm, before run_action
#   post_deploy()        optional — runs after a successful run_action
#
# The engine sets NO default for any variable that determines WHICH AWS account
# and profile an action runs against, and it never prompts for one. A missing
# value aborts before any AWS call. A default or a prompt here would mean
# falling back to the ambient credentials of whatever machine ran the script —
# on a workstation with several AWS accounts configured, that is an action
# against the wrong account, and the engine is generic enough to be vendored
# into a repo whose default profile belongs to an entirely different project.
#
# AWS_REGION is the sole exception and may fall back: it selects where resources
# go, not which account they go to, and a wrong region is visible and reversible.
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
    echo -e "${CYAN}    ${DEPLOY_TITLE:-${STACK_NAME:-Stack} — Deployment}${NC}"
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

# Required config + env vars — the engine's own AWS-targeting variables plus
# every name in REQUIRED_VARS, reported in ONE message.
#
# Called on EVERY path (read-only included) and BEFORE any AWS call or artifact
# build. Read-only actions such as `cdk diff` and `terraform plan` reach AWS
# too, and a guard placed inside verify_account would be skipped both by the
# read-only path and by VERIFY_AWS_ACCOUNT=false — after credentials had
# already been used.
kREQUIRED_CONFIG_VARS=(AWS_PROFILE EXPECTED_AWS_ACCOUNT VERIFY_AWS_ACCOUNT STACK_NAME)

# The tracked config owns the variables that pin the target account.
#
# deploy.sh sources deploy.config.sh (tracked, reviewed) and THEN main() calls
# load_env_file, which exports every key in .env (untracked, per-workstation).
# Without this check the untracked file silently outranks the committed one:
# VERIFY_AWS_ACCOUNT=false in .env disables the account comparison, and
# EXPECTED_AWS_ACCOUNT in .env replaces the committed pin.
#
# AWS_PROFILE is deliberately NOT owned here — it is per-machine and belongs in
# .env. What must not move is the pin itself.
kCONFIG_OWNED_VARS=(EXPECTED_AWS_ACCOUNT VERIFY_AWS_ACCOUNT STACK_NAME)

# Captured before load_env_file as NAME=value strings; bash 3.2 (the macOS
# default) has no associative arrays.
snapshot_config_vars() {
    kCONFIG_SNAPSHOT=()
    local var
    for var in "${kCONFIG_OWNED_VARS[@]}"; do
        kCONFIG_SNAPSHOT+=("$var=${!var:-}")
    done
}

# Errors rather than restoring the config's value, because restoring quietly
# picks a winner the operator never saw. A .env repeating the config's exact
# value is accepted — only a conflict is fatal.
assert_config_authority() {
    local entry var declared current
    for entry in "${kCONFIG_SNAPSHOT[@]}"; do
        var="${entry%%=*}"
        declared="${entry#*=}"
        current="${!var:-}"
        [ "$current" = "$declared" ] && continue
        if [ -z "$declared" ]; then
            error "$var is set in .env but not declared in cli/deploy.config.sh. It pins the target AWS account, so it must come from the tracked config — declare it there and remove it from .env."
        fi
        error "$var is '$current' in .env but '$declared' in cli/deploy.config.sh. The tracked config owns this value — remove it from .env."
    done
}

require_config() {
    local missing="" v
    for v in "${kREQUIRED_CONFIG_VARS[@]}" "${REQUIRED_VARS[@]:-}"; do
        [ -z "$v" ] && continue
        [ -n "${!v:-}" ] || missing="$missing $v"
    done
    # Names the environment, not `.env` specifically — these may legitimately
    # come from an export, CI secrets, or the shell, and blaming `.env` sends
    # debugging down the wrong path.
    [ -z "$missing" ] || error "Missing required config/environment variables (checked the environment, which may be populated from .env, exports, or CI):$missing"
    # Must be an exact boolean. A typo such as `yes` or `True` would otherwise
    # fall through verify_account's equality test and silently skip the account
    # check — a fail-open on the one guard that pins the target account.
    case "$VERIFY_AWS_ACCOUNT" in
        true|false) ;;
        *) error "VERIFY_AWS_ACCOUNT must be exactly 'true' or 'false' (got '$VERIFY_AWS_ACCOUNT')." ;;
    esac
    info "Configuration and environment variables validated."
}

# AWS account verification + confirmation (skipped when VERIFY_AWS_ACCOUNT=false).
#
# $1 is the confirmation mode, always passed explicitly: "confirm" also requires
# the operator to confirm interactively, "no-confirm" performs the machine check
# alone. The account comparison runs in BOTH modes — read-only actions such as
# `cdk diff` / `terraform plan` reach AWS too — while the human prompt is
# reserved for the mutating path, which is what keeps read-only actions fast.
#
# AWS_PROFILE is guaranteed set by require_config(), so this function neither
# defaults nor prompts for it. Prompting was itself a fail-open: it let a run
# continue without the operator having declared the target in config, and an
# absent-minded answer at the prompt is exactly the wrong-account deploy the
# guardrails exist to prevent.
verify_account() {
    [ "$VERIFY_AWS_ACCOUNT" = "true" ] || return 0
    info "Using AWS_PROFILE: $AWS_PROFILE"
    aws sts get-caller-identity --profile "$AWS_PROFILE" >/dev/null 2>&1 \
        || error "Failed to authenticate with AWS profile '$AWS_PROFILE'. Check your credentials."
    ACCOUNT_ID=$(aws sts get-caller-identity --profile "$AWS_PROFILE" --query "Account" --output text)
    ACCOUNT_ALIAS=$(aws iam list-account-aliases --profile "$AWS_PROFILE" \
        --query "AccountAliases[0]" --output text 2>/dev/null || echo "no-alias")

    section "AWS ACCOUNT VERIFICATION"
    echo "  Profile:      $AWS_PROFILE"
    echo "  Account ID:   $ACCOUNT_ID"
    echo "  Expected:     $EXPECTED_AWS_ACCOUNT"
    echo "  Account Name: $ACCOUNT_ALIAS"
    echo "  Region:       ${AWS_REGION:-us-east-1}"
    echo ""
    hr
    echo ""
    # Machine-checked before the human is asked. The prompt alone is a weak
    # gate — it is answered from memory, late in a session, and a declared
    # expected account turns "is this right?" into a verified fact.
    [ "$ACCOUNT_ID" = "$EXPECTED_AWS_ACCOUNT" ] \
        || error "Profile '$AWS_PROFILE' resolves to account $ACCOUNT_ID, not the expected $EXPECTED_AWS_ACCOUNT. Aborting."
    [ "$1" = "confirm" ] || { info "AWS account verified."; return 0; }
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
    echo "  AWS Profile:  $AWS_PROFILE"
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
            --profile "$AWS_PROFILE" --region "${AWS_REGION:-us-east-1}" --quiet \
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
    # --profile is unconditional: require_config() guarantees AWS_PROFILE on
    # every path, including VERIFY_AWS_ACCOUNT=false. Omitting the flag would
    # fall back to the ambient credential chain, so a backup could be read
    # from — or a failed deploy restored into — a different account than the
    # one being deployed to.
    if ! aws s3 sync "s3://${BACKUP_BUCKET}/${BACKUP_PREFIX}/" "$_backup_dir/${BACKUP_PREFIX}/" \
        --profile "$AWS_PROFILE" --region "${AWS_REGION:-us-east-1}" --only-show-errors; then
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
    # This loop MUST stay above load_env_file. On bash 3.2 `export "ARR=value"`
    # assigns element 0 of an existing array, so a .env carrying
    # READONLY_ARGS=<action> would otherwise make a mutating action look
    # read-only and skip both human gates. Deciding the path from the config's
    # value, before .env is read, is the only thing preventing that — the
    # natural refactor of "validate config first, then decide the path" breaks
    # it silently.
    #
    # Only the FIRST argument decides. It is the command run_action runs (the
    # presets use "$1"); later arguments are flags or extra words. Matching any
    # argument let `deploy.sh deploy synth` take the read-only path, skipping
    # both confirmations, while run_action still deployed.
    local readonly_mode=false r
    for r in "${READONLY_ARGS[@]:-}"; do
        [ -n "$r" ] && [ "${1:-}" = "$r" ] && readonly_mode=true
    done

    title_banner
    # Snapshot the config's declared values BEFORE .env can export over them.
    snapshot_config_vars
    load_env_file
    assert_config_authority
    check_tools
    # Before build_artifacts and before either path: nothing runs, and no AWS
    # call is made, until the target account and profile are explicitly set.
    require_config
    if type build_artifacts >/dev/null 2>&1; then build_artifacts; fi
    # The account is pinned on every path; only the prompt is reserved for a
    # mutating action.
    if [ "$readonly_mode" = "true" ]; then
        verify_account no-confirm
    else
        verify_account confirm
    fi
    if [ "$readonly_mode" != "true" ]; then
        confirm_action
        backup_state
        if type pre_deploy >/dev/null 2>&1; then pre_deploy; fi
    fi

    run_action "$@"

    # Optional hooks use `if` rather than `&&`: as the last statement of main(),
    # a false `type post_deploy` test would otherwise become main()'s exit
    # status and report a successful deploy as failed.
    if [ "$readonly_mode" != "true" ] && type post_deploy >/dev/null 2>&1; then
        post_deploy
    fi
    return 0
}
