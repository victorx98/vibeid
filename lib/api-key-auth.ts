import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

export function verifyApiKey(request: NextRequest): boolean {
  const secret = process.env.ATS_API_SECRET
  if (!secret) return false

  const provided = request.headers.get('x-api-key') ?? ''
  if (!provided) return false

  try {
    const expectedBuf = Buffer.from(secret)
    const providedBuf = Buffer.from(provided)
    if (expectedBuf.length !== providedBuf.length) return false
    return timingSafeEqual(expectedBuf, providedBuf)
  } catch {
    return false
  }
}
