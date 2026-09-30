const textEncoder = new TextEncoder()

const AWS_ALGORITHM = 'AWS4-HMAC-SHA256'
const AWS_REGION = 'auto'
const AWS_SERVICE = 's3'
const AWS_TERMINATOR = 'aws4_request'
const UNSIGNED_PAYLOAD = 'UNSIGNED-PAYLOAD'

export type R2PresignedPutInput = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  key: string
  expiresInSeconds: number
  now?: Date
}

const toHex = (value: ArrayBuffer): string =>
  Array.from(new Uint8Array(value))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')

const sha256Hex = async (value: string): Promise<string> =>
  toHex(await crypto.subtle.digest('SHA-256', textEncoder.encode(value)))

const hmacSha256 = async (
  key: ArrayBuffer | Uint8Array,
  value: string,
): Promise<ArrayBuffer> => {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, textEncoder.encode(value))
}

const encodeRfc3986 = (value: string): string =>
  encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )

const encodeCanonicalPath = (value: string): string =>
  value
    .split('/')
    .map((segment) => encodeRfc3986(segment))
    .join('/')

const buildCanonicalQuery = (params: Record<string, string>): string =>
  Object.entries(params)
    .map(([key, value]) => [encodeRfc3986(key), encodeRfc3986(value)] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
      if (leftKey < rightKey) return -1
      if (leftKey > rightKey) return 1
      if (leftValue < rightValue) return -1
      if (leftValue > rightValue) return 1
      return 0
    })
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

const toAmzDate = (date: Date): string =>
  date.toISOString().replace(/[:-]|\.\d{3}/g, '')

export async function createR2PresignedPutUrl(
  input: R2PresignedPutInput,
): Promise<string> {
  const accountId = input.accountId.trim()
  const accessKeyId = input.accessKeyId.trim()
  const secretAccessKey = input.secretAccessKey.trim()
  const bucketName = input.bucketName.trim()
  const key = input.key.replace(/^\/+/, '')
  const expiresInSeconds = Math.max(
    1,
    Math.min(604800, Math.floor(input.expiresInSeconds)),
  )

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName || !key) {
    throw new Error('R2 presign configuration is incomplete')
  }

  const now = input.now ?? new Date()
  const amzDate = toAmzDate(now)
  const dateStamp = amzDate.slice(0, 8)
  const credentialScope =
    `${dateStamp}/${AWS_REGION}/${AWS_SERVICE}/${AWS_TERMINATOR}`
  const host = `${accountId}.r2.cloudflarestorage.com`
  const canonicalUri =
    `/${encodeRfc3986(bucketName)}/${encodeCanonicalPath(key)}`
  const canonicalQuery = buildCanonicalQuery({
    'X-Amz-Algorithm': AWS_ALGORITHM,
    'X-Amz-Content-Sha256': UNSIGNED_PAYLOAD,
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresInSeconds),
    'X-Amz-SignedHeaders': 'host',
  })

  const canonicalRequest = [
    'PUT',
    canonicalUri,
    canonicalQuery,
    `host:${host}\n`,
    'host',
    UNSIGNED_PAYLOAD,
  ].join('\n')

  const stringToSign = [
    AWS_ALGORITHM,
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join('\n')

  const dateKey = await hmacSha256(
    textEncoder.encode(`AWS4${secretAccessKey}`),
    dateStamp,
  )
  const regionKey = await hmacSha256(dateKey, AWS_REGION)
  const serviceKey = await hmacSha256(regionKey, AWS_SERVICE)
  const signingKey = await hmacSha256(serviceKey, AWS_TERMINATOR)
  const signature = toHex(await hmacSha256(signingKey, stringToSign))

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`
}
