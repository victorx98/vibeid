import { NextRequest, NextResponse } from 'next/server'

import { upsertWechatOpenIdForUser } from '@/lib/backend-store'
import { requireEnv } from '@/lib/backend-config'
import {
  exchangeWechatOAuthCodeForOpenId,
  verifyWechatOAuthState,
} from '@/lib/wechat-pay'
import { logError, logWarn } from '@/lib/logger'

export const runtime = 'nodejs'

function redirectWithParam(origin: string, returnPath: string, key: string, value: string) {
  const url = new URL(returnPath, origin)
  url.searchParams.set(key, value)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!code || !state) {
    return Response.json({ error: '微信授权参数缺失' }, { status: 400 })
  }

  const payload = verifyWechatOAuthState(state)
  if (!payload) {
    logWarn('wechat_oauth_bad_state')
    return Response.json({ error: '微信授权已过期，请重试' }, { status: 400 })
  }

  try {
    const openId = await exchangeWechatOAuthCodeForOpenId(code)
    await upsertWechatOpenIdForUser({
      userId: payload.userId,
      appId: requireEnv('WECHAT_PAY_APP_ID'),
      openId,
    })

    const returnPath = new URL(payload.returnPath, request.nextUrl.origin)
    returnPath.searchParams.set('wechat_pay', '1')
    returnPath.searchParams.set('wechat_product', payload.productTier)
    return redirectWithParam(
      request.nextUrl.origin,
      `${returnPath.pathname}${returnPath.search}`,
      'wechat_oauth',
      'success'
    )
  } catch (error) {
    logError('wechat_oauth_callback_failed', error)
    return redirectWithParam(
      request.nextUrl.origin,
      payload.returnPath,
      'wechat_oauth',
      'failed'
    )
  }
}
