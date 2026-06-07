---
name: copilot-review-loop
description: >
  The repeatable, low-friction loop for handling Copilot's review feedback
  on an actively-iterated PR: arm a listener, receive review events, fetch
  findings, triage, fix, verify green, commit, reply with addressing SHA,
  resolve threads, and re-request — until Copilot signs off. Pairs with
  the copilot-reviews skill (primitives) and listener.sh (event signal).
---

# copilot-review-loop

The repeatable, low-friction loop for handling Copilot's review feedback on an actively-iterated PR. Pairs with the `copilot-reviews` skill (which owns the primitives — reply, resolve, re-request) and the `copilot-reviews/listener.sh` listener that drives the event signal.

The loop converges in **3-7 rounds** when run cleanly. Each round is 10-20 minutes from "review event lands" → "reply posted + re-request fired". The cadence is what makes it feel smooth — small scope, fast iteration, no batched cleanup.

## Trigger

Activate this workflow when:

- A PR has just been opened and Copilot reviews are enabled (PR-level setting or org default).
- A fix commit has been pushed and Copilot is about to do another round.
- Copilot has already posted a review and it has not been addressed yet.

Do NOT activate when:

- The PR has no Copilot reviews configured (Copilot won't post anything).
- The findings have already been addressed and resolved (use `git log` + `gh pr view` to confirm before assuming).

## Pre-conditions

- The PR is on GitHub and you have repo write access via `gh` CLI.
- `gh auth status` is clean and has `repo` + `read:org` scopes.
- A working `git` checkout of the PR's branch, with the build/tests runnable locally.
- For the listener: enough background-task quota to run a persistent Monitor for the duration of the PR review cycle.

## Steps

### 1. Arm the listener (once per PR)

Launch the `copilot-reviews` listener in a persistent Monitor. It polls `/pulls/<PR>/reviews` (paginated — critical, see the skill's notes on why) and emits one stdout line per new Copilot review. Inline-comment findings are fetched on-demand after each review event (see step 3) rather than polled separately.

```python
Monitor(
    command="bash <path-to-skill>/listener.sh <org> <repo> <pr>",
    persistent=True,
    timeout_ms=3600000,
    description="Copilot reviews on PR #<pr>",
)
```

When you see `WATCH ARMED: <owner>/<repo> PR #<pr> Copilot. Baseline: <count> review(s).` in the Monitor's first emission, you're listening.

### 2. Receive a `NEW REVIEW` event

The Monitor surfaces it as a task notification. The summary will include the review ID and the body's opening line ("Copilot reviewed N out of M changed files...").

If the body says **"generated no new comments"** → Copilot has signed off. Skip to step 11.

Otherwise, fetch the inline-comment findings directly via `gh api` (see step 3). The listener only emits review-level events; inline comments are pulled on demand after each `NEW REVIEW`.

### 3. Fetch full findings

The notification truncates the body. Fetch full content for triage:

```bash
gh api --paginate repos/<org>/<repo>/pulls/<PR>/comments \
  --jq 'sort_by(.created_at) | reverse | .[] | select(.user.login | ascii_downcase | startswith("copilot")) | select(.in_reply_to_id == null) | "---\nID: \(.id)\nPATH: \(.path)\nLINE: \(.line // .original_line)\nBODY:\n\(.body)\n"'
```

`select(.in_reply_to_id == null)` filters to top-level findings only — replies don't need re-triage.

### 4. Triage each finding (1-2 sentences each)

- **Valid + cheap** → address now.
- **Valid + worth pushing back** → reply with citation per the `copilot-reviews` skill's push-back pattern. Resolve the thread but no code change.
- **Categorize by file type** (code / test / doc) so the fix commit groups cleanly.

### 5. Set up TaskCreate entries

One per finding + a final "commit / reply / resolve / re-request" task. This makes round progress visible and prevents the "reply before commit" mistake.

### 6. Make the fixes

Edit code → edit tests → edit docs in that order. Re-run any affected test suites after each set of changes so you fail fast rather than at the end.

### 7. Verify GREEN

Run the relevant test config explicitly. Common project-specific examples:

```bash
npx jest --config jest.service.config.js --runInBand --forceExit <test-path>
```

**Do not commit, do not reply, until the suite is green.** Replying with an addressing SHA that points at a broken commit makes the loop worse, not better — the next round will surface the same finding plus new ones from the regression.

### 8. Commit with a structured message

Use the [Structured commit pattern](../skills/copilot-reviews/SKILL.md#structured-commit-pattern) from the skill. Numbered findings, each with "Fix:" line, push-backs called out, test count at the bottom.

### 9. Push

```bash
git push 2>&1 | tail -3
SHA=$(git rev-parse HEAD | cut -c1-7)
```

### 10. Close the threads + re-request review

This is where the `copilot-reviews` skill takes over. For each finding:

1. **Reply** with the addressing SHA (`POST /pulls/<PR>/comments/<id>/replies`) — note the PR-scoped endpoint, the un-scoped form is a 404 trap.
2. **Resolve the thread** via the `resolveReviewThread` GraphQL mutation.
3. **Re-request** Copilot via `requestReviews` with `botIds: [<copilot-bot-id>]` and `union: true`.

For push-back replies, still resolve. Unresolved threads read as "open question" in the GitHub UI regardless of how thoroughly you explained.

### 11. Loop back to step 2

Wait for the next `NEW REVIEW` notification. Repeat until Copilot returns "generated no new comments" — that's the sign-off.

When that happens, **stop the Monitor** (`TaskStop`) and confirm the loop is complete to the user.

## Conditions / guards

- **Don't reply before commit lands on origin.** The reply links to a SHA; that SHA must be pushable / pullable for reviewers (human or bot).
- **Don't resolve before replying.** Resolution without a reply destroys the linkage between the finding and its fix.
- **Don't re-request before all threads are addressed.** Copilot's next pass will surface the same findings plus interpret your re-request as "I'm done" — misleading.
- **Don't auto-address findings that conflict with project rules.** Push back with citation. The skill documents the template.
- **Stop the listener when the PR merges or is closed.** Persistent Monitors aren't free; orphans accumulate.

## Output

When the loop converges (Copilot signs off with "no new comments"):

- All Copilot review threads on the PR are resolved.
- Each thread's last reply names the addressing commit SHA (or the push-back reasoning).
- A clean test suite green on the PR's HEAD commit.
- The Monitor is stopped.
- The PR is ready for human review / merge.

## See also

- `.agents/skills/copilot-reviews/SKILL.md` — the primitives (reply / resolve / re-request) this workflow orchestrates.
- `.agents/skills/copilot-reviews/listener.sh` — the polling listener that drives the loop's event signal.
- `.agents/skills/copilot-reviews/fetch-threads.gql` — for batch cleanup if the loop pattern breaks down.
- `.agents/workflows/module-pr.md` — the higher-level PR workflow this loop fits inside.
