'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, FileCheck, Layout, Globe, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { callPreviewOptimize } from '@/lib/previewOptimize'

const features = [
  {
    icon: FileCheck,
    title: '一键生成完美简历',
    desc: 'AI 根据导师建议自动改写，直接下载 Word / PDF 投递',
  },
  {
    icon: Layout,
    title: '整体 ATS 2.0 优化',
    desc: '语义关键词整合 + 单栏合规格式 + Skills-First 排版',
  },
  {
    icon: Layout,
    title: '专业排版设计',
    desc: '符合北美求职标准的单栏简历排版——ATS 解析零失误',
  },
  {
    icon: Globe,
    title: 'Vibe ID 技能补强',
    desc: 'AI 实战项目补齐技能缺口，GitHub / Notion / LinkedIn 一键整合',
  },
]

interface LockedFeaturesProps {
  resumeText?: string
  targetRole?: string
  onUnlock: () => void
}

// Extract first bullet from the first work experience
function extractFirstBullet(text: string): string | null {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  let foundHeader = false
  for (const line of lines) {
    // Look for experience section indicators
    if (/experience|工作经历|实习/i.test(line)) {
      foundHeader = true
      continue
    }
    // After finding experience header, look for bullet
    if (foundHeader && /^[-•*]/.test(line)) {
      return line.replace(/^[-•*]\s*/, '').trim()
    }
    // Also match lines that look like bullet descriptions (after a company/title line)
    if (foundHeader && line.length > 30 && !line.includes('|') && !/^\*\*/.test(line) && !/^#/.test(line)) {
      return line.trim()
    }
  }
  // Fallback: find any bullet-like line
  for (const line of lines) {
    if (/^[-•*]\s/.test(line) && line.length > 30) {
      return line.replace(/^[-•*]\s*/, '').trim()
    }
  }
  return null
}

export default function LockedFeatures({ resumeText, targetRole, onUnlock }: LockedFeaturesProps) {
  const [previewBullet, setPreviewBullet] = useState<{ original: string; optimized: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const originalBullet = resumeText ? extractFirstBullet(resumeText) : null

  useEffect(() => {
    if (!originalBullet || !targetRole) return
    let cancelled = false
    const frame = window.requestAnimationFrame(() => {
      setLoading(true)
      callPreviewOptimize(originalBullet, targetRole)
        .then(optimized => {
          if (!cancelled && optimized) {
            setPreviewBullet({ original: originalBullet, optimized })
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frame)
    }
  }, [originalBullet, targetRole])

  return (
    <div className="space-y-4">
      {/* Live Preview Card — the hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
        style={{ border: '2px solid #C6E04B', backgroundColor: '#FAFDF5' }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5" style={{ color: '#2A6041' }} />
            <h3 className="font-bold text-[15px]" style={{ color: '#0E2620' }}>优化预览 — 第一条改写示范</h3>
          </div>

          {/* Before / After comparison */}
          {loading ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: '#d1e7d9', borderTopColor: '#2A6041' }} />
              <span className="text-sm text-gray-500">AI 正在生成优化预览...</span>
            </div>
          ) : previewBullet ? (
            <div className="space-y-3">
              {/* Original */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#FEF2F2' }}>
                <p className="text-xs font-medium text-red-400 mb-1.5">原始版本</p>
                <p className="text-sm text-gray-600 leading-relaxed line-through decoration-red-300">{previewBullet.original}</p>
              </div>

              {/* Optimized — with blur overlay */}
              <div className="relative rounded-xl p-4" style={{ backgroundColor: '#F0FDF4' }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium" style={{ color: '#2A6041' }}>AI 优化版本</p>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
                    ATS 关键词覆盖率 +23%
                  </span>
                </div>
                {/* Show first ~60 chars clearly, blur the rest */}
                <p className="text-sm leading-relaxed" style={{ color: '#1A1A1A' }}>
                  <span>{previewBullet.optimized.slice(0, 60)}</span>
                  <span className="select-none" style={{ filter: 'blur(4px)', color: '#6B7280' }}>
                    {previewBullet.optimized.slice(60) || '...更多优化内容'}
                  </span>
                </p>
                {/* Watermark overlay on blurred part */}
                <div className="absolute bottom-2 right-4 text-xs font-medium opacity-30 select-none" style={{ color: '#2A6041' }}>
                  付费解锁完整版
                </div>
              </div>
            </div>
          ) : originalBullet ? (
            /* Fallback if API fails — show static preview */
            <div className="rounded-xl p-4" style={{ backgroundColor: '#F0FDF4' }}>
              <p className="text-sm text-gray-500 leading-relaxed">
                <span>{originalBullet.slice(0, 40)}</span>
                <span className="select-none" style={{ filter: 'blur(4px)' }}>{originalBullet.slice(40)}</span>
              </p>
            </div>
          ) : null}

          {/* CTA copy + button */}
          <div className="mt-5 text-center">
            <p className="text-sm text-gray-600 mb-3">
              这是你的简历<span className="font-bold" style={{ color: '#0E2620' }}>第一条优化预览</span>，付费解锁<span className="font-bold" style={{ color: '#2A6041' }}>全部改写</span>
            </p>
            <Button
              onClick={onUnlock}
              className="text-white font-bold text-sm h-11 px-8 rounded-xl"
              style={{ backgroundColor: '#2A6041' }}
            >
              查看完整优化方案 ¥99 →
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Feature grid — compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {features.map((feat, i) => {
          return (
            <div
              key={i}
              className="bg-white rounded-xl p-4"
              style={{ border: '1px solid #E5E7EB' }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lock className="w-3 h-3" style={{ color: '#2A6041' }} />
                <h4 className="font-semibold text-xs" style={{ color: '#1A1A1A' }}>{feat.title}</h4>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                {feat.desc}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
