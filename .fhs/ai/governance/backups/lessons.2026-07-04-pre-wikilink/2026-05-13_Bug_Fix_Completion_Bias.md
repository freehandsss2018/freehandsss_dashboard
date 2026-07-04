---
name: Bug 修復假完成模式（Completion Bias）教訓
description: AI 在代碼寫入後宣告「修復完成」，但實際執行路徑（RLS Policy）從未驗證，導致 sbSyncOrder 每次呼叫均 403 失敗。
type: feedback
date: 2026-05-13
---

# 教訓：Bug 修復假完成模式

**Why**: 本 session 中，sbSyncOrder 代碼已寫入 V41，但 Supabase RLS Policy 未建立，AI 多次宣告「修復完成」，實際上每次 sync 均為 403 失敗。同時 `final_sale_price` 遺漏寫入（財務欄位歸 0）。

**How to apply**: 宣告任何 FHS Bug 修復完成前，強制執行 `fhs-bug-triage` 5-Gate Protocol：
1. Gate 1 Code — grep 確認代碼存在
2. Gate 2 DB — live 確認 RLS/schema 約束到位
3. Gate 3 Exec — 實際觸發操作，取得 HTTP 2xx
4. Gate 4 Verify — read-back 確認 row 數值正確（非 0/null）
5. Gate 5 No-Regress — 相鄰功能未破壞

**文件成癮反模式**：寫 SETUP.md / CHECKLIST.md / ROADMAP.md 讓 AI 感覺完成，但 1,500 行 Markdown 無法取代 4 行 SQL 的實際執行。超過 1 份 .md 指導文件 per bug = 警訊。

**Skill 路徑**：`.fhs/ai/skills/fhs-bug-triage/SKILL.md`
