import type { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'

import { logError } from '../../lib/logger'
import {
  createResume,
  deleteResumeForUser,
  getCurrentResumeForUser,
  getResumeForUser,
  listResumesForUser,
} from '../../lib/resume-store'
import { MAX_RESUME_TEXT_CHARS } from '../../lib/constants'

const createResumeSchema = z.object({
  resumeText: z.string().trim().min(10).max(MAX_RESUME_TEXT_CHARS),
  fileName: z.string().trim().max(255).optional(),
  makeCurrent: z.boolean().optional(),
})

export default async function resumeRoutes(app: FastifyInstance): Promise<void> {
  app.get('/resumes', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const resumes = await listResumesForUser(request.authUser!.id)
      return reply.send({ resumes })
    } catch (error) {
      logError('resumes_list_failed', error)
      return reply.code(500).send({ error: 'list_failed' })
    }
  })

  app.get('/resumes/current', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const resume = await getCurrentResumeForUser(request.authUser!.id)
      if (!resume) return reply.code(404).send({ error: 'no_resume' })
      return reply.send({ resume })
    } catch (error) {
      logError('resumes_current_failed', error)
      return reply.code(500).send({ error: 'current_failed' })
    }
  })

  app.get<{ Params: { id: string } }>(
    '/resumes/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const resume = await getResumeForUser(request.authUser!.id, request.params.id)
        if (!resume) return reply.code(404).send({ error: 'not_found' })
        return reply.send({ resume })
      } catch (error) {
        logError('resumes_get_failed', error)
        return reply.code(500).send({ error: 'get_failed' })
      }
    }
  )

  app.post('/resumes', { preHandler: app.authenticate }, async (request, reply) => {
    try {
      const { resumeText, fileName, makeCurrent } = createResumeSchema.parse(request.body)
      const resume = await createResume({
        userId: request.authUser!.id,
        resumeText,
        fileName: fileName ?? null,
        makeCurrent,
      })
      return reply.code(201).send({ resume })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('resumes_create_failed', error)
      return reply.code(500).send({ error: 'create_failed' })
    }
  })

  app.delete<{ Params: { id: string } }>(
    '/resumes/:id',
    { preHandler: app.authenticate },
    async (request, reply) => {
      try {
        const deleted = await deleteResumeForUser(request.authUser!.id, request.params.id)
        if (!deleted) return reply.code(404).send({ error: 'not_found' })
        return reply.send({ ok: true })
      } catch (error) {
        logError('resumes_delete_failed', error)
        return reply.code(500).send({ error: 'delete_failed' })
      }
    }
  )
}
