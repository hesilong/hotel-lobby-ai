# Waffo / Creem payment switching

Integration follows https://docs.waffo.ai/zh/integrate/skill and the installed
`@waffo/pancake-ts` 0.25 SDK types. The current SDK resolves product type from
product ID and provides an authenticated checkout helper. Server code uses
that helper instead of exposing merchant private keys or buyer tokens.

## Configuration

```env
PAYMENT_PROVIDER=waffo
WAFFO_ENVIRONMENT=test
WAFFO_MERCHANT_ID=MER_3P0D3zzqjx5NUluHyA3Ywb
WAFFO_STORE_ID=STO_50KaSJgcSUv1UX5Kz7WpQi
WAFFO_PRIVATE_KEY="your RSA PEM with escaped newlines"
# Alternatively set WAFFO_PRIVATE_KEY_BASE64 to the base64-encoded PEM.
WAFFO_PRO_MONTHLY_PRODUCT_ID=PROD_4vE7Gy5dmHmW9LY9O6zeKa
WAFFO_PRO_YEARLY_PRODUCT_ID=PROD_0GrxjbRLnTwYOlvqVfj1i5
WAFFO_ULTIMATE_MONTHLY_PRODUCT_ID=PROD_7JyqzxNX8huCVDfWpvuLyY
WAFFO_ULTIMATE_YEARLY_PRODUCT_ID=PROD_3UxxGS7iJGoBuc0u5IMRC3
WAFFO_CREDIT_PACK_STARTER_PRODUCT_ID=PROD_4orVn7lkYKseCd8Y8W6FzV
WAFFO_CREDIT_PACK_CREATOR_PRODUCT_ID=PROD_3VnN2JftJOn5eDl2itA1YE
WAFFO_CREDIT_PACK_STUDIO_PRODUCT_ID=PROD_2mPWBA2lHxOAXGaQTcxPAb
```

The default remains `creem` until Waffo credentials/products are configured.
Change `PAYMENT_PROVIDER` back to `creem` to route **new** purchases through
Creem. This does not migrate existing subscriptions. Subscription operations
use each row's recorded provider; retain both webhook endpoints/credentials.
Waffo test and production keys differ. The SDK derives merchant API mode from
the signing key; `WAFFO_ENVIRONMENT` additionally fixes webhook verification,
mode checks, and customer sessions. A test key cannot enable live payments.

Use a separate sandbox Supabase database for test payments: they grant credits
in the configured database, so do not mix sandbox balances with live customers.
Set private keys as Cloudflare Worker secrets, never `VITE_` variables. Merchant,
store, product IDs and provider mode are server runtime configuration.

## Setup

1. Apply `supabase/migrations/0005_waffo_payments.sql` after migrations 0001–0004.
   It creates durable webhook records, checkout ownership records, and an atomic
   service-role-only fulfillment function. Existing subscriptions default to Creem.
2. Put your real **test** private key and supplied IDs in an ignored local env file.
3. Create seven Waffo test products manually, or run the prepared script:

   ```powershell
   node --env-file=.env.local --experimental-strip-types scripts/setup-waffo.ts
   ```

   Requires Node 22+ with native type stripping. The script uses the supplied
   store, current catalog prices, SDK idempotency keys, and `.waffo/products-test.json`
   to avoid repeated creation. Copy its printed `WAFFO_*_PRODUCT_ID` entries into
   the server environment. It creates four subscriptions, three packs, and a
   subscription group; it does not publish products to production.
4. Register `https://hotel-lobby-ai.pro/api/waffo/webhook` in the Waffo store for
   the selected environment. For a preview use the preview origin; locally use
   an ngrok HTTPS origin. Optionally set `WAFFO_WEBHOOK_URL` before running the
   setup script to register the test webhook through the SDK.
5. Set `PAYMENT_PROVIDER=waffo`, restart locally or deploy the configured Worker.
6. Complete a sandbox checkout and verify the inbox, balance and subscription
   status. Use the official guide's success card `4576750000000110` and declined
   card `4576750000000220`, a future expiry, and any CVC.

Events: `order.completed`, `subscription.activated`,
`subscription.payment_succeeded`, `subscription.canceling`,
`subscription.uncanceled`, `subscription.canceled`, `subscription.past_due`,
`subscription.plan_changed`, `refund.succeeded`.

## Behavior and operations

- Waffo opens checkout/plan confirmation in a new tab, preserving upload state.
  Browser popup blocking produces a visible error. Returning focus refreshes
  the original balance; the success page polls for webhook fulfillment.
- Raw-body RSA verification uses the SDK's environment-specific public key.
  Mode and store must match configured values. Buyer ownership comes from an
  internal checkout intent or existing order binding, never an email lookup.
- The webhook acknowledges after persisting its payload. Cloudflare `waitUntil`
  processes pending records outside the response. Failures remain durable and
  are retried with backoff on later webhooks and Waffo billing-state requests (five at a time).
  Monitor pending/failed inbox rows; investigate poison events rather than
  relying on customer traffic as your only retry mechanism.
- Fulfillment is a database transaction: profile lock, business-event receipt,
  grant, ledger and balance update. Activation/first-payment deliveries share
  a period/product grant key. Monthly/annual credit resets preserve credit packs.
- Annual plans grant monthly credits; each next monthly allocation is reconciled
  when billing state is loaded, as with existing Creem plans.
- Plan changes open Waffo's confirmation page, and apply only from verified
  lifecycle events. The four products must be in a Waffo subscription group.
- Cancellation uses the SDK. Renewal remains active until the paid period ends.
  The installed merchant SDK does not expose a resume endpoint: the UI refers
  buyers to Waffo/support for resuming; verified `subscription.uncanceled` events
  update the local state. No unsupported API is guessed.
- Full refunds of unused credit packs revoke them. Subscription refunds, partial
  refunds, missing original charge amounts, or spent credits set the grant metadata
  flag `refund_review_required` for manual review, retaining attribution until resolved.
  Refund flags do not automatically cancel a recurring subscription; reconcile
  subscription lifecycle events and refund policy separately.
- Creem prompt moderation is still independent of checkout selection. Waffo
  switching does not disable existing image/prompt moderation requirements.

## Verification and remaining external setup

```text
npm run test:payments
npm run build
```

Tests run isolated Postgres through PGlite, without real customers or payments.
They cover duplicate deliveries/business events, activation versus first payment,
renewal resets, stale periods, refunds, transactional rollback and safe replay.

The provided private key is a placeholder and no Waffo product IDs were supplied.
No remote products, webhooks, database migrations, purchases or deployments have
been performed. Live readiness still needs the real key, seven Waffo product IDs,
applied migration, webhook registration, sandbox end-to-end verification, Waffo
production approval, published products and production-specific credentials.
