---
name: refactor
description: >
  Workflow for safe refactoring that preserves behavior while improving structure,
  maintainability, or extensibility.
---

# Refactor Workflow

Use this workflow when changing structure without intending to change behavior.

## Stages

### 1. Describe

Capture:

- Refactor target
- Motivation
- Desired improvement
- Behavior that must remain unchanged
- Constraints and boundaries

### 2. Analyze

Use the `analyze` skill.

Focus on:

- Current responsibilities
- Coupling
- Public contracts
- Tests
- Hidden side effects
- Existing patterns
- Downstream consumers
- Reachability: if the refactor removes code, confirm what's actually reachable using a tool (esbuild `--metafile`, `knip`, dependency-cruiser, or the stack's equivalent) — NOT eyeball analysis. Re-exports and ghost imports keep "dead-looking" code alive in the bundle, and conversely make live code look unreferenced.

Do not modify code.

### 3. Plan

Use the `plan` skill.

The plan must include:

- Behavior-preserving strategy
- Incremental steps
- Files affected
- Compatibility concerns
- Test and regression strategy
- Rollback considerations

Determine whether an ADR is required.

### 4. Discuss

Stop and wait for explicit approval.

### 5. Document

If the refactor changes architecture, boundaries, or major patterns, follow the ADR process (see the `documentation` rule).

### 6. Implement

Use the `implement` skill after approval.

Rules:

- Preserve external behavior
- Keep changes incremental
- Avoid bundling feature work
- Avoid broad cleanup outside scope
- Maintain or improve test coverage
- Hold to the plan's scope contract. A refactor that starts touching adjacent code "while we're in here" is how a clean refactor becomes an unreviewable tangle. New cleanup opportunities discovered mid-refactor are follow-ups, not additions to this one.

### 7. Verify

Verify:

- Existing tests pass
- Behavior is unchanged
- Public APIs still work
- Downstream consumers are not broken
- Edge cases still behave correctly
- If code was removed: confirm via the reachability tool that it's gone from the reachable graph (not merely unreferenced in source but still bundled), and that any dependencies only the removed code needed were dropped from the manifest.

### 8. Iterate

If regressions are found, stop, explain, re-plan, and get approval.
