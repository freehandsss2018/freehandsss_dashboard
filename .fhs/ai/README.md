# FHS AI 指揮系統

本目錄為所有 AI 助理的共用配置區。

## 憲法層
| 檔案 | 說明 |
|---|---|
| AGENTS.md | 系統憲法 v1.3.1，所有 AI 必須優先讀取 |

## 指令路由
所有業務情境由 docs/FHS_Prompts.md 擔任入口路由總機，
偵測情境後調用 commands/ 下對應指令執行。

## 可用指令索引
| 指令 | 檔案 | 用途 |
|---|---|---|
| /read | commands/read.md | 讀取系統文件 |
| /px-plan | commands/px-plan.md | A1 產出外部架構與情報 Plan |
| /ag-plan | commands/ag-plan.md | A2 產出本地落實 Plan（落盤自查） |
| /cl-flow | commands/cl-flow.md | A3 最終審核與判定報告（舊 a3go） |
| /execute | commands/execute.md | 唯一准許修改檔案的執行入口 |
| /fhs-check | commands/fhs-check.md | 快速系統檢查 |
| /commit | commands/commit.md | 記憶引擎（自動脈衝 + Notion同步 + git push）|
| /reflect | docs/archive/commands/ | 指令別名（已由 /commit 取代並存檔）|
| /error-eye | commands/error-eye.md | 錯誤監控（Catch-Push-Diagnose）|
| /guardian | commands/guardian.md | 全端守護稽核（動工前防護）|
| /px audit | commands/px-audit.md | 外部審查（第三方審計員）|
| /fhs-health | commands/fhs-health.md | 全系統功能迴路測驗（28項）|
| /fhs-audit | commands/fhs-audit.md | 系統架構衛生稽核（21項）|
