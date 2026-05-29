# DRAFT — proposed skill `destructive-operations`

> **Status:** draft for review (revised: first-principles, domain-agnostic — not git-specific).
> **Pairs with:** the live `destructive-actions` rule (the boundary).
>
> **Open questions for Scott:**
> - This is really a **principle** — it may belong *in* the `destructive-actions` rule
>   rather than (or as well as) a skill. The skill would then carry the *how* (the catalog,
>   verification methods). Your call on rule vs skill vs both.
> - **Knock-on:** the live `destructive-actions` rule's "dry-run first" section is also
>   git-heavy and reads as a reaction to the one incident. It should get this same
>   first-principles, domain-agnostic reframe (separate PR — won't touch the live rule
>   without your go).

---

```yaml
name: destructive-operations
description: >
  The discipline for any destructive or irreversible action, in any domain (version
  control, databases, filesystem, deploys, processes): verify the action's side effects
  before taking it — even if you think you know them — and catalog what you verified.
  Acting on an unverified assumption about side effects is the single root cause of
  irreparable damage.
```

## The principle

Destructive-action disasters share one root cause: **acting on a faulty assumption about an action's side effects without verifying it first.** The *domain* is incidental — a git history rewrite, a `DROP TABLE`, an `rm -rf`, a force-deploy, killing a process all fail the same way: you *thought* you knew what would happen, you were wrong, and the result couldn't be undone.

So, before any destructive or irreversible action:

> **Verify the side effects of the action — even if you think you know them — before taking it. Do not act on an unverified assumption.**

## Verify, then catalog (so "verify" isn't a ritual)

"Verify even if you think you know" does **not** mean re-test the same thing forever. Verify the **first** time, then **catalog** what you confirmed. The catalog is your verified knowledge; afterward you act from it, not from memory or assumption. An action whose side effects are **not** in your verified catalog is, by definition, an unverified assumption — verify it before acting.

Ways to verify (cheapest first):
- **Authoritative documentation** — man pages, official docs.
- **A one-time experiment** on a disposable/throwaway target.
- **An existing catalog entry** you (or the team) previously verified.

## Catalog the side effects + verification

Record each verified destructive action so the verification is explicit, auditable, and reusable:

| Action | Verified side effects | How verified | Recovery path |
|---|---|---|---|
| _(example)_ `git filter-repo` | rewrites every commit SHA + all refs; branch loses its shared merge-base | official docs + one-time mirror test | re-clone from an intact remote |
| _(example)_ `DROP TABLE x` | removes table + all rows + dependent views/constraints | DB docs + test on a scratch schema | restore from backup/snapshot |

(Examples only — the catalog spans every domain, not just git.)

## The durable gates (every destructive action)

1. **Verified side effects + blast radius** — from the catalog, not from a guess.
2. **Per-command approval** — show the exact action and get a specific "yes" for it. Intent-level approval ("clean these up") is not per-action approval.
3. **A confirmed recovery path** that the action itself cannot destroy.

## Kill-switch

If the side effects aren't verified — not in the catalog, not confirmed from docs or a test — **STOP and verify before acting.** Never proceed on "I think this is safe."
