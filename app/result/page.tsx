'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import AllMentorFeedback from '@/components/result/AllMentorFeedback'
import LockedFeatures from '@/components/result/LockedFeatures'
import PaymentModal from '@/components/shared/PaymentModal'
import LoadingScreen from '@/components/shared/LoadingScreen'
import { getApiErrorMessage } from '@/lib/client-api'
import { getSession, updateSession } from '@/lib/session'
import CustomerServiceButton from '@/components/shared/CustomerServiceButton'
import { ResumeSession, AdviceFeedback, ATSResult } from '@/lib/types'

// Common format issues Chinese students face — static knowledge base
const FORMAT_CHECKS: { id: string; label: string; keywords: string[]; penalty: string }[] = [
  { id: 'table', label: '检测到表格布局', keywords: ['表格', 'table', '双栏', '两栏', 'column', '多栏'], penalty: '大多数 ATS 系统无法解析表格，内容可能完全丢失' },
  { id: 'header', label: '联系信息位于页眉区域', keywords: ['页眉', 'header', 'footer', '页脚'], penalty: 'ATS 通常跳过页眉/页脚区域，你的联系方式可能被忽略' },
  { id: 'icon', label: '使用特殊字体或图标', keywords: ['图标', 'icon', '特殊字体', 'font awesome', '符号'], penalty: 'ATS 无法识别图标字体，显示为乱码或空白' },
  { id: 'textbox', label: '使用文本框排版', keywords: ['文本框', 'text box', 'textbox'], penalty: '文本框内容在 ATS 解析时可能被跳过或打乱顺序' },
  { id: 'mixed', label: '中英文混排格式不一致', keywords: ['中英', '混排'], penalty: 'ATS 关键词匹配可能因语言混排而失效' },
  { id: 'photo', label: '包含头像照片', keywords: ['头像', '照片', 'photo', 'headshot', '证件照'], penalty: '北美 ATS 标准不接受照片，可能触发自动过滤' },
]

function FormatComplianceAlert({ atsResult, onUnlock }: { atsResult: ATSResult; onUnlock: () => void }) {
  const formatScore = atsResult.scores.format_compliance.raw
  if (formatScore >= 85) return null // No alert needed for good format

  const formatPenalties = atsResult.penalties.filter(p =>
    FORMAT_CHECKS.some(check =>
      check.keywords.some(kw => p.reason.toLowerCase().includes(kw.toLowerCase()))
    )
  )

  // Also detect from static checks
  const allIssueText = [...atsResult.top_issues.map(i => i.issue), ...atsResult.penalties.map(p => p.reason)].join(' ').toLowerCase()
  const detectedChecks = FORMAT_CHECKS.filter(check =>
    check.keywords.some(kw => allIssueText.includes(kw.toLowerCase()))
  )

  // If no specific format issues found but score is low, show generic warnings
  const issues = detectedChecks.length > 0 ? detectedChecks : FORMAT_CHECKS.slice(0, 2)
  const totalPenalty = formatPenalties.reduce((sum, p) => sum + Math.abs(p.deduction), 0) || Math.round((85 - formatScore) * 0.3)

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #FCA5A5' }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: '#FEF2F2' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">⚠️</span>
          <h3 className="text-sm font-bold text-red-700">格式合规检测</h3>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
            {formatScore}/100
          </span>
        </div>
        <span className="text-xs text-red-400">
          预估影响 ATS 通过率 -{totalPenalty > 25 ? 25 : totalPenalty} 分
        </span>
      </div>

      {/* Issue list */}
      <div className="bg-white px-5 py-4 space-y-3">
        {issues.slice(0, 4).map((issue, i) => (
          <div key={issue.id} className="flex items-start gap-3">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{issue.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{issue.penalty}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA footer */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: '#FFFBEB', borderTop: '1px solid #FEF3C7' }}>
        <p className="text-xs text-gray-600">
          <span className="font-semibold" style={{ color: '#2A6041' }}>¥99 优化简历</span> 将自动修复所有格式问题
        </p>
        <button
          onClick={onUnlock}
          className="text-xs font-bold px-4 py-1.5 rounded-lg text-white"
          style={{ backgroundColor: '#2A6041' }}
        >
          一键修复 →
        </button>
      </div>
    </div>
  )
}

export default function ResultPage() {
  const router = useRouter()
  const [session, setSessionState] = useState<ResumeSession | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeStage, setOptimizeStage] = useState<'optimizing-1' | 'optimizing-2'>('optimizing-1')
  const [optimizeCompleted, setOptimizeCompleted] = useState(false)
  const [showBanner, setShowBanner] = useState(false)
  const [feedbackMap, setFeedbackMap] = useState<Record<string, AdviceFeedback>>({})

  useEffect(() => {
    const s = getSession()
    if (!s || !s.unlockedTiers.includes('basic')) { router.push('/'); return }
    const frame = window.requestAnimationFrame(() => {
      setSessionState(s)
      if (s.adviceFeedback) setFeedbackMap(s.adviceFeedback)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [router])

  function handleFeedback(mentorId: string, adviceIndex: number, field: 'accepted' | 'helpful', value: boolean) {
    const key = `${mentorId}-${adviceIndex}`
    setFeedbackMap(prev => {
      const updated = {
        ...prev,
        [key]: { ...prev[key], accepted: prev[key]?.accepted ?? null, helpful: prev[key]?.helpful ?? null, [field]: value },
      }
      updateSession({ adviceFeedback: updated })
      return updated
    })
  }

  useEffect(() => {
    const handleScroll = () => setShowBanner(window.scrollY > 200)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleUpgrade() {
    setShowPayment(false)
    setIsOptimizing(true)
    setOptimizeStage('optimizing-1')
    setOptimizeCompleted(false)

    // Advance stage after ~15s (Phase A format ends, Phase B optimize begins)
    const stageTimer = setTimeout(() => setOptimizeStage('optimizing-2'), 15000)

    try {
      const res = await fetch('/api/optimize-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: session!.resumeText,
          targetRole: session!.targetRole,
          jobDescription: session!.jobDescription,
          mentorAdvice: session!.mentorAdvice,
          adviceFeedback: feedbackMap,
        }),
      })
      clearTimeout(stageTimer)

      if (!res.ok) throw new Error(await getApiErrorMessage(res, '优化失败，请重试'))
      const { optimizedResume } = await res.json()

      const updated = updateSession({
        unlockedTiers: [...(session?.unlockedTiers || []), 'resume', 'video'],
        optimizedResume,
      })
      if (updated) setSessionState(updated)

      // Animate bar to 100%, then navigate via onCompleted callback
      setOptimizeStage('optimizing-2')
      setOptimizeCompleted(true)
    } catch (error) {
      clearTimeout(stageTimer)
      setIsOptimizing(false)
      alert(error instanceof Error ? error.message : '优化失败，请重试')
    }
  }

  if (isOptimizing) return (
    <LoadingScreen
      mode="optimize"
      stage={optimizeStage}
      completed={optimizeCompleted}
      onCompleted={() => router.push('/upsale')}
    />
  )
  if (!session) return null

  return (
    <main className="flex-1 min-h-screen" style={{ backgroundColor: '#F7F5EF' }}>
      {/* Sticky Banner */}
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: showBanner ? 0 : -100 }}
        className="fixed top-0 left-0 right-0 z-50 text-white px-4 py-3"
        style={{ backgroundColor: '#0E2620' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-sm font-medium">导师建议已选好？一键生成 ATS 合规简历，开启技能补强路径</span>
          <Button
            onClick={() => setShowPayment(true)}
            className="text-white text-sm h-8 px-4 rounded-lg"
            style={{ backgroundColor: '#2A6041' }}
          >
            立即升级 ¥99
          </Button>
        </div>
      </motion.div>

      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-4" style={{ height: '60px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-2 w-full">
          <span className="text-2xl">📝</span>
          <span className="font-bold text-lg text-gray-900">AI简历导师</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Success message */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="text-green-700 font-medium">已解锁所有导师建议</p>
        </div>

        {/* Format Compliance Alert */}
        {session.atsResult && (
          <FormatComplianceAlert
            atsResult={session.atsResult}
            onUnlock={() => setShowPayment(true)}
          />
        )}

        <AllMentorFeedback
          mentors={session.mentorAdvice}
          feedbackMap={feedbackMap}
          onFeedback={handleFeedback}
        />

        <LockedFeatures
          resumeText={session.resumeText}
          targetRole={session.targetRole}
          onUnlock={() => setShowPayment(true)}
        />

        {/* Upgrade CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ backgroundColor: '#0E2620' }}>
          <h2 className="text-2xl font-bold mb-2">一键生成优化简历</h2>
          <p className="text-sm opacity-70 mb-3">自动修复格式问题 + ATS 2.0 合规优化 + 导师人味润色 + Vibe ID 深度链接</p>
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-lg line-through opacity-60">¥198</span>
            <span className="text-4xl font-bold">¥99</span>
          </div>
          <Button
            onClick={() => setShowPayment(true)}
            className="text-white font-bold text-lg h-14 px-12 rounded-xl"
            style={{ backgroundColor: '#2A6041' }}
          >
            立即生成优化简历 →
          </Button>
        </div>
      </div>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handleUpgrade}
        title="一键生成优化简历"
        price="¥99"
        description="AI 优化逻辑 + 导师灵魂润色 + Vibe ID 深度链接——让 ATS 和 HR 同时认可你"
      />
      <CustomerServiceButton />
    </main>
  )
}
