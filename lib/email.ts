const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

export function extractCandidateEmail(text: string): string | null {
  const match = text.match(EMAIL_PATTERN)
  return match?.[0].trim().toLowerCase() ?? null
}
