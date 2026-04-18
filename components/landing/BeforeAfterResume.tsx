'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const beforeResume = {
  name: 'Zhang Wei',
  title: 'Looking for a job in data science',
  summary:
    'I am a recent graduate with a degree in computer science. I have some experience with Python and machine learning. I am looking for a data science role at a tech company.',
  experience: [
    {
      company: 'University Research Lab',
      role: 'Research Assistant',
      date: '2023 - 2024',
      bullets: [
        'Helped with data analysis projects',
        'Used Python to process data',
        'Worked on machine learning models',
        'Did some data visualization',
      ],
    },
    {
      company: 'Tech Startup',
      role: 'Intern',
      date: 'Summer 2023',
      bullets: [
        'Worked on various tasks assigned by manager',
        'Learned about data pipelines',
        'Participated in team meetings',
      ],
    },
  ],
  skills: 'Python, SQL, Machine Learning, Excel, PowerPoint, Teamwork',
}

const afterResume = {
  name: 'Zhang Wei',
  title: 'Data Scientist | ML Engineer | NLP Specialist',
  summary:
    'Data scientist with 2+ years of hands-on experience in machine learning and NLP, specializing in building production-grade predictive models. Delivered 23% improvement in model accuracy for research lab; seeking to leverage deep expertise in Python, TensorFlow, and big data pipelines at a top-tier tech company.',
  experience: [
    {
      company: 'University Research Lab',
      role: 'Machine Learning Research Analyst',
      date: '2023 - 2024',
      bullets: [
        'Built end-to-end NLP pipeline processing 500K+ documents, improving text classification accuracy by 23%',
        'Engineered feature extraction system using Python & Scikit-learn, reducing model training time by 40%',
        'Designed interactive Tableau dashboards adopted by 3 research teams for real-time experiment tracking',
        'Co-authored research paper on transformer-based models, accepted at ACL 2024 Workshop',
      ],
    },
    {
      company: 'Tech Startup (Series B)',
      role: 'Data Science Intern',
      date: 'Summer 2023',
      bullets: [
        'Architected automated ETL pipeline using Apache Airflow, processing 2M+ daily records with 99.7% reliability',
        'Developed customer churn prediction model (AUC 0.89) that influenced $500K retention strategy',
        'Presented weekly data insights to C-suite, directly impacting 3 product roadmap decisions',
      ],
    },
  ],
  skills:
    'Python, TensorFlow, PyTorch, Scikit-learn, SQL, Apache Spark, Airflow, Tableau, NLP, Deep Learning, A/B Testing, Statistical Modeling',
}

function ResumeCard({
  data,
  variant,
}: {
  data: typeof beforeResume
  variant: 'before' | 'after'
}) {
  const isAfter = variant === 'after'

  return (
    <div
      className="bg-white rounded-lg overflow-hidden text-left w-full"
      style={{
        border: '1px solid #E5E7EB',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        maxWidth: '560px',
      }}
    >
      {/* Header bar */}
      <div
        className="px-6 py-3 flex items-center justify-between"
        style={{
          backgroundColor: isAfter ? '#0E2620' : '#F3F4F6',
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <span
          className="text-xs font-bold tracking-wide uppercase"
          style={{ color: isAfter ? '#C6E04B' : '#6B7280' }}
        >
          {isAfter ? '✦ 优化后' : '优化前'}
        </span>
        {isAfter && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#C6E04B', color: '#0E2620' }}
          >
            ATS 92分
          </span>
        )}
        {!isAfter && (
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
          >
            ATS 41分
          </span>
        )}
      </div>

      {/* Resume body */}
      <div className="px-6 py-5 space-y-4" style={{ fontSize: '12.5px', lineHeight: 1.65 }}>
        {/* Name & Title */}
        <div className="text-center border-b pb-4" style={{ borderColor: '#E5E7EB' }}>
          <h3
            className="font-bold"
            style={{ fontSize: '16px', color: '#1A1A1A', marginBottom: '2px' }}
          >
            {data.name}
          </h3>
          <p
            style={{
              color: isAfter ? '#2A6041' : '#9CA3AF',
              fontWeight: isAfter ? 600 : 400,
              fontSize: '12px',
            }}
          >
            {data.title}
          </p>
        </div>

        {/* Summary */}
        <div>
          <div
            className="font-bold uppercase tracking-wide mb-1"
            style={{ fontSize: '10px', color: '#6B7280' }}
          >
            Summary
          </div>
          <p style={{ color: '#374151' }}>
            {isAfter ? (
              <span>
                {data.summary.split(/(\d+[\w%+]*)/g).map((part, i) =>
                  /\d/.test(part) ? (
                    <span key={i} style={{ color: '#2A6041', fontWeight: 600 }}>
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </span>
            ) : (
              data.summary
            )}
          </p>
        </div>

        {/* Experience */}
        <div>
          <div
            className="font-bold uppercase tracking-wide mb-2"
            style={{ fontSize: '10px', color: '#6B7280' }}
          >
            Experience
          </div>
          {data.experience.map((exp, idx) => (
            <div key={idx} className={idx > 0 ? 'mt-3' : ''}>
              <div className="flex items-center justify-between">
                <span className="font-semibold" style={{ color: '#1A1A1A', fontSize: '12px' }}>
                  {exp.role}
                </span>
                <span style={{ color: '#9CA3AF', fontSize: '11px' }}>{exp.date}</span>
              </div>
              <div style={{ color: '#6B7280', fontSize: '11px', marginBottom: '4px' }}>
                {exp.company}
              </div>
              <ul className="space-y-1" style={{ paddingLeft: '14px' }}>
                {exp.bullets.map((b, j) => (
                  <li
                    key={j}
                    style={{
                      color: '#374151',
                      listStyleType: 'disc',
                    }}
                  >
                    {isAfter ? (
                      <span>
                        {b.split(/(\d+[\w%+$.K]*)/g).map((part, i) =>
                          /\d/.test(part) ? (
                            <span key={i} style={{ color: '#2A6041', fontWeight: 600 }}>
                              {part}
                            </span>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </span>
                    ) : (
                      b
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Skills */}
        <div>
          <div
            className="font-bold uppercase tracking-wide mb-1"
            style={{ fontSize: '10px', color: '#6B7280' }}
          >
            Skills
          </div>
          <p style={{ color: '#374151' }}>{data.skills}</p>
        </div>
      </div>
    </div>
  )
}

export default function BeforeAfterResume() {
  const [showAfter, setShowAfter] = useState(false)

  return (
    <section style={{ paddingTop: '80px', paddingBottom: '80px', backgroundColor: '#F7F5EF' }}>
      <div
        className="mx-auto"
        style={{ maxWidth: '1100px', paddingLeft: '24px', paddingRight: '24px' }}
      >
        {/* Section heading */}
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <p
            className="section-label"
            style={{ marginBottom: '12px', color: '#2A6041', fontWeight: 600 }}
          >
            真实效果展示
          </p>
          <h2 className="h2-section" style={{ marginBottom: '16px' }}>
            一键优化，效果立竿见影
          </h2>
          <p className="body-text" style={{ maxWidth: '520px', margin: '0 auto' }}>
            同一份简历，优化前后对比。数据量化 + 专业措辞，让 ATS 评分从 41 飙升到 92。
          </p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center" style={{ marginBottom: '32px' }}>
          <div
            className="inline-flex items-center rounded-full p-1"
            style={{ backgroundColor: '#E5E7EB' }}
          >
            <button
              onClick={() => setShowAfter(false)}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: !showAfter ? '#ffffff' : 'transparent',
                color: !showAfter ? '#1A1A1A' : '#6B7280',
                boxShadow: !showAfter ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              优化前
            </button>
            <button
              onClick={() => setShowAfter(true)}
              className="px-6 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                backgroundColor: showAfter ? '#0E2620' : 'transparent',
                color: showAfter ? '#C6E04B' : '#6B7280',
                boxShadow: showAfter ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              优化后 ✦
            </button>
          </div>
        </div>

        {/* Resume display */}
        <div className="flex justify-center">
          <AnimatePresence mode="wait">
            {!showAfter ? (
              <motion.div
                key="before"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center w-full"
              >
                <ResumeCard data={beforeResume} variant="before" />
              </motion.div>
            ) : (
              <motion.div
                key="after"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex justify-center w-full"
              >
                <ResumeCard data={afterResume} variant="after" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom CTA hint */}
        <div className="text-center" style={{ marginTop: '28px' }}>
          <p style={{ fontSize: '13px', color: '#6B7280' }}>
            {showAfter
              ? '数据量化 · 关键词优化 · ATS 友好格式 — 导师经验驱动'
              : '点击「优化后」查看 AI + 导师经验联合优化的效果 →'}
          </p>
        </div>
      </div>
    </section>
  )
}
