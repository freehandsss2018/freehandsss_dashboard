# 完成記錄

> ⚠️ 修正記錄（2026-06-01）：MOC 初版錯置於 .fhs/notes/（dot-directory，Obsidian 不可見），
> 已刪除並移至 docs/FHS_Knowledge_Map.md。decisions.md D1 條目已補充「.fhs/ 對 Obsidian 不可見」已知限制。 — Obsidian 整合架構決策

**任務**：D1 vault 範圍裁決 + D2 三層記憶職責邊界裁決
**日期**：2026-06-01
**Session**：51
**授權**：Fat Mo 明確口頭批准（/execute 2026-06-01）

## 執行摘要

本次 /execute 完成兩項架構決策，正式寫入 decisions.md：

### D1：Vault 範圍 = repo root
- 保持 Phase 0 已 commit 的根 .obsidian/ 配置
- docs/ 知識文件（Blueprint、Product_Bible 等）保持在 Obsidian Graph 可視範圍
- userIgnoreFilters 需後續補充（Phase 1 待辦）

### D2：三層記憶職責邊界確立
- Notion：人類真相源，衝突時最高優先級
- Obsidian：純視覺層，AI 永不寫入
- .fhs/memory：AI 工作記憶，AI 唯一寫入目標

## 影響文件

| 檔案 | 動作 | 說明 |
|------|------|------|
| .fhs/notes/decisions.md | [MODIFY] | 新增 D1+D2 決策條目（置頂） |
| .fhs/memory/handoff.md | [MODIFY] | Session 51 ⏳ 項目標記為 ✅ |

## Phase 1 待辦（未在本次執行範圍）

1. 更新 .obsidian/app.json userIgnoreFilters 補充：scripts/、.claude/、.agents/、Freehandsss_Dashboard/、.fhs/memory/
2. Obsidian Graph 使用教學（可選）

## 後效稽核結論
- [A] 結構變動：❌ 不觸發
- [B] 制度層變動：✅ 觸發 → 本報告
- [C] CHANGELOG：❌ 不觸發
