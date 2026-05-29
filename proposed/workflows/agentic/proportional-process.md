# DRAFT — proposed `proportional-process` (was "tiered cadences + multi-agent")

> **Status:** draft for review (reframed first-principles: proportionality, not a fixed
> list of 2–3 cadences).
> **Pairs with:** the `agentic-collaboration` workflow (the full cadence + the
> single→multi-agent scaling section).
>
> **Open questions for Scott:**
> - **Placement.** A section *inside* `agentic-collaboration`, or a standalone doc it
>   references? It's closely tied to that workflow.
> - The bands below are points on a continuum, deliberately *not* a rigid taxonomy —
>   does that match your intent, or do you want named, bounded tiers?

---

```yaml
name: proportional-process
description: >
  Calibrate how much process a task gets to the stakes of the task — rather than running
  one fixed pipeline on everything or flying by the seat of your pants. Use to decide how
  much ceremony (analysis, planning, ADR, review, even how many agents) a given piece of
  work warrants.
```

## The principle: match process rigor to the stakes

The ceremony a task deserves is proportional to its stakes — roughly **size × complexity × reversibility × blast radius**. The failure modes are symmetric:

- **Too much** process on trivial, reversible work → friction, slowness, noise.
- **Too little** process on complex, irreversible, high-blast-radius work → the disasters (unverified destructive actions, sprawling PRs, wrong-direction builds).

The answer isn't a fixed heavyweight pipeline, and it isn't seat-of-the-pants. It's calibration.

## What raises the stakes (dial rigor up)

- **Irreversibility** / hard to undo → see `destructive-operations`.
- **Cross-cutting or architectural** surface — many consumers, shared contracts.
- **Ambiguity / unknowns** — needs analysis, or a spike to learn behavior.
- **Large blast radius** — shared state, production, other people's work.

Low on all of these → light process. High on any → more.

## Illustrative bands (a continuum, not boxes)

- **Rapid** — trivial, reversible, well-understood: describe + do, review the diff. Skip the formal cadence.
- **Standard (single agent)** — the full describe→analyze→plan→discuss→document→implement→verify cadence, collapsing any step that adds nothing.
- **Heavy / multi-agent** — large or architectural work: full cadence + an ADR, and possibly parallel agents.

Pick the **lightest band that covers the task's stakes**, and **escalate the moment stakes rise** — a "rapid" change that turns out to touch a shared contract becomes Standard mid-flight.

## Scaling to multiple agents (a sub-case of the same principle)

More agents is not more speed. Add parallelism **only when serial work is the actual bottleneck and the coordination cost is less than the parallelism gain** — Brooks' law ("adding people to a late project makes it later") applies to agents too. Default to a single agent; reach for multi-agent (a lead/architect + workers + a reviewer, with git as the coordination layer) only for genuinely independent, parallelizable work — never because "more agents sounds faster." The `agentic-collaboration` workflow's scaling section covers the concrete patterns.
