---
trigger: always_on
---

# adversarial-review-agent

Every PR gets a review from **both** the `koala` and the `archie`, and every PR that reaches convergence then gets a `tess` pass before merge (see below). Request both automatically, without stopping to ask permission or for a go-ahead.

This is unconditional. It does not depend on whether Copilot reviewed the PR, and the adversarial reviewers are not a Copilot fallback — they run alongside it. The `copilot-reviews` skill and the `copilot-review-loop` workflow govern the Copilot loop only; neither relaxes this rule.

The two reviewers answer different questions. The `koala` attempts to falsify the correctness, security, and testing of the changed code. The `archie` verifies the change against the repository's architectural rules, design documents, ADRs, and established patterns. Neither substitutes for the other.

## Acting on the results

Request the reviews, poll or listen for the results, then act on every finding. The two agents emit different vocabularies, so the threshold is stated separately for each. For any possible output there is exactly one next action:

| Reviewer | Finding | Action |
| --- | --- | --- |
| `koala` | `[SEV: security]` or `[SEV: core]` | Fix now. Never deferrable. |
| `koala` | any finding marked `[fix-now]` | Fix now. |
| `koala` | `[defer-ok]` | Your judgment — fix it, or defer and open a GitHub issue. |
| `archie` | `BLOCKER` | Fix now. Never deferrable. |
| `archie` | `MAJOR` | Fix now. |
| `archie` | `MINOR` | Your judgment — fix it, or defer and open a GitHub issue. |

When you defer, open the GitHub issue before moving on. A deferral that leaves no tracked artifact is just an unrecorded decision. When you judge a `defer-ok` or `MINOR` finding important enough to fix, override the reviewer and fix it — the reviewer's triage is advice, not a ceiling.

## After convergence: Tess, then Archie on her changes

Convergence is not the end of the PR. Once both reviewers sign off, **invoke `tess`** on the implementation branch, before merge. She reconciles the descriptive documentation — decomposition documents, implementation-artifacts documents and diagrams — with the adopted ADRs and the accepted implementation, inside her own editable roots. She edits; she never commits. The orchestrator stages and commits her changes into the same PR, so the documentation lands with the implementation it describes.

Do not invoke her on review passes, during remediation, or after merge. Running her mid-loop documents a design that is still moving.

Her status decides what follows:

| Tess status | Next action |
| --- | --- |
| `NO CHANGE` | Nothing to review. Proceed to merge readiness. |
| `UPDATED` | Send her changes to `archie` for sign-off, then commit them. |
| `DISCREPANCY` | A real mismatch between the governing design and the implementation. Never edit documentation to make unauthorized drift look approved. Do not report the PR ready. |
| `BLOCKED` | Missing authority, a conflicting edit, or a validation she could not run. Resolve before merge. |

**Archie's purview on her changes is narrow and fixed: do Tess's changes accurately reflect the ADR and the state of the code in this PR?** Nothing else. Not a repeat of the PR review, not a reopening of settled decisions, not a fresh architectural opinion. He signs off on accuracy.

Calling Tess is yours, not his. She reports to you, you invoke her, you commit her changes; the only thing that goes to Archie is the question above.

The point of the step is that ADRs prescribe the design, the code implements it, the tests verify it, and the inventory describes what was built. A green suite does not establish that those four agree, and a passing review of code alone does not either.

## Convergence

After addressing the findings, request both reviews again. Repeat until each reviewer signs off:

- `koala` — a `RECOMMENDATION` of **Approve** or **Approve with suggestions**, with every remaining finding either fixed or tracked in an issue. Both are sign-off: deferring a `defer-ok` finding is authorized above, and a deferred finding is exactly what produces "Approve with suggestions", so treating only "Approve" as sign-off would make the loop non-terminating in its own designed common case.
- `archie` — a disposition of **PASS** or **PASS WITH NON-BLOCKING FINDINGS**, with every remaining finding either fixed or tracked in an issue.

Require a verdict from both on every PR. A review that produces no verdict has not finished, and the loop does not terminate on it.

Then run the Tess step above. A PR is not ready to report until her status is `NO CHANGE`, or `UPDATED` with Archie's sign-off on her changes and those changes committed.
