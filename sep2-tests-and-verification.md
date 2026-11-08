### Tests and verification

**Maxim: Tests preserve meaningful knowledge about required system behavior as executable constraints. Test what must remain true, especially when things go wrong.**

**A test must earn its existence by the meaningful uncertainty it removes.**

- Test what matters, not merely what is available or easy to test. The existence of code, a branch, an uncovered line, or a change does not by itself create a testing obligation.
- Tests must establish meaningful claims about system behavior, outcomes, state, contracts, invariants, or material failure modes. Do not add tests that merely demonstrate obvious implementation facts or behavior already guaranteed elsewhere.
- Coverage measures execution, not proof. Use coverage to identify behavior worth examining, not as an objective that mechanically demands additional tests.
- Tests derive from the system's intended behavior, not from the development conversation or mechanics of a diff. Instructions to remove, rename, move, or replace code are verified through implementation and review unless they independently express a durable system constraint.
- Prefer the smallest set of tests that provides strong evidence of correctness. Redundant, trivial, implementation-coupled, or historically motivated tests are liabilities, not harmless extras.
- Treat tests as maintained system assets with ongoing execution, maintenance, debugging, and resource costs. Adding a test requires justification just as adding production code does.
- Treat tests as executable specifications of required behavior, not merely confirmation of the happy path.
- Drive testing by behavior and risk. Consider success, rejection, boundaries, dependency failure, concurrency, retries, partial completion, recovery, and other material failure modes.
- Failure behavior is first-class behavior. Critical failure and recovery paths require the same or greater verification rigor as successful execution.
- When practical, develop new behavior test-first using Red → Green → Refactor. A new test must first be observed failing for the expected reason before implementation makes it pass.
- Every confirmed defect or unexpected failure is evidence worth examining. When it reveals a previously unprotected behavioral requirement or credible recurrence risk, reproduce it with an automated regression test whenever practical and retain that test as a constraint against recurrence.
- Characterize existing working behavior before significant refactoring or replacement so unintended behavioral changes are detectable.
- Verify component boundaries with contract and integration tests appropriate to the boundary.
- Express important system invariants directly and test them as properties where practical.
- Test observable behavior rather than implementation details. Avoid coupling tests to internal call sequences or structure unless that structure is itself part of the contract.
- Test behavior at the lowest level that can prove it, then add broader integration and end-to-end tests to prove that the pieces actually work together.
- Use realistic data.
- Freeze time when appropriate.
- Tests must fail when logic is broken.
- Assert meaningful behavior.
- Test failures should be actionable: failures should make clear what behavior was violated and provide enough evidence to diagnose the problem.
