---
description: freehandsss-optimizer-v2 Agent Chain
---

# freehandsss-optimizer-v2 Agent Chain

此工作流定義了 `freehandsss-optimizer-v2` 的協作模式，旨在根據系統文件進行自動化審查與優化。

## 角色分工 (Role Delegation)

1. **Agent 1 — Perplexity (外部研究與審查)**
   - **觸發指令**: `/px audit` 或 `/px 審查`
   - **動作**: 
     - 讀取 [AGENTS.md](file:///D:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/ai/AGENTS.md) 與 [Triple_Sync_Field_Map.md](file:///D:/SynologyDrive/Free_handsss/freehandsss_dashboard/n8n/Triple_Sync_Field_Map.md)。
     - 根據文件所述現況，搜尋外部最佳路徑 (n8n workflow 效率、Airtable 結構、前端效能)。
     - 輸出優化摘要、對標分析與實施建議。

2. **Agent 2 — Claude Code (深度實施)**
   - **動作**: 
     - 接收 Agent 1 的建議。
     - 直接修改 [freehandsss_dashboardV36.html](file:///D:/SynologyDrive/Free_handsss/freehandsss_dashboard/freehandsss_dashboardV36.html) 或相關 n8n workflow。
     - 確保修改符合 `/.fhs/ai/AGENTS.md` 的架構守則與三端約束。

## 執行流程 (Flow)

1. 用戶或開發者輸入 `/px audit`。
2. Perplexity 執行審查並生成報告。
3. Claude Code 根據報告內容，評估並執行代碼或工作流變更。
4. 完成後更新 `Changelog.md`。
