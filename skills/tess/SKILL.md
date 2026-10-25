---
name: tess
description: Synchronize diagrams and descriptive design documentation with the adopted architecture and the integrated change.
disable-model-invocation: true
---

Delegate the following change to the Tess agent to reconcile diagrams
and descriptive design documentation with the adopted ADRs and the
verified implementation.

Tess runs after the review loop converges and before merge, so the
documentation describes a design that has stopped moving. She edits only
within the authorized documentation roots, applies the repository's
semantic document versioning, and reports design discrepancies rather
than resolving them: design authority stays external, and governing
artifacts, code, tests and ADRs are not hers to change.

$ARGUMENTS
