import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { getEnv, supabaseBrowserConfigured } from '@/lib/backend-config'
import { billingKillSwitchEnabled, publicVibeSampleEnabled } from '@/lib/runtime-config'

function isSameOrigin(requestOrigin: string, expectedOrigin: string): boolean {
  try {
    return new URL(expectedOrigin).origin === requestOrigin
  } catch {
    return false
  }
}

async function refreshSupabaseSession(request: NextRequest): Promise<NextResponse> {
  if (!supabaseBrowserConfigured()) return NextResponse.next()

  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL')!,
    getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.getUser()
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  if (pathname.startsWith('/vibe-id-sample') && !publicVibeSampleEnabled) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (pathname.startsWith('/api/')) {
    if (billingKillSwitchEnabled && pathname.startsWith('/api/checkout/')) {
      return NextResponse.json(
        { error: '支付系统暂时不可用，请稍后再试' },
        { status: 503 }
      )
    }

    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      const requestOrigin = request.headers.get('origin')
      if (requestOrigin && !isSameOrigin(requestOrigin, origin)) {
        return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
      }
    }

    if (pathname === '/api/stripe/webhook') {
      return NextResponse.next()
    }
  }

  return refreshSupabaseSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
