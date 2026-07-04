---
name: feedback_v42_split_autofill_overwrite
description: _quickHalfFillAllSplits 在定價引擎執行後無條件覆寫 split box，包括載入現有訂單場景，導致 Supabase 被 n8n 寫回舊半訂金額
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 3fbfb24d-65d5-453c-86a6-6d665ecefc38
---

`_quickHalfFillAllSplits` 每次定價引擎執行完都被無條件呼叫（line ~6265），會把 deposit split box 強制填為 `Math.ceil(suggested/2)`，包括「載入現有訂單」場景 — 覆寫 raw_form_state 還原的舊值或用戶輸入值。

**Why:** V42 引入時只考慮新訂單首次定價 auto-fill 場景，從未處理既存訂單載入後的保護。

**How to apply:**
- `_quickHalfFillAllSplits` 內每個 split box 必須先 check：`if (inp.value !== '' && inp.value !== '0' && inp.dataset.isDefault !== 'true') return;`（非零非默認值 → skip）
- `_addBox` 的 oninput 必須加 `this.dataset.isDefault='false'`（手動輸入標記，防定價引擎再度覆寫）
- 相關記憶：[[feedback_v42_raw_form_state_patch_caveat]]
