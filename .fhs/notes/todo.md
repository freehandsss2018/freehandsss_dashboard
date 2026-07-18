# Todo — 待辦事項

> ⚠️ **SSoT 移轉聲明**：
> 為避免雙源衝突，近期的短期與跨 session 待辦事項，請一律以 `.fhs/memory/handoff.md` 中的「待辦 ⏳ 項目」區塊為絕對真理 (Single Source of Truth)。
> 本文件 (`todo.md`) 僅作為長期架構規劃或低優先級技術債的停放區。

***

## 近期完成 (Completed)

- [x] ✅ 0003 migration SQL + v_products_with_costs VIEW + get_base_cost_by_skus RPC — Supabase-First Phase 1 完成（2026-05-15）
- [x] ✅ RLS DELETE policy（orders 軟刪除保護）

## 跨 Session 待辦 (Cross-Session Backlog)

- [ ] 🔴 Plan 0004 執行：Supabase 成本架構完整遷移 → 參見 `docs/plan_0004_supabase_cost_migration.md`（2026-07-18 S181 D40 事故後優先級上修為🔴：鎖匙扣嬰兒層+吊飾全層已各自補完單一真源RPC並上線drift檢查，剩立體擺設/成人鎖匙扣/鋁合金三品類未覆蓋，需另開`/cl-flow`比照同一手術模式，詳見 handoff.md 待辦 [S181] 條目、decisions.md D40附錄）
- [ ] 📋 Plan 0004 完成後：更新 Airtable 定義備存（歷史訂單成本分析用）

## 未解待驗證 (Open Failures — 未過 stage-3 驗證的假設停放區，格式與規則見 `.fhs/ai/governance/07_compounding-loop.md` §1)

（目前無條目）

## 長期掛起與技術債 (Backlog)

- [ ] 定期追蹤 Supabase Free Tier 使用量 (警戒線: Database 400MB / 頻寬 1.5GB)
- [ ] 評估歷史遺留 Legacy Scripts (sync-legacy-orders.js 等) 的文件化與最終歸檔

***
