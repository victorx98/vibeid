import { NextRequest } from 'next/server'
import { callClaude } from '@/lib/claude'
import { MentorAdvice, MentorAdviceItem, AdviceFeedback } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    const { resumeText, targetRole, jobDescription, mentorAdvice, adviceFeedback } = await request.json() as {
      resumeText: string
      targetRole: string
      jobDescription?: string
      mentorAdvice: MentorAdvice[]
      adviceFeedback?: Record<string, AdviceFeedback>
    }

    if (!resumeText || !targetRole) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Step 1: Filter advice by user feedback ─────────────────────
    const acceptedAdvice: {
      mentor: string
      company: string
      items: MentorAdviceItem[]
    }[] = []

    const skippedSummary: string[] = []

    for (const mentor of (mentorAdvice || [])) {
      const accepted: MentorAdviceItem[] = []

      if (!Array.isArray(mentor.advice)) continue

      mentor.advice.forEach((item, idx) => {
        const key = `${mentor.id}-${idx}`
        const fb = adviceFeedback?.[key]

        if (fb?.accepted === false) {
          skippedSummary.push(`${mentor.mentorName}: ${item.problem}`)
        } else {
          accepted.push(item)
        }
      })

      if (accepted.length > 0) {
        acceptedAdvice.push({
          mentor: mentor.mentorName,
          company: mentor.company,
          items: accepted,
        })
      }
    }

    // ── Step 2.5: Group & merge advice targeting the same content ──
    // Instead of organizing by mentor, we group by target location in
    // the resume so Claude receives one consolidated instruction per
    // bullet / section rather than potentially conflicting per-mentor
    // instructions.

    interface MergedAdviceGroup {
      locationKey: string          // normalized studentStatus text
      studentStatus: string        // original quote from resume
      mentorInputs: {
        mentor: string
        company: string
        priority: string
        problem: string
        mentorPerspective: string
        suggestion: string
        example?: string
      }[]
    }

    const normalize = (s: string): string =>
      s.replace(/[\s""''「」【】《》\-—·•,，.。;；:：!！?？]/g, '').toLowerCase().slice(0, 80)

    const mergedGroups: MergedAdviceGroup[] = []
    const groupIndex: Record<string, number> = {}

    for (const block of acceptedAdvice) {
      for (const item of block.items) {
        const rawStatus = item.studentStatus || ''
        const key = normalize(rawStatus)

        // Try to find an existing group whose key overlaps significantly
        let matchedIdx: number | undefined
        if (key.length > 10) {
          // Check for substring overlap (one contains the other)
          for (const [existingKey, idx] of Object.entries(groupIndex)) {
            if (existingKey.includes(key.slice(0, 30)) || key.includes(existingKey.slice(0, 30))) {
              matchedIdx = idx
              break
            }
          }
        }

        const input = {
          mentor: block.mentor,
          company: block.company,
          priority: item.priority || 'P1',
          problem: item.problem || '',
          mentorPerspective: item.mentorPerspective || '',
          suggestion: item.suggestion || '',
          example: item.example,
        }

        if (matchedIdx !== undefined) {
          mergedGroups[matchedIdx].mentorInputs.push(input)
        } else {
          const newIdx = mergedGroups.length
          groupIndex[key] = newIdx
          mergedGroups.push({
            locationKey: key,
            studentStatus: rawStatus,
            mentorInputs: [input],
          })
        }
      }
    }

    // ── Step 2.6: Serialize merged groups ─────────────────────────
    const formatMergedGroup = (group: MergedAdviceGroup, idx: number): string => {
      const header = `修改点 ${idx + 1}（${group.mentorInputs.length}位导师建议）`
      const location = `  简历原文: ${group.studentStatus || '(未指定位置)'}`

      const inputs = group.mentorInputs.map((inp, j) => {
        // Strip any mentor real names from mentorPerspective text
        const cleanPerspective = (inp.mentorPerspective || '(未提供)')
          .replace(new RegExp(inp.mentor, 'g'), '业内导师')
        const cleanProblem = (inp.problem || '(未提供)')
          .replace(new RegExp(inp.mentor, 'g'), '业内导师')
        const cleanSuggestion = (inp.suggestion || '(未提供)')
          .replace(new RegExp(inp.mentor, 'g'), '业内导师')

        const parts = [
          `  [导师${j + 1} - ${inp.company}行业背景] [${inp.priority}]`,
          `    问题: ${cleanProblem}`,
          `    导师视角: ${cleanPerspective}`,
          `    改写方向: ${cleanSuggestion}`,
        ]
        if (inp.example) {
          const cleanExample = inp.example.replace(new RegExp(inp.mentor, 'g'), '业内导师')
          parts.push(`    改写示范: ${cleanExample}`)
        }
        return parts.join('\n')
      }).join('\n  ──\n')

      // If multiple mentors target the same spot, add a merge instruction
      const mergeNote = group.mentorInputs.length > 1
        ? `\n  ⚠ 多位导师建议涉及同一处内容，请综合所有建议的精华进行一次改写，不要重复修改。`
        : ''

      return `${header}\n${location}\n${inputs}${mergeNote}`
    }

    const acceptedSection = mergedGroups.length > 0
      ? mergedGroups.map((g, i) => formatMergedGroup(g, i)).join('\n\n---\n\n')
      : ''

    const skippedSection = skippedSummary.length > 0
      ? `\n以下建议用户选择跳过，不要执行：\n${skippedSummary.map(s => `- ${s}`).join('\n')}`
      : ''

    // ── Step 3: Two-phase approach ─────────────────────────────────
    // Phase A: Convert raw resume text → clean Markdown (preserve structure)
    // Phase B: Apply mentor advice to the Markdown

    const formatPrompt = `将以下简历纯文本转换为标准 Markdown 格式。

严格规则：
1. 名字 → # 一级标题
2. 联系方式 → 名字下方一行，用 | 分隔（邮箱、电话、LinkedIn等）
3. 每个 Section → ## 大写英文标题（如 ## EDUCATION, ## WORK EXPERIENCE, ## PROJECTS, ## SKILLS）
4. 公司/学校 → **名称** — 地点 | 日期（同一行）
5. 职位/学位 → 公司下方单独一行，不加粗
6. 每条经历描述 → 用 - 开头（bullet point）
7. Skills → - **类别:** 技能1, 技能2, 技能3
8. 保持原始简历的所有内容，不增不减，只做格式转换
9. Section 的顺序保持与原始简历一致
10. 如果原始简历是英文，保持英文；如果是中文，保持中文

原始简历文本：
${resumeText.slice(0, 5000)}`

    const formattedResume = await callClaude(
      '你是一个简历格式化工具。只做纯文本到Markdown的格式转换，不修改任何内容。',
      formatPrompt,
      0,
      { maxTokens: 4096 }
    )

    // Phase B: Apply advice
    const jdOptimizeSection = jobDescription
      ? `\n\n## 目标职位 JD（改写时必须参考）\n${(jobDescription as string).slice(0, 2000)}\n\n重要：改写 bullet 时，优先融入 JD 中出现的关键词和技能名称，确保优化后的简历与目标 JD 高度匹配。`
      : ''

    const optimizePrompt = `你是一位专业的简历优化师。在下面的 Markdown 简历基础上，根据导师建议进行修改。

## 核心原则
1. 保持原始简历的结构、顺序、Section 划分完全不变
2. 只修改导师建议涉及的具体 bullet 或内容
3. 没有建议涉及的内容 → 原封不动保留
4. 不要新增 Section，不要删除 Section，不要改变 Section 顺序
5. 不要修改名字、联系方式、学校名、公司名、日期、职位名称
6. **绝对禁止**在输出简历中提到任何导师的真实姓名、公司名引用、或"正如某导师所说"等表述。输出内容只能是纯简历文字，不可包含任何导师信息
7. 如果提供了目标职位 JD，改写时必须优先使用 JD 中的关键词和技能术语，最大化 ATS 关键词匹配率

## 修改方式
- 每个"修改点"对应简历中的一处位置 → 找到该位置的原始 bullet 进行改写
- 如果同一修改点有多位导师的建议，综合所有建议的精华进行**一次**改写，取各建议中最有价值的部分合并
- 不要对同一个 bullet 改写多次或产生重复内容
- 如果建议要求新增 bullet → 在对应公司/项目下方添加
- 用 [[highlight]]...[[/highlight]] 包裹你修改或新增的文字片段
- 只包裹具体修改的词/短句，不要包裹整个 bullet
- 使用 STAR 法则，量化成果

## 格式规则（不可违反）
- 名字: # 一级标题
- 联系方式: 名字下方一行
- Section: ## 大写英文标题
- 公司/学校: **名称** — 地点 | 日期
- 职位/学位: 单独一行，不加粗
- Bullet: 必须用 - 开头
- Bullet 内不要用 **加粗**
- Skills: - **类别:** 技能列表

---

## 当前 Markdown 简历（在此基础上修改）

${formattedResume}

---

## 修改指令（按简历位置分组，每个修改点执行一次改写）

${acceptedSection || '（无修改指令，请原样输出简历）'}
${skippedSection}
${jdOptimizeSection}

---

请输出修改后的完整简历 Markdown。保持原始结构不变，只改建议涉及的部分。`

    let optimizedResume = await callClaude(
      '你是一位简历优化师。严格按要求在原始简历基础上做最小化修改，保持原始结构不变。',
      optimizePrompt,
      0,
      { maxTokens: 8192 }
    )

    // ── Post-processing: sanitize output ─────────────────────────
    // 1. Normalize highlight tags to lowercase (Claude sometimes outputs UPPERCASE)
    optimizedResume = optimizedResume
      .replace(/\[\[HIGHLIGHT\]\]/gi, '[[highlight]]')
      .replace(/\[\[\/HIGHLIGHT\]\]/gi, '[[/highlight]]')

    // 2. Fix mismatched / unclosed highlight tags
    //    Sequential balance pass: preserve valid pairs, strip orphaned/nested tags only.
    //    Previously we nuked ALL highlights on any mismatch — this caused the toggle
    //    button to disappear entirely when Claude was off by even 1 tag.
    {
      const parts = optimizedResume.split(/(\[\[highlight\]\]|\[\[\/highlight\]\])/g)
      let balance = 0
      optimizedResume = parts.map(part => {
        if (part === '[[highlight]]') {
          if (balance === 0) { balance++; return part }
          return ''  // strip nested open
        }
        if (part === '[[/highlight]]') {
          if (balance > 0) { balance--; return part }
          return ''  // strip orphaned close
        }
        return part
      }).join('')
      // If balance > 0, one unclosed [[highlight]] remains at the end — strip it
      if (balance > 0) {
        // Remove the last [[highlight]] that has no closing tag after it
        optimizedResume = optimizedResume.replace(/\[\[highlight\]\](?![\s\S]*\[\[\/highlight\]\])/, '')
      }
    }

    // 3. Remove any other non-Markdown artifacts Claude may have inserted
    //    (e.g. ```markdown fences, leading/trailing explanation text)
    optimizedResume = optimizedResume
      .replace(/^```(?:markdown)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .trim()

    return Response.json({ optimizedResume })
  } catch (error) {
    console.error('Optimize error:', error)
    return Response.json({ error: 'Optimization failed' }, { status: 500 })
  }
}
