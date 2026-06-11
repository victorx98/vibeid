import { createHash } from 'node:crypto'
import type { PoolClient } from 'pg'

import { query, withTransaction } from './db'
import type { ProductTier } from './product-tiers'
import { TIERS_FOR_PRODUCT } from './product-tiers'
import type {
  AnalyzeRequest,
  OptimizeResumeRequest,
} from './validation'
import type { AnalyzeResultPayload, ResumeArtifactPayload } from './types'

export type AiJobKind = 'analyze' | 'optimize'
export type AiJobStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export interface AiJobRecord {
  id: string
  userId: string
  artifactId: string
  kind: AiJobKind
  status: AiJobStatus
  progressStage: string | null
  inputPayload: unknown
  result: unknown
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

interface ArtifactRow {
  id: string
  user_id: string
  resume_text: string
  target_role: string
  job_description: string | null
  candidate_email: string | null
  confirmed_email: string | null
  email_confirmed_at: Date | null
  ats_result: unknown
  competition: unknown
  mentor_advice: unknown
  analysis_result: AnalyzeResultPayload | null
  optimized_resume: string | null
  created_at: Date
  updated_at: Date
}

interface JobRow {
  id: string
  user_id: string
  artifact_id: string
  kind: AiJobKind
  status: AiJobStatus
  progress_stage: string | null
  input_payload: unknown
  result: unknown
  error_code: string | null
  error_message: string | null
  created_at: Date
  updated_at: Date
}

function hashInput(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function mapJob(row: JobRow): AiJobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    artifactId: row.artifact_id,
    kind: row.kind,
    status: row.status,
    progressStage: row.progress_stage,
    inputPayload: row.input_payload,
    result: row.result,
    errorCode: row.error_code,
    errorMessage: row.error_message,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

function mapArtifact(row: ArtifactRow): ResumeArtifactPayload {
  const analysis = row.analysis_result
  const atsResult = analysis?.atsResult ?? (row.ats_result as AnalyzeResultPayload['atsResult'])
  const competition =
    analysis?.competition ?? (row.competition as AnalyzeResultPayload['competition'])
  const mentorAdvice =
    analysis?.mentorAdvice ?? (row.mentor_advice as AnalyzeResultPayload['mentorAdvice']) ?? []

  return {
    id: row.id,
    resumeText: row.resume_text,
    targetRole: row.target_role,
    jobDescription: row.job_description ?? undefined,
    candidateEmail: row.candidate_email ?? undefined,
    confirmedEmail: row.confirmed_email ?? undefined,
    emailConfirmedAt: row.email_confirmed_at ? toIso(row.email_confirmed_at) : undefined,
    atsScore: analysis?.atsScore ?? atsResult?.final_score ?? 0,
    atsResult,
    overallJudgment: analysis?.overallJudgment,
    currentSalary: analysis?.currentSalary ?? '未知',
    topSalary: analysis?.topSalary ?? '未知',
    topCompanies: analysis?.topCompanies ?? [],
    competition,
    mentorAdvice,
    optimizedResume: row.optimized_resume ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  }
}

async function insertAiJob(
  client: PoolClient,
  userId: string,
  artifactId: string,
  kind: AiJobKind,
  input: unknown
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      insert into ai.jobs
        (user_id, artifact_id, kind, status, progress_stage, input_hash, input_payload)
      values ($1, $2, $3, 'queued', $4, $5, $6)
      returning id
    `,
    [
      userId,
      artifactId,
      kind,
      'queued',
      hashInput(input),
      JSON.stringify(input),
    ]
  )
  return result.rows[0].id
}

export async function createAnalyzeArtifactAndJob(
  userId: string,
  input: AnalyzeRequest
): Promise<{ artifactId: string; jobId: string }> {
  return withTransaction(async (client) => {
    const artifact = await client.query<{ id: string }>(
      `
        insert into public.resume_artifacts
          (user_id, resume_text, target_role, job_description, candidate_email)
        values ($1, $2, $3, $4, $5)
        returning id
      `,
      [
        userId,
        input.resumeText,
        input.targetRole,
        input.jobDescription ?? null,
        input.candidateEmail ?? null,
      ]
    )
    const artifactId = artifact.rows[0].id
    const jobId = await insertAiJob(client, userId, artifactId, 'analyze', input)
    return { artifactId, jobId }
  })
}

export async function createOptimizeJob(
  userId: string,
  artifactId: string,
  input: { artifactId: string; adviceFeedback?: unknown }
): Promise<string> {
  return withTransaction(async (client) => {
    await assertArtifactOwner(client, userId, artifactId)
    return insertAiJob(client, userId, artifactId, 'optimize', input)
  })
}

async function assertArtifactOwner(
  client: PoolClient,
  userId: string,
  artifactId: string
): Promise<void> {
  const result = await client.query(
    `select 1 from public.resume_artifacts where id = $1 and user_id = $2`,
    [artifactId, userId]
  )
  if (result.rowCount !== 1) throw new Error('artifact_not_found')
}

export async function getArtifactForUser(
  userId: string,
  artifactId: string
): Promise<ResumeArtifactPayload | null> {
  const result = await query<ArtifactRow>(
    `
      select id, user_id, resume_text, target_role, job_description,
             candidate_email, confirmed_email, email_confirmed_at,
             ats_result, competition, mentor_advice, analysis_result,
             optimized_resume, created_at, updated_at
      from public.resume_artifacts
      where id = $1 and user_id = $2
    `,
    [artifactId, userId]
  )
  return result.rows[0] ? mapArtifact(result.rows[0]) : null
}

export async function getArtifactForWorker(
  artifactId: string
): Promise<ResumeArtifactPayload | null> {
  const result = await query<ArtifactRow>(
    `
      select id, user_id, resume_text, target_role, job_description,
             candidate_email, confirmed_email, email_confirmed_at,
             ats_result, competition, mentor_advice, analysis_result,
             optimized_resume, created_at, updated_at
      from public.resume_artifacts
      where id = $1
    `,
    [artifactId]
  )
  return result.rows[0] ? mapArtifact(result.rows[0]) : null
}

export async function saveAnalyzeResult(
  artifactId: string,
  result: AnalyzeResultPayload
): Promise<void> {
  await query(
    `
      update public.resume_artifacts
      set ats_result = $2,
          competition = $3,
          mentor_advice = $4,
          analysis_result = $5
      where id = $1
    `,
    [
      artifactId,
      JSON.stringify(result.atsResult ?? null),
      JSON.stringify(result.competition),
      JSON.stringify(result.mentorAdvice),
      JSON.stringify(result),
    ]
  )
}

export async function saveOptimizedResume(
  artifactId: string,
  optimizedResume: string
): Promise<void> {
  await query(
    `update public.resume_artifacts set optimized_resume = $2 where id = $1`,
    [artifactId, optimizedResume]
  )
}

export async function confirmArtifactEmailForUser(input: {
  userId: string
  artifactId: string
  email: string
}): Promise<void> {
  const result = await query(
    `
      update public.resume_artifacts
      set confirmed_email = $3,
          email_confirmed_at = now()
      where id = $1 and user_id = $2
    `,
    [input.artifactId, input.userId, input.email.toLowerCase()]
  )
  if (result.rowCount !== 1) throw new Error('artifact_not_found')
}

export async function getJobForUser(
  userId: string,
  jobId: string
): Promise<AiJobRecord | null> {
  const result = await query<JobRow>(
    `
      select id, user_id, artifact_id, kind, status, progress_stage, input_payload,
             result, error_code, error_message, created_at, updated_at
      from ai.jobs
      where id = $1 and user_id = $2
    `,
    [jobId, userId]
  )
  return result.rows[0] ? mapJob(result.rows[0]) : null
}

export async function getJobForWorker(jobId: string): Promise<AiJobRecord | null> {
  const result = await query<JobRow>(
    `
      select id, user_id, artifact_id, kind, status, progress_stage, input_payload,
             result, error_code, error_message, created_at, updated_at
      from ai.jobs
      where id = $1
    `,
    [jobId]
  )
  return result.rows[0] ? mapJob(result.rows[0]) : null
}

export async function markJobRunning(jobId: string, progressStage: string): Promise<void> {
  await query(
    `
      update ai.jobs
      set status = 'running',
          progress_stage = $2,
          heartbeat_at = now(),
          error_code = null,
          error_message = null
      where id = $1
    `,
    [jobId, progressStage]
  )
}

export async function heartbeatJob(jobId: string, progressStage?: string): Promise<void> {
  await query(
    `
      update ai.jobs
      set heartbeat_at = now(),
          progress_stage = coalesce($2, progress_stage)
      where id = $1 and status = 'running'
    `,
    [jobId, progressStage ?? null]
  )
}

export async function completeJob(
  jobId: string,
  progressStage: string,
  result: unknown
): Promise<void> {
  await query(
    `
      update ai.jobs
      set status = 'succeeded',
          progress_stage = $2,
          result = $3,
          heartbeat_at = now(),
          error_code = null,
          error_message = null
      where id = $1
    `,
    [jobId, progressStage, JSON.stringify(result)]
  )
}

export async function failJob(
  jobId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> {
  await query(
    `
      update ai.jobs
      set status = 'failed',
          progress_stage = 'failed',
          error_code = $2,
          error_message = $3,
          heartbeat_at = now()
      where id = $1
    `,
    [jobId, errorCode, errorMessage]
  )
}

export async function resetStaleRunningJobs(staleMinutes = 10): Promise<string[]> {
  const result = await query<{ id: string }>(
    `
      update ai.jobs
      set status = 'queued',
          progress_stage = 'queued',
          heartbeat_at = null
      where status = 'running'
        and heartbeat_at < now() - ($1::text || ' minutes')::interval
      returning id
    `,
    [String(staleMinutes)]
  )
  return result.rows.map((row) => row.id)
}

export async function getActiveEntitlements(userId: string): Promise<ProductTier[]> {
  const result = await query<{ product_tier: ProductTier }>(
    `
      select product_tier
      from billing.entitlements
      where user_id = $1
        and active = true
        and (expires_at is null or expires_at > now())
    `,
    [userId]
  )
  const expanded = new Set<ProductTier>()
  for (const row of result.rows) {
    TIERS_FOR_PRODUCT[row.product_tier].forEach((tier) => expanded.add(tier))
  }
  return [...expanded]
}

export async function hasActiveEntitlement(
  userId: string,
  productTier: ProductTier
): Promise<boolean> {
  const entitlements = await getActiveEntitlements(userId)
  return entitlements.includes(productTier)
}

export async function createPendingOrder(input: {
  userId: string
  artifactId?: string | null
  productTier: ProductTier
  amount?: number | null
  currency?: string | null
}): Promise<string> {
  const result = await query<{ id: string }>(
    `
      insert into billing.orders
        (user_id, artifact_id, product_tier, status, amount, currency)
      values ($1, $2, $3, 'pending', $4, $5)
      returning id
    `,
    [
      input.userId,
      input.artifactId ?? null,
      input.productTier,
      input.amount ?? null,
      input.currency ?? null,
    ]
  )
  return result.rows[0].id
}

export async function attachCheckoutSessionToOrder(input: {
  orderId: string
  checkoutSessionId: string
}): Promise<void> {
  await query(
    `
      update billing.orders
      set stripe_checkout_session_id = $2
      where id = $1
    `,
    [input.orderId, input.checkoutSessionId]
  )
}

export async function markOrderPaidAndGrantEntitlements(input: {
  checkoutSessionId: string
  orderId?: string | null
  paymentIntentId: string | null
  amount: number | null
  currency: string | null
}): Promise<{ orderId: string; userId: string; productTier: ProductTier } | null> {
  return withTransaction(async (client) => {
    const orderResult = await client.query<{
      id: string
      user_id: string
      product_tier: ProductTier
    }>(
      `
        update billing.orders
        set status = 'paid',
            stripe_checkout_session_id = coalesce(stripe_checkout_session_id, $1),
            stripe_payment_intent_id = coalesce($2, stripe_payment_intent_id),
            amount = coalesce($3, amount),
            currency = coalesce($4, currency)
        where stripe_checkout_session_id = $1
           or id = $5
        returning id, user_id, product_tier
      `,
      [
        input.checkoutSessionId,
        input.paymentIntentId,
        input.amount,
        input.currency,
        input.orderId ?? null,
      ]
    )

    const order = orderResult.rows[0]
    if (!order) return null

    for (const tier of TIERS_FOR_PRODUCT[order.product_tier]) {
      await client.query(
        `
          insert into billing.entitlements (user_id, product_tier, source_order_id, active)
          values ($1, $2, $3, true)
          on conflict (source_order_id, product_tier)
          do update set active = true
        `,
        [order.user_id, tier, order.id]
      )
    }

    return {
      orderId: order.id,
      userId: order.user_id,
      productTier: order.product_tier,
    }
  })
}

export async function markOrderCanceled(checkoutSessionId: string): Promise<void> {
  await query(
    `
      update billing.orders
      set status = 'canceled'
      where stripe_checkout_session_id = $1 and status = 'pending'
    `,
    [checkoutSessionId]
  )
}

export async function insertStripeEvent(id: string, type: string): Promise<boolean> {
  const result = await query(
    `
      insert into billing.stripe_events (id, type)
      values ($1, $2)
      on conflict (id) do nothing
    `,
    [id, type]
  )
  return result.rowCount === 1
}

export async function markStripeEventProcessed(id: string, error?: string): Promise<void> {
  await query(
    `
      update billing.stripe_events
      set processed_at = now(),
          error = $2
      where id = $1
    `,
    [id, error ?? null]
  )
}

export function buildOptimizeInputFromArtifact(
  artifact: ResumeArtifactPayload,
  adviceFeedback?: OptimizeResumeRequest['adviceFeedback']
): OptimizeResumeRequest {
  return {
    resumeText: artifact.resumeText,
    targetRole: artifact.targetRole,
    jobDescription: artifact.jobDescription,
    mentorAdvice: artifact.mentorAdvice,
    adviceFeedback,
  }
}
