import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import Fastify, { type FastifyInstance } from 'fastify'

import { getEnv } from '../lib/backend-config'
import { MAX_RESUME_UPLOAD_BYTES } from '../lib/constants'
import { registerAuth } from './plugins/auth'
import authRoutes from './routes/auth'
import billingRoutes from './routes/billing'
import parseResumeRoutes from './routes/parse-resume'
import resumeRoutes from './routes/resumes'

function buildAllowedOrigins(): string[] {
  const raw = getEnv('ALLOWED_ORIGINS')
  if (!raw) return []
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function isAllowedOrigin(origin: string, allowList: string[]): boolean {
  // Chrome extension fetches send an Origin like chrome-extension://<id>.
  if (origin.startsWith('chrome-extension://')) return true
  if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) return true
  return allowList.includes(origin)
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
    bodyLimit: MAX_RESUME_UPLOAD_BYTES + 1024 * 1024,
    trustProxy: true,
  })

  const allowList = buildAllowedOrigins()

  await app.register(cors, {
    origin(origin, callback) {
      // Non-CORS requests (no Origin header) are always allowed.
      if (!origin) {
        callback(null, true)
        return
      }
      if (isAllowedOrigin(origin, allowList)) {
        callback(null, true)
        return
      }
      callback(new Error('origin_not_allowed'), false)
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  await app.register(multipart, {
    limits: {
      fileSize: MAX_RESUME_UPLOAD_BYTES,
      files: 1,
    },
  })

  registerAuth(app)

  app.get('/health', async () => ({ status: 'ok' }))

  await app.register(authRoutes)
  await app.register(resumeRoutes)
  await app.register(parseResumeRoutes)
  await app.register(billingRoutes)

  return app
}
