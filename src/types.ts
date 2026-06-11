import 'fastify'
import type { FastifyReply, FastifyRequest } from 'fastify'

export interface AuthUser {
  id: string
  email: string | null
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
