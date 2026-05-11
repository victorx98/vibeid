import { NextRequest, NextResponse } from 'next/server'

import { getArtifactForUser } from '@/lib/backend-store'
import { billingEnabled, wechatPayEnabled } from '@/lib/backend-config'
import { logError } from '@/lib/logger'
import { billingKillSwitchEnabled } from '@/lib/runtime-config'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import {
  buildWechatOAuthAuthorizeUrl,
  signWechatOAuthState,
} from '@/lib/wechat-pay'

export const runtime = 'nodejs'

function normalizeReturnPath(path: string | null, artifactId: string, productTier: 'basic' | 'resume') {
  const fallback =
    productTier === 'resume'
      ? `/result?artifactId=${artifactId}`
      : `/sales?artifactId=${artifactId}`
  if (!path?.startsWith('/')) return fallback
  return path
}

export async function GET(request: NextRequest) {
  if (billingKillSwitchEnabled || !billingEnabled() || !wechatPayEnabled()) {
    return Response.json({ error: '微信支付暂时不可用，请稍后再试' }, { status: 503 })
  }

  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return Response.json({ error: '登录系统未配置，暂时无法授权微信支付' }, { status: 503 })
  }
  if (auth.error || !auth.user) {
    return Response.json({ error: '请先登录后再授权微信支付' }, { status: 401 })
  }

  const artifactId = request.nextUrl.searchParams.get('artifactId')
  const productTier = request.nextUrl.searchParams.get('productTier')
  if (!artifactId || (productTier !== 'basic' && productTier !== 'resume')) {
    return Response.json({ error: '请求参数不合法' }, { status: 400 })
  }

  try {
    const artifact = await getArtifactForUser(auth.user.id, artifactId)
    if (!artifact) {
      return Response.json({ error: '未找到对应的简历分析记录' }, { status: 404 })
    }

    const returnPath = normalizeReturnPath(
      request.nextUrl.searchParams.get('returnPath'),
      artifactId,
      productTier
    )
    const state = signWechatOAuthState({
      userId: auth.user.id,
      artifactId,
      productTier,
      returnPath,
    })
    const authorizeUrl = buildWechatOAuthAuthorizeUrl({
      redirectUri: `${request.nextUrl.origin}/api/wechat/oauth/callback`,
      state,
    })
    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    logError('wechat_oauth_start_failed', error)
    return Response.json({ error: '微信授权失败，请稍后再试' }, { status: 500 })
  }
}
