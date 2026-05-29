# VectorIcons Codebase Reference

Project-specific patterns, conventions, and infrastructure for testing in the
server-v1 codebase. Read this before writing any tests for this project.

## Test infrastructure

### Integration tests (HTTP)

- **Config:** `jest.config.js` — matches `tests/*.test.js`
- **Run:** `npm test`
- **Agent:** `tests/agent.js` — `supertest.agent(testData.TEST_SERVER_URL)`
- **Server URL:** `http://127.0.0.1:5002` (must be running)
- **Test data:** `tests/data.js` — known-good entity IDs for the test environment
- **User setup:** `tests/jest.globalSetup.js` creates admin, contributor, member
  users via the register API, assigns roles in DB, writes credentials to
  `tests/.test-users.json`
- **User cleanup:** `tests/jest.globalTeardown.js` deletes test users
- **User helper:** `tests/test-user-helper.js` — `createTestUser()`,
  `getTestUsers()`, `cleanupOrphanedTestUsers()`, `writeTestUsers()`
- **Email pattern:** `user+test-{role}-{shortId}@example.com`
- **DB access:** `const DB = require('@vectopus.com/db');` (note: integration
  tests in tests/ use `@vectopus.com/db`, event-bus code uses
  `@vectoricons.net/db`)

### Unit tests (co-located)

- **Config:** `jest.unit.config.js` — matches `server/**/__tests__/**/*.unit.test.js`
- **Run:** `npm run test:unit`
- **No infrastructure required** — all external deps are mocked
- **Naming:** `{module-name}.unit.test.js`
- **Location:** `__tests__/` directory next to the code being tested

## EventBus architecture (ADR-006 v0.0.2)

The notification pipeline follows: domain event → plugin → notifier → service → transport

### Services (internal infrastructure)

- `MailService` — wraps nodemailer SMTP transport
- `SlackService` — wraps AWS SNS publish
- `TemplateService` — wraps Nunjucks rendering engine

### Notifiers (plugin-facing interface)

- `EmailNotifier` — `send({ to, template, data, subject })` — renders template
  then sends via MailService
- `SlackNotifier` — `send({ channel, message })` — sends via SlackService

### Plugins (domain logic)

Each plugin is a factory function: `(context) => ({ name, events: [{ type, handler }] })`

Context shape: `{ emailNotifier, slackNotifier }`

Plugins registered in `server/event-bus/index.js`:
- `auth-notifications` — verify-email, password-reset, password-changed, email-change
- `cashout-notifications` — 7 cashout lifecycle events
- `contact-form-notifications` — contact form → admin email
- `contributor-notifications` — signup (3 notifications) + approval (2 notifications)
- `error-handler` — eventbus.error → admin email + Slack
- `order-notifications` — credits, purchases, subscriptions, renewals
- `set-notifications` — set published
- `signup-notifications` — welcome email + Slack

### Template directory

Templates live in `server/email-templates/` and are Nunjucks HTML files.
All templates extend `_base.html` which includes `_header.html`,
`_footer.html`, and `_styles.html` partials.

The TemplateService is configured in `server/event-bus/index.js`:
```javascript
const templateService = initTemplateService({
    templateDir : path.resolve(__dirname, '..', 'email-templates'),
    defaults    : {
        LOGO_URL  : process.env.VECTORICONS_LOGO_URL,
        SITE_NAME : process.env.VECTORICONS_SITE_NAME,
        SITE_URL  : process.env.VECTORICONS_SERVER_URL,
    },
});
```

### Write-only emitter

Route handlers import the write-only emitter:
```javascript
const { emitter } = require('../../event-bus');
```

The emitter only has `emit()` — no `on()` or `off()`. This prevents route
handlers from subscribing to events, enforcing the one-way data flow.

## Coding conventions

### Object property alignment

Align properties on the colon, one space before, aligned to the longest key:

```javascript
const payload = {
    amount   : 150.00,
    email    : 'natasha@shield.gov',
    method   : 'paypal',
    username : 'blackwidow',
};
```

### Conditional blocks

```javascript
if (condition) {
    // ...
}
else if (other) {
    // ...
}
else {
    // ...
}
```

### Variable naming

- `camelCase` for variables and functions
- `PascalCase` for classes
- `kUPPER_SNAKE_CASE` for constants cast from env vars
- Trailing commas in multi-line objects and arrays

### Mock event objects

Match the Event interface from @vectoricons.net/event-bus:

```javascript
const createMockEvent = (payload) => ({
    getData : () => payload,
});
```

For events that also have a source event (error handler):

```javascript
const createMockSourceEvent = (name, payload) => ({
    getData : () => payload,
    getName : () => name,
});
```

### Mock context objects

```javascript
const createMockContext = () => ({
    emailNotifier : {
        send : jest.fn().mockResolvedValue({ messageId : 'msg-001' }),
    },
    slackNotifier : {
        send : jest.fn().mockResolvedValue({ MessageId : 'sns-001' }),
    },
});
```

## Test email addresses

- **User-facing test emails:** `user+eventbus@example.com`
- **Admin test emails:** `admin@example.com`
- **Test user registration:** `user+test-{role}-{shortId}@example.com`

These use the `+folder` sub-addressing pattern (supported by Gmail and others),
so test mail lands in a single searchable inbox. Substitute an address you
control when running the tests.

## Environment variables for tests

When initializing components for direct-invocation tests, set:

```javascript
process.env.VECTORICONS_LOGO_URL       = 'https://vectoricons.net/logo.png';
process.env.VECTORICONS_SITE_NAME      = 'VectorIcons';
process.env.VECTORICONS_SERVER_URL     = 'https://vectoricons.net';
process.env.NODE_MAILER_HOST           = 'smtp.example.com';
process.env.NODE_MAILER_PORT           = '465';
process.env.NODE_MAILER_USER           = 'noreply@example.com';
process.env.NODE_MAILER_PASSWORD       = 'test-password';
process.env.REMOTE_MESSENGER_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789:test-topic';
process.env.ADMIN_EMAIL                = 'admin@example.com';
process.env.ENV_NAME                   = 'local';
```

## Known issues

- The `error-notification` template is referenced by the error-handler plugin
  but does not exist in `server/email-templates/`. This is a known gap that
  needs to be addressed — tests for the error-handler pipeline will fail on
  template rendering until the template is created.
