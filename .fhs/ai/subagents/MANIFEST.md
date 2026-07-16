# FHS Subagents — MANIFEST

> 機器可讀 agent 清單，記錄所有已安裝 FHS agent 的版本與狀態。
> 每次 agent 版本更新後必須同步更新本文件。

---

## 已安裝 Agents

| agent | version | model | status | runtime_path | source |
|-------|---------|-------|--------|-------------|--------|
| ui-designer | 2.0.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/ui-designer.md` | lst97 (FHS rewrite) |
| frontend-developer | 1.1.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/frontend-developer.md` | lst97 (FHS rewrite) |
| code-reviewer | 1.1.0 | claude-haiku-4-5 | active | `~/.claude/agents/freehandsss/code-reviewer.md` | lst97 (FHS rewrite) |
| database-reviewer | 2.1.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/database-reviewer.md` | FHS native (ECC concept rewrite) |
| tdd-guide | 1.1.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/tdd-guide.md` | FHS native (ECC concept rewrite) |
| build-error-resolver | 1.0.0 | claude-haiku-4-5-20251001 | active | `~/.claude/agents/freehandsss/build-error-resolver.md` | FHS native (ECC concept rewrite) |
| blender-3d-modeler | 2.0.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/blender-3d-modeler.md` | FHS native (2026-05-07 triage + printability + 路徑規則) |
| product-integration-validator | 1.0.0 | claude-haiku-4-5-20251001 | active | `.fhs/ai/subagents/freehandsss/product-integration-validator.md` | FHS native (2026-05-21 新產品跨層融入驗證) |
| finance-auditor | 2.2.0 | claude-sonnet-4-6 | active | `~/.claude/agents/freehandsss/finance-auditor.md` | FHS native（四端財務稽核員） |

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
| blender-3d-modeler | 2.0.0 | 2026-05-07 | 升級 v2.0：新增 STL Triage 決策樹（REPAIR/REBUILD/HANDOFF）/ FDM printability check / HANDOFF 工具清單 / 3d/ 路徑規則 / 開放藝術建模 |
| product-integration-validator | 1.0.0 | 2026-05-21 | 初次安裝（FHS native，新產品跨層融入驗證 — UI/ENUM/n8n/RLS 四層 checklist，pitfalls P1-P5 防護）|
| database-reviewer | 2.1.0 | 2026-05-16 | Supabase-First 優先順序調整（commit 09c22e6）|
| tdd-guide | 1.1.0 | 2026-07-07 | S152 十大框架條款吸收（commit cda7c7e）|
| ui-designer | 2.0.0 | 2026-05-16 | frontmatter 版本欄位正式化為 v2.0.0（內容本體之雙模式廢除／iPhone vs Desktop 響應式改寫實際發生於 2026-04-22 commit 1551b58，版本號於本次批次補記）|
| finance-auditor | 1.0.0 | 2026-05-09 | 初次安裝（commit e6acd5c）|
| finance-auditor | 2.1.0 | 2026-06-03 | AGENTS.md v1.4.11 Rule 3.16 路由強化配套升級（commit 1c95797）|
| finance-auditor | 2.2.0 | 2026-06-12 | frontmatter 內容更新升版（last_updated 標記日期；對應內容變更 commit 未能精確定位，欄位本身於批次同步 commit 472391a 2026-07-04 一併寫入）|

## Skills（非 subagent）

| skill | type | version | path |
|-------|------|---------|------|
| ui-ux-pro-max | fhs-native | 1.0.0 | `.fhs/ai/skills/ui-ux-pro-max/` |
| finance-calculator | fhs-native | 1.0.0 | `.fhs/ai/skills/finance-calculator/` |

*Skills 不安裝至 `~/.claude/agents/`，僅作 reference layer 使用。*
