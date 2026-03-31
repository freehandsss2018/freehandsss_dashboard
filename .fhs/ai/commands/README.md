# FHS 指令集索引

本目錄存放所有系統定義的 AI 指令檔。

## 多代理協作指令（v2.1 正式命名）

| 檔案 | 指令 | 用途 | 執行方 |
|---|---|---|---|
| px-plan.md | /px-plan | A1 產出外部架構與情報 Plan | Perplexity |
| ag-plan.md | /ag-plan | A2 產出本地落實 Plan（含落盤自查） | Antigravity |
| cl-flow.md | /cl-flow | A3 最終審核報告（verdict only，NO-TOUCH） | Claude |
| execute.md | /execute | 唯一正式執行入口（需 Fat Mo 明確批准） | Claude |

## 系統維護指令

| 檔案 | 指令 | 用途 |
|---|---|---|
| read.md | /read | 讀取系統文件，執行系統初始化 |
| fhs-check.md | /fhs-check | 快速系統檢查 |
| commit.md | /commit | 全包一條龍：Memory Engine + Notion 同步 + git push |
| reflect.md | /reflect | 指令別名（指向 /commit） |
| error-eye.md | /error-eye | 錯誤監控（Catch-Push-Diagnose） |
| guardian.md | /guardian | 全端守護稽核（Anti-Tunnel Vision） |
| px-audit.md | /px audit | 外部審查（第三方審計員） |
| fhs-audit.md | /fhs-audit | 系統架構衛生稽核（21項，5大檢查） |

## 退役指令（保留歷史引用）

| 檔案 | 舊指令 | 退役原因 |
|---|---|---|
| a3go.md | /a3go | 已由 /cl-flow 取代（v2.1） |

> ⚠️ 修改指令邏輯時，必須同步更新 [AGENTS.md](../AGENTS.md) 的 Version。
