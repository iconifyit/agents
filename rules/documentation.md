---
trigger: always_on
---

# Documentation & ADRs

## Documentation Versioning

Do not over-write existing docs except when the changes are cosmetic, syntactical, or otherwise minimal. For substantive, non-trivial changes, create a new version of the document and link to it. This way we maintain a history of decisions and changes over time, and we can refer back to old versions if needed.

We will use semantic versioning for documentation. We will not over-write or discard old documentation, but will instead create new versions and link to them. Deprecated documents will have an h1 title of `[DEPRECATED]` at the very top of the first page.

## Where documents live

| Location | Holds | Versioning |
| --- | --- | --- |
| `docs/adr/ADR-NNN-<slug>/` | Architecture decision records | SemVer per the section above |
| `docs/releases/<version>/` | Dated incident records for the release that was running — post-mortems and the like | **Not SemVer.** Keyed by the release under investigation and named by date and event |

The versioning scheme above governs **design documents** — artifacts that state a decision and can be revised when the decision changes. It does not govern **incident records**, which describe one event at one moment. A `-0.0.2.md` suffix on a post-mortem is meaningless: the incident does not get a second version, and correcting the record is done in place by striking through and amending so the change in understanding stays visible.

`docs/releases/<version>/` is therefore a sanctioned documentation location with its own naming convention, not an exception carved out of the ADR scheme. It is written by the `post-mortem` agent, which states its own path bound and its rule for a pre-existing file at that path. Adding another documentation tree under `docs/` means recording it here first.

## ADR Structure

Each significant design change should create a new ADR with a new version. ADRs will follow the semantic versioning format in their file names (e.g., `ADR-001-title-of-decision-0.0.1.md`). The initial version of an ADR will be `0.0.1`. If the ADR is updated, a new version will be created (e.g., `ADR-001-title-of-decision-0.0.2.md`), and the old version will be marked as deprecated with an h1 title of `[DEPRECATED]` at the very top of the first page.

Save ADRs in `./docs/adr/ADR-NNN-title-of-decision/ADR-NNN-title-of-decision-N.N.N.md`. Each ADR lives in its own folder named for the decision — the folder name itself must be descriptive (e.g., `ADR-001-agents-repo-layout/`, **not** a bare `ADR-001/`) so the decision is identifiable without opening the folder. The folder holds the versioned files plus a pointer document (`ADR-NNN-title-of-decision.md`) that always links to the current version.

Folder structure:

```sh
./docs/adr/
    ./ADR-001-title-of-decision/
        ADR-001-title-of-decision.md          # pointer to the current version
        ADR-001-title-of-decision-0.0.1.md
        ADR-001-title-of-decision-0.0.2.md
    ./ADR-002-another-decision/
        ADR-002-another-decision.md
        ADR-002-another-decision-0.0.1.md
    ...
```

### Required section: "Code being removed"

Every ADR must include a **"Code being removed"** section. If the decision supersedes prior behavior, list the files/modules/exports it makes dead; if the change is purely additive, state explicitly "None". This section is never absent.

The rationale: a "Supersedes X" header documents what's *new* but is silent on what's now *dead*. Dead code doesn't announce itself — a superseded subsystem can stay reachable through a re-export in an `index.js` long after nothing invokes it, bloating the bundle and confusing future readers about what's live. Naming the removals at decision time makes the cleanup part of the same PR that introduces the new design (see the architecture-change and refactor workflows).

When filling this section, verify reachability with a real tool (e.g. an esbuild `--metafile` audit, `knip`, or the equivalent for the stack) rather than assuming "nothing imports it" — re-exports and ghost imports defeat eyeball analysis. The same PR that lands the ADR should delete the listed code.

## Documentation / Comments

All code must include comments in the widely-accepted format and industry norms for that language and framework. Comments should explain the "why" behind the code, not just the "what". All functions must include JSDoc comments with descriptions of parameters, return values, and examples when helpful. Code should be self-explanatory as much as possible, but comments should be used to clarify complex logic or decisions.
