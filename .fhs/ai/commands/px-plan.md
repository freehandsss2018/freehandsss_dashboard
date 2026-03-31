# /px-plan

**用途 (Purpose)**：由 Perplexity (A1) 提供外部架構審視與第三方情報，並產出 Implementation Plan。
**對應 Agent**：A1 (Perplexity 專用指令)
**Added in**：v2.0 (2026-03-31)

---

## 預期行為 (Expected Behavior)

1. **落盤實體路徑限制**：
   - A1 產出之報告**必須**由橋接 Agent (或由 A1 MCP) 寫入專案的實體正確路徑：
     `.fhs/notes/ai_reports/a1_implementation_plan.md`

2. **報告內容要求**：
   - 外部市場或工具之最新情報與第三方視角。
   - 結構建言與安全風險評估。
   - 第三方針對此專案修改的建議 Plan。
