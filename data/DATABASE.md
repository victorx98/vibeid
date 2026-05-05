# Mentor Knowledge Base — Database Reference

SQLite 來源檔：`data/resume_material_library.db`
Supabase 目標 schema：`vibeid`
遷移指令：`npm run kb:migrate -- --apply`

---

## 整體用途

這個 DB 存的是**真實導師輔導場次的結構化知識**，不是產品用戶資料。

每一筆輔導紀錄的生命週期：
1. 導師跟學生做了一場 1:1 輔導（`sessions`）
2. 輔導逐字稿被切成一段段建議（`segments`）
3. 具體的改寫前後對比單獨存下來（`before_after_pairs`）

這些資料在 `app/api/analyze` 裡被用來產生有根據的 mentor advice，不是讓 Claude 自由發揮。

---

## 表關係

```
mentors ──┐
          ├── sessions ──┬── segments
students ─┘              └── before_after_pairs
```

---

## 各表說明

### `mentors`（11 筆）

導師的個人資料與專業背景。

| 欄位 | 說明 |
|---|---|
| `name`, `company`, `title` | 基本身份 |
| `industry_expertise` | 熟悉的產業（用於 retrieval 排名） |
| `coaching_positions` | 擅長輔導的職位類型 |
| `credibility_signal` | 說服力來源，如「前 Amazon PM，管過 50 人團隊」 |
| `career_path` | 職涯路徑，顯示在 UI 的導師卡片上 |
| `tech_skills` | 技術背景 |
| `rating`, `session_count` | 評分與場次數 |

---

### `students`（11 筆）

參與輔導的學生背景快照，**一人一筆**。

**身份欄位**

| 欄位 | 說明 |
|---|---|
| `name_en`, `name_zh`, `email` | 基本資料 |
| `school`, `major`, `gpa`, `graduation_year` | 學歷 |

**簡歷評估欄位**（輔導前的診斷）

| 欄位 | 說明 |
|---|---|
| `resume_strengths` | 這份簡歷的亮點 |
| `resume_weaknesses` | 這份簡歷的問題 |
| `key_experiences` | 主要實習 / 專案 |
| `background_summary` | 整體背景描述 |

**求職情境欄位**（enriched，部分為空待補）

| 欄位 | 說明 |
|---|---|
| `target_roles` | 一般性求職方向（可多個） |
| `target_job_title` | 最主要的目標職位 |
| `target_industry` | 目標產業 |
| `target_company_type` | 公司類型，如 startup / big tech / consulting |
| `education_level` | 學歷層級，如 master / bachelor |
| `years_experience` | 工作年資 |
| `key_skills` | 核心技能標籤 |
| `weakness_tags` | 已知弱點標籤，如 `lacks_metrics`, `career_switcher` |
| `visa_status` | OPT / H1B / citizen 等 |

---

### `sessions`（21 筆）

一場導師與學生的 1:1 輔導，是 segments 和 before_after_pairs 的父節點。

| 欄位 | 說明 |
|---|---|
| `mentor_id` | FK → mentors |
| `student_id` | FK → students |
| `session_date` | 輔導日期 |
| `target_job_title` | 這場輔導針對的具體職位 |
| `seniority_level` | entry / mid / senior |
| `direction` | 輔導方向備註 |
| `source_file` | 逐字稿來源檔案 |
| `transcript_line_range` | 對應逐字稿的行數範圍 |

---

### `segments`（164 筆）

知識庫核心。每一筆是一段從輔導逐字稿提取出的建議，結構化成可被 retrieval 使用的格式。

**來源定位**

| 欄位 | 說明 |
|---|---|
| `session_id` | FK → sessions |
| `segment_id` | 在 session 內的唯一 ID |
| `source_file`, `source_line` | 對應逐字稿位置 |

**建議內容（PLAIH 結構）**

| 欄位 | 說明 |
|---|---|
| `P_mentor` | 導師的診斷 |
| `L_logic` | 為什麼這樣改的邏輯 |
| `A_action` | 具體行動建議（**必填，空的不進 retrieval**） |
| `I_insight` | 更深層的洞察 |
| `H_hook` | 導師原話引用 |
| `E_example` | 改寫範例 |
| `HR_os` | HR 視角補充 |
| `F_formula` | 可套用的公式或框架 |

**分類標籤（L1 / L2 / L3）**

| 欄位 | 說明 |
|---|---|
| `L1` | 一級分類，如「量化成就」「技能區塊」「格式合規」。**參與 retrieval 排名** |
| `L2` | 二級分類。**參與 retrieval 排名** |
| `L3` | 三級分類。**Display label only，不參與 retrieval** |
| `topic` | 自由描述的主題 |
| `resume_section` / `resume_section_tag` | 對應簡歷的哪一區塊 |
| `advice_type` | 建議類型 |

**Retrieval 控制欄位**

| 欄位 | 說明 |
|---|---|
| `generality` | `universal`（通用）/ `industry-specific` / `role-specific` |
| `confidence` | `high` / `medium` / `low`，low 的不進 retrieval |
| `industry_fit` | 產業匹配分數（整數，越小越相關） |
| `background_fit` | 學生背景匹配分數 |
| `level_fit` | 資歷層級匹配分數 |
| `keyword_tags` | 關鍵字標籤 |
| `trigger_conditions` | 什麼情況下這段建議才適用 |
| `target_student_archetype` | 適用的學生類型，如「career_switcher」 |

**情境 metadata（新增，待填）**

| 欄位 | 說明 |
|---|---|
| `target_job_title` | 這段建議原本針對什麼職位說的 |
| `target_seniority` | 針對什麼資歷層級 |
| `student_background_tags` | 學生背景標籤，如 `new_grad`, `international_student` |
| `issue_tags` | 對應的簡歷問題類型，如 `lacks_metrics`, `weak_action_verbs` |
| `outcome_quality` | 這段建議的實際效果評估 |

---

### `before_after_pairs`（29 筆）

具體的改寫前後對比，是 segments 的補充說明，讓 Claude 有具體範例可參考。

| 欄位 | 說明 |
|---|---|
| `session_id` | FK → sessions |
| `before_text` | 原始 bullet / 段落 |
| `after_text` | 改寫後版本 |
| `reason` | 為什麼這樣改 |
| `issue_tags` | 對應的問題標籤 |
| `mentor_quote` | 導師在改寫時說的話 |
| `L3_tag` | 對應 segments 的 L3 分類 |
| `C_cta` | 行動呼籲 |
| `freq_stat` | 頻率統計（這類問題有多普遍） |

---

## Retrieval 邏輯（目前）

`lib/kb-store.ts` 的 `getMentorKnowledgeBase()` 做了以下事情：

1. 從 `targetRole + jobDescription` 抽關鍵字
2. 用關鍵字對 mentors 排名（match `title / industry_expertise / coaching_positions`）
3. 拉 `generality = 'universal'` 且 `confidence = high` 的 segments（前 25 筆）
4. 拉 `industry-specific / role-specific` 的 segments，用 JD 關鍵字排名（前 15 筆）
5. 拉前 12 筆 before_after_pairs
6. 全部塞進 Claude prompt，由 Claude 合成建議

---

## 與 Supabase 的對應

| SQLite 表 | Supabase 表 | 備註 |
|---|---|---|
| `mentors` | `vibeid.mentors` | 多了 `active`, `consent_status` 欄位 |
| `students` | `vibeid.source_students` | 名稱不同，避免跟產品用戶混淆 |
| `sessions` | `vibeid.sessions` | 相同 |
| `segments` | `vibeid.segments` | 相同 |
| `before_after_pairs` | `vibeid.before_after_pairs` | 相同 |

Migrations 路徑：`supabase/migrations/`
- `0002_vibeid_kb.sql` — 建表
- `0004_kb_context_enrichment.sql` — 新增情境欄位
