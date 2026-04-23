'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { getCurrentArtifactId } from '@/lib/client-artifacts'
import { getEnrichedSkills, getMissingSkills } from '@/lib/skillGap'

interface Props {
  targetRole: string
  resumeText: string
  jobDescription?: string
}

export default function SkillGapCTA({ targetRole, resumeText, jobDescription }: Props) {
  const router = useRouter()

  const missing = useMemo(
    () => getMissingSkills(getEnrichedSkills(targetRole, resumeText, jobDescription), 5),
    [targetRole, resumeText, jobDescription]
  )

  if (missing.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: '#0E2620' }}
    >
      {/* Header */}
      <div className="px-6 pt-5 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C6E04B' }}>
            技能缺口提醒
          </span>
        </div>
        <h3 className="text-lg font-bold text-white">
          简历已优化，但这 {missing.length} 项技能缺口仍是竞争短板
        </h3>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
          ATS 通过只是第一关。HR 面试时会直接考察这些技能——没有真实项目证明，机会仍会流失。
        </p>
      </div>

      {/* Missing skill chips */}
      <div className="px-6 pb-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {missing.map(skill => (
            <div
              key={skill.nameEn}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ backgroundColor: '#1A3D32', border: '1px solid #2D5A47' }}
            >
              <span className="text-xs font-bold" style={{ color: '#F87171' }}>✕</span>
              <span className="text-sm font-medium text-white">{skill.name}</span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: 'rgba(248,113,113,0.15)', color: '#F87171' }}
              >
                {skill.marketDemand}% JDs
              </span>
              {skill.trend === 'rising' && (
                <span className="text-xs font-bold" style={{ color: '#34D399' }}>↑热门</span>
              )}
            </div>
          ))}
        </div>

        {/* CTA strip */}
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ backgroundColor: 'rgba(198,224,75,0.08)', border: '1px solid rgba(198,224,75,0.25)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: '#C6E04B' }}>
              用 AI 实战项目系统性补齐技能缺口
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
              真实项目 + Vibe ID 深度链接，让 AI 和 HR 都能验证你的能力
            </p>
          </div>
          <button
            onClick={() => {
              const artifactId = getCurrentArtifactId()
              router.push(artifactId ? `/vibe-id?artifactId=${artifactId}` : '/vibe-id')
            }}
            className="flex-shrink-0 text-sm font-bold px-5 py-2.5 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
          >
            查看推荐项目 →
          </button>
        </div>
      </div>
    </motion.div>
  )
}
