---
name: plan
description: >
  Creates an implementation plan after analysis. Use when the user asks to plan,
  design, scope, prepare, or propose an approach for code work. This skill does
  not modify code.
---

# Plan Skill

Create a practical implementation plan for a code task.

This skill is for planning only. Do not modify files.

## Inputs

Use:

- The user's task description
- Existing analysis artifacts in `.agents/analysis/`
- Relevant repo rules
- Existing docs, ADRs, and code conventions
- The current state of the codebase

If analysis has not been performed for a non-trivial task, recommend running the `analyze` skill first.

## Process

### 1. Restate the Task

Briefly restate:

- What needs to be done
- The target area
- Expected outcome
- Known constraints

### 2. Review Existing Context

Check for:

- Existing analysis notes
- Relevant ADRs
- Existing documentation
- Existing implementation patterns
- Tests and validation paths

Do not guess. If context is missing, say so.

### 3. Design the Approach

Define:

- Proposed implementation strategy
- Files or modules likely affected
- Interfaces, contracts, or data shapes involved
- Dependencies or integrations involved
- Any migration, compatibility, or rollout concerns

Prefer the codebase's existing patterns over introducing new ones.

### 4. Identify Risks and Edge Cases

Consider:

- Failure modes
- Regression risks
- Backward compatibility
- Data integrity
- Error handling
- Concurrency or race conditions
- Security and permissions
- Observability and logging
- Operational impacts

### 5. Define Testing Strategy

Identify:

- Unit tests
- Integration tests
- Contract tests
- Manual verification steps
- Regression checks
- Mocking/stubbing needs

### 6. Determine Documentation Needs

State whether the task requires:

- No documentation
- Implementation plan only
- Existing docs update
- New or updated ADR
- Migration notes
- Operational runbook updates

For significant architectural decisions, follow the ADR process (see the `documentation` rule).
Use the `document` skill for durable code documentation.

## Output

Return a plan with this structure:

```markdown
# Plan: {task}

## Summary

Brief description of the proposed work.

## Assumptions

- ...

## Proposed Approach

Step-by-step implementation approach.

## Likely Files Affected

- `{path}` — reason

## Design Notes

Important architecture, contract, or pattern decisions.

## Risks / Edge Cases

- ...

## Test Plan

- ...

## Verification Plan

- ...

## Documentation / ADR Needs

- ADR required: yes/no
- Documentation required: yes/no

## Approval Required

Implementation must not begin until the user explicitly approves this plan.
```

## Guardrails

- Do not modify code.
- Do not create implementation files.
- Do not run destructive commands.
- Do not skip analysis for non-trivial work.
- Do not introduce new patterns without justification.
- Do not hide uncertainty.
- Stop after the plan and wait for explicit approval.
