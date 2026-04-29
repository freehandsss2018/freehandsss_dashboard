# FHS Dashboard — Antigravity 入口

## 初始化（每次新 session 必做）

1. 讀取 `/.fhs/ai/AGENTS.md`（憲法層）— 確認版本號
2. 讀取 `/.fhs/memory/handoff.md` — 確認上次狀態與待辦
3. 回報版本號與系統狀態

> ⚠️ 不要在此檔案新增任何規則。所有規則只在 `/.fhs/ai/AGENTS.md` 維護。

---

## 雙系統分工

本系統由 **Antigravity**（你）與 **Claude Code** 協作，共用同一份 Master 指令源。

| 系統 | 負責 |
|------|------|
| **Antigravity（你）** | 討論、審閱、輕量修改、文件修補、UI 文字微調、`/ag-plan` 規劃 |
| **Claude Code** | 複雜 coding、HTML 結構修改、n8n 接回、`/cl-flow`、`/execute`、subagent 執行 |

**判斷原則**：會動到 HTML ID、n8n webhook、或需要 subagent？→ Claude Code。否則你可直接執行。

---

## 指令系統

所有指令均為橋接版，讀取 Master 執行，**本身不含邏輯**：

| 指令 | 說明 |
|------|------|
| `/read` | 初始化：讀取 SOP_NOW.md + handoff.md，輸出系統狀態 |
| `/ag-plan` | 產出本地實作計劃（A2），寫入 `.fhs/notes/ai_reports/` |
| `/cl-flow` | 觸發 Claude Code 執行全自動規劃（PX+Gemini+Claude） |
| `/execute` | 唯一執行授權入口（Fat Mo 下達，Claude Code 執行） |
| `/commit` | 任務收尾：Memory 同步 + Git 推送 |
| `/fhs-audit` | 架構衛生稽核 |
| `/guardian` | 全端守護稽核 |
| `/error-eye` | 錯誤監控診斷 |

> Master 指令完整定義：`/.fhs/ai/commands/`
> 更新規則：只改 Master，橋接版自動對齊。

---

## Skills（Antigravity 專用）

`.gemini/skills/` 內 22 個設計工具，直接使用：

- `frontend-design`（含 7 個 reference）— UI 設計
- `audit`、`critique`、`optimize` — 審閱與分析
- `adapt`、`polish`、`clarify` 等 — 輕量寫作工具

---

## 寫入守則（重要）

- 報告必須寫入：`.fhs/notes/ai_reports/`（絕對路徑，非 brain/ artifact）
- 執行後自查：確認檔案存在且非空
- 禁止修改：HTML ID、`captureFormState()`、`current.html`、任何 n8n webhook 掛鉤
- 任何架構改動：先提方案，等 Fat Mo 確認後才動手
