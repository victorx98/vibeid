'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const stories = [
  {
    name: 'Sarah L.',
    school: 'USC',
    role: 'PM',
    before: '投了 80 份简历，只拿到 1 个面试',
    after: '优化后投 25 份，拿到 8 个面试',
    ats: '54 → 87',
  },
  {
    name: 'Marcus W.',
    school: 'UCLA',
    role: 'SWE',
    before: '60 份投递，3 个面试',
    after: '25 份投递，12 个面试',
    ats: '61 → 92',
  },
  {
    name: 'Jennifer C.',
    school: 'CMU',
    role: 'DS',
    before: '投了 45 份，0 回复',
    after: '优化后投 20 份，拿到 6 个面试，最终拿到 Google offer',
    ats: '48 → 89',
  },
]

function StudentStories() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setActive(i => (i + 1) % stories.length), 4000)
    return () => clearInterval(timer)
  }, [])

  const s = stories[active]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      style={{ marginTop: '40px', width: '100%', maxWidth: '560px' }}
    >
      <div
        className="relative rounded-2xl p-5 text-left"
        style={{ backgroundColor: '#fff', border: '1px solid #E5E7EB' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: '#2A6041' }}>
              {s.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{s.name}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{s.school} · {s.role}</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>
            ATS {s.ats}
          </span>
        </div>

        {/* Before → After */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg p-3" style={{ backgroundColor: '#FEF2F2' }}>
            <p className="font-medium text-red-400 mb-1">Before</p>
            <p style={{ color: '#6B7280' }}>{s.before}</p>
          </div>
          <div className="rounded-lg p-3" style={{ backgroundColor: '#F0FDF4' }}>
            <p className="font-medium mb-1" style={{ color: '#2A6041' }}>After</p>
            <p style={{ color: '#1A1A1A', fontWeight: 500 }}>{s.after}</p>
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-3">
          {stories.map((_, i) => (
            <button key={i} onClick={() => setActive(i)}
              className="rounded-full transition-all"
              style={{
                width: i === active ? '20px' : '6px',
                height: '6px',
                backgroundColor: i === active ? '#2A6041' : '#D1D5DB',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default function HeroSection() {
  const [count, setCount] = useState(12000)

  useEffect(() => {
    const timer = setInterval(() => setCount(c => c + 1), 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section
      className="flex flex-col items-center text-center"
      style={{
        paddingTop: '120px',
        paddingBottom: '96px',
        paddingLeft: '24px',
        paddingRight: '24px',
        maxWidth: '1100px',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}
    >
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h1-hero"
        style={{ marginBottom: '20px' }}
      >
        简历<span style={{ fontSize: '1.15em' }}>石</span>沉大海？
        <br />
        <span style={{ fontSize: '1.1em' }}>大厂导师</span>智慧核心
        <br />
        联合帮你<span className="keyword-underline" style={{ fontSize: '1.15em', padding: '0 2px' }}>升级简历</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="body-text"
        style={{ marginBottom: '36px' }}
      >
        500+大厂导师实战经验 × AI精准分析，30秒定位简历短板，给你可落地的优化方案
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-4"
        style={{ marginBottom: '32px' }}
      >
        <a href="#upload" className="btn-primary">
          开始分析
        </a>
        <a href="#trust" className="btn-ghost">
          了解更多
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="inline-flex items-center gap-2"
        style={{
          fontSize: '14px',
          color: '#6B7280',
        }}
      >
        <span
          className="animate-pulse"
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#2A6041',
            display: 'inline-block',
          }}
        />
        已帮助 <span style={{ fontWeight: 700, color: '#1A1A1A' }}>{count.toLocaleString()}</span> 位同学获得面试机会
      </motion.div>

      {/* Student Success Story Carousel */}
      <StudentStories />
    </section>
  )
}
