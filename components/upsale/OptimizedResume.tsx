'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Download, Globe, Eye, EyeOff, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Teal-style resume color ────────────────────────────────────────
const TEAL = '#0D9488'
const HIGHLIGHT_BG = '#DCFCE7'
const HIGHLIGHT_COLOR = '#166534'
const HIGHLIGHT_BORDER = '#86EFAC'
const FONT = 'Georgia, "Times New Roman", serif'

// ── Types ──────────────────────────────────────────────────────────
interface ContactInfo {
  name: string
  details: string
}

interface ExperienceEntry {
  company: string
  title: string
  date: string
  location: string
  bullets: string[]
}

interface EducationEntry {
  degree: string
  school: string
  date: string
  location: string
  details: string[]
}

interface SkillEntry {
  label: string
  value: string
}

type SectionType = 'experience' | 'education' | 'skills' | 'projects' | 'generic'

interface ResumeSection {
  type: SectionType
  title: string
  experienceEntries: ExperienceEntry[]
  educationEntries: EducationEntry[]
  skillEntries: SkillEntry[]
  genericLines: string[]
}

interface ParsedResume {
  contact: ContactInfo
  sections: ResumeSection[]
  highlightCount: number
}

// ── Highlight renderer ─────────────────────────────────────────────
function HighlightedText({ text, show }: { text: string; show: boolean }) {
  if (!/\[\[highlight\]\]/i.test(text)) return <>{text}</>

  const parts: React.ReactNode[] = []
  const regex = /\[\[highlight\]\](.*?)\[\[\/highlight\]\]/gi
  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>)
    }
    parts.push(
      show ? (
        <span
          key={`h${match.index}`}
          className="relative inline px-0.5 rounded-sm font-medium transition-all duration-300"
          style={{ backgroundColor: HIGHLIGHT_BG, color: HIGHLIGHT_COLOR, borderBottom: `2px solid ${HIGHLIGHT_BORDER}` }}
        >
          {match[1]}
        </span>
      ) : (
        <span key={`h${match.index}`}>{match[1]}</span>
      )
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>)
  return <>{parts}</>
}

function countHighlights(text: string): number {
  return (text.match(/\[\[highlight\]\]/gi) || []).length
}

// ── Robust Markdown Parser ─────────────────────────────────────────
// Design: NEVER drop content. If a line can't be parsed, render as generic text.
function parseResumeMarkdown(md: string): ParsedResume {
  const lines = md.split('\n')
  let highlightCount = 0

  // Count all highlights upfront
  highlightCount = countHighlights(md)

  // Helper: clean ** but keep [[highlight]]
  const clean = (s: string) => s.replace(/\*\*/g, '').trim()

  // ─ Pass 1: Extract name & contact from top ─
  let i = 0
  let name = ''
  let details = ''

  // Skip leading blank lines
  while (i < lines.length && !lines[i].trim()) i++

  // Name: # heading or first non-empty line
  if (i < lines.length) {
    const first = lines[i].trim()
    if (first.startsWith('# ')) {
      name = clean(first.replace(/^#+\s*/, ''))
    } else {
      name = clean(first)
    }
    i++
  }

  // Skip blanks
  while (i < lines.length && !lines[i].trim()) i++

  // Contact: lines before first ## that contain @ or phone patterns or |
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line || line.startsWith('##')) break
    if (line.includes('@') || line.includes('|') || line.match(/\(\d{3}\)|\d{3}[-.)]/)) {
      details = clean(line).replace(/\s*\|\s*/g, ' • ')
      i++
    } else {
      break
    }
  }

  // ─ Pass 2: Parse sections ─
  const sections: ResumeSection[] = []

  const inferType = (title: string): SectionType => {
    const t = title.toLowerCase()
    if (t.includes('experience') || t.includes('经历') || t.includes('实习') || t.includes('work') || t.includes('internship')) return 'experience'
    if (t.includes('education') || t.includes('教育')) return 'education'
    if (t.includes('skill') || t.includes('技能')) return 'skills'
    if (t.includes('project') || t.includes('项目')) return 'projects'
    return 'generic'
  }

  // Is this line a bullet? (starts with - or • or * followed by space)
  const isBullet = (line: string) => /^[-•*]\s/.test(line.trim())
  const bulletText = (line: string) => line.trim().replace(/^[-•*]\s+/, '')

  // Is this a company/org header? (starts with ** or is ALL CAPS with no bullet)
  const isOrgHeader = (line: string) => {
    const t = line.trim()
    if (t.startsWith('-') || t.startsWith('•') || t.startsWith('* ')) return false
    // **Company** — Location | Date  OR  **Company** | Date
    if (/^\*\*[^*]+\*\*/.test(t)) return true
    return false
  }

  // Parse a company header: **Company** — Location | Date
  const parseOrgHeader = (line: string): { org: string; location: string; date: string } => {
    const t = line.trim()
    // Match: **Name** — Location | Date  or  **Name** — Date  or  **Name** | Date
    const m = t.match(/^\*\*(.*?)\*\*\s*[—–\-|]\s*(.*)/)
    if (m) {
      const org = m[1].trim()
      const rest = m[2].trim()
      // rest could be "Location | Date" or just "Date"
      const parts = rest.split(/\s*\|\s*/)
      if (parts.length >= 2) {
        // Check which part looks like a date
        const datePattern = /\d{4}|present|现在|至今/i
        if (datePattern.test(parts[parts.length - 1])) {
          return { org, location: parts.slice(0, -1).join(' | '), date: parts[parts.length - 1] }
        }
        return { org, location: parts[0], date: parts.slice(1).join(' | ') }
      }
      return { org, location: '', date: rest }
    }
    // Just **Name**
    const m2 = t.match(/^\*\*(.*?)\*\*/)
    if (m2) return { org: m2[1].trim(), location: '', date: '' }
    return { org: clean(t), location: '', date: '' }
  }

  while (i < lines.length) {
    // Skip blanks
    while (i < lines.length && !lines[i].trim()) i++
    if (i >= lines.length) break

    const line = lines[i].trim()

    // Section header: ## or ###
    if (/^#{2,3}\s/.test(line)) {
      const title = clean(line.replace(/^#+\s*/, ''))
      const type = inferType(title)
      i++

      // Skip --- separator
      while (i < lines.length && (lines[i].trim() === '' || lines[i].trim().startsWith('---'))) i++

      const section: ResumeSection = {
        type,
        title,
        experienceEntries: [],
        educationEntries: [],
        skillEntries: [],
        genericLines: [],
      }

      // Parse content until next ## section
      while (i < lines.length) {
        while (i < lines.length && !lines[i].trim()) i++
        if (i >= lines.length) break
        if (/^#{2,3}\s/.test(lines[i].trim())) break

        const cur = lines[i].trim()

        // ─── Skills section ───
        if (type === 'skills') {
          let content = cur
          if (isBullet(content)) content = bulletText(content)

          // Match: **Label:** Value  or  **Label**: Value  or  Label: Value
          const sm = content.match(/^\*\*(.*?)[：:]\*\*\s*(.*)/) ||
                     content.match(/^\*\*(.*?)\*\*[：:]\s*(.*)/) ||
                     content.match(/^([^:：]{1,30})[：:]\s*(.+)/)
          if (sm) {
            section.skillEntries.push({
              label: sm[1].replace(/\*\*/g, '').trim(),
              value: sm[2].replace(/^\*\*\s*/, '').replace(/\*\*$/g, '').trim(),
            })
          } else {
            section.genericLines.push(content.replace(/\*\*/g, ''))
          }
          i++
          continue
        }

        // ─── Experience / Projects section ───
        if (type === 'experience' || type === 'projects') {
          // Look for org header
          if (isOrgHeader(cur)) {
            const { org, location, date } = parseOrgHeader(cur)
            i++

            // Skip blanks
            while (i < lines.length && !lines[i].trim()) i++

            // Next line might be title/role (non-bullet, non-header, non-section)
            let title = ''
            if (i < lines.length) {
              const next = lines[i].trim()
              if (next && !isBullet(next) && !/^#{2,3}\s/.test(next) && !isOrgHeader(next)) {
                title = clean(next.replace(/\*/g, ''))
                i++
              }
            }

            // Collect bullets
            const bullets: string[] = []
            while (i < lines.length) {
              const bl = lines[i].trim()
              if (!bl) { i++; continue }  // skip empty lines within entry
              if (isBullet(bl)) {
                bullets.push(bulletText(bl).replace(/\*\*/g, ''))
                i++
              } else if (/^#{2,3}\s/.test(bl) || isOrgHeader(bl)) {
                break  // next section or next company
              } else {
                // Continuation line — append to last bullet
                if (bullets.length > 0) {
                  bullets[bullets.length - 1] += ' ' + bl.replace(/\*\*/g, '').trim()
                } else {
                  // Orphan line, add as bullet
                  bullets.push(bl.replace(/\*\*/g, '').trim())
                }
                i++
              }
            }

            section.experienceEntries.push({ company: org, title, date, location, bullets })
          } else if (isBullet(cur)) {
            // Bullet without a company header — add to last entry or create generic
            const text = bulletText(cur).replace(/\*\*/g, '')
            if (section.experienceEntries.length > 0) {
              section.experienceEntries[section.experienceEntries.length - 1].bullets.push(text)
            } else {
              section.genericLines.push(text)
            }
            i++
          } else {
            // Unknown line — don't drop it, add as generic
            section.genericLines.push(cur.replace(/\*\*/g, ''))
            i++
          }
          continue
        }

        // ─── Education section ───
        if (type === 'education') {
          if (isOrgHeader(cur)) {
            const { org, location, date } = parseOrgHeader(cur)
            i++

            while (i < lines.length && !lines[i].trim()) i++

            // Degree line
            let degree = ''
            if (i < lines.length) {
              const next = lines[i].trim()
              if (next && !isBullet(next) && !/^#{2,3}\s/.test(next) && !isOrgHeader(next)) {
                degree = clean(next.replace(/\*/g, ''))
                i++
              }
            }

            // Details bullets
            const details: string[] = []
            while (i < lines.length) {
              const bl = lines[i].trim()
              if (!bl) { i++; continue }
              if (isBullet(bl)) {
                details.push(bulletText(bl).replace(/\*\*/g, ''))
                i++
              } else if (/^#{2,3}\s/.test(bl) || isOrgHeader(bl)) {
                break
              } else {
                details.push(bl.replace(/\*\*/g, '').trim())
                i++
              }
            }

            section.educationEntries.push({ school: org, degree, date, location, details })
          } else if (isBullet(cur)) {
            const text = bulletText(cur).replace(/\*\*/g, '')
            if (section.educationEntries.length > 0) {
              section.educationEntries[section.educationEntries.length - 1].details.push(text)
            } else {
              section.genericLines.push(text)
            }
            i++
          } else {
            section.genericLines.push(cur.replace(/\*\*/g, ''))
            i++
          }
          continue
        }

        // ─── Generic section (certifications, awards, etc.) ───
        if (isBullet(cur)) {
          section.genericLines.push(bulletText(cur).replace(/\*\*/g, ''))
        } else {
          section.genericLines.push(cur.replace(/\*\*/g, ''))
        }
        i++
      }

      sections.push(section)
    } else {
      // Content before any section (shouldn't happen often)
      i++
    }
  }

  return { contact: { name, details }, sections, highlightCount }
}

// ── Sub-components ─────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-bold tracking-widest mt-5 mb-2" style={{ color: TEAL, fontFamily: FONT }}>
      {title.toUpperCase()}
    </h2>
  )
}

function ExperienceBlock({ entry, show }: { entry: ExperienceEntry; show: boolean }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline gap-4">
        <span className="font-bold text-sm text-gray-900 tracking-wide" style={{ fontFamily: FONT }}>
          {entry.company.toUpperCase()}
        </span>
        {entry.date && (
          <span className="text-sm text-gray-700 whitespace-nowrap shrink-0" style={{ fontFamily: FONT }}>
            {entry.date}
          </span>
        )}
      </div>
      {(entry.title || entry.location) && (
        <div className="flex justify-between items-baseline gap-4">
          {entry.title && (
            <span className="font-bold text-sm text-gray-800" style={{ fontFamily: FONT }}>{entry.title}</span>
          )}
          {entry.location && (
            <span className="text-sm text-gray-700 whitespace-nowrap shrink-0" style={{ fontFamily: FONT }}>
              {entry.location}
            </span>
          )}
        </div>
      )}
      {entry.bullets.length > 0 && (
        <ul className="mt-1.5 space-y-1">
          {entry.bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed" style={{ fontFamily: FONT }}>
              <span className="shrink-0 mt-0.5">•</span>
              <span><HighlightedText text={b} show={show} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function EducationBlock({ entry, show }: { entry: EducationEntry; show: boolean }) {
  return (
    <div className="mb-3">
      {entry.degree && (
        <div className="flex justify-between items-baseline gap-4">
          <span className="font-bold text-sm text-gray-900" style={{ fontFamily: FONT }}>
            <HighlightedText text={entry.degree} show={show} />
          </span>
        </div>
      )}
      <div className="flex justify-between items-baseline gap-4">
        <span className="text-sm text-gray-700 tracking-wide" style={{ fontFamily: FONT }}>
          {entry.school.toUpperCase()}
        </span>
        <span className="text-sm text-gray-700 whitespace-nowrap shrink-0" style={{ fontFamily: FONT }}>
          {[entry.location, entry.date].filter(Boolean).join(' • ')}
        </span>
      </div>
      {entry.details.length > 0 && (
        <ul className="mt-1 space-y-0.5">
          {entry.details.map((d, i) => (
            <li key={i} className="flex gap-2 text-sm text-gray-700" style={{ fontFamily: FONT }}>
              <span className="shrink-0">•</span>
              <span><HighlightedText text={d} show={show} /></span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SkillLine({ entry, show }: { entry: SkillEntry; show: boolean }) {
  return (
    <div className="flex gap-1 text-sm mb-1" style={{ fontFamily: FONT }}>
      <span className="shrink-0">•</span>
      <span>
        <span className="font-bold text-gray-900">{entry.label}:</span>{' '}
        <span className="text-gray-700"><HighlightedText text={entry.value} show={show} /></span>
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────

export default function OptimizedResume({ content }: { content: string }) {
  const router = useRouter()
  const parsed = useMemo(() => parseResumeMarkdown(content), [content])
  const [showHL, setShowHL] = useState(true)

  const renderSection = (section: ResumeSection, si: number) => {
    return (
      <div key={si}>
        <SectionHeader title={section.title} />

        {/* Experience / Projects */}
        {section.experienceEntries.map((e, i) => (
          <ExperienceBlock key={`exp-${i}`} entry={e} show={showHL} />
        ))}

        {/* Education */}
        {section.educationEntries.map((e, i) => (
          <EducationBlock key={`edu-${i}`} entry={e} show={showHL} />
        ))}

        {/* Skills */}
        {section.skillEntries.length > 0 && (
          <div className="mb-2">
            {section.skillEntries.map((e, i) => (
              <SkillLine key={`sk-${i}`} entry={e} show={showHL} />
            ))}
          </div>
        )}

        {/* Generic / fallback lines — NEVER dropped */}
        {section.genericLines.map((line, i) => (
          <p key={`gen-${i}`} className="text-sm text-gray-700 mb-1" style={{ fontFamily: FONT }}>
            <HighlightedText text={line} show={showHL} />
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="bg-white shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB', borderRadius: '16px' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>优化后简历</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('功能即将上线')}>
            <Download className="w-3 h-3 mr-1" /> Word
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={() => alert('功能即将上线')}>
            <Download className="w-3 h-3 mr-1" /> PDF
          </Button>
        </div>
      </div>

      {/* Highlight legend + toggle */}
      {parsed.highlightCount > 0 && (
        <div
          className="flex items-center justify-between px-6 py-2.5"
          style={{ backgroundColor: showHL ? '#F0FDF4' : '#F9FAFB', borderBottom: '1px solid #E5E7EB', transition: 'background-color 0.3s' }}
        >
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4" style={{ color: HIGHLIGHT_COLOR }} />
            <span className="text-xs font-semibold" style={{ color: HIGHLIGHT_COLOR }}>导师建议修改</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: HIGHLIGHT_BG, color: HIGHLIGHT_COLOR }}>
              {parsed.highlightCount} 处
            </span>
            <span className="text-xs text-gray-400 ml-1">
              <span className="inline-block w-8 h-2.5 rounded-sm mr-1 align-middle" style={{ backgroundColor: HIGHLIGHT_BG, borderBottom: `2px solid ${HIGHLIGHT_BORDER}` }} />
              = 根据导师建议优化的内容
            </span>
          </div>
          <button
            onClick={() => setShowHL(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              backgroundColor: showHL ? '#DCFCE7' : '#F3F4F6',
              color: showHL ? HIGHLIGHT_COLOR : '#6B7280',
              border: '1px solid',
              borderColor: showHL ? HIGHLIGHT_BORDER : '#E5E7EB',
            }}
          >
            {showHL ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showHL ? '显示修改' : '隐藏修改'}
          </button>
        </div>
      )}

      {/* Resume preview — Teal style */}
      <div className="mx-auto bg-white" style={{ maxWidth: '800px', padding: '48px 56px', fontFamily: FONT }}>
        {/* Name */}
        {parsed.contact.name && (
          <h1 className="text-3xl font-bold mb-1" style={{ color: TEAL, fontFamily: FONT }}>
            {parsed.contact.name}
          </h1>
        )}

        {/* Contact */}
        {parsed.contact.details && (
          <p className="text-sm text-gray-700 mb-2" style={{ fontFamily: FONT }}>
            {parsed.contact.details}
          </p>
        )}

        {/* Sections */}
        {parsed.sections.map((s, i) => renderSection(s, i))}

        {/* Fallback: if nothing parsed, show raw content */}
        {parsed.sections.length === 0 && !parsed.contact.name && (
          <div className="whitespace-pre-wrap text-sm text-gray-700" style={{ fontFamily: FONT }}>
            {content}
          </div>
        )}
      </div>

      {/* Vibe ID CTA */}
      <div className="px-6 pb-6">
        <button
          onClick={() => router.push('/vibe-id')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all"
          style={{ backgroundColor: '#C6E04B', color: '#0E2620', border: '2px solid #C6E04B' }}
        >
          <Globe className="w-5 h-5" />
          生成我的 Vibe ID — AI 可爬取的一键证明 →
        </button>
      </div>
    </div>
  )
}
