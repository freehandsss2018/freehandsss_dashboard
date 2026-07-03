# FHS 平台決策卡

**版本**: v2.3（隨 cl-final-plan-v2.md 同步）
**用途**：開工前一眼判斷「該開哪個工具」，不查表就能決定
**建立日期**: 2026-07-03

---

## 一句 Heuristic（記這句就夠）

> **凡 AI 要寫治理/財務/生產檔 → 只准 hook 守護側（Desktop Code 分頁 / CLI）。其他一切按順手選工具。**

---

## 情境對照表

| 情境 | 開什麼 |
|---|---|
| 改 Dashboard / n8n / 部署 / 落盤決策 | **Desktop Code 分頁**（5 hooks + 財務守衛全開） |
| 查資料 / 想方案 / 讀報告 / 長文分析 | **Cowork**（或手機 App） |
| 手機在外查單 / 看警報 | **手機 Claude App**（remote connectors） |
| 規劃大任務（三腦協作） | **n8n 三腦**（觸發後回 Code 分頁裁決） |
| Desktop App 故障 | **VSCode ext / CLI**（永久 fallback，配置同源） |
| Claude 生態全掛 / 需 Gemini 視角 | **Antigravity**（永久備援；只讀分析為主） |
| 多檔代碼重構 / inline 補全 / diff 審查 | **Cursor**（⏸ 目前擱置，未安裝——見附錄） |

---

## 單一寫者矩陣（conflict 防線）

| 檔案類別 | 唯一寫者 | Cowork | AG | Cursor（休眠） |
|---|---|---|---|---|
| `.fhs/memory/` + `.fhs/notes/`（handoff/decisions/learnings/session-log） | Desktop Code / CLI | ❌ 只讀 | ❌ 只讀 | ❌ 只讀 |
| 財務六檔 / Dashboard HTML / migrations | Desktop Code（PreToolUse 守衛） | ❌ 絕對禁止 | ❌ 絕對禁止 | ❌ AI-agent 絕對禁止 |
| `.claude/skills/`（活體 master） | Desktop Code | ❌ | ❌ | ❌ |
| `.gemini/skills/`（凍結快照） | 無人——凍結 | — | ❌ 只讀取執行 | — |
| `artifacts/{flow_id}/` | 建立者所有（n8n 或本機） | — | ⚠️ 僅自建 flow | — |
| 一般代碼（scripts/tools/非生產） | 任一工具（人審 diff） | ⚠️ | ⚠️ 緊急時 | ✅ 主場（未啟用） |

**緊急例外**：Claude 生態全掛時 AG 可臨時寫入治理/財務類檔案，但恢復後**第一件事**=回 Code 分頁 `git diff` 覆核 + 補跑落盤（AG/Cowork/Cursor 寫入均不經 5 hook 守護，kgov/財務守衛全旁路）。

---

## 各工具入場條件

### Cowork
- **可用**：讀取分析、長文規劃、方案討論、手機同款體驗
- **限制**：每 session 需一次 folder picker 授權；不繼承 `.mcp.json`（Supabase 已補 remote connector，n8n 尚未）
- 詳見 `.fhs/reports/planning/fhs_cowork_governance.md`

### Antigravity（永久備援）
- **入場條件**：Claude 生態故障、或需要 Gemini 視角時
- **原則**：只讀分析為主，寫入須遵單一寫者矩陣 + 緊急例外事後覆核義務
- 兩者技術上完全共存，無除役時間表（2026-07-03 Fat Mo 決策）

### Cursor（休眠藍圖）
- **狀態**：未安裝，Fat Mo 近期不用，僅為未來準備
- **入場條件（C1 探針）**：先確認實際安裝+會用，才啟動 C2/C3 探針
- **預設**：不建 `.cursor/mcp.json`（無 hook 守護不發寫入級 MCP 鑰匙）；`.cursorrules` 走橋接模式指向 AGENTS.md
- 詳見 `cl-final-plan-v2.md` Phase 2.5

---

## Skills 資產狀態（V2b）

| 來源 | 數量 | 狀態 |
|---|---|---|
| `.gemini/skills/` | 22 支 | 已複製至 `.claude/skills/`；原目錄凍結（頂部標記，AG 只讀執行） |
| `.fhs/ai/skills/` | 6 目錄 | 4 支橋接（fhs-bug-triage / fhs-p-product-display / fhs-overview-badge-layout / finance-gatekeeper）；`finance-calculator` DEPRECATED 不橋接；`ui-ux-pro-max` 為參考層無 description 欄位，由 subagent 直接 Read，不走 Skill-tool 發現 |

`.claude/skills/` 現為活體 master，新技能/修訂一律只落此處。
