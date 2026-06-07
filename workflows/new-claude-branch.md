---
name: new-claude-branch
description: >
  The ordered runbook for creating a new claude/ or claude-cowork/ branch:
  detect any existing claude-prefixed branches, examine their status,
  resolve (merge or STOP), verify the base is current, then create with a
  descriptive name. Pairs with the one-claude-branch rule (the boundary)
  and the gh-new-branch skill (the discipline + STOP conditions). Use
  whenever a new agent branch is about to be created.
---

# New Claude Branch Workflow

Use this workflow whenever a new `claude/` or `claude-cowork/` branch is about to be created. It pairs with the `one-claude-branch` rule (the boundary) and the `gh-new-branch` skill (the discipline + STOP conditions).

## Stages

### 1. Detect

List local AND remote claude-prefixed branches:

- `git branch --list 'claude/*' 'claude-cowork/*'`
- `git ls-remote --heads origin 'claude/*' 'claude-cowork/*'`

### 2. Examine

For every claude-prefixed branch found, capture:

- Commits vs `develop`: `git log --oneline origin/develop..<branch>`
- PR state: `gh pr list --state all --head <branch>`
- Uncommitted or unpushed state on the branch.

### 3. Resolve

Decide per status:

| Status | Action |
|---|---|
| PR merged, branch fully in `develop` | Delete (per-action approval — deletion is destructive; the `destructive-actions` rule applies). |
| PR open | **STOP.** Don't open a second concurrent branch. |
| Uncommitted changes or unpushed commits | **STOP.** The user's WIP must be resolved first. |
| Ahead of `develop`, no PR, no clear intent | **STOP.** Likely abandoned — ask. |
| Cleanly mergeable into `develop`, no PR | Merge with per-action approval, then proceed. |

On any STOP, surface the status (branch name, where it lives, PR state, commit state vs `develop`, uncommitted state, why you stopped) and wait for instructions. See the `gh-new-branch` skill for the full STOP discipline.

### 4. Verify the base

`git fetch origin --prune` and confirm `develop` is at its remote head.

### 5. Create

`git checkout -b claude/<descriptive-name> develop`. Descriptive = what the branch is *for*, not a date or sequence number. Prefix conventions and base-branch rules per the `git-workflow` rule.

## Iterate / abort

If any STOP condition surfaces mid-workflow, halt at that stage — do not continue. Branch creation is cheap; untangling two concurrent claude branches is not.
