/**
 * Keep the runtime-owned Response body intact. Cloudflare can preserve the
 * body's known length when it is passed directly to R2, while wrapping it in
 * a generic ReadableStream turns it into an unknown-length stream.
 */
export function responseBodyForR2(response: Response): ReadableStream<Uint8Array> {
  if (!response.body) throw new Error('RESULT_SOURCE_BODY_MISSING')
  return response.body
}
