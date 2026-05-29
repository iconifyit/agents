---
name: stripe-best-practices
description: >-
  Guides Stripe integration decisions — API selection (Checkout Sessions vs
  PaymentIntents), Connect platform setup (Accounts v2, controller properties),
  billing/subscriptions, Treasury financial accounts, integration surfaces
  (Checkout, Payment Element), and migrating from deprecated Stripe APIs. Use
  when building, modifying, or reviewing any Stripe integration — including
  accepting payments, building marketplaces, integrating Stripe, processing
  payments, setting up subscriptions, or creating connected accounts.

---

Pin an explicit Stripe API version for the integration (or inherit the account's default pinned version), and treat version upgrades as a deliberate, reviewed change rather than always adopting the newest. Determine the current API version from Stripe's API changelog or Dashboard rather than relying on a hardcoded value here.

## Integration routing

| Building…                             | Recommended API                     | Details                  |
| ------------------------------------- | ----------------------------------- | ------------------------ |
| One-time payments                     | Checkout Sessions                   | [payments.md](references/payments.md) |
| Custom payment form with embedded UI  | Checkout Sessions + Payment Element | [payments.md](references/payments.md) |
| Saving a payment method for later     | Setup Intents                       | [payments.md](references/payments.md) |
| Connect platform or marketplace       | Accounts v2 (`/v2/core/accounts`)   | [connect.md](references/connect.md) |
| Subscriptions or recurring billing    | Billing APIs + Checkout Sessions    | [billing.md](references/billing.md) |
| Embedded financial accounts / banking | v2 Financial Accounts               | [treasury.md](references/treasury.md) |

Read the relevant reference file before answering any integration question or writing code.

## Key documentation

When the user’s request does not clearly fit a single domain above, consult:

- [Integration Options](https://docs.stripe.com/payments/payment-methods/integration-options.md) — Start here when designing any integration.
- [API Tour](https://docs.stripe.com/payments-api/tour.md) — Overview of Stripe’s API surface.
- [Go Live Checklist](https://docs.stripe.com/get-started/checklist/go-live.md) — Review before launching.
