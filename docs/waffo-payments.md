# Waffo pay-per-video integration

Hotel Lobby AI uses Waffo for new one-time generation purchases. The current
product does not sell a new subscription or credit pack in the Hotel Lobby
generation flow.

The installed SDK is `@waffo/pancake-ts` 0.25.x. Merchant credentials remain
server-side. Buyer ownership is bound to the authenticated user ID through
`buyerIdentity`, checkout metadata, and a durable checkout intent.

## Current product catalog

Each Waffo one-time product represents one successful 15-second generated video:

| Quality | Price | Environment variable |
| --- | ---: | --- |
| 480p | $4.99 | `WAFFO_GENERATION_480P_PRODUCT_ID` |
| 720p | $9.90 | `WAFFO_GENERATION_720P_PRODUCT_ID` |
| 1080p | $19.90 | `WAFFO_GENERATION_1080P_PRODUCT_ID` |

The selected purchase is also locked to the source images, performer placement,
aspect ratio, and resolution stored in `generation_orders`. Changing those
inputs requires a new purchase.

## Configuration

```env
PAYMENT_PROVIDER=waffo
WAFFO_ENVIRONMENT=test
WAFFO_MERCHANT_ID=
WAFFO_STORE_ID=
WAFFO_PRIVATE_KEY=
# Alternatively:
WAFFO_PRIVATE_KEY_BASE64=

WAFFO_GENERATION_480P_PRODUCT_ID=
WAFFO_GENERATION_720P_PRODUCT_ID=
WAFFO_GENERATION_1080P_PRODUCT_ID=

WAFFO_WEBHOOK_URL=https://hotel-lobby-ai.pro/api/waffo/webhook
```

Use test credentials and test products with `WAFFO_ENVIRONMENT=test`. Production
keys and product versions are separate. Private keys must be Worker secrets and
must never use a `VITE_` prefix.

Legacy Waffo subscription and credit-pack variables may remain configured for
existing customers, but they are not shown to new Hotel Lobby buyers.

## Database

Apply migrations through:

- `0005_waffo_payments.sql` for durable Waffo checkout intents/webhook inbox
- `0009_generation_purchases.sql` for direct generation orders

`generation_orders` is the payment entitlement. A single paid order may have
multiple `generation_tasks` attempts, but only one final successful result.

Order states:

```text
pending_payment
      ↓
     paid
      ↓
  processing
   ↙      ↘
failed   fulfilled
  ↓
retry free → processing

failed
  ↓ user requests refund
refund_requested
  ↓
refunded
```

A technical failure does not automatically refund the buyer and does not require
another payment. The user may retry the same paid order repeatedly. A refund is
only requested when the user explicitly chooses it after a failed attempt.

## Checkout flow

The browser uploads and moderates both source images before payment. Prompt
moderation also runs before checkout.

```text
approved images
    ↓
selected format + quality
    ↓
create generation_order
    ↓
Waffo authenticated checkout
    ↓
order.completed webhook
    ↓
generation_order = paid
    ↓
create generation attempt
    ↓
KIE generation
```

Waffo checkout opens in a separate tab so the original page keeps the prepared
image state. The checkout intent and generation order are persisted before the
payment URL is returned.

The success URL includes the generation-order ID. The original page and the
return page can poll the order, while Cron provides an additional recovery path.
A paid order is therefore not dependent on the browser remaining open.

## Generation success and failure

Provider success and R2 persistence remain separate concerns.

```text
KIE success
  ↓
task = completed
generation_order = fulfilled
result_url = provider URL
  ↓
best-effort R2 persistence
  ├─ success → persisted R2 URL
  └─ failure → provider URL remains usable
```

An R2 copy failure after KIE produced a usable result is not a failed purchase and
does not make the order refund-eligible.

A KIE/provider failure sets the current task and generation order to `failed`.
The UI exposes:

- **Retry for free** — creates another attempt on the same paid order
- **Request refund** — submits a Waffo refund ticket

Changing the original paid inputs is not a retry; it requires a new checkout.

## Refund flow

Waffo refunds use the customer refund-ticket API rather than pretending the
refund completed synchronously.

The server:

1. verifies the signed-in user owns the latest failed paid task/order;
2. atomically changes the order from `failed` to `refund_requested`;
3. issues a Waffo customer session token using the authenticated user ID;
4. creates a refund ticket for the stored Waffo `paymentId` and charged amount;
5. stores the Waffo refund-ticket ID;
6. waits for Waffo webhook confirmation.

Webhook outcomes:

- `refund.succeeded` → order becomes `refunded`
- `refund.failed` → order returns to `failed` with `refund_error`

If Waffo reports a failed refund after a ticket was created, the UI keeps free
generation retry available but sends the user to support for the payment refund.
It does not blindly submit the same refund ticket again.

A successfully fulfilled generation is not automatically refund-eligible merely
because the buyer dislikes the subjective output quality.

## Webhook events

The Waffo endpoint is:

```text
https://hotel-lobby-ai.pro/api/waffo/webhook
```

The setup script registers/updates the webhook with:

```text
order.completed
subscription.activated
subscription.payment_succeeded
subscription.canceling
subscription.uncanceled
subscription.canceled
subscription.past_due
subscription.plan_changed
refund.succeeded
refund.failed
```

The subscription events remain for legacy account compatibility.

Webhook handling verifies the raw signed Waffo envelope, persists it before
acknowledgement, and processes it asynchronously. Failed inbox records remain
retryable.

## Test-product setup

For the test environment:

```powershell
node --env-file=.env.local --experimental-strip-types scripts/setup-waffo.ts
```

The script creates the three generation products when needed and prints:

```env
WAFFO_GENERATION_480P_PRODUCT_ID=...
WAFFO_GENERATION_720P_PRODUCT_ID=...
WAFFO_GENERATION_1080P_PRODUCT_ID=...
```

If `.waffo/products-test.json` already contains a webhook ID, the script updates
the existing webhook URL/event set instead of silently leaving an old subscription
that lacks `refund.failed`.

The script creates **test** products only. Production products must be published
or configured separately in Waffo and their production IDs added to the Worker
environment.

## Reliability and recovery

Three paths can start/recover a paid generation:

- the verified `order.completed` webhook;
- browser polling of a paid generation order;
- the existing Cloudflare Cron reconciliation.

The operation uses conditional state changes so duplicate Waffo deliveries or
multiple recovery paths do not intentionally start a second concurrent attempt.

Cron also detects an orphaned `processing` order with no task and moves it to
`failed`, allowing the buyer to recover rather than leaving a permanently
spinning purchase.

## Verification before production

Apply the database migration and configure the three Waffo generation product IDs,
then run:

```text
npm run test:payments
npm run build
```

Sandbox verification should cover:

1. successful 480p checkout → generation → completed result;
2. successful 720p/1080p product mapping and charged amount;
3. checkout closed before payment;
4. provider failure → free retry without another checkout;
5. repeated free retries remain attached to the same order;
6. user requests refund only after failure;
7. `refund.succeeded` → Refunded UI;
8. `refund.failed` → support fallback while retry remains available;
9. duplicate Waffo webhooks do not double-start an attempt;
10. closing the browser after payment still allows webhook/Cron recovery.

## Legacy billing

The repository still contains historical subscription and credit code so existing
customers are not broken abruptly. New Hotel Lobby UI does not expose that model.
Do not delete legacy tables, webhook handlers, or subscription management until
existing customer migration/retirement is intentionally handled.
