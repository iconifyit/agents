---
trigger: always_on
---

# adversarial-review-agent

Every PR gets a review from **both** the `adversarial-pr-reviewer` and the `adversarial-architecture-reviewer`. Request both automatically, without stopping to ask permission or for a go-ahead.

This is unconditional. It does not depend on whether Copilot reviewed the PR, and the adversarial reviewers are not a Copilot fallback — they run alongside it. The `copilot-reviews` skill and the `copilot-review-loop` workflow govern the Copilot loop only; neither relaxes this rule.

The two reviewers answer different questions. The `adversarial-pr-reviewer` attempts to falsify the correctness, security, and testing of the changed code. The `adversarial-architecture-reviewer` verifies the change against the repository's architectural rules, design documents, ADRs, and established patterns. Neither substitutes for the other.

## Acting on the results

Request the reviews, poll or listen for the results, then act on every finding. The two agents emit different vocabularies, so the threshold is stated separately for each. For any possible output there is exactly one next action:

| Reviewer | Finding | Action |
| --- | --- | --- |
| `adversarial-pr-reviewer` | `[SEV: security]` or `[SEV: core]` | Fix now. Never deferrable. |
| `adversarial-pr-reviewer` | any finding marked `[fix-now]` | Fix now. |
| `adversarial-pr-reviewer` | `[defer-ok]` | Your judgment — fix it, or defer and open a GitHub issue. |
| `adversarial-architecture-reviewer` | `BLOCKER` | Fix now. Never deferrable. |
| `adversarial-architecture-reviewer` | `MAJOR` | Fix now. |
| `adversarial-architecture-reviewer` | `MINOR` | Your judgment — fix it, or defer and open a GitHub issue. |

When you defer, open the GitHub issue before moving on. A deferral that leaves no tracked artifact is just an unrecorded decision. When you judge a `defer-ok` or `MINOR` finding important enough to fix, override the reviewer and fix it — the reviewer's triage is advice, not a ceiling.

## Convergence

After addressing the findings, request both reviews again. Repeat until each reviewer signs off:

- `adversarial-pr-reviewer` — a `RECOMMENDATION` of **Approve** or **Approve with suggestions**, with every remaining finding either fixed or tracked in an issue. Both are sign-off: deferring a `defer-ok` finding is authorized above, and a deferred finding is exactly what produces "Approve with suggestions", so treating only "Approve" as sign-off would make the loop non-terminating in its own designed common case.
- `adversarial-architecture-reviewer` — a disposition of **PASS** or **PASS WITH NON-BLOCKING FINDINGS**, with every remaining finding either fixed or tracked in an issue.

Require a verdict from both on every PR. A review that produces no verdict has not finished, and the loop does not terminate on it.
