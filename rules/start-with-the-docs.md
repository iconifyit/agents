---
trigger: always_on
---

# start-with-the-docs

## Documentation First

Before beginning any task, **ALWAYS inspect existing project documentation** to establish what has already been specified, designed, decided, or implemented.

Existing documentation is the starting point, not an optional reference.

## Required Behavior

1. **Discover first.** Locate relevant requirements, ADRs, implementation plans, specifications, contracts, and other project documentation before proposing solutions or creating artifacts.
2. **Read before acting.** Examine relevant documents and their references sufficiently to understand the existing decisions, constraints, and current state.
3. **Respect established decisions.** Approved ADRs and other authoritative documents govern the work unless explicitly superseded or changed by the user.
4. **Reuse and extend.** Prefer updating or extending existing artifacts over creating new ones. Do not duplicate requirements, designs, or documentation already present.
5. **Identify conflicts.** If the requested work conflicts with an established decision, identify the conflict and follow the project's change-control process. Do not silently override an approved design.
6. **Preserve continuity.** New work must build upon relevant existing work rather than independently reinventing it.

## Creating New Artifacts

Create a new document or design artifact only when:

- No suitable existing artifact exists.
- The task explicitly requires a new artifact.
- The established workflow or documentation structure requires one.

Do not create competing ADRs, specifications, or implementation plans merely because starting from scratch is easier.

## Scope and Efficiency

Documentation discovery must be **focused and proportional** to the task. Inspect relevant sources, not the entire documentation repository.

Do not turn documentation review into a prolonged research exercise or another approval checkpoint.

Once sufficient context is established, **proceed with the assigned work**.

**Principle: Discover → Understand → Reuse or Extend → Execute. Never reinvent what has already been decided.**