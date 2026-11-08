#!/usr/bin/env bash
#
# readonly-mode.test.sh — behavioural test of how the engine chooses between the
# read-only path (no confirmations) and the mutating path (account prompt +
# final confirmation).
#
# The command the config runs is the first argument, so only the first argument
# may make a run read-only. A read-only word later on the line (e.g.
# `deploy.sh deploy synth`) must not skip the confirmations.
#
# Runs the real deploy.sh + deploy-lib.sh in a scratch repo with a stub `aws`
# on PATH and a config whose run_action only records its arguments. Prompts are
# answered "n" (or as a case specifies), so a mutating run must stop before
# run_action.
#
# Usage:
#   bash skills/deploy-script/tests/readonly-mode.test.sh [path/to/deploy-lib.sh]
# The optional argument tests a vendored copy instead of this skill's engine.

set -uo pipefail

kSKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
kENGINE="${1:-$kSKILL_DIR/deploy-lib.sh}"
kACCOUNT="123456789012"

failures=0

# All scratch repos live under one directory, removed on exit even when the
# test is interrupted.
kWORK="$(mktemp -d)"
trap 'rm -rf "$kWORK"' EXIT

# Builds a scratch repo, runs deploy.sh with the given arguments, and prints
# "<exit status>|<run_action calls>|<prompted>|<summary shown>". Prompt answers
# come from ANSWERS (one per line); every prompt is answered "n" by default.
run_deploy() {
    local here bin
    here="$(mktemp -d "$kWORK/run.XXXXXX")"
    bin="$here/stub-bin"
    mkdir -p "$here/cli" "$bin"
    cp "$kSKILL_DIR/deploy.sh" "$here/cli/deploy.sh"
    cp "$kENGINE" "$here/cli/deploy-lib.sh"

    cat > "$here/cli/deploy.config.sh" <<EOF
STACK_NAME="TestStack"
REQUIRED_TOOLS=()
REQUIRED_VARS=()
EXPECTED_AWS_ACCOUNT="$kACCOUNT"
VERIFY_AWS_ACCOUNT=true
READONLY_ARGS=(synth diff ls list)
run_action() { echo "\$*" >> "$here/run-action.log"; }
EOF

    cat > "$bin/aws" <<EOF
#!/usr/bin/env bash
case "\$*" in
    *"--query Account"*) echo "$kACCOUNT" ;;
    *list-account-aliases*) echo "test-alias" ;;
esac
EOF
    chmod +x "$bin/aws"

    local output status calls prompted=false summary=false
    output="$(cd "$here" && printf '%b\n' "${ANSWERS:-n\nn}" | PATH="$bin:$PATH" AWS_PROFILE=test-profile bash cli/deploy.sh "$@" 2>&1)"
    status=$?
    calls="$(cat "$here/run-action.log" 2>/dev/null)"
    # `read -p` prints no prompt when stdin is not a terminal, so the prompts
    # are detected by what the engine prints around them.
    grep -q -E 'Deployment cancelled|DEPLOYMENT SUMMARY' <<< "$output" && prompted=true
    grep -q 'DEPLOYMENT SUMMARY' <<< "$output" && summary=true
    rm -rf "$here"
    echo "$status|$calls|$prompted|$summary"
}

# Asserts one run's outcome.
#   $1 description, $2 expected run_action calls (empty = none),
#   $3 expected prompted (true/false), $4... deploy.sh arguments.
expect_run() {
    local description="$1" expected_calls="$2" expected_prompted="$3"
    shift 3
    local result status calls prompted
    result="$(run_deploy "$@")"
    status="${result%%|*}"
    calls="$(cut -d'|' -f2 <<< "$result")"
    prompted="$(cut -d'|' -f3 <<< "$result")"
    if [ "$calls" = "$expected_calls" ] && [ "$prompted" = "$expected_prompted" ]; then
        echo "ok   - $description"
        return
    fi
    echo "FAIL - $description"
    echo "       args: $*"
    echo "       run_action calls: '$calls' (expected '$expected_calls')"
    echo "       prompted: $prompted (expected $expected_prompted), exit: $status"
    failures=$((failures + 1))
}

echo "Engine under test: $kENGINE"

# Read-only first argument: no prompts, the action runs.
expect_run "synth runs without prompting"              "synth"         false synth
expect_run "diff runs without prompting"               "diff"          false diff
expect_run "a read-only command keeps its extra flags" "synth --quiet" false synth --quiet

# Mutating first argument: prompted, and declining stops before the action.
expect_run "deploy is confirmed"                       ""              true  deploy
expect_run "no argument (deploy) is confirmed"         ""              true
expect_run "a trailing read-only word does not skip confirmation" "" true  deploy synth
expect_run "a trailing diff does not skip confirmation"           "" true  deploy diff

# Confirming the account still leads to the final go/no-go: declining it stops
# before the action.
result="$(ANSWERS='y\nn' run_deploy deploy synth)"
if [ "$(cut -d'|' -f2 <<< "$result")" = "" ] && [ "${result##*|}" = "true" ]; then
    echo "ok   - after the account is confirmed, the final go/no-go is still asked"
else
    echo "FAIL - after the account is confirmed, the final go/no-go is still asked"
    echo "       result: $result (expected no run_action call and the summary shown)"
    failures=$((failures + 1))
fi

if [ "$failures" -gt 0 ]; then
    echo "$failures failure(s)"
    exit 1
fi
echo "all passed"
