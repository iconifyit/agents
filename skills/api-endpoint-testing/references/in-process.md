# In-Process Test Pattern

Tests import the Express app directly and pass it to supertest. No running
server needed — supertest creates an ephemeral listener for each test.

> **Not applicable to the vectoricons v1 API.** Requiring its `server/app.js`
> / `server/index.js` triggers real side effects at import time (DB pool
> creation, event-bus startup, mail poller). Use the running-server pattern
> for that project — see [vectoricons.md](vectoricons.md). This pattern
> remains valid for Express apps whose `app` module imports cleanly.

## When to use

- CI pipelines where you can't guarantee a server is running
- Fast, isolated HTTP-level tests
- When you want to mock specific middleware or services per-test
- When the Express app can be imported cleanly (no side effects that require
  infrastructure)

## Setup

### Basic usage

```javascript
const request = require('supertest');
const app     = require('../server/app');

describe('GET /api/health', () => {

    // Scenario: health endpoint returns 200 with status
    it('should return healthy status', async () => {
        const res = await request(app)
            .get('/api/health')
            .expect(200);

        expect(res.body.status).toBe('ok');
    });
});
```

### With mocked dependencies

When the app requires services that aren't available in the test environment
(DB, external APIs, SMTP), mock them at the module level:

```javascript
jest.mock('../server/services/mail-service', () => ({
    send : jest.fn().mockResolvedValue({ messageId : 'mock-001' }),
}));

jest.mock('../server/event-bus', () => ({
    emitter : { emit : jest.fn() },
}));

const request = require('supertest');
const app     = require('../server/app');
```

The key insight: mock at the boundary of the system under test, not deep inside
it. If you're testing an endpoint that sends email, mock the mail transport —
not the endpoint handler itself.

### Auth simulation

For in-process tests, you can either mock the auth middleware or generate real
tokens depending on what you're testing:

```javascript
// Option A: Mock passport/auth middleware for route-logic tests
jest.mock('../server/middleware/auth', () => ({
    requireAuth : (req, res, next) => {
        req.user = { id : 58, role : 'ROLE_ADMIN', email : 'admin@test.com' };
        next();
    },
}));

// Option B: Generate a real JWT for auth-behavior tests
const jwt = require('jsonwebtoken');
const adminToken = jwt.sign(
    { userId : 58, role : 'ROLE_ADMIN' },
    process.env.JWT_SECRET,
    { expiresIn : '1h' },
);
```

Use Option A when you're testing the route handler logic and auth is just
noise. Use Option B when you're testing auth enforcement itself.

Either way, match the REAL shapes your app uses — read the auth middleware
and JWT strategy before mocking. The `req.user` and payload shapes above are
illustrative; e.g. in the vectoricons v1 API, roles live at
`req.user.roles[i].role.value` (an array from the `user_to_roles` xref, not
a `role` string) and the JWT payload is keyed on `uuid` + `token_version`.
A mock with the wrong shape passes where production fails.

## When to avoid this pattern

- When the app import triggers heavy side effects (DB pool creation, external
  service connections) that can't be mocked cleanly
- When you need to test the full deployed stack including server configuration,
  process-level middleware, or connection pooling
- When tests need to verify behavior that's specific to the server process
  (graceful shutdown, port binding, cluster mode)

## Common pitfalls

- **Module caching:** `require('../server/app')` returns the same instance
  across all tests in a file. If one test mutates app state, subsequent tests
  see the mutation. Use `beforeEach` to reset state or clear mocks.
- **jest.mock hoisting:** `jest.mock()` calls are hoisted above imports. If
  your mock references a variable defined after the mock call, it will be
  undefined. Use factory functions or `jest.fn()` directly.
- **Forgetting to clear mocks:** If a mock tracks calls across tests, use
  `jest.clearAllMocks()` in `afterEach` to prevent cross-test pollution.
