import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

import { getUserFromToken } from '../../lib/supabase/server'

function readBearerToken(request: FastifyRequest): string | null {
  const header = request.headers['authorization']
  const value = Array.isArray(header) ? header[0] : header
  if (!value || !value.startsWith('Bearer ')) return null
  const token = value.slice('Bearer '.length).trim()
  return token.length > 0 ? token : null
}

/**
 * Registers request.authUser (default null) and an `authenticate` preHandler.
 * Decorating the root instance makes both available to every child route
 * plugin without needing fastify-plugin.
 */
export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest('authUser', null)

  app.decorate(
    'authenticate',
    async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
      const token = readBearerToken(request)
      const user = await getUserFromToken(token)

      if (!user) {
        reply.code(401).send({ error: 'unauthorized' })
        return
      }

      request.authUser = { id: user.id, email: user.email ?? null }
    }
  )
}
