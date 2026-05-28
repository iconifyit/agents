# PROPOSAL — edit to `rules/git-workflow.md`

**Why:** During the eagle-ps-plugin session, a PR that started as "add an open-output-folder button" accumulated ~21 commits across ~12 unrelated concerns (button + devTools-off + icon + version bump + ship-prep cleanup + spike removal + pack tooling + deps cleanup + dead-code removal + inventory tooling + design-philosophy capture + folder-convention swap). Each addition felt small in isolation; the cumulative scope became hard to verify and ultimately got caught up in a history-rewrite disaster. The existing rule says "keep PRs focused" + "one open PR at a time" but offers no mechanism to enforce it against incremental scope-creep.

**Proposed change:** replace the existing `## Pull Requests` section with the version below (adds the scope-contract + three-strike mechanism; keeps all existing bullets).

---

## Pull Requests

- Resolve a single open PR before starting a new one (never more than one open PR)
- Target the original source branch (typically `develop`)
- NEVER target `main` or `master` for PRs
- Keep PRs focused on a single concern
- Avoid mixing unrelated changes
- Break large changes into smaller, manageable PRs

### Scope contract

Every PR opens with a one-line scope contract, stated in the plan doc and the PR body: **"This PR does X, and nothing else."** The contract is the test for whether a mid-PR addition belongs.

When a new concern surfaces while a PR is in flight, the default answer is **"follow-up PR"**, not "while I'm here." A change belongs in the current PR only if X literally cannot work or ship without it. Tidy-ups, adjacent improvements, "we should also…" ideas, and newly-noticed tech debt are follow-ups — capture them (memory note, TODO, issue) and move on.

### Three-strike rule

If a PR accumulates **three additions beyond its scope contract**, STOP and surface the drift to the user with three options:

1. **Split** — carve the extra work into separate PRs.
2. **Merge-and-restart** — land what's coherent now, start fresh branches for the rest.
3. **Abandon-and-recut** — if the branch has become a tangle, cut a clean branch and cherry-pick the coherent commits.

A sprawling PR is hard to review, hard to verify, and a bigger blast radius if anything goes wrong with the branch. Catching the drift at three strikes keeps PRs reviewable and recoverable.
