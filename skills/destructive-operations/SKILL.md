---
name: destructive-operations
description: >
  The discipline for any destructive or irreversible action, in any domain (version
  control, databases, filesystem, deploys, processes): verify the action's side effects
  before taking it — even if you think you know them — and catalog what you verified.
  Acting on an unverified assumption about side effects is the single root cause of
  irreparable damage.
---

# Destructive Operations Skill

Verify a destructive action's side effects before taking it — even if you think you know them — then act from a catalog of what you verified.

## The principle

Destructive-action disasters share one root cause: **acting on a faulty assumption about an action's side effects without verifying it first.** The *domain* is incidental — a git history rewrite, a `DROP TABLE`, an `rm -rf`, a force-deploy, or killing a process — they all fail the same way: you *thought* you knew what would happen, you were wrong, and the result couldn't be undone.

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
2. **Per-action approval** — show the exact action and get a specific "yes" for it. Intent-level approval ("clean these up") is not per-action approval.
3. **A confirmed recovery path** that the action itself cannot destroy.

## Hard-to-reverse operations: how to clear the dry-run gate

Some operations are hard enough to reverse that the `destructive-actions` rule requires a verified dry-run before you touch the real target — history rewrites, schema migrations that drop or rewrite data, bulk deletes without a tested `WHERE`, cache or data-store purges, infrastructure teardown. The rule names *what* qualifies and *that* the gate exists; this is *how* to clear it.

### 1. Dry-run on a disposable copy

Reproduce the operation on a throwaway target and inspect the actual result — do not assume it is surgical.

- **Operations on refs/objects** (`git filter-repo`, BFG): a bare mirror is enough — `git clone --mirror . /tmp/dry-run`.
- **Operations needing a worktree** (`rebase`, `reset --hard`): use a normal clone — `git clone . /tmp/dry-run && cd /tmp/dry-run && <operation>`.
- **Database migrations:** run against a scratch schema or a restored snapshot.

Then confirm the real blast radius: what changed, and did anything you did not intend to touch change too? `git filter-repo` rewrites ALL refs and ALL reachable commits by default — confirm, do not assume.

### 2. Enumerate second-order effects explicitly

Answer each of these in writing before proposing the operation:

- What downstream consumers reference the state that is about to change? (force-pushing rewritten history closes PRs whose head commits vanish; dropping a column breaks dependent views)
- Does anything else share or depend on the affected state? (another clone or branch, a replica, a downstream job)
- For git history specifically: is the merge-base with the integration branch preserved? If not, the branch becomes "unrelated history" and will not merge cleanly.
- What is the recovery path if it goes wrong, and **does it survive the operation?** A backup ref is NOT safe if the same operation rewrites all refs; a backup table is NOT safe if the migration drops the schema. Verify the recovery mechanism survives.

### 3. Ask whether the operation is worth doing at all

Weigh the disruption against the actual benefit before recommending it. A blob already pushed to a remote stays in that remote's history regardless of local purges — "cleaning" local history while the remote keeps the blob achieves little at real cost.

## Kill-switch

If the side effects aren't verified — not in the catalog, not confirmed from docs or a test — **STOP and verify before acting.** Never proceed on "I think this is safe."

If you cannot complete the dry-run, or the second-order effects are unclear, STOP and explain. Do not run the operation on the real target hoping it behaves as expected.
