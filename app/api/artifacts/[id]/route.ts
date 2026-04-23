import { NextRequest } from 'next/server'

import {
  getActiveEntitlements,
  getArtifactForUser,
} from '@/lib/backend-store'
import { databaseConfigured } from '@/lib/db'
import {
  readEntitlementCookie,
  verifyEntitlementToken,
} from '@/lib/entitlements'
import type { ProductTier } from '@/lib/product-tiers'
import { isProductTier } from '@/lib/product-tiers'
import { getAuthenticatedUser } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status })
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return json(503, { error: '登录系统未配置，暂时无法读取分析结果' })
  }
  if (auth.error || !auth.user) {
    return json(401, { error: '请先登录后再查看分析结果' })
  }

  if (!databaseConfigured()) {
    return json(503, { error: '分析结果存储未配置，请稍后再试' })
  }

  const { id } = await context.params
  const requiredTierParam = request.nextUrl.searchParams.get('requiredTier')
  const requiredTier: ProductTier | null = isProductTier(requiredTierParam)
    ? requiredTierParam
    : null

  const artifact = await getArtifactForUser(auth.user.id, id)
  if (!artifact) {
    return json(404, { error: '未找到对应的简历分析记录' })
  }

  const dbEntitlements = await getActiveEntitlements(auth.user.id)
  const entitlementSet = new Set<ProductTier>(dbEntitlements)

  for (const tier of ['basic', 'resume'] as const) {
    const legacy = verifyEntitlementToken(readEntitlementCookie(request), tier)
    if (legacy.valid) entitlementSet.add(tier)
  }

  if (requiredTier && !entitlementSet.has(requiredTier)) {
    return json(402, { error: '请先完成购买后再查看该页面' })
  }

  const canReadOptimizedResume = entitlementSet.has('resume')
  return Response.json({
    artifact: {
      ...artifact,
      optimizedResume: canReadOptimizedResume ? artifact.optimizedResume : undefined,
    },
    entitlements: [...entitlementSet],
  })
}
