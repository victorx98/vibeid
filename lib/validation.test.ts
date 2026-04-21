import { Buffer } from 'node:buffer'

import { describe, expect, it } from 'vitest'

import {
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
})
