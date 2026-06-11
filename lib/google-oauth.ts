/** Chrome extension OAuth redirect: https://<32 lowercase a-p>.chromiumapp.org/... */
const CHROMIUMAPP_REDIRECT_RE = /^https:\/\/[a-p]{32}\.chromiumapp\.org\//

export function isAllowedOAuthRedirect(
  redirectTo: string,
  allowedPrefix: string | null | undefined
): boolean {
  if (CHROMIUMAPP_REDIRECT_RE.test(redirectTo)) return true
  if (allowedPrefix && redirectTo.startsWith(allowedPrefix)) return true
  return false
}

export function buildGoogleAuthorizeUrl(supabaseUrl: string, redirectTo: string): string {
  const base = supabaseUrl.replace(/\/+$/, '')
  return `${base}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`
}
