'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, AlertCircle, CheckCircle, ExternalLink, ArrowLeft, X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CustomerServiceButton from '@/components/shared/CustomerServiceButton'
import { getSession } from '@/lib/session'
import { publicVibeSampleEnabled } from '@/lib/runtime-config'
import { ResumeSession } from '@/lib/types'
import {
  getEnrichedSkills, getMissingSkills, calcMatchPct,
  PROJECT_SKILL_COVERAGE, EnrichedSkill,
} from '@/lib/skillGap'

const VIBE_ID_URL = 'https://vibeid.co/henry_zheng'
const EMBED_URL = publicVibeSampleEnabled ? '/vibe-id-sample/index.html' : null

const completionScore = 47

const completedSections = [
  { name: '教育经历', status: 'done' as const },
  { name: '工作经历', status: 'done' as const },
  { name: '个人总结', status: 'done' as const },
  { name: '技能专长', status: 'done' as const },
]

const missingSections = [
  {
    name: 'AI 实战项目',
    count: 0, target: 3,
    desc: '缺少具体AI实战项目展示，建议至少添加3个与目标岗位相关的AI项目案例',
  },
  {
    name: '岗位工作流交付案例',
    count: 0, target: 2,
    desc: '缺少岗位核心工作流的完整交付案例，建议展示端到端的项目成果',
  },
  {
    name: '作品集 / Demo',
    count: 0, target: 2,
    desc: 'ATS 2.0 主动爬取链接验证真实性——缺少作品集链接意味着你的能力无法被 AI 核实',
  },
]

interface AIProject {
  icon: string
  title: string
  subtitle: string
  desc: string
  skills: string[]
  duration: string
  deliverables: string
}

const aiProjects: AIProject[] = [
  {
    icon: '🎯',
    title: 'AI Marketing Agent',
    subtitle: '智能营销代理',
    desc: '构建端到端AI营销自动化系统：用户画像分析、内容生成、A/B测试优化。直接训练你在市场上最紧缺的 Data Analytics、A/B Testing、Marketing Automation 实战能力。',
    skills: ['LangChain', 'GPT-4 API', 'Data Analytics', 'A/B Testing'],
    duration: '6周',
    deliverables: '3个完整项目 + Vibe ID展示页',
  },
  {
    icon: '🎬',
    title: 'AI 视频生成 Agent',
    subtitle: '智能视频创作代理',
    desc: '掌握AI视频生成全流程：脚本生成→视频合成→发布。训练内容创意写作和多媒体内容管理能力，直接补强内容岗位核心技能。',
    skills: ['Stable Diffusion', 'RunwayML', 'ElevenLabs', 'FFmpeg'],
    duration: '6周',
    deliverables: '3个完整项目 + Vibe ID展示页',
  },
  {
    icon: '🔍',
    title: 'AI Research Agent',
    subtitle: '智能研究分析代理',
    desc: '构建自主研究分析Agent：自动信息检索、数据分析、报告生成。系统训练数据驱动决策、SQL数据查询、Python数据分析三项高需求技能。',
    skills: ['RAG', 'Vector DB', 'Multi-Agent', 'CrewAI'],
    duration: '6周',
    deliverables: '3个完整项目 + Vibe ID展示页',
  },
  {
    icon: '💬',
    title: 'AI Customer Service Agent',
    subtitle: '智能客服代理',
    desc: '打造企业级AI客服系统：意图识别、多轮对话、知识库管理。在真实跨部门协作和项目管理场景中锤炼软技能，证明你能独立交付。',
    skills: ['NLP', 'Dialog Flow', 'Sentiment Analysis', 'Knowledge Base'],
    duration: '6周',
    deliverables: '3个完整项目 + Vibe ID展示页',
  },
  {
    icon: '📊',
    title: 'AI Data Analytics Agent',
    subtitle: '智能数据分析代理',
    desc: '构建自动化数据分析管道：数据清洗、特征工程、可视化报告生成。一次性补齐 SQL、Python、Tableau 三项技术技能，是数据驱动岗位的核心配置。',
    skills: ['Pandas AI', 'SQL Agent', 'Visualization', 'AutoML'],
    duration: '6周',
    deliverables: '3个完整项目 + Vibe ID展示页',
  },
  {
    icon: '🤖',
    title: 'AI Workflow Automation Agent',
    subtitle: '智能工作流自动化代理',
    desc: '构建企业级工作流自动化系统，集成HubSpot、Salesforce、Email等工具。覆盖 Marketing Automation、CRM、项目管理三大技能，适合营销运营岗位。',
    skills: ['n8n', 'Make', 'API Integration', 'Agent SDK'],
    duration: '6周',
    deliverables: '3个完整项目 + Vibe ID展示页',
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function VibeIdPage() {
  const router = useRouter()
  const [session, setSession] = useState<ResumeSession | null>(null)
  const [copied, setCopied]             = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s || !s.unlockedTiers.includes('resume')) { router.push('/'); return }
    const frame = window.requestAnimationFrame(() => {
      setSession(s)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [router])

  // Compute missing skills from session
  const missingSkills: EnrichedSkill[] = useMemo(() => {
    if (!session) return []
    return getMissingSkills(getEnrichedSkills(session.targetRole, session.resumeText, session.jobDescription), 8)
  }, [session])

  const matchPct = useMemo(() => {
    if (!session) return 0
    return calcMatchPct(getEnrichedSkills(session.targetRole, session.resumeText, session.jobDescription))
  }, [session])

  // For each project, find how many of the user's missing skills it covers
  function getCoveredMissing(project: AIProject): string[] {
    const coverage = PROJECT_SKILL_COVERAGE[project.title] ?? []
    return missingSkills.filter(s => coverage.includes(s.name)).map(s => s.name)
  }

  const atsBase = session?.atsScore ?? 62

  const totalMissing = missingSkills.length
  // How many missing skills ALL 6 projects cover combined (deduplicated)
  const allCoveredSet = new Set<string>()
  aiProjects.forEach(p => getCoveredMissing(p).forEach(s => allCoveredSet.add(s)))
  const allCoveredCount = allCoveredSet.size
  const bundlePredictedATS = Math.min(Math.round(atsBase + allCoveredCount * 3), 95)

  function handleCopy() {
    navigator.clipboard.writeText(VIBE_ID_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!session) return null

  // Sort projects: those that cover the most missing skills first
  const sortedProjects = [...aiProjects].sort(
    (a, b) => getCoveredMissing(b).length - getCoveredMissing(a).length
  )

  return (
    <main className="flex-1 min-h-screen" style={{ backgroundColor: '#F7F5EF' }}>
      {/* Header */}
      <header
        className="bg-white sticky top-0 z-40 px-4"
        style={{ height: '60px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/upsale')}
              className="flex items-center gap-1 text-sm hover:opacity-70 transition-opacity"
              style={{ color: '#6B7280' }}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </button>
            <div className="w-px h-5" style={{ backgroundColor: '#E5E7EB' }} />
            <span className="font-bold text-lg" style={{ color: '#1A1A1A' }}>Vibe ID</span>
          </div>
          <a
            href={VIBE_ID_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: '#2A6041' }}
          >
            <ExternalLink className="w-4 h-4" />
            在新标签打开
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* URL bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 mb-6 flex items-center gap-3"
          style={{ border: '1px solid #E5E7EB' }}
        >
          <div
            className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-lg"
            style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}
          >
            <span className="text-sm" style={{ color: '#2A6041', fontWeight: 600 }}>🔗</span>
            <span className="text-sm font-medium flex-1 truncate" style={{ color: '#1A1A1A' }}>
              {VIBE_ID_URL}
            </span>
          </div>
          <Button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-white text-sm h-10 px-5 rounded-lg"
            style={{ backgroundColor: copied ? '#16a34a' : '#2A6041' }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? '已复制' : '复制链接'}
          </Button>
        </motion.div>

        {/* Main content: iframe + completion badge */}
        <div className="flex gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 bg-white rounded-2xl overflow-hidden"
            style={{ border: '1px solid #E5E7EB' }}
          >
            <div
              className="px-4 py-2.5 flex items-center gap-2"
              style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}
            >
              <div className="flex gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FCA5A5' }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FDE68A' }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#86EFAC' }} />
              </div>
              <span className="text-xs truncate" style={{ color: '#9CA3AF' }}>{VIBE_ID_URL}</span>
            </div>
            <div style={{ height: '600px', overflow: 'hidden' }}>
              {EMBED_URL ? (
                <iframe src={EMBED_URL} className="w-full h-full" style={{ border: 'none' }} title="Vibe ID Preview" />
              ) : (
                <div className="flex h-full items-center justify-center bg-neutral-50 px-8 text-center">
                  <div>
                    <p className="text-lg font-semibold text-neutral-900">Vibe ID 预览已在当前环境关闭</p>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">
                      生产环境默认不再公开暴露静态示例页面。如需本地演示，请开启
                      <code className="mx-1 rounded bg-neutral-200 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_ENABLE_VIBE_SAMPLE</code>
                      后重启应用。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Completion score sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-28 flex-shrink-0"
          >
            <button
              onClick={() => setShowCompletion(true)}
              className="w-full rounded-2xl p-4 text-center cursor-pointer hover:opacity-90 transition-opacity"
              style={{
                backgroundColor: '#0E2620',
                border: '1px solid #2D5A47',
                boxShadow: '0 8px 24px rgba(14, 38, 32, 0.25)',
              }}
            >
              <div className="text-3xl font-bold" style={{ color: '#C6E04B' }}>{completionScore}%</div>
              <div className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>完成度</div>
            </button>
            <p className="text-xs text-center mt-3" style={{ color: '#6B7280', lineHeight: 1.5 }}>
              点击查看<br />完善建议
            </p>
          </motion.div>
        </div>

        {/* ── AI Projects section ── */}
        <motion.div id="ai-projects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>

          {/* Section header — skill gap context */}
          <div className="rounded-2xl p-6 mb-8" style={{ backgroundColor: '#0E2620' }}>
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex-1">
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                  style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
                >
                  <Sparkles className="w-3 h-3" />
                  根据你的技能缺口，为你推荐
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  用真实 AI 项目，补齐技能缺口
                </h2>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)', maxWidth: 480 }}>
                  简历已通过 ATS，但技能缺口是面试和薪资谈判的真正短板。
                  下面的 AI 项目课程精准覆盖你缺失的技能——完成后直接写入 Vibe ID，
                  让 ATS 爬取可查、HR 一键验证。
                </p>
              </div>

              {/* Skill gap mini-summary */}
              {missingSkills.length > 0 && (
                <div
                  className="rounded-xl p-4 flex-shrink-0"
                  style={{ backgroundColor: '#1A3D32', border: '1px solid #2D5A47', minWidth: 200 }}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    你的技能缺口 ({missingSkills.length}项)
                  </p>
                  <div className="space-y-1.5">
                    {missingSkills.slice(0, 4).map(s => (
                      <div key={s.nameEn} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white">{s.name}</span>
                        <span className="text-xs font-bold" style={{ color: '#F87171' }}>{s.marketDemand}%</span>
                      </div>
                    ))}
                    {missingSkills.length > 4 && (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        +{missingSkills.length - 4} 项更多缺口
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid #2D5A47' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>当前技能匹配度</span>
                      <span className="text-sm font-bold" style={{ color: matchPct >= 60 ? '#34D399' : matchPct >= 40 ? '#FBBF24' : '#F87171' }}>
                        {matchPct}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Project cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sortedProjects.map((project, i) => {
              const covered = getCoveredMissing(project)
              const isTopMatch = i === 0 && covered.length > 0

              return (
                <motion.div
                  key={project.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-shadow relative"
                  style={{
                    border: isTopMatch ? '2px solid #C6E04B' : '1px solid #E5E7EB',
                  }}
                >
                  {isTopMatch && (
                    <div
                      className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
                    >
                      最匹配
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl">{project.icon}</span>
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                      >
                        {project.duration}
                      </span>
                    </div>
                    <h3 className="font-bold text-base mb-0.5" style={{ color: '#1A1A1A' }}>
                      {project.title}
                    </h3>
                    <p className="text-xs mb-3" style={{ color: '#9CA3AF' }}>{project.subtitle}</p>
                    <p className="text-sm mb-4" style={{ color: '#6B7280', lineHeight: 1.7 }}>
                      {project.desc}
                    </p>

                    {/* Skills covered */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {project.skills.map((skill, j) => (
                        <span
                          key={j}
                          className="text-xs px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: '#F0FDF4', color: '#2A6041', fontWeight: 500 }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Missing skills this project covers */}
                    {covered.length > 0 && (
                      <div
                        className="rounded-lg px-3 py-2 mb-3"
                        style={{ backgroundColor: 'rgba(198,224,75,0.08)', border: '1px solid rgba(198,224,75,0.2)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold" style={{ color: '#0E2620' }}>
                            解决你的 <span className="text-red-500">{covered.length}</span> 个缺口
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {covered.map(skillName => (
                            <span
                              key={skillName}
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
                            >
                              {skillName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ATS prediction */}
                    {covered.length > 0 && (
                      <p className="text-xs mb-3 font-medium" style={{ color: '#2A6041' }}>
                        完成后预计 ATS 覆盖率 {matchPct}% → <span className="font-bold">{Math.min(matchPct + covered.length * 8, 95)}%</span>
                        <span className="text-red-500 font-bold ml-1">(+{covered.length}个关键词)</span>
                      </p>
                    )}

                    <div className="text-xs mb-4" style={{ color: '#9CA3AF' }}>
                      交付: {project.deliverables}
                    </div>

                    <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid #F3F4F6' }}>
                      <span className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>$1,999</span>
                      <a
                        href="https://aiofferstudio.vibeid.co/products/courses/ba"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-white text-sm h-9 px-5 rounded-lg font-medium"
                        style={{ backgroundColor: '#2A6041' }}
                      >
                        了解详情
                      </a>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Bottom bundle CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="rounded-2xl p-8 text-center text-white mt-8"
            style={{ backgroundColor: '#0E2620' }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
            >
              最受欢迎
            </div>
            <h3 className="text-2xl font-bold mb-2">AI 项目全能包</h3>
            <p className="text-sm opacity-70 mb-1">6个AI实战项目 + 完整Vibe ID深度链接 + 导师1对1人味润色</p>
            <p className="text-sm font-semibold mb-2" style={{ color: '#C6E04B' }}>
              一次性补齐 {allCoveredCount > 0 ? allCoveredCount : totalMissing} 个技能缺口 → ATS 评分预计从 {atsBase} 提升至 {bundlePredictedATS}+
            </p>
            <p className="text-xs opacity-50 mb-5">
              Vibe ID 完成度直达 95%+，ATS 爬取可查，HR 一键验证
            </p>
            <div className="flex items-center justify-center gap-3 mb-5">
              <span className="text-lg line-through opacity-50">$11,994</span>
              <span className="text-4xl font-bold">$8,999</span>
            </div>
            <a
              href="https://aiofferstudio.vibeid.co/products/courses/ba"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-white font-bold text-lg h-14 px-12 rounded-xl"
              style={{ backgroundColor: '#2A6041' }}
            >
              一次性补齐 {allCoveredCount > 0 ? allCoveredCount : totalMissing} 个缺口，冲击 ATS {bundlePredictedATS}+ →
            </a>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <footer className="text-center py-10">
          <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
            <span>Powered by</span>
            <span className="font-bold" style={{ color: '#6B7280' }}>Vibe ID&trade;</span>
          </div>
          <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
            &copy; 2026 AI简历导师 by MentorX
          </p>
        </footer>
      </div>

      {/* Completion detail modal */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowCompletion(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden"
              style={{ width: '420px', maxWidth: 'calc(100vw - 32px)', maxHeight: '80vh', overflowY: 'auto' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <div
                className="px-6 py-5 text-white relative"
                style={{ backgroundColor: '#0E2620' }}
              >
                <button
                  onClick={() => setShowCompletion(false)}
                  className="absolute top-4 right-4 text-white/60 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg">简历完整度</h3>
                    <p className="text-sm opacity-80">有 {missingSections.length} 项待完善</p>
                  </div>
                  <div className="text-4xl font-bold">{completionScore}%</div>
                </div>
                <div className="mt-3 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${completionScore}%`, background: 'linear-gradient(90deg, #FCA5A5 0%, #C6E04B 100%)' }}
                  />
                </div>
              </div>

              <div className="p-6 space-y-2">
                {missingSections.map((section, i) => (
                  <div key={i}>
                    <div
                      className="flex items-center justify-between py-3 px-4 rounded-xl"
                      style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#F59E0B' }} />
                        <div>
                          <div className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                            {section.name}
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                              {section.count}/{section.target}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{section.desc}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium flex-shrink-0 ml-2" style={{ color: '#F59E0B' }}>待完善</span>
                    </div>
                  </div>
                ))}

                {completedSections.map((section, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 px-4 rounded-xl"
                    style={{ backgroundColor: '#F9FAFB', border: '1px solid #F3F4F6' }}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5" style={{ color: '#2A6041' }} />
                      <span className="font-medium text-sm" style={{ color: '#1A1A1A' }}>{section.name}</span>
                    </div>
                    <span className="text-xs" style={{ color: '#2A6041' }}>已完成</span>
                  </div>
                ))}

                <div className="pt-4">
                  <Button
                    onClick={() => {
                      setShowCompletion(false)
                      document.getElementById('ai-projects')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="w-full text-white font-semibold h-12 rounded-xl"
                    style={{ backgroundColor: '#2A6041' }}
                  >
                    查看 AI 项目课程，补齐技能缺口 →
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CustomerServiceButton />
    </main>
  )
}
