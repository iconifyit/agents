---
name: destructive-operation
description: >
  The ordered process for any irreversible or hard-to-reverse action, in any domain
  (version control, database, filesystem, deploy, process, external service): recognize
  it's destructive, establish current state, plan the action + blast radius + recovery,
  verify the side effects (don't assume), get per-action approval, execute
  least-to-most-destructive, then verify the result and recovery path.
---

# Destructive Operation Workflow

Use this workflow for any irreversible or hard-to-reverse action, in any domain. It pairs with the `destructive-actions` rule (the boundary) and the `destructive-operations` skill (the verify-and-catalog discipline).

## Stages

### 1. Recognize

Identify that the action is destructive or hard to reverse (data loss, irreversibility, effect on shared state). The domain is irrelevant. If unsure whether it qualifies, treat it as if it does.

### 2. Establish current state (read-only)

Capture what's true now using read-only checks only — what exists, what depends on it, what's already backed up. No state changes in this stage.

### 3. Plan

Write down the exact action(s), the **blast radius** (what changes and what's affected downstream), and a **recovery path**. Order the steps least-destructive → most-destructive: create/copy first, the irreversible step last.

### 4. Verify the side effects — don't assume

Confirm exactly what each action will do, **even if you think you know**. Verify from authoritative documentation or a one-time experiment on a disposable target, and record it in the side-effect catalog (action → effects → how verified → recovery). An action whose effects you haven't verified is an unverified assumption — the root cause of irreparable harm. If you can't verify, return to Plan or STOP.

### 5. Get per-action approval

Present the exact action + blast radius + recovery path and get an explicit "yes" for **that specific action**. Intent-level approval ("clean these up") is not per-action approval.

### 6. Execute

Run least-destructive → most-destructive, verifying each safe step before the irreversible one. If a guard, hook, or classifier blocks the action, stop and re-confirm — never bypass it.

### 7. Verify result + recovery

Confirm the intended result, that nothing outside the blast radius was affected, and that the recovery path is still intact. Report what was done.

## Iterate / abort

If verification shows unintended effects, STOP and surface it (per `when-you-make-a-mistake-stop`) before any corrective action — and get per-action approval for each remediation step.
