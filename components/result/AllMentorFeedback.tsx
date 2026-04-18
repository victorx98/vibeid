'use client'

import { useMemo } from 'react'
import { Check, Circle } from 'lucide-react'
import MentorCard from '@/components/sales/MentorCard'
import { MentorAdvice, AdviceFeedback } from '@/lib/types'

interface AllMentorFeedbackProps {
  mentors: MentorAdvice[]
  feedbackMap: Record<string, AdviceFeedback>
  onFeedback: (mentorId: string, adviceIndex: number, field: 'accepted' | 'helpful', value: boolean) => void
}

export default function AllMentorFeedback({ mentors, feedbackMap, onFeedback }: AllMentorFeedbackProps) {
  // Calculate progress stats
  const stats = useMemo(() => {
    let total = 0
    let accepted = 0
    let skipped = 0

    mentors.forEach(m => {
      m.advice.forEach((_, i) => {
        total++
        const fb = feedbackMap[`${m.id}-${i}`]
        if (fb?.accepted === true) accepted++
        else if (fb?.accepted === false) skipped++
      })
    })

    const reviewed = accepted + skipped
    return { total, accepted, skipped, reviewed }
  }, [mentors, feedbackMap])

  const pct = stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">全部导师建议</h2>
        <p className="text-sm text-gray-500 mt-1">选择你想采纳的建议，系统将根据你的选择生成优化简历</p>
      </div>

      {/* Sticky progress tracker */}
      <div
        className="sticky z-30 bg-white rounded-xl px-4 py-3 shadow-sm"
        style={{ top: '68px', border: '1px solid #E5E7EB' }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-900">建议处理进度</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs" style={{ color: '#2A6041' }}>
                <Check className="w-3 h-3" />
                采纳 {stats.accepted}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400">
                省略 {stats.skipped}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-300">
                待处理 {stats.total - stats.reviewed}
              </span>
            </div>
          </div>
          <span className="text-sm font-bold" style={{ color: '#2A6041' }}>
            {stats.reviewed}/{stats.total}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              background: pct === 100
                ? 'linear-gradient(90deg, #2A6041, #C6E04B)'
                : '#2A6041',
            }}
          />
        </div>
      </div>

      <div className="space-y-6">
        {mentors.map((mentor, i) => (
          <MentorCard
            key={mentor.id}
            mentor={mentor}
            index={i}
            feedbackMode
            feedbackMap={feedbackMap}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    </div>
  )
}
