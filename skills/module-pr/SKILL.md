---
name: module-pr
description: >
  Tactical checklist for executing a single-concern module PR well: the test
  matrix, error/edge coverage, and definition of done. Use while implementing
  and testing one piece of a multi-PR feature build. Complements the `module-pr`
  workflow (the staged process) and `filesystem-soa-module` (the scaffolding).
trigger: always_on
---

# module-pr (execution checklist)

## Description

The per-PR execution discipline for shipping one SOA module (or one cohesive
concern) cleanly. The `module-pr` **workflow** governs the staged process
(branch → analyze → plan → implement → test → verify → PR); this **skill** is
the tactical reference you apply during the implement + test stages.

## Usage

Invoke while building one module of an approved roadmap. Pair with
`filesystem-soa-module` for the file scaffolding (Entity/Reader/Writer/Service/
index) and the `module-pr` workflow for sequencing and PR hygiene.

## Build order

1. Entity (shape + validation; freeze if immutable).
2. Reader / Writer (I/O only; extend `FileReader`/`FileWriter` for filesystem).
3. Service (business logic; thin; delegates I/O; injectable deps).
4. `index.js` factory (`init<Module>Service`).
5. Tests alongside each layer.

## Test matrix (every module)

For each public method, cover:

- **Happy path** — realistic seeded fixture data, meaningful assertions.
- **Edge cases** — empty inputs, single vs many, missing optional fields,
  duplicates, boundary values.
- **Error cases** — unreadable/missing files, malformed data, dependency
  failure. Assert the decided behavior (fail loudly vs degrade) — never silent.
- **Determinism** — AI via injected mock agent (assert shape, not wording);
  `fetch`/MCP stubbed; time frozen where hashes/timestamps matter.
- **Isolation** — writes honor `IS_TEST_MODE` (target temp dirs, never `data/`).

Every test states its scenario in a comment and must fail if the logic is
removed. Real fixtures under `test/.../__fixtures__/`; no symbolic data.

## Definition of done

- [ ] Targeted suite + FULL suite green (no regressions).
- [ ] Happy + edge + error tests for each public method.
- [ ] JSDoc on every function; house style (colon-aligned literals, `else` on
      own line, `k`-prefixed env consts).
- [ ] No imports from `src/core/pipeline` / `src/core/sources`.
- [ ] Module imported only via its `index.js`; no deep cross-module imports.
- [ ] Errors are handled at the root, not deferred or worked around.
- [ ] PR is single-concern; docs/templates ride with the code.

## Examples

```
# One module, one branch, one PR:
git checkout -b claude/resume-module
# scaffold src/modules/resume/ via filesystem-soa-module
# write tests (happy/edge/error) under test/modules/resume/
npm test                       # full suite green
# open a single-concern PR; merge; delete branch; next module
```

## Notes

- Prerequisites: `src/common/` base classes present; the roadmap/ADR design
  approved for the concern.
- Related: `module-pr` workflow (process), `filesystem-soa-module` (scaffolding),
  `analyze` (stage 2), `api-endpoint-testing` (integration tests).
- Anti-pattern: if review surfaces issues across unrelated areas, the branch has
  bundled concerns — stop and split.
