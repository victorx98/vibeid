import { describe, expect, it } from 'vitest'

import { extractCandidateEmail } from './email'

describe('email helpers', () => {
  it('extracts and normalizes the first candidate email', () => {
    expect(extractCandidateEmail('Contact: DUKE.ZHENG+jobs@Example.edu')).toBe(
      'duke.zheng+jobs@example.edu'
    )
  })

  it('returns null when no email is present', () => {
    expect(extractCandidateEmail('no direct contact listed')).toBeNull()
  })
})
