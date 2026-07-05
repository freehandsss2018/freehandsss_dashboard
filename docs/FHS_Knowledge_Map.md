# FHS Knowledge Map

> ⚠️ **與 `.fhs/notes/knowledge-map.md` 不同**（命名相近，2026-07-05 `/fhs-audit` S145 標註）：本檔是 **Obsidian wikilink 圖譜索引**（給 Graph View 用，人類視覺化導覽）；`.fhs/notes/knowledge-map.md` 是 **AI 查詢路由表**（按檔案類別，回答「這類問題該去哪找」）。兩者職責不重疊，互不取代。
>
> **維護規則**：新增 docs/ 知識文件時同步更新此文件。
> ⚠️ **2026-07-04 修正**：原「`.fhs/` 為 dot-directory，Obsidian 不可見」的限制已解除——已安裝並實測 `hidden-folders-access` 外掛（白名單 `.fhs`），確認 FileExplorer/編輯器/metadata cache 皆可正常索引 `.fhs/` 內容（含 3,918 行的 `handoff.md` 與 70 檔的 `lessons/` 資料夾，皆無效能問題）。詳見 `.fhs/notes/decisions.md` 2026-07-04（Session 137）條目。
> Graph View 是否顯示關聯，仍取決於文件間有無 `[[wikilink]]`——本次同步為 `.fhs/` 側關鍵文件補上連結，非全面覆蓋。

---

## 系統入口

- [[CLAUDE]] — Claude Code 入口
- [[ANTIGRAVITY]] — Antigravity 入口

## 系統文件

- [[FHS_Blueprint]] — 系統整體藍圖
- [[DESIGN]] — 大地溫潤 Earthy Warm 視覺系統
- [[FHS_Prompts]] — 11 個業務情境，AI 遇業務問題必讀
- [[FHS_Legacy_Migration_Notes]] — Excel 遷移缺失問題處理

## 欄位對齊

- [[Quadruple_Sync_Field_Map]] — Airtable↔n8n↔Dashboard↔Supabase 欄位映射

## AI 治理層（.fhs/，2026-07-04 起 Obsidian 可見）

- [[handoff]] — 交接 SSOT 便攜塊 + Session 歷史（`.fhs/memory/`）
- [[learnings]] — Pattern/Pitfall/Preference 蒸餾教訓，50 條上限（`.fhs/memory/`）
- [[decisions]] — 架構決策記錄（`.fhs/notes/`）
- [[00_INDEX]] — Governance 調度制度層索引（`.fhs/ai/governance/`，Session 137）
- [[SOP_NOW]] — 系統快照與初始化需求（`.fhs/notes/`）
