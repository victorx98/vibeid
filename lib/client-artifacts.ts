import { getApiErrorMessage } from './client-api'
import type { ProductTier } from './product-tiers'
import type { ResumeArtifactPayload } from './types'

const ARTIFACT_KEY = 'current_resume_artifact_id'

export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface JobPollResult<T = unknown> {
  id: string
  kind: 'analyze' | 'optimize'
  status: JobStatus
  progressStage: string
  result?: T
  error?: {
    code: string
    message: string
  }
}

export function getCurrentArtifactId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ARTIFACT_KEY)
}

export function setCurrentArtifactId(artifactId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ARTIFACT_KEY, artifactId)
}

export function artifactIdFromLocation(searchParams: Pick<URLSearchParams, 'get'>): string | null {
  return searchParams.get('artifactId') || getCurrentArtifactId()
}

export async function fetchArtifact(
  artifactId: string,
  requiredTier?: ProductTier
): Promise<{ artifact: ResumeArtifactPayload; entitlements: ProductTier[] }> {
  const params = requiredTier ? `?requiredTier=${requiredTier}` : ''
  const res = await fetch(`/api/artifacts/${artifactId}${params}`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    const error = new Error(await getApiErrorMessage(res, '无法读取分析结果')) as Error & {
      status?: number
    }
    error.status = res.status
    throw error
  }

  return res.json()
}

export async function getJob<T = unknown>(jobId: string): Promise<JobPollResult<T>> {
  const res = await fetch(`/api/jobs/${jobId}`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(await getApiErrorMessage(res, '任务状态读取失败'))
  }

  return res.json()
}

export async function waitForJob<T = unknown>(
  jobId: string,
  options: {
    signal?: AbortSignal
    onUpdate?: (job: JobPollResult<T>) => void
  } = {}
): Promise<JobPollResult<T>> {
  while (!options.signal?.aborted) {
    const job = await getJob<T>(jobId)
    options.onUpdate?.(job)

    if (job.status === 'succeeded') return job
    if (job.status === 'failed') {
      throw new Error(job.error?.message || '任务处理失败，请稍后重试')
    }

    await new Promise((resolve, reject) => {
      const timer = window.setTimeout(resolve, 1_000)
      options.signal?.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true }
      )
    })
  }

  throw new DOMException('Aborted', 'AbortError')
}
