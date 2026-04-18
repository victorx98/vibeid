'use client'

import { Play } from 'lucide-react'
import { motion } from 'framer-motion'
import CompanyLogo from '@/components/shared/CompanyLogo'
import { MentorAdvice } from '@/lib/types'

interface VideoItem {
  painPoint: string
  valueAfter: string
  duration: string
  chapters: { time: string; title: string }[]
}

// Generate video data per mentor based on their advice
function generateVideoData(mentor: MentorAdvice, targetRole: string): VideoItem {
  const firstAdvice = mentor.advice[0]
  const problem = typeof firstAdvice === 'string' ? firstAdvice : firstAdvice?.problem || '简历核心问题'

  // Pain point headlines mapped to common issues
  const painPoints = [
    `为什么你的简历总被ATS筛掉？`,
    `${targetRole}简历最致命的错误`,
    `HR只看5秒，你的亮点放对位置了吗？`,
    `大厂简历和普通简历的关键区别`,
    `如何让数字替你说话：量化经历改写`,
    `跨行业转型简历怎么写才不减分`,
  ]

  const values = [
    '掌握ATS关键词布局，通过率提升40%+',
    `学会${targetRole}简历的黄金结构`,
    '学会前3秒抓住HR注意力的写法',
    '从大厂视角重构你的经历描述',
    '每条经历都有数据支撑，说服力翻倍',
    '用可迁移能力弥合行业差距',
  ]

  const idx = mentor.mentorName.charCodeAt(0) % painPoints.length

  return {
    painPoint: painPoints[idx],
    valueAfter: values[idx],
    duration: `${8 + (mentor.mentorName.charCodeAt(0) % 10)}:${String(10 + (mentor.mentorName.charCodeAt(1) || 0) % 50).padStart(2, '0')}`,
    chapters: [
      { time: '00:00', title: '问题诊断' },
      { time: `0${2 + idx}:${10 + idx * 5}`, title: '改写示范' },
      { time: `0${5 + idx}:30`, title: '行业洞察' },
    ],
  }
}

interface MentorVideoProps {
  mentors: MentorAdvice[]
  targetRole: string
}

function VideoCard({ mentor, video, index }: { mentor: MentorAdvice; video: VideoItem; index: number }) {
  const initial = mentor.mentorName.charAt(0).toUpperCase()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl shadow-sm overflow-hidden break-inside-avoid mb-4"
      style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
    >
      {/* Pain point headline */}
      <div className="px-4 py-3" style={{ backgroundColor: '#0E2620' }}>
        <p className="text-sm font-bold leading-snug" style={{ color: '#C6E04B' }}>{video.painPoint}</p>
      </div>

      {/* Video thumbnail */}
      <div className="relative aspect-[16/10] flex items-center justify-center group cursor-pointer" style={{ backgroundColor: '#0E2620' }}>
        <div className="text-center">
          <div className="mx-auto mb-2">
            <CompanyLogo company={mentor.companyLogo || mentor.company} size={44} />
          </div>
          <p className="text-white text-sm font-semibold">{mentor.company}</p>
          <p className="text-gray-400 text-xs">{initial}导师 · {mentor.mentorTitle}</p>
        </div>

        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center transition-colors shadow-lg" style={{ backgroundColor: '#2A6041' }}>
            <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {video.duration}
        </div>
      </div>

      {/* Mentor tags */}
      {mentor.highlightTags && mentor.highlightTags.length > 0 && (
        <div className="px-4 pt-3 flex flex-wrap gap-1">
          {mentor.highlightTags.slice(0, 3).map((tag, i) => (
            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#F0F7F2', color: '#2A6041' }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Value description */}
      <div className="px-4 py-3">
        <div className="flex items-start gap-2">
          <span className="shrink-0 text-sm mt-0.5" style={{ color: '#2A6041' }}>✦</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">看完你将学会</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{video.valueAfter}</p>
          </div>
        </div>
      </div>

      {/* Chapter preview */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <div className="flex gap-3">
          {video.chapters.map((ch, i) => (
            <span key={i} className="text-[10px] text-gray-400 cursor-pointer transition-colors" style={{ '--hover-color': '#2A6041' } as React.CSSProperties}>
              <span className="font-mono">{ch.time}</span> {ch.title}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function MentorVideo({ mentors, targetRole }: MentorVideoProps) {
  const videoData = mentors.map(m => generateVideoData(m, targetRole))

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        导师 Insight 视频
        <span className="text-sm text-gray-400 font-normal ml-2">来自大厂导师的实战经验分享</span>
      </h2>
      <div className="columns-1 md:columns-2 gap-4">
        {mentors.map((mentor, i) => (
          <VideoCard key={mentor.id} mentor={mentor} video={videoData[i]} index={i} />
        ))}
      </div>
    </div>
  )
}
