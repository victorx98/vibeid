// ─── Shared skill gap data, matching logic, and project mapping ───────────────

export interface SkillData {
  name: string
  nameEn: string
  marketDemand: number        // % of JDs mentioning this skill
  trend: 'rising' | 'stable' | 'declining'
  rankChange: number          // year-over-year rank change
  category: 'technical' | 'soft'
  keywords: string[]          // lowercase substrings for resume matching
}

export type MatchStatus = 'have' | 'partial' | 'missing'

export interface EnrichedSkill extends SkillData {
  status: MatchStatus
}

// ─── Marketing skill dataset ─────────────────────────────────────────────────

export const MARKETING_SKILLS: SkillData[] = [
  // Technical
  { name: 'Google Analytics / GA4', nameEn: 'Google Analytics', marketDemand: 78, trend: 'rising',    rankChange: +3, category: 'technical', keywords: ['google analytics', 'ga4', 'google tag manager', 'gtm'] },
  { name: 'SEO / SEM',              nameEn: 'SEO/SEM',           marketDemand: 72, trend: 'stable',    rankChange:  0, category: 'technical', keywords: ['seo', 'sem', 'search engine', 'keyword research', 'organic search'] },
  { name: 'Meta Ads 投放',           nameEn: 'Meta Ads',          marketDemand: 68, trend: 'rising',    rankChange: +2, category: 'technical', keywords: ['meta ads', 'facebook ads', 'instagram ads', 'meta business'] },
  { name: 'Google Ads',             nameEn: 'Google Ads',        marketDemand: 65, trend: 'stable',    rankChange: -1, category: 'technical', keywords: ['google ads', 'adwords', 'ppc', 'pay-per-click'] },
  { name: 'A/B 测试',               nameEn: 'A/B Testing',       marketDemand: 61, trend: 'rising',    rankChange: +4, category: 'technical', keywords: ['a/b test', 'split test', 'hypothesis test', 'experiment'] },
  { name: 'HubSpot',                nameEn: 'HubSpot',           marketDemand: 55, trend: 'rising',    rankChange: +3, category: 'technical', keywords: ['hubspot', 'crm', 'marketing automation'] },
  { name: 'Tableau / Power BI',     nameEn: 'Tableau',           marketDemand: 52, trend: 'stable',    rankChange:  0, category: 'technical', keywords: ['tableau', 'power bi', 'data visualization', 'dashboard'] },
  { name: 'SQL 数据查询',            nameEn: 'SQL',               marketDemand: 48, trend: 'rising',    rankChange: +5, category: 'technical', keywords: ['sql', 'mysql', 'postgresql', 'database query', 'bigquery'] },
  { name: 'Marketing Automation',   nameEn: 'Mktg Automation',   marketDemand: 45, trend: 'rising',    rankChange: +2, category: 'technical', keywords: ['marketing automation', 'marketo', 'pardot', 'klaviyo', 'mailchimp'] },
  { name: 'Salesforce CRM',         nameEn: 'Salesforce',        marketDemand: 42, trend: 'stable',    rankChange: -1, category: 'technical', keywords: ['salesforce', 'sfdc', 'crm'] },
  { name: 'Content Management',     nameEn: 'CMS / WordPress',   marketDemand: 38, trend: 'declining', rankChange: -3, category: 'technical', keywords: ['wordpress', 'cms', 'contentful', 'webflow'] },
  { name: 'Python 数据分析',         nameEn: 'Python',            marketDemand: 34, trend: 'rising',    rankChange: +6, category: 'technical', keywords: ['python', 'pandas', 'numpy', 'matplotlib', 'jupyter'] },
  // Soft
  { name: '数据驱动决策',            nameEn: 'Data-Driven',       marketDemand: 82, trend: 'rising',    rankChange: +2, category: 'soft', keywords: ['data-driven', 'data driven', 'metrics', 'kpi', 'analytics'] },
  { name: '跨部门协作',              nameEn: 'Cross-functional',  marketDemand: 74, trend: 'stable',    rankChange:  0, category: 'soft', keywords: ['cross-functional', 'cross functional', 'collaboration', 'stakeholder'] },
  { name: '项目管理',                nameEn: 'Project Mgmt',      marketDemand: 70, trend: 'stable',    rankChange: -1, category: 'soft', keywords: ['project management', 'agile', 'scrum', 'jira', 'asana'] },
  { name: '内容创意写作',            nameEn: 'Creative Writing',  marketDemand: 66, trend: 'stable',    rankChange:  0, category: 'soft', keywords: ['copywriting', 'content writing', 'creative writing', 'storytelling'] },
  { name: '用户增长思维',            nameEn: 'Growth Mindset',    marketDemand: 58, trend: 'rising',    rankChange: +3, category: 'soft', keywords: ['growth hacking', 'growth marketing', 'user acquisition', 'retention'] },
]

export const GENERIC_SKILLS: SkillData[] = [
  { name: '数据分析',     nameEn: 'Data Analysis',  marketDemand: 75, trend: 'rising',   rankChange: +3, category: 'technical', keywords: ['data analysis', 'excel', 'sql', 'tableau', 'python'] },
  { name: '项目管理',     nameEn: 'Project Mgmt',   marketDemand: 70, trend: 'stable',   rankChange:  0, category: 'technical', keywords: ['project management', 'agile', 'scrum', 'pmp'] },
  { name: '沟通表达',     nameEn: 'Communication',  marketDemand: 85, trend: 'stable',   rankChange:  0, category: 'soft',      keywords: ['communication', 'presentation', 'stakeholder'] },
  { name: '团队协作',     nameEn: 'Teamwork',       marketDemand: 80, trend: 'stable',   rankChange:  0, category: 'soft',      keywords: ['teamwork', 'collaboration', 'cross-functional'] },
  { name: 'Microsoft Office', nameEn: 'MS Office',  marketDemand: 65, trend: 'declining', rankChange: -4, category: 'technical', keywords: ['excel', 'powerpoint', 'word', 'microsoft office'] },
  { name: '问题解决',     nameEn: 'Problem Solving', marketDemand: 78, trend: 'rising',  rankChange: +2, category: 'soft',      keywords: ['problem solving', 'analytical', 'critical thinking'] },
]

// ─── AI Project → skill coverage map ─────────────────────────────────────────
// Maps each AI project title to the skill names it trains/addresses

export const PROJECT_SKILL_COVERAGE: Record<string, string[]> = {
  'AI Marketing Agent': [
    'Google Analytics / GA4', 'A/B 测试', 'Marketing Automation', '数据驱动决策', '用户增长思维',
  ],
  'AI 视频生成 Agent': [
    '内容创意写作', 'Content Management', '用户增长思维',
  ],
  'AI Research Agent': [
    'SQL 数据查询', 'Python 数据分析', '数据驱动决策',
  ],
  'AI Customer Service Agent': [
    '跨部门协作', '项目管理',
  ],
  'AI Data Analytics Agent': [
    'SQL 数据查询', 'Python 数据分析', 'Tableau / Power BI', '数据驱动决策',
  ],
  'AI Workflow Automation Agent': [
    'Marketing Automation', 'Salesforce CRM', 'HubSpot', '项目管理',
  ],
}

// ─── Matching helpers ─────────────────────────────────────────────────────────

const MARKETING_KEYWORDS = [
  'market', 'marketing', '营销', '市场', '品牌', 'brand', 'content', 'growth',
  'social media', '社交', 'digital', '数字', 'campaign', 'seo', 'sem', 'ads',
  'copywrite', '文案', 'media', 'pr', 'public relation',
]

export function isMarketingRole(targetRole: string): boolean {
  const lower = targetRole.toLowerCase()
  return MARKETING_KEYWORDS.some(kw => lower.includes(kw))
}

export function matchSkill(skill: SkillData, resumeText: string): MatchStatus {
  const lower = resumeText.toLowerCase()
  const matched = skill.keywords.filter(kw => lower.includes(kw))
  if (matched.length === 0) return 'missing'
  if (matched.length >= 2 || skill.keywords.length === 1) return 'have'
  return 'partial'
}

// Extract skill-like terms from a JD and create dynamic SkillData entries
function extractJDSkills(jd: string, existingNames: Set<string>): SkillData[] {
  if (!jd) return []
  const lower = jd.toLowerCase()

  // Common skill/tool patterns to detect in JDs
  const skillPatterns: { name: string; nameEn: string; keywords: string[]; category: 'technical' | 'soft' }[] = [
    { name: 'Python', nameEn: 'Python', keywords: ['python'], category: 'technical' },
    { name: 'SQL', nameEn: 'SQL', keywords: ['sql', 'mysql', 'postgresql', 'bigquery'], category: 'technical' },
    { name: 'Excel / Spreadsheets', nameEn: 'Excel', keywords: ['excel', 'spreadsheet', 'google sheets'], category: 'technical' },
    { name: 'Tableau / Power BI', nameEn: 'Tableau', keywords: ['tableau', 'power bi', 'data visualization'], category: 'technical' },
    { name: 'R 语言', nameEn: 'R', keywords: [' r ', 'r programming', 'rstudio'], category: 'technical' },
    { name: 'JavaScript / TypeScript', nameEn: 'JavaScript', keywords: ['javascript', 'typescript', 'react', 'node.js', 'vue'], category: 'technical' },
    { name: 'Java', nameEn: 'Java', keywords: ['java ', 'spring boot', 'jvm'], category: 'technical' },
    { name: 'AWS / Cloud', nameEn: 'AWS/Cloud', keywords: ['aws', 'azure', 'gcp', 'cloud computing'], category: 'technical' },
    { name: 'Machine Learning', nameEn: 'ML/AI', keywords: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp'], category: 'technical' },
    { name: 'Docker / K8s', nameEn: 'Docker/K8s', keywords: ['docker', 'kubernetes', 'k8s', 'container'], category: 'technical' },
    { name: 'Git / CI/CD', nameEn: 'Git/CI-CD', keywords: ['git', 'ci/cd', 'jenkins', 'github actions'], category: 'technical' },
    { name: 'Figma / Design', nameEn: 'Figma', keywords: ['figma', 'sketch', 'adobe xd', 'ui/ux'], category: 'technical' },
    { name: 'Google Analytics', nameEn: 'GA', keywords: ['google analytics', 'ga4', 'gtm'], category: 'technical' },
    { name: 'SEO / SEM', nameEn: 'SEO/SEM', keywords: ['seo', 'sem', 'search engine'], category: 'technical' },
    { name: 'Salesforce', nameEn: 'Salesforce', keywords: ['salesforce', 'sfdc'], category: 'technical' },
    { name: 'Agile / Scrum', nameEn: 'Agile', keywords: ['agile', 'scrum', 'sprint', 'kanban'], category: 'technical' },
    { name: '跨部门协作', nameEn: 'Cross-functional', keywords: ['cross-functional', 'cross functional', 'collaborate', 'stakeholder management'], category: 'soft' },
    { name: '项目管理', nameEn: 'Project Mgmt', keywords: ['project management', 'program management', 'pmp', 'jira'], category: 'soft' },
    { name: '数据驱动决策', nameEn: 'Data-Driven', keywords: ['data-driven', 'data driven', 'metrics', 'kpi'], category: 'soft' },
    { name: '领导力', nameEn: 'Leadership', keywords: ['leadership', 'lead', 'mentor', 'manage team'], category: 'soft' },
  ]

  const found: SkillData[] = []
  for (const sp of skillPatterns) {
    if (existingNames.has(sp.name)) continue
    const matched = sp.keywords.filter(kw => lower.includes(kw))
    if (matched.length > 0) {
      found.push({
        name: sp.name,
        nameEn: sp.nameEn,
        marketDemand: 60 + Math.min(matched.length * 8, 25), // 60-85 based on frequency
        trend: 'stable',
        rankChange: 0,
        category: sp.category,
        keywords: sp.keywords,
      })
    }
  }
  return found.slice(0, 6) // Cap at 6 JD-derived skills
}

export function getEnrichedSkills(targetRole: string, resumeText: string, jobDescription?: string): EnrichedSkill[] {
  const base = isMarketingRole(targetRole) ? MARKETING_SKILLS : GENERIC_SKILLS
  const existingNames = new Set(base.map(s => s.name))
  const jdSkills = extractJDSkills(jobDescription || '', existingNames)
  const allSkills = [...base, ...jdSkills]
  return allSkills.map(s => ({ ...s, status: matchSkill(s, resumeText) }))
}

export function calcMatchPct(skills: EnrichedSkill[]): number {
  const score = skills.reduce((acc, s) => {
    if (s.status === 'have')    return acc + 1
    if (s.status === 'partial') return acc + 0.5
    return acc
  }, 0)
  return Math.round((score / skills.length) * 100)
}

// Returns the top N missing skills (highest market demand first)
export function getMissingSkills(skills: EnrichedSkill[], n = 5): EnrichedSkill[] {
  return skills
    .filter(s => s.status === 'missing')
    .sort((a, b) => b.marketDemand - a.marketDemand)
    .slice(0, n)
}
