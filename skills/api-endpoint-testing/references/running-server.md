# Running-Server Test Pattern

Tests run against a live server process. Supertest sends real HTTP requests to
the server URL. This is the default pattern for the vectoricons v1 API — see
[vectoricons.md](vectoricons.md) for the project-specific contract (auth flow,
role system, response envelopes, sanctioned DB operations).

NOTE: Do not spin up a server instance in the Claude sandbox. The human has a server
instance running already. If it is not accessible it is likely down. Ask the human 
to restart the server.

## When to use

- Testing the full HTTP stack: routing, middleware, auth, CORS, body parsing
- Verifying responses match what a real client would see
- Testing against a specific environment (local, test, dev)

## Setup

### Agent module

Create a shared agent that all test files import:

```javascript
const request  = require('supertest');
const testData = require('./data');

module.exports = request.agent(testData.TEST_SERVER_URL);
```

### Fixture selection — at runtime, not hardcoded

Do NOT centralize hardcoded entity IDs and trust them forever — shared
databases drift and hardcoded IDs go stale (the v1 `tests/data.js` constants
are a documented example). Select real fixtures at runtime instead:

```javascript
// Read-only DB selection: a real icon owned by the site owner
const icon = await DB.icons.query()
    .whereRaw('COALESCE(is_deleted, false) = false')
    .where('user_id', 1)
    .first();

// Or via a public owner-scoped endpoint
const res = await agent.get('/api/icon/user/1/0/1').expect(200);
const icon = res.body.icons[0];
```

Constants that ARE stable (server URL, the fixture owner's user id) can live
in a shared test-data module.

### Global setup / teardown

Use Jest's `globalSetup` and `globalTeardown` to create and destroy test
users. This runs once per test run, not once per test file.

Key principles:
- Create test users **via the registration API**, with unique, identifiable
  emails (e.g. `prefix+test-{role}-{shortId}@…`) so cleanup can find them
- Apply only the sanctioned DB operations afterwards (verify patch, role
  xref insert — see [vectoricons.md](vectoricons.md))
- Log in via the API to get each user's token; write credentials to a temp
  file that test suites read
- Clean up orphaned users from crashed previous runs in setup, not just
  teardown
- Each role (admin, contributor, member) gets its own test user

### Auth in tests

Set the Authorization header with the test user's JWT token. In the v1 API
the login response's `token` field already includes the `"Bearer "` prefix —
send it verbatim:

```javascript
const { getTestUsers } = require('./test-user-helper');

let adminToken;

beforeAll(() => {
    const users = getTestUsers();
    adminToken = users.admin.token; // already 'Bearer …'
});

// Scenario: authenticated admin fetches their own profile
it('should return the user profile', async () => {
    const res = await agent
        .get('/api/user/profile')
        .set('Authorization', adminToken)
        .expect(200);

    expect(res.body.user.email).toBeDefined();
});
```

### Testing auth enforcement

Test what happens without auth and with the wrong role — but read the route's
middleware chain FIRST. In the v1 API, unauthenticated requests fall back to
a Guest user, so routes whose role allow-list includes Guest are effectively
public and will NOT 401. Only routes that exclude Guest reject:

```javascript
// Scenario: mutation endpoint rejects unauthenticated (Guest) request
// NOTE: v1 checkRole 401/403 bodies are PLAIN TEXT, not { error } JSON
it('should return 401 without auth token', async () => {
    await agent
        .post('/api/icon/add')
        .expect(401);
});

// Scenario: customer (non-admin/contributor) is forbidden from mutations
it('should return 403 for customer-role user', async () => {
    const users = getTestUsers();

    await agent
        .post('/api/icon/add')
        .set('Authorization', users.member.token)
        .expect(403);
});
```

## Complete example

```javascript
/**
 * Icon API integration tests.
 *
 * Tests cover: listing icons with path-based pagination, retrieving an
 * icon by ID, auth enforcement on mutations, and not-found handling.
 */
const agent = require('./agent');
const { getTestUsers } = require('./test-user-helper');
const DB = require('../server/lib/db');

describe('GET /api/icon/:id', () => {

    let fixtureIcon;

    beforeAll(async () => {
        // Runtime fixture selection: a live icon owned by user 1
        fixtureIcon = await DB.icons.query()
            .whereRaw('COALESCE(is_deleted, false) = false')
            .where('user_id', 1)
            .first();
    });

    // Scenario: fetch an existing icon by ID (public route, Guest allowed)
    it('should return the icon with related entities', async () => {
        const res = await agent
            .get(`/api/icon/${fixtureIcon.id}`)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(res.body.icon.id).toBe(fixtureIcon.id);
        expect(res.body.icon.name).toBe(fixtureIcon.name);
        expect(res.body).toHaveProperty('relatedIcons');
        expect(res.body).toHaveProperty('family');
    });

    // Scenario: requesting a non-existent icon returns 404 { error }
    it('should return 404 for non-existent icon', async () => {
        const res = await agent
            .get('/api/icon/999999999')
            .expect(404);

        expect(res.body.error).toBe('Item not found');
    });
});

describe('GET /api/icon/list/:start/:limit', () => {

    // Scenario: first page of 25 icons, path-based pagination envelope
    it('should return the list envelope with pagination fields', async () => {
        const res = await agent
            .get('/api/icon/list/0/25')
            .expect(200);

        expect(Array.isArray(res.body.icons)).toBe(true);
        expect(res.body.icons.length).toBeGreaterThan(0);
        expect(res.body.total).toBeGreaterThan(0);
        expect(res.body.start).toBe(0);
        expect(res.body.limit).toBe(25);
    });
});
```

## Common pitfalls

- **Not asserting on response body:** A 200 status doesn't mean the response
  is correct. Always assert on the body shape and key field values.
- **Hardcoded entity IDs:** They go stale in a shared database. Select
  fixtures at runtime (read-only query or public endpoint).
- **Assuming a uniform envelope:** The v1 API has none — lists, search,
  single-item, and mutation responses all differ. Read the route handler.
- **Expecting 401 on public reads:** Guest fallback makes most read routes
  public. Only Guest-excluded routes reject.
- **Tests that depend on execution order:** Each test must be independent.
  If test B only passes after test A creates a record, that's a design bug.
- **Ignoring the teardown:** Whatever a test creates via the API it removes
  via the API; test users are cleaned up in global teardown. Otherwise you
  pollute the shared dev DB and other tests break unpredictably.
