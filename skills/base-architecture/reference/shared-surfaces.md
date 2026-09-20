# Shared "single-writer" surfaces (parallel-work coordination)

For multi-agent fan-out: these files are touched by many modules or act as central registries. The rule
is **single-writer** — exactly one agent (the integrator) edits them; module/page agents emit a
"register me here" request instead of editing them directly. Editing these in parallel causes merge
conflicts and corruption. Verified 2026-06-18.

## Domain library (`src/`)

- `src/index.js` — main barrel (module exports; currently WIP / partly commented).
- `src/common/BaseEntity.js`, `BaseRepository.js`, `BaseReadRepository.js`, `BaseService.js`, `BaseReadService.js` — base classes every module extends.
- `src/common/mixins/service/index.js` — mixin registry + curried combos (`withPluggableAndCacheable`, etc.).
- `src/common/event-bus/index.js` — EventBus singleton.
- `src/__tests__/contracts/*` — shared entity/repository/service test contracts.
- `src/config/enums.js` — shared enums (user roles, statuses, entity/product types) used by both domain code and http schemas.
- `package.json`, `jest.config.js`.

## HTTP layer (`http/`)

- `http/src/plugins/index.js` — plugin registry; **add a new resource's plugin here**.
- `http/src/factory.js` — generic CRUD route factories.
- `http/src/decorators/index.js` (+ `authenticate` / `authorize` / `optionalAuthenticate`) — auth.
- `http/src/hooks/index.js` — global hooks (`onSend`, request hook).
- `http/server.js` — boot / registration order.
- `http/__tests__/fixtures.yml` — shared test fixtures.

## Stable / immutable (do not modify without an explicit task)

- `src/accounts/**` and `src/accounts/account-types/**` — the golden reference.
- `src/banned-words/**`.
- `refs/db-models/**`, `refs/schema.sql` — read-only DB mirror + schema dump.

## Practical implication for fan-out

A back-end module dev agent can own `src/<module>/**` and `http/src/schemas/<resource>.js` +
`http/src/plugins/<resource>.plugin.js` freely (disjoint files). The only coordination points are
**registering** the plugin in `plugins/index.js` and the module in `src/index.js` — hand those two
edits to the integrator, and parallel module work stays conflict-free.
