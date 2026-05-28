---
name: bugfix
description: >
  Workflow for investigating, fixing, and verifying bugs without introducing
  unrelated changes.
---

# Bugfix Workflow

Use this workflow for defects, regressions, production issues, and incorrect behavior.

## Stages

### 1. Describe

Capture:

- Observed behavior
- Expected behavior
- Reproduction steps
- Error messages or logs
- Affected environment
- Suspected target area, if known

### 2. Analyze

Use the `analyze` skill on the suspected target.

Also identify:

- Reproduction path
- Failing tests, if any
- Recent related changes
- Boundaries of the defect
- Whether the issue is local or systemic

Do not modify code.

### 3. Plan

Use the `plan` skill.

The plan must include:

- Root cause hypothesis
- Minimal fix approach
- Regression test strategy
- Verification steps
- Risk of side effects

### 4. Discuss

Stop for human review unless the user has already authorized the fix.

### 5. Implement

Use the `implement` skill after approval.

Rules:

- Fix the bug only
- Avoid opportunistic refactors
- Add a regression test when practical
- Preserve existing behavior outside the bug

### 6. Verify

Verify:

- The bug is fixed
- Regression test fails before and passes after, when practical
- Related behavior still works
- No new errors are introduced

Do not ignore pre-existing errors. Investigate and report them.

### 7. Iterate

If the fix is incomplete or causes issues, stop, re-plan, and get approval before continuing.
