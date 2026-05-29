# Running-Server Test Pattern

Tests run against a live server process. Supertest sends real HTTP requests to
the server URL.

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

### Test data module

Centralize test constants so IDs, URLs, and reference data aren't scattered
across test files:

```javascript
module.exports = {
    TEST_SERVER_URL : 'http://127.0.0.1:5002',
    TEST_USER_ID    : 58,
    TEST_ORDER_ID   : 197,
    // ... other known-good entity IDs for the test environment
};
```

### Global setup / teardown

Use Jest's `globalSetup` and `globalTeardown` to create and destroy test users.
This runs once per test suite, not once per test file.

Key principles:
- Create test users with unique, identifiable emails (e.g., a pattern like
  `prefix+test-{role}-{shortId}@gmail.com`)
- Write credentials to a temp file that test suites read
- Clean up orphaned users from crashed previous runs in setup, not just teardown
- Each role (admin, contributor, member) gets its own test user

### Auth in tests

Set the Authorization header with the test user's JWT token:

```javascript
const { getTestUsers } = require('./test-user-helper');

let adminToken;

beforeAll(() => {
    const users = getTestUsers();
    adminToken = users.admin.token;
});

it('should return the user profile', async () => {
    const res = await agent
        .get('/api/user/profile')
        .set('Authorization', adminToken)
        .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBeDefined();
});
```

### Testing auth enforcement

Always test what happens without auth and with the wrong role:

```javascript
// Scenario: unauthenticated request is rejected
it('should return 401 without auth token', async () => {
    await agent
        .get('/api/admin/users')
        .expect(401);
});

// Scenario: non-admin user is forbidden from admin endpoints
it('should return 403 for non-admin user', async () => {
    const users = getTestUsers();

    await agent
        .get('/api/admin/users')
        .set('Authorization', users.member.token)
        .expect(403);
});
```

## Complete example

```javascript
/**
 * Order API integration tests.
 *
 * Tests cover: retrieving orders by ID, listing orders with pagination,
 * auth enforcement, and not-found handling.
 */
const agent    = require('./agent');
const testData = require('./data');
const { getTestUsers } = require('./test-user-helper');

describe('GET /api/order/:orderId', () => {

    let adminToken;

    beforeAll(() => {
        const users = getTestUsers();
        adminToken = users.admin.token;
    });

    // Scenario: admin retrieves an existing order by ID
    it('should return the order with correct structure', async () => {
        const res = await agent
            .get(`/api/order/${testData.TEST_ORDER_ID}`)
            .set('Authorization', adminToken)
            .expect(200)
            .expect('Content-Type', /json/);

        expect(res.body.success).toBe(true);
        expect(res.body.order).toBeDefined();
        expect(res.body.order.id).toBe(testData.TEST_ORDER_ID);
    });

    // Scenario: requesting a non-existent order returns 404
    it('should return 404 for non-existent order', async () => {
        await agent
            .get('/api/order/999999')
            .set('Authorization', adminToken)
            .expect(404);
    });

    // Scenario: unauthenticated request is rejected
    it('should return 401 without auth token', async () => {
        await agent
            .get(`/api/order/${testData.TEST_ORDER_ID}`)
            .expect(401);
    });
});
```

## Common pitfalls

- **Not asserting on response body:** A 200 status doesn't mean the response is
  correct. Always assert on the body shape and key field values.
- **Hardcoded IDs that don't exist in the test DB:** Use the test data module
  for known-good entity IDs.
- **Tests that depend on execution order:** Each test must be independent. If
  test B only passes after test A creates a record, that's a test design bug.
- **Ignoring the teardown:** If your test creates data (registers a user, creates
  an order), clean it up. Otherwise you pollute the test DB and other tests break
  in unpredictable ways.
