import { Buffer } from 'node:buffer'
import { z } from 'zod'

import {
  MAX_BULLET_CHARS,
  MAX_JOB_DESCRIPTION_CHARS,
  MAX_RESUME_TEXT_CHARS,
  MAX_RESUME_UPLOAD_BYTES,
  MAX_TARGET_ROLE_CHARS,
} from './constants'

export {
  MAX_BULLET_CHARS,
  MAX_JOB_DESCRIPTION_CHARS,
  MAX_RESUME_TEXT_CHARS,
  MAX_RESUME_UPLOAD_BYTES,
  MAX_TARGET_ROLE_CHARS,
}

export type ResumeUploadKind = 'pdf' | 'docx' | 'doc'

const optionalTrimmedString = (maxChars: number) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const trimmed = value.trim()
      return trimmed === '' ? undefined : trimmed
    },
    z.string().max(maxChars).optional()
  )

const requiredTrimmedString = (minChars: number, maxChars: number) =>
  z
    .string()
    .trim()
    .min(minChars)
    .max(maxChars)

const mentorAdviceItemSchema = z.object({
  priority: requiredTrimmedString(1, 40),
  problem: requiredTrimmedString(1, 2_000),
  mentorPerspective: requiredTrimmedString(1, 3_000),
  studentStatus: optionalTrimmedString(2_000).default(''),
  suggestion: requiredTrimmedString(1, 3_000),
  example: optionalTrimmedString(2_000),
})

const mentorAdviceSchema = z.object({
  id: requiredTrimmedString(1, 64),
  mentorName: requiredTrimmedString(1, 120),
  company: requiredTrimmedString(1, 120),
  advice: z.array(mentorAdviceItemSchema).max(20),
  isLocked: z.boolean(),
})

const adviceFeedbackSchema = z.record(
  z.string(),
  z.object({
    accepted: z.boolean().nullable().optional(),
    helpful: z.boolean().nullable().optional(),
  })
)

export const analyzeRequestSchema = z.object({
  resumeText: requiredTrimmedString(10, MAX_RESUME_TEXT_CHARS),
  targetRole: requiredTrimmedString(2, MAX_TARGET_ROLE_CHARS),
  jobDescription: optionalTrimmedString(MAX_JOB_DESCRIPTION_CHARS),
  candidateEmail: optionalTrimmedString(320).pipe(z.string().email().optional()),
})

export const optimizeResumeRequestSchema = z.object({
  resumeText: requiredTrimmedString(10, MAX_RESUME_TEXT_CHARS),
  targetRole: requiredTrimmedString(2, MAX_TARGET_ROLE_CHARS),
  jobDescription: optionalTrimmedString(MAX_JOB_DESCRIPTION_CHARS),
  mentorAdvice: z.array(mentorAdviceSchema).max(8),
  adviceFeedback: adviceFeedbackSchema.optional(),
})

export const optimizeResumeJobRequestSchema = z.object({
  artifactId: z.string().uuid(),
  adviceFeedback: adviceFeedbackSchema.optional(),
})

export const previewOptimizeRequestSchema = z.object({
  bullet: requiredTrimmedString(5, MAX_BULLET_CHARS),
  targetRole: requiredTrimmedString(2, MAX_TARGET_ROLE_CHARS),
})

/** Accepts legacy `resume` from older clients and normalizes to `premium`. */
export const checkoutProductTierSchema = z.preprocess(
  (value) => (value === 'resume' ? 'premium' : value),
  z.enum(['basic', 'premium']).default('premium')
)

const extensionIdSchema = z.string().regex(/^[a-p]{32}$/)

export const checkoutRequestSchema = z.object({
  productTier: checkoutProductTierSchema,
  extensionId: extensionIdSchema.optional(),
})

export const checkoutConfirmRequestSchema = z.object({
  productTier: checkoutProductTierSchema,
})

export const checkoutSessionRequestSchema = z.object({
  productTier: checkoutProductTierSchema,
  artifactId: z.string().uuid(),
})

export const confirmEmailRequestSchema = z.object({
  artifactId: z.string().uuid(),
  email: requiredTrimmedString(3, 320).pipe(z.string().email()),
})

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>
export type OptimizeResumeRequest = z.infer<typeof optimizeResumeRequestSchema>
export type OptimizeResumeJobRequest = z.infer<typeof optimizeResumeJobRequestSchema>
export type PreviewOptimizeRequest = z.infer<typeof previewOptimizeRequestSchema>
export type CheckoutConfirmRequest = z.infer<typeof checkoutConfirmRequestSchema>
export type CheckoutSessionRequest = z.infer<typeof checkoutSessionRequestSchema>
export type ConfirmEmailRequest = z.infer<typeof confirmEmailRequestSchema>

export function getResumeUploadKind(fileName: string): ResumeUploadKind | null {
  const lowerName = fileName.toLowerCase()
  if (lowerName.endsWith('.pdf')) return 'pdf'
  if (lowerName.endsWith('.docx')) return 'docx'
  if (lowerName.endsWith('.doc')) return 'doc'
  return null
}

export function isSupportedResumeUploadKind(kind: ResumeUploadKind): kind is Exclude<ResumeUploadKind, 'doc'> {
  return kind === 'pdf' || kind === 'docx'
}

export function isAllowedResumeMime(kind: Exclude<ResumeUploadKind, 'doc'>, mimeType: string): boolean {
  if (!mimeType || mimeType === 'application/octet-stream') return true

  if (kind === 'pdf') {
    return mimeType === 'application/pdf'
  }

  return mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}

export function hasExpectedFileSignature(kind: Exclude<ResumeUploadKind, 'doc'>, buffer: Buffer): boolean {
  if (kind === 'pdf') {
    return buffer.subarray(0, 5).toString('utf8') === '%PDF-'
  }

  const signature = buffer.subarray(0, 4)
  const zipSignatures = ['504b0304', '504b0506', '504b0708']
  return zipSignatures.includes(signature.toString('hex'))
}
