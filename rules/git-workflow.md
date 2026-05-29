---
trigger: always_on
---

# Git Workflow

## Branching

- Create new branches from `develop` before making changes
- Prefix branches with `claude/` (e.g., `claude/add-login-history-tests`)
- Use descriptive branch names that reflect the changes
- NEVER use "main", "master", or "develop" in branch names
- NEVER delete a branch you did not create

## Branching Strategy

Utilize the Gitflow branching model with `develop` as the main integration branch. Never target `main` or `master` for PRs. Never push directly to `develop`.

## Commits

- Make atomic commits focused on a single concern
- Prefix commits with `feat:`, `fix:`, `chore:`, `docs:`, or `refactor:`
- DO NOT commit code before testing it - all code must be verified to work

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

## PR Format

- **Title**: Short but descriptive (e.g., `feat: add login-history tests`)
- **Body**: Include a list of key changes
- **Checklist**: Include what was added/fixed/updated

Example:
```
This PR adds tests for the login-history module.

- Added unit tests for LoginHistoryService
- Created mock repository for test isolation
- Verified edge cases and error conditions

Checklist:
- [x] Added new feature X
- [x] Fixed bug Y
- [x] Updated documentation
```
