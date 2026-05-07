// ── LEGACY ATS Score Breakdown (DEPRECATED - kept for reference) ──
/*
export interface ATSScoreBreakdown {
  keyword_match:     { weight: number; raw: number; contribution: number }
  skills_match:      { weight: number; raw: number; contribution: number }
  format_compliance: { weight: number; raw: number; contribution: number }
  experience_match:  { weight: number; raw: number; contribution: number }
}

export interface ATSPenalty {
  reason: string
  deduction: number
}
*/

// ── NEW ATS Score Breakdown (2025 Updated) ──
export interface ATSScoreBreakdown {
  A_format_parsing: number // 0-20
  B_info_completeness: number // 0-20
  C_content_quality: number // 0-35
  D_keyword_matching: number // 0-15 (or 0-13 if no JD)
  E_delivery_readiness: number // 0-10
}

export interface ATSIssue {
  rank: number
  severity: 'high' | 'medium' | 'low'
  issue: string
  impact: string
}

export interface ATSImprovementAction {
  rank: number
  action: string
  expected_gain: string
}

export interface ATSResult {
  ats_score: number
  risk_level: 'low' | 'mid' | 'high' | '低' | '中' | '高'
  scoring_context: string // "提供 JD" or "通用方向估算"
  dimension_scores: ATSScoreBreakdown
  top_issues: ATSIssue[]
  priority_improvements: ATSImprovementAction[]
  score_improvement_range: string
  strengths: string[]

  // LEGACY fields (DEPRECATED - kept for compatibility)
  candidate_name?: string
  inferred_role?: string
  scores?: any
  base_score?: number
  penalties?: any[]
  total_penalty?: number
  final_score?: number
  passing_threshold?: number
  passed?: boolean
}

export interface OverallJudgment {
  strengths: string
  coreIssues: string
  mentorCount: number
}

export interface CompetitionEstimate {
  job_title: string
  base_role: number
  base_role_reasoning: string
  estimated_applicants: number
  applicant_range: string
  competition_tag: string
}

export interface AdviceFeedback {
  accepted: boolean | null    // true = accept, false = skip, null = no choice yet
  helpful: boolean | null     // true = helpful, false = not helpful, null = no feedback yet
}

export interface AtsPhaseResult {
  atsScore: number
  atsResult: ATSResult
  competition: CompetitionEstimate
}

// LEGACY AnalyzeResultPayload & ResumeArtifactPayload maintain backward compatibility
// but now work with the new ATSResult structure

export interface MentorPhaseResult {
  overallJudgment: OverallJudgment
  currentSalary: string
  topSalary: string
  topCompanies: string[]
  mentorAdvice: MentorAdvice[]
}

export interface AnalyzeResultPayload {
  atsScore: number
  atsResult?: ATSResult
  overallJudgment?: OverallJudgment
  currentSalary: string
  topSalary: string
  topCompanies: string[]
  competition: CompetitionEstimate
  mentorAdvice: MentorAdvice[]
}

export interface ResumeArtifactPayload extends AnalyzeResultPayload {
  id: string
  resumeText: string
  targetRole: string
  jobDescription?: string
  candidateEmail?: string
  confirmedEmail?: string
  emailConfirmedAt?: string
  optimizedResume?: string
  createdAt: string
  updatedAt: string
}

export interface MentorAdviceItem {
  priority: string
  problem: string
  mentorPerspective: string
  studentStatus: string
  suggestion: string
  example?: string
}

export interface ResumeHighlight {
  intro: string
  points: string[]
}

export interface MentorAdvice {
  id: string
  mentorName: string
  mentorTitle: string
  company: string
  companyLogo: string
  credibility?: string
  highlightTags: string[]
  careerPath?: string
  advice: MentorAdviceItem[]
  resumeHighlight?: ResumeHighlight
  videoUrl?: string
  isLocked: boolean
}
