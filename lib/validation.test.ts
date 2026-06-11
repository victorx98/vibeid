import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import {
  analyzeRequestSchema,
  checkoutRequestSchema,
  getResumeUploadKind,
  hasExpectedFileSignature,
  isAllowedResumeMime,
  isSupportedResumeUploadKind,
} from './validation'

describe('validation helpers', () => {
  it('detects supported resume upload kinds', () => {
    expect(getResumeUploadKind('resume.pdf')).toBe('pdf')
    expect(getResumeUploadKind('resume.docx')).toBe('docx')
    expect(getResumeUploadKind('resume.doc')).toBe('doc')
    expect(getResumeUploadKind('resume.txt')).toBeNull()
  })

  it('marks legacy doc as unsupported', () => {
    expect(isSupportedResumeUploadKind('pdf')).toBe(true)
    expect(isSupportedResumeUploadKind('docx')).toBe(true)
    expect(isSupportedResumeUploadKind('doc')).toBe(false)
  })

  it('validates expected MIME types and signatures', () => {
    expect(isAllowedResumeMime('pdf', 'application/pdf')).toBe(true)
    expect(isAllowedResumeMime('docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true)
    expect(hasExpectedFileSignature('pdf', Buffer.from('%PDF-1.7'))).toBe(true)
    expect(hasExpectedFileSignature('docx', Buffer.from('504b0304', 'hex'))).toBe(true)
  })

  it('normalizes legacy resume checkout tier to premium', () => {
    expect(checkoutRequestSchema.parse({ productTier: 'resume' })).toEqual({
      productTier: 'premium',
    })
    expect(checkoutRequestSchema.parse({})).toEqual({ productTier: 'premium' })
  })

  it('accepts the extension id for Stripe cancel redirects', () => {
    expect(
      checkoutRequestSchema.parse({
        productTier: 'basic',
        extensionId: 'abcdefghijklmnopabcdefghijklmnop',
      })
    ).toEqual({
      productTier: 'basic',
      extensionId: 'abcdefghijklmnopabcdefghijklmnop',
    })
  })

  it('normalizes optional candidate email on analyze requests', () => {
    const parsed = analyzeRequestSchema.parse({
      resumeText: 'Experienced analyst with project history',
      targetRole: 'Data Analyst',
      candidateEmail: '  DUKE@example.com  ',
    })
    expect(parsed.candidateEmail).toBe('DUKE@example.com')
  })
})
