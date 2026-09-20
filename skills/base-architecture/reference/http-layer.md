# base/http/ — Fastify API Layer (reference)

This is the one part of `base/` not documented in `ARCHITECTURE.md` / `AGENTS.md` / `docs/`. Verified
by direct read on 2026-06-18. Location: `base/http/`.

## Boot & registration

- `http/server.js` → `buildServer()` builds the Fastify 5 instance and registers, in order:
  `@fastify/cors`, `@fastify/jwt` (requires `JWT_SECRET` env or it exits), `@fastify/sensible`
  (gives `fastify.httpErrors.*`), then **decorators**, then **hooks**, then **one plugin per resource**
  via `fastify.register(plugin.handler, { prefix: plugin.prefix })`, plus a `GET /health`.
- Dev: `npm run dev` (nodemon, watches `plugins`). Listens on `:3000`.
- **Installed but NOT yet wired:** `@fastify/swagger`, `@fastify/swagger-ui`, `@fastify/helmet`,
  `@fastify/rate-limit`, `@fastify/under-pressure`, `@fastify/type-provider-typebox`.
  → Registering `@fastify/swagger` would **auto-generate OpenAPI/Swagger-UI** from the route schemas
  below — a cheap, high-value task that publishes the contract for the front-end.

## Plugins (one per resource)

- `http/src/plugins/<resource>.plugin.js`, all registered in `http/src/plugins/index.js`
  (~25–28 resources: auth, accounts, carts, cart-items, credits, downloads, favorites, icons,
  illustrations, images, licenses, orders, order-items, sets, tags, teams, users, …).
- Each plugin exports `{ handler, prefix }`. Pattern (see `accounts.plugin.js`):

  ```js
  const { initAccountService, AccountEntity } = require('../../../src/accounts');
  const { list, getItem, createItem, patchItem, deleteItem } = require('../factory');
  const schemas = require('../schemas/accounts');

  const plugin = async (fastify) => {
      const service = initAccountService();                 // factory, never `new`
      const baseConfig = { service, entityClass: AccountEntity, preHandler: [fastify.authenticate] };
      await list({ route: '/:page/:pageSize', schema: schemas.AccountPaginatedSchema,
                   getWhere: (req) => ({ /* filters from req */ }), ...baseConfig })(fastify);
      await getItem({ route: '/:id', name: 'account', ...baseConfig })(fastify);
      await createItem({ route: '/', name: 'account', ...baseConfig,
                   preHandler: [fastify.authenticate, fastify.authorize(['Admin'])] })(fastify);
      // patchItem / deleteItem likewise
  };
  module.exports = { handler: plugin, prefix: '/account' };
  ```

## Generic CRUD factory (`http/src/factory.js`)

A resource's API is mostly *declaring* these — don't hand-roll handlers:

- `list({ route, service, schema, getWhere, preHandler })` → `service.paginate(where, page, size)`
- `paginate({ route, service, listSchema })` → offset/limit **path** params (V1)
- `getItem({ path:'/:id', service, schema, name, parseId })` → `service.getById()`, 404 via httpErrors
- `createItem({ service, schema, name })` → `service.create(req.body)` (returns created entity)
- `patchItem({ path:'/:id', service, schema })` → existence check → `service.update()` → re-fetch
- `deleteItem({ path:'/:id', service })` → `service.delete()` → `{ deleted: boolean }`
- `cursorList({ route, service, schema, getFilters, defaultLimit, maxLimit })` → `service.getList({filters,cursor,limit,userId})` returning `{ results, pageInfo }` (V2)
- `makeCrudPlugin({ service, entityClass, name, routes })` → assembles a whole plugin
- `buildSchemas(entityClass)` → derives `{ entitySchema, listSchema, paginatedSchema, deletedSchema }` from `entityClass.getJsonSchema()`

## Contract = per-resource JSON Schema (`http/src/schemas/<resource>.js`)

- Hand-written Fastify schemas per resource: entity, list, paginated, create (`body` + `201`),
  update, delete, get — with validation: `minLength/maxLength`, `enum` (from `src/config/enums`),
  `required`, `additionalProperties: false`. Fastify **serializes responses against the schema and
  strips unknown fields**, so the schema IS the published contract.
- **Two sources of response-shape truth coexist:** the entity's `getJsonSchema()` (consumed by
  `factory.buildSchemas`) vs. the hand-written `schemas/*.js` that plugins currently pass explicitly.
  Standardize on one before treating either as canonical (a contract-owner decision).

## Request/response casing boundary (gotcha)

- **HTTP request bodies are camelCase** (`userId`, `accountTypeId`) per the create/update schemas, and
  entities expose camelCase.
- **Persistence and direct test seeds use snake_case** DB columns (`user_id`, `account_type_id`).
  `createItem` passes `req.body` straight to `service.create()`; Objection maps camel↔snake at the
  model layer. So: write create/update **schemas** in camelCase; when seeding a service/repository test
  directly, use snake_case (see `src/accounts/__tests__/seed.js`).

## Auth (`http/src/decorators/`)

- `authenticate` — `request.jwtVerify()` → load user via `initUserService().getOne({uuid})` → reject if
  inactive/deleted or `tokenVersion` mismatch → hydrate `request.user.roles` → block `DenyAll`. Use as
  `preHandler: [fastify.authenticate]`.
- `authorize([roles])` — RBAC against `UserRoles` (from `src/config/enums`); supports a `Self` ownership
  check (`req.params.uuid === req.user.uuid`). Use `preHandler: [fastify.authenticate, fastify.authorize(['Admin'])]`.
- `optionalAuthenticate` — optional user context (e.g. per-user enrichment on public lists).
- `onSend` hook sets an `x-cache-hit` header from `reply.meta`.

Because CORS + JWT bearer are the auth model, a static (11ty/S3) front-end's dynamic islands
authenticate by sending the JWT to this API — no server session needed.

## Pagination: V1 vs V2 (see `docs/api-parity-audit.md`)

- **V1 offset** (`/<resource>/:page/:pageSize`) — default for most resources.
- **V2 cursor** (`/<resource>/newest`, `/popular`) — for high-volume tables (icons ~637K, images ~3.4M,
  tags, sets, illustrations, downloads), some backed by materialized views. Migration is *partial* —
  check `api-parity-audit.md` for current status before assuming an endpoint's pagination style.

## Tests (`http/__tests__/<resource>.plugin.test.js`)

- `supertest` against `buildServer()` (`app.listen({ port: 0 })`), real DB + `fixtures.yml`
  (admin user `scott@atomiclotus.net`). Covers CRUD, filtering, both pagination styles, and auth.
  Run with `npm test` inside `http/`.

## Checklist — add a resource's API

1. Confirm the domain module exists in `src/<module>/` with an `init<Name>Service()` (see AGENTS.md + `accounts`).
2. Add `http/src/schemas/<resource>.js` (entity/list/paginated/create/update/delete/get) — camelCase, validated, `additionalProperties:false`.
3. Add `http/src/plugins/<resource>.plugin.js` wiring `init<Name>Service()` + factory routes + auth preHandlers; export `{ handler, prefix }`.
4. Register it in `http/src/plugins/index.js` — **single-writer file, coordinate** (see `reference/shared-surfaces.md`).
5. Add `http/__tests__/<resource>.plugin.test.js` (supertest, real DB).
6. Run `http/` tests; verify 200/201/400/401/403/404 paths.
