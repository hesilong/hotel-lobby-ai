import test from 'node:test'
import assert from 'node:assert/strict'
import { responseBodyForR2 } from '../src/server/r2-response-body.ts'

test('preserves the original response body so R2 retains its known length', () => {
  const response = new Response(new Uint8Array([1, 2, 3]), {
    headers: { 'Content-Length': '3', 'Content-Type': 'video/mp4' },
  })

  const body = responseBodyForR2(response)

  assert.equal(body, response.body)
})

test('rejects a response without a body', () => {
  const response = new Response(null, { status: 204 })

  assert.throws(() => responseBodyForR2(response), /RESULT_SOURCE_BODY_MISSING/)
})
