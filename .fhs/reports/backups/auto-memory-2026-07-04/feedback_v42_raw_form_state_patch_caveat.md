---
name: feedback_v42_raw_form_state_patch_caveat
description: SQL patch orders/order_items 的財務欄位不會更新 raw_form_state，下次載入訂單後 split box 仍顯示舊值，sync 後 Supabase 被覆寫回舊金額
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3fbfb24d-65d5-453c-86a6-6d665ecefc38
---

直接 SQL patch `orders.deposit` / `orders.final_sale_price` 等欄位**不會**更新 `orders.raw_form_state`。raw_form_state 包含 `depositSplitData`（per-item split 值），載入訂單時 renderPaymentSplits 從 raw_form_state 還原舊 split 值。

**Why:** raw_form_state 只在 Dashboard 提交時由 captureFormState() 更新，SQL patch 繞過此路徑。

**How to apply:**
- SQL patch 後告知用戶：必須載入訂單 → 手動修正 split box 值 → 按同步，才能同步更新 raw_form_state
- 或同時 SQL patch `raw_form_state`（用 jsonb_set），但 box key 格式為 `{Order_Item_Key}##{PartDesc}#{target}`（通常為 `0600103_K_LH##`）
- 相關記憶：[[feedback_v42_split_autofill_overwrite]]
