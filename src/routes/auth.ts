import type { FastifyInstance } from 'fastify'
import { z, ZodError } from 'zod'

import { getAllowedOAuthRedirectPrefix, getEnv, requireEnv } from '../../lib/backend-config'
import {
  buildPasswordRecoveryBridgeHtml,
  buildSignupConfirmBridgeHtml,
  isAllowedAuthBridgeRedirect,
  resolveExtensionId,
  resolveSignupEmailRedirectTo,
} from '../../lib/extension-pages'
import { buildGoogleAuthorizeUrl, isAllowedOAuthRedirect } from '../../lib/google-oauth'
import { logError } from '../../lib/logger'
import { createSupabaseAdminClient, createSupabaseAnonClient } from '../../lib/supabase/server'

const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(6).max(200),
})

const signupSchema = credentialsSchema.extend({
  redirectTo: z.url().max(2000).optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const googleUrlSchema = z.object({
  redirectTo: z.url().max(2000),
})

const forgotPasswordSchema = z.object({
  email: z.email().max(320),
  redirectTo: z.url().max(2000),
})

const resetPasswordSchema = z.object({
  refreshToken: z.string().min(1),
  password: z.string().min(6).max(200),
})

interface SessionLike {
  access_token: string
  refresh_token: string
  expires_at?: number
  expires_in?: number
}

function serializeSession(session: SessionLike | null) {
  if (!session) return null
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: session.expires_at ?? null,
    expiresIn: session.expires_in ?? null,
  }
}

function serializeUser(user: { id: string; email?: string | null } | null) {
  if (!user) return null
  return { id: user.id, email: user.email ?? null }
}

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/signup', async (request, reply) => {
    try {
      const { email, password, redirectTo } = signupSchema.parse(request.body)
      const allowedPrefix = getAllowedOAuthRedirectPrefix()
      const emailRedirectTo = resolveSignupEmailRedirectTo(
        redirectTo,
        allowedPrefix,
        resolveExtensionId(undefined, getEnv('EXTENSION_ID'))
      )

      if (
        emailRedirectTo &&
        !isAllowedAuthBridgeRedirect(emailRedirectTo, allowedPrefix)
      ) {
        return reply.code(400).send({ error: 'redirect_not_allowed' })
      }

      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      })

      if (error) {
        return reply.code(400).send({ error: error.message })
      }

      return reply.send({
        user: serializeUser(data.user),
        session: serializeSession(data.session as SessionLike | null),
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('auth_signup_failed', error)
      return reply.code(500).send({ error: 'signup_failed' })
    }
  })

  app.post('/auth/login', async (request, reply) => {
    try {
      const { email, password } = credentialsSchema.parse(request.body)
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })

      if (error || !data.session) {
        return reply.code(401).send({ error: 'invalid_credentials' })
      }

      return reply.send({
        user: serializeUser(data.user),
        session: serializeSession(data.session as SessionLike),
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('auth_login_failed', error)
      return reply.code(500).send({ error: 'login_failed' })
    }
  })

  app.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = refreshSchema.parse(request.body)
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken })

      if (error || !data.session) {
        return reply.code(401).send({ error: 'invalid_refresh_token' })
      }

      return reply.send({
        user: serializeUser(data.user),
        session: serializeSession(data.session as SessionLike),
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('auth_refresh_failed', error)
      return reply.code(500).send({ error: 'refresh_failed' })
    }
  })

  app.post('/auth/logout', { preHandler: app.authenticate }, async (request, reply) => {
    const header = request.headers['authorization']
    const value = Array.isArray(header) ? header[0] : header
    const token = value?.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null

    if (token) {
      try {
        const admin = createSupabaseAdminClient()
        await admin.auth.admin.signOut(token)
      } catch (error) {
        // Best-effort revocation; client drops the token regardless.
        logError('auth_logout_failed', error)
      }
    }

    return reply.send({ ok: true })
  })

  app.get('/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
    return reply.send({ user: request.authUser })
  })

  // Bridge page for signup email-confirmation redirects. Supabase lands here with
  // session tokens in the URL hash; optional ?extensionId= passes session back to the extension.
  app.get('/auth/confirm', async (request, reply) => {
    const query = request.query as { extensionId?: string }
    const extensionId = resolveExtensionId(query.extensionId, getEnv('EXTENSION_ID'))

    return reply
      .type('text/html; charset=utf-8')
      .send(buildSignupConfirmBridgeHtml(extensionId))
  })

  // Bridge page for password-recovery email redirects. Supabase lands here with
  // recovery tokens in the URL hash; optional ?extensionId= passes session back to the extension.
  app.get('/auth/recovery', async (request, reply) => {
    const query = request.query as { extensionId?: string }
    const extensionId = resolveExtensionId(query.extensionId, getEnv('EXTENSION_ID'))

    return reply
      .type('text/html; charset=utf-8')
      .send(buildPasswordRecoveryBridgeHtml(extensionId))
  })

  // Sends a Supabase password-recovery email. redirectTo must be allow-listed in
  // Supabase and match getAllowedOAuthRedirectPrefix() or a chromiumapp.org URL.
  app.post('/auth/forgot-password', async (request, reply) => {
    try {
      const { email, redirectTo } = forgotPasswordSchema.parse(request.body)
      if (!isAllowedOAuthRedirect(redirectTo, getAllowedOAuthRedirectPrefix())) {
        return reply.code(401).send({ error: 'redirect_not_allowed' })
      }

      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

      if (error) {
        // Do not reveal whether the email is registered.
        logError('auth_forgot_password_failed', error, { email })
      }

      return reply.send({ ok: true })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('auth_forgot_password_failed', error)
      return reply.code(500).send({ error: 'forgot_password_failed' })
    }
  })

  // Completes password recovery using tokens from the Supabase reset-email redirect.
  app.post('/auth/reset-password', async (request, reply) => {
    try {
      const header = request.headers['authorization']
      const value = Array.isArray(header) ? header[0] : header
      const accessToken = value?.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : null
      if (!accessToken) {
        return reply.code(401).send({ error: 'missing_access_token' })
      }

      const { refreshToken, password } = resetPasswordSchema.parse(request.body)
      const supabase = createSupabaseAnonClient()

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (sessionError) {
        return reply.code(401).send({ error: 'invalid_recovery_session' })
      }

      const { data, error } = await supabase.auth.updateUser({ password })
      if (error || !data.user) {
        return reply.code(400).send({ error: error?.message ?? 'password_update_failed' })
      }

      const { data: sessionData } = await supabase.auth.getSession()

      return reply.send({
        user: serializeUser(data.user),
        session: serializeSession(sessionData.session as SessionLike | null),
      })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('auth_reset_password_failed', error)
      return reply.code(500).send({ error: 'reset_password_failed' })
    }
  })

  // Returns the Supabase OAuth authorize URL the extension opens with
  // chrome.identity.launchWebAuthFlow. The provider redirect lands back on the
  // extension's chromiumapp.org URL with the session tokens in the fragment.
  app.get('/auth/google/url', async (request, reply) => {
    try {
      const { redirectTo } = googleUrlSchema.parse(request.query)
      if (!isAllowedOAuthRedirect(redirectTo, getAllowedOAuthRedirectPrefix())) {
        return reply.code(400).send({ error: 'redirect_not_allowed' })
      }

      const url = buildGoogleAuthorizeUrl(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), redirectTo)
      return reply.send({ url })
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.code(400).send({ error: 'invalid_request' })
      }
      logError('auth_google_url_failed', error)
      return reply.code(500).send({ error: 'google_url_failed' })
    }
  })
}
