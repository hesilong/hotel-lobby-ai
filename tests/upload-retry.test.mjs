import test from 'node:test'
import assert from 'node:assert/strict'
import { putUploadWithRetry, UploadFailedError } from '../src/lib/upload-retry.ts'

const uploadInput = {
  url: 'https://upload.example.test/object',
  mimeType: 'image/png',
  body: new Blob(['image'], { type: 'image/png' }),
  retryDelay: async () => {},
}

test('retries transient network failures and eventually succeeds', async () => {
  let attempts = 0
  const failures = []

  await putUploadWithRetry({
    ...uploadInput,
    fetchImpl: async () => {
      attempts += 1
      if (attempts < 3) throw new TypeError('network unavailable')
      return new Response(null, { status: 200 })
    },
    onAttemptFailure: failure => failures.push(failure),
  })

  assert.equal(attempts, 3)
  assert.deepEqual(failures.map(failure => failure.status), [null, null])
})

test('retries temporary R2 server responses', async () => {
  let attempts = 0

  await putUploadWithRetry({
    ...uploadInput,
    fetchImpl: async () => {
      attempts += 1
      return new Response(null, { status: attempts === 1 ? 503 : 200 })
    },
  })

  assert.equal(attempts, 2)
})

test('does not retry a non-retriable signed upload response', async () => {
  let attempts = 0

  await assert.rejects(
    putUploadWithRetry({
      ...uploadInput,
      fetchImpl: async () => {
        attempts += 1
        return new Response(null, { status: 403 })
      },
    }),
    error => error instanceof UploadFailedError && error.status === 403,
  )

  assert.equal(attempts, 1)
})
