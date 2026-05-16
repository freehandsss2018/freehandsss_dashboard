-- Migration 0008: 記錄訂單 0600802 定價優惠原因至 admin_notes
-- 背景：系統建議售價 $3,460（2件不同部位鎖匙扣，P模式，含異部位附加費$300）
--       實際成交 $2,160（Fat Mo 以同部位2件定價收費，豁免跨部位重置及$300附加費）
--       差額 $1,300 = 授權定價優惠，非系統錯誤。
-- 日期：2026-05-16
-- 授權：Fat Mo

UPDATE orders
SET
  admin_notes = '【定價優惠記錄 2026-05-16】
系統建議售價：$3,460
  計算：RH鎖匙扣($1,580) + RF鎖匙扣($1,580，異部位重置) + 異部位附加費($300) = $3,460
  依據：Product Bible V3.7 §2，P模式，2件不同部位各別計算

實際成交：$2,160（Fat Mo 授權）
  定價方式：以P模式同部位2件定價($2,160)收費，豁免跨部位重置及$300附加費
  優惠金額：$1,300

此差異為授權定價決定，非數據錯誤。
adjustment_amount 欄位未使用（前端Dashboard現階段未接入此欄位）。',
  updated_at = NOW()
WHERE order_id = '0600802';

-- 執行後驗證：
-- SELECT order_id, final_sale_price, admin_notes, adjustment_amount
-- FROM orders WHERE order_id = '0600802';
-- 預期：admin_notes 包含上述優惠說明
