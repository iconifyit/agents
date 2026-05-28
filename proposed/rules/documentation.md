# PROPOSAL — edit to `rules/documentation.md`

**Why:** During the eagle-ps-plugin session, ADR-002 superseded the auto-batch Orchestrator subsystem on 2026-05-24, but the superseded code (Orchestrator + the entire `detection/` module + face-api/tfjs deps) sat in the tree for days, kept alive in the bundle by a ghost re-export. The ADR documented the *new* design but said nothing about *removing the old*, so the cleanup never happened. Adding a mandatory "Code being removed" section to the ADR structure forces the question at decision time.

**Proposed change:** in the `## ADR Structure` section, add "Code being removed" to the required-sections list, and add the clarifying paragraph below.

Scott's Update : Perhaps we need a skill that runs on each commit to search for dead code? Or maybe a periodic "dead code audit" workflow that runs a tool like `knip` or `esbuild --metafile` to identify unreachable code and generate PRs to remove it? This would help keep the codebase clean and prevent bloat from accumulating over time, especially after architectural changes that deprecate large subsystems. The skill or workflow could be configured to run on a schedule (e.g. weekly) or triggered by certain events (e.g. merging an ADR that supersedes a subsystem) to ensure that dead code is identified and removed in a timely manner.

---

### Add to the ADR required-sections list

An ADR that supersedes prior behavior must include a **"Code being removed"** section listing the files/modules/exports the new decision makes dead — or stating explicitly "None" if the change is purely additive. This section is never absent.

The rationale: a "Supersedes X" header documents what's *new* but is silent on what's now *dead*. Dead code doesn't announce itself — a superseded subsystem can stay reachable through a re-export in an `index.js` long after nothing invokes it, bloating the bundle and confusing future readers about what's live. Naming the removals at decision time makes the cleanup part of the same PR that introduces the new design (see the architecture-change and refactor workflows).

When filling this section, verify reachability with a real tool (e.g. an esbuild `--metafile` audit, `knip`, or the equivalent for the stack) rather than assuming "nothing imports it" — re-exports and ghost imports defeat eyeball analysis. The same PR that lands the ADR should delete the listed code.
