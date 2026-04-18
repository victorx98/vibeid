'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  SkillData, MatchStatus, EnrichedSkill,
  getEnrichedSkills, calcMatchPct,
} from '@/lib/skillGap'

// ─── Visual helpers ───────────────────────────────────────────────────────────

function trendArrow(trend: SkillData['trend'], rankChange: number) {
  if (trend === 'rising')    return { icon: '↑', color: '#34D399', label: `需求↑ 排名+${rankChange}` }
  if (trend === 'declining') return { icon: '↓', color: '#F87171', label: `需求↓ 排名${rankChange}` }
  return                            { icon: '→', color: '#9CA3AF', label: '需求稳定' }
}

function statusBadge(status: MatchStatus) {
  if (status === 'have')    return { icon: '✓', bg: 'rgba(52,211,153,0.15)',  text: '#34D399', label: '已具备' }
  if (status === 'partial') return { icon: '!', bg: 'rgba(251,191,36,0.15)',  text: '#FBBF24', label: '需强化' }
  return                           { icon: '✕', bg: 'rgba(248,113,113,0.15)', text: '#F87171', label: '缺失' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkillRow({ skill, index }: { skill: EnrichedSkill; index: number }) {
  const arrow = trendArrow(skill.trend, skill.rankChange)
  const badge = statusBadge(skill.status)

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      className="rounded-xl px-4 py-3"
      style={{ backgroundColor: '#1A3D32', border: '1px solid #2D5A47' }}
    >
      <div className="flex items-center gap-3">
        {/* Status icon */}
        <div
          className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
          style={{ width: 24, height: 24, backgroundColor: badge.bg, color: badge.text }}
        >
          {badge.icon}
        </div>

        {/* Skill name + demand bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-white truncate">{skill.name}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: badge.bg, color: badge.text }}
            >
              {badge.label}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${skill.marketDemand}%` }}
                transition={{ delay: index * 0.04 + 0.15, duration: 0.5, ease: 'easeOut' }}
                style={{
                  backgroundColor:
                    skill.status === 'have'    ? '#34D399' :
                    skill.status === 'partial' ? '#FBBF24' :
                    'rgba(255,255,255,0.25)',
                }}
              />
            </div>
            <span className="text-xs flex-shrink-0" style={{ color: 'rgba(255,255,255,0.4)', width: 32, textAlign: 'right' }}>
              {skill.marketDemand}%
            </span>
          </div>
        </div>

        {/* Trend */}
        <div className="flex-shrink-0 text-right">
          <span className="text-base font-bold" style={{ color: arrow.color }} title={arrow.label}>
            {arrow.icon}
          </span>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {skill.marketDemand}% JDs
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function SkillSection({ title, skills }: { title: string; skills: EnrichedSkill[] }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {title}
      </p>
      <div className="space-y-2">
        {skills.map((skill, i) => (
          <SkillRow key={skill.nameEn} skill={skill} index={i} />
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  targetRole: string
  resumeText: string
  jobDescription?: string
  /** compact = header + chips only; skill list hidden behind toggle */
  compact?: boolean
}

export default function SkillGapAnalysis({ targetRole, resumeText, jobDescription, compact = false }: Props) {
  const [expanded, setExpanded] = useState(false)

  const enriched = useMemo(() => getEnrichedSkills(targetRole, resumeText, jobDescription), [targetRole, resumeText, jobDescription])
  const matchPct  = useMemo(() => calcMatchPct(enriched), [enriched])

  const technical    = enriched.filter(s => s.category === 'technical')
  const soft         = enriched.filter(s => s.category === 'soft')
  const haveCount    = enriched.filter(s => s.status === 'have').length
  const partialCount = enriched.filter(s => s.status === 'partial').length
  const missingCount = enriched.filter(s => s.status === 'missing').length

  const matchColor =
    matchPct >= 70 ? '#34D399' :
    matchPct >= 45 ? '#FBBF24' :
    '#F87171'

  const showSkills = !compact || expanded

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: '#0E2620' }}>
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            {/* Credibility badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'rgba(198,224,75,0.15)', color: '#C6E04B' }}
              >
                📊 基于 15万+ 真实JD数据
              </span>
            </div>
            {/* Outcome-first headline */}
            <h2 className="text-xl font-bold text-white leading-snug">
              你还缺少&nbsp;
              <span style={{ color: '#F87171' }}>{missingCount} 项</span>
              &nbsp;{targetRole || '目标岗位'} 高频技能
            </h2>
            {/* The "so what" */}
            <p className="text-sm mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 380 }}>
              这些技能出现在 45–82% 的真实 JD 中。
              {compact
                ? ' 缺少它们，简历即使通过 ATS，面试仍会直接失分。'
                : ' 补齐缺口，才能在面试和薪资谈判中真正占据优势。'
              }
            </p>
          </div>

          {/* Match score ring */}
          <div className="flex flex-col items-center">
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 80, height: 80,
                background: `conic-gradient(${matchColor} ${matchPct}%, rgba(255,255,255,0.08) 0%)`,
                boxShadow: `0 0 0 4px #0E2620, 0 0 0 6px ${matchColor}33`,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full font-bold text-xl"
                style={{ width: 62, height: 62, backgroundColor: '#0E2620', color: matchColor }}
              >
                {matchPct}%
              </div>
            </div>
            <p className="text-xs mt-2 text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              岗位技能<br />匹配度
            </p>
          </div>
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {[
            { label: `✓ 已具备 ${haveCount} 项`,    color: '#34D399', bg: 'rgba(52,211,153,0.12)' },
            { label: `! 需强化 ${partialCount} 项`,  color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
            { label: `✕ 缺失 ${missingCount} 项`,   color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
          ].map(c => (
            <span key={c.label} className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: c.color, backgroundColor: c.bg }}>
              {c.label}
            </span>
          ))}
        </div>

        {/* Compact toggle */}
        {compact && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-5 text-sm font-bold flex items-center gap-2 transition-all hover:opacity-90"
            style={{
              color: '#0E2620',
              backgroundColor: '#C6E04B',
              padding: '8px 20px',
              borderRadius: '999px',
              letterSpacing: '0.02em',
            }}
          >
            {expanded ? '收起明细 ▴' : '查看明细 ▾'}
          </button>
        )}
      </div>

      {/* ── Skill list (always shown in full mode; toggle in compact) ── */}
      <AnimatePresence>
        {showSkills && (
          <motion.div
            key="skills"
            initial={compact ? { opacity: 0, height: 0 } : false}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6">
              <SkillSection title="🔧 技术技能" skills={technical} />
              <SkillSection title="💬 软技能"   skills={soft} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CTA for missing skills (full mode only) ── */}
      {missingCount > 0 && !compact && (
        <div
          className="mx-6 mb-6 rounded-xl px-5 py-4 flex items-center justify-between gap-4"
          style={{ backgroundColor: 'rgba(198,224,75,0.08)', border: '1px solid rgba(198,224,75,0.2)' }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: '#C6E04B' }}>
              你还缺少 {missingCount} 项高需求技能
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              匹配导师 + AI 实战项目，系统性补齐技能缺口
            </p>
          </div>
          <button
            className="text-sm font-semibold whitespace-nowrap px-4 py-2 rounded-lg transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
          >
            找导师补齐 →
          </button>
        </div>
      )}
    </div>
  )
}
