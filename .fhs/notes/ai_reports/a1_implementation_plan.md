# A3 工作流優化 — Implementation Plan v2.1

> Source: Fat Mo submitted implementation plan for final review
> 日期：2026-03-31
> 審議方：A3 (Claude Code)

## 1. 文件目的

本計畫旨在針對現行 Freehandsss 多代理協作系統，整理並優化 A1、A2、A3 的協作方式，尤其聚焦於 A3 指令鏈的收口、授權邊界、命名一致性，以及最終自動化流程。

本計畫不是要推翻現有 `GLOBAL_AI_SOP v2.0`，而是在其已落地的基礎上，補強仍未完全收口的部分，令整套系統由「可運作」進一步升級為「可穩定、可審計、可擴充」。

本文件現提交予 **A3（Claude Code）作最終審議**。
A3 請以最終技術審查、執行安全、命令設計一致性、路徑與檔案可讀性、以及實際落地可行性為主軸，審視本 plan 是否可批准落地。

Fat Mo 為最終決策者。

---

## 2. 背景

現行系統已不再是單一 AI 工作流，而是多代理協作架構。

### 2.1 Fat Mo 背後的原生系統操場

Fat Mo 現時的 AI 工作環境，不是三個完全分散的獨立平台，而是**同一個 Antigravity tool 裏面的三層路由系統**：

- **A1 = `/px`**（Perplexity）
- **A2 = Antigravity 原生 model**
- **A3 = Claude Code for VS**

### 2.2 現行角色定位

- **A1**：提供外部視角、第三方審視、外部 implementation plan。
- **A2**：提供本地環境理解、本地 implementation plan。
- **A3**：作最終技術審查、裁決與執行。
- **Fat Mo**：作跨 agent 指令啟動者、最終批准者、以及三層路由中的人類主權控制者。

---

## 3. 為何需要再優化

### 3.1 `/a3go` 語義仍可能殘留舊理解
### 3.2 A1 / A2 命名規範未必完全同步
### 3.3 Fat Mo 的橋接角色仍偏向現實前提，未完全制度化
### 3.4 同一操場，不代表自動無衝突
### 3.5 A2 審視後新增的本地實作風險

- **Artifacts 陷阱**：若不硬性指定寫入路徑，A2 可能把報告存成隱藏 artifact。
- **I/O 時間差**：A2 剛完成寫檔、A3 立即讀取時，可能讀到空檔或未完整檔案。
- **過度熱心的隱性改寫**：A2 或 A3 在純審查狀態下，可能因看到錯誤而「順手修正」。
- **Context Pollution**：若 A3 在同一個舊 session 直接接手，可能被 A2 先前的草稿污染判斷。

---

## 4. 問題定義

### 4.1 語義問題 — `/cl-flow` 定義未完全收口
### 4.2 流程問題 — A1 → A2 → A3 最終交接仍有手動成分
### 4.3 授權問題 — 「先問詢，後寫入」原則尚需硬規則
### 4.4 維護問題 — 命名、路徑、文件層未同步
### 4.5 系統理解問題 — 三層路由需明文釐清

---

## 5. 本次優化的核心理由

1. **沉澱**：把已討論清楚的制度正式寫死
2. **優化**：令 `/cl-flow` 真正變成一鍵到最終報告的穩定流程
3. **效能提升**：減少每次重新解釋命名、路徑、授權邊界的人手成本
4. **消除衝突**：避免新舊語義造成混亂
5. **統一理解**：確保 A1、A2、A3 都明白自己是在同一個 Antigravity 原生操場內分工

---

## 6. 目標狀態

### 6.1 新指令命名系統（正式採用）

| 指令 | 中文說明 | 平台 |
|------|---------|------|
| `/px-plan` | px 出 plan | Perplexity |
| `/ag-plan` | ag 出 plan | Antigravity |
| `/cl-plan` | cl 出 plan | Claude |
| `/cl-review` | cl 給我審視報告 | Claude |
| `/cl-flow` | cl 給我最終報告 | Claude |
| `/execute` | 同意執行 / 可以執行 | Claude |

### 6.2 授權層
- `/cl-flow` 不等於寫入授權
- `/execute` 才是唯一執行入口
- 沒有 Fat Mo 的明確批准，任何 AI 不得寫入

### 6.3 上下文層
- Fat Mo 是唯一跨 agent、跨輪審視、跨上下文的最終承認者
- 任一 agent 的結論，不得自動視為另一 agent 或 Fat Mo 已確認

### 6.4 文件層
- 所有 plan 必須直接寫入 `.fhs/notes/ai_reports/`
- A3 只以此正式路徑中的檔案作為審查依據

---

## 7. 建議解法

### 7.1 Command Family 重構

- `/cl-flow`：讀取 A1/A2 plan → 做最終審查 → 輸出 verdict → 停止等待 Fat Mo
- `/execute`：在 Fat Mo 明確批准後，根據 verdict 執行已批准的修改

### 7.2 命名與寫入規則強化

- A1 / A2 產出的 implementation plan，**必須直接寫入** `.fhs/notes/ai_reports/`
- 不接受只存在於 chat 訊息中的內容
- 不接受只產生 artifact 而未落盤的內容

### 7.3 Hard Switch 命名策略

- 新命名一旦批准，即成唯一有效命名
- 舊命名立即視為除役
- 若 A3 讀不到新命名檔案，應直接報錯並停止

---

## 8. 最終自動化程序

### 8.1 `/cl-flow` 應做的完整步驟

1. 確認目前處於 A3 審查階段
2. 檢查以下正式檔案是否存在且非空：
   - `.fhs/notes/ai_reports/a1_implementation_plan.md`
   - `.fhs/notes/ai_reports/a2_implementation_plan.md`
3. 若任一檔案缺失或空白：
   - 立即回報問題（不存在 → 立即停止；空白 → 5 秒後重試一次）
4. 讀取 A1 plan → 讀取 A2 plan
5. 比對兩者：衝突 / 缺漏 / SOP 違規 / 授權風險 / 路徑問題
6. 產出 `a3_execution_verdict.md`
7. 停止，等待 Fat Mo 最終決定

### 8.2 NO-TOUCH GUARDRAIL

> 在 `/cl-flow` 的審查與 verdict 階段，絕對禁止使用任何會修改檔案、建立新檔、覆寫內容、刪除內容的工具或操作。
> 若 A3 在此階段發生任何實際寫入行為，應視為嚴重違規，必須立即停止並回報 Fat Mo。

### 8.3 `/execute` 應做的完整步驟

1. 確認 `a3_execution_verdict.md` 存在
2. 確認 Fat Mo 已明確批准
3. 重新列出準備修改的檔案
4. 僅執行已批准內容
5. 逐 phase 回報，不得靜默完成

---

## 9. 檔名與路徑標準化

| 檔案 | 路徑 |
|------|------|
| A1 plan | `.fhs/notes/ai_reports/a1_implementation_plan.md` |
| A2 plan | `.fhs/notes/ai_reports/a2_implementation_plan.md` |
| A3 verdict | `.fhs/notes/ai_reports/a3_execution_verdict.md` |

採 **Hard Switch**：不保留 fallback，讀不到新命名即報錯停止。

---

## 10. 風險評估

| 風險 | 緩解 |
|------|------|
| Artifacts 陷阱 | 強制直接寫入 `.fhs/notes/ai_reports/` |
| I/O 時間差 | 空檔等待 5 秒後重試一次 |
| 過度熱心的隱性改寫 | NO-TOUCH GUARDRAIL |
| Context Pollution | A3 優先在新 session 中，只看正式 `.md` 檔案 |
| 新舊命名混用 | Hard Switch，讀不到新命名即停止 |
| 同場自動承認錯覺 | 明寫 Fat Mo 才是最終承認者 |

---

## 11. 最終結論

本 plan 的本質，不是增加更多指令，而是把現有已經逐步成形的多代理系統，真正收口成一套有清晰邊界、有安全閘門、有穩定命名、有一致系統理解的 command 架構。

**A3 已批准。Fat Mo 已批准。本文件為本輪正式主 plan 基準文件。**
