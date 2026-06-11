type LogPrimitive = boolean | number | string | null | undefined
type LogValue = LogPrimitive | LogValue[] | { [key: string]: LogValue }
type LogMeta = Record<string, LogValue>

const REDACTED = '[redacted]'
const MAX_VISIBLE_STRING_LENGTH = 180
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

const SENSITIVE_TOKENS = new Set([
  'resume',
  'jd',
  'prompt',
  'password',
  'secret',
  'token',
  'key',
  'authorization',
  'cookie',
  'email',
  'phone',
  'ssn',
  'body',
  'content',
  'text',
])

function keyTokens(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .split(/[_\-.]+/)
    .map((token) => token.toLowerCase())
    .filter(Boolean)
}

function isSensitiveKey(key: string): boolean {
  const tokens = keyTokens(key)
  if (tokens.some((token) => SENSITIVE_TOKENS.has(token))) return true
  return /job_?description/i.test(key)
}

function summarizeString(value: string): string {
  if (value.length === 0) return value
  if (EMAIL_PATTERN.test(value)) return REDACTED
  if (value.length > MAX_VISIBLE_STRING_LENGTH) return `[redacted:${value.length}]`
  return value
}

function redactValue(key: string, value: LogValue): LogValue {
  if (value == null) return value

  if (typeof value === 'string') {
    if (isSensitiveKey(key)) return REDACTED
    return summarizeString(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(key, item))
  }

  const redactedObject: Record<string, LogValue> = {}
  for (const [nestedKey, nestedValue] of Object.entries(value)) {
    redactedObject[nestedKey] = redactValue(nestedKey, nestedValue)
  }
  return redactedObject
}

function redactMeta(meta: LogMeta = {}): LogMeta {
  const sanitized: LogMeta = {}
  for (const [key, value] of Object.entries(meta)) {
    sanitized[key] = redactValue(key, value)
  }
  return sanitized
}

function serializeError(error: unknown): LogMeta {
  if (error instanceof Error) {
    const errorRecord = error as Error & {
      status?: number
      type?: string | null
      requestID?: string | null
      cause?: unknown
    }

    return {
      name: error.name,
      message: summarizeString(error.message),
      status: errorRecord.status,
      type: errorRecord.type ?? undefined,
      requestId: errorRecord.requestID ?? undefined,
      cause:
        errorRecord.cause instanceof Error
          ? summarizeString(errorRecord.cause.message)
          : undefined,
    }
  }

  if (typeof error === 'string') {
    return { message: summarizeString(error) }
  }

  return { message: 'Unknown error' }
}

function emit(level: 'info' | 'warn' | 'error', event: string, meta: LogMeta = {}) {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...redactMeta(meta),
  })

  if (level === 'error') {
    console.error(payload)
    return
  }

  if (level === 'warn') {
    console.warn(payload)
    return
  }

  console.info(payload)
}

export function logInfo(event: string, meta?: LogMeta) {
  emit('info', event, meta)
}

export function logWarn(event: string, meta?: LogMeta) {
  emit('warn', event, meta)
}

export function logError(event: string, error: unknown, meta: LogMeta = {}) {
  emit('error', event, {
    ...meta,
    error: serializeError(error),
  })
}
