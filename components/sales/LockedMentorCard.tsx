'use client'

import { motion } from 'framer-motion'
import { Lock } from 'lucide-react'
import CompanyLogo from '@/components/shared/CompanyLogo'
import { MentorAdvice } from '@/lib/types'

interface LockedMentorCardProps {
  mentor: MentorAdvice
  index: number
  onUnlock: () => void
}

export default function LockedMentorCard({ mentor, index, onUnlock }: LockedMentorCardProps) {
  const initial = mentor.mentorName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative bg-white shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
    >
      {/* Visible header — not blurred */}
      <div className="p-5 pb-3">
        <div className="flex items-start gap-3 mb-2.5">
          <CompanyLogo company={mentor.companyLogo || mentor.company} size={40} />
          <div className="min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight">{mentor.company}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{initial}导师 · {mentor.mentorTitle}</p>
          </div>
        </div>

        {/* Highlight Tags — visible */}
        {mentor.highlightTags && mentor.highlightTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-1">
            {mentor.highlightTags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#F0F7F2', color: '#2A6041' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Blurred advice area + lock overlay */}
      <div className="relative px-5 pb-5 min-h-[100px]">
        <div className="blur-[5px] select-none pointer-events-none opacity-50">
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {mentor.advice.slice(0, 2).map((item, i) => (
              <div key={i} className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">
                {item.problem + ' — ' + (item.suggestion || '').slice(0, 40) + '...'}
              </div>
            ))}
          </div>
        </div>

        {/* Lock overlay */}
        <div
          onClick={onUnlock}
          className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent flex flex-col items-center justify-center cursor-pointer transition-colors"
        >
          <Lock className="w-6 h-6 mb-1.5" style={{ color: '#2A6041' }} />
          <p className="text-xs font-semibold" style={{ color: '#2A6041' }}>解锁查看完整建议</p>
        </div>
      </div>
    </motion.div>
  )
}
