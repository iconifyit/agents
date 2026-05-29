---
trigger: always_on
---

# Remove the Obsolete

When a change makes something obsolete, **removing it is part of that change — not a separate "later" task.** Deferred removal tends not to happen: the obsolete artifact lingers, stays half-reachable, bloats the system, and misleads future readers about what is live. This applies to every kind of artifact, not just code — superseded modules, unused dependencies, stale docs, dead config, and abandoned feature flags all rot the same way.

So, as part of any change that obsoletes something:

> **Remove the obsoleted artifact in the same change that obsoletes it. Do not leave it "for reference" — that is what version control is for.**

- **Verify before removing.** Re-exports and ghost imports make dead code look live and live code look dead — confirm what is actually obsolete with authoritative tooling, not eyeballs (see the `destructive-operations` skill). Removal is itself a destructive action, so the `destructive-actions` gates apply.
- The `documentation` rule's "Code being removed" ADR section and the `architecture-change` / `refactor` workflows already enforce this at decision time.
- The `obsolescence-sweep` workflow is the periodic safety net for whatever still slips through.
