---
name: prune-obsolete
description: >
  Find and remove obsoleted artifacts — code, dependencies, files, docs, config, feature
  flags — that a prior change made dead but never removed. The discipline is to remove the
  obsolete at the point of obsolescence (see the remove-the-obsolete rule); this is the
  periodic safety net for what slips through. On-demand and manual.
---

# Prune Obsolete Workflow

The safety net for the `remove-the-obsolete` rule: a periodic, on-demand pass that finds and removes obsoleted artifacts a prior change left behind. Run it on demand — when a change supersedes a subsystem, or as an occasional manual audit. Start manual; automate (CI, scheduled, auto-opened PRs) only once the shape proves out.

## The sweep

1. **Detect with authoritative tooling, not eyeballs.** Use whatever the stack provides — code-reachability tools (e.g. `knip`, `esbuild --metafile`, dependency-cruiser for JS; the equivalent elsewhere), the package manager's unused-dependency analysis, and cross-referencing docs/config/flags against what the code actually uses.
2. **Verify each candidate is genuinely obsolete** — re-exports and ghost imports make dead code look live and live code look dead; verify per the `destructive-operations` skill, don't assume.
3. **Remove the verified-obsolete artifacts in a focused, single-concern PR.** Removal is destructive — the `destructive-actions` gates apply.
4. **Confirm nothing live broke** — tests and build green; the reachable graph unchanged except for the removals.

## Scope of "obsolete"

Code, dependencies, files/assets, documentation, configuration, feature flags, dead branches of logic — anything a past decision left behind.
