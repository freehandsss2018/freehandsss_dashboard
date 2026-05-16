-- Migration 0007: 修正 n8n_cost_adjustments 欄位設計 + 新增 n8n_adjustment_notes
-- 背景：0006 將 n8n_cost_adjustments 設為 JSONB（存整份描述陣列），設計有誤。
--       正確設計：數字欄位存扣減總額，JSONB 欄位另存可讀性說明。
-- 日期：2026-05-16
-- 執行方式：Supabase SQL Editor → 全部貼入 → Run
-- 授權：Fat Mo

-- ============================================================
-- STEP 1：將 n8n_cost_adjustments 由 JSONB 改為 NUMERIC(10,2)
-- ============================================================

ALTER TABLE orders
  ALTER COLUMN n8n_cost_adjustments DROP DEFAULT,
  ALTER COLUMN n8n_cost_adjustments DROP NOT NULL;

ALTER TABLE orders
  ALTER COLUMN n8n_cost_adjustments TYPE NUMERIC(10,2)
    USING CASE
      WHEN n8n_cost_adjustments IS NULL THEN 0
      WHEN jsonb_array_length(n8n_cost_adjustments) = 0 THEN 0
      ELSE (n8n_cost_adjustments -> 0 ->> 'amount')::NUMERIC(10,2)
    END;

ALTER TABLE orders
  ALTER COLUMN n8n_cost_adjustments SET DEFAULT 0,
  ALTER COLUMN n8n_cost_adjustments SET NOT NULL;

COMMENT ON COLUMN orders.n8n_cost_adjustments IS
  '【n8n 系統自動成本調整金額】NUMERIC，n8n 依商業規則自動計算的扣減總額（通常為負數，例如 -20.00）。
   ⚠️ 與其他調整欄位的區別：
     - n8n_cost_adjustments = 系統規則自動計算（如鎖匙扣跨部位運費扣減 V3.7 §2.5），唯讀，不可人工修改
     - n8n_adjustment_notes = 上述扣減的可讀性說明陣列（JSONB），不參與財務計算
     - adjustment_amount    = Fat Mo 人工輸入的訂單價格調整（折扣/加收），由 Dashboard 填入
   無調整時為 0。
   寫入方：n8n Calculate Profit & Pack Items → Mirror to Supabase（新訂單）。';

-- ============================================================
-- STEP 2：新增 n8n_adjustment_notes JSONB 欄位
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS n8n_adjustment_notes JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN orders.n8n_adjustment_notes IS
  '【n8n 系統成本調整說明】JSONB 陣列，記錄每項自動扣減的來源、規則依據與描述文字。
   ⚠️ 此欄位為可讀性記錄，不用於任何財務計算（計算用欄位為 n8n_cost_adjustments NUMERIC）。
   格式範例：
   [{"type":"keychain_shipping_deduction","amount":-20,
     "desc":"2件鎖匙扣共享運費，扣減1件單獨運費（每件$20）",
     "basis":"Product Bible V3.7 §2.5","keychain_item_count":2}]
   無調整時為空陣列 []。
   寫入方：n8n Calculate Profit & Pack Items → Mirror to Supabase（新訂單）。';

-- ============================================================
-- STEP 3：更新訂單 0600802（修正為新格式）
-- ============================================================

UPDATE orders
SET
  n8n_cost_adjustments = -20,
  n8n_adjustment_notes = '[{"type":"keychain_shipping_deduction","amount":-20,"desc":"2件鎖匙扣共享運費，扣減1件單獨運費（每件$20）","basis":"Product Bible V3.7 §2.5","keychain_item_count":2}]'::jsonb,
  updated_at           = NOW()
WHERE order_id = '0600802';

-- 執行後驗證：
-- SELECT order_id, keychain_cost, total_cost, n8n_cost_adjustments, n8n_adjustment_notes
-- FROM orders WHERE order_id = '0600802';
-- 預期：n8n_cost_adjustments = -20.00，n8n_adjustment_notes = [{...}]
