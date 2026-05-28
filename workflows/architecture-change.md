---
name: architecture-change
description: >
  Workflow for changes involving significant design, system boundaries,
  infrastructure, data models, orchestration, or long-term maintainability.
---

# Architecture Change Workflow

Use this workflow for significant architectural or design changes.

Examples:

- New service or module boundary
- New orchestration pattern
- Data model change
- Infrastructure change
- New external integration
- Cross-cutting behavior
- Major dependency or framework change

## Stages

### 1. Describe

Capture:

- Problem statement
- Desired outcome
- Constraints
- Non-goals
- Operational considerations
- Compatibility requirements

### 2. Analyze

Use the `analyze` skill.

Focus on:

- Existing architecture
- Current patterns
- Dependency boundaries
- Data flow
- Operational behavior
- Existing ADRs and docs
- Risks and unknowns

Do not modify code.

### 3. Plan

Use the `plan` skill.

The plan must include:

- Proposed architecture
- Alternatives considered
- Tradeoffs
- Migration strategy
- Test strategy
- Verification strategy
- Rollback or mitigation plan

### 4. ADR

Use the `adr` skill.

The ADR must capture:

- Context
- Decision
- Alternatives
- Consequences
- Risks
- Version history

Do not implement until the ADR and plan are approved.

### 5. Discuss

Stop and wait for explicit human approval.

### 6. Implement

Use the `implement` skill only after approval.

Rules:

- Follow the approved ADR and plan
- Keep changes incremental where possible
- Preserve compatibility unless breaking changes were approved
- Do not introduce unrelated refactors

### 7. Verify

Verify:

- Unit tests
- Integration tests
- Regression impact
- Operational behavior
- Logs and error paths
- Migration or rollback assumptions

### 8. Iterate

If verification reveals issues, re-plan, update docs or ADR if needed, and get approval before further changes.
