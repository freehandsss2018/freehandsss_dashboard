-- 0090_glassjar_elder_only_pricing_sku.sql
-- 玻璃瓶套裝新增「純大寶」定價 SKU（2026-08-21，D65續IV-follow）
--
-- 背景：Fat Mo 2026-08-21 定案，純大寶單（該件零嬰兒肢體 + 全單無父母）自成一條產品線，
-- 售價高於同肢數純嬰兒單：
--     2肢 $1,680（純嬰兒同肢數 $1,380）
--     4肢 $1,980（純嬰兒同肢數 $1,680）
-- 有父母時一律 $2,580 flat（「玻璃瓶套裝 (家庭)」，migration 0060）不受本次影響；
-- 純嬰兒（無大寶無父母）維持 $1,380/$1,680 完全不變。
--
-- 點解要獨立 SKU：前端 fhsSuggestedPriceMap 讀 products.suggested_price 做 per-SKU 靜態對照，
-- 若純大寶沿用「玻璃瓶套裝 (2肢/4肢)」，「顯示項目財務」稽核面板會恆顯示嬰兒價，
-- 同 calculatePricing() 即時結果不符——即 2026-07-19 家庭價踩過嘅同一個坑（見 0060 註解）。
--
-- 成本不變：$210 flat，同其餘立體擺設 SKU 一致（2肢/4肢同價，migration 0030）。
-- 本次為純售價調整，cost_configurations 零改動，故純大寶單淨利潤較同肢數嬰兒單高 $300
-- （Fat Mo 2026-08-21 確認屬定價策略，非成本差異）。
--
-- material 欄取值跟隨 live 慣例（存括號內變體文字，已核實：'2肢'/'4肢'/'家庭'）。
--
-- 對應前端改動：freehandsss_dashboardV42.html / Freehandsss_dashboard_current.html
--   (1) _pDeriveSkuName() 新增 isPureElder 分支，產出「玻璃瓶套裝 (大寶N肢)」
--   (2) _pPriceOfSku() 新增大寶價階，**置於通用 4肢/2肢 判斷之前**（SKU 名本身含「4肢」字樣，
--       次序調轉會令大寶單靜默收返嬰兒價）
--   (3) 「玻璃瓶但未選嬰兒肢體」資料提醒對純大寶件抑制（該情境已成合法產品線）
--
-- 不受影響：木框套裝（無大寶/父母 UI 選項）、既有訂單（Layer 2 快照不可變，舊單維持原價）。
--
-- 冪等：ON CONFLICT DO NOTHING，重複執行安全。

INSERT INTO products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost, cost_config_id, suggested_price, markup_factor)
VALUES
  ('玻璃瓶套裝 (大寶2肢)', '立體擺設', '玻璃瓶套裝', '大寶2肢', '無', 1, 210.00, gen_random_uuid(), 1680.00, NULL),
  ('玻璃瓶套裝 (大寶4肢)', '立體擺設', '玻璃瓶套裝', '大寶4肢', '無', 1, 210.00, gen_random_uuid(), 1980.00, NULL)
ON CONFLICT (sku) DO NOTHING;
