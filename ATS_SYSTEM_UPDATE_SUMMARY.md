# ATS 評分系統更新總結（2025-05-06）

## 概述
將 ATS 評分系統從 4 維度（舊系統）升級到 5 維度（新 2025 版本），並完全重寫評分邏輯以符合新的「證據驅動、保守評分、去品牌化」標準。

## 後端修改

### 1. `app/api/analyze/route.ts`
- ✅ 註釋掉舊的 4 維度系統（保留作參考）
- ✅ 實現新的 ATS_SYSTEM_PROMPT（支持 5 個維度 A-E）
- ✅ 新增「內容證據等級」評分框架（L4 強 → L1 極弱）
- ✅ 實現「無 JD 處理」邏輯（D 維最多 13 分）
- ✅ 實現「去品牌化」強制執行
- ✅ 更新 JSON 輸出格式：
  - `ats_score` 代替 `final_score`
  - `risk_level` 新增風險等級
  - `scoring_context` 標註 JD 提供狀態
  - `dimension_scores` 新 5 維度結構 (A/B/C/D/E)
  - `top_issues` 結構化為 rank + severity + impact
  - `priority_improvements` 3 項優先改進建議
  - `score_improvement_range` 提分預期

### 2. `lib/types.ts`
- ✅ 新增 `ATSScoreBreakdown` 介面（5 維度）
- ✅ 新增 `ATSIssue` 介面（rank, severity, issue, impact）
- ✅ 新增 `ATSImprovementAction` 介面（rank, action, expected_gain）
- ✅ 更新 `ATSResult` 型別
- ✅ 保留舊字段（可選）以維持向後相容性
- ✅ 註釋掉舊的 4 維度邏輯

## 前端修改

### 1. `components/sales/AnxietyDashboard.tsx`
- ✅ 完全重寫以支援新的 5 維度評分
- ✅ 新增 `RiskBadge` 組件顯示風險等級
- ✅ 更新 `DimensionBar` 以支援可變最大分數
- ✅ 新增「優先改進建議」章節（3 項）
- ✅ 新增「提分預期」提示框
- ✅ 新增「簡歷亮點」顯示
- ✅ 保留對舊格式的向後相容（自動偵測）
- ✅ 簡化評分邏輯（移除 penalties 計算）

### 2. `components/upsale/ATSOptimization.tsx`
- ✅ 更新以支援 `ats_score`（向後相容 `final_score`）
- ✅ 使用三元運算符安全地存取新舊字段

### 3. `app/result/page.tsx`
- ✅ 更新 `FormatComplianceAlert` 組件
- ✅ 改用 `dimension_scores.A_format_parsing`（新格式）
- ✅ 保留對舊 `scores` 的向後相容
- ✅ 移除對 `penalties` 的依賴

## 新評分系統特點

### 5 個維度及權重
1. **A. 解析與格式兼容性** (20分)
   - 頁數、排版、字體、日期、命名

2. **B. 信息完整性與結構組織** (20分)
   - 核心板塊齊全度、地點信息、Bullet 密度、技能分組

3. **C. 內容質量與成果表達** (35分) - 最重要！
   - 動作動詞、結果導向、量化成果、證據具體性、表達專業度

4. **D. 崗位關鍵詞與匹配性** (15分)
   - 核心術語、工具方法、方向一致性
   - **注意**：無 JD 時最多 13 分

5. **E. 最終投遞完成度** (10分)
   - 拼寫語法、重複問題、聯繫信息、整體成熟度

### 關鍵原則
1. **嚴禁推斷** - 只評估簡歷中明確寫出的內容
2. **去品牌化** - 不因學校/公司名氣加分
3. **保守一致** - 信息不足時選擇較低分檔
4. **證據驅動** - 4 級證據框架（L4 強 → L1 極弱）
5. **結果導向** - 優先級：證據強度 > 結果導向 > 結構完整性 > 關鍵詞 > 流暢度

### 風險等級判定
- **低風險** (✓): ≥70 且各維度無明顯短板
- **中風險** (△): 60-69 或缺 1 個核心板塊或量化極低
- **高風險** (✗): <60 或缺多個板塊或方向分散

## 向後相容性
所有前端組件都實現了向後相容邏輯：
- 自動偵測新舊格式 (`hasNewFormat`, `hasOldFormat`)
- 優先使用新字段，fallback 到舊字段
- 三元運算符安全存取

## 待辦事項
- [ ] 運行類型檢查驗證編譯 (`npm run type-check`)
- [ ] 啟動開發伺服器測試前端效果
- [ ] 使用測試簡歷進行端到端測試
- [ ] 驗證新 ATS API 響應格式
- [ ] 檢查資料庫中舊評分數據的遷移需求（如有需要）

## 測試清單
- [ ] `/sales` 頁面顯示新的 5 維度評分
- [ ] `/sales` 頁面顯示風險等級和評分上下文
- [ ] `/sales` 頁面顯示優先改進建議
- [ ] `/result` 頁面的格式合規警示正常運作
- [ ] `/upsale` 頁面的優化預估計算正確
- [ ] 舊格式數據仍能正確渲染（向後相容）

## 檔案清單
**修改的檔案：**
1. `app/api/analyze/route.ts` - 後端 ATS 評分邏輯
2. `lib/types.ts` - TypeScript 型別定義
3. `components/sales/AnxietyDashboard.tsx` - 主評分卡片組件
4. `components/upsale/ATSOptimization.tsx` - 優化預估組件
5. `app/result/page.tsx` - 結果頁面格式檢查

**保持原樣：**
- `app/sales/page.tsx` - 無需修改（已傳入 atsResult）
- 其他頁面和組件
