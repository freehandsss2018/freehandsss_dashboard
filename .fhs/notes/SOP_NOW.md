<!-- /read 指令的內容本體，每次重大架構變更後更新 -->
# FHS Soul Awakening Hook
> 任何 AI 讀到此文件，請立即執行初始化步驟。

---

## 初始化步驟（必做）

1. 讀取 `/.fhs/ai/AGENTS.md`（憲法層 v1.4.1）— 同步所有規則
2. 讀取 `/.fhs/memory/handoff.md` — 同步上次 session 狀態與待辦
3. 輸出系統狀態報告（版本號、當前基準版本、未解決項目）

---

## 系統快照（2026-04-22）

| 項目 | 現況 |
|------|------|
| 憲法版本 | AGENTS.md v1.4.1 |
| 穩定生產版 | freehandsss_dashboardV37.html |
| 開發版（新）| freehandsss_dashboardV40.html（iPhone/Desktop 響應式，Code Reviewer PASS） |
| 開發版（舊）| freehandsss_dashboardV39_proto.html（已棄用，設計概念廢除） |
| n8n Workflow | V45.7.4（24 nodes） |
| Airtable Base | app9GuLsW9frN4xaT |
| 設計軸 | **iPhone（< 768px）vs Desktop（≥ 768px）— 雙模式已廢除** |

---

## 雙系統架構（Claude Code + Antigravity）

### 設計原則
- **Single Source of Truth**：所有 Master 指令只在 `/.fhs/ai/commands/` 維護
- **橋接模式**：Claude Code（`.claude/commands/`）與 Antigravity（`.agents/workflows/`）均為橋接版，讀取 Master 執行，本身不含邏輯
- **更新規則**：修改任何指令只改 Master，兩端橋接版自動對齊，無需個別修改

### 各系統職責

| 系統 | 主要用途 | 執行什麼 |
|------|---------|---------|
| **Antigravity** | 討論、審閱、輕量工作、ag-plan 規劃 | 文件修補、UI 文字微調、分析報告、/ag-plan |
| **Claude Code** | 複雜 coding、三端同步、subagent 執行 | /cl-flow、/execute、HTML 修改、n8n 接回 |

### 指令系統對照

| 指令 | Master 位置 | Claude Code | Antigravity |
|------|------------|-------------|-------------|
| `/read` | `.fhs/ai/commands/read.md` | `.claude/commands/read.md` | `.agents/workflows/read.md` |
| `/cl-flow` | `.fhs/ai/commands/cl-flow.md` | `.claude/commands/cl-flow.md` | `.agents/workflows/cl-flow.md` |
| `/execute` | `.fhs/ai/commands/execute.md` | `.claude/commands/execute.md` | `.agents/workflows/execute.md` |
| `/commit` | `.fhs/ai/commands/commit.md` | `.claude/commands/commit.md` | `.agents/workflows/commit.md` |
| `/ag-plan` | `.fhs/ai/commands/ag-plan.md` | — | `.agents/workflows/ag-plan.md` |
| `/fhs-check` | `.fhs/ai/commands/fhs-check.md` | `.claude/commands/fhs-check.md` | `.agents/workflows/fhs-check.md` |
| `/fhs-audit` | `.fhs/ai/commands/fhs-audit.md` | `.claude/commands/fhs-audit.md` | `.agents/workflows/fhs-audit.md` |
| `/guardian` | `.fhs/ai/commands/guardian.md` | `.claude/commands/guardian.md` | `.agents/workflows/guardian.md` |
| `/error-eye` | `.fhs/ai/commands/error-eye.md` | `.claude/commands/error-eye.md` | `.agents/workflows/error-eye.md` |

### Skills & Agents（不重疊）

| 資源 | 位置 | 用途 | 誰用 |
|------|------|------|------|
| FHS Subagents（3個） | `.fhs/ai/subagents/freehandsss/` → `~/.claude/agents/freehandsss/` | ui-designer / frontend-developer / code-reviewer | Claude Code 專用 |
| Gemini Skills（22個） | `.gemini/skills/` | 設計工具（frontend-design、audit、critique 等） | Antigravity 專用 |
| ui-ux-pro-max | `.fhs/ai/skills/ui-ux-pro-max/` | FHS 設計規格（ui-designer 在 Phase A 讀取） | 共用（reference） |
| MCP: Airtable-FHS | `~/.gemini/antigravity/mcp_config.json` | Airtable 直連 | Antigravity |
| MCP: n8n, Figma | Claude Code MCP 設定 | workflow 管理 | Claude Code |

### cl-flow 自動化流程（Claude Code 執行）
```
/cl-flow [任務描述]
    ↓
node scripts/cl-flow-runner.js（自動並行）
    ├── Perplexity API → artifacts/{flow_id}/px-report.md（A1）
    └── Gemini API    → artifacts/{flow_id}/ag-plan.md（A2）
    ↓
Claude 審閱 → artifacts/{flow_id}/cl-final-plan.md（A3 Verdict）
    ↓
⏸ 等候 Fat Mo /execute
```

---

## 同步更新規則（給所有 AI）

1. **修改任何指令** → 只改 `/.fhs/ai/commands/` 內的 Master 檔案
2. **修改 subagents** → 只改 `/.fhs/ai/subagents/freehandsss/`，同步複製到 `~/.claude/agents/freehandsss/`
3. **修改本文件** → 在重大架構變更後更新，同步 `ANTIGRAVITY.md` 如有需要
4. **禁止在橋接版（`.claude/commands/` 或 `.agents/workflows/`）直接寫入邏輯**
