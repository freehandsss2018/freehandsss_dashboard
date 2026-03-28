# FHS Memory Handoff - V36 (Dual-AI Sync Core)

- **當前版本 (Latest)**: V36 (2026-03-28)
- **核心進展**:
  - Dashboard 升級至 V36，V35 保留待確認後刪除。
  - AI 協作體系重組：Claude Code + Antigravity + Perplexity 角色明確分工。
  - `/px audit` 新增系統審查模式（fetch GitHub + 外部搜尋）。
  - `FHS_Prompts.md` 新增情境十一（Perplexity 審計角色）。

## 🤖 AI 接入狀態
- **Antigravity (Gemini)**:
  - **狀態**: `Active`
  - **角色**: 即時工作 — UI 調整、宏觀審查、快速迭代
  - **當前焦點**: 待機
- **Claude Code**:
  - **狀態**: `Active`
  - **角色**: 深度工作 — code 修改、n8n JSON、批次處理
  - **當前焦點**: 待機
- **Perplexity**:
  - **狀態**: `On-demand`
  - **角色**: 外部研究 — `/px audit` 系統審查 + 外部對標
  - **觸發**: 按需呼叫，非主流程

## 🧠 核心守則
- 未經 Fat Mo 授權，禁止覆蓋 `Freehandsss_dashboard_current.html`
- 修改 n8n workflow 前必須先讀 `Triple_Sync_Field_Map.md`
- 不得同時修改 n8n 和 dashboard（payload 一致性風險）

## 🔐 安全事件記錄 (2026-03-28)
- ✅ n8n API Key revoked + 換新（`freehandsss_Dashboard`）
- ✅ Notion API Key auto-rotated by Notion + 換新
- ✅ `Sync_Notion_Brain.js` 改用 `process.env.NOTION_API_KEY`
- ✅ `.env` 本地建立（gitignored），含 Notion + n8n keys
- ✅ `.env.example` 模板建立
- ✅ `.gitignore` 加固（`.env`, `*.xlsx`, `logs/`）

## 📅 待辦事項 (Pending)
- [ ] Fat Mo 確認 V36 穩定後刪除 V35
- [x] ~~處理 `.claude/settings.json` API Key 明文問題~~ — 已完成，改用 `$N8N_KEY`

---
*Updated by Claude Code + Antigravity at 2026-03-28 (Security Hardening Complete)*
