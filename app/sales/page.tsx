'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import AnxietyDashboard from '@/components/sales/AnxietyDashboard'
import MentorCard from '@/components/sales/MentorCard'
import LockedMentorCard from '@/components/sales/LockedMentorCard'
import PaymentModal from '@/components/shared/PaymentModal'
import SkillGapAnalysis from '@/components/result/SkillGapAnalysis'
import { getSession, updateSession } from '@/lib/session'
import CustomerServiceButton from '@/components/shared/CustomerServiceButton'
import { ResumeSession } from '@/lib/types'

export default function SalesPage() {
  const router = useRouter()
  const [session, setSession] = useState<ResumeSession | null>(null)
  const [showPayment, setShowPayment] = useState(false)

  useEffect(() => {
    const s = getSession()
    if (!s) { router.push('/'); return }
    const frame = window.requestAnimationFrame(() => {
      setSession(s)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [router])

  function handlePaymentSuccess() {
    setShowPayment(false)
    const updated = updateSession({ unlockedTiers: [...(session?.unlockedTiers || []), 'basic'] })
    if (updated) setSession(updated)
    router.push('/result')
  }

  if (!session) return null

  const unlockedMentor = session.mentorAdvice.find(m => !m.isLocked)
  const lockedMentors = session.mentorAdvice.filter(m => m.isLocked)

  return (
    <main className="flex-1 min-h-screen" style={{ backgroundColor: '#F7F5EF' }}>
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 px-4" style={{ borderBottom: '1px solid #F3F4F6', height: '60px', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-6xl mx-auto flex items-center gap-2 w-full">
          <span className="text-2xl">📝</span>
          <span className="font-bold text-lg text-gray-900">AI简历导师</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {session.jobDescription ? '你的简历 vs 目标岗位 匹配度报告' : '你的简历分析报告'}
          </h1>
          <p className="text-gray-500">
            目标岗位：<span className="font-medium text-gray-700">{session.targetRole}</span>
            {session.jobDescription && <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>已匹配 JD</span>}
          </p>
        </div>

        {/* Anxiety Dashboard */}
        <AnxietyDashboard
          atsScore={session.atsScore}
          atsResult={session.atsResult}
          currentSalary={session.currentSalary}
          topSalary={session.topSalary}
          topCompanies={session.topCompanies}
          competition={session.competition}
        />

        {/* Skill Gap Analysis — compact, collapsible */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>
            但 ATS 评分只是冰山一角 ↓
          </p>
          <SkillGapAnalysis
            targetRole={session.targetRole}
            resumeText={session.resumeText}
            jobDescription={session.jobDescription}
            compact
          />
        </div>

        {/* Overall Judgment */}
        {session.overallJudgment && (
          <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: '#0E2620' }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: '#C6E04B' }}>整体判断</h2>
            <p className="leading-relaxed mb-4" style={{ color: '#E8E6DF' }}>
              {session.overallJudgment.strengths}
            </p>
            <p className="leading-relaxed" style={{ color: '#C5C3BB' }}>
              {'但当前简历有两个核心问题：'}
              {session.overallJudgment.coreIssues.split(/\*\*(.*?)\*\*/g).map((segment, si) =>
                si % 2 === 1
                  ? <strong key={si} style={{ color: '#C6E04B', fontWeight: 600 }}>{segment}</strong>
                  : segment
              )}
            </p>
            <p className="leading-relaxed mt-4" style={{ color: '#C5C3BB' }}>
              以下各位导师结合大厂真正所需，给出具体建议。
            </p>
          </div>
        )}

        {/* Unlocked Mentor */}
        {unlockedMentor && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">导师建议预览</h2>
            <MentorCard mentor={unlockedMentor} index={0} />

            {/* Peer testimonial — VOC social proof */}
            <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#1A1A1A' }}>
                &ldquo;{session.targetRole ? `同专业` : '同背景'}的同学用这位导师建议后，ATS 分数从 54 提升到 87&rdquo;
              </p>
              <p className="text-xs mt-2" style={{ color: '#6B7280' }}>
                — {unlockedMentor.company} 方向 · 类似背景学生反馈
              </p>
            </div>
          </div>
        )}

        {/* Locked Mentors */}
        <div>
          <p className="text-center font-bold mb-5" style={{
            color: '#2A6041',
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            letterSpacing: '0.02em',
            lineHeight: 1.5,
          }}>
            解锁更多功能，系统将协助生成<span style={{ color: '#0E2620', borderBottom: '2px solid #C6E04B', paddingBottom: '2px' }}>最新版简历</span>
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            更多导师建议 <span className="text-sm text-gray-400 font-normal">（付费解锁）</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {lockedMentors.map((mentor, i) => (
              <LockedMentorCard
                key={mentor.id}
                mentor={mentor}
                index={i + 1}
                onUnlock={() => setShowPayment(true)}
              />
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl p-8 text-center text-white" style={{ backgroundColor: '#0E2620' }}>
          <h2 className="text-2xl font-bold mb-2">解锁 4 位导师完整修改建议</h2>
          <p className="text-sm opacity-60 mb-4">精准定位简历短板 + 了解技能缺口怎么填</p>
          <div className="text-4xl font-bold mb-4">¥39</div>
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-6 opacity-90">
            <span>✓ 4 位大厂导师逐条建议</span>
            <span>✓ 技能缺口补强路径</span>
            <span>✓ 一键生成优化简历</span>
          </div>
          <Button
            onClick={() => setShowPayment(true)}
            className="btn-primary font-bold text-lg h-14 px-12 rounded-xl"
          >
            立即解锁，查看完整报告 →
          </Button>
        </div>
      </div>

      <PaymentModal
        open={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        title="解锁所有导师建议"
        price="¥39"
        description="查看 4 位大厂导师针对你简历的完整修改建议"
      />
      <CustomerServiceButton />
    </main>
  )
}
