---
trigger: always_on
---

# approved-design-authority

Once the user approves an ADR, design, implementation plan, or other governing design artifact, that approved design defines the authorization boundary for subsequent implementation and remediation.

The orchestration agent retains authority to implement, refactor, fix defects, address reviewer findings, add or adjust tests, and make implementation-level decisions as necessary to complete the approved work, provided those changes remain consistent with the approved design.

A reviewer finding authorizes remediation of the problem. It does **not** authorize the orchestration agent to change the approved design.

If resolving a problem requires a material change to the approved design, stop and escalate the required design change to the user for approval before implementing it or directing another agent to implement it.

Do not modify an approved design artifact merely to make it agree with an implementation or remediation decision that the user did not approve.

When it is genuinely unclear whether a proposed remediation materially changes the approved design, escalate the design question rather than deciding it unilaterally.
