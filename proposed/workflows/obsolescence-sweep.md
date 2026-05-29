# DRAFT — proposed workflow `obsolescence-sweep` (was "dead-code audit")

> **Status:** draft for review (reframed first-principles: general "remove the obsolete",
> not "run knip on JS dead code").
>
> **Open questions for Scott:**
> - **Naming + split.** The *principle* (remove at the point of obsolescence) is rule-like;
>   the *periodic audit* is this workflow. The `documentation` rule's "Code being removed"
>   ADR section already encodes the principle for ADRs — do we want a standalone principle
>   too, or just this safety-net workflow?
> - **Trigger/cadence + automation.** On a schedule, on a superseding-ADR merge, or
>   on-demand? In CI or local? Auto-open removal PRs or propose? My lean: start on-demand
>   and manual; automate once the shape proves out.

---

```yaml
name: obsolescence-sweep
description: >
  Find and remove obsoleted artifacts — code, dependencies, files, docs, config, feature
  flags — that a prior change made dead but never removed. The discipline is to remove the
  obsolete at the point of obsolescence; this is the periodic safety net for what slips
  through. Use on a cadence or when a change supersedes a subsystem.
```

## The principle: remove the obsolete at the point of obsolescence

When a change makes something obsolete, **removing it is part of that change — not a separate "later" task.** Deferred removal tends not to happen: the obsolete artifact lingers, stays half-reachable, bloats the system, and misleads future readers about what's live. This failure mode isn't specific to code or to any tool — superseded modules, unused dependencies, stale docs, dead config, and abandoned feature flags all rot the same way.

The `documentation` rule's "Code being removed" ADR section and the `architecture-change` / `refactor` workflows already apply this **at decision time**. This workflow is the **safety net** for what escapes it.

## The sweep (the safety net)

Periodically, or when triggered (e.g. merging a decision that supersedes a subsystem):

1. **Detect with authoritative tooling, not eyeballs.** Use whatever the stack provides — code-reachability tools (e.g. `knip`, `esbuild --metafile`, dependency-cruiser for JS; the equivalent elsewhere), the package manager's unused-dependency analysis, and cross-referencing docs/config/flags against what the code actually uses.
2. **Verify each candidate is genuinely obsolete** (re-exports and ghost imports make dead code look live and live code look dead — verify per `destructive-operations`, don't assume).
3. **Remove the verified-obsolete artifacts in a focused, single-concern PR.**
4. **Confirm nothing live broke** (tests/build green; reachable graph unchanged except for the removals).

## Scope of "obsolete"

Code, dependencies, files/assets, documentation, configuration, feature flags, dead branches of logic — anything a past decision left behind.
