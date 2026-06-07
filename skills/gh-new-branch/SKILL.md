---
name: gh-new-branch
description: >
  The discipline for creating a new feature branch in this repo's
  claude-cowork workflow: resolve any existing claude/ or claude-cowork/
  branch first (merge it if possible, STOP and ask the user if not). The
  always-on one-claude-branch rule states the boundary; this skill carries
  the discipline and STOP conditions; the new-claude-branch workflow is
  the ordered runbook. Use whenever a new branch is about to be created
  for agent work.
---

# gh-new-branch Skill

Resolve before you branch. There can only be ONE `claude/` or `claude-cowork/` branch open at a time (the `one-claude-branch` rule). This skill is the discipline that enforces that gate; the `new-claude-branch` workflow is the ordered runbook.

## The principle

A second concurrent claude-prefixed branch invites confusion about which branch is "real," competing PRs, and merge conflicts. Resolve first — branch second.

So, before creating a new `claude/` or `claude-cowork/` branch:

> **Resolve the existing one. If you can't, STOP and ask.**

## STOP conditions (ask the user)

Stop and ask whenever:

- An existing claude-prefixed branch has an open PR.
- A claude-prefixed branch has uncommitted changes or unpushed commits.
- A branch can't be cleanly merged into `develop` (conflicts).
- The intent of an existing branch can't be identified from PR or commit history.

When stopping, present:

- Branch name and where it lives (local / remote / both).
- PR state, commit state vs `develop`, uncommitted state.
- Why you stopped.

Then wait for instructions.

## Kill-switch

If you can't identify the state of every existing claude-prefixed branch — or if any STOP condition applies — **do not create the new branch.** Stop and ask. Branch creation is cheap; untangling two concurrent claude branches is not.
