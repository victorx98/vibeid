import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import {
  requireEnv,
  requireSupabaseAdminKey,
  supabaseBrowserConfigured,
  supabaseServerConfigured,
} from '../backend-config'

/**
 * Anonymous (publishable-key) client. Used for password sign-up / sign-in and
 * refresh-token exchange on behalf of the caller. Never persists sessions —
 * this process is stateless and hands tokens straight back to the client.
 */
export function createSupabaseAnonClient(): SupabaseClient {
  if (!supabaseBrowserConfigured()) {
    throw new Error('Supabase public env is not configured')
  }

  return createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Service-role client for privileged operations (token verification, admin
 * user management). Requires SUPABASE_SECRET_KEY (or the legacy service-role
 * key fallback).
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!supabaseServerConfigured()) {
    throw new Error('Supabase server env is not configured')
  }

  return createSupabaseClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireSupabaseAdminKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Verify a Supabase access token (JWT) and return the user it belongs to.
 * Returns null when the token is missing, invalid, or expired.
 */
export async function getUserFromToken(token: string | null | undefined): Promise<User | null> {
  if (!token || !supabaseServerConfigured()) return null

  const admin = createSupabaseAdminClient()
  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) return null

  return data.user
}
