# 完成記錄：Subagent 決定性路由規則 + Skills 連接

**日期**：2026-05-09
**授權**：Fat Mo（口頭授權，「1及2 均執行」）
**執行方**：Claude (A3)

---

## 任務摘要

改動 1：AGENTS.md 加入 Subagent 決定性路由規則，把「proactively」軟性建議升級為強制觸發條件。
改動 2：三個 Agent Definition 加入強制技能載入指示，連接對應 skill 文件。

---

## 變更清單

| 操作 | 檔案 | 說明 |
|------|------|------|
| MODIFY | `.fhs/ai/AGENTS.md` | 新增「Subagent 決定性路由規則」表格（8條規則） |
| MODIFY | `C:\Users\Edwin\.claude\agents\freehandsss\build-error-resolver.md` | 加入強制載入 systematic-debugging.md |
| MODIFY | `C:\Users\Edwin\.claude\agents\freehandsss\tdd-guide.md` | 加入強制載入 test-driven-development.md |
| MODIFY | `C:\Users\Edwin\.claude\agents\freehandsss\database-reviewer.md` | 加入強制載入 read-only-postgres.md + supabase-query.md |

---

## 改動 1 詳情：AGENTS.md 路由規則

新增 8 條決定性觸發規則，覆蓋所有 FHS 專屬 subagent：

| 觸發條件 | Subagent |
|---------|---------|
| HTML 原型建立/修改 | frontend-developer |
| 原型品質稽核（Phase C） | code-reviewer |
| V40+ Phase A 設計規範 | ui-designer |
| n8n 報錯、JS runtime error、Python crash | build-error-resolver |
| Airtable schema、n8n data flow、SKU、Triple_Sync | database-reviewer |
| 新 Maintenance_Tools 腳本、Python 測試失敗 | tdd-guide |
| STL/mesh/Blender 操作 | blender-3d-modeler |
| 3+ 未知檔案的廣泛搜索 | Explore |

## 改動 2 詳情：Skills 連接

| Agent | 連接的 Skill | 效果 |
|-------|------------|------|
| build-error-resolver | systematic-debugging.md | Iron Law：必須完成 Phase 1 根因確認才可提修復方案 |
| tdd-guide | test-driven-development.md | 強制 RED→GREEN→REFACTOR，禁止跳過 RED 階段 |
| database-reviewer | read-only-postgres.md + supabase-query.md | 確保 Supabase 查詢遵守 10K row limit 唯讀規則 |

## 未連接的 Agents（無適用 skill）

- `frontend-developer`：skills 庫無對應 vanilla HTML 規範 skill
- `code-reviewer`：純稽核邏輯，已內建在 agent definition 本身
- `ui-designer`：UI/UX Pro Max skill 已在定義中引用
- `blender-3d-modeler`：3D 專用，無 FHS skill 適用

## 驗證清單

- [x] AGENTS.md 路由規則表格位置正確（關鍵語義邊界之前）
- [x] 8 條規則均為「必須調用」措辭，無「考慮」或「proactively」
- [x] 三個 agent definitions 均在 header 緊接之後加入「強制技能載入」段落
- [x] build-error-resolver Iron Law 明確：Phase 1 未完成禁止修復
- [x] tdd-guide 禁止跳過 RED 階段
- [x] database-reviewer 唯讀規則已明確（10K limit）
