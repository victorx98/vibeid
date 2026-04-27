/**
 * Next.js server instrumentation hook — runs once when a new server instance starts,
 * before any requests are handled. Used here for fail-fast config validation so that
 * missing env vars surface immediately in the terminal rather than mid-request.
 *
 * See: node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md
 */

export async function register() {
  // Only validate on the Node.js runtime; the Edge runtime does not have access
  // to the same set of server-side env vars and uses a different execution model.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertConfig } = await import('./lib/backend-config')
    assertConfig()
  }
}
