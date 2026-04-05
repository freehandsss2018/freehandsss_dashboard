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

## Skills（非 subagent）

| skill | type | version | path |
|-------|------|---------|------|
| ui-ux-pro-max | fhs-native | 1.0.0 | `.fhs/ai/skills/ui-ux-pro-max/` |

*Skills 不安裝至 `~/.claude/agents/`，僅作 reference layer 使用。*
