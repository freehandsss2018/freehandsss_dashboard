# /px audit（外部研究與系統審查）

用途：由 Perplexity 擔任第三方審計員，提供獨立第二意見。

觸發條件：
- 手動輸入 /px audit 或 /px 審查
- Fat Mo 需要外部驗證時

三步驟流程：
1. 拉取現況：讀取 .fhs/ai/AGENTS.md + n8n/Triple_Sync_Field_Map.md（注意：不是 CLAUDE.md）
2. 外部對標：搜尋 n8n workflow 效率、Airtable 資料結構優化、前端 POS 系統效能與 UX 最佳實踐
3. 輸出報告：現況摘要（3點）→ 外部對標發現（3點）→ 優化建議（優先級排序）→ 風險提示（標記 🔴🟡🟢）

角色定位：第三方審計員，只輸出建議，不執行任何修改。
