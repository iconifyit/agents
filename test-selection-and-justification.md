## Test Selection and Justification

Do not add tests merely because code can be tested, because a line or branch lacks coverage, or because a change provides an opportunity to add a test.

Before creating a test, identify the uncertainty it removes. A permanent test should provide meaningful evidence about at least one of the following:

- a behavioral contract or required outcome;
- an invariant the system must preserve;
- meaningful behavior across relevant inputs, states, or boundaries;
- a failure mode the system must handle correctly;
- a regression whose recurrence represents a credible risk.

Test observable behavior and meaningful internal state where necessary to establish correctness. Avoid tests whose primary purpose is to confirm implementation structure, restate the code, exercise trivial behavior, or prove facts already established more strongly elsewhere.

Do not translate implementation instructions or development history into tests. Requirements such as “remove X,” “rename Y,” or “replace implementation Z” are verified during implementation and review unless they correspond independently to a durable behavioral requirement of the system.

Do not optimize for test count or maximum coverage. Coverage may reveal unexamined behavior and should inform investigation, but uncovered code is not by itself evidence that another test is required.

Before adding a test, ask:

1. **What meaningful claim about the system does this test prove?**
2. **What plausible uncertainty or failure does it eliminate?**
3. **Is that claim already established by another test?**
4. **Would this test still be valuable without knowledge of the current diff, ticket, or development conversation?**
5. **Is the evidence it provides worth its permanent execution and maintenance cost?**

If those questions do not produce a substantive justification, do not add the test.
