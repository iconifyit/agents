---
name: api-endpoint-testing
description: >-
  Guides writing thorough API endpoint and component integration tests with
  Jest and supertest (Express/Node). Covers HTTP endpoint tests against a
  running server, in-process tests via supertest(app), and direct-invocation
  tests for internal component chains that don't involve HTTP. Use whenever
  writing tests for API routes, middleware, service layers, event-driven
  pipelines, or any server-side code that needs integration-level verification.
  Also use when reviewing existing tests for completeness, or when asked to
  "add tests", "write integration tests", "test this endpoint", or "prove
  this code works."
---

# API Endpoint & Integration Testing

This skill helps you write integration tests that prove code does what it's
supposed to do — not just that it runs without crashing.

## When to use this skill

Reach for this skill when you need to test server-side code at the integration
level. That includes HTTP endpoints, internal service chains, event-driven
pipelines, middleware behavior, and anything where the question is "does this
system work end-to-end?" rather than "does this function return the right value
in isolation?"

## Choose the right test pattern

Before writing any test, decide which pattern fits. The wrong pattern wastes
time and produces tests that don't prove anything useful.

### Pattern 1: Running-server tests

**When:** You're testing HTTP request/response behavior — status codes, headers,
response body shape, auth enforcement, query params, pagination.

**How:** supertest agent pointed at a running server URL. The server must be up
before tests run. Tests exercise the full stack: Express routing, middleware,
auth, DB, and response formatting.

**Trade-off:** Most realistic, but requires server infrastructure. Slower. Test
failures can be caused by server state, not just code bugs.

See [references/running-server.md](references/running-server.md) for setup patterns and examples.

### Pattern 2: In-process tests

**When:** You want HTTP-level testing without a running server. Good for CI
pipelines and isolated test runs.

**How:** `supertest(app)` where `app` is the Express application instance.
supertest spins up an ephemeral listener — no server process needed. Still
exercises Express routing and middleware.

**Trade-off:** Fast and self-contained, but requires the Express app to be
importable without side effects that blow up (DB connections, external service
init). May need careful module mocking.

See [references/in-process.md](references/in-process.md) for setup patterns and examples.

### Pattern 3: Direct invocation

**When:** You're testing an internal pipeline that doesn't involve HTTP at all.
Event-driven chains, service-to-service calls, template rendering, notification
delivery — anything where the entry point is a function call, not an HTTP
request.

**How:** Instantiate the real components with real dependencies, mock only at
the outermost boundary (SMTP transport, external API calls, cloud services).
Call the entry point directly and assert on what happened downstream.

**Trade-off:** Tests exactly the code path you care about without HTTP noise.
But won't catch routing/middleware bugs.

See [references/direct-invocation.md](references/direct-invocation.md) for setup patterns and examples.

## Test design principles

These apply regardless of which pattern you use.

### Start by reading the code

Before writing a single test, read the implementation you're testing. Understand
what it does, what it calls, what it expects, and what can go wrong. Do not
write tests based on assumptions about how code works — read it.

### Every test proves something specific

A test that passes when you delete the implementation is worthless. Every test
must assert on a specific, observable behavior that would break if the code
under test were removed or changed.

Ask yourself: "If someone deleted the core logic, would this test fail?" If the
answer is no, rewrite the test.

### Test the contract, not the implementation

Assert on what the code promises to do (return values, side effects, state
changes), not on how it does it internally. Tests coupled to implementation
details break every time you refactor, even when behavior is unchanged.

### Cover all response paths

For any endpoint or function, identify every distinct outcome:

- **Happy path** — The normal success case with valid input
- **Validation failures** — Missing required fields, invalid formats, wrong types
- **Auth failures** — No token, expired token, wrong role
- **Not found** — Valid request for a resource that doesn't exist
- **Conflict/duplicate** — Creating something that already exists
- **Error states** — What happens when a dependency fails (DB down, service timeout, template missing)

Each outcome is a separate test. Don't lump them together.

### Use realistic data

No `foo`, `bar`, `test123`, or meaningless placeholder values. Use data that
looks like what the system actually processes. Realistic data catches bugs that
synthetic data misses — encoding issues, length limits, special characters,
timezone problems.

### Scenario comments

Every test must start with a comment explaining the scenario being tested.
This serves as documentation and makes test failures immediately understandable.

```javascript
// Scenario: contributor requests cashout of $150 via PayPal,
// admin email notification sent with correct amount and method
it('should send admin notification with cashout details', async () => {
    // ...
});
```

### Time handling

Freeze time in tests. Use a fixed ISO timestamp and derive all dates relative
to it. Never use `new Date()` in assertions — the test will flake when the
clock ticks between setup and assertion.

```javascript
const kTEST_TIME = '2026-05-15T12:00:00.000Z';
const kYESTERDAY = '2026-05-14T12:00:00.000Z';
```

### Clean up after yourself

Tests must not leave state that affects other tests. Seed what you need in
`beforeEach`, tear it down in `afterEach`. If you create DB records, delete
only the specific records you created — never truncate tables.

### Error assertions are not optional

If the code handles errors (and it should), test that the error handling works.
Mock the dependency to throw, verify the error propagates correctly, verify
error responses have the right shape, verify side effects don't happen on
failure.

## Test file structure

```javascript
/**
 * [Module name] integration tests.
 *
 * [Brief description of what's being tested and why.]
 */

// ── Dependencies ──────────────────────────────────────────────
// Group: test infrastructure, then mocks, then code under test

// ── Helpers ───────────────────────────────────────────────────
// createMockX(), buildPayload(), shared setup functions

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

**Weak:** `expect(res.status).toBe(200)` — tells you nothing about the response

**Better:** Assert on status AND body structure AND specific field values

```javascript
expect(res.status).toBe(200);
expect(res.body.success).toBe(true);
expect(res.body.user.email).toBe('natasha@shield.gov');
expect(res.body.user.role).toBe('ROLE_CONTRIBUTOR');
```

**For side effects** (emails sent, events emitted, DB records created), assert
on the specific arguments, not just that the function was called:

```javascript
// Weak
expect(mockSend).toHaveBeenCalled();

// Strong
expect(mockSend).toHaveBeenCalledWith({
    to       : 'natasha@shield.gov',
    subject  : 'Welcome to VectorIcons!',
    template : 'welcome-offer',
    data     : expect.objectContaining({ name : 'Natasha' }),
});
```

## Codebase-specific reference

If a `references/` directory exists for this skill with a project-specific
reference file, read it before writing tests. It contains patterns, conventions,
helpers, and infrastructure specific to the codebase you're working in.
