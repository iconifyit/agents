---
name: api-endpoint-testing
description: >-
  Guides writing thorough API endpoint and component integration tests with
  Jest and supertest (Express/Node), including the vectoricons v1 API
  (vectopus-code/v1). Core policy: test through real API endpoints with real
  users and real data — never manipulate the database directly except for the
  few sanctioned operations the API cannot perform. Covers HTTP endpoint tests
  against a running server, in-process tests via supertest(app), and
  direct-invocation tests for internal component chains. Use whenever writing
  tests for API routes, middleware, service layers, or any server-side code
  needing integration-level verification — or when asked to "add tests",
  "write integration tests", "test this endpoint", or "prove this code works."
---

# API Endpoint & Integration Testing

This skill helps you write integration tests that prove code does what it's
supposed to do — not just that it runs without crashing.

## When to use this skill

Reach for this skill when you need to test server-side code at the integration
level: HTTP endpoints, internal service chains, middleware behavior, and
anything where the question is "does this system work end-to-end?" rather than
"does this function return the right value in isolation?"

**If you are testing the vectoricons v1 API** (`vectopus-code/v1`), read
[references/vectoricons.md](references/vectoricons.md) FIRST. It is the
project-specific contract: server/auth setup, the role system, response
envelopes, fixture selection, and the sanctioned-DB-operations policy in full.

## Prime directive: test through the API, not the database

Integration tests exist to prove the API works the way a real client
experiences it. Creating users, logging in, resetting passwords, creating or
modifying content — all of it goes through real API endpoints with real users
and real data. If you set up test state by writing to the database, you have
tested nothing about the code paths that create that state, and your test can
pass while the API is broken.

**Direct DB access is allowed ONLY for:**

1. **Read-only fixture selection** — querying for a real, existing row to use
   as test input (e.g. an icon owned by a known user).
2. **Marking a new test user verified** — `is_verified = true`,
   `verified_at = NOW()`. The verification link goes out by email, so the
   token is not reachable from a test; this one patch stands in for clicking
   the link.
3. **Assigning a non-default role to a test user** — one insert into the
   `user_to_roles` xref. The API has no endpoint that grants roles, and
   admin/contributor-gated endpoints cannot be tested without it.
4. **Teardown cleanup** — deleting ONLY the rows the test run created,
   matched by the test-user email pattern. Never truncate; never delete data
   you did not create.

Everything else — registration, login, logout, password flows, content CRUD,
favorites, downloads — happens via HTTP calls to the running API.

## Choose the right test pattern

### Pattern 1: Running-server tests (default for the vectoricons v1 API)

**When:** Testing HTTP request/response behavior — status codes, response body
shape, auth enforcement, pagination — the way a real client sees it.

**How:** A shared `supertest.agent(SERVER_URL)` pointed at a locally running
server. The server must be up before tests run; tests exercise the full stack:
routing, middleware, auth, DB, and response formatting.

See [references/running-server.md](references/running-server.md).

### Pattern 2: In-process tests

**When:** HTTP-level testing without a running server (CI pipelines, isolated
runs). `supertest(app)` with the importable Express app. Not applicable to
the vectoricons v1 API — importing its app triggers DB and event-bus side
effects.

See [references/in-process.md](references/in-process.md).

### Pattern 3: Direct invocation

**When:** Testing an internal pipeline with no HTTP involved (event-driven
chains, service-to-service calls, template rendering). Instantiate real
components; mock only the outermost infrastructure boundary.

See [references/direct-invocation.md](references/direct-invocation.md).

## Test design principles

### Analyze the code before testing it

Before writing a single test, read the route file, its middleware chain, and
the helpers it calls. Understand the validation rules, the exact response
shape it builds, and the failure paths. API codebases accumulate conventions
(response envelopes, pagination, soft deletes, guest fallbacks) that you
cannot guess — read them. Do not write tests from assumptions.

### Every test proves something specific

A test that passes when you delete the implementation is worthless. Ask: "If
someone deleted the core logic, would this test fail?" If no, rewrite it.

### Test the contract, not the implementation

Assert on what the endpoint promises (status, body shape, field values, state
changes observable via subsequent API calls), not on internals.

### Cover all response paths

- **Happy path** — valid input, expected result
- **Validation failures** — missing/invalid fields
- **Auth failures** — no token, expired/invalidated token, wrong role
- **Not found** — valid request for a nonexistent resource
- **Conflict/duplicate** — creating something that already exists
- **Error states** — dependency failure behavior

Each outcome is a separate test.

### Use real users and real data

Register real users through the API for auth scenarios. Select real existing
rows (owned by a known user) as fixtures for read scenarios. No `foo`, `bar`,
or invented IDs — an ID you made up tests nothing, and a hardcoded ID goes
stale. Select fixtures at runtime.

### Scenario comments

Every test starts with a comment stating the scenario:

```javascript
// Scenario: registered+verified customer requests their own profile
it('should return the user profile', async () => { /* ... */ });
```

### Time handling

Freeze time in tests. Use a fixed ISO timestamp and derive all dates relative
to it. Never call `new Date()` in an assertion.

### Clean up after yourself

Whatever a test creates through the API, it removes through the API (e.g.
`DELETE` the icon it `POST`ed). Test users are cleaned up in teardown per the
sanctioned-operations policy. Tests must not depend on each other's leftovers.

### Error assertions are not optional

If the code handles errors, test that the handling works: the status code,
the error body shape, and that side effects did NOT happen on failure.

## Test file structure

```javascript
/**
 * [Module name] integration tests.
 *
 * [What's being tested and why.]
 */

// ── Dependencies ──────────────────────────────────────────────
// Group: test infrastructure, then helpers, then constants

// ── Helpers ───────────────────────────────────────────────────
// shared setup functions, payload builders

// ── Tests ─────────────────────────────────────────────────────
describe('[endpoint or component]', () => {

    // Setup/teardown at this level

    describe('[specific behavior or sub-route]', () => {

        // Scenario: [description]
        it('should [expected behavior]', async () => {
            // Arrange — set up data and state
            // Act — call the code under test
            // Assert — verify the outcome
        });
    });
});
```

## Assertion quality

Weak assertions that pass too easily are worse than no assertions because they
create false confidence.

**Weak:** `expect(res.status).toBe(200)` — alone, tells you nothing about the
response.

**Strong:** status AND body structure AND specific field values:

```javascript
expect(res.status).toBe(200);
expect(res.body.success).toBe(true);
expect(res.body.user.email).toBe(registeredEmail);
expect(res.body.user.roles).toContain('ROLE_CUSTOMER');
```

For state changes, verify through the API: after `POST /add`, `GET` the new
resource and assert its fields; after `DELETE`, assert the subsequent `GET`
404s.

## Codebase-specific reference

For the vectoricons v1 API, [references/vectoricons.md](references/vectoricons.md)
is mandatory reading before writing any test. For other codebases, look for a
project reference file in `references/` and read it first.
