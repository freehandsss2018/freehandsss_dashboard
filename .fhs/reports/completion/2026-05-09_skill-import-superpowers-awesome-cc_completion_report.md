# 制度任務完成記錄

**任務名稱**：外部 Skill & Command 引入（superpowers + awesome-claude-code）
**完成時間**：2026-05-09
**執行依據**：Fat Mo `/execute` 授權
**關聯 Flow**：`2026-05-09-0152`（superpowers）、`2026-05-09-0206`（awesome-cc）

---

## 完成事項

### 來源：github.com/obra/superpowers

| 檔案 | 類型 | 說明 |
|-----|------|------|
| `.fhs/ai/skills/vendor/superpowers/test-driven-development.md` | Vendor Skill | TDD RED-GREEN-REFACTOR 強制機制，完整引用原始 SKILL.md |
| `.fhs/ai/skills/vendor/superpowers/systematic-debugging.md` | Vendor Skill | 四階段根因調查法，完整引用原始 SKILL.md |
| `.claude/commands/tdd-guide.md` | Bridge Command | `/tdd-guide` 橋接至 Master skill |
| `.claude/commands/debug-guide.md` | Bridge Command | `/debug-guide` 橋接至 Master skill |

### 來源：hesreallyhim/awesome-claude-code（jawwadfirdousi/agent-skills）

| 檔案 | 類型 | 說明 |
|-----|------|------|
| `.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md` | Vendor Skill | 唯讀 PostgreSQL/Supabase 查詢，嚴格 write-block，10K row limit |
| `.fhs/ai/skills/vendor/awesome-cc/supabase-query.md` | Vendor Skill | Supabase Management API CLI，支援 DDL/RLS/Storage |
| `.fhs/ai/skills/vendor/awesome-cc/hooks-setup-guide.md` | Setup Guide | Dippy + parry hooks 安裝指南（需手動安裝） |
| `.claude/commands/db-query.md` | Bridge Command | `/db-query` 橋接至 read-only-postgres skill |
| `.claude/commands/five.md` | Slash Command | `/five` 五個為什麼根因分析（FHS 場景適配版） |
| `.claude/commands/mermaid.md` | Slash Command | `/mermaid` SQL/Airtable schema → Mermaid 圖表 |
| `.claude/commands/code-analysis.md` | Slash Command | `/code-analysis` 多角度代碼深度分析 |

### 文件同步

| 檔案 | 更新內容 |
|-----|---------|
| `docs/repo-map.md` | 新增 `.fhs/ai/skills/vendor/` 目錄結構；新增 `.claude/commands/` 指令清單 |
| `Changelog.md` | 新增版本記錄 |

---

## 未執行項目與原因

| 項目 | 原因 |
|-----|------|
| Dippy hook 配置至 settings.json | `defaultMode: bypassPermissions` 已覆蓋主要功能；需手動安裝後才配置 |
| parry hook 配置至 settings.json | 需 Rust/Cargo 安裝；優先於 Supabase 連線後安裝 |

---

## 待辦更新

以下 handoff 待辦狀態變更：
- **P-HIGH #2 Supabase 遷移準備**：`read-only-postgres` skill 已就緒，可開始 Supabase 連線設定與數據驗證

---

## 驗收確認

- [x] 所有 skill 和 command 檔案已成功寫入
- [x] Claude Code skills 清單已自動更新（tdd-guide, debug-guide, db-query, five, mermaid, code-analysis 全部可見）
- [x] `docs/repo-map.md` 已同步
- [x] AGENTS.md 硬規則（vendor-in 策略、禁止硬編碼 API Key）均已遵守
- [x] `.fhs/notes/completion_reports/` 完成記錄已產出
