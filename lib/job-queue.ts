import { getBoss } from './db'
import type { AiJobKind } from './backend-store'

export const AI_QUEUE_NAMES: Record<AiJobKind, string> = {
  analyze: 'ai-analyze',
  optimize: 'ai-optimize',
}

export interface AiJobQueuePayload {
  jobId: string
}

export async function enqueueAiJob(kind: AiJobKind, jobId: string): Promise<string> {
  const boss = await getBoss()
  const queue = AI_QUEUE_NAMES[kind]
  await boss.createQueue(queue)
  const bossJobId = await boss.send(queue, { jobId }, {
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
    expireInSeconds: 15 * 60,
    heartbeatSeconds: 60,
  })

  if (!bossJobId) throw new Error('Unable to enqueue AI job')
  return bossJobId
}
