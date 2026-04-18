import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function callClaude(
  systemPrompt: string,
  userPrompt: string,
  temperature = 1,
  options?: {
    model?: string
    maxTokens?: number
    /** Cache the system prompt (ephemeral, 5-min TTL) — saves TTFT on repeated calls */
    cacheSystem?: boolean
  }
): Promise<string> {
  const systemContent: Anthropic.TextBlockParam[] = [{
    type: 'text',
    text: systemPrompt,
    ...(options?.cacheSystem ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }]

  const message = await client.messages.create({
    model: options?.model || 'claude-sonnet-4-20250514',
    max_tokens: options?.maxTokens || 8192,
    temperature,
    system: systemContent,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const block = message.content[0]
  if (block.type === 'text') return block.text
  throw new Error('Unexpected response type')
}

export default client
