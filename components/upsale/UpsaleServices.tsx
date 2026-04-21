'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Play, Lock, Star, Clock, CheckCircle } from 'lucide-react'

/* ─── Top 3 service cards ─── */
const services = [
  {
    icon: '👨‍💼',
    badge: '最受欢迎',
    title: '1on1 导师简历精修',
    price: '$2,999',
    desc: '与大厂导师视频通话，逐条精修简历，深度定制优化',
    cta: '预约导师精修',
  },
  {
    icon: '🚀',
    title: '简历代投',
    price: '$999',
    desc: '精准代投目标公司，提供投递进度追踪与反馈',
    cta: '开始代投',
  },
  {
    icon: '🏢',
    badge: '背景提升',
    title: '保岗实习服务',
    price: '$29,999',
    desc: '进入真实美国本土公司，直接参与实操项目，提升背景经历',
    subdesc: '这不是"体验"，而是实战',
    cta: '了解实习项目',
  },
]

/* ─── Interview coaching videos ─── */
/* ─── Interview coaching videos ─── */
const videos = [
  {
    id: 'v1',
    company: 'TikTok',
    companyLogo: '/logos/tiktok.png',
    mentorLabel: 'TikTok 导师',
    title: '项目介绍的致命陷阱',
    subtitle: '为什么说了不懂的技术，比不说更危险？',
    duration: '14 min',
    tags: ['STAR框架', '面试技巧', '项目经历'],
    teaser: '"面试官不怕你不懂——怕的是你不知道自己不懂"',
  },
  {
    id: 'v2',
    company: 'Amazon',
    companyLogo: '/logos/amazon.png',
    mentorLabel: 'Amazon 导师',
    title: 'BA面试的隐藏考点',
    subtitle: '面试官问"你来我们公司会做什么"时，到底在考什么？',
    duration: '13 min',
    tags: ['MBV框架', '大厂内幕', '公司调研'],
    teaser: '"能说清这家公司怎么赚钱，你就能说清自己为什么值得被录用"',
  },
  {
    id: 'v3',
    company: 'Google',
    companyLogo: null,
    mentorLabel: 'Google 前导师',
    title: '算法题不会怎么办？',
    subtitle: '从"我只会笨方法"到"我懂了"的顿悟时刻',
    duration: '14 min',
    tags: ['Two Pointers', '潜规则', '算法面试'],
    teaser: '"说出笨方法、分析它的问题、往更好的方向推一步——每一件都比沉默值钱"',
  },
]

/* Total video count randomized once per component mount (20–30) */

export default function UpsaleServices() {
  const [email, setEmail] = useState('')
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const [totalVideos] = useState(() => 20 + Math.floor(Math.random() * 11))

  function handleServiceClick() {
    setShowEmailInput(true)
  }

  function handleSubmitEmail() {
    if (!email.trim()) return
    let emails: unknown[] = []
    try { emails = JSON.parse(localStorage.getItem('waitlist_emails') || '[]') } catch { /* ignore */ }
    emails.push({ email, date: new Date().toISOString() })
    localStorage.setItem('waitlist_emails', JSON.stringify(emails))
    setSubmitted(true)
    setTimeout(() => { setSubmitted(false); setShowEmailInput(false) }, 2000)
  }

  return (
    <div className="space-y-10">
      {/* ══════════════════════════════════════════ */}
      {/* Section 1: Three service cards            */}
      {/* ══════════════════════════════════════════ */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 text-center mb-1">更多求职服务</h2>
        <p className="text-center text-sm mb-6" style={{ color: '#6B7280' }}>从简历到入职，全流程覆盖</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {services.map((service, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white shadow-sm text-center relative"
              style={{ border: '1px solid #E5E7EB', borderRadius: '16px', padding: '28px 24px' }}
            >
              {service.badge && (
                <span
                  className="absolute text-xs font-semibold px-3 py-1 rounded-full"
                  style={{
                    top: '-10px', left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: i === 2 ? '#FFF7ED' : '#F0FDF4',
                    color: i === 2 ? '#C2410C' : '#166534',
                    border: `1px solid ${i === 2 ? '#FDBA74' : '#BBF7D0'}`,
                  }}
                >
                  {service.badge}
                </span>
              )}
              <span className="text-4xl">{service.icon}</span>
              <h3 className="font-bold mt-3" style={{ color: '#1A1A1A' }}>{service.title}</h3>
              <div className="text-2xl font-bold mt-2" style={{ color: '#1A1A1A' }}>
                {service.price}
              </div>
              <p className="text-sm mt-2" style={{ color: '#6B7280' }}>{service.desc}</p>
              {service.subdesc && (
                <p className="text-xs mt-1 font-medium" style={{ color: '#C2410C' }}>{service.subdesc}</p>
              )}
              <Button
                onClick={handleServiceClick}
                className="w-full text-white rounded-lg mt-4"
                style={{ backgroundColor: '#2A6041', borderRadius: '8px' }}
              >
                {service.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Email collection */}
      {showEmailInput && !submitted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-lg text-center"
          style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}
        >
          <p className="text-gray-700 mb-3">功能即将上线，留下邮箱获取优先体验</p>
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              placeholder="你的邮箱地址"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': '#2A6041' } as React.CSSProperties}
            />
            <Button onClick={handleSubmitEmail} className="text-white" style={{ backgroundColor: '#2A6041' }}>
              提交
            </Button>
          </div>
        </motion.div>
      )}
      {submitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4 text-center"
        >
          <p className="text-green-700">已收到！我们会第一时间通知你</p>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════ */}
      {/* Section 2: Interview coaching videos      */}
      {/* ══════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white"
        style={{ border: '1px solid #E5E7EB', borderRadius: '20px', overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="text-center" style={{ padding: '32px 24px 0' }}>
          <div
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: '#FFF7ED', color: '#C2410C', border: '1px solid #FDBA74' }}
          >
            🔥 收到面试通知了？
          </div>
          <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>针对你的简历定制面试攻略</h2>
          <p className="text-sm mt-2 max-w-lg mx-auto" style={{ color: '#6B7280' }}>
            基于你的简历内容与目标岗位，匹配最相关的大厂导师视角——面试技巧、内部潜规则、踩坑预警、小秘诀，多维度帮你拿下 offer
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1 mt-4 text-xs" style={{ color: '#6B7280' }}>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />大厂内幕 & 潜规则</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />面试官亲授框架</span>
            <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5 text-green-500" />针对你的简历定制</span>
          </div>
        </div>

        {/* Video grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5" style={{ padding: '24px' }}>
          {videos.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="group cursor-pointer"
              onClick={() => setActiveVideo(activeVideo === v.id ? null : v.id)}
            >
              {/* Thumbnail */}
              <div
                className="relative rounded-xl overflow-hidden flex items-center justify-center"
                style={{
                  height: '160px',
                  background: i === 0
                    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
                    : i === 1
                    ? 'linear-gradient(135deg, #1a2332 0%, #0d1b2a 100%)'
                    : 'linear-gradient(135deg, #1b2a1a 0%, #0d1f1a 100%)',
                }}
              >
                {/* Play button */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
                >
                  <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                </div>
                {/* Duration badge */}
                <span
                  className="absolute bottom-2 right-2 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <Clock className="w-3 h-3" />{v.duration}
                </span>
                {/* Lock overlay for videos 2,3 */}
                {i > 0 && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
                  >
                    <Lock className="w-6 h-6 text-white opacity-70" />
                  </div>
                )}
                {/* Episode label */}
                <span
                  className="absolute top-2 left-2 text-white text-xs font-semibold px-2 py-0.5 rounded"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  EP.{i + 1}
                </span>
              </div>

              {/* Info */}
              <div className="mt-3">
                <h4 className="font-bold text-sm" style={{ color: '#1A1A1A' }}>{v.title}</h4>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{v.subtitle}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: '#2A6041' }}
                  >
                    {v.company[0]}
                  </div>
                  <span className="text-xs font-medium" style={{ color: '#9CA3AF' }}>{v.mentorLabel}</span>
                </div>
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {v.tags.map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {/* Teaser quote (expand on click) */}
                {activeVideo === v.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 text-xs italic rounded-lg p-2.5"
                    style={{ backgroundColor: '#F9FAFB', color: '#4B5563', borderLeft: '3px solid #2A6041' }}
                  >
                    {v.teaser}
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="text-center"
          style={{ padding: '0 24px 28px' }}
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex -space-x-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <span className="text-xs" style={{ color: '#6B7280' }}>&ldquo;比花几千块上课有用多了&rdquo; — 2026届学员</span>
          </div>
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-sm line-through" style={{ color: '#9CA3AF' }}>$2,999</span>
            <span className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>$1,999</span>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
            >
              限时优惠
            </span>
          </div>
          <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>{totalVideos}集完整视频 · 含框架模板 · 终身回看</p>
          <Button
            onClick={handleServiceClick}
            className="text-white font-semibold text-base h-12 px-10 rounded-xl shadow-lg transition-transform hover:scale-105"
            style={{ backgroundColor: '#2A6041' }}
          >
            解锁全部面试攻略 →
          </Button>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════ */}
      {/* Bottom: Custom bundle                     */}
      {/* ══════════════════════════════════════════ */}
      <div className="rounded-2xl p-8 text-center text-white" style={{ backgroundColor: '#0E2620' }}>
        <div className="text-sm opacity-80 mb-2">全套求职服务包</div>
        <h3 className="text-2xl font-bold mb-2">定制化服务包</h3>
        <p className="text-sm opacity-80 mb-2">1on1导师精修 + 简历代投 + 保岗实习 + 面试攻略</p>
        <p className="text-base font-semibold mb-5" style={{ color: '#C6E04B' }}>保岗保证</p>
        <Button
          onClick={handleServiceClick}
          className="text-white font-bold text-lg h-14 px-12 rounded-xl"
          style={{ backgroundColor: '#2A6041' }}
        >
          联系我们 →
        </Button>
      </div>
    </div>
  )
}
