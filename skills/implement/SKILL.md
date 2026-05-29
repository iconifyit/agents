---
name: implement
description: >
  Implements an approved plan. Use only after the user has explicitly approved
  a plan or given explicit permission to start implementation. Follows the
  agreed design, keeps changes scoped, and does not deviate without approval.
---

# Implement Skill

Implement code according to an approved plan.

This skill is for execution only after explicit user approval.

## Preconditions

Before implementing, confirm that:

- A task has been described
- The target has been analyzed, if non-trivial
- A plan exists
- The user has explicitly approved implementation
- Any required ADR or planning document has been created or updated

If these are not true, stop and ask to complete the missing phase.

## Process

### 1. Re-read the Approved Plan

Identify:

- Scope
- Files to modify
- Expected behavior
- Testing requirements
- Explicit constraints
- Things not to change

### 2. Inspect Current Code Before Editing

Before modifying a file:

- Read the relevant file
- Understand nearby conventions
- Check related tests
- Check imports, exports, contracts, and side effects

Do not edit blindly.

### 3. Implement the Smallest Safe Change

Follow these rules:

- Keep changes scoped to the approved plan
- Preserve existing architecture and naming
- Prefer idiomatic patterns already present in the repo
- Avoid opportunistic refactors
- Avoid unrelated cleanup
- Do not change public contracts unless approved
- Do not introduce dependencies unless approved
- Add or update tests where appropriate

### 4. Handle Deviations

If implementation reveals that the approved plan is wrong, incomplete, or risky:

1. Stop implementation
2. Explain the issue
3. Propose an updated plan
4. Wait for explicit approval before continuing

Do not silently improvise.

### 5. Maintain Documentation

If the approved plan requires documentation:

- Update the relevant plan, ADR, or docs
- Preserve historical versions
- Do not overwrite deprecated documents
- Follow the repo's documentation versioning rules

### 6. Prepare for Verification

After implementation, summarize:

- What changed
- Files modified
- Tests added or updated
- Verification still required
- Known risks or unresolved questions

Do not claim success until verification has been performed.

## Output

Return an implementation summary:

```markdown
# Implementation Summary: {task}

## Changes Made

- ...

## Files Modified

- `{path}` — change summary

## Tests Added / Updated

- ...

## Deviations from Plan

- None
```

If there were deviations:

```markdown
## Deviations from Plan

Implementation stopped because:

- ...

Approval is required before continuing.
```

## Guardrails

- Do not implement without explicit approval.
- Do not deviate from the approved plan without approval.
- Do not make destructive changes.
- Do not perform unrelated refactors.
- Do not ignore errors.
- Do not claim verification is complete unless verification was actually performed.
- If blocked, stop and explain the blocker.
