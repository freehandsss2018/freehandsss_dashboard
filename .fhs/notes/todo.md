# Todo — 待辦事項

> ⚠️ **SSoT 移轉聲明**：
> 為避免雙源衝突，近期的短期與跨 session 待辦事項，請一律以 `.fhs/memory/handoff.md` 中的「待辦 ⏳ 項目」區塊為絕對真理 (Single Source of Truth)。
> 本文件 (`todo.md`) 僅作為長期架構規劃或低優先級技術債的停放區。

***

## 近期完成 (Completed)

- [x] ✅ 0003 migration SQL + v_products_with_costs VIEW + get_base_cost_by_skus RPC — Supabase-First Phase 1 完成（2026-05-15）
- [x] ✅ RLS DELETE policy（orders 軟刪除保護）

## 跨 Session 待辦 (Cross-Session Backlog)

- [ ] 🔴 Plan 0004 執行：Supabase 成本架構完整遷移（新 session 執行）→ 參見 `docs/plan_0004_supabase_cost_migration.md`
- [ ] 📋 Plan 0004 完成後：更新 Airtable 定義備存（歷史訂單成本分析用）

## 長期掛起與技術債 (Backlog)

- [ ] 定期追蹤 Supabase Free Tier 使用量 (警戒線: Database 400MB / 頻寬 1.5GB)
- [ ] 評估歷史遺留 Legacy Scripts (sync-legacy-orders.js 等) 的文件化與最終歸檔

***
