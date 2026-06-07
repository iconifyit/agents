---
name: copilot-reviews
description: >
  Close the review loop on GitHub Copilot PR reviews programmatically via `gh` CLI:
  reply to each unresolved Copilot thread with the addressing commit SHA, resolve
  the thread, then re-request review via the GraphQL `requestReviews` mutation
  (Copilot is a Bot, so it requires `botIds`, not `userIds`). Use this whenever
  fixing Copilot review findings on a PR — the workflow keeps the PR threads as
  the source of truth for "what was found and where it was fixed", so the user
  is not stuck shuttling messages between the assistant and Copilot.
---

# copilot-reviews

The point of this skill: **make the PR itself the system of record.** When Copilot leaves a review comment, the addressing fix should be linked back on the PR thread (with the commit SHA), the thread should be resolved, and a re-review should be triggered — all programmatically, without asking the user to click anything.

## Two patterns

This skill supports two operating modes. They share the same primitives (reply with SHA, resolve thread, re-request via `botIds`) but differ in cadence.

### Pattern A: Interactive loop (PRIMARY — for an actively-iterated PR)

**Use when** a PR is in active review: each Copilot round produces a handful of findings (1-5), you fix them immediately, push, reply, re-request, wait for the next round. The loop usually converges in 3-7 rounds.

This is the "smooth back-and-forth" pattern. It feels good because the cycle is tight and each round's scope is small.

Optimal cadence per round: **10-20 minutes** from "review event lands" → "reply posted + re-request fired".

**Loop steps:**

1. **Arm the Monitor** (once per PR — see [Listener step](#step-0-arm-the-monitor) below). Persistent background poll that surfaces every new Copilot review/comment as a notification.

2. **When a `NEW REVIEW` event fires:** fetch the review body summary + all top-level inline comments (filter `in_reply_to_id == null` to skip replies). One `gh api` call.

3. **Triage each finding** in 1-2 sentences:
   - Valid + cheap → address now
   - Valid but conflicts with a project rule → push back with citation (see [Push-back pattern](#push-back-pattern))
   - Doc-only / code-only / test-only → group fixes by file type for the commit

4. **Set up TaskCreate** entries for the round (one per finding + a final "commit/reply/re-request" task).

5. **Make the fixes**, then **run the test suite** for the affected code. **Verify GREEN before committing.** Replying with an addressing SHA that doesn't actually fix the issue is worse than not replying.

6. **Commit** with a structured message: numbered findings → fixes. See [Structured commit pattern](#structured-commit-pattern).

7. **Push.**

8. **For each finding, reply** via `POST /repos/<org>/<repo>/pulls/<PR>/comments/<commentId>/replies` (note: PR-scoped endpoint — `pulls/comments/<id>/replies` without the PR number returns 404):

   ```bash
   gh api repos/<org>/<repo>/pulls/<PR>/comments/<commentId>/replies \
     -X POST -f body="Addressed in <SHA>. <one-line explanation>"
   ```

9. **Resolve each thread** via GraphQL (skipping this is a real omission — it leaves threads showing as open in the GitHub UI even after the addressing commit lands):

   ```bash
   gh api graphql -f 'query=mutation {
     resolveReviewThread(input: { threadId: "<graphql-thread-id>" }) {
       thread { isResolved }
     }
   }'
   ```

   To get the GraphQL thread IDs, use the [reviewThreads query](#fetch-thread-state-with-graphql-ids) — REST comment endpoints expose `databaseId` but not the thread node ID.

10. **Re-request Copilot** via the GraphQL `requestReviews` mutation with `botIds`:

    ```bash
    PR_ID=$(gh api repos/<org>/<repo>/pulls/<PR> --jq '.node_id')
    BOT_ID=$(gh api repos/<org>/<repo>/pulls/<PR>/reviews \
      --jq '.[] | select(.user.login | ascii_downcase | startswith("copilot")) | .user.node_id' | head -1)
    gh api graphql -f query='
    mutation($prId: ID!, $botId: ID!) {
      requestReviews(input: {pullRequestId: $prId, botIds: [$botId], union: true}) {
        pullRequest { number }
      }
    }' -F prId="$PR_ID" -F botId="$BOT_ID"
    ```

    `botIds` (not `userIds`) is required — Copilot's `__typename` is `Bot`. `union: true` preserves any existing human reviewer requests.

11. **Loop back to step 2.** Watch surfaces the next event. Repeat until Copilot returns "no new comments" — that's the sign-off.

### Pattern B: Batch cleanup (FALLBACK — for accumulated stale threads)

**Use when** a series of fix cycles has accumulated many unresolved threads (dozens), or you've been replying without resolving and the GitHub UI is cluttered. Also: when the user asks "what's open on this PR" — fetch state via GraphQL instead of answering from memory.

This is the heavyweight closer pattern. The included helpers (`resolve-threads.py`, `fetch-threads.gql`) implement this end-to-end. See the [Worked example](#worked-example) below.

Key difference from Pattern A: at this scale you need a topic-regex map of `(pattern, commit_sha, summary)` tuples because you're correlating dozens of threads with dozens of historical commits. And you need to pace replies to avoid GitHub's abuse limiter (see [Rate-limiting](#rate-limiting-and-throttling)).

## Trigger

Use this skill:

- After pushing a fix commit that addresses one or more Copilot review findings (Pattern A — the common case).
- When a series of fix cycles has accumulated and many threads need closing (Pattern B).
- When the user asks "what's open on the PR" — confirm thread state via the [fetch query](#fetch-thread-state-with-graphql-ids) first, not from memory.

Do NOT trigger speculatively for human review comments; humans usually want their own threads.

## Output

The skill produces side-effects on GitHub, not local artifacts:

- One reply per unresolved Copilot thread, posted via `POST /pulls/{N}/comments/{commentId}/replies`.
- Each replied thread marked resolved via the `resolveReviewThread` GraphQL mutation.
- A fresh review request to the Copilot bot via the `requestReviews` GraphQL mutation (using `botIds`, NOT `userIds`).

Optionally a `/tmp/<pr>-threads.json` snapshot for re-runs (Pattern B).

## Step 0: arm the Monitor

The interactive loop depends on a persistent background poll that notifies you the moment Copilot posts a new review. Arm it once per PR being iterated on.

```bash
gh api --paginate repos/<org>/<repo>/pulls/<PR>/reviews \
  --jq '.[] | select(.user.login | ascii_downcase | startswith("copilot")) | .id'
```

Wrapped in a polling loop — see `listener.sh` for a reference implementation. **Pagination is required.** Each reply you post implicitly creates a `COMMENTED` review submission under your user; a dozen+ replies push Copilot's actual review off the first page. Without `--paginate`, the listener silently misses new reviews.

Launch via:

```python
Monitor(
    command="bash listener.sh <org> <repo> <pr>",
    persistent=True,
    timeout_ms=3600000,
    description="Copilot reviews on PR #<pr>",
)
```

When `NEW REVIEW <id>: {...}` lands as a notification, proceed to step 2 of the loop.

## Push-back pattern

Not every Copilot finding should be addressed. When a finding conflicts with a documented project rule (CLAUDE.md, ADRs, `.agents/rules/*`), the right move is to push back with citation — NOT to silently ignore.

Reply template:

```text
Pushing back on this one. <Concrete reason rooted in code/data, not opinion.>
Per the project's <rule-name> rule (cite filename:section or quote):

> "<exact quoted rule text>"

<Explain why the rule applies to this specific finding.>
<Optionally: open to revisiting if the rule's scope should widen.>
```

Example from the wild (PR #926, server-v1):

> Pushing back on this one. `startDate` comes from `stripeUtils.getSubscriptionStartEndDate(...)` — an internal trusted source that wraps the Stripe SDK and is responsible for parsing the API response. Per the project's coding rule (CLAUDE.md): *"Don't add error handling, fallbacks, or validation for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries (user input, external APIs)."* The Stripe API is the external boundary; the validation belongs in `stripeUtils`, not in this service.

When pushing back, **still resolve the thread** after the reply — the conversation is closed even if the answer was "no". An unresolved thread reads as "open question" in the UI.

## Structured commit pattern

When a single commit addresses multiple findings, structure the commit message so each finding is identifiable later. Format:

```text
fix: address Copilot round <N> findings on PR #<number>

<count> findings, all valid:

1. <Finding-1 one-line summary.>
   <Brief description of the issue and why it matters.>

   Fix: <what the fix does.>

2. <Finding-2 ...>
   ...

[Optional] The N-th finding is intentionally NOT addressed here.
<Quote the rule + the reasoning.> Will reply on the PR with that
reasoning.

Tests: <N>/<M> pass.
```

This pattern makes the commit message a self-contained changelog for the round. Future readers (and Copilot's next review pass) can trace each fix back to its motivating finding.

## Fetch thread state with GraphQL IDs

REST only returns review comments (with `databaseId` int IDs); resolution state and node IDs require GraphQL:

```graphql
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          isOutdated
          comments(first: 50) {
            nodes {
              databaseId
              path
              line
              originalLine
              body
              author { login }
              createdAt
              commit { oid }
            }
          }
        }
      }
    }
  }
}
```

Run via `gh api graphql -F owner=<org> -F name=<repo> -F number=<pr> -F query=@fetch-threads.gql > /tmp/threads.json`.

For each unresolved thread (`isResolved: false`), filter for `author.login` containing `copilot`. The thread `id` is the GraphQL node ID needed for `resolveReviewThread`; the comment `databaseId` is the int ID needed for the reply endpoint.

## Rate-limiting and throttling

GitHub's abuse limiter flags rapid bursts of reply creation. After ~25-30 replies posted back-to-back, subsequent calls return:

```text
HTTP 422 Validation Failed
errors: [{ resource: "PullRequestReview", code: "abuse", field: "base" }]
```

Mitigations (Pattern B only — Pattern A's small rounds never hit this):

- Sleep at least **12 seconds** between replies in a single PR.
- Resolutions are not rate-limited the same way; resolve a batch first, then space the replies.
- If 422 hits, the cooldown is roughly an hour. Switch to the other PR or pause.

## Worked example

### Pattern A (interactive loop, single round)

```bash
# 1. Monitor already armed (step 0). NEW REVIEW notification fires.
# 2. Fetch new findings.
REVIEW_ID=4438164417
gh api --paginate repos/vectopus-org/vectopus-server/pulls/926/comments \
  --jq 'sort_by(.created_at) | reverse | .[] | select(.user.login | ascii_downcase | startswith("copilot")) | select(.in_reply_to_id == null) | "ID: \(.id)\nPATH: \(.path)\nLINE: \(.line // .original_line)\nBODY: \(.body)\n"' | head -50

# 3-7. Triage, fix, test, commit, push.
git commit -m "fix: address Copilot round 5 findings on PR #926 ..."
git push

# 8. Reply per finding.
SHA=f88b2c5
for CID in 3364190053 3364190096 3364190116; do
  gh api repos/vectopus-org/vectopus-server/pulls/926/comments/$CID/replies \
    -X POST -f body="Addressed in $SHA. ..."
done

# 9. Resolve threads (look up GraphQL thread IDs from fetch query first).
for TID in PRRT_xxx PRRT_yyy PRRT_zzz; do
  gh api graphql -f "query=mutation { resolveReviewThread(input: { threadId: \"$TID\" }) { thread { isResolved } } }"
done

# 10. Re-request review.
PR_ID=$(gh api repos/vectopus-org/vectopus-server/pulls/926 --jq '.node_id')
BOT_ID=$(gh api repos/vectopus-org/vectopus-server/pulls/926/reviews --jq '.[] | select(.user.login | ascii_downcase | startswith("copilot")) | .user.node_id' | head -1)
gh api graphql -f query='mutation($prId: ID!, $botId: ID!) { requestReviews(input: {pullRequestId: $prId, botIds: [$botId], union: true}) { pullRequest { number } } }' -F prId="$PR_ID" -F botId="$BOT_ID"

# 11. Wait for the next NEW REVIEW notification, or for "no new comments" (sign-off).
```

### Pattern B (batch cleanup)

```bash
# 1. Fetch thread state for both PRs.
gh api graphql -F owner=org -F name=repo -F number=922 \
  -F query=@/tmp/fetch-threads.gql > /tmp/server-threads.json

# 2. Resolve in batches, paced.
python3 /path/to/resolve-threads.py

# 3. Re-request Copilot.
gh api graphql -f 'query=mutation { requestReviews(input: { pullRequestId: "PR_...", botIds: ["BOT_..."], union: true }) { pullRequest { number } } }'
```

## See also

- `resolve-threads.py` — working reply+resolve implementation used to close ~60 Copilot threads across two PRs in one pass (Pattern B).
- `fetch-threads.gql` — GraphQL query for thread state with `isResolved`/`isOutdated`.
- `listener.sh` — paginated polling listener for use with the Monitor tool (Pattern A).
- `.agents/workflows/copilot-review-loop.md` — the step-by-step workflow that uses this skill.

## Notes & caveats

- **Outdated comments are real comments.** A thread marked `isOutdated: true` (because the line moved or the file changed) still surfaces in Copilot's UI as an active comment until it's resolved. Reply + resolve them too.
- **Duplicate threads happen.** Copilot occasionally posts the same comment 2-6 times in a single review; each is a separate thread. Treat them independently.
- **Resolution is not the same as agreement.** Resolving a thread says "we addressed this", not "the underlying concern was wrong". Don't resolve without a reply that names the addressing commit (or the push-back reasoning); otherwise the PR history loses the linkage.
- **botIds vs userIds vs teamIds.** `requestReviews` accepts all three lists; mixing them in the same call works. For Copilot specifically you MUST use `botIds`.
- **Use `union: true` when re-requesting.** Without it, existing human reviewer requests are wiped out.
- **Threads can be resolved while replying still works.** Resolution is purely metadata on the thread; the reply endpoint still accepts new comments on resolved threads.
- **Reply-as-review side effect.** `POST /pulls/{N}/comments/{id}/replies` causes GitHub to surface your reply via a freshly-created "COMMENTED" review entry under your user (visible in `/reviews`). This is invisible in the GitHub UI but inflates the `/reviews` list; combined with the default 30-result page size, it can hide Copilot's later reviews. Always use `--paginate` when reading `/reviews`.
- **The PR-scoped reply endpoint is `pulls/<PR>/comments/<id>/replies`, NOT `pulls/comments/<id>/replies`.** The latter returns 404. Easy mistake; verify the URL pattern when scripting.
- **Verify before reply.** Run tests after the fix commit. If they fail, the addressing SHA you'd post doesn't actually address anything. Reply only after verification.
