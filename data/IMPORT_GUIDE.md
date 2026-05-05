# 从 Transcript 导入导师知识库

## 概述

已从 60 个辅导会话的 transcript 中自动提取了 **4,232 个结构化建议段落**，包含 30 位导师及 56 个学生背景。

## 生成的文件

```
d:\Work\MentorX\vibeid\data\extracted_sessions\
├── extracted_sessions.json          # 完整的结构化数据（指标、导师、学生、段落）
└── import_segments.sql              # 初步的 SQL INSERT 语句
```

## 数据统计

| 类别 | 数量 |
|------|------|
| 会话数 | 60 |
| 导师数 | 30 |
| 学生数 | 56 |
| 建议段落 | 4,232 |
| 提取日期 | 2026-05-04 |

## 数据结构

### 每个段落 (Segment) 包含

```json
{
  "session_id": "uuid-string",
  "segment_id": "T01-S001",
  "L1": "简历优化",
  "L2": "内容改进", 
  "L3": null,
  "topic": "导师的诊断开场",
  "P_mentor": "导师的问题诊断",
  "L_logic": "为什么这样改的逻辑（可选）",
  "A_action": "具体建议行动（必填，用于retrieval）",
  "I_insight": "更深层洞察（可选）",
  "H_hook": "导师原话引用",
  "HR_os": "HR视角补充（可选）",
  "confidence": "medium",
  "generality": "universal",
  "resume_section": "experience|skills|education|projects|summary|null",
  "advice_type": "resume_revision"
}
```

### 导师 (Mentor) 数据

```json
{
  "name": "Jacob Zhang",
  "company": "Barclays",
  "title": "AVP",
  "industry_expertise": [],
  "coaching_positions": ["Business Analyst", "Data Analyst", "Risk Analyst"],
  "credibility_signal": "职业背景描述...",
  "career_path": null,
  "tech_skills": []
}
```

### 学生 (Student) 数据

```json
{
  "name_en": "Jinghan(Jessica) Cao",
  "name_zh": "曹靖涵",
  "target_role": "Business Analyst",
  "background_summary": null
}
```

## 导入步骤

### 1. 验证 JSON 数据完整性

```bash
cd d:\Work\MentorX\vibeid\data\extracted_sessions
python -c "
import json
data = json.load(open('extracted_sessions.json', encoding='utf-8'))
print(f'Mentors: {len(data[\"mentors\"])}')
print(f'Students: {len(data[\"students\"])}')
print(f'Segments: {len(data[\"segments\"])}')
"
```

### 2. 编写迁移脚本

需要创建 `supabase/migrations/0005_import_extracted_sessions.sql` 来：

```sql
-- 1. 插入新的导师记录
INSERT INTO vibeid.mentors 
  (id, name, company, title, industry_expertise, coaching_positions, 
   credibility_signal, career_path, tech_skills, active, created_at)
SELECT 
  1000 + ROW_NUMBER() OVER () as id,
  data->>'name',
  data->>'company',
  data->>'title',
  (data->>'industry_expertise')::jsonb,
  (data->>'coaching_positions')::jsonb,
  data->>'credibility_signal',
  data->>'career_path',
  (data->>'tech_skills')::jsonb,
  true,
  now()
FROM (
  SELECT '{"name": "...", ...}'::jsonb as data
) t
ON CONFLICT (id) DO NOTHING;

-- 2. 插入学生记录
INSERT INTO vibeid.source_students
  (id, name_en, name_zh, target_roles, created_at)
SELECT 
  2000 + ROW_NUMBER() OVER (),
  ...
FROM ...
ON CONFLICT (id) DO NOTHING;

-- 3. 创建会话连接
INSERT INTO vibeid.sessions
  (session_date, mentor_id, student_id, direction, created_at)
SELECT ...;

-- 4. 导入段落
INSERT INTO vibeid.segments
  (session_id, segment_id, L1, L2, L3, topic, 
   P_mentor, A_action, H_hook, 
   confidence, generality, resume_section, advice_type, created_at)
SELECT ...;
```

### 3. 应用迁移

```bash
npm run db:migrate
```

### 4. 验证导入

```sql
SELECT COUNT(*) as segments FROM vibeid.segments;
SELECT COUNT(DISTINCT session_id) as sessions FROM vibeid.segments;
SELECT COUNT(*) as mentors FROM vibeid.mentors WHERE active = true;

-- 检查 retrieval 工作是否正常
SELECT * FROM vibeid.segments 
WHERE generality = 'universal' 
  AND "A_action" IS NOT NULL 
LIMIT 5;
```

## 数据质量说明

### 优势
✅ 从真实辅导 transcript 提取，非 AI 生成  
✅ 包含完整的导师经历和学生背景信息  
✅ 4,232 个段落提供丰富的咨询覆盖面  

### 限制
⚠ 简单的 heuristic 分割（非 NLP）— 部分段落可能人工需要微调  
⚠ L1/L2 分类是根据target_role猜测的 — 建议人工验证  
⚠ confidence 全部设为 "medium" — 建议根据内容质量调整  
⚠ 无 before_after_pairs — 逐字稿中难以自动识别改写对比  

## 后续改进

1. **使用 Claude API 优化分割和分类**
   ```python
   # pseudo-code
   segments = await claude.extract_segments(transcript)
   # 会返回更精准的 PLAIH 结构和标签
   ```

2. **从改写案例提取 before_after_pairs**
   ```python
   # 寻找 transcript 中的"改前：... 改后：..." 模式
   ```

3. **质量评分和置信度标记**
   ```python
   confidence = assess_confidence(segment_text, action_clarity)
   ```

4. **导师属性自动补全**
   ```python
   # 使用 LinkedIn 或手动输入丰富：
   # - industry_expertise
   # - career_path
   # - tech_skills
   ```

## 原始数据位置

所有 transcript 位于：
```
D:\Work\MentorX - Other\From Eric\Resume fix source data\Resume fix source data
├── 2cbb2c20-7975-4fb2-83be-1e77cb8d1041-2026-03-31-数据分析...
│   ├── meeting_metadata.json
│   ├── meeting_transcript.txt
│   └── student_resumes/
├── 002...
│   ├── meeting_metadata.json
│   ├── meeting_transcript.txt
│   └── ...
└── ... (60 个会话文件夹)
```

## 提取脚本

```bash
# 重新提取（生成新的 JSON + SQL）
python scripts/extract_transcripts.py

# 导入到 Postgres（待实现完整版本）
python scripts/import_sessions.py
```

---

**Extraction Date**: 2026-05-04  
**Source**: 60 live mentoring sessions  
**Status**: ✅ Ready for manual review and import
