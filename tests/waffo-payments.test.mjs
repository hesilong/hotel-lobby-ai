import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

async function database() {
  const db = new PGlite()
  await db.exec(`create schema auth;
    create role anon; create role authenticated; create role service_role;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`)
  for (const name of ['0001_initial.sql', '0002_billing_and_safety.sql', '0005_waffo_payments.sql']) {
    const sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''))
  }
  const userId = '00000000-0000-4000-8000-000000000001'
  await db.query('insert into auth.users(id,email) values($1,$2)', [userId, 'fixture@example.com'])
  return { db, userId }
}

function event(userId, overrides = {}) {
  return {
    delivery_id: 'delivery-1', business_id: 'payment-1', event_type: 'order.completed',
    event_at: new Date().toISOString(), environment: 'test', order_id: 'ORD_pack',
    user_id: userId, product_id: 'PROD_pack', pack_id: 'starter', credits: 250,
    grant_key: 'waffo:test:ORD_pack', ...overrides,
  }
}
async function apply(db, payload) {
  await db.query('select public.apply_waffo_event($1::jsonb)', [JSON.stringify(payload)])
}
async function balance(db, userId) {
  return (await db.query('select credits from profiles where id=$1', [userId])).rows[0].credits
}

test('delivery and business duplicates grant a pack exactly once', async () => {
  const { db, userId } = await database()
  try {
    await apply(db, event(userId))
    await apply(db, event(userId))
    await apply(db, event(userId, { delivery_id: 'delivery-2' }))
    await apply(db, event(userId, { delivery_id: 'delivery-3', business_id: 'payment-2' }))
    assert.equal(await balance(db, userId), 260)
    assert.equal((await db.query('select count(*)::int as n from credit_grants')).rows[0].n, 1)
  } finally { await db.close() }
})

test('grant, balance and receipt roll back together and remain replayable', async () => {
  const { db, userId } = await database()
  try {
    await db.exec('alter table credit_ledger add constraint simulate_failure check(delta<>250)')
    await assert.rejects(apply(db, event(userId)))
    assert.equal(await balance(db, userId), 10)
    assert.equal((await db.query('select count(*)::int as n from credit_grants')).rows[0].n, 0)
    assert.equal((await db.query('select count(*)::int as n from waffo_processed_events')).rows[0].n, 0)
    await db.exec('alter table credit_ledger drop constraint simulate_failure')
    await apply(db, event(userId))
    assert.equal(await balance(db, userId), 260)
  } finally { await db.close() }
})

test('activation plus first payment do not reset spent credits; renewal resets subscription credits only', async () => {
  const { db, userId } = await database()
  try {
    await apply(db, event(userId))
    const now = new Date()
    const end = new Date(now); end.setUTCMonth(end.getUTCMonth()+1)
    const sub = event(userId, {
      order_id: 'ORD_subscription', product_id: 'PROD_pro', plan_code: 'pro', billing_cycle: 'monthly', pack_id: null,
      event_type: 'subscription.activated', business_id: 'activation', credits: 1000,
      period_start: now.toISOString(), period_end: end.toISOString(), status: 'active', grant_key: 'subscription-period-1',
    })
    await apply(db, sub)
    await db.exec("update credit_grants set credits_remaining=800 where source='subscription'")
    await db.query("select adjust_credits($1,-200,'generation',null,'{}')", [userId])
    await apply(db, { ...sub, event_type: 'subscription.payment_succeeded', business_id: 'first-payment', status: null })
    assert.equal(await balance(db, userId), 1060)
    const nextEnd = new Date(end); nextEnd.setUTCMonth(nextEnd.getUTCMonth()+1)
    await apply(db, { ...sub, event_type: 'subscription.payment_succeeded', business_id: 'renewal',
      period_start: end.toISOString(), period_end: nextEnd.toISOString(), grant_key: 'subscription-period-2' })
    assert.equal(await balance(db, userId), 1260)
    await apply(db, { ...sub, business_id: 'delayed-old-activation' })
    assert.equal(await balance(db, userId), 1260)
    const rows = (await db.query('select payment_provider,waffo_order_id,creem_subscription_id from subscriptions')).rows
    assert.deepEqual(rows, [{ payment_provider: 'waffo', waffo_order_id: 'ORD_subscription', creem_subscription_id: null }])
  } finally { await db.close() }
})

test('full pack refund is idempotent; partial refund is flagged for review', async () => {
  const { db, userId } = await database()
  try {
    await apply(db, event(userId))
    await apply(db, event(userId, { event_type: 'refund.succeeded', business_id: 'refund-1', credits: 0,
      refunded_amount: '4.99', original_amount: '4.99' }))
    await apply(db, event(userId, { event_type: 'refund.succeeded', business_id: 'refund-1', credits: 0,
      refunded_amount: '4.99', original_amount: '4.99' }))
    assert.equal(await balance(db, userId), 10)
    await apply(db, event(userId, { order_id: 'ORD_second', business_id: 'payment-second', grant_key: 'second-pack' }))
    await apply(db, event(userId, { order_id: 'ORD_second', event_type: 'refund.succeeded', business_id: 'partial', credits: 0,
      refunded_amount: '1.00', original_amount: '4.99' }))
    assert.equal(await balance(db, userId), 260)
    assert.equal((await db.query("select meta->>'refund_review_required' as review from credit_grants where checkout_id='second-pack'")).rows[0].review, 'true')
  } finally { await db.close() }
})

test('annual monthly allocation is atomic; cancellation removes subscription credits and preserves packs', async () => {
  const { db, userId } = await database()
  try {
    await apply(db, event(userId))
    const now = new Date()
    const start = new Date(now); start.setUTCMonth(start.getUTCMonth()-2)
    const end = new Date(start); end.setUTCFullYear(end.getUTCFullYear()+1)
    const annual = event(userId, {
      event_type: 'subscription.activated', business_id: 'annual-activation', order_id: 'ORD_annual',
      product_id: 'PROD_annual', plan_code: 'pro', billing_cycle: 'yearly', status: 'active', credits: 1000,
      period_start: start.toISOString(), period_end: end.toISOString(), grant_key: 'annual-initial',
    })
    await apply(db, annual)
    await db.exec("update credit_grants set credits_remaining=500 where source='subscription'")
    await db.query("select adjust_credits($1,-500,'generation',null,'{}')", [userId])
    const nextReset = new Date(now); nextReset.setUTCMonth(nextReset.getUTCMonth()+1)
    const reset = { ...annual, event_type: 'yearly.reset', business_id: 'annual-month-2',
      period_start: now.toISOString(), period_end: nextReset.toISOString(), grant_key: 'annual-month-2' }
    await apply(db, reset)
    await apply(db, reset)
    assert.equal(await balance(db, userId), 1260)
    const sub = (await db.query("select current_period_end,next_credit_reset_at from subscriptions where waffo_order_id='ORD_annual'")).rows[0]
    assert.equal(new Date(sub.current_period_end).toISOString(), end.toISOString())
    assert.equal(new Date(sub.next_credit_reset_at).toISOString(), nextReset.toISOString())
    await apply(db, { ...annual, event_type: 'subscription.canceled', business_id: 'annual-canceled',
      event_at: new Date(Date.now()+1000).toISOString(), status: 'canceled', credits: 0 })
    assert.equal(await balance(db, userId), 260)
    await apply(db, { ...annual, business_id: 'late-reactivation', event_at: new Date(Date.now()+2000).toISOString() })
    assert.equal(await balance(db, userId), 260)
    assert.equal((await db.query("select status from subscriptions where waffo_order_id='ORD_annual'")).rows[0].status, 'canceled')
  } finally { await db.close() }
})
