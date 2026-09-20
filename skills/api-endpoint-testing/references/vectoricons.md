# VectorIcons v1 API — Testing Reference

Project-specific contract for integration-testing the vectoricons v1 API at
`/Users/scott/github/vectopus-code/v1`. Read this in full before writing any
test. Where this document and the code disagree, the code wins — verify
against the files cited here.

## The system under test

- **Framework:** Express 4 — `api/server/app.js`. Routes + business logic
  live together in fat route files under `api/server/routes/api/` (one file
  per resource; no separate controller layer for most resources).
- **Base path:** `/api` (from `BASE_API_URL`) — there is NO version segment.
  Example: `GET /api/icon/list/0/25`, `POST /api/auth/login`.
- **Server:** must be running locally on **port 5002** before integration
  tests run (`npm start` in `api/`; ensure `PORT=5002` is set — the code
  falls back to 5000 without it). `npm test` does NOT boot the server.
- **Database:** Postgres via `@vectopus.com/db` (Objection + Knex),
  initialized once in `api/server/lib/db.js` from
  `DB_HOST/DB_PORT/DB_USER/DB_PASS/DB_NAME`. Tests run against the DEV
  database — never production.
- **Test stack:** Jest 29 + supertest 6. Integration config `jest.config.js`
  matches `tests/*.test.js` and runs `tests/jest.globalSetup.js` /
  `jest.globalTeardown.js`. Run with `npm test` (already includes
  `--runInBand --forceExit` — required: the suites share one live server/DB
  and the knex pool holds Jest open).
- **Shared agent:** `tests/agent.js` — `supertest.agent(TEST_SERVER_URL)`
  with `TEST_SERVER_URL=http://127.0.0.1:5002`.

## Prime directive (project policy)

**All functionality is tested through the API with real users and real
data.** Do not create users, log in, reset passwords, or create/modify
content by writing to the database. The ONLY direct DB operations permitted:

| # | Operation | Why it's allowed |
|---|-----------|------------------|
| 1 | Read-only queries to select existing fixture rows | Picking real data, not creating state |
| 2 | Patch a NEW test user: `is_verified = true`, `verified_at = NOW()` | The verify token only goes out by email; this stands in for clicking the link |
| 3 | Insert ONE `user_to_roles` row to grant a new test user a non-default role | No API endpoint assigns roles; admin/contributor endpoints are untestable without it |
| 4 | Teardown: delete ONLY rows created by this test run (matched by the test-user email pattern) | No user hard-delete endpoint exists |

Everything else is an HTTP call.

## Creating a test user (the canonical flow)

This is the flow `tests/test-user-helper.js` implements — follow it (and
prefer reusing that helper over reimplementing it):

```text
1. POST /api/auth/register            ← via API
2. DB: patch is_verified/verified_at  ← sanctioned exception #2
3. DB: insert user_to_roles row       ← sanctioned exception #3 (only if the
                                         test needs ROLE_ADMIN / ROLE_CONTRIBUTOR)
4. POST /api/auth/login               ← via API, returns the JWT
```

### Register — `POST /api/auth/register`

Required body: `email`, `username` (letters+digits, max 32, lowercased),
`password`, `confirm_password`, `display_name`. Optional: `first_name`, `last_name`, `country`, `isSubscribed`.

**Password rules are enforced by middleware before the handler runs**: min 8
chars with at least one lowercase, one uppercase, one digit, and one special
character (`api/server/middleware/authPasswordCheck.js`). Use a strong
password like `TestAdmin@2026` — weak passwords 400 before registration.

Registration creates the user with `is_verified: false`, auto-assigns
`ROLE_CUSTOMER` (inserts the `user_to_roles` row itself), and returns
`{ success: true, user: {...} }` — **no token**.

Use the established test email pattern from `tests/test-user-helper.js`
(`+test-{role}-{shortId}` sub-addressing) so teardown and orphan cleanup can
find every user the tests created.

### Verify — the one DB patch

Login refuses unverified users: the user lookup filters on
`is_verified: true` (`api/server/routes/api/auth.js` — `getUser({ email,
is_active: true, is_deleted: false, is_verified: true })`), so an unverified
user gets a generic 400 "Login was not successful". After registering:

```javascript
await DB.users.query()
    .patch({ is_verified : true, verified_at : DB.knex.fn.now() })
    .where({ id : newUserId });
```

### Login — `POST /api/auth/login`

Body: `{ email, password }`. Response:

```json
{
  "success": true,
  "token": "Bearer eyJhbGci…",
  "user": { "id": 123, "roles": ["ROLE_CUSTOMER"] }
}
```

**The `token` value already includes the `"Bearer "` prefix.** Send it back
verbatim: `.set('Authorization', token)`. The JWT expires in 7 days; a
`POST /api/auth/logout` bumps `users.token_version`, which invalidates ALL
of that user's outstanding tokens (the JWT strategy rejects on version
mismatch with 403 "Please authenticate again"). Login also has a 5-failure
lockout — don't burn attempts with wrong-password probes against a user you
still need.

## The role system (understand this before testing authorization)

Roles are a catalog + xref pair, NOT a column on `users`:

- **`user_roles`** — the role catalog. Columns: `id`, `value` (e.g.
  `ROLE_ADMIN`), `label` (e.g. `admin`), `is_active`. Seeded values:
  `ROLE_ANONYMOUS`, `ROLE_CUSTOMER`, `ROLE_CONTRIBUTOR`,
  `ROLE_CONTRIBUTOR_PENDING`, `ROLE_TEAM_OWNER`, `ROLE_TEAM_MEMBER`,
  `ROLE_SUBSCRIBER`, `ROLE_ADMIN`, `ROLE_SUPER_ADMIN`, `ROLE_DENY_ALL`.
- **`user_to_roles`** — the xref. Columns: `id`, `user_id → users.id`,
  `user_role_id → user_roles.id`. A user "has" a role iff a row links them.
  A user can hold multiple roles. (The `users.user_role_id` column is
  legacy/vestigial — the live system reads the xref.)

Chain: `users → user_to_roles → user_roles`. Objection models expose this as
`Users.roles` (HasMany `user_to_roles`) and `UserToRoles.role` (BelongsToOne
`user_roles`), fetched with `.withGraphFetched('[roles.role]')` — so in
route code an authenticated user's roles are read as
`req.user.roles[i].role.value`.

To grant a role in tests (sanctioned exception #3):

```javascript
const role = await DB.userRoles.query().findOne({ value : 'ROLE_ADMIN' });
await DB.userToRoles.query().insert({
    user_id      : newUserId,
    user_role_id : role.id,
});
```

Grant roles BEFORE logging in — the JWT flow loads roles at authentication
time, and the login response's `user.roles` reflects them.

### How authorization is enforced (and the gotchas)

Protected routes chain: `auth → role.checkRole(...allowed) → contextCheck →
handler`.

- `auth` = `passport.authenticate(['jwt', 'custom'])`. **It never rejects:**
  with no/invalid token the `custom` strategy sets `req.user = GuestUser`.
- `role.checkRole(...)` passes immediately if `ROLES.Guest` is in the
  allow-list — such routes are effectively PUBLIC. Otherwise it 401s
  ("You are not Authorized") without a real user and 403s ("You are not
  allowed to make this request.") without a matching role.
- **401/403 from `checkRole` are PLAIN TEXT bodies, not JSON.** Don't assert
  `res.body.error` on them.
- A `context` header (`admin` | `contributor`) alters response shaping on
  some routes via `contextCheck`.

Consequences for tests: read endpoints (list/get/search/count) generally work
unauthenticated (Guest); mutation endpoints (`add`/update/delete/move/
activate) require an Admin or Contributor token. Always include both
negative cases: no token (expect 401) and authenticated-but-wrong-role
(expect 403) — but only on routes whose allow-list excludes Guest.

## Response envelope conventions (per-route — there is no global wrapper)

- **Lists** (`GET /api/icon/list/:start/:limit` etc.): pagination is in the
  PATH, not query params.
  `{ icons|illustrations|sets|families : [...], total, start, limit, offset }`
- **Search** (`GET /api/icon/search/:start/:limit?search=…`): adds
  `queryTotal`, `totalResults`, and `mode: 'es'|'fs'` (Elasticsearch vs
  Postgres fuzzy, toggled by `USE_FUZZY_SEARCH`).
- **Single item** (`GET /api/icon/:id`):
  `{ icon : {...}, relatedIcons : [...], illustrations : [...], family : {...} }`
- **Mutations**: `{ success : true, message : '…', icon|set|… : {...} }`
- **Errors** through the central handler: `{ "error" : "<message>" }` —
  404 "Item not found", 400 "Request could not be completed". But remember:
  `checkRole` 401/403 are plain text, and unknown routes 404 with the JSON
  string `"No API route found"`.

Limits (from `server.config.js`): default page size 25, max 200, max search
offset 10000. Assert shapes and known-fixture values, not row counts of
shared dev data.

## Selecting content fixtures (icons, illustrations, sets, families)

The content hierarchy is **family → sets → icons/illustrations**, and all
four tables carry a direct `user_id` ownership column plus `is_deleted`
soft-delete flags.

**Policy: pick a real object owned by `user_id = 1`** (the site owner's
account), selected at RUNTIME — never hardcode entity IDs (the constants in
`tests/data.js` are known-stale). Two equivalent ways:

```javascript
// Read-only DB selection (sanctioned exception #1)
const icon = await DB.icons.query()
    .whereRaw('COALESCE(is_deleted, false) = false')
    .where('user_id', 1)
    .first();
```

```javascript
// Or via the public owner-scoped endpoints (no auth needed)
const res = await agent.get('/api/icon/user/1/0/1').expect(200);
const icon = res.body.icons[0];
```

Same pattern for `DB.sets`, `DB.families`, `DB.illustrations` and
`/api/set/user/1`, `/api/family/user/1/…`, `/api/illustration/user/1/…`.
Always guard on `is_deleted` — list endpoints and search views exclude
soft-deleted rows, so a deleted fixture silently 404s.

**Mutation tests create their own content via the API** (e.g.
`POST /api/icon/add` as a contributor/admin user) and clean it up via the
API (`DELETE /api/icon/:id` — a soft delete). Never insert content rows
directly.

## Existing harness — reuse it

- `tests/agent.js` — the shared supertest agent.
- `tests/test-user-helper.js` — `createTestUser()` implements the canonical
  register→verify→role→login flow; `getTestUsers()` reads the canonical
  users; `cleanupOrphanedTestUsers()` sweeps crashed-run leftovers.
- `tests/jest.globalSetup.js` — provisions canonical `admin`, `contributor`,
  `member` users once per run; writes `{ userId, token }` per role to
  `tests/.test-users.json`.
- `tests/jest.globalTeardown.js` — deletes the run's test users + dependent
  rows and calls `DB.knex.destroy()` (without which Jest hangs).

In a suite:

```javascript
const agent = require('./agent');
const { getTestUsers } = require('./test-user-helper');

let adminToken;

beforeAll(() => {
    adminToken = getTestUsers().admin.token; // already 'Bearer …'
});

// Scenario: admin lists icons with default pagination
it('should return the first page of icons', async () => {
    const res = await agent
        .get('/api/icon/list/0/25')
        .set('Authorization', adminToken)
        .expect(200);

    expect(Array.isArray(res.body.icons)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.limit).toBe(25);
});
```

Some legacy suites use `process.env.AUTH_TOKEN` or `tests/helpers.js`
fixture builders that write directly to the DB — do NOT copy those patterns
for new tests; they predate the API-first policy.

## Gotchas checklist

- `PORT=5002` must be exported or the server binds 5000 while tests hit 5002.
- Login token already contains `"Bearer "` — don't prefix it again.
- Unverified users can't log in; verify (DB patch) before login.
- Grant roles before login, not after.
- `checkRole` 401/403 = plain text; error-handler errors = `{ error }` JSON.
- Read routes are public via the Guest fallback — a "missing auth" test on a
  Guest-allowed route will NOT 401.
- `POST /api/order/webhook` skips JSON body parsing (Stripe raw body).
- Rate limiters are bypassed when `ENV_NAME`/`NODE_ENV` is
  local/test/development — registration bursts in tests won't throttle.
- Run serially (`--runInBand`); the shared server/DB is not parallel-safe.
- Dev DB only. Never point tests at production.
