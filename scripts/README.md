# scripts/ — 輔助腳本

本資料夾存放專案維護與排錯的輔助腳本。

| 檔案 | 用途 |
|---|---|
| `Sync_Notion_Brain.js` | 將核心邏輯或災難分析同步寫入 Notion 以作為雲端記憶備份 |
| `cl-flow-runner.js` | `/cl-flow` 協調器核心 — 並行調用 Perplexity + Gemini API，生成真實 artifact |

## Legacy 歷史資料遷移與校正腳本

此區腳本主要用於處理 2026 年初歷史資料遷移與財務校正，目前已處於穩定狀態（無需進一步修改），但保留於此以備不時之需或作為代碼參考。

| 檔案 | 用途 |
|---|---|
| `sync-legacy-orders.js` | **訂單匯入**：一次性批量匯入 2026-01 ~ 2026-04 的 Excel 歷史訂單資料至 Airtable 結構。 |
| `update-legacy-profit.js` | **利潤校正**：聚合舊訂單的各項目成本（Order Items Cost），計算並回填 `Total_Cost` 與 `Net_Profit`。 |
| `update-legacy-sale-price.js` | **售價校正**：針對非 P 系列舊訂單，自動調整最終售價以包含缺失的木框產品成本 (+ $2,380)，並同步更新利潤。 |
| `deploy-order-confirm-date.js` | **自動化部署**：透過 n8n REST API 自動更新工作流節點，加入 `Order_Confirm_Date` 的新欄位映射。 |

## hooks/ — Claude Code Hooks 執行層

新增於 2026-04-28。由 `.claude/settings.json` 配置，在對應 lifecycle 事件時自動執行。

| 腳本 | 觸發事件 | 用途 |
|------|---------|------|
| `hooks/session-start-sop.sh` | `SessionStart` | 自動注入 SOP_NOW 快照 + handoff 待辦，取代手動 `/read` |
| `hooks/prompt-router.js` | `UserPromptSubmit` | 分析任務描述，建議最適 subagent / skill / model（建議模式，不強制）|
| `hooks/pre-tool-guard.js` | `PreToolUse (Write\|Edit\|Bash)` | 守護 AGENTS.md 硬規則：阻止覆蓋 current.html、硬編碼 API key、git add .env 等違規操作 |

**回滾方法**：刪除 `.claude/settings.json` 中的 `hooks` 區段即可停用所有 hooks，腳本檔案不受影響。

## cl-flow-runner.js 使用說明

**直接使用**（Claude 會自動觸發，通常不需手動執行）：

```bash
node scripts/cl-flow-runner.js "你的任務描述"
```

**環境需求**：

- Node.js 16+
- `.env` 含 `PERPLEXITY_API_KEY` + `GEMINI_API_KEY`
- （選用）`repomix` 已安裝，可提升 AG 代碼上下文質量

**輸出**：

```text
artifacts/{flow_id}/
  ├── task-brief.md   ← 任務說明
  ├── state.json      ← 流程狀態
  ├── px-report.md    ← Perplexity 外部研究報告
  └── ag-plan.md      ← Gemini 本地實作計劃
```
