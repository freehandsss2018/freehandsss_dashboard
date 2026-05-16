-- Migration 0006: 新增 n8n_cost_adjustments 欄位 + 修正訂單 0600802 keychain_cost
-- 目的：記錄 n8n 系統自動計算的成本調整明細，與人工 adjustment_amount 明確區分
-- 日期：2026-05-16
-- 執行方式：Supabase SQL Editor → 全部貼入 → Run
-- 授權：Fat Mo

-- ============================================================
-- STEP 1：新增 n8n_cost_adjustments 欄位至 orders 表
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS n8n_cost_adjustments JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN orders.n8n_cost_adjustments IS
  '【n8n 自動成本調整明細】JSONB 陣列，記錄 n8n 系統自動計算的成本調整項目。
   ⚠️ 與 adjustment_amount（人工調整金額）明確區分：
     - n8n_cost_adjustments = 系統規則自動計算（如鎖匙扣跨部位運費扣減 V3.7 §2.5），唯讀，不可人工修改
     - adjustment_amount    = Fat Mo 人工輸入的訂單價格調整（折扣/加收），由前端 Dashboard 填入
   格式範例：
   [{"type": "keychain_shipping_deduction", "amount": -20, "desc": "2件鎖匙扣共享運費，扣減1件運費",
     "basis": "Product Bible V3.7 §2.5", "keychain_item_count": 2}]
   無調整時為空陣列 []。
   寫入方：n8n Mirror to Supabase 節點（新訂單），歷史訂單維持 [] 預設值。';

-- ============================================================
-- STEP 2：修正訂單 0600802 的 keychain_cost
-- （Finance Auditor 確認：此訂單 2 件鎖匙扣，含 §2.5 扣減後應為 $450）
-- ============================================================

UPDATE orders
SET
  keychain_cost          = 450,
  n8n_cost_adjustments   = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"2件鎖匙扣共享運費，扣減1件單獨運費（每件$20）","basis":"Product Bible V3.7 §2.5","keychain_item_count":2}]'::jsonb,
  updated_at             = NOW()
WHERE order_id = '0600802';

-- 執行後驗證（可單獨跑此 SELECT）：
-- SELECT order_id, keychain_cost, total_cost, net_profit, n8n_cost_adjustments
-- FROM orders WHERE order_id = '0600802';
