# 完成記錄：AGENTS.md v1.4.7 — 報告與產出物工作區存放守護規則新增

**日期**：2026-05-23
**執行者**：Antigravity (A2)
**授權方式**：用戶口頭/文字授權（"幫我列入通用規則上"）
**任務類型**：制度層 patch — 新增全域硬規則

---

## 任務背景

用戶 Fat Mo 提出額外要求：日後 AI 生成之所有正式報告、設計提案、審閱意見等，必須存放在專案工作區（Project Workspace）內部適當目錄中。
若存放在外部 App Data 系統路徑，會導致用戶在 VS Code / Cursor 編輯器中無法使用 `@` 檔案索引功能快速檢索與引用。
因此，我們將此條款寫入憲法層 `AGENTS.md`，並同步更新專案地圖 `docs/repo-map.md`。

---

## 修改項目

| # | 位置 | 原內容摘要 | 修正內容摘要 |
|---|------|-----------|------------|
| 1 | Header | Version: v1.4.6 / Last updated: 2026-05-17 | Version: v1.4.7 / Last updated: 2026-05-23 |
| 2 | Section 3 全域硬規則 | 無此規則 | 新增 `### 報告與產出物工作區存放守護 (Rule 3.14)`，規定所有 AI 報告必須存在 Workspace 內（如 `.fhs/reports/` 或 `.fhs/notes/`），禁存外部。 |
| 3 | docs/repo-map.md | `completion_reports/` 在 `notes/` 目錄下（與實際結構有偏差），無 `reports/` 定義。 | 修正目錄映射，將 `notes/completion_reports` 移除，新增 `.fhs/reports/` 及 `completion/`, `planning/`, `audits/` 子目錄之結構與用途描述。 |

---

## 觸發的後效同步

- **[B] 制度層變動** ✅ — 本記錄即為強制完成記錄
- **[C] CHANGELOG 稽核** ✅ — CHANGELOG.md 已於 2026-05-23 頂部補入記錄

---

## 驗收標準

- [x] AGENTS.md 版本號升至 v1.4.7，Last updated 更新為 2026-05-23
- [x] AGENTS.md 新增 Rule 3.14，明定產出物工作區存放限制與原因
- [x] docs/repo-map.md 結構對齊實際檔案系統，移除過時 notes 下的 completion 描述，加入 `.fhs/reports/` 新結構
- [x] CHANGELOG.md 頂部已記載本次變更
