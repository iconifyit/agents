---
name: feature-development
description: >
  Standard human-in-the-loop workflow for safely implementing a new feature.
---

# Feature Development Workflow

Use this workflow for non-trivial feature work.

## Stages

### 1. Describe

The user describes the task, target, context, constraints, and desired outcome.

Do not begin implementation from the description alone.

### 2. Analyze

Use the `analyze` skill.

Goals:

- Understand the target code
- Identify architecture and conventions
- Identify likely edit points
- Identify risks and unknowns
- Identify tests and validation paths

Do not modify code.

### 3. Plan

Use the `plan` skill.

Goals:

- Propose the implementation approach
- Identify affected files
- Identify edge cases and failure modes
- Define tests
- Define verification steps
- Determine whether an ADR is needed

Do not modify code.

### 4. Discuss

Stop and wait for human review.

Implementation must not begin until the user explicitly approves the plan.

### 5. Document

If needed:

- Use the `adr` skill for architectural decisions
- Use the `document` skill for durable documentation
- Preserve documentation history and semantic versions

### 6. Implement

Use the `implement` skill only after explicit approval.

Rules:

- Follow the approved plan
- Keep changes scoped
- Preserve existing patterns
- Do not deviate without approval

### 7. Verify

Use the `verify` process or skill.

Verify:

- Happy path
- Edge cases
- Failure modes
- Regressions
- Logs and errors
- Downstream system impact

Do not ignore pre-existing errors.

### 8. Iterate

If verification finds issues:

- Stop
- Explain the issue
- Re-plan if needed
- Get approval before making additional changes
- Re-verify after fixes
