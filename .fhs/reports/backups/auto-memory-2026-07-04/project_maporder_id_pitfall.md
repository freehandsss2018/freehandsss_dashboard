---
name: project_maporder_id_pitfall
description: mapOrder() maps o.id = FHS string (NOT UUID); _uuid = Supabase UUID — affects all DOM lookups and openOrderModal calls
metadata: 
  node_type: memory
  type: project
  originSessionId: beea00f2-780a-4837-83ac-3dd9fccd04d3
---

**Pitfall: mapOrder id vs _uuid (discovered Session 83)**

`mapOrder()` in `patchFetchGlobalReview` does:
```js
id: row.order_id,   // FHS string e.g. "06001008"
_uuid: row.id,      // Supabase UUID
```

This is counter-intuitive — `o.id` is the FHS string, not the UUID.

All DOM IDs, `openOrderModal(orderId)`, and `jumpToReviewOrder(orderId)` use the **FHS string**.

**Why:** `mapOrder` was designed before Supabase; kept FHS string as primary key to preserve all existing DOM/modal logic.

**How to apply:** When working with `_dlvMap` or any function that receives order identifiers:
- Use `r.order_id` (FHS string) to call `openOrderModal` or look up DOM elements
- Use `r.id` (UUID) only for Supabase direct queries
- Never pass `r.id` (UUID) to UI functions expecting `orderId`

Related: [[project_v40_status]]
