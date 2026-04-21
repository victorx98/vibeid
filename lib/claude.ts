import Anthropic from '@anthropic-ai/sdk'
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  InternalServerError,
  RateLimitError,
} from '@anthropic-ai/sdk/error'

import { logError } from '@/lib/logger'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (client) return client

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  client = new Anthropic({ apiKey })
  return client
}

function isRetryableClaudeError(error: unknown): boolean {
  return (
    error instanceof RateLimitError ||
    error instanceof InternalServerError ||
    error instanceof APIConnectionError ||
    error instanceof APIConnectionTimeoutError
  )
}

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  temperature = 1,
  options?: {
    model?: string
    maxTokens?: number
    cacheSystem?: boolean
    timeoutMs?: number
    maxRetries?: number
  }
): Promise<string> {
  const model = options?.model || 'claude-sonnet-4-20250514'
  const timeoutMs = options?.timeoutMs ?? 60_000

  const systemContent: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: systemPrompt,
      ...(options?.cacheSystem
        ? { cache_control: { type: 'ephemeral' as const } }
        : {}),
    },
  ]

  try {
    const message = await getClient().messages.create(
      {
        model,
        max_tokens: options?.maxTokens || 8192,
        temperature,
        system: systemContent,
        messages: [{ role: 'user', content: userPrompt }],
      },
      {
        maxRetries: options?.maxRetries ?? 2,
        timeout: timeoutMs,
        signal: AbortSignal.timeout(timeoutMs + 1_000),
      }
    )

    const block = message.content[0]
    if (block.type === 'text') return block.text

    throw new Error('Unexpected Claude response type')
  } catch (error) {
    logError('claude_call_failed', error, {
      model,
      timeoutMs,
      retryable: isRetryableClaudeError(error),
      maxTokens: options?.maxTokens ?? 8192,
    })

    if (error instanceof APIError) {
      throw error
    }

    throw new Error('Claude request failed')
  }
}
