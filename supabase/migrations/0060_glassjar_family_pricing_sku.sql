-- 0060_glassjar_family_pricing_sku.sql
-- 玻璃瓶套裝新增「含父母」家庭定價 SKU（2026-07-19，S183 追加）
--
-- 背景：立體擺設玻璃瓶套裝新增規則——倒模對象包含父母時售價一律 $2,580 flat，
-- 覆蓋原本 2肢($1,380)/4肢($1,680) 分級。若沿用同一 SKU 字串「玻璃瓶套裝 (4肢)」，
-- 前端 fhsSuggestedPriceMap（讀 products.suggested_price，per-SKU 靜態對照）
-- 無法區分「含父母」情境，令「顯示項目財務」稽核面板恆顯示 $1,680 舊價，
-- 與 calculatePricing() 即時計算結果不符。改用獨立 SKU 名稱「玻璃瓶套裝 (家庭)」，
-- 令靜態對照表可正確解析。成本不變（$210 flat，同其餘立體擺設 SKU）。
--
-- 對應前端改動：Freehandsss_dashboard_current.html / freehandsss_dashboardV42.html
-- calculatePricing() 與 buildOrderItemsForPricing() 新增 hasParentGlass 判定，
-- 生成品名時改用「玻璃瓶套裝 (家庭)」取代「玻璃瓶套裝 (N肢)」。
--
-- 冪等：ON CONFLICT DO NOTHING，重複執行安全。

INSERT INTO products (sku, main_category, target_object, material, mode, item_per_set, total_base_cost, cost_config_id, suggested_price, markup_factor)
VALUES ('玻璃瓶套裝 (家庭)', '立體擺設', '玻璃瓶套裝', '家庭', '無', 1, 210.00, gen_random_uuid(), 2580.00, NULL)
ON CONFLICT (sku) DO NOTHING;
