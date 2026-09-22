---
trigger: always_on
---

# Documentation & ADRs

## Documentation Versioning

Do not over-write existing docs except when the changes are cosmetic, syntactical, or otherwise minimal. For substantive, non-trivial changes, create a new version of the document and link to it. This way we maintain a history of decisions and changes over time, and we can refer back to old versions if needed.

We will use semantic versioning for documentation. We will not over-write or discard old documentation, but will instead create new versions and link to them. Deprecated documents will have an h1 title of `[DEPRECATED]` at the very top of the first page.

## Where documents live

| Location | Holds | Naming |
| --- | --- | --- |
| `docs/adr/ADR-NNN-<slug>/` | Architecture decision records | `ADR-NNN-<slug>-N.N.N.md` plus a pointer document |
| `docs/releases/<release>/` | Post-mortems and other incident records, filed under the release that was running | `<slug>-N.N.N.md` plus a pointer document |

**Both use the SemVer scheme above. There is no second versioning convention.** The rules in Documentation Versioning apply unchanged: substantive revisions create a new version rather than overwriting, superseded versions carry a `[DEPRECATED]` h1, and a pointer document always names the current version.

The point is that versioning is determined by a rule rather than by the author's judgment about whether a given document "feels like" the kind that gets revised. An incident record is revised more often than people expect — a cause is misattributed, a timeline is corrected once a log is recovered, a second failure surfaces a week later — and each of those is a substantive change to a document others may already have read and acted on. Superseding it visibly is what lets a reader tell which account they have.

Adding another documentation tree under `docs/` means recording it in this table first, and it uses this same scheme unless there is a stated reason it cannot.

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
