import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { publicVibeSampleEnabled } from '@/lib/runtime-config'

function isSameOrigin(origin: string, requestOrigin: string): boolean {
  try {
    return new URL(origin).origin === requestOrigin
  } catch {
    return false
  }
}

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  if (pathname.startsWith('/vibe-id-sample') && !publicVibeSampleEnabled) {
    return new NextResponse('Not Found', { status: 404 })
  }

  if (pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const requestOrigin = request.headers.get('origin')
    if (requestOrigin && !isSameOrigin(requestOrigin, origin)) {
      return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*', '/vibe-id-sample/:path*'],
}
