---
name: copilot-reviews
description: >
  Close the review loop on GitHub Copilot PR reviews programmatically via `gh` CLI:
  author the repo's Copilot review prompt (.github/copilot-instructions.md) so
  reviews arrive prioritized and severity-tagged, reply to each unresolved
  Copilot thread with the addressing commit SHA, resolve the thread, then
  re-request review via the GraphQL `requestReviews` mutation (Copilot is a
  Bot, so it requires `botIds`, not `userIds`). A round is closed only when
  threads are answered AND pre-merge status checks are green (security checks
  especially). Use this whenever fixing Copilot review findings on a PR — the
  workflow keeps the PR threads as the source of truth for "what was found and
  where it was fixed", so the user is not stuck shuttling messages between the
  assistant and Copilot.
---

# copilot-reviews

**NOTE**: If Copilot is not available or fails to respond, request a review from the adversarial-pr-reviewer agent. Do not stop and ask permission or for the go-ahead. It should be automatic for every PR. Request the review, poll/listen for the results, fix any issues above defer-ok. For defer-ok issues, use your judgment. If the issue seems important, you can override the reviewer. If you choose to defer, open a GitHub issue. After addressing all issues, repeat the process until the reviewer approves for merge. Require the reviewer to give a verdict for every PR.

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

3. **Triage each finding** in 1-2 sentences, starting with its severity
   (see [Severity triage](#severity-triage) — use Copilot's `[SEV: …]` tag
   when present, assign one yourself when it isn't):
   - `security` / `core` → address now, this round
   - `edge` / `cosmetic` → fix if cheap, else defer with a GitHub issue
   - Valid but conflicts with a project rule → push back with citation (see [Push-back pattern](#push-back-pattern))
   - Doc-only / code-only / test-only → group fixes by file type for the commit

4. **Set up TaskCreate** entries for the round (one per finding + a final "commit/reply/re-request" task).

5. **Make the fixes**, then **run the test suite** for the affected code. **Verify GREEN before committing.** Replying with an addressing SHA that doesn't actually fix the issue is worse than not replying.

6. **Commit** with a structured message: numbered findings → fixes. See [Structured commit pattern](#structured-commit-pattern).

7. **Push.** Then confirm the pre-merge status checks go green before
   closing the round (see [Status checks are part of the review](#status-checks-are-part-of-the-review)).

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

11. **Loop back to step 2.** Watch surfaces the next event. Repeat until Copilot returns "no new comments" AND all pre-merge status checks are green — that's the sign-off. Resolved threads with a red check (especially a security check) is not done.

### Pattern B: Batch cleanup (FALLBACK — for accumulated stale threads)

**Use when** a series of fix cycles has accumulated many unresolved threads (dozens), or you've been replying without resolving and the GitHub UI is cluttered. Also: when the user asks "what's open on this PR" — fetch state via GraphQL instead of answering from memory.

This is the heavyweight closer pattern. The included helpers (`resolve-threads.py`, `fetch-threads.gql`) implement this end-to-end. See the [Worked example](#worked-example) below.

Key difference from Pattern A: at this scale you need a topic-regex map of `(pattern, commit_sha, summary)` tuples because you're correlating dozens of threads with dozens of historical commits. And you need to pace replies to avoid GitHub's abuse limiter (see [Rate-limiting](#rate-limiting-and-throttling)).

## Trigger

Use this skill:

- After pushing a fix commit that addresses one or more Copilot review findings (Pattern A — the common case).
- When a series of fix cycles has accumulated and many threads need closing (Pattern B).
- When the user asks "what's open on the PR" — confirm thread state via the [fetch query](#fetch-thread-state-with-graphql-ids) first, not from memory.
- When starting review work in a repo — verify the repo has a [Copilot review prompt](#author-the-copilot-review-prompt); author one if missing.

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

## Author the Copilot review prompt

Copilot code review reads standing custom instructions from two places:
the repo's `.github/copilot-instructions.md`, and — for Copilot
Business/Enterprise organizations — organization-level custom instructions
(org settings → Copilot → Custom instructions), which apply to every repo
in the org. GitHub combines both when reviewing. Left empty, Copilot
decides on its own what "review" means — you get generic, unranked
nitpicks. Part of this skill's job is to ensure the prompt is IN PLACE for
the target repo so every review is conducted the way we want: prioritized,
severity-rated, and aligned with project rules.

**The prompt is a canonical artifact, not something to compose on the fly.**
It lives in this skill directory as [`review-prompt.md`](review-prompt.md).
Authoring it fresh each time would produce a different prompt per repo per
session; copying the canonical file keeps review behavior deterministic
everywhere.

**Deployment is one-time per scope, not per-PR.** Once in place, Copilot
reads the instructions automatically on every review — nothing is sent per
review, and no per-branch action exists. When this skill is invoked for
review work, run a quick idempotent check and act only if coverage is
missing:

1. **Repo in a covered org** (Copilot Business/Enterprise, e.g.
   vectopus-org): the generic body of `review-prompt.md` (everything except
   the "Project rules" section) belongs in the org's Custom instructions
   settings — an admin pastes it from the canonical file. The settings box
   is NOT git-versioned, so it must be re-pasted when the canonical file
   changes. The repo's own `.github/copilot-instructions.md` then carries
   only the "Project rules that constrain the review" section.
2. **Personal-account repo** (no org settings available): the repo's
   `.github/copilot-instructions.md` gets the WHOLE file.
3. **Already covered:** do nothing. The check: does
   `.github/copilot-instructions.md` have a "Code review instructions"
   section (or does the org already carry the body)?

Adding or updating the repo file is a normal repo change — propose it to
the user and commit it on the current working branch (or a small dedicated
PR). Once merged to the default branch, it applies to all future reviews of
that repo. The ONLY permitted per-repo edits are the `<placeholders>` in
the "Project rules that constrain the review" subsection — fill those from
the repo's actual rule sources (CLAUDE.md / AGENTS.md / .agents/rules). Do
not rewrite, reorder, or paraphrase the rest.

The prompt directs Copilot to: scope the review to the PR's changes (no
drive-by findings on untouched code), review in priority order (security →
correctness → edge cases → tests → maintainability → style last), open
every finding with the exact format
`[SEV: security|core|edge|cosmetic] [fix-now|defer-ok] <summary>`, explain
trigger/result/cause, propose concrete fixes, deduplicate, skip anything
the repo's linter/formatter/type-checker already enforces, respect the
repo's documented conventions, and end with a severity-count summary (or
an explicit no-findings statement).

Caveats:

- There is no per-request API to instruct Copilot — the instructions file
  is the ONLY "ask Copilot how to review" mechanism, and it is advisory.
  When findings arrive untagged, classify them yourself during triage
  using the same scale (see [Severity triage](#severity-triage)).
- Untagged findings in a repo that HAS the prompt = the prompt is stale or
  being ignored; re-check the file's location and section heading.

## Severity triage

Severity decides what happens to a finding, before any fixing starts:

| Severity | Action |
|---|---|
| `security` | Fix NOW, this round. Blocks merge. Never defer, never push back on severity alone. |
| `core` | Fix this round. Blocks merge. |
| `edge` | Fix in-round if cheap; otherwise defer with a GitHub issue (below). |
| `cosmetic` | Fix if trivial (batch with other fixes); otherwise defer or push back per project rules. |

**Defer pattern** (`edge`/`cosmetic` only): create a tracking issue, link it
in the thread reply, then resolve the thread — deferral without a paper
trail is just ignoring the finding.

```bash
ISSUE_URL=$(gh issue create --repo <org>/<repo> \
  --title "Deferred from PR #<PR>: <one-line finding>" \
  --body "Copilot finding on PR #<PR> (comment <link>). Severity: <edge|cosmetic>. <details>" \
  --label "deferred-review" | tail -1)
gh api repos/<org>/<repo>/pulls/<PR>/comments/<commentId>/replies \
  -X POST -f body="Valid but deferred as ${ISSUE_URL} (severity: <edge|cosmetic>). <reasoning>"
```

As with push-backs, still resolve the thread after the defer reply — the
conversation is closed; the issue carries the work forward.

## Status checks are part of the review

Closing Copilot's threads is only half of "review passed." A comprehensive
round also verifies the PR's pre-merge status checks — ESPECIALLY security
checks (secret scanning, CodeQL/code scanning, dependency audit). A PR with
resolved threads and a red security check is NOT done.

Check them every round, after pushing:

```bash
# Summary of all checks on the PR (pass/fail/pending + URLs)
gh pr checks <PR> --repo <org>/<repo>

# Full detail when a check fails (name, conclusion, output summary)
gh api repos/<org>/<repo>/commits/$(git rev-parse HEAD)/check-runs \
  --jq '.check_runs[] | {name, conclusion, summary: .output.summary}'
```

Rules:

- **A failing check is a finding.** Triage it exactly like a Copilot
  comment: diagnose from the check's log URL, fix, push, re-verify. It gets
  a line in the structured commit message like any other finding.
- **Security checks are never deferred.** A failing secret-scan or
  code-scan check blocks the round regardless of how the thread triage
  went.
- **Pending ≠ passing.** After a push, wait for checks to complete before
  declaring the round closed (`gh pr checks <PR> --watch` blocks until
  done).
- **Sign-off condition:** the loop is finished when Copilot returns "no new
  comments" AND all status checks are green (loop step 11).

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

1. <Finding-1 one-line summary.> (SEV: <security|core|edge|cosmetic>)
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

Run via `gh api graphql -F owner=<org> -F name=<repo> -F number=<pr> -F query=@<path-to-skill>/fetch-threads.gql > /tmp/threads.json` (use the skill-relative path so it works from any cwd).

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
# 1. Fetch thread state. Use the skill-relative path so it works from any cwd.
gh api graphql -F owner=org -F name=repo -F number=922 \
  -F query=@<path-to-skill>/fetch-threads.gql > /tmp/threads.json

# 2. Write a config JSON (see resolve-threads.py's CONFIG SCHEMA docstring):
#    owner/repo/number, "threads": "/tmp/threads.json", commit_base,
#    reply_delay_seconds (>=12), and the ordered (regex, sha, summary) mapping.
cat > /tmp/cleanup-config.json <<'JSON'
{
  "owner": "org",
  "repo": "repo",
  "number": 922,
  "threads": "/tmp/threads.json",
  "commit_base": "https://github.com/org/repo/commit/",
  "reply_delay_seconds": 12,
  "mapping": [
    ["regex matched against the thread's first Copilot comment", "<sha>", "<one-line fix summary>"]
  ]
}
JSON

# 3. Reply + resolve in batches, paced (the script requires the config path).
python3 <path-to-skill>/resolve-threads.py /tmp/cleanup-config.json

# 4. Re-request Copilot.
gh api graphql -f 'query=mutation { requestReviews(input: { pullRequestId: "PR_...", botIds: ["BOT_..."], union: true }) { pullRequest { number } } }'
```

## See also

- `review-prompt.md` — the canonical Copilot review prompt; deployed once per scope (org Custom instructions settings for covered orgs, `.github/copilot-instructions.md` per repo otherwise; only the project-rules placeholders vary).
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
