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

export interface ATSResult {
  candidate_name: string
  inferred_role: string
  scores: ATSScoreBreakdown
  base_score: number
  penalties: ATSPenalty[]
  total_penalty: number
  final_score: number
  passing_threshold: number
  passed: boolean
  top_issues: { severity: string; issue: string; recommendation: string }[]
  strengths: string[]
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

export interface ResumeSession {
  id: string
  resumeText: string
  targetRole: string
  jobDescription?: string
  atsScore: number
  atsResult?: ATSResult
  overallJudgment?: OverallJudgment
  currentSalary: string
  topSalary: string
  topCompanies: string[]
  competition: CompetitionEstimate
  mentorAdvice: MentorAdvice[]
  adviceFeedback?: Record<string, AdviceFeedback>  // key: "mentorId-adviceIndex"
  unlockedTiers: ('basic' | 'resume' | 'video')[]
  optimizedResume?: string
  createdAt: string
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
