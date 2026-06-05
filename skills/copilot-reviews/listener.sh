#!/bin/bash
#
# Poll both Copilot review streams every 60s. On a newer-than-last review,
# emit a single notification line to stdout. The Monitor tool streams stdout
# lines as notifications, so each line surfaces to the assistant.
#
# IMPORTANT: uses `gh api --paginate` because the default first page of
# 30 results may not include the latest Copilot review if many other
# review submissions (e.g. from posting review-comment replies) push
# Copilot's reviews past page 1.

set -u

# Get the latest Copilot review's <submitted_at>|<commit_id> for one PR.
# Output is empty if no Copilot review exists.
latest_copilot_review() {
    local owner="$1" repo="$2" pr="$3"
    gh api --paginate "repos/${owner}/${repo}/pulls/${pr}/reviews" 2>/dev/null \
        | python3 -c "
import json, sys
data = []
for line in sys.stdin:
    s = line.strip()
    if s.startswith('['):
        try: data.extend(json.loads(s))
        except: pass
copilot = [r for r in data if r.get('user', {}).get('login', '').startswith('copilot-pull-request-reviewer')]
if copilot:
    latest = sorted(copilot, key=lambda r: r['submitted_at'])[-1]
    print(latest['submitted_at'] + '|' + latest['commit_id'])
"
}

# Baseline = whatever Copilot's latest is RIGHT NOW. Future-only notifications.
baseline_server=$(latest_copilot_review vectopus-org vectopus-server 922)
baseline_eventbus=$(latest_copilot_review iconifyit event-bus 2)
last_server="$baseline_server"
last_eventbus="$baseline_eventbus"

echo "[listener] started. baseline server=${baseline_server%%|*} event-bus=${baseline_eventbus%%|*}"

while true; do
    sleep 60

    cur_server=$(latest_copilot_review vectopus-org vectopus-server 922)
    if [ -n "$cur_server" ] && [ "$cur_server" != "$last_server" ]; then
        ts="${cur_server%%|*}"
        commit="${cur_server##*|}"
        echo "[NEW REVIEW] server-v1 PR #922 — commit ${commit:0:7} — submitted ${ts}"
        last_server="$cur_server"
    fi

    cur_eventbus=$(latest_copilot_review iconifyit event-bus 2)
    if [ -n "$cur_eventbus" ] && [ "$cur_eventbus" != "$last_eventbus" ]; then
        ts="${cur_eventbus%%|*}"
        commit="${cur_eventbus##*|}"
        echo "[NEW REVIEW] event-bus PR #2 — commit ${commit:0:7} — submitted ${ts}"
        last_eventbus="$cur_eventbus"
    fi
done
