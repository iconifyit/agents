
---
trigger: always_on
---

# Git Workflow

## Branching

- Create new branches from `develop` before making changes
- Prefix branches with `claude-cowork/` (e.g., `claude-cowork/add-login-history-tests`)
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
