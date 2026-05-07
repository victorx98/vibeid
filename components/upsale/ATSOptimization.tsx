'use client'

import { CheckCircle, TrendingUp } from 'lucide-react'
import { ATSResult } from '@/lib/types'

const optimizations = [
  { label: '关键词补全', desc: '根据目标岗位 JD 补充缺失的行业关键词，提升 ATS 匹配率' },
  { label: '格式合规优化', desc: '调整为 ATS 友好的单栏格式，确保解析准确' },
  { label: '技能板块重构', desc: '按硬技能/软技能分类，添加熟练度标识' },
  { label: '经历量化改写', desc: '将模糊描述改写为数据驱动的 STAR 格式' },
  { label: '专业排版设计', desc: '符合北美求职标准的简历排版，清晰专业' },
]

export default function ATSOptimization({ atsResult }: { atsResult?: ATSResult }) {
  return (
    <div className="bg-white shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}>
      <div className="px-6 py-4 border-b border-gray-100" style={{ backgroundColor: '#F0F7F2' }}>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{ color: '#2A6041' }} />
          <h3 className="font-bold" style={{ color: '#1A1A1A' }}>ATS 优化详情</h3>
        </div>
        {atsResult && (
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            原始评分 <span className="font-bold" style={{ color: '#DC2626' }}>{atsResult.ats_score ?? atsResult.final_score}</span>/100
            → 优化后预估 <span className="font-bold" style={{ color: '#2A6041' }}>{Math.min((atsResult.ats_score ?? atsResult.final_score ?? 50) + 25, 95)}</span>/100
          </p>
        )}
      </div>

      <div className="p-6 space-y-4">
        {optimizations.map((opt, i) => (
          <div key={i} className="flex items-start gap-3">
            <CheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" style={{ color: '#2A6041' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{opt.label}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{opt.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
