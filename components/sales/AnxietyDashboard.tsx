'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { ATSResult, CompetitionEstimate } from '@/lib/types'

function AnimatedNumber({ target, duration = 1000 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      setValue(Math.round(target * progress))
      if (progress >= 1) clearInterval(timer)
    }, 16)
    return () => clearInterval(timer)
  }, [inView, target, duration])

  return <span ref={ref}>{value.toLocaleString()}</span>
}

function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const color = score < 60 ? '#ef4444' : score < 70 ? '#f97316' : score < 75 ? '#eab308' : '#22c55e'
  const r = (size - 16) / 2
  const circumference = 2 * Math.PI * r

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (score / 100) * circumference }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ strokeDasharray: circumference }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          <AnimatedNumber target={score} duration={1200} />
        </span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

// NEW 5-dimension bar for new ATS system
function DimensionBar({ label, score, maxScore = 20 }: { label: string; score: number; maxScore?: number }) {
  const percentage = (score / maxScore) * 100
  const color = percentage < 50 ? '#ef4444' : percentage < 70 ? '#f97316' : percentage < 85 ? '#eab308' : '#22c55e'
  const scoreColor = percentage < 50 ? 'text-red-500' : percentage < 70 ? 'text-orange-500' : percentage < 85 ? 'text-yellow-600' : 'text-green-600'

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className={`font-bold text-sm ${scoreColor}`}>{score}<span className="text-gray-400 font-normal text-xs">/{maxScore}</span></span>
      </div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  )
}

// Risk level badge
function RiskBadge({ level }: { level?: string }) {
  const normalizedLevel = (level || '').toLowerCase().replace(/[^\w]/g, '')
  const isHigh = normalizedLevel.includes('高') || normalizedLevel.includes('high')
  const isMid = normalizedLevel.includes('中') || normalizedLevel.includes('mid')

  return (
    <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
      isHigh ? 'bg-red-100 text-red-600' :
      isMid ? 'bg-orange-100 text-orange-600' :
      'bg-green-100 text-green-600'
    }`}>
      {isHigh ? '高风险' : isMid ? '中风险' : '低风险'}
    </span>
  )
}

interface DashboardProps {
  atsScore: number
  atsResult?: ATSResult
  currentSalary: string
  topSalary: string
  topCompanies: string[]
  competition: CompetitionEstimate
}

export default function AnxietyDashboard({ atsScore, atsResult, currentSalary, topSalary, topCompanies, competition }: DashboardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false)

  const acceptRate = competition ? (2 / competition.estimated_applicants) * 100 : 0
  const acceptRateStr = acceptRate < 0.1 ? acceptRate.toFixed(2) : acceptRate < 1 ? acceptRate.toFixed(1) : acceptRate.toFixed(0)
  const acceptRateColor = acceptRate < 1 ? 'text-red-500' : acceptRate < 3 ? 'text-orange-500' : 'text-yellow-600'

  const statusLabel = atsScore >= 75 ? '通过 — 有竞争力' : atsScore >= 70 ? '勉强通过' : atsScore >= 60 ? '未达标 — 需优化' : '不通过 — 需大幅修改'
  const statusColor = atsScore >= 75 ? 'text-green-600' : atsScore >= 70 ? 'text-yellow-600' : 'text-red-600'

  // Try to use new format, fallback to old format
  const hasNewFormat = atsResult?.dimension_scores !== undefined
  const hasOldFormat = atsResult?.scores !== undefined

  return (
    <div className="space-y-4 max-w-4xl mx-auto px-4">
      {/* Row 1: ATS Score + Salary + Competitors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ATS Score Card — with inline dimension breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
        >
          {/* Score ring + status */}
          <div className="text-center">
            <div className="mx-auto w-fit">
              <ScoreRing score={atsScore} />
            </div>
            <p className="mt-2 text-sm text-gray-500">ATS 通过率评分</p>
            <p className={`text-sm font-semibold ${statusColor}`}>{statusLabel}</p>

            {/* Risk level and JD context */}
            {hasNewFormat && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-2 items-center">
                <RiskBadge level={atsResult?.risk_level} />
                {atsResult?.scoring_context && (
                  <p className="text-xs text-gray-400">{atsResult.scoring_context}</p>
                )}
              </div>
            )}
          </div>

          {/* Credibility line + detail toggle */}
          <div className="mt-4 pt-3 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">基于 Workday / Greenhouse / Taleo 三大系统模拟分析</p>
            {atsResult && (
              <button
                onClick={() => setShowBreakdown(v => !v)}
                className="mt-2 text-xs font-medium transition-colors" style={{ color: '#2A6041' }}
              >
                {showBreakdown ? '收起评分详情 ▴' : '查看评分详情 ▾'}
              </button>
            )}
          </div>
        </motion.div>

        {/* Salary Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 shadow-sm text-center flex flex-col justify-center" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
        >
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1">当前简历水平</p>
              <div className="text-xl font-bold text-gray-400 line-through decoration-red-400">{currentSalary}</div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium shrink-0" style={{ color: '#2A6041' }}>优化后可冲击 ↑</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-500">{topSalary}</div>
              <p className="text-xs text-gray-400 mt-1.5">
                {(topCompanies || []).join(' · ')}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Competition Estimate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm text-center flex flex-col justify-center" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
        >
          {competition ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold" style={{ color: '#2A6041' }}>
                <AnimatedNumber target={competition.estimated_applicants} duration={1500} />
              </div>
              <p className="text-sm text-gray-500">预估竞争人数</p>
              <p className="text-xs text-gray-400">{competition.applicant_range} 人</p>
              <div className="flex items-center justify-center gap-2 mt-1">
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                  competition.competition_tag === '极度激烈' ? 'bg-red-100 text-red-600' :
                  competition.competition_tag === '非常激烈' ? 'bg-orange-100 text-orange-600' :
                  competition.competition_tag === '激烈' ? 'bg-yellow-100 text-yellow-700' :
                  competition.competition_tag === '中等竞争' ? 'bg-blue-100 text-blue-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {competition.competition_tag}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400">录取预估率</p>
                <p className={`text-lg font-bold ${acceptRateColor}`}>
                  {acceptRateStr}%
                </p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400">计算中...</div>
          )}
        </motion.div>
      </div>

      {/* Row 2: ATS Breakdown (if available, toggled) — NEW 5-dimension format */}
      <AnimatePresence>
      {atsResult && showBreakdown && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
        <div className="bg-white rounded-2xl p-6 shadow-sm" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}>
          {/* NEW 5-Dimension bars */}
          {hasNewFormat && atsResult.dimension_scores && (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-4">评分维度（共 100 分）</p>
              <div className="space-y-3 mb-5">
                <DimensionBar label="A. 解析与格式兼容性" score={atsResult.dimension_scores.A_format_parsing} maxScore={20} />
                <DimensionBar label="B. 信息完整性与结构组织" score={atsResult.dimension_scores.B_info_completeness} maxScore={20} />
                <DimensionBar label="C. 内容质量与成果表达" score={atsResult.dimension_scores.C_content_quality} maxScore={35} />
                <DimensionBar label="D. 岗位关键词与匹配性" score={atsResult.dimension_scores.D_keyword_matching} maxScore={15} />
                <DimensionBar label="E. 最终投递完成度" score={atsResult.dimension_scores.E_delivery_readiness} maxScore={10} />
              </div>
            </>
          )}

          {/* LEGACY 4-Dimension bars (fallback) */}
          {!hasNewFormat && hasOldFormat && atsResult.scores && (
            <>
              <p className="text-sm font-semibold text-gray-700 mb-4">评分维度（共 100 分）</p>
              <div className="space-y-3 mb-5">
                <DimensionBar label="关键词匹配" score={atsResult.scores.keyword_match.raw} maxScore={100} />
                <DimensionBar label="技能匹配" score={atsResult.scores.skills_match.raw} maxScore={100} />
                <DimensionBar label="格式合规" score={atsResult.scores.format_compliance.raw} maxScore={100} />
                <DimensionBar label="经历匹配" score={atsResult.scores.experience_match.raw} maxScore={100} />
              </div>
            </>
          )}

          {/* Top Issues */}
          {atsResult.top_issues && atsResult.top_issues.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">关键问题</p>
              <ul className="space-y-2.5">
                {atsResult.top_issues.slice(0, 4).map((issue, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs">
                    <span className={`shrink-0 px-2 py-1 rounded text-white font-medium ${
                      issue.severity === 'high' ? 'bg-red-500' : issue.severity === 'medium' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}>
                      {issue.severity === 'high' ? '高' : issue.severity === 'medium' ? '中' : '低'}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium">{issue.issue}</p>
                      <p className="text-gray-500 mt-1">{issue.impact}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Priority Improvements */}
          {atsResult.priority_improvements && atsResult.priority_improvements.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-green-700 mb-3">优先改进建议</p>
              <ul className="space-y-2.5">
                {atsResult.priority_improvements.slice(0, 3).map((imp, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs">
                    <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 font-semibold text-xs">
                      {imp.rank}
                    </span>
                    <div className="flex-1">
                      <p className="text-gray-700 font-medium">{imp.action}</p>
                      <p className="text-gray-500 mt-1">{imp.expected_gain}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Score Improvement Range */}
          {atsResult.score_improvement_range && (
            <div className="mt-4 pt-4 border-t border-gray-100 bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <span className="font-semibold">📈 提分预期：</span> {atsResult.score_improvement_range}
              </p>
            </div>
          )}

          {/* Strengths */}
          {atsResult.strengths && atsResult.strengths.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-semibold text-green-700 mb-2">✓ 简历亮点</p>
              <ul className="flex flex-wrap gap-2">
                {atsResult.strengths.map((str, i) => (
                  <li key={i} className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg">
                    {str}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  )
}
