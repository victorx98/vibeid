import { NextRequest } from 'next/server'
import { callClaude } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const { bullet, targetRole } = await request.json() as {
      bullet: string
      targetRole: string
    }

    if (!bullet || !targetRole) {
      return Response.json({ error: 'Missing fields' }, { status: 400 })
    }

    const optimized = await callClaude(
      '你是一位简历优化专家。只输出优化后的一条 bullet point，不要任何解释。',
      `目标岗位: ${targetRole}

原始 bullet:
${bullet.slice(0, 300)}

用 STAR 法则改写这条 bullet，要求：
1. 量化成果（加入数据/百分比/金额）
2. 添加与目标岗位相关的行业关键词
3. 动词开头，简洁有力
4. 不超过2行
5. 英文简历用英文改写，中文简历用中文改写
6. 只输出改写后的文字，不要任何前缀或解释`,
      0,
      { model: 'claude-haiku-4-5-20251001', maxTokens: 256 }
    )

    // Clean up: remove bullet prefix, quotes, etc.
    const cleaned = optimized
      .replace(/^[-•*]\s*/, '')
      .replace(/^[""]|[""]$/g, '')
      .trim()

    return Response.json({ optimized: cleaned })
  } catch (error) {
    console.error('Preview optimize error:', error)
    return Response.json({ error: 'Failed' }, { status: 500 })
  }
}
