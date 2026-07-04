# Pitfall — 新物料遷移未補建 cost_configurations key

**Session**: S120 (2026-06-23)
**類型**: Pitfall

## 事件

鋁合金嬰兒鎖匙扣（40 SKU）從舊系統遷移時，`products.total_base_cost` 以硬碼平數填入（嬰兒S=$212, 嬰兒P=$262），但 `cost_configurations` 從未建立對應的 `material_cost_keychain_alloy` config key。

三層架構失去原子層錨定：products 數字無法回推到任何 config key，與不銹鋼同層（$115）的邏輯也未落盤。

## 診斷流程

1. 查 `cost_configurations WHERE config_key ILIKE '%alloy%'` → 0 行
2. 用 products 現有值反推 implied material cost：$212 − $70 = $142 vs $262 − $130 = $132 → 不一致，確認為錯誤硬碼
3. 查 `order_items WHERE product_sku ILIKE '%鋁合金%'` → 0 筆現有訂單，無需補正

## 修正

- INSERT `material_cost_keychain_alloy` = 115（與 stainless 同價，Fat Mo 確認）
- UPDATE products 40 行：嬰兒S → 185，嬰兒P → 245

## 預防規則

每次新增物料類型時，必須同時：
1. 在 `cost_configurations` 建立 config key
2. 更新 products.total_base_cost = material_cost + drawing/printing_cost
3. 回查是否有現存 order_items 需補正

禁止以任意平數填 products.total_base_cost（三層架構的 Layer 1 必須有 key 對應）。