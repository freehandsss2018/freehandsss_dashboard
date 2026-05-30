# FHS 指令集 — 場景速查表

> Phase 2 收斂完成（2026-05-30）：指令從 25 → 18，方法論移植至 subagent 自動執行。
> **核心原則**：描述問題，AI 自動選用正確方法，無需記憶指令名。

---

## 我要做什麼 → 用什麼

| 場景 | 指令 / 方式 |
|------|------------|
| 規劃任何新任務（完整）| `/cl-flow [任務]` — A1 PX + A2 AG + A3 Verdict |
| 快速規劃（跳外部研究）| `/cl-flow-fast [任務]` — A2 + A3，適合 UI/Bug 修復 |
| 執行已批准計畫 | `/execute` |
| 初始化 / 同步狀態 | `/read` |
| 交接 + Notion 同步 | `/commit` |
| 加新產品 | `/new-product` |
| 精煉問題 / 整理思路 | `/rp [描述]` |

---

## 診斷 / 稽核

| 場景 | 指令 / 方式 |
|------|------------|
| 遇到錯誤 / Bug | **AI 自動** — build-error-resolver subagent 強制走 4 階段根因法（Rule 3.15）|
| 代碼審查 | **AI 自動** — code-reviewer subagent 5 維度自動覆蓋 |
| TDD 測試引導 | **AI 自動** — tdd-guide subagent |
| live 系統壓力測試 | `/fhs-check` |
| 文件結構健康稽核 | `/fhs-audit` |
| 大動作改動前確認 | `/guardian` |
| 財務成本完整性掃描 | `/fhs-cost-audit` |
| n8n / Error_Log 診斷 | `/error-eye` |

---

## 工具

| 場景 | 指令 |
|------|------|
| 全專案搜尋 | `/rg [pattern]` |
| Supabase 唯讀查詢 | `/db-query` |
| AG 前端設計工作流 | `/ag-stitch-sync` → `/ag-ui-import` |

---

## AI 自動執行（無需 slash）

| 能力 | 觸發條件 |
|------|---------|
| 4 階段根因調查 + Five-Whys | 遇到任何 bug/錯誤/測試失敗（Rule 3.15）|
| 代碼 5 維度分析 | code-reviewer subagent 被調用時自動 |
| Mermaid 圖表生成 | 描述架構/流程，Claude 原生執行 |
| TDD RED-GREEN-REFACTOR | tdd-guide subagent 被調用時自動 |
| Perplexity 外部研究 | `/cl-flow` A1 階段自動觸發 |

---

## 多代理協作指令（v2.2 正式命名）

| 檔案 | 指令 | 用途 | 執行方 |
|---|---|---|---|
| cl-flow.md | /cl-flow | 精煉（內建）→ A1+A2+A3，Claude 裁決 | Claude |
| cl-flow-fast.md | /cl-flow-fast | 精煉（內建）→ A2+A3，跳 PX，Claude 裁決 | Claude |
| ag-flow.md | /ag-flow | 精煉（內建）→ A1+A2，AG 裁決（跳 A3） | Claude/AG |
| ag-plan.md | /ag-plan | A2 產出本地落實 Plan（含落盤自查） | Antigravity |
| execute.md | /execute | 唯一正式執行入口（需 Fat Mo 明確批准） | Claude |
| ag-stitch-sync.md | /ag-stitch-sync | Stitch UI snippet 擷取與依賴識別 | Antigravity |
| ag-ui-import.md | /ag-ui-import | Stitch → Vanilla HTML/CSS 轉換 | Antigravity |

## 系統維護指令

| 檔案 | 指令 | 用途 |
|---|---|---|
| read.md | /read | 讀取系統文件，執行系統初始化 |
| fhs-check.md | /fhs-check | 全系統活測（建立/刪除真實測試訂單）|
| fhs-audit.md | /fhs-audit | 系統架構衛生稽核（30 項，7 大檢查）|
| guardian.md | /guardian | 全端守護稽核（大動作前 4 點確認）|
| fhs-cost-audit.md | /fhs-cost-audit | 財務成本完整性稽核 |
| error-eye.md | /error-eye | 錯誤監控（Catch-Push-Diagnose）|
| commit.md | /commit | 全包一條龍：Memory Engine + Notion 同步 + git push |
| new-product.md | /new-product | 新產品跨層融入引導（5 步 atomic 流程）|

## 通用工具指令

| 檔案 | 指令 | 用途 | 平台 |
|---|---|---|---|
| rp.md | /rp | 將原始問題重寫為 XML 結構化 Prompt | CL / AG / PL |
| rg.md | /rg | 全專案 ripgrep 搜尋 | CL / AG |
| db-query.md | /db-query | Supabase 唯讀安全查詢（含 PII 遮罩）| CL |

## 退役指令（保留歷史引用）

| 舊指令 | 退役原因 | 替代方案 |
|---|---|---|
| /a3go | 已由 /cl-flow 取代 | /cl-flow |
| /reflect | 已由 /commit 取代 | /commit |
| /rp-flow /rp-flow-fast /rp-flow-ag | 精煉已內建至 cl-flow/ag-flow（2026-05-30）| /cl-flow 或 /rp |
| /px-plan | Perplexity 已內建至 cl-flow A1（2026-05-30）| /cl-flow |
| /px-audit | 同上（2026-05-30）| /cl-flow |
| /debug-guide | 4 階段根因法已移植至 build-error-resolver subagent（2026-05-30）| AI 自動 |
| /five | Five-Whys 已移植至 build-error-resolver subagent（2026-05-30）| AI 自動 |
| /code-analysis | 5 維度分析已移植至 code-reviewer subagent（2026-05-30）| AI 自動 |
| /mermaid | Claude 原生執行，無需指令（2026-05-30）| 直接描述需求 |
| /tdd-guide（指令）| 以同名 subagent 取代，指令層退役（2026-05-30）| tdd-guide subagent |

> ⚠️ 修改指令邏輯時，必須同步更新 [AGENTS.md](../AGENTS.md) 的 Version。
