'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Check, X, ThumbsUp, ThumbsDown, Copy, ClipboardCheck } from 'lucide-react'
import { MentorAdvice, MentorAdviceItem, AdviceFeedback } from '@/lib/types'
import CompanyLogo from '@/components/shared/CompanyLogo'

interface MentorCardProps {
  mentor: MentorAdvice
  index: number
  feedbackMode?: boolean
  feedbackMap?: Record<string, AdviceFeedback>
  onFeedback?: (mentorId: string, adviceIndex: number, field: 'accepted' | 'helpful', value: boolean) => void
}

const priorityStyles: Record<string, { bg: string; text: string }> = {
  'P0-必改': { bg: 'bg-red-100', text: 'text-red-700' },
  'P1-重要': { bg: 'bg-orange-100', text: 'text-orange-700' },
  'P2-建议': { bg: 'bg-blue-100', text: 'text-blue-700' },
}

interface AdviceBlockProps {
  item: MentorAdviceItem
  index: number
  feedback?: AdviceFeedback
  onAccept?: (value: boolean) => void
  onHelpful?: (value: boolean) => void
}

/** Highlight metrics, action verbs, and skill keywords in rewrite examples */
function highlightKeywords(text: string): React.ReactNode {
  // Match: numbers+units (120K, 18%, $240K, p<0.05, 95%), skill terms in ALL_CAPS or known patterns
  const regex = /(\d[\d,.]*[%KkMm]?\+?|\$[\d,.]+[KkMm]?|p[<>]\d[\d.]*|(?:SQL|Python|Excel|VBA|Tableau|PowerBI|Google Analytics|Facebook Ads|A\/B\s*[Tt]est(?:ing)?|Regression\s*Analysis|Machine Learning|NLP|LangChain|GPT-\d|RAG|STAR))/g

  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (regex.test(part)) {
      // Reset regex lastIndex after test
      regex.lastIndex = 0
      const isMetric = /^\d|^\$/.test(part) || /^p[<>]/.test(part)
      return (
        <span
          key={i}
          className="font-semibold px-0.5 rounded"
          style={{
            backgroundColor: isMetric ? '#DCFCE7' : '#DBEAFE',
            color: isMetric ? '#166534' : '#1E40AF',
          }}
        >
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-all"
      style={{
        backgroundColor: copied ? '#DCFCE7' : '#F0F7F2',
        color: copied ? '#166534' : '#2A6041',
        border: '1px solid',
        borderColor: copied ? '#86EFAC' : '#D1E7D9',
      }}
    >
      {copied ? <ClipboardCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? '已复制' : '复制'}
    </button>
  )
}

function AdviceBlock({ item, index, feedback, onAccept, onHelpful }: AdviceBlockProps) {
  const style = priorityStyles[item.priority] || { bg: 'bg-gray-100', text: 'text-gray-700' }

  return (
    <div className="space-y-3">
      {/* Problem header with priority */}
      <div className="flex items-start gap-2">
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded ${style.bg} ${style.text}`}>
          {item.priority}
        </span>
        <h4 className="text-sm font-bold" style={{ color: '#DC2626' }}>{item.problem}</h4>
      </div>

      {/* Mentor screening strategy */}
      <div className="px-3 py-2.5 rounded-r-lg" style={{ backgroundColor: '#F7F5EF', borderLeft: '3px solid #2D5A47' }}>
        <p className="text-xs font-semibold mb-1" style={{ color: '#2D5A47' }}>导师筛选策略</p>
        <p className="text-sm text-gray-700 leading-relaxed">
          {item.mentorPerspective.split(/(「[^」]*」)/g).map((segment, si) =>
            segment.startsWith('「') && segment.endsWith('」')
              ? <span key={si} style={{ color: '#2D5A47', fontStyle: 'italic' }}>{segment}</span>
              : segment
          )}
        </p>
      </div>

      {/* Student status */}
      <div className="bg-gray-50 px-3 py-2 rounded-lg">
        <p className="text-xs text-gray-500 font-medium mb-0.5">你的现状</p>
        <p className="text-sm text-gray-600">{item.studentStatus}</p>
      </div>

      {/* Suggestion */}
      <div>
        <p className="text-xs text-gray-500 font-medium mb-0.5">建议</p>
        <p className="text-sm text-gray-700">{item.suggestion}</p>
      </div>

      {/* Example with copy + keyword highlighting */}
      {item.example && (
        <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: '#F0FAF4' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded flex items-center justify-center" style={{ backgroundColor: '#22C55E' }}>
                <Check className="w-2.5 h-2.5 text-white" />
              </span>
              <span className="text-xs font-bold" style={{ color: '#16A34A' }}>改写示例</span>
            </div>
            <CopyButton text={item.example} />
          </div>
          <p className="text-sm font-medium leading-relaxed" style={{ color: '#111' }}>
            {highlightKeywords(item.example)}
          </p>
        </div>
      )}

      {/* Feedback buttons */}
      {onAccept && (
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {/* Accept / Skip */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAccept(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: feedback?.accepted === true ? '#2A6041' : '#F0F7F2',
                color: feedback?.accepted === true ? '#ffffff' : '#2A6041',
                border: '1px solid',
                borderColor: feedback?.accepted === true ? '#2A6041' : '#D1E7D9',
              }}
            >
              <Check className="w-3.5 h-3.5" />
              接受建议
            </button>
            <button
              onClick={() => onAccept(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: feedback?.accepted === false ? '#6B7280' : '#F9FAFB',
                color: feedback?.accepted === false ? '#ffffff' : '#6B7280',
                border: '1px solid',
                borderColor: feedback?.accepted === false ? '#6B7280' : '#E5E7EB',
              }}
            >
              <X className="w-3.5 h-3.5" />
              省略
            </button>
          </div>

          {/* Helpful? */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-gray-400 mr-1">有帮助吗？</span>
            <button
              onClick={() => onHelpful?.(true)}
              className="p-1.5 rounded-md transition-all"
              style={{
                backgroundColor: feedback?.helpful === true ? '#DBEAFE' : 'transparent',
                color: feedback?.helpful === true ? '#2563EB' : '#9CA3AF',
              }}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onHelpful?.(false)}
              className="p-1.5 rounded-md transition-all"
              style={{
                backgroundColor: feedback?.helpful === false ? '#FEE2E2' : 'transparent',
                color: feedback?.helpful === false ? '#DC2626' : '#9CA3AF',
              }}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MentorCard({ mentor, index, feedbackMode, feedbackMap, onFeedback }: MentorCardProps) {
  const initial = mentor.mentorName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4 mb-3">
          <CompanyLogo company={mentor.companyLogo || mentor.company} size={48} />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900">{mentor.company}</h3>
            <p className="text-sm text-gray-600">
              {initial}导师 · {mentor.mentorTitle}
            </p>
          </div>
        </div>

        {/* Highlight Tags */}
        {mentor.highlightTags && mentor.highlightTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {mentor.highlightTags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: '#F0F7F2', color: '#2A6041' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Career Path */}
        {mentor.careerPath && (
          <div className="text-xs text-gray-500 mb-1">
            <span className="text-gray-400">职业路径：</span>
            {mentor.careerPath}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Advice blocks */}
      <div className="p-6 pt-5 space-y-5">
        {mentor.advice.map((item, i) => (
          <div key={i}>
            {i > 0 && <div className="border-t border-dashed border-gray-200 mb-5" />}
            {typeof item === 'string' ? (
              <div className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500 shrink-0 mt-0.5">✓</span>
                <span>{item}</span>
              </div>
            ) : (
              <AdviceBlock
                item={item}
                index={i}
                feedback={feedbackMode ? feedbackMap?.[`${mentor.id}-${i}`] : undefined}
                onAccept={feedbackMode ? (v) => onFeedback?.(mentor.id, i, 'accepted', v) : undefined}
                onHelpful={feedbackMode ? (v) => onFeedback?.(mentor.id, i, 'helpful', v) : undefined}
              />
            )}
          </div>
        ))}

        {/* Resume Highlight section */}
        {mentor.resumeHighlight && (
          <>
            <div className="border-t border-dashed border-gray-200" />
            <div className="rounded-xl p-4" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" style={{ color: '#D97706' }} />
                <h4 className="text-sm font-bold" style={{ color: '#92400E' }}>简历吸睛视角</h4>
              </div>
              <p className="text-sm text-gray-700 mb-2">{mentor.resumeHighlight.intro}</p>
              <ol className="space-y-1 pl-4 list-decimal">
                {mentor.resumeHighlight.points.map((pt, i) => (
                  <li key={i} className="text-sm text-gray-700">{pt}</li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}
