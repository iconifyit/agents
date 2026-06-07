#!/bin/bash
#
# Poll the Copilot review stream for a single PR every 60s. When a review newer
# than the last-seen one appears, emit one notification line to stdout. Run this
# under a background-process / monitor primitive that streams stdout as
# notifications, so each line surfaces to the assistant.
#
# Usage: listener.sh <owner> <repo> <pr>
#
# Why --paginate + a concatenated-array parser: every reply you post to a review
# comment implicitly creates a COMMENTED review submission under your user. After
# a handful of replies, Copilot's actual review is pushed past the default 30-item
# first page. Without pagination the watcher silently returns nothing forever.
# `gh api --paginate` emits ONE JSON array per page (concatenated, not merged),
# so the parser below flattens all pages rather than calling json.load once.

set -u

if [ $# -ne 3 ]; then
    echo "usage: $0 <owner> <repo> <pr>" >&2
    exit 1
fi

OWNER="$1"
REPO="$2"
PR="$3"

# Emit "<submitted_at>|<commit_id>" per Copilot review, chronological.
# Empty output if there are none. Tolerates --paginate's concatenated arrays
# and transient gh failures (prints nothing rather than crashing the loop).
fetch_copilot_reviews() {
    gh api --paginate "repos/${OWNER}/${REPO}/pulls/${PR}/reviews" 2>/dev/null \
        | python3 -c "
import json, sys
raw = sys.stdin.read()
# --paginate concatenates one JSON array per page; flatten them all.
items, dec, idx = [], json.JSONDecoder(), 0
n = len(raw)
while idx < n:
    while idx < n and raw[idx] in ' \t\r\n':
        idx += 1
    if idx >= n:
        break
    try:
        obj, end = dec.raw_decode(raw, idx)
    except ValueError:
        break
    if isinstance(obj, list):
        items.extend(obj)
    idx = end
copilot = [r for r in items
           if str(r.get('user', {}).get('login', '')).lower().startswith('copilot')]
for r in sorted(copilot, key=lambda r: r.get('submitted_at') or ''):
    print((r.get('submitted_at') or '') + '|' + str(r.get('commit_id') or ''))
"
}

# Baseline = whatever Copilot's latest is RIGHT NOW; notify only on newer.
baseline_data=$(fetch_copilot_reviews)
# grep -c already prints "0" on no matches (and exits 1); swallow that exit
# with `|| true` rather than `|| echo 0`, which would append a second "0".
baseline_count=$(printf '%s' "$baseline_data" | grep -c . 2>/dev/null || true)
last=$(printf '%s\n' "$baseline_data" | tail -n 1)

echo "WATCH ARMED: ${OWNER}/${REPO} PR #${PR} Copilot. Baseline: ${baseline_count} review(s)."

while true; do
    sleep 60

    # Stop the watch if the PR is no longer open.
    state=$(gh api "repos/${OWNER}/${REPO}/pulls/${PR}" --jq '.state' 2>/dev/null || echo "")
    if [ "$state" = "closed" ]; then
        echo "PR #${PR} is closed/merged — stopping watch."
        break
    fi

    cur=$(fetch_copilot_reviews | tail -n 1)
    if [ -n "$cur" ] && [ "$cur" != "$last" ]; then
        ts="${cur%%|*}"
        commit="${cur##*|}"
        echo "[NEW REVIEW] ${OWNER}/${REPO} PR #${PR} — commit ${commit:0:7} — submitted ${ts}"
        last="$cur"
    fi
done
