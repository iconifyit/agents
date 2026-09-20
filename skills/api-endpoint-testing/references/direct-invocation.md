# Direct Invocation Test Pattern

Tests call internal components directly — no HTTP, no Express, no supertest.
The entry point is a function call, and assertions target downstream effects.

## When to use

- Event-driven pipelines: emit an event, verify handlers fire and produce
  correct side effects
- Service chains: call a service method, verify it coordinates its
  dependencies correctly
- Template rendering: verify templates produce correct output with given data
- Notification delivery: verify the right message reaches the right recipient
  via the right channel
- Any internal pipeline where HTTP is not part of what you're testing

In the vectoricons v1 API this is the pattern behind the service-tier suites
(`jest.service.config.js` → `server/**/__tests__/*.integration.test.js`) and
the event-bus/plugin suites (`server/event-bus/__tests__/`, plus a
`__tests__/` directory inside each plugin). **Before writing a new one, read
the nearest existing `__tests__` suite for the component you're testing and
copy its setup** — those suites are the authoritative, working pattern for
wiring these components.

## The boundary principle

Mock at the outermost boundary of the system under test — the point where
your code hands off to infrastructure you don't own:

- **SMTP transport** — mock `nodemailer.createTransport().sendMail()`
- **Cloud services** — mock the SNS client's `publish()` (SlackService takes
  an injected `snsClient`, so this can be plain dependency injection)
- **External HTTP APIs** — mock the HTTP client
- **File system** — mock only when testing failure modes; use real fs for
  template rendering tests
- **Database** — mock when testing business logic; use real DB for data
  integrity tests

Everything between the entry point and the boundary should be real. That's
what "integration test" means — you're testing that real components integrate
correctly.

## The vectoricons v1 event-bus, as currently wired

The single source of truth is `api/server/event-bus/index.js` — mirror its
wiring in tests. As of this writing:

- **Bus:** `const { initEventBus, PluginLoader } =
  require('@vectoricons.net/event-bus');` — `initEventBus()` creates the bus;
  plugins are loaded through a `PluginLoader({ eventBus : bus })`.
- **Services (init factories, not classes-you-`new`):**
  - `initTemplateService({ templateDir, defaults })` — Nunjucks rendering;
    templates live in **`server/templates/`** (NOT `server/email-templates`)
  - `initMailTransport({ host, port, secure, auth, defaultFrom })` — wraps
    nodemailer; throws on missing/invalid `NODE_MAILER_*` env vars
  - `initMailService({ db, mailTransport, templateService, eventBus })` —
    the queue-aware mail SOA module (`server/services/mail/`, ADR-007):
    persists to `email_queue`, and `processQueue` emits `mail.<emailTypeId>`
    events that plugins subscribe to for rendering + delivery
  - `initSlackService({ region, topicArn })` — AWS SNS → Lambda → Slack relay
- **Notifiers:** `initEmailNotifier(mailTransport, templateService)` sends
  synchronously (immediate delivery); `initSlackNotifier(slackService)`.
  For queued/scheduled delivery, plugins use `context.mailService.queue()`
  instead of the notifier.
- **Plugin context shape:**
  `{ DB, emitter : bus.createEmitter(), emailNotifier, mailService, slackNotifier }`
  — the emitter is write-only (`emit()` but no `on()`), enforcing one-way
  data flow from route handlers into the bus.
- **Plugins** (`server/event-bus/plugins/`): auth-notifications,
  cashout-notifications, contact-form-notifications,
  contributor-notifications, error-handler, mailer, order-notifications,
  set-notifications, signup-notifications, slack-notifier.
- **Module-load side effects:** requiring `server/event-bus/index.js` starts
  a mail-queue poller and registers signal handlers. Suites that re-require
  it must delete it from `require.cache` and let its built-in teardown run —
  again, copy the existing `server/event-bus/__tests__` setup rather than
  hand-rolling this.

## Example: notifier chain with the transport mocked

Testing that the email notifier renders a real template and hands the result
to the transport — nodemailer is the only mock:

```javascript
/**
 * EmailNotifier integration tests.
 *
 * Real TemplateService (real Nunjucks, real templates from
 * server/templates/) + real MailTransport wiring, with nodemailer's
 * sendMail mocked at the transport boundary.
 */

// ── Mock transport boundary ───────────────────────────────────
const mockSendMail = jest.fn().mockResolvedValue({ messageId : 'test-001' });

jest.mock('nodemailer', () => ({
    createTransport : jest.fn(() => ({ sendMail : mockSendMail })),
}));

// ── Real components ───────────────────────────────────────────
const path = require('path');
const { initTemplateService } = require('../services/TemplateService');
const { initMailTransport }   = require('../services/MailTransport');
const { initEmailNotifier }   = require('../event-bus/notifiers/EmailNotifier');

describe('EmailNotifier', () => {

    let emailNotifier;

    beforeEach(() => {
        mockSendMail.mockClear();

        const templateService = initTemplateService({
            templateDir : path.resolve(__dirname, '..', 'templates'),
            defaults    : {
                LOGO_URL  : 'https://vectoricons.net/logo.png',
                SITE_NAME : 'VectorIcons',
                SITE_URL  : 'https://vectoricons.net',
            },
        });

        const mailTransport = initMailTransport({
            host        : 'smtp.example.com',
            port        : 465,
            secure      : true,
            auth        : { user : 'noreply@example.com', pass : 'test-pass' },
            defaultFrom : 'hello@vectoricons.net',
        });

        emailNotifier = initEmailNotifier(mailTransport, templateService);
    });

    // Scenario: notifier renders the template with the user's data and
    // sends it to the user's address via the transport
    it('should render the template and send to the recipient', async () => {
        await emailNotifier.send({
            data     : { firstName : 'Natasha' },
            subject  : 'Welcome to VectorIcons!',
            template : 'welcome-offer',
            to       : 'natasha@shield.gov',
        });

        expect(mockSendMail).toHaveBeenCalledTimes(1);

        const emailArgs = mockSendMail.mock.calls[0][0];
        expect(emailArgs.to).toBe('natasha@shield.gov');
        expect(emailArgs.subject).toBe('Welcome to VectorIcons!');

        // The template actually rendered the interpolated values
        expect(emailArgs.html).toContain('Natasha');
        expect(emailArgs.html).toContain('VectorIcons');
    });

    // Scenario: SMTP transport fails, error propagates to the caller
    it('should propagate transport errors', async () => {
        mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

        await expect(
            emailNotifier.send({
                data     : { firstName : 'Natasha' },
                subject  : 'Welcome to VectorIcons!',
                template : 'welcome-offer',
                to       : 'natasha@shield.gov',
            }),
        ).rejects.toThrow('SMTP connection refused');
    });
});
```

Verify the notifier's exact `send()` signature against
`server/event-bus/notifiers/EmailNotifier.js` (and its `__tests__`) before
writing — the shape above follows the plugin-facing interface, but the code
is the contract.

For full plugin-pipeline tests (emit a domain event → plugin handler →
notifier → transport), wire the bus and context exactly as
`server/event-bus/index.js` does and mirror the existing plugin `__tests__`
suites — each plugin directory ships one.

## Key techniques

### Verify rendered content, not just function calls

Don't just check that `emailNotifier.send()` was called. Verify the rendered
HTML contains the interpolated values:

```javascript
// The template actually rendered the user's name
expect(emailArgs.html).toContain('Natasha');

// The template included the verification URL
expect(emailArgs.html).toContain('https://vectoricons.net/verify?token=abc123');
```

This catches bugs where the template exists but doesn't use the right
variable names, or where data isn't passed through correctly.

### Test the full chain, not layers in isolation

The point of this pattern is to verify that real components work together.
If you mock the EmailNotifier, you're not testing that the plugin passes the
right arguments. If you mock the TemplateService, you're not testing that the
template renders correctly. Mock only the infrastructure you can't run in
tests.

### Multiple side effects in one handler

Some handlers trigger multiple notifications (email + Slack, user email +
admin email). Verify all of them, including the order when it matters:

```javascript
// Scenario: contributor signup sends 3 notifications
it('should send welcome email, admin email, and Slack alert', async () => {
    await bus.emit('contributor.signup', { /* ... */ });

    // Two emails: one to contributor, one to admin
    expect(mockSendMail).toHaveBeenCalledTimes(2);

    const contributorEmail = mockSendMail.mock.calls[0][0];
    const adminEmail       = mockSendMail.mock.calls[1][0];

    expect(contributorEmail.to).toBe('contributor@example.com');
    expect(adminEmail.to).toBe('admin@vectoricons.net');
});
```

## Common pitfalls

- **Mocking too deep:** If you mock the notifier, you're writing a unit test
  disguised as an integration test. The whole point is to let real components
  interact.
- **Not clearing mocks between tests:** Call counts accumulate across tests
  if you forget `mockClear()` in `beforeEach`.
- **Ignoring async timing:** `await` the emit/entry call. If the handler is
  async and you don't await, assertions run before the handler finishes.
- **Ignoring module-load side effects:** requiring the event-bus module
  starts the mail poller; clean up via the established `__tests__` pattern
  or Jest never exits.
- **Skipping error paths:** If a handler can fail (template missing,
  transport down, invalid data), test that the failure mode is correct —
  does the error propagate? Is it logged? Does it trigger the error handler?
