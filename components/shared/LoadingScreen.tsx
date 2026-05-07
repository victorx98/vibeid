'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Loader2, Circle, Sparkles } from 'lucide-react'

// ─── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  label: string
  desc: string
  stage: 'parsing' | 'analyzing' | 'optimizing-1' | 'optimizing-2'
}

const analyzeSteps: Step[] = [
  { label: '解析简历',  desc: '提取简历内容、结构与关键信息',            stage: 'parsing'   },
  { label: 'ATS 评分', desc: '评估简历在目标岗位的竞争力与通过率',       stage: 'analyzing' },
  // { label: '匹配导师',  desc: '从 500+ 导师经验中筛选最相关背景',        stage: 'analyzing' },  // DISABLED - mentor feature temporarily disabled
  // { label: '生成建议',  desc: '结合导师视角输出个性化优化建议',           stage: 'analyzing' },  // DISABLED - will be re-enabled after mentor advice optimization
]

const optimizeSteps: Step[] = [
  { label: '理解岗位',  desc: '识别岗位重点与简历差距',                  stage: 'optimizing-1' },
  { label: '优化内容',  desc: '分模块强化表达与 ATS 匹配度',             stage: 'optimizing-1' },
  { label: '校对结果',  desc: '统一重点信息与语气，消除硬伤',             stage: 'optimizing-2' },
  { label: '生成结果',  desc: '写入优化版本并准备展示',                   stage: 'optimizing-2' },
]

// ─── Live messages ────────────────────────────────────────────────────────────

const analyzeMessages: Record<'parsing' | 'analyzing', string[]> = {
  parsing: [
    '正在读取简历文件...',
    '正在提取工作经历...',
    '正在识别技能关键词...',
    '正在解析教育背景...',
  ],
  analyzing: [
    '正在匹配 Google 导师经验...',
    '正在匹配 Amazon 导师经验...',
    '正在匹配 TikTok 导师经验...',
    '正在评估 ATS 兼容性...',
    '正在分析竞争力指标...',
    '正在生成导师筛选策略...',
    '正在整合个性化建议...',
    '正在评估项目描述质量...',
    '即将完成分析...',
  ],
}

const optimizeMessages: Record<'optimizing-1' | 'optimizing-2', string[]> = {
  'optimizing-1': [
    '正在分析目标岗位需求...',
    '正在识别简历与 JD 的差距...',
    '正在优化工作经历描述...',
    '正在强化数据量化表达...',
    '正在调整关键词密度...',
  ],
  'optimizing-2': [
    '正在优化项目描述...',
    '正在校对整体语气一致性...',
    '正在生成 ATS 友好格式...',
    '正在最终审核...',
    '即将完成优化...',
  ],
}

// ─── Progress targets per stage ───────────────────────────────────────────────

const PROGRESS = {
  // analyze mode
  parsing:        { jump: 5,  target: 28, label: '解析简历中', eta: '约 5–10 秒' },
  analyzing:      { jump: 32, target: 90, label: '深度分析中', eta: '约 20–35 秒' },
  // optimize mode
  'optimizing-1': { jump: 5,  target: 48, label: '内容优化中', eta: '约 10–15 秒' },
  'optimizing-2': { jump: 52, target: 90, label: '最终校对中', eta: '约 10–15 秒' },
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  mode?: 'analyze' | 'optimize'
  /** Real API stage — drives actual progress bar position */
  stage?: 'parsing' | 'analyzing' | 'optimizing-1' | 'optimizing-2'
  /** When true: animate bar to 100%, mark all steps done, then call onCompleted */
  completed?: boolean
  onCompleted?: () => void
}

export default function LoadingScreen({ mode = 'analyze', stage, completed, onCompleted }: Props) {
  const steps    = mode === 'optimize' ? optimizeSteps : analyzeSteps
  const isAnalyze = mode === 'analyze'

  // ── Real progress bar ──────────────────────────────────────────────────────
  const [progress, setProgress] = useState(3)

  // Resolve current stage key
  const stageKey = stage ?? (mode === 'optimize' ? 'optimizing-1' : 'parsing')
  const stageInfo = PROGRESS[stageKey]

  // On stage change: jump to new anchor, then crawl toward target
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setProgress(stageInfo.jump)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [stageKey, stageInfo.jump])

  // Crawl: every 500ms inch closer to target (never reaches it — API will call onCompleted)
  useEffect(() => {
    if (completed) return
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= stageInfo.target) return p
        const remaining = stageInfo.target - p
        return p + Math.min(remaining * 0.06, 0.9)
      })
    }, 500)
    return () => clearInterval(id)
  }, [stageKey, stageInfo.target, completed])

  // When completed: jump to 100% then call onCompleted after animation
  useEffect(() => {
    if (!completed) return
    const frame = window.requestAnimationFrame(() => {
      setProgress(100)
    })
    const id = setTimeout(() => {
      onCompleted?.()
    }, 750)
    return () => {
      window.cancelAnimationFrame(frame)
      clearTimeout(id)
    }
  }, [completed, onCompleted])

  // Cap at 99 normally, allow 100 only when completed
  const displayPct = completed ? 100 : Math.round(Math.min(progress, 99))

  // ── Step completion ────────────────────────────────────────────────────────

  // Sub-step drip within the "analyzing" block — only drip when not completed
  const [analyzingSubStep, setAnalyzingSubStep] = useState(0)
  useEffect(() => {
    if (stageKey !== 'analyzing' || completed) {
      const frame = window.requestAnimationFrame(() => {
        setAnalyzingSubStep(0)
      })
      return () => window.cancelAnimationFrame(frame)
    }
    const id = setInterval(() => {
      setAnalyzingSubStep(s => Math.min(s + 1, 2))
    }, 3000)
    return () => clearInterval(id)
  }, [stageKey, completed])

  // Sub-step drip within optimize stages (one active step at a time per stage)
  const [optimizingSubStep, setOptimizingSubStep] = useState(0)
  useEffect(() => {
    if (!stageKey.startsWith('optimizing')) {
      const frame = window.requestAnimationFrame(() => {
        setOptimizingSubStep(0)
      })
      return () => window.cancelAnimationFrame(frame)
    }
    const resetFrame = window.requestAnimationFrame(() => {
      setOptimizingSubStep(0)
    })
    const id = setInterval(() => {
      setOptimizingSubStep(s => Math.min(s + 1, 1))
    }, 8000)
    return () => {
      window.cancelAnimationFrame(resetFrame)
      clearInterval(id)
    }
  }, [stageKey])

  function analyzeSubStatus(step: Step, index: number): 'done' | 'active' | 'pending' {
    if (stageKey === 'parsing') {
      if (step.stage === 'parsing') return 'active'
      return 'pending'
    }
    // analyzing stage
    if (step.stage === 'parsing') return 'done'
    // If completed, all steps are done
    if (completed) return 'done'
    // analyzing sub-steps: keep first one active, others pending until completed
    // This way steps don't show complete prematurely
    const subIndex = index - 1
    if (subIndex === 0) return 'active'
    return 'pending'
  }

  function optimizeSubStatus(step: Step, index: number): 'done' | 'active' | 'pending' {
    if (stageKey === 'optimizing-1') {
      if (step.stage === 'optimizing-2') return 'pending'
      // optimizing-1 sub-steps: index 0 and 1
      if (index < optimizingSubStep) return 'done'
      if (index === optimizingSubStep) return 'active'
      return 'pending'
    }
    // stageKey === 'optimizing-2'
    if (step.stage === 'optimizing-1') return 'done'
    // optimizing-2 sub-steps: index 2 and 3 → relative 0 and 1
    const subIndex = index - 2
    if (subIndex < optimizingSubStep) return 'done'
    if (subIndex === optimizingSubStep) return 'active'
    return 'pending'
  }

  // ── Live messages ─────────────────────────────────────────────────────────
  const msgs = isAnalyze
    ? (analyzeMessages[stageKey as 'parsing' | 'analyzing'] ?? analyzeMessages.analyzing)
    : (optimizeMessages[stageKey as 'optimizing-1' | 'optimizing-2'] ?? optimizeMessages['optimizing-2'])

  const [msgIdx, setMsgIdx] = useState(0)
  const [liveMsg, setLiveMsg] = useState(msgs[0])
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMsgIdx(0)
      setLiveMsg(msgs[0])
    })
    return () => window.cancelAnimationFrame(frame)
  }, [stageKey, msgs])   // reset on stage change

  useEffect(() => {
    if (completed) return
    const id = setInterval(() => {
      setMsgIdx(i => {
        const next = (i + 1) % msgs.length
        setLiveMsg(msgs[next])
        return next
      })
    }, 2000)
    return () => clearInterval(id)
  }, [msgs, completed])

  // ── Elapsed time ──────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const completedLabel = mode === 'optimize' ? '优化完成！' : '分析完成！'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#F7F5EF' }}>
      <div className="w-full max-w-md mx-auto px-5">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#E8F5EC' }}>
            <Sparkles className="w-7 h-7" style={{ color: '#2A6041' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
              {mode === 'optimize' ? 'AI智能优化中' : 'AI智能分析中'}
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {mode === 'optimize' ? '正在结合目标岗位打磨这份简历' : '正在结合导师经验深度分析简历'}
            </p>
          </div>
        </motion.div>

        {/* ── Real progress bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 mb-4"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB' }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {completed
                ? <CheckCircle className="w-4 h-4" style={{ color: '#2A6041' }} />
                : <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#2A6041' }} />
              }
              <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                {completed ? completedLabel : stageInfo.label}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {!completed && <span className="text-xs" style={{ color: '#9CA3AF' }}>{stageInfo.eta}</span>}
              <span className="text-sm font-bold tabular-nums" style={{ color: '#2A6041' }}>
                {displayPct}%
              </span>
            </div>
          </div>

          {/* Progress bar track */}
          <div className="rounded-full overflow-hidden" style={{ height: 8, backgroundColor: '#F3F4F6' }}>
            <motion.div
              className="h-full rounded-full"
              animate={{ width: `${displayPct}%` }}
              transition={{ duration: completed ? 0.4 : 0.6, ease: 'easeOut' }}
              style={{
                background: 'linear-gradient(90deg, #2A6041 0%, #34D399 100%)',
              }}
            />
          </div>

          {/* Live message */}
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${completed ? '' : 'animate-pulse'}`}
              style={{ backgroundColor: '#2A6041' }}
            />
            <AnimatePresence mode="wait">
              <motion.p
                key={completed ? 'done' : msgIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="text-xs"
                style={{ color: completed ? '#2A6041' : '#6B7280', fontWeight: completed ? 500 : 400 }}
              >
                {completed ? (mode === 'optimize' ? '简历已优化完毕，即将跳转...' : '分析完成，正在生成报告...') : liveMsg}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Step list ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-5"
          style={{ backgroundColor: '#ffffff', border: '1px solid #E5E7EB' }}
        >
          <h3 className="font-semibold text-sm mb-4" style={{ color: '#1A1A1A' }}>
            {mode === 'optimize' ? '优化进度' : '分析进度'}
          </h3>
          <div className="space-y-4">
            {steps.map((step, i) => {
              const rawStatus = isAnalyze ? analyzeSubStatus(step, i) : optimizeSubStatus(step, i)
              const status    = completed ? 'done' : rawStatus
              const isDone    = status === 'done'
              const isActive  = status === 'active'
              const isPending = status === 'pending'

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  className="flex items-center gap-4"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                    {isDone && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 350 }}>
                        <CheckCircle className="w-6 h-6" style={{ color: '#2A6041' }} />
                      </motion.div>
                    )}
                    {isActive && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E8F5EC' }}>
                        <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#2A6041' }} />
                      </div>
                    )}
                    {isPending && <Circle className="w-6 h-6" style={{ color: '#D1D5DB' }} />}
                  </div>

                  {/* Text + connector line */}
                  <div className="flex-1 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: isPending ? '#9CA3AF' : '#1A1A1A' }}>
                        {step.label}
                      </div>
                      <div className="text-xs" style={{ color: isPending ? '#D1D5DB' : '#6B7280' }}>
                        {step.desc}
                      </div>
                    </div>
                    {isDone && (
                      <span className="text-xs font-medium" style={{ color: '#2A6041' }}>完成</span>
                    )}
                    {isActive && (
                      <span className="text-xs animate-pulse" style={{ color: '#2A6041' }}>进行中…</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Elapsed time */}
          <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid #F3F4F6' }}>
            <span className="text-xs" style={{ color: '#D1D5DB' }}>已用时 {elapsed}s</span>
            <span className="text-xs" style={{ color: '#D1D5DB' }}>请保持网络连接</span>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
