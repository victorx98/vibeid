'use client'

import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

function hasPublicSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

export function isSupabaseClientConfigured(): boolean {
  return hasPublicSupabaseEnv()
}

export function createClient() {
  if (!hasPublicSupabaseEnv()) {
    throw new Error('Supabase client is not configured')
  }

  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  }

  return browserClient
}

export async function ensureSupabaseSession(): Promise<string> {
  const supabase = createClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  if (sessionData.session?.user.id) return sessionData.session.user.id

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  const userId = data.user?.id
  if (!userId) throw new Error('Unable to create anonymous session')
  return userId
}
