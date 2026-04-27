import type { QueryResultRow } from 'pg'

import { query } from './db'

export interface MentorRow extends QueryResultRow {
  id: number
  name: string
  company: string
  title: string
  industry_expertise: string
  coaching_positions: string | null
  credibility_signal: string
  career_path: string | null
}

export interface SegmentRow extends QueryResultRow {
  topic: string
  L1: string | null
  L2: string | null
  P_mentor: string | null
  A_action: string | null
  I_insight: string | null
  H_hook: string | null
  E_example: string | null
  HR_os: string | null
  advice_type: string | null
  mentor_name: string
  company: string
}

export interface BeforeAfterRow extends QueryResultRow {
  before_text: string
  after_text: string
  reason: string
  issue_tags: string | null
  mentor_quote: string | null
  mentor_name: string
  company: string
}

export interface MentorKnowledgeBase {
  allMentors: MentorRow[]
  universalSegments: SegmentRow[]
  specificSegments: SegmentRow[]
  beforeAfter: BeforeAfterRow[]
}

function extractKeywords(text: string): string[] {
  if (!text) return []
  const lower = text.toLowerCase()
  const tokens = lower.split(/[\s,;.·•|/\\()（）【】「」\-—:：!！?？\n\r]+/)
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'about',
    'between',
    'such',
    'this',
    'that',
    'these',
    'those',
    'will',
    '的',
    '了',
    '和',
    '与',
    '在',
    '是',
    '有',
    '中',
    '等',
    '及',
    '对',
    '要',
    '能',
    '会',
    '可以',
  ])
  return [...new Set(tokens.filter((token) => token.length >= 2 && !stopWords.has(token)))]
}

function scoreSegmentByKeywords(seg: SegmentRow, keywords: string[]): number {
  if (keywords.length === 0) return 0
  const text = [seg.topic, seg.L1, seg.L2, seg.A_action, seg.P_mentor]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return keywords.filter((keyword) => text.includes(keyword)).length
}

function scoreMentorRelevance(mentor: MentorRow, keywords: string[]): number {
  const text = [
    mentor.title,
    mentor.company,
    mentor.industry_expertise,
    mentor.coaching_positions,
    mentor.career_path,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return keywords.filter((keyword) => text.includes(keyword)).length
}

export async function getMentorKnowledgeBase(input: {
  targetRole: string
  jobDescription?: string
}): Promise<MentorKnowledgeBase> {
  const roleKeywords = extractKeywords(`${input.targetRole} ${input.jobDescription || ''}`)
  const jdKeywords = extractKeywords(input.jobDescription || '')

  const [mentorResult, universalResult, specificResult, beforeAfterResult] = await Promise.all([
    query<MentorRow>(
      `
        select id, name, company, title, industry_expertise, coaching_positions,
               credibility_signal, career_path
        from vibeid.mentors
        where active = true
        order by id asc
      `
    ),
    query<SegmentRow>(
      `
        select seg.topic,
               seg."L1" as "L1",
               seg."L2" as "L2",
               seg."P_mentor" as "P_mentor",
               seg."A_action" as "A_action",
               seg."I_insight" as "I_insight",
               seg."H_hook" as "H_hook",
               seg."E_example" as "E_example",
               seg."HR_os" as "HR_os",
               seg.advice_type,
               m.name as mentor_name,
               m.company
        from vibeid.segments seg
        join vibeid.sessions s on seg.session_id = s.id
        join vibeid.mentors m on s.mentor_id = m.id
        where seg.generality = 'universal'
          and seg."A_action" is not null and seg."A_action" != ''
          and (seg.confidence = 'high' or seg.confidence is null)
          and m.active = true
        order by seg.background_fit desc nulls last, seg.id asc
        limit 25
      `
    ),
    query<SegmentRow>(
      `
        select seg.topic,
               seg."L1" as "L1",
               seg."L2" as "L2",
               seg."P_mentor" as "P_mentor",
               seg."A_action" as "A_action",
               seg."I_insight" as "I_insight",
               seg."H_hook" as "H_hook",
               seg."E_example" as "E_example",
               seg."HR_os" as "HR_os",
               seg.advice_type,
               m.name as mentor_name,
               m.company
        from vibeid.segments seg
        join vibeid.sessions s on seg.session_id = s.id
        join vibeid.mentors m on s.mentor_id = m.id
        where seg.generality in ('industry-specific', 'role-specific')
          and seg."A_action" is not null and seg."A_action" != ''
          and m.active = true
        order by seg.industry_fit asc nulls last, seg.id asc
        limit 40
      `
    ),
    query<BeforeAfterRow>(
      `
        select ba.before_text, ba.after_text, ba.reason, ba.issue_tags,
               ba.mentor_quote, m.name as mentor_name, m.company
        from vibeid.before_after_pairs ba
        join vibeid.sessions s on ba.session_id = s.id
        join vibeid.mentors m on s.mentor_id = m.id
        where m.active = true
        order by ba.id asc
        limit 12
      `
    ),
  ])

  const allMentors =
    roleKeywords.length > 0
      ? mentorResult.rows
          .sort(
            (a, b) =>
              scoreMentorRelevance(b, roleKeywords) -
                scoreMentorRelevance(a, roleKeywords) || a.id - b.id
          )
          .slice(0, 25)
      : mentorResult.rows.slice(0, 25)

  const specificSegments =
    jdKeywords.length > 0
      ? specificResult.rows
          .sort(
            (a, b) =>
              scoreSegmentByKeywords(b, jdKeywords) -
              scoreSegmentByKeywords(a, jdKeywords)
          )
          .slice(0, 15)
      : specificResult.rows.slice(0, 15)

  return {
    allMentors,
    universalSegments: universalResult.rows,
    specificSegments,
    beforeAfter: beforeAfterResult.rows,
  }
}
