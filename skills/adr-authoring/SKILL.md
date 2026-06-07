---
name: adr-authoring
description: >
  Author an Architecture Decision Record (ADR) for a significant technical
  decision. Use when the user asks to create, write, document, or capture
  an architectural decision, or when a non-trivial design choice needs to
  be recorded with context, rationale, consequences, and alternatives.
---

# Generate ADR Skill

Create Architecture Decision Records for technical decisions.

## When to Use

- Making significant architectural decisions
- Choosing between technical alternatives
- Documenting design trade-offs
- Recording rationale for future reference

## Quick Reference

ADR creation is currently manual — there is no helper script. Create the directory and seed the versioned file by hand, matching the storage layout below:

```bash
ADR_NUM=001                    # next available
TITLE=decision-title           # kebab-case
mkdir -p "docs/adr/ADR-${ADR_NUM}-${TITLE}"
touch "docs/adr/ADR-${ADR_NUM}-${TITLE}/ADR-${ADR_NUM}-${TITLE}-0.0.1.md"
```

## Workflow

1. **Identify decision** - What choice needs documentation?
2. **Research alternatives** - Gather evidence and performance data
3. **Create ADR** - Run script with title
4. **Fill sections** - Context, Decision, Rationale, Consequences, Alternatives
5. **Review** - Get team approval
6. **Update status** - Change from "Proposed" to "Accepted"

## ADR Format

All ADRs follow this structure:

```markdown
# ADR-XXX: Title

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Deciders**: Names/roles

## Context
What is the issue we're facing?

## Decision
What decision are we making?

## Rationale
Why this decision? Key reasons.

## Consequences
### Positive
- Benefit 1

### Negative
- Drawback 1

### Neutral
- Other impact 1

## Alternatives Considered
### Alternative 1
Why not chosen.
```

## Status Lifecycle

- **Proposed** - Under consideration
- **Accepted** - Decision made and active
- **Deprecated** - No longer recommended
- **Superseded** - Replaced by newer ADR

## Naming & Versioning

You will document architectural design decisions, implementation details, and testing strategies. This documentation will serve as a reference for the implementation and will help ensure that we are on the same page throughout the execution of the task. Documentation will be maintained in ./docs/ and linked to the relevant code and PRs. We will use semantic versioning for documentation as well. We will not over-write or discard old documentation, but will instead create new versions and link to them. Deprecated documents will have an h1 title of `[DEPRECATED]` at the very top of the first page.

For ADRs, we will maintain the following folder structure:

```text
./docs/adr/
    ./docs/ADR-001-<name>/ADR-001-title-of-decision.md
    + -- ADR-001-title-of-decision-0.0.1.md
    + -- ADR-001-title-of-decision-0.0.2.md
    ./docs/ADR-002-<name>/ADR-002-title-of-decision.md
    ...
```


## Storage Location

```text
./docs/adr/
    ./docs/ADR-001-<name>/ADR-001-title-of-decision.md
    + -- ADR-001-title-of-decision-0.0.1.md
    + -- ADR-001-title-of-decision-0.0.2.md
    ./docs/ADR-002-<name>/ADR-002-title-of-decision.md
    ...
```

## Error Handling

| Issue | Fix |
|-------|-----|
| Missing context | Add background and constraints |
| Unclear decision | Make decision more specific |
| Missing alternatives | Document at least 2 alternatives |
| No consequences | Think through positive and negative impacts |

## Implementation Plan

Before implementing an ADR, review it with the user and receive explicit approval to proceed. Create an implementation plan based on the ADR, outlining the steps needed to execute the decision. Follow the implementation plan closely, and if any deviations are necessary, stop, discuss with the user, and update the ADR and implementation plan accordingly.

Save implementation plan docs in :

```text
./docs/adr/
    ./docs/ADR-001-<name>/ADR-001-title-of-decision.md
    + -- ADR-001-title-of-decision-0.0.1.md
    + -- ADR-001-title-of-decision-0.0.2.md
    imp/
        ADR-001-<name>-implementation-plan.md
```

## References

- See existing ADRs in `/docs/adr/` for examples
- Related skill: `phase-plan-generate` for planning
