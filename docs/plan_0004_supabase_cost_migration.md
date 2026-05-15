# Plan 0004: Supabase 成本架構完整遷移

**建立日期**: 2026-05-15
**執行者**: Fat Mo（新 session 執行）
**前置確認**: products=489筆含total_base_cost, cost_configurations=0筆, order_items 63筆product_sku=NULL

## 執行前提

- Supabase 0001, 0002, 0003 migration 已完成
- .env 有 AIRTABLE_API_KEY, AIRTABLE_BASE_ID, SUPABASE_URL, SUPABASE_SERVICE_KEY
- Node.js 已安裝

## 執行步驟

### Step 1：執行 migration script（重新執行）

```bash
node scripts/migrate_airtable_to_supabase.js
```

預期輸出：
- [0/4] Base_Costs: ~29 cost configs
- [1/4] Main_Orders: ~36 orders
- [1.5/4] Product_Database SKU map: ~489 products
- [2/4] Order_Items: ~63 items（含 product_sku）
- [3/4] Product_Database: ~489 products（含 cost_config_id）

✅ 成功指標：cost_configurations 應從 0 → ~29 筆

### Step 2：在 Supabase SQL Editor 執行 0004 migration

複製 `supabase/migrations/0004_cost_infrastructure.sql` 全部內容貼入 SQL Editor → Run

✅ 成功指標：`recalculate_product_costs` function 出現，`v_order_cost_breakdown` view 建立

### Step 3：執行驗證查詢

在 Supabase SQL Editor：

```sql
SELECT 'cost_configurations'         AS check_item, COUNT(*) AS cnt FROM cost_configurations
UNION ALL
SELECT 'products_with_config_id',    COUNT(*) FROM products WHERE cost_config_id IS NOT NULL
UNION ALL
SELECT 'products_no_cost',           COUNT(*) FROM products WHERE total_base_cost IS NULL
UNION ALL
SELECT 'order_items_with_sku',       COUNT(*) FROM order_items WHERE product_sku IS NOT NULL
UNION ALL
SELECT 'cost_integrity_matched',     COUNT(*) FROM v_order_cost_breakdown WHERE cost_integrity = '✓ matched';
```

預期結果：
- cost_configurations: ~29
- products_with_config_id: ~489
- products_no_cost: 0
- order_items_with_sku: ~63（全部）
- cost_integrity_matched: 應佔多數

### Step 4（如有 mismatch）：執行重算

```sql
SELECT recalculate_product_costs();
```

## 完成確認

執行完成後，更新 `.fhs/notes/todo.md` 將此任務標記完成。

## 待辦（完成後）

- 更新 Airtable 定義備存（歷史訂單成本分析用）— 列入下一個 session

## 日常成本更新流程

供應商成本變動時：
1. Supabase Dashboard → Table Editor → cost_configurations → 直接修改對應 config
2. SQL Editor 執行：`SELECT recalculate_product_costs('config名稱');`
3. 完成，不需要碰 Airtable
