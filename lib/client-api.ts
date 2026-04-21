export async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: unknown }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error
    }
  } catch {
    return fallbackMessage
  }

  return fallbackMessage
}
