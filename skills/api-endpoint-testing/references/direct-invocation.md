# Direct Invocation Test Pattern

Tests call internal components directly — no HTTP, no Express, no supertest.
The entry point is a function call, and assertions target downstream effects.

## When to use

- Event-driven pipelines: emit an event, verify handlers fire and produce
  correct side effects
- Service chains: call a service method, verify it coordinates its dependencies
  correctly
- Template rendering: verify templates produce correct output with given data
- Notification delivery: verify the right message reaches the right recipient
  via the right channel
- Any internal pipeline where HTTP is not part of what you're testing

## The boundary principle

Mock at the outermost boundary of the system under test — the point where your
code hands off to infrastructure you don't own:

- **SMTP transport** — mock `nodemailer.createTransport().sendMail()`
- **Cloud services** — mock `AWS.SNS().publish()`
- **External HTTP APIs** — mock the HTTP client
- **File system** — mock only when testing failure modes; use real fs for
  template rendering tests
- **Database** — mock when testing business logic; use real DB for data
  integrity tests

Everything between the entry point and the boundary should be real. That's what
"integration test" means — you're testing that real components integrate
correctly.

## Example: event-driven pipeline

Testing an EventBus pipeline where emitting an event should trigger a plugin
that renders a template and sends an email:

```javascript
/**
 * EventBus integration tests — signup flow.
 *
 * Tests the full chain: emit user.signup → signup-notifications plugin →
 * EmailNotifier renders welcome-offer template → MailService sends email.
 * Also verifies SlackNotifier receives the signup alert.
 *
 * Mocked at transport boundary only: nodemailer sendMail and AWS SNS publish.
 */

// ── Mock transport boundary ───────────────────────────────────
const mockSendMail = jest.fn().mockResolvedValue({ messageId : 'test-001' });

jest.mock('nodemailer', () => ({
    createTransport : jest.fn(() => ({ sendMail : mockSendMail })),
}));

const mockSnsPublish = jest.fn(() => ({
    promise : jest.fn().mockResolvedValue({ MessageId : 'sns-001' }),
}));

jest.mock('aws-sdk', () => ({
    SNS : jest.fn(() => ({ publish : mockSnsPublish })),
}));

// ── Real components ───────────────────────────────────────────
const path = require('path');
const { initTemplateService }  = require('../services/TemplateService');
const { initEmailNotifier }    = require('../event-bus/notifiers/EmailNotifier');
const { MailService }          = require('../services/MailService');
const { SlackService }         = require('../services/SlackService');
const { SlackNotifier }        = require('../event-bus/notifiers/SlackNotifier');
const EventBus                 = require('@vectoricons.net/event-bus');
const signupPlugin             = require('../event-bus/plugins/signup-notifications');

describe('user.signup pipeline', () => {

    let bus;

    beforeEach(() => {
        mockSendMail.mockClear();
        mockSnsPublish.mockClear();

        // Real TemplateService with real Nunjucks rendering
        const templateService = initTemplateService({
            templateDir : path.resolve(__dirname, '../email-templates'),
            defaults    : {
                LOGO_URL  : 'https://vectoricons.net/logo.png',
                SITE_NAME : 'VectorIcons',
                SITE_URL  : 'https://vectoricons.net',
            },
        });

        // Real notifiers wrapping real services (transport is mocked)
        const mailService    = new MailService({ /* mocked transport */ });
        const emailNotifier  = initEmailNotifier(mailService, templateService);
        const slackService   = new SlackService({ /* mocked SNS */ });
        const slackNotifier  = new SlackNotifier(slackService);

        // Real EventBus with real plugin
        bus = new EventBus();
        const context = { emailNotifier, slackNotifier };
        bus.register(signupPlugin(context));

        process.env.ADMIN_EMAIL = 'admin@vectoricons.net';
    });

    // Scenario: new user signs up, welcome email sent with name in template
    it('should render welcome-offer template and send to user', async () => {
        await bus.emit('user.signup', {
            email     : 'natasha@shield.gov',
            firstName : 'Natasha',
            username  : 'blackwidow',
        });

        // Email was sent exactly once
        expect(mockSendMail).toHaveBeenCalledTimes(1);

        // Verify recipient and subject
        const emailArgs = mockSendMail.mock.calls[0][0];
        expect(emailArgs.to).toBe('natasha@shield.gov');
        expect(emailArgs.subject).toBe('Welcome to VectorIcons!');

        // Verify template was rendered with user's name
        expect(emailArgs.html).toContain('Natasha');
        expect(emailArgs.html).toContain('VectorIcons');

        // Slack notification sent to correct channel
        expect(mockSnsPublish).toHaveBeenCalledTimes(1);
        const snsArgs = JSON.parse(mockSnsPublish.mock.calls[0][0].Message);
        expect(snsArgs.channel).toBe('#signups');
        expect(snsArgs.message).toContain('blackwidow');
    });

    // Scenario: SMTP transport fails, error propagates
    it('should propagate transport errors', async () => {
        mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

        await expect(
            bus.emit('user.signup', {
                email     : 'fail@example.com',
                firstName : 'Fail',
                username  : 'failuser',
            }),
        ).rejects.toThrow('SMTP connection refused');
    });
});
```

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

This catches bugs where the template exists but doesn't use the right variable
names, or where data isn't passed through correctly.

### Test the full chain, not layers in isolation

The point of this pattern is to verify that real components work together. If
you mock the EmailNotifier, you're not testing that the plugin passes the right
arguments. If you mock the TemplateService, you're not testing that the template
renders correctly. Mock only the infrastructure you can't run in tests.

### Multiple side effects in one handler

Some handlers trigger multiple notifications (email + Slack, user email + admin
email). Verify all of them, including the order when it matters:

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

    // One Slack notification
    expect(mockSnsPublish).toHaveBeenCalledTimes(1);
});
```

## Common pitfalls

- **Mocking too deep:** If you mock the notifier, you're writing a unit test
  disguised as an integration test. The whole point is to let real components
  interact.
- **Not clearing mocks between tests:** Call counts accumulate across tests if
  you forget `mockClear()` in `beforeEach`.
- **Ignoring async timing:** Use `await` on the emit call. If the handler is
  async and you don't await, assertions run before the handler finishes.
- **Skipping error paths:** If a handler can fail (template missing, transport
  down, invalid data), test that the failure mode is correct — does the error
  propagate? Is it logged? Does it trigger the error handler?
