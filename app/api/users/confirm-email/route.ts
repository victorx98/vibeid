import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { confirmArtifactEmailForUser } from '@/lib/backend-store'
import { databaseConfigured } from '@/lib/db'
import { logError } from '@/lib/logger'
import { getAuthenticatedUser, createSupabaseAdminClient } from '@/lib/supabase/server'
import { confirmEmailRequestSchema } from '@/lib/validation'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return Response.json(
      { error: '登录系统未配置，暂时无法确认邮箱' },
      { status: 503 }
    )
  }
  if (auth.error || !auth.user) {
    return Response.json(
      { error: '请先登录后再确认邮箱' },
      { status: 401 }
    )
  }

  if (!databaseConfigured()) {
    return Response.json(
      { error: '用户资料系统未配置，请稍后再试' },
      { status: 503 }
    )
  }

  try {
    const rawBody = await request.json()
    const { artifactId, email } = confirmEmailRequestSchema.parse(rawBody)
    const normalizedEmail = email.toLowerCase()

    await confirmArtifactEmailForUser({
      userId: auth.user.id,
      artifactId,
      email: normalizedEmail,
    })

    const admin = createSupabaseAdminClient()
    const confirmedAt = new Date().toISOString()
    const { error } = await admin.auth.admin.updateUserById(auth.user.id, {
      user_metadata: {
        ...(auth.user.user_metadata ?? {}),
        registration_email: normalizedEmail,
        registration_email_confirmed_at: confirmedAt,
      },
    })
    if (error) throw error

    return Response.json({
      email: normalizedEmail,
      confirmedAt,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: '邮箱格式不正确，请重新填写' },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'artifact_not_found') {
      return Response.json(
        { error: '未找到对应的简历分析记录' },
        { status: 404 }
      )
    }

    logError('confirm_registration_email_failed', error)
    return Response.json(
      { error: '邮箱确认失败，请稍后重试' },
      { status: 500 }
    )
  }
}
