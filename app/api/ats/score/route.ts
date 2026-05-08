import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { runAtsAnalysis } from '@/app/api/analyze/route'
import { verifyApiKey } from '@/lib/api-key-auth'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { logError, logInfo } from '@/lib/logger'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import { analyzeRequestSchema, type AnalyzeRequest } from '@/lib/validation'
import type { AtsPhaseResult } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const rateLimit = checkRateLimit(request, RATE_LIMITS.ats_score)
  const headers = createRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return Response.json(
      { error: '请求过于频繁，请稍后再试', error_code: 'rate_limit_exceeded' },
      { status: 429, headers }
    )
  }

  // 双路径认证：x-api-key 或 Supabase session（两者有一通过即可）
  const hasApiKey = verifyApiKey(request)
  let auth = null

  if (!hasApiKey) {
    auth = await getAuthenticatedUser(request)
    if (auth.error === 'not_configured') {
      return Response.json(
        { error: '登录系统未配置，暂时无法进行分析', error_code: 'auth_not_configured' },
        { status: 503, headers }
      )
    }
    if (auth.error || !auth.user) {
      return Response.json(
        { error: '请提供有效的 API key（x-api-key header）或登录后再进行分析', error_code: 'unauthorized' },
        { status: 401, headers }
      )
    }
  }

  try {
    const rawBody = await request.json()
    const input = analyzeRequestSchema.parse(rawBody)

    const result = await runAtsAnalysis(input)

    const duration = Date.now() - startTime
    logInfo('ats_score_api_called', {
      auth_method: hasApiKey ? 'api_key' : 'supabase_session',
      has_jd: !!input.jobDescription,
      ats_score: result.atsScore,
      duration_ms: duration,
    })

    return Response.json(result, { status: 200, headers })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: '请求参数不合法，请检查简历文本和目标岗位后重试', error_code: 'invalid_request' },
        { status: 400, headers }
      )
    }

    const duration = Date.now() - startTime
    logError('ats_score_api_failed', error, {
      auth_method: hasApiKey ? 'api_key' : 'supabase_session',
      duration_ms: duration,
    })

    return Response.json(
      { error: '简历分析失败，请稍后重试', error_code: 'internal_error' },
      { status: 500, headers }
    )
  }
}
