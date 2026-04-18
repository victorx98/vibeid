import { ResumeSession } from './types'

const SESSION_KEY = 'resume_session'

export function getSession(): ResumeSession | null {
  if (typeof window === 'undefined') return null
  try {
    const data = sessionStorage.getItem(SESSION_KEY)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error('Session parse error:', e)
    return null
  }
}

export function setSession(session: ResumeSession): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch (e) {
    console.error('Session save error:', e)
  }
}

export function updateSession(updates: Partial<ResumeSession>): ResumeSession | null {
  const session = getSession()
  if (!session) return null
  const updated = { ...session, ...updates }
  setSession(updated)
  return updated
}
