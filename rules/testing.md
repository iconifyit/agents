---
trigger: always_on
---

# Testing

## General Testing Requirements

- ALL code must include unit tests AND integration tests as applicable
- Integration tests are more important than unit tests
  - Unit tests validate the code
  - Integration tests validate the system as a whole
- Always include integration tests unless it does not make sense to do so
- Ensure all tests pass before moving on to a new task
- All code must include unit tests before being pushed. Unit tests must include happy path tests, edge case tests, and error case tests as applicable. Integration tests must be included for all new features and changes to existing features.

---

# Testing Guard Rails (Strict Mode)

These rules are **non-negotiable**. Violations invalidate the work.

---

## Core Guard Rails

- **DO NOT invent or assume data.**
  All tests must explicitly seed realistic domain data.

- **Empty-table tests are forbidden unless explicitly requested.**
  If no rows are inserted, the test is invalid.

- **Future dates are forbidden.**
  Do not use dates beyond the current test clock (e.g. year 2099).

- **Time MUST be frozen in tests.**
  Use a fixed ISO timestamp and derive all dates relative to it
  (e.g. yesterday, D-1, D+1).

---

## Accounting & Money Logic

- **Money-moving code must not be tested with zero values**
  unless the test explicitly targets a zero-case.

- **Allocation tests require at least two entities.**
  Single-entity tests do not validate distribution logic.

- **Totals must reconcile.**
  Tests must assert:
  - sum of contributor payouts ≈ pool amount (within rounding policy)

- **Never "test logic paths" without numeric assertions.**
  If a test does not assert amounts, shares, or totals, it is incomplete.

---

## Test Structure Rules

- **Every test must state its scenario in a comment.**
  Example:
  `// Two subscriptions active, one starts yesterday, one started earlier`

- **Each test must fail if core logic is removed.**
  If commenting out the implementation still passes, the test is invalid.

- **No symbolic or meaningless data.**
  Avoid `foo`, `bar`, `testUser`, arbitrary IDs.
  Use realistic domain values.

---

## Date & Time Semantics

- **Settlement date = yesterday (relative to frozen clock)**
  unless explicitly stated otherwise.

- **Do not hardcode calendar dates.**
  Always compute from the fixed test time.

- **Timezone must be explicit and consistent**
  (UTC or the app's canonical timezone).

---

## Ledger / Immutability Rules

- **Ledger hash tests must use non-trivial data.**
  Empty or zero-value rows are invalid.

- **Hash-chain tests must include at least two sequential records.**

- **Never "fix" a hash mismatch by recomputing stored hashes.**
  Tests must detect breakage, not hide it.

---

## Behavior Constraints

- **Do not optimize for brevity in tests.**
  Correctness and clarity come first.

- **Do not guess when requirements are unclear.**
  Stop and ask for clarification.

- **Do not choose "easy paths" that bypass complexity.**

---

## Kill-Switch Rules

- **If you cannot write a correct test, STOP and explain why.**

- **If a test passes without meaningful assertions, delete and rewrite it.**

- **Never leave placeholder logic "for now".**
  Partial correctness is worse than no code.

---

## One-Line Rule

> **Tests that do not fail when logic is broken are considered failures.**
