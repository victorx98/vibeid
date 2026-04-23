import { NextRequest } from 'next/server'

import { getJobForUser } from '@/lib/backend-store'
import { databaseConfigured } from '@/lib/db'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function progressFor(status: string, stage: string | null): string {
  if (stage) return stage
  if (status === 'queued') return 'queued'
  if (status === 'running') return 'running'
  if (status === 'succeeded') return 'completed'
  return 'failed'
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return Response.json(
      { error: '登录系统未配置，暂时无法读取任务状态' },
      { status: 503 }
    )
  }
  if (auth.error || !auth.user) {
    return Response.json(
      { error: '请先登录后再查看任务状态' },
      { status: 401 }
    )
  }

  if (!databaseConfigured()) {
    return Response.json(
      { error: '任务系统未配置，请稍后再试' },
      { status: 503 }
    )
  }

  const { id } = await context.params
  const job = await getJobForUser(auth.user.id, id)
  if (!job) {
    return Response.json(
      { error: '未找到对应的任务' },
      { status: 404 }
    )
  }

  return Response.json({
    id: job.id,
    kind: job.kind,
    status: job.status,
    progressStage: progressFor(job.status, job.progressStage),
    result: job.status === 'succeeded' ? job.result : undefined,
    error:
      job.status === 'failed'
        ? {
            code: job.errorCode ?? 'job_failed',
            message: job.errorMessage ?? '任务处理失败，请稍后重试',
          }
        : undefined,
  })
}
