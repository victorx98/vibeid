import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { billingKillSwitchEnabled, publicVibeSampleEnabled } from '@/lib/runtime-config'

function isSameOrigin(requestOrigin: string, expectedOrigin: string): boolean {
  try {
    return new URL(expectedOrigin).origin === requestOrigin
  } catch {
    return false
  }
}

export function proxy(request: NextRequest) {
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
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/vibe-id-sample/:path*'],
}
