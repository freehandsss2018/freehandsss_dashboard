# 完成記錄：AGENTS.md v1.4.6 — Supabase-First 規則對齊修正

**日期**：2026-05-17
**執行者**：Claude Code (A3)
**授權方式**：Fat Mo 口頭授權 + /execute 指令
**任務類型**：制度層 patch — 憲法規則對齊

---

## 任務背景

Fat Mo 發現 AGENTS.md 中存在與 Supabase-First 架構不一致的規則（v1.4.5 時代的 Airtable-centric 表述）。
本次任務清理 6 處過時/矛盾內容，升版至 v1.4.6。

---

## 修改項目

| # | 位置 | 原內容摘要 | 修正內容摘要 |
|---|------|-----------|------------|
| 1 | Section 3 財務真理守護 | "Airtable 計算職責分工"：n8n 計算後直接寫入（隱含 Airtable） | 改名「財務欄位計算職責分工」；明確寫入 Supabase(Primary)→Airtable(Fallback) |
| 2 | Section 4 雙寫隔離 | "不得中斷 Airtable 主流程（後備鏈路）" | Supabase 為主流程，Airtable 為後備；雙向 try-catch 隔離 |
| 3 | Section 7 Subagent 路由 database-reviewer | Triple_Sync 欄位核查 | Quadruple_Sync 欄位核查 |
| 4 | Section 7 Subagent 路由 finance-auditor | 三端利潤一致性稽核 (Airtable↔n8n↔Dashboard) | 四端利潤一致性稽核 (Airtable↔n8n↔Dashboard↔Supabase) |
| 5 | Section 5 系統真理庫 | Triple_Sync_Field_Map.md（正常 reference） | 標注 [已廢棄]，避免 AI 誤引 |
| 6 | Section 3 Stitch 資產守護 | 守護清單 V36/V37/V40 | 更新為 V41（current 主核心） |
| + | Header | v1.4.5 / Last updated: 2026-05-13 | v1.4.6 / Last updated: 2026-05-17 |

---

## 觸發的後效同步

- **[B] 制度層變動** ✅ — 本記錄即為強制完成記錄
- **[C] CHANGELOG 稽核** ✅ — CHANGELOG.md 已於 2026-05-17 頂部補入記錄

---

## 驗收標準

- [x] AGENTS.md 版本號升至 v1.4.6
- [x] 財務欄位寫入目標明確含 Supabase
- [x] 雙寫隔離語義正確（Supabase 主 / Airtable 備）
- [x] Subagent 路由無 Triple_Sync 殘留
- [x] finance-auditor 路由為四端
- [x] Triple_Sync_Field_Map 標注廢棄
- [x] Stitch 守護含 V41
- [x] CHANGELOG.md 已更新
