---
name: base-architecture
description: >
  Orientation and source-of-truth index for the vectoricons.net v2.0 API in `vectopus-code/base/`.
  Load this whenever working in base/ (the Fastify SOA API) and you need to know how the codebase is
  structured, where the canonical docs live, how the http/ API layer works, the request/response
  contract, or which files are shared "single-writer" surfaces for parallel work. Read this FIRST
  instead of re-scanning base/ — it routes you to the existing docs (AGENTS.md, ARCHITECTURE.md,
  docs/INDEX.md, GAP-ANALYSIS.md) and fills the one gap they don't cover: the http/ Fastify layer.
---

# base/ Architecture — Orientation & Index

> **⚠️ PATHS UPDATED 2026-07-02 (ADR-007 reorg):** the repo now lives at **`vectopus-code/v2/base/`**, beside
> the database repo at **`vectopus-code/v2/db/`** (`@vectoricons.net/db-v2`, file-linked — the ONLY db package
> for the v2 API; the names `@vectoricons.net/db` and `@vectopus.com/db` belong to server-v1/legacy and must
> not be used here). Inside base the domain library moved to **`api/`** — read `src/` in this skill as
> `api/src/`, `db-test/` as `api/db-test/` — and `http/` is its sibling. The old `refs/` mirror is RETIRED:
> read real models at `../db/src/models/` (read-only, never import, never modify).
> Authoritative layout + hard boundaries: `base/AGENTS.md` → "Repository Layout".

`vectopus-code/v2/base/` is the **canonical v2.0 API** (Node.js + Fastify 5 + Objection.js/PostgreSQL),
a Service-Oriented rewrite that supersedes the legacy `server-v1` Express API. It has two halves:

- **`base/api/src/`** — the domain library: Entity / Repository / Service modules (SOA).
- **`base/http/`** — the Fastify HTTP API that exposes those services.

> **Read before re-scanning.** This codebase is already heavily documented. Do NOT deep-dive from
> scratch and do NOT duplicate existing docs — `base/docs/INDEX.md` has an explicit anti-duplication
> policy (search the index; update the existing file instead of creating a new one). Use the map below.

## Canonical docs — where to look first

| If you need… | Read |
|---|---|
| Conventions, rules, module/output layout, DO/DON'T | `base/AGENTS.md` |
| SOA layers, BaseEntity/Repository/Service, mixins, test contracts | `base/ARCHITECTURE.md` |
| The full documentation index (start here to find anything) | `base/docs/INDEX.md` |
| Fast context recovery after a session reset | `base/docs/QUICK-RAMP-UP.md` |
| What's missing / the relaunch backlog (modules, endpoints, tests) | `base/docs/GAP-ANALYSIS.md` |
| V1→V2 endpoint + pagination parity status | `base/docs/api-parity-audit.md` |
| Testing approach (real DB, no mocks, contracts) | `base/docs/design/TEST-STRATEGY.md`, `TEST-CONTRACTS.md` |
| BFF / pre-shaped frontend data strategy | `base/docs/bff-layer-for-vectoricons.md`, `base/NEXT-STEPS.md` |
| Why decisions were made | `base/docs/decisions/ADR-00*.md` |
| **How the `http/` Fastify layer works (NOT covered elsewhere)** | `reference/http-layer.md` (this skill) |
| **Single-writer files for parallel/fan-out work** | `reference/shared-surfaces.md` (this skill) |

## The module pattern (summary — AGENTS.md / ARCHITECTURE.md are authoritative)

Golden reference: **`src/accounts/`** (stable/immutable — copy the pattern, never edit it). A module is
`src/<module>/` containing `<Name>Entity.js`, `<Name>Repository.js`, `<Name>Service.js`, `index.js`
(exposes an `init<Name>Service()` factory), and `__tests__/`. Key rules:

- **Always construct services via `init<Name>Service()` factories — never `new Service()`** (AGENTS.md, CRITICAL: factories wire deps, events, mixins).
- **Entity** = `createEntityFromModel(DB.<table>, {}, { allowedColumns, relatedEntities })`; instances are frozen; `toJSON()` recurses relations; a camelCase JSON schema is derived and exposed as static `getJsonSchema()` (this feeds the HTTP contract).
- **Repository** extends `BaseRepository` (`super({ DB, modelName, entityClass })`); `findById/findOne/findAll/findByIds/paginate/cursorPage/withRelations/count/exists` + `create/update/delete/upsert` come free; add `findBy*` as needed; thread `{ trx }` everywhere.
- **Service** extends `BaseService` or a mixin combo (e.g. `withPluggableAndCacheable(BaseService)`); `getById/getOne/getWhere/paginate/getOneExpanded/cursorPage` + `create/update/delete/upsert/activate/deactivate/toggleActive` come free; add domain methods.
- DB source of truth: `base/refs/db-models/` (read-only model mirror) + `base/refs/schema.sql`. Never import from `refs/`.

## The http/ Fastify layer (the gap the other docs don't cover)

See **`reference/http-layer.md`** — boot/registration, the generic CRUD factory, per-resource
JSON-Schema contracts, JWT auth + RBAC decorators, V1 offset vs V2 cursor pagination, the
camelCase↔snake_case boundary, and a checklist for adding a resource's API.

## Hard rules (quick list)

- `src/accounts/**` and `src/banned-words/**` are **stable — do not modify** without an explicit task.
- Never write to `base/` root; output goes under `src/<module>/`. Never rename/restructure the `src/` tree.
- Integration tests run against a **dockerized Postgres** (`npm run docker:db-up`); never truncate protected tables (see ARCHITECTURE.md).
- `@vectoricons.net/db` is the only DB package; never `@vectopus.com/db`. Never introduce `vectopus`/`vectoplus` in new code.
- Use 4-space indent; `if/else` on their own lines (see AGENTS.md style); JSDoc on public methods.
