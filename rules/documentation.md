
---
trigger: always_on
---

# Documentation & ADRs

## Documentation Versioning

Do not over-write existing docs except when the changes are cosmetic, syntactical, or otherwise minimal. For substantive, non-trivial changes, create a new version of the document and link to it. This way we maintain a history of decisions and changes over time, and we can refer back to old versions if needed.

We will use semantic versioning for documentation. We will not over-write or discard old documentation, but will instead create new versions and link to them. Deprecated documents will have an h1 title of `[DEPRECATED]` at the very top of the first page.

## ADR Structure

Each significant design change should create a new ADR with a new version. ADRs will follow the semantic versioning format in their file names (e.g., `ADR-001-title-of-decision-0.0.1.md`). The initial version of an ADR will be `0.0.1`. If the ADR is updated, a new version will be created (e.g., `ADR-001-title-of-decision-0.0.2.md`), and the old version will be marked as deprecated with an h1 title of `[DEPRECATED]` at the very top of the first page.

Save ADRs in `./docs/adr/001/ADR-001-title-of-decision.N.N.N.md`. To keep the docs folder organized, each document should be saved in its own folder with the same name as the document (minus the version and extension).

Folder structure:

```sh
./docs/adr/
    ./ADR-001/ADR-001-title-of-decision.md
    + -- ADR-001-title-of-decision-0.0.1.md
    + -- ADR-001-title-of-decision-0.0.2.md
    ./ADR-002/ADR-002-title-of-decision.md
    ...
```

## Documentation / Comments

All code must include comments in the widely-accepted format and industry norms for that language and framework. Comments should explain the "why" behind the code, not just the "what". All functions must include JSDoc comments with descriptions of parameters, return values, and examples when helpful. Code should be self-explanatory as much as possible, but comments should be used to clarify complex logic or decisions.
