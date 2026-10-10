import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

async function database() {
  const db = new PGlite()
  await db.exec(`create schema auth;
    create role anon;
    create role authenticated;
    create role service_role;
    create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql as 'select null::uuid';`)

  for (const name of [
    '0001_initial.sql',
    '0002_billing_and_safety.sql',
    '0003_prepared_assets.sql',
    '0005_waffo_payments.sql',
    '0009_generation_purchases.sql',
  ]) {
    const sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')
    await db.exec(sql.replace('create extension if not exists pgcrypto;', ''))
  }

  const userId = '00000000-0000-4000-8000-000000000101'
  await db.query('insert into auth.users(id,email) values($1,$2)', [userId, 'buyer@example.com'])

  const imageA = '00000000-0000-4000-8000-000000000201'
  const imageB = '00000000-0000-4000-8000-000000000202'
  await db.query(`
    insert into uploaded_assets(id,owner_key,user_id,kind,object_key,public_url,mime_type,status)
    values
      ($1,$3,$3,'image','uploads/a.jpg','https://cdn.example/a.jpg','image/jpeg','approved'),
      ($2,$3,$3,'image','uploads/b.jpg','https://cdn.example/b.jpg','image/jpeg','approved')
  `, [imageA, imageB, userId])

  return { db, userId, imageA, imageB }
}

async function createPaidOrder(db, { userId, imageA, imageB, resolution = '720p', amount = '9.90' }) {
  const row = (await db.query(`
    insert into generation_orders(
      user_id,status,resolution,aspect_ratio,duration_seconds,generate_audio,amount_usd,currency,
      image_a_url,image_b_url,image_a_asset_id,image_b_asset_id,
      reference_template_id,reference_video_url,prompt,waffo_product_id,
      waffo_order_id,waffo_payment_id,waffo_environment,charged_amount,paid_at
    ) values(
      $1,'paid',$2,'9:16',15,true,$3,'USD',
      'https://cdn.example/a.jpg','https://cdn.example/b.jpg',$4,$5,
      'hotel-lobby-15','https://cdn.example/reference.mp4','preset prompt','PROD_generation',
      'ORD_generation','PAY_generation','test',$3,now()
    ) returning id
  `, [userId, resolution, amount, imageA, imageB])).rows[0]
  return row.id
}

async function createAttempt(db, { orderId, userId, suffix }) {
  const task = (await db.query(`
    insert into generation_tasks(
      user_id,status,image_a_url,image_b_url,reference_template_id,reference_video_url,prompt,
      duration_seconds,resolution,aspect_ratio,provider,model_id,credits_used,generation_order_id
    )
    select user_id,'processing',image_a_url,image_b_url,reference_template_id,reference_video_url,prompt,
      duration_seconds,resolution,aspect_ratio,'kie','bytedance/seedance-2-5',0,id
    from generation_orders
    where id=$1 and user_id=$2
    returning id
  `, [orderId, userId])).rows[0]

  await db.query(`
    update generation_tasks
    set provider_task_id=$2,updated_at=now()
    where id=$1
  `, [task.id, `kie-${suffix}`])

  await db.query(`
    update generation_orders
    set latest_task_id=$2,updated_at=now()
    where id=$1
  `, [orderId, task.id])

  return task.id
}

test('one paid generation order can retry failed attempts without a second purchase', async () => {
  const { db, userId, imageA, imageB } = await database()
  try {
    const orderId = await createPaidOrder(db, { userId, imageA, imageB })

    const claimed = (await db.query(`
      update generation_orders
      set status='processing'
      where id=$1 and status='paid'
      returning id
    `, [orderId])).rows
    assert.equal(claimed.length, 1)

    const firstTask = await createAttempt(db, { orderId, userId, suffix: 'first' })
    await db.query(`update generation_tasks set status='failed',failure_code='UPSTREAM',failure_message='provider failed' where id=$1`, [firstTask])
    await db.query(`update generation_orders set status='failed' where id=$1 and latest_task_id=$2`, [orderId, firstTask])

    const retryClaim = (await db.query(`
      update generation_orders
      set status='processing',retry_count=retry_count+1
      where id=$1 and status='failed'
      returning retry_count
    `, [orderId])).rows[0]
    assert.equal(retryClaim.retry_count, 1)

    const secondTask = await createAttempt(db, { orderId, userId, suffix: 'second' })
    await db.query(`update generation_tasks set status='completed',result_url='https://cdn.example/result.mp4' where id=$1`, [secondTask])
    await db.query(`
      update generation_orders
      set status='fulfilled',fulfilled_at=now()
      where id=$1 and status='processing' and latest_task_id=$2
    `, [orderId, secondTask])

    const order = (await db.query(`
      select status,retry_count,amount_usd,latest_task_id
      from generation_orders where id=$1
    `, [orderId])).rows[0]
    assert.equal(order.status, 'fulfilled')
    assert.equal(order.retry_count, 1)
    assert.equal(Number(order.amount_usd), 9.9)
    assert.equal(order.latest_task_id, secondTask)

    const count = (await db.query(
      'select count(*)::int as n from generation_tasks where generation_order_id=$1',
      [orderId],
    )).rows[0].n
    assert.equal(count, 2)
  } finally {
    await db.close()
  }
})

test('refund request closes the free-retry path once the order is refunded', async () => {
  const { db, userId, imageA, imageB } = await database()
  try {
    const orderId = await createPaidOrder(db, { userId, imageA, imageB, resolution: '480p', amount: '4.99' })
    await db.query(`update generation_orders set status='processing' where id=$1 and status='paid'`, [orderId])

    const taskId = await createAttempt(db, { orderId, userId, suffix: 'refund' })
    await db.query(`update generation_tasks set status='failed',failure_message='provider failed' where id=$1`, [taskId])
    await db.query(`update generation_orders set status='failed' where id=$1 and latest_task_id=$2`, [orderId, taskId])

    const requested = (await db.query(`
      update generation_orders
      set status='refund_requested',refund_requested_at=now()
      where id=$1 and status='failed'
      returning status
    `, [orderId])).rows
    assert.equal(requested.length, 1)
    assert.equal(requested[0].status, 'refund_requested')

    await db.query(`
      update generation_orders
      set status='refunded',refunded_at=now()
      where id=$1 and status='refund_requested'
    `, [orderId])

    const retryAfterRefund = (await db.query(`
      update generation_orders
      set status='processing',retry_count=retry_count+1
      where id=$1 and status='failed'
      returning id
    `, [orderId])).rows
    assert.equal(retryAfterRefund.length, 0)

    const order = (await db.query('select status,retry_count from generation_orders where id=$1', [orderId])).rows[0]
    assert.equal(order.status, 'refunded')
    assert.equal(order.retry_count, 0)
  } finally {
    await db.close()
  }
})

test('a Waffo order can only bind to one generation purchase in an environment', async () => {
  const { db, userId, imageA, imageB } = await database()
  try {
    await createPaidOrder(db, { userId, imageA, imageB })
    await assert.rejects(
      createPaidOrder(db, { userId, imageA, imageB }),
      /unique|duplicate|constraint/i,
    )
  } finally {
    await db.close()
  }
})
