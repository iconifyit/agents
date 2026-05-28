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

Use the `adr` skill if the refactor changes architecture, boundaries, or major patterns.

### 6. Implement

Use the `implement` skill after approval.

Rules:

- Preserve external behavior
- Keep changes incremental
- Avoid bundling feature work
- Avoid broad cleanup outside scope
- Maintain or improve test coverage

### 7. Verify

Verify:

- Existing tests pass
- Behavior is unchanged
- Public APIs still work
- Downstream consumers are not broken
- Edge cases still behave correctly

### 8. Iterate

If regressions are found, stop, explain, re-plan, and get approval.
