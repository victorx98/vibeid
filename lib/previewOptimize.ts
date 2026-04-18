export async function callPreviewOptimize(bullet: string, targetRole: string): Promise<string | null> {
  try {
    const res = await fetch('/api/preview-optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bullet, targetRole }),
    })
    if (!res.ok) return null
    const { optimized } = await res.json()
    return optimized || null
  } catch {
    return null
  }
}
