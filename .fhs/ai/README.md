# FHS AI 指揮系統

本目錄為所有 AI 助理的共用配置區。

## 憲法層
| 檔案 | 說明 |
|---|---|
| AGENTS.md | 系統憲法 v1.2.1，所有 AI 必須優先讀取 |

## 指令路由
所有業務情境由 docs/FHS_Prompts.md 擔任入口路由總機，
偵測情境後調用 commands/ 下對應指令執行。

## 可用指令索引
| 指令 | 檔案 | 用途 |
|---|---|---|
| /read | commands/read.md | 讀取系統文件 |
| /a3go | commands/a3go.md | 快速執行 |
| /fhs-check | commands/fhs-check.md | 快速系統檢查 |
| /reflect | commands/reflect.md | 記憶引擎（自動脈衝 + Notion同步）|
| /error-eye | commands/error-eye.md | 錯誤監控（Catch-Push-Diagnose）|
| /guardian | commands/guardian.md | 全端守護稽核（動工前防護）|
| /px audit | commands/px-audit.md | 外部審查（第三方審計員）|
| /fhs-health | commands/fhs-health.md | 全系統功能迴路測驗（28項）|
| /fhs-audit | commands/fhs-audit.md | 系統架構衛生稽核（21項）|
