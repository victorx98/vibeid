import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { callClaude } from '@/lib/claude'
import { logError } from '@/lib/logger'
import { createAnalyzeArtifactAndJob, failJob } from '@/lib/backend-store'
import { databaseConfigured } from '@/lib/db'
import { enqueueAiJob } from '@/lib/job-queue'
import { getMentorKnowledgeBase, type MentorRow } from '@/lib/kb-store'
import { USER_CONTENT_GUARDRAIL, toPromptBlock, toPromptLine } from '@/lib/prompting'
import {
  RATE_LIMITS,
  checkRateLimit,
  createRateLimitHeaders,
} from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { analyzeRequestSchema, type AnalyzeRequest } from '@/lib/validation'
import type { AnalyzeResultPayload } from '@/lib/types'

export const runtime = 'nodejs'

// ── ATS Strict Scoring System Prompt ──
const ATS_SYSTEM_PROMPT = `You are an ATS (Applicant Tracking System) strict scoring engine. When given a resume, you analyze it and return a structured ATS score using the strict scoring methodology defined below.

## SCORING METHODOLOGY: STRICT MODE

### Step 1 — Compute base score (0–100)
Calculate a weighted sum across 4 dimensions:

| Dimension | Weight | Description |
|---|---|---|
| Keyword Match | 50% | Coverage of industry-standard and role-relevant keywords |
| Skills Match | 25% | Depth, breadth, and structure of the skills section |
| Format Compliance | 10% | ATS-parseable formatting (single column, no tables/images) |
| Experience Match | 15% | Relevance of experience, seniority fit, and employment continuity |

Base Score = (keyword_raw × 0.50) + (skills_raw × 0.25) + (format_raw × 0.10) + (experience_raw × 0.15)

### Step 2 — Apply penalty deductions (capped at −15 total)

| Penalty Trigger | Deduction |
|---|---|
| Employment gap > 6 months with no explanation | −3 |
| Skills section < 3 lines or missing proficiency signals | −2 |
| Non-English currency symbols in English resume | −1 |
| Missing resume summary or objective section | −1 |
| Use of tables, text boxes, or multi-column layout | −3 |
| Use of images, icons, or graphics | −2 |
| Contact info incomplete (missing email or phone) | −2 |
| Keyword stuffing detected | −2 |

Final Score = Base Score − Total Penalties (minimum 0)

### Step 3 — Raw score guidelines per dimension

**Keyword Match (0–100)**
- 90–100: ≥80% of expected role keywords WITH contextual usage
- 70–89: 50–79% of expected keywords
- 50–69: 30–49% of keywords
- 30–49: Sparse keyword coverage
- 0–29: Few or no relevant keywords
- IMPORTANT: If no JD is provided, default to industry-standard keyword list. Assume conservative scoring (start at 55, not 72).

**Skills Match (0–100)**
- 90–100: 3+ lines, separates hard/soft skills, includes proficiency
- 70–89: Skills listed clearly but without proficiency levels
- 50–69: Too brief (1 line or tool-name-only)
- 30–49: Missing or only inline mentions
- 0–29: No discernible skills section

**Format Compliance (0–100)**
- 90–100: Single column, plain text, standard headers, consistent dates
- 70–89: Mostly clean, minor issues
- 50–69: Some formatting issues
- 30–49: Tables or two-column layout
- 0–29: Heavy graphics or non-parseable elements

**Experience Match (0–100)**
- 90–100: Continuous employment, titles match target, quantified impact
- 70–89: Mostly relevant, minor gaps
- 50–69: Relevant but unexplained gaps or tangentially related
- 30–49: Significant gaps or career pivots without bridging
- 0–29: Largely irrelevant or severely fragmented

### Step 4 — Passing threshold
- ≥75: Pass — competitive
- 70–74: Marginal pass
- 60–69: Below threshold — needs improvement
- <60: Fail — significant revision required
Default threshold: 70. For FAANG/MBB/bulge bracket: 75.

## STRICT MODE PRINCIPLES
1. No JD provided → conservative keyword scoring
2. Never inflate scores. Identify real ATS failure risk.
3. Penalties are additive and compound.
4. Format IS substance in strict mode.
5. Tool-name-only skills count as weak signal.
6. Employment gaps must be explicitly explained to avoid penalty.

Return ONLY valid JSON, no markdown, no extra text.`

// ── Competition Estimator System Prompt ──
const COMPETITION_SYSTEM_PROMPT = `You are a US entry-level job market competition estimator. When given a job title, calculate the estimated number of applicants using the formula below.

## FORMULA
Estimated Applicants = base_role × tier_mult × city_mult × time_mult(days) × salary_mult × 1.4

The 1.4 is a fixed Entry Level multiplier (entry-level roles receive 38–45% more applications than mid-level equivalents).

## STEP 1 — INFER base_role FROM JOB TITLE
Reason about the job title using three factors:

**Factor A: Role demand breadth** — How many different types of companies hire for this role?
- Almost every company → high base (1,800–2,500)
- Most mid-to-large companies → medium base (1,200–1,800)
- Specialist or niche role → low base (600–1,200)

**Factor B: Entry-level candidate pool size**
- Very large pool (business, CS, economics majors) → add 400–600
- Medium pool (specific major or bootcamp) → add 200–400
- Small pool (niche certification or rare degree) → add 0–200

**Factor C: Online application friction**
- One-click / easy apply common → add 300–500
- Standard resume + cover letter → add 100–300
- Portfolio / test / coding challenge required → add 0–100

base_role = Factor A midpoint + Factor B add-on + Factor C add-on

Reference anchors (not a lookup table):
- Marketing Coordinator → ~1,400
- Software Engineer (new grad) → ~2,200
- Investment Banking Analyst → ~1,500
- Product Manager (APM) → ~2,500
- UX Designer → ~900
- Supply Chain Analyst → ~1,200

## STEP 2 — APPLY MULTIPLIERS
Use defaults when parameters are unknown:
- tier_mult: T1(FAANG/MBB)=4.0, T2(well-known public)=2.5, T3(mid-size)=1.4, T4(startup)=0.7, default=2.5
- city_mult: NYC=2.0, SF/Bay=1.9, Remote=1.6, Chicago/Boston/Seattle=1.5, LA/Austin/DC=1.3, Denver/Atlanta/Miami=1.0, Other=0.7, default=1.3
- time_mult: 1-3d=0.25, 4-7d=0.55, 8-14d=1.00, 15-21d=1.40, 22-30d=1.65, 31-45d=1.85, 46+=2.05, default=1.00
- salary_mult: Above 15%+=1.4, At market=1.1, Below 15%=0.8, Significantly below=0.5, default=1.1

## STEP 3 — CALCULATE
point_estimate = base_role × tier_mult × city_mult × time_mult × salary_mult × 1.4 (round to nearest 50)
low = point_estimate × 0.72 (round to nearest 50)
high = point_estimate × 1.32 (round to nearest 50)

## STEP 4 — COMPETITION TAG
headcount defaults to 2 if unknown.
overall_rate = headcount / point_estimate × 100
- <1% → "极度激烈"
- 1–3% → "非常激烈"
- 3–6% → "激烈"
- 6–12% → "中等竞争"
- 12%+ → "竞争较低"

Return ONLY valid JSON, no markdown, no extra text.`

// ── Locked mentor teaser system prompt (Haiku) ──
const LOCKED_MENTOR_SYSTEM = `你是简历顾问平台的导师预览生成器。根据学生简历和目标岗位，为3位锁定导师生成简短但专业的建议预览。

规则：
- 每位导师给出1条核心建议（P0级别），揭示关键问题但不给出完整方案（这是预览/解锁诱惑）
- highlightTags: 从credibility_signal中提取3个精简标签（如"NYU金融硕士"、"500+预测模型"）
- careerPath: 从career_path字段提取职业路径，career_path为空则null
- companyLogo: 必须是公司英文名小写（如"amazon"、"google"）
- 建议要有实质性（指出真实问题），但solution留有悬念
- 返回严格JSON，无代码块`

export async function runResumeAnalysis({
  resumeText,
  targetRole,
  jobDescription,
}: AnalyzeRequest): Promise<AnalyzeResultPayload> {
    const jdSection = jobDescription
      ? `\n\nJob Description (use this to extract keywords and match against resume):\n${toPromptBlock('job_description', jobDescription, 3000)}`
      : ''

    // ══════════════════════════════════════════
    // STEP 1: ATS Scoring + Competition Estimate (parallel)
    // ══════════════════════════════════════════
    const atsPrompt = `${toPromptBlock('resume_text', resumeText, 4000)}

Target role: ${toPromptLine(targetRole, 120)}${jdSection}
${jobDescription ? `
IMPORTANT: A real Job Description has been provided above. You MUST:
1. Extract the top 15-20 keywords from the JD (job title, required skills, tools, qualifications, responsibilities)
2. Match EACH extracted keyword against the resume text
3. Base your keyword_match score on actual JD keyword coverage, NOT generic industry keywords
4. In top_issues, specifically list which JD keywords are MISSING from the resume
5. This is岗位级别匹配, not 简历级别匹配 — be precise about what this specific JD demands
` : ''}
Return the ATS analysis as JSON:
{
  "candidate_name": "string or Unknown",
  "inferred_role": "string",
  "scores": {
    "keyword_match":     { "weight": 0.50, "raw": <0-100>, "contribution": <number> },
    "skills_match":      { "weight": 0.25, "raw": <0-100>, "contribution": <number> },
    "format_compliance": { "weight": 0.10, "raw": <0-100>, "contribution": <number> },
    "experience_match":  { "weight": 0.15, "raw": <0-100>, "contribution": <number> }
  },
  "base_score": <number>,
  "penalties": [ { "reason": "string", "deduction": <negative number> } ],
  "total_penalty": <number>,
  "final_score": <number>,
  "passing_threshold": 70,
  "passed": <boolean>,
  "top_issues": [ { "severity": "high|medium|low", "issue": "string", "recommendation": "string" } ],
  "strengths": ["string"]
}`

    const competitionPrompt = `Job title: ${toPromptLine(targetRole, 120)}

Return JSON:
{
  "job_title": "<exact title>",
  "base_role": <integer>,
  "base_role_reasoning": "<one sentence explaining the three-factor estimate>",
  "estimated_applicants": <integer>,
  "applicant_range": "<low>–<high>",
  "competition_tag": "<tag>"
}`

    // ══════════════════════════════════════════
    // Run ATS + Competition + DB queries ALL in parallel
    // ══════════════════════════════════════════
    // ATS (Sonnet, 2048 tokens) + Competition (Haiku, 1024 tokens) + DB — all parallel
    const [atsResponse, competitionResponse, dbData] = await Promise.all([
      callClaude(`${ATS_SYSTEM_PROMPT}\n\n${USER_CONTENT_GUARDRAIL}`, atsPrompt, 0, {
        maxTokens: 2048,
        cacheSystem: true,
        timeoutMs: 60_000,
      }),
      callClaude(`${COMPETITION_SYSTEM_PROMPT}\n\n${USER_CONTENT_GUARDRAIL}`, competitionPrompt, 0, {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 1024,
        timeoutMs: 30_000,
      }),
      getMentorKnowledgeBase({ targetRole, jobDescription }),
    ])

    let atsResult
    try {
      atsResult = JSON.parse(atsResponse)
    } catch {
      const match = atsResponse.match(/\{[\s\S]*\}/)
      if (match) atsResult = JSON.parse(match[0])
      else throw new Error('Failed to parse ATS response')
    }

    // Null-safe defaults for ATS result fields
    const atsScores = atsResult?.scores || {}
    const safeATS = {
      final_score: atsResult?.final_score ?? 50,
      passed: atsResult?.passed ?? false,
      keyword_match: atsScores.keyword_match?.raw ?? 50,
      skills_match: atsScores.skills_match?.raw ?? 50,
      format_compliance: atsScores.format_compliance?.raw ?? 70,
      experience_match: atsScores.experience_match?.raw ?? 50,
      top_issues: atsResult?.top_issues || [],
    }

    let competitionResult
    try {
      competitionResult = JSON.parse(competitionResponse)
    } catch {
      const match = competitionResponse.match(/\{[\s\S]*\}/)
      if (match) competitionResult = JSON.parse(match[0])
      else throw new Error('Failed to parse competition response')
    }

    const { allMentors, universalSegments, specificSegments, beforeAfter } = dbData

    // ══════════════════════════════════════════
    // STEP 3: Build context for mentor advice
    // ══════════════════════════════════════════
    const allSegments = [...universalSegments, ...specificSegments]
    const segsByL1: Record<string, typeof allSegments> = {}
    for (const seg of allSegments) {
      const key = seg.L1 || '其他'
      if (!segsByL1[key]) segsByL1[key] = []
      segsByL1[key].push(seg)
    }
    const adviceKB = Object.entries(segsByL1).map(([cat, segs]) => {
      const items = segs.map(s => {
        let e = `  [${s.mentor_name}@${s.company}] ${s.topic}`
        if (s.P_mentor) e += `\n    诊断: ${s.P_mentor}`
        e += `\n    行动: ${s.A_action}`
        if (s.I_insight) e += `\n    洞察: ${s.I_insight}`
        if (s.H_hook) e += `\n    原话: "${s.H_hook.slice(0, 80)}"`
        if (s.HR_os) e += `\n    HR视角: ${s.HR_os}`
        return e
      }).join('\n  ---\n')
      return `【${cat}】\n${items}`
    }).join('\n\n')

    const baExamples = beforeAfter.map(b => {
      let e = `[${b.mentor_name}@${b.company}]`
      if (b.issue_tags) e += ` 标签:${b.issue_tags}`
      e += `\n  Before: ${b.before_text}\n  After: ${b.after_text}\n  原因: ${b.reason}`
      return e
    }).join('\n---\n')

    // ── ATS issues summary for mentor context ──
    const atsIssuesSummary = safeATS.top_issues
      .map((i: { severity: string; issue: string }) => `[${i.severity}] ${i.issue}`)
      .join('\n')

    // ══════════════════════════════════════════
    // STEP 4: Mentor Advice — 2 parallel calls
    //   Call A (Sonnet, 3500 tokens): 1 unlocked mentor + overallJudgment + salary
    //   Call B (Haiku,  2000 tokens): 3 locked mentor teasers
    // ══════════════════════════════════════════

    // Pre-select top 4 mentors by relevance (already ranked in DB query)
    const selectedMentors = allMentors.slice(0, 4)
    const unlockedMentor = selectedMentors[0]
    const lockedMentorList = selectedMentors.slice(1, 4)

    function fmtMentor(m: MentorRow, idx: number) {
      return `导师${idx}: ${m.name} | ${m.title} @ ${m.company}\n  权威背书: ${m.credibility_signal}\n  行业专长: ${m.industry_expertise}\n  擅长辅导: ${m.coaching_positions || '通用'}\n  职业路径: ${m.career_path || ''}`
    }

    // ── Call A system prompt (Sonnet — full quality, 1 unlocked mentor) ──────
    const UNLOCKED_MENTOR_SYSTEM = `你是AI简历导师平台的导师建议引擎。你拥有来自顶级公司导师的真实辅导知识库。

你的任务：以指定导师的视角，针对学生简历给出3条分层建议，并生成整体评价和薪资预测。

## 核心规则
- highlightTags: 必须从credibility_signal中提取3-4个精简标签（如"NYU金融硕士"、"500+预测模型"、"FinTech独角兽"）
- careerPath: 必须从career_path字段提取职业路径（如"广告Agency → 快消品牌(百威) → 科技大厂(Amazon)"），career_path为空则null
- companyLogo: 必须是公司英文名小写（如"amazon"、"google"、"oportun"）

## 建议格式（每条advice严格按以下结构）
每条advice必须包含：
1. priority: "P0-必改" / "P1-重要" / "P2-建议"
2. problem: 导师指出的问题（清楚标出问题是什么）
3. mentorPerspective: 导师筛选策略 — 先用1句话说明该公司/行业对此项的筛选标准或淘汰逻辑，再用「」引用知识库中导师原话作为佐证。整段要读起来像一个连贯的专业判断，不要直接把quote当主体。
4. studentStatus: 学生的现状（从简历中详细指出具体位置和内容，引用简历原文）
5. suggestion: 详细且具体的改写建议（给出改写后的文字示例，不是笼统建议）
6. example: (可选) 改写后的bullet示例文字

## resumeHighlight（必须生成）
- intro: "在{公司名}中，此类简历最容易脱颖而出..."
- points: 2-3条具体的吸睛策略（必须基于知识库中该导师的真实建议和before_after案例，不可编造）

素材必须严格来源于提供的知识库（segments、before_after案例），不要编造导师未说过的话。
返回严格JSON，不要代码块`

    // ── Call A user prompt ───────────────────────────────────────────────────
    const unlockedUserPrompt = `## 简历
${toPromptBlock('resume_text', resumeText, 2500)}

## 目标岗位: ${toPromptLine(targetRole, 120)}${jobDescription ? `

## 目标职位JD（必须参考）
${toPromptBlock('job_description', jobDescription, 1500)}

重要：建议必须针对此 JD 的具体要求（职责、技能、资格）。
- problem 字段：指出简历中缺少 JD 要求的哪项具体内容
- suggestion 字段：改写方向必须包含 JD 中的关键词/技能名称
- mentorPerspective 字段：解释为什么这个 JD 特别看重这项能力` : ''}

## ATS评分结果
- 总分: ${safeATS.final_score}/100 (${safeATS.passed ? '通过' : '未通过'})
- 关键词匹配: ${safeATS.keyword_match}/100
- 技能匹配: ${safeATS.skills_match}/100
- 格式合规: ${safeATS.format_compliance}/100
- 经历匹配: ${safeATS.experience_match}/100
- 主要问题:
${atsIssuesSummary}

## 指定导师（仅生成此1位导师的完整建议）
${fmtMentor(unlockedMentor, 1)}

## 知识库
${adviceKB.slice(0, 3500)}

## Before/After案例
${baExamples.slice(0, 1500)}

---
返回JSON：
{
  "overallJudgment": {
    "strengths": "<1-2句话概括候选人简历核心亮点，引用具体经历/数据/学校，让学生感受到被认可>",
    "coreIssues": "<1句话总结当前简历最关键的2个问题，用加粗标记关键词>",
    "mentorCount": 4
  },
  "currentSalary": "<当前ATS水平可能获得的年薪范围，入门级，如¥15W-22W/年或$55K-75K/年>",
  "topSalary": "<行业顶尖大厂同岗位年薪范围，如¥50W-80W/年或$150K-250K/年>",
  "topCompanies": ["<顶尖公司1>", "<顶尖公司2>", "<顶尖公司3>"],
  "mentor": {
    "id": "m1",
    "mentorName": "<真实姓名>",
    "mentorTitle": "<真实职位>",
    "company": "<真实公司>",
    "companyLogo": "<公司英文名小写>",
    "credibility": "<credibility_signal原文>",
    "highlightTags": ["<精简标签1>", "<精简标签2>", "<精简标签3>"],
    "careerPath": "<职业路径或null>",
    "advice": [
      { "priority": "P0-必改", "problem": "...", "mentorPerspective": "...", "studentStatus": "...", "suggestion": "...", "example": "..." },
      { "priority": "P1-重要", "problem": "...", "mentorPerspective": "...", "studentStatus": "...", "suggestion": "...", "example": "..." },
      { "priority": "P2-建议", "problem": "...", "mentorPerspective": "...", "studentStatus": "...", "suggestion": "..." }
    ],
    "resumeHighlight": {
      "intro": "在<公司名>中，此类简历最容易脱颖而出...",
      "points": ["<吸睛策略1>", "<吸睛策略2>"]
    },
    "isLocked": false
  }
}`

    // ── Call B user prompt (Haiku — brief teasers for 3 locked mentors) ──────
    const lockedUserPrompt = `简历摘要：
${toPromptBlock('resume_summary', resumeText, 600)}

目标岗位: ${toPromptLine(targetRole, 120)}
ATS总分: ${safeATS.final_score}/100，主要问题: ${safeATS.top_issues.slice(0, 2).map((i: { issue: string }) => i.issue).join('；')}

3位导师信息：
${lockedMentorList.map((m, i) => fmtMentor(m, i + 2)).join('\n\n')}

返回JSON：
{
  "lockedMentors": [
    {
      "id": "m2",
      "mentorName": "<导师真实姓名>",
      "mentorTitle": "<真实职位>",
      "company": "<真实公司>",
      "companyLogo": "<公司英文名小写>",
      "credibility": "<credibility_signal原文>",
      "highlightTags": ["<精简标签1>", "<精简标签2>", "<精简标签3>"],
      "careerPath": "<职业路径或null>",
      "advice": [{ "priority": "P0-必改", "problem": "<核心问题>", "mentorPerspective": "<专业判断>", "studentStatus": "<指出简历中的具体问题>", "suggestion": "<改进方向提示>" }],
      "resumeHighlight": { "intro": "在<公司名>中，此类简历...", "points": ["<关键策略>"] },
      "isLocked": true
    },
    { "id": "m3", "mentorName": "...", "mentorTitle": "...", "company": "...", "companyLogo": "...", "credibility": "...", "highlightTags": ["..."], "careerPath": "...", "advice": [{"priority":"P0-必改","problem":"...","mentorPerspective":"...","studentStatus":"...","suggestion":"..."}], "resumeHighlight": {"intro":"...","points":["..."]}, "isLocked": true },
    { "id": "m4", "mentorName": "...", "mentorTitle": "...", "company": "...", "companyLogo": "...", "credibility": "...", "highlightTags": ["..."], "careerPath": "...", "advice": [{"priority":"P0-必改","problem":"...","mentorPerspective":"...","studentStatus":"...","suggestion":"..."}], "resumeHighlight": {"intro":"...","points":["..."]}, "isLocked": true }
  ]
}`

    // ── Run both mentor calls in parallel ────────────────────────────────────
    const [unlockedRaw, lockedRaw] = await Promise.all([
      callClaude(`${UNLOCKED_MENTOR_SYSTEM}\n\n${USER_CONTENT_GUARDRAIL}`, unlockedUserPrompt, 0, {
        maxTokens: 3500,
        cacheSystem: true,
        timeoutMs: 90_000,
      }),
      callClaude(`${LOCKED_MENTOR_SYSTEM}\n\n${USER_CONTENT_GUARDRAIL}`, lockedUserPrompt, 0, {
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 2000,
        timeoutMs: 45_000,
      }),
    ])

    // ── Parse results ─────────────────────────────────────────────────────────
    let unlockedResult: {
      overallJudgment?: Record<string, unknown>
      currentSalary?: string
      topSalary?: string
      topCompanies?: string[]
      mentor?: Record<string, unknown>
    }
    try {
      unlockedResult = JSON.parse(unlockedRaw)
    } catch {
      const match = unlockedRaw.match(/\{[\s\S]*\}/)
      if (match) unlockedResult = JSON.parse(match[0])
      else throw new Error('Failed to parse unlocked mentor response')
    }

    let lockedResult: { lockedMentors?: Record<string, unknown>[] }
    try {
      lockedResult = JSON.parse(lockedRaw)
    } catch {
      const match = lockedRaw.match(/\{[\s\S]*\}/)
      if (match) lockedResult = JSON.parse(match[0])
      else lockedResult = { lockedMentors: [] }  // graceful degradation
    }

    // ── Combine into final mentorResult ──────────────────────────────────────
    const mentorResult = {
      overallJudgment: (unlockedResult?.overallJudgment as AnalyzeResultPayload['overallJudgment']) || { strengths: '', coreIssues: '', mentorCount: 4 },
      currentSalary: unlockedResult?.currentSalary || '未知',
      topSalary: unlockedResult?.topSalary || '未知',
      topCompanies: unlockedResult?.topCompanies || [],
      mentorAdvice: [
        ...(unlockedResult?.mentor ? [{ ...unlockedResult.mentor, isLocked: false }] : []),
        ...(lockedResult?.lockedMentors || []).map(m => ({ ...m, isLocked: true })),
      ] as AnalyzeResultPayload['mentorAdvice'],
    }

    // ══════════════════════════════════════════
    // STEP 5: Return combined result
    // ══════════════════════════════════════════
    return {
      atsScore: safeATS.final_score,
      atsResult,
      overallJudgment: mentorResult.overallJudgment,
      currentSalary: mentorResult.currentSalary,
      topSalary: mentorResult.topSalary,
      topCompanies: mentorResult.topCompanies,
      competition:
        competitionResult || {
          job_title: targetRole,
          base_role: 1000,
          base_role_reasoning: '',
          estimated_applicants: 1000,
          applicant_range: '500-1500',
          competition_tag: '中等竞争',
        },
      mentorAdvice: mentorResult.mentorAdvice,
    }
}

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, RATE_LIMITS.analyze)
  const headers = createRateLimitHeaders(rateLimit)

  if (!rateLimit.allowed) {
    return Response.json(
      { error: '请求过于频繁，请稍后再试' },
      { status: 429, headers }
    )
  }

  const auth = await getAuthenticatedUser(request)
  if (auth.error === 'not_configured') {
    return Response.json(
      { error: '登录系统未配置，暂时无法保存分析结果' },
      { status: 503, headers }
    )
  }
  if (auth.error || !auth.user) {
    return Response.json(
      { error: '请先登录后再分析简历' },
      { status: 401, headers }
    )
  }

  if (!databaseConfigured()) {
    return Response.json(
      { error: '分析系统未配置，请稍后再试' },
      { status: 503, headers }
    )
  }

  try {
    const rawBody = await request.json()
    const input = analyzeRequestSchema.parse(rawBody)
    const { artifactId, jobId } = await createAnalyzeArtifactAndJob(auth.user.id, input)
    try {
      await enqueueAiJob('analyze', jobId)
    } catch (error) {
      await failJob(jobId, 'enqueue_failed', '分析任务入队失败')
      logError('analyze_enqueue_failed', error, { jobId, artifactId })
      return Response.json(
        { error: '分析任务创建失败，请稍后再试' },
        { status: 503, headers }
      )
    }

    return Response.json(
      { jobId, artifactId },
      { status: 202, headers }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: '请求参数不合法，请检查简历文本和目标岗位后重试' },
        { status: 400, headers }
      )
    }

    logError('resume_analysis_failed', error)
    return Response.json(
      { error: '简历分析失败，请稍后重试' },
      { status: 500, headers }
    )
  }
}
