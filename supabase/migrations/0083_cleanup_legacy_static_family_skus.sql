-- 清理舊家庭靜態SKU（S1/S2/P1/P2命名，V2動態畫圖模型已取代，decisions.md 2026-07-28 backlog）
-- 保留 1 行因歷史訂單 order_items FK 引用：家庭(S2)鎖匙扣 - 不銹鋼 - 1飾 (加購)
DELETE FROM products
WHERE (sku LIKE '%家庭(S1)%' OR sku LIKE '%家庭(S2)%' OR sku LIKE '%家庭(P1)%' OR sku LIKE '%家庭(P2)%')
  AND sku <> '家庭(S2)鎖匙扣 - 不銹鋼 - 1飾 (加購)';
