---
trigger: always_on
---

# adr-required

All non-trivial architectural changes must be documented in an ADR. If you identify a necessary architectural change, you must create an ADR for it before proceeding with implementation. Do not proceed with any architectural changes without first creating an ADR that documents the change and the reasoning behind it.

Additionally, before implementing an ADR, you must review it with the user and receive explicit approval to proceed and create an implementation plan based on the ADR. Do not proceed with implementation of an ADR without first reviewing it with the user and receiving explicit approval to proceed.

Save implementation plan docs in :

```text
./docs/adr/
    ./docs/ADR-001-<name>/ADR-001-title-of-decision.md
    + -- ADR-001-title-of-decision-0.0.1.md
    + -- ADR-001-title-of-decision-0.0.2.md
    imp/
        ADR-001-<name>-implementation-plan.md
```