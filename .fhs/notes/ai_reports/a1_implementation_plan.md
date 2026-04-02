# A1 Implementation Plan: Architecture Hygiene & Command Consistency (PX-Plan)
**Date:** 2026-04-03
**Agent:** A1 (Outer Brain / Perplexity Perspective)

## 1. 外部最佳實踐審視 (External Best Practices)

根據對多代理 (Multi-agent) 協作與 AI 優化代碼庫的研究，本計畫旨在強化系統的「機器可讀性」與「操作一致性」。

### 1.1 核心原則：單一真理來源 (Single Source of Truth)
*   **建議**：所有 Agent (CL, AG, PX) 必須共享同一套憲法 (`AGENTS.md`) 與路由表 (`FHS_Prompts.md`)。
*   **優化**：更新路由表至 v1.3，將 v2.1.0 的規劃指令正式標準化，避免 Agent 在不清楚流程的情況下進行「盲目規劃」。

### 1.2 資源清理與雜訊抑制 (Noise Reduction)
*   **建議**：刪除根目錄中的 `repomix-output.txt`。
*   **理由**：大型文字檔會干預 AI 的全域搜尋 (grep) 結果，產生大量無關的上下文雜訊，降低決策效率。

### 1.3 指令生命週期管理 (Command Lifecycle)
*   **建議**：對已退役指令 (`a3go`, `reflect`) 執行「封存」而非「保留」。
*   **理由**：保留別名雖具備向下相容性，但在強大的 LLM 环境下，容易引發「指令過載 (Command Overload)」，使 AI 選擇低效的路徑。

## 2. 規劃建議 (Proposed Actions)

1.  **結構同步**：確保 `repo-map.md` 反映 `.fhs/` 與 `.claude/` 的雙層架構，這有助於新加入的 Agent 快速理解協作協議。
2.  **文件修復**：修正 `scripts/README.md` 中的過時引用，維持文檔的誠實性。
3.  **路由升級**：正式在 `FHS_Prompts.md` 中定義【情境十二：全自動規劃流 (v2.1.0 /cl-flow)】。

---
**Status:** `DRAFT_READY`
