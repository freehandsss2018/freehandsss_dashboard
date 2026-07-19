# Todo — 待辦事項

> ⚠️ **SSoT 移轉聲明**：
> 為避免雙源衝突，近期的短期與跨 session 待辦事項，請一律以 `.fhs/memory/handoff.md` 中的「待辦 ⏳ 項目」區塊為絕對真理 (Single Source of Truth)。
> 本文件 (`todo.md`) 僅作為長期架構規劃或低優先級技術債的停放區。

***

## 近期完成 (Completed)

- [x] ✅ 0003 migration SQL + v_products_with_costs VIEW + get_base_cost_by_skus RPC — Supabase-First Phase 1 完成（2026-05-15）
- [x] ✅ RLS DELETE policy（orders 軟刪除保護）

## 跨 Session 待辦 (Cross-Session Backlog)

- [x] ✅ Plan 0004 執行：Supabase 成本架構完整遷移（=「Phase 2 成本核數」，注意勿與 2026-07-19 玻璃瓶含父母**售價**定價混淆——售價≠成本，兩者獨立事件同日撞單0600107）→ **2026-07-19 D41（另一並行 worktree session）全品類漂移修復完成並已 merge 落 main**：migrations 0058(家庭/成人鎖匙扣+鋁合金+複合SKU composite drawing 重算)/0059(`fhs_check_product_cost_drift()` 擴充全品類覆蓋)/0060(玻璃瓶家庭定價SKU)；live 核實 `fhs_check_product_cost_drift()` 現覆蓋 **492 行、零漂移**（原 D40 只做咗吊飾242/242+鎖匙扣嬰兒層40/243，D41 補完剩餘203款成人/家庭鎖匙扣+鋁合金+立體擺設全部）。關鍵教訓：家庭套裝畫圖成本唔係單一成人式，每個嬰兒肢都各自要計，opus首輪對抗審查都判斷錯，最終查 Dashboard 前端源碼先定案（見 finance-gatekeeper §四）。參見 `docs/plan_0004_supabase_cost_migration.md`、`FHS_System_Logic_Overview.md` §5.4.3、decisions.md D41
- [ ] 📋 Plan 0004 完成後：更新 Airtable 定義備存（歷史訂單成本分析用）

## 未解待驗證 (Open Failures — 未過 stage-3 驗證的假設停放區，格式與規則見 `.fhs/ai/governance/07_compounding-loop.md` §1)

（目前無條目）

## 長期掛起與技術債 (Backlog)

- [ ] 定期追蹤 Supabase Free Tier 使用量 (警戒線: Database 400MB / 頻寬 1.5GB)
- [ ] 評估歷史遺留 Legacy Scripts (sync-legacy-orders.js 等) 的文件化與最終歸檔

***
