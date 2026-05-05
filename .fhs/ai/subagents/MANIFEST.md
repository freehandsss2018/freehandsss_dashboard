# FHS Subagents — MANIFEST

> 機器可讀 agent 清單，記錄所有已安裝 FHS agent 的版本與狀態。
> 每次 agent 版本更新後必須同步更新本文件。

---

## 已安裝 Agents

| agent | version | model | status | runtime_path | source |
|-------|---------|-------|--------|-------------|--------|
| ui-designer | 1.1.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/ui-designer.md` | lst97 (FHS rewrite) |
| frontend-developer | 1.1.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/frontend-developer.md` | lst97 (FHS rewrite) |
| code-reviewer | 1.1.0 | claude-haiku-4-5 | active | `~/.claude/agents/freehandsss/code-reviewer.md` | lst97 (FHS rewrite) |
| database-reviewer | 1.0.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/database-reviewer.md` | FHS native (ECC concept rewrite) |
| tdd-guide | 1.0.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/tdd-guide.md` | FHS native (ECC concept rewrite) |
| build-error-resolver | 1.0.0 | claude-haiku-4-5-20251001 | active | `~/.claude/agents/freehandsss/build-error-resolver.md` | FHS native (ECC concept rewrite) |
| blender-3d-modeler | 1.0.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/blender-3d-modeler.md` | FHS native (2026-05-05 心形手模 session) |

---

## 版本歷史

| agent | version | date | changes |
|-------|---------|------|---------|
| ui-designer | 1.0.0 | 2026-04-05 | 初次安裝（lst97 FHS rewrite，移除 React/Tailwind） |
| ui-designer | 1.1.0 | 2026-04-05 | 加入 5-layer workflow + Impeccable reference paths + Input Contract 說明 |
| frontend-developer | 1.0.0 | 2026-04-05 | 初次安裝 |
| frontend-developer | 1.1.0 | 2026-04-05 | 加入 FHS Design Spec Input Contract |
| code-reviewer | 1.0.0 | 2026-04-05 | 初次安裝 |
| code-reviewer | 1.1.0 | 2026-04-05 | 加入 UX/Visual Quality Checklist（4 項） |

---

## 版本歷史（新增條目）

| agent | version | date | changes |
|-------|---------|------|---------|
| database-reviewer | 1.0.0 | 2026-04-28 | 初次安裝（ECC concept，重寫為 Airtable + n8n 專用）|
| tdd-guide | 1.0.0 | 2026-04-28 | 初次安裝（ECC concept，重寫為 FHS Python + n8n 專用）|
| build-error-resolver | 1.0.0 | 2026-04-28 | 初次安裝（ECC concept，Haiku model，n8n + JS + Python 專用）|
| blender-3d-modeler | 1.0.0 | 2026-05-05 | 初次安裝（FHS native，Blender 5.1.1 實戰驗證 — MANIFOLD boolean / 碎片清除 / 外殼放量 / Z-slice）|

## Skills（非 subagent）

| skill | type | version | path |
|-------|------|---------|------|
| ui-ux-pro-max | fhs-native | 1.0.0 | `.fhs/ai/skills/ui-ux-pro-max/` |
| finance-calculator | fhs-native | 1.0.0 | `.fhs/ai/skills/finance-calculator/` |

*Skills 不安裝至 `~/.claude/agents/`，僅作 reference layer 使用。*
