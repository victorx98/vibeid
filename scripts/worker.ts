import { loadEnvConfig } from '@next/env'
import type { AiJobQueuePayload } from '../lib/job-queue'

loadEnvConfig(process.cwd())

const {
  buildOptimizeInputFromArtifact,
  completeJob,
  failJob,
  getArtifactForWorker,
  getJobForWorker,
  heartbeatJob,
  markJobRunning,
  resetStaleRunningJobs,
  saveAnalyzeResult,
  saveOptimizedResume,
} = await import('../lib/backend-store')
const { getBoss } = await import('../lib/db')
const { AI_QUEUE_NAMES, enqueueAiJob } = await import('../lib/job-queue')
const { logError, logInfo, logWarn } = await import('../lib/logger')
const { optimizeResumeJobRequestSchema } = await import('../lib/validation')
const { runResumeAnalysis } = await import('../app/api/analyze/route')
const { runResumeOptimization } = await import('../app/api/optimize-resume/route')

async function withJobHeartbeat<T>(
  jobId: string,
  initialStage: string,
  callback: () => Promise<T>
): Promise<T> {
  await markJobRunning(jobId, initialStage)
  const timer = setInterval(() => {
    void heartbeatJob(jobId).catch((error) => {
      logError('worker_heartbeat_failed', error, { jobId })
    })
  }, 30_000)

  try {
    return await callback()
  } finally {
    clearInterval(timer)
  }
}

async function processAnalyze(jobId: string) {
  const job = await getJobForWorker(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)
  if (job.status === 'succeeded') return

  const artifact = await getArtifactForWorker(job.artifactId)
  if (!artifact) throw new Error(`Artifact ${job.artifactId} not found`)

  const result = await withJobHeartbeat(jobId, 'analyzing', async () => {
    return runResumeAnalysis({
      resumeText: artifact.resumeText,
      targetRole: artifact.targetRole,
      jobDescription: artifact.jobDescription,
    })
  })

  await saveAnalyzeResult(job.artifactId, result)
  await completeJob(jobId, 'completed', {
    artifactId: job.artifactId,
    ...result,
  })
}

async function processOptimize(jobId: string) {
  const job = await getJobForWorker(jobId)
  if (!job) throw new Error(`Job ${jobId} not found`)
  if (job.status === 'succeeded') return

  const artifact = await getArtifactForWorker(job.artifactId)
  if (!artifact) throw new Error(`Artifact ${job.artifactId} not found`)

  const input = optimizeResumeJobRequestSchema.parse(job.inputPayload)
  const stageTimer = setTimeout(() => {
    void heartbeatJob(jobId, 'optimizing-2').catch((error) => {
      logError('worker_stage_update_failed', error, { jobId })
    })
  }, 15_000)

  const result = await withJobHeartbeat(jobId, 'optimizing-1', async () => {
    try {
      return await runResumeOptimization(
        buildOptimizeInputFromArtifact(artifact, input.adviceFeedback)
      )
    } finally {
      clearTimeout(stageTimer)
    }
  })

  await saveOptimizedResume(job.artifactId, result.optimizedResume)
  await completeJob(jobId, 'completed', {
    artifactId: job.artifactId,
    ...result,
  })
}

async function processJob(kind: 'analyze' | 'optimize', payload: AiJobQueuePayload) {
  try {
    if (kind === 'analyze') await processAnalyze(payload.jobId)
    else await processOptimize(payload.jobId)
  } catch (error) {
    logError('worker_job_failed', error, { kind, jobId: payload.jobId })
    await failJob(
      payload.jobId,
      'worker_error',
      error instanceof Error ? error.message : 'Unknown worker error'
    )
    throw error
  }
}

async function requeueStaleJobs() {
  const staleJobIds = await resetStaleRunningJobs(10)
  for (const jobId of staleJobIds) {
    const job = await getJobForWorker(jobId)
    if (!job) continue
    await enqueueAiJob(job.kind, job.id)
    logWarn('worker_requeued_stale_job', { jobId: job.id, kind: job.kind })
  }
}

async function main() {
  const boss = await getBoss()
  await boss.createQueue(AI_QUEUE_NAMES.analyze)
  await boss.createQueue(AI_QUEUE_NAMES.optimize)

  await boss.work<AiJobQueuePayload>(
    AI_QUEUE_NAMES.analyze,
    { pollingIntervalSeconds: 2, heartbeatRefreshSeconds: 30, localConcurrency: 2 },
    async (jobs) => {
      await Promise.all(jobs.map((job) => processJob('analyze', job.data)))
    }
  )

  await boss.work<AiJobQueuePayload>(
    AI_QUEUE_NAMES.optimize,
    { pollingIntervalSeconds: 2, heartbeatRefreshSeconds: 30, localConcurrency: 1 },
    async (jobs) => {
      await Promise.all(jobs.map((job) => processJob('optimize', job.data)))
    }
  )

  const staleTimer = setInterval(() => {
    void requeueStaleJobs().catch((error) => {
      logError('worker_requeue_stale_failed', error)
    })
  }, 60_000)

  const shutdown = async () => {
    clearInterval(staleTimer)
    await boss.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown())
  process.on('SIGTERM', () => void shutdown())

  logInfo('worker_started')
}

main().catch((error) => {
  logError('worker_start_failed', error)
  process.exit(1)
})
