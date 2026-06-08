---
name: multi-agent-orchestration
description: >
  Fan a large, parallelizable effort out across a lead agent plus worker agents
  running in isolated git worktrees, coordinating through the plan-doc-as-checklist
  and git rather than a custom message bus. Use at the Implement stage of the
  agentic-collaboration workflow ONLY when serial single-agent work is the actual
  bottleneck (multi-hour planning, or N genuinely independent units). Defaults to
  "don't" — single-agent is the baseline; this skill is the escape hatch, not the
  norm.
---

# multi-agent-orchestration

The default is **one agent**. Reach for multiple agents only when serial work is
the *actual* bottleneck — not when "more agents sounds faster." Brooks' law
applies to agents too: coordination cost can swamp the parallelism gain, and a
botched integration is more expensive than the serial time you saved.

This skill operationalizes the single→multi-agent scaling described in the
agentic-collaboration workflow. The coordination layer is **git + the plan
doc**, not new infrastructure.

## When to go multi-agent (and when NOT to)

| Project shape | Configuration | Why |
|---|---|---|
| Single fix / small feature | **Single agent** | Coordination overhead exceeds the savings |
| Larger feature, independent subsystems | Lead + 2–3 workers in worktrees | Lead owns the plan; workers execute disjoint pieces; lead integrates |
| Big refactor / migration | Planner + N layer-workers + reviewer | Plan the architecture once; parallelize the layers; reviewer cross-checks |
| Spike / research | One agent issuing parallel research subagents | Read-only fan-out; nothing to integrate but findings |

**The trigger test:** *Is serial work genuinely the bottleneck, AND are the
units genuinely independent?* If either answer is no, stay single-agent.

Independence test for a unit: it touches a disjoint set of files, has a
self-contained acceptance criterion, and doesn't need another in-flight unit's
output. Units that edit the same files are NOT independent — sequence them
instead.

## Prerequisites

- An **agreed plan doc** (the `plan-doc-checklist` skill) whose "Implementation
  order" decomposes into independent units. This is the handoff artifact — a
  worker gets the plan plus its assigned section.
- An agent tool that supports spawning subagents and **worktree isolation** so
  parallel workers don't trample each other's working tree.

## Roles

- **Lead** — owns the plan, decomposes the work, spawns workers, integrates
  their output at the PR boundary, runs the final verify. Holds the single PR.
- **Worker** — receives the plan + one section + an isolated worktree; executes
  its slice to green tests; reports back a concise result (what changed, where,
  test status). Does NOT open its own PR against the integration branch.
- **Reviewer** (optional, for refactors/migrations) — cross-checks worker
  output against the plan and the contract before integration.

## The patterns

### Map-reduce on independent units

1. **Lead decomposes** the plan's implementation order into independent units
   (disjoint files, self-contained acceptance criterion).
2. **Lead spawns one worker per unit**, each in its own worktree, with a
   *self-contained* brief: the goal, the plan section, the files in scope, the
   acceptance criterion, and "report what you changed + test status."
3. **Workers execute in parallel** to green tests in their worktrees.
4. **Lead integrates** — pulls each worker's changes onto the branch in plan
   order, resolves any incidental conflicts, runs the full suite, and only then
   proceeds to Verify. Integration is serial even when execution was parallel.

### Role specialization (often serial, not parallel)

Different prompts/contexts for different cognitive jobs — planner, implementer,
reviewer — taking turns. This is what the seven-step cadence already does within
one agent; formalizing the roles is the iteration when the work is large enough
to warrant a dedicated reviewer pass.

### Independent feature branches

When units are large enough to be separate PRs, git is the coordination layer —
worktrees + PRs, exactly how human teams parallelize. But honor **one PR at a
time against the integration branch**: stage the PRs, don't open them all at
once.

## What to AVOID (over-engineering traps)

- **Custom messaging bus between agents.** Real-time chatter has high
  context-switching cost — every message read is tokens spent.
- **Central coordinator registry.** State to maintain is not work getting done.
- **File-level locks.** Git already locks for code-shaped work; give workers
  disjoint files instead.
- **Agents that "talk" mid-task.** Each round-trip doubles context pressure.
  Workers should run to completion and report once, not negotiate continuously.
- **Parallelizing dependent units.** If unit B needs unit A's output, running
  them concurrently just produces a broken merge. Sequence them.

## What modern agentic tooling already gives you

No new infrastructure is needed to start:

- A subagent/Agent primitive for spawning specialized workers.
- Worktree-isolated execution so parallel workers don't collide (auto-cleanup
  when a worker makes no changes).
- Background tasks for async polling/watching.
- A memory layer for cross-session state.
- The plan-doc-as-checklist for sequential handoff.

## Writing a worker brief (the make-or-break step)

A worker starts with **no memory of the lead's session.** The brief must stand
alone:

- **Goal** — what this unit accomplishes and why it matters to the whole.
- **Plan section** — paste or link the exact implementation-order item(s).
- **Files in scope** — the disjoint set this worker owns; note what it must NOT
  touch.
- **Acceptance criterion** — the test(s) that prove the unit is done.
- **Report format** — "Reply with: files changed, what each change does, test
  status. Under N words."
- **Conventions** — point at the project's coding rules so the worker matches
  house style rather than inventing its own.

A terse brief produces shallow, off-pattern work that the lead then has to redo
— erasing the parallelism gain. Brief the worker like a smart colleague who
just walked in.

## Integration checklist (lead, after workers report)

1. Pull each worker's changes onto the branch **in plan order**.
2. Resolve incidental conflicts (disjoint-file decomposition should make these
   rare; frequent conflicts mean the units weren't actually independent —
   note that lesson).
3. Run the **full** suite + lint — not just the per-unit tests. Cross-unit
   regressions only show up here.
4. Reconcile the plan doc with what was actually built; amend in the same PR if
   reality diverged.
5. Proceed to the Verify stage (single PR, `copilot-review-loop`).

## Run it as an experiment first

The first time you use this on a project, **start small**: spawn ONE worker for
one well-isolated unit while the lead handles the rest serially. Observe the
friction — what handoff info was missing, where the worker stalled, what
integration cost emerged — and feed it back into how you brief and decompose.
Scale up only once the single-worker handoff is smooth.

## See also

- `agentic-collaboration` workflow — this skill is the Implement-stage fan-out.
- `plan-doc-checklist` skill — produces the decomposable handoff artifact.
- `copilot-review-loop` workflow — the single-PR Verify loop the lead runs after integration.
