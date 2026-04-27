import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

import {
  getEnv,
  requireEnv,
  requireSupabaseAdminKey,
  supabaseBrowserConfigured,
  supabaseServerConfigured,
} from '@/lib/backend-config'

export function createSupabaseRouteClient(request: NextRequest) {
  if (!supabaseBrowserConfigured()) {
    throw new Error('Supabase public env is not configured')
  }

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Token refresh is handled in proxy.ts so route handlers can remain
          // response-shape focused.
        },
      },
    }
  )
}

export function createSupabaseAdminClient() {
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

export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{ user: User; error: null } | { user: null; error: 'not_configured' | 'unauthorized' }> {
  if (!getEnv('NEXT_PUBLIC_SUPABASE_URL') || !getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')) {
    return { user: null, error: 'not_configured' }
  }

  const supabase = createSupabaseRouteClient(request)
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return { user: null, error: 'unauthorized' }

  return { user: data.user, error: null }
}
