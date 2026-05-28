---
trigger: always_on
---

# Test Design

This rule is about **what to assert.** The companion [[testing]] rule
covers **how to populate** a test once you know what to assert (data
hygiene, frozen time, kill-switches, no-symbolic-data, etc.). Both
rules together; neither alone.

## The single principle

A test is a proposition about the system's contract. **The
proposition must be coextensive with the contract** — same truth
conditions, same scope, no stronger, no weaker.

When the test's proposition is **stronger** than the contract, the
test fails under refactors that don't violate the contract (brittle
test, false positives).

When the test's proposition is **weaker** than the contract, the
test passes under behaviors that DO violate the contract (false
negatives — silent escape).

Every test-design question is a reframing of this one principle.

## Grounding in the three laws of logic

**Identity (A = A).** Two valid implementations of the same contract
must produce the same test result. If the assertion's truth value
drifts with implementation details that aren't part of the
contract, the test's identity has come unmoored from the contract.

**Non-Contradiction (¬(A ∧ ¬A)).** A system cannot satisfy and
violate the same contract in the same respect. The test exists to
make the contradiction observable. Kill-switch: **if commenting out
the implementation still passes the test, the test is tolerating a
contradiction.** Delete or rewrite.

**Excluded Middle (A ∨ ¬A).** Tests produce a definite pass or fail.
No "kind of," no manual judgment, no flakiness. A flaky test is in
superposition between A and ¬A — logically impossible, therefore
not a test.

## Authoring order (do these in this order — do not skip steps)

1. **Intent.** What does the unit under test EXIST to do? What value
   does it deliver to the system? What would break — at the system
   level — if it stopped delivering that value?

2. **Failure modes.** What outcomes would invalidate the intent?
   Categories, not specific values.

3. **Dimensions of coverage.** For each failure mode, identify which
   categories surface it:
   - Happy path (representative valid input)
   - Error / failure paths (contract for invalid input / dependency
     failure)
   - Edges / corners (boundaries between equivalence classes —
     empty, max, zero, null, off-by-one)
   - Type / shape / contract validation
   - Invariants (properties true across ALL valid inputs —
     idempotence, round-trip, ordering)
   - State transitions (for stateful units)
   - Side effects (only if part of the contract)

4. **Equivalence classes.** Within each applicable dimension,
   identify the categories of input the unit treats the same way.
   One representative per class. Boundaries between classes get
   their own tests when off-by-one is plausible.

5. **Assertions.** Now — and only now — pick fixtures and write
   `expect()` calls. Each assertion is justified by which dimension
   and which equivalence class it covers.

Specifics live downstream of intent. Reversing this order produces
fixture-shaped tests that don't track the contract.

## The forward question (the in-the-moment check)

Before writing any assertion, ask:

> **Is the thing I'm testing wrong because the VALUE is wrong, or
> because the TYPE is wrong?**

- **Wrong value, right type** → assert the specific value (or the
  relationship the value participates in).
- **Wrong type** → assert the type / structure / class. NEVER name a
  specific instance of the wrong type — every instance is wrong for
  the same reason, so naming one is naming an arbitrary symptom.

## The substitution test (after-the-fact verification)

For any literal in an assertion you just wrote:

> **If I substitute this literal with another value from the same
> equivalence class, does the assertion's truth value change?**

- **Changes** → the literal carries meaning. Keep it.
- **Invariant** → the literal is incidental. The test is really
  about the class. Pull the literal out and assert the class
  directly.

## Anti-patterns

All of these share one root cause: assertion proposition diverges
from contract proposition.

- **Fixture-bondage.** Asserting things that happen to be true of
  your specific fixture but aren't part of the contract.
  *Example:* `expect(output).not.toContain('42')` where `42` was
  one arbitrary non-string value you chose for the malformed-input
  fixture — the contract is "non-strings are filtered" (a type
  contract), not "the substring `42` is absent from rendered output"
  (a fixture artifact). The structural assertion that locks the
  type contract: `expect(filteredArray).toEqual([onlyValidString])`.

- **Redundant probes.** Multiple assertions in one test that prove
  the same thing, masquerading as thoroughness. If two assertions in
  the same test fail under the exact same set of code changes, one
  is noise.

- **Over-commitment.** Asserting more than the contract guarantees.
  *Example:* pinning a specific ISO timestamp when the contract is
  "returns an ISO timestamp." Pin the shape: `toMatch(/^\d{4}-…/)`.

- **Under-commitment.** `.toBeTruthy()` / `.toBeDefined()` where
  the contract is more specific. These pass on values that are
  meaningfully wrong (a number where a string was expected).

- **Implementation bonding.** Asserting internal call order,
  specific log messages, private state. Tests should pass under any
  implementation that satisfies the contract.

## The audit question

For any existing test:

> **What contract does this test exist to verify, and does the
> assertion pin that contract or pin an artifact of the fixture?**

If you can't name the contract crisply, OR the assertion doesn't
pin it, the test is rewriting-or-deletion material — even if it
currently passes.

## One-line rule

> **A test's proposition should be coextensive with the contract
> under test. Stronger is brittle; weaker is silent. Same scope, no
> more, no less.**
