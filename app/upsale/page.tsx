'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'
import OptimizedResume from '@/components/upsale/OptimizedResume'
import ATSOptimization from '@/components/upsale/ATSOptimization'
import SkillGapCTA from '@/components/upsale/SkillGapCTA'
import UpsaleServices from '@/components/upsale/UpsaleServices'
import { getSession } from '@/lib/session'
import CustomerServiceButton from '@/components/shared/CustomerServiceButton'
import { ResumeSession } from '@/lib/types'

function ATSCelebration({ beforeScore, afterScore }: { beforeScore: number; afterScore: number }) {
  const [displayScore, setDisplayScore] = useState(beforeScore)
  const [phase, setPhase] = useState<'counting' | 'done'>('counting')

  useEffect(() => {
    const duration = 1500
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayScore(Math.round(beforeScore + (afterScore - beforeScore) * eased))
      if (progress >= 1) { clearInterval(timer); setPhase('done') }
    }, 16)
    return () => clearInterval(timer)
  }, [beforeScore, afterScore])

  const scoreColor = displayScore >= 80 ? '#22c55e' : displayScore >= 70 ? '#eab308' : '#f97316'

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl flex items-center gap-5 px-5 py-3"
      style={{ backgroundColor: '#0E2620' }}
    >
      {/* Score */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-center">
          <p className="text-xs font-semibold mb-0.5" style={{ color: '#C6E04B' }}>ATS 通过率</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm text-gray-500 line-through">{beforeScore}</span>
            <span className="text-gray-600 text-xs">→</span>
            <motion.span
              className="text-3xl font-bold"
              style={{ color: scoreColor }}
              animate={phase === 'done' ? { scale: [1, 1.12, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {displayScore}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 shrink-0" style={{ backgroundColor: '#2D5A47' }} />

      {/* Checklist — inline */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {['关键词已优化', '格式已修复', 'Ready to submit'].map((item, i) => (
          <motion.span
            key={item}
            initial={{ opacity: 0 }}
            animate={phase === 'done' ? { opacity: 1 } : {}}
            transition={{ delay: 0.2 + i * 0.12 }}
            className="flex items-center gap-1 text-xs text-gray-400"
          >
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            {item}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

function QuickFeedback() {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit() {
    if (rating === null) return
    let feedbacks: unknown[] = []
    try { feedbacks = JSON.parse(localStorage.getItem('user_feedbacks') || '[]') } catch { /* ignore malformed */ }
    feedbacks.push({ rating, comment, date: new Date().toISOString() })
    localStorage.setItem('user_feedbacks', JSON.stringify(feedbacks))
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7' }}>
          <p className="text-sm font-medium" style={{ color: '#166534' }}>感谢你的反馈！你的意见将帮助我们持续优化产品</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 mt-8">
      <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #E5E7EB' }}>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">这次优化体验如何？</h3>
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className="w-10 h-10 rounded-full text-sm font-bold transition-all"
              style={{
                backgroundColor: rating === n ? '#2A6041' : '#F3F4F6',
                color: rating === n ? '#fff' : '#6B7280',
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="有什么建议或想说的？（选填）"
          className="w-full text-sm rounded-xl p-3 resize-none focus:outline-none focus:ring-2"
          style={{ border: '1px solid #E5E7EB', minHeight: '60px', focusRingColor: '#2A6041' } as React.CSSProperties}
          rows={2}
        />
        <button
          onClick={handleSubmit}
          disabled={rating === null}
          className="mt-3 text-sm font-medium px-5 py-2 rounded-lg text-white transition-opacity disabled:opacity-40"
          style={{ backgroundColor: '#2A6041' }}
        >
          提交反馈
        </button>
      </div>
    </div>
  )
}

export default function UpsalePage() {
  const router = useRouter()
  const [session, setSession] = useState<ResumeSession | null>(null)

  useEffect(() => {
    const s = getSession()
    if (!s || !s.unlockedTiers.includes('resume')) { router.push('/'); return }
    setSession(s)
  }, [router])

  if (!session) return null

  return (
    <main className="flex-1 min-h-screen" style={{ backgroundColor: '#F7F5EF' }}>
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-4" style={{ height: '60px', display: 'flex', alignItems: 'center', borderBottom: '1px solid #F3F4F6' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-2 w-full">
          <span className="text-2xl">📝</span>
          <span className="font-bold text-lg text-gray-900">AI简历导师</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ATS Score Animation Banner */}
        <ATSCelebration
          beforeScore={session.atsScore ?? 58}
          afterScore={Math.min((session.atsScore ?? 58) + 25, 95)}
        />

        {/* Optimized Resume */}
        <OptimizedResume content={session.optimizedResume || '优化内容加载中...'} />

        {/* ATS Optimization Summary */}
        <ATSOptimization atsResult={session.atsResult} />

        {/* Skill Gap CTA — bridge to Vibe ID */}
        <SkillGapCTA
          targetRole={session.targetRole}
          resumeText={session.resumeText}
          jobDescription={session.jobDescription}
        />

        {/* Upsale Services */}
        <UpsaleServices />
      </div>

      {/* Quick Feedback */}
      <QuickFeedback />

      <footer className="py-8 border-t border-gray-100 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
            <span>Powered by</span>
            <span className="font-bold text-gray-600">Vibe ID&trade;</span>
          </div>
          <p className="text-sm text-gray-400">&copy; 2026 AI简历导师 by MentorX &mdash; 让每份简历都有导师把关</p>
        </div>
      </footer>
      <CustomerServiceButton />
    </main>
  )
}
