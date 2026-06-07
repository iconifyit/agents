#!/bin/bash
#
# Poll the Copilot review stream for a single PR every 60s. On a newer-than-last
# review, emit a single notification line to stdout. The Monitor tool streams
# stdout lines as notifications, so each line surfaces to the assistant.
#
# Usage: listener.sh <owner> <repo> <pr>
#
# IMPORTANT: uses `gh api --paginate` because the default first page of
# 30 results may not include the latest Copilot review if many other
# review submissions (e.g. from posting review-comment replies) push
# Copilot's reviews past page 1.

set -u

if [ $# -ne 3 ]; then
    echo "usage: $0 <owner> <repo> <pr>" >&2
    exit 1
fi

OWNER="$1"
REPO="$2"
PR="$3"

# Fetch Copilot reviews. Output: each line is "<submitted_at>|<commit_id>"
# in chronological order. Empty output if there are no Copilot reviews.
fetch_copilot_reviews() {
    gh api --paginate "repos/${OWNER}/${REPO}/pulls/${PR}/reviews" 2>/dev/null \
        | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    data = []
copilot = [r for r in data if r.get('user', {}).get('login', '').startswith('copilot-pull-request-reviewer')]
for r in sorted(copilot, key=lambda r: r['submitted_at']):
    print(r['submitted_at'] + '|' + r['commit_id'])
"
}

# Baseline = whatever Copilot's latest is RIGHT NOW. Future-only notifications.
baseline_data=$(fetch_copilot_reviews)
baseline_count=$(printf '%s' "$baseline_data" | grep -c . 2>/dev/null || echo 0)
last=$(printf '%s\n' "$baseline_data" | tail -n 1)

echo "WATCH ARMED: ${OWNER}/${REPO} PR #${PR} Copilot. Baseline: ${baseline_count} review(s)."

while true; do
    sleep 60

    cur=$(fetch_copilot_reviews | tail -n 1)
    if [ -n "$cur" ] && [ "$cur" != "$last" ]; then
        ts="${cur%%|*}"
        commit="${cur##*|}"
        echo "[NEW REVIEW] ${OWNER}/${REPO} PR #${PR} — commit ${commit:0:7} — submitted ${ts}"
        last="$cur"
    fi
done
