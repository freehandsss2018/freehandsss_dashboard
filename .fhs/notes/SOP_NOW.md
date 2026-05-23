<!-- /read 指令的內容本體，每次重大架構變更後更新 -->
# FHS Soul Awakening Hook
> ⚠️ 此為背景快照文件。除非用戶明確呼叫 /read 或要求初始化，否則請勿主動執行初始化流程或代為處理待辦事項。

---

## 初始化步驟（必做）

1. 讀取 `/.fhs/ai/AGENTS.md`（前 100 行）— 確認憲法版本號
2. 讀取 `/.fhs/memory/handoff.md` — 同步上次 session 狀態與待辦
3. 讀取 `/.fhs/memory/learnings.md` — 載入 pattern / pitfall / preference 至工作記憶
4. 輸出系統狀態報告（版本號、當前基準版本、未解決項目）

---

## 系統快照（2026-05-17 更新）

| 項目 | 現況 |
|------|------|
| 憲法版本 | AGENTS.md v1.4.6 |
| 穩定生產版 | Freehandsss_dashboard_current.html (V41) |
| 開發版（新）| freehandsss_dashboardV42.html (Planned) |
| 開發版（舊）| freehandsss_dashboardV41.html (Released) |
| n8n Workflow | V47.4（Supabase-First 邏輯啟用） |
| Airtable Base | app9GuLsW9frN4xaT |
| 數據源 | **Supabase (Primary Lead) + Airtable (Fallback Backup)** |
| database-reviewer | v2.1.0（Supabase Layer 1/2 優先順序重組） |
| finance-auditor | v2.0.0（Quadruple 四端架構，Supabase 主導） |

---

## 雙系統架構（Claude Code + Antigravity）

### 設計原則
- **Single Source of Truth**：目前由 Airtable 擔任（過渡期），未來將轉移至 Supabase。
- **Supabase-First**：V41 之後，Supabase 作為資料讀取、修改、新增的主導。
- **Airtable Backup**：Airtable 作為事故發生時的備援方案。
- **橋接模式**：Claude Code 與 Antigravity 均讀取 Master 指令執行。

### 各系統職責

| 系統 | 主要用途 | 執行什麼 |
|------|---------|---------|
| **Antigravity** | 討論、審閱、輕量工作、ag-plan 規劃 | 分析報告、/ag-plan（文件修補須獲用戶明確批准，禁止自主寫入）|
| **Claude Code** | 複雜 coding、四端同步、subagent 執行 | /cl-flow、/execute、HTML 修改、n8n 接回 |

### 指令系統對照

| 指令 | Master 位置 | Claude Code | Antigravity |
|------|------------|-------------|-------------|
| `/read` | `.fhs/ai/commands/read.md` | `.claude/commands/read.md` | `.agents/workflows/read.md` |
| `/cl-flow` | `.fhs/ai/commands/cl-flow.md` | `.claude/commands/cl-flow.md` | `.agents/workflows/cl-flow.md` |
| `/cl-flow-fast` | `.fhs/ai/commands/cl-flow-fast.md` | `.claude/commands/cl-flow-fast.md` | `.agents/workflows/cl-flow-fast.md` |
| `/execute` | `.fhs/ai/commands/execute.md` | `.claude/commands/execute.md` | `.agents/workflows/execute.md` |
| `/commit` | `.fhs/ai/commands/commit.md` | `.claude/commands/commit.md` | `.agents/workflows/commit.md` |
| `/ag-plan` | `.fhs/ai/commands/ag-plan.md` | — | `.agents/workflows/ag-plan.md` |
| `/ag-stitch-sync` | `.fhs/ai/commands/ag-stitch-sync.md` | — | `.agents/workflows/ag-stitch-sync.md` |
| `/ag-ui-import` | `.fhs/ai/commands/ag-ui-import.md` | — | `.agents/workflows/ag-ui-import.md` |
| `/fhs-check` | `.fhs/ai/commands/fhs-check.md` | `.claude/commands/fhs-check.md` | `.agents/workflows/fhs-check.md` |
| `/fhs-audit` | `.fhs/ai/commands/fhs-audit.md` | `.claude/commands/fhs-audit.md` | `.agents/workflows/fhs-audit.md` |
| `/guardian` | `.fhs/ai/commands/guardian.md` | `.claude/commands/guardian.md` | `.agents/workflows/guardian.md` |
| `/error-eye` | `.fhs/ai/commands/error-eye.md` | `.claude/commands/error-eye.md` | `.agents/workflows/error-eye.md` |
| `/rg` | `.fhs/ai/commands/rg.md` | `.claude/commands/rg.md` | `.agents/workflows/rg.md` |
| `/rp` | `.fhs/ai/commands/rp.md` | `.claude/commands/rp.md` | `.agents/workflows/rp.md` |

### Skills & Agents（不重疊）

| 資源 | 位置 | 用途 | 誰用 |
|------|------|------|------|
| FHS Subagents（8個） | `.fhs/ai/subagents/freehandsss/` → `~/.claude/agents/freehandsss/` | ui-designer, frontend-developer, code-reviewer, database-reviewer, finance-auditor, tdd-guide, build-error-resolver, blender-3d-modeler | Claude Code 專用 |
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

## 產品開發 SOP 參考

| SOP | 路徑 | 適用場景 |
|-----|------|---------|
| 加購配件新增 | `.fhs/notes/addon_product_sop.md` | 新增類似「羊毛氈公仔」的加購配件時，必讀此 SOP（含 FK 保護原則 + 四個必改位置 + checklist） |

---

## 同步更新規則（給所有 AI）

1. **修改任何指令** → 只改 `/.fhs/ai/commands/` 內的 Master 檔案
2. **修改 subagents** → 只改 `/.fhs/ai/subagents/freehandsss/`，同步複製到 `~/.claude/agents/freehandsss/`
3. **修改本文件** → 在重大架構變更後更新，同步 `ANTIGRAVITY.md` 如有需要
4. **禁止在橋接版（`.claude/commands/` 或 `.agents/workflows/`）直接寫入邏輯**
