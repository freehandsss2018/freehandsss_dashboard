---
date: 2026-05-17
topic: handmodel Bar Chart 細分 + SQL 部署驗證
---

## 教訓

### 1. SQL 部署後必須立即用 curl 驗證
- 用戶說 "done" 不等於部署成功
- 應立即測試 RPC 確認新欄位是否存在（`handmodel_frame: None` = 未部署）
- 驗證指令：`curl -X POST .../rpc/get_financial_charts ... | python3 -c "print(d['category_revenue'].get('handmodel_frame'))"`

### 2. JS fallback 防護：SQL 未部署時不應顯示空圖表
- 若新欄位未部署，`cr.handmodel_frame || 0` → `[0, 0]` → `hasData=false` → 顯示「本期無數據」
- 正確做法：`(hmFrame + hmBottle > 0) ? [細分] : [總數]` 降級顯示

### 3. item_key ILIKE 過濾手模子類型
- `item_category = '立體擺設'` 無法區分木框/玻璃瓶
- 需用 `item_key ILIKE '%木框%'` / `'%玻璃瓶%'`（item_key 格式：`{order_id} | {product_name}`）

### 4. category_revenue 子查詢位置
- `handmodel_frame`/`handmodel_bottle` 是 scalar subquery，放在 `json_build_object()` 內
- 外層 `FROM orders WHERE ...` 不影響這些 scalar subquery 的結果
