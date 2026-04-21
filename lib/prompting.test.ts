import { describe, expect, it } from 'vitest'

import { normalizeUserContent, toPromptBlock, toPromptLine } from './prompting'

describe('prompting helpers', () => {
  it('normalizes line endings and strips control characters', () => {
    expect(normalizeUserContent('hello\r\nworld\u0000')).toBe('hello\nworld')
  })

  it('wraps user content in prompt blocks and truncates safely', () => {
    expect(toPromptBlock('resume_text', 'abcdef', 4)).toBe(
      '<resume_text>\nabcd\n</resume_text>'
    )
  })

  it('converts prompt lines to single-line text', () => {
    expect(toPromptLine('  data\n analyst  ', 50)).toBe('data analyst')
  })
})
