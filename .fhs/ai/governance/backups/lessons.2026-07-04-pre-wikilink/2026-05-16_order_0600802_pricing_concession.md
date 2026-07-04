# Order 0600802 — Pricing Concession Record

## Summary
Order 0600802 (Customer: WingLee) has `final_sale_price = $2,160` while `raw_form_state.__System_Final_Sale_Price = $3,460`. The $1,300 difference is an **authorized pricing concession by Fat Mo**, not a data error.

## System-Calculated Price: HK$3,460
- 2 keychain items, **different body parts** (RH + RF), P-mode (no main product)
- `processTierPricing()` logic: each different body part resets the tier count
  - RH keychain (index 0, qty=1, P-mode) → $1,580
  - RF keychain (index 1, qty=1, P-mode) → $1,580 (price reset — different part)
  - Cross-part surcharge (index=1, P-mode, !standaloneSurchargePaid) → +$300
  - **Total system suggested: $3,460**
- Source: `Freehandsss_Dashboard/Freehandsss_dashboard_current.html` lines 4276-4339 `processTierPricing()`

## Actual Transaction Price: HK$2,160
- Fat Mo charged the **P-mode qty-2 same-part tier rate** ($2,160) instead
- This waives: cross-part price reset + $300 surcharge
- Concession amount: **$1,300**
- `deposit = $2,160`, `balance = $0` → fully paid
- `admin_notes` records this concession reason

## Where Each Value Appears

### Supabase (`orders` table)
- `final_sale_price = 2160` → actual collected revenue (correct)
- `raw_form_state.__System_Final_Sale_Price = 3460` → system suggestion at time of order entry
- `admin_notes` → contains this concession explanation
- `adjustment_amount = 0` (not used — manual discount not tracked via this field for this order)

### n8n (workflow 6Ljih0hSKr9RpYNm)
- `__System_Final_Sale_Price` is set by the **frontend** `calculatePricing()`, NOT by n8n
- n8n receives it as payload and passes it through to Supabase `Mirror to Supabase` node
- n8n does NOT recalculate or validate the sale price
- n8n does calculate: `keychain_cost = 450` (after §2.5 deduction), `n8n_cost_adjustments = -20`

### Dashboard (V41.html / current.html)
- Finance Mode KPI Revenue = SUM(`final_sale_price`) via Supabase RPC `get_financial_kpis`
- So $2,160 is what appears in revenue figures — correct
- `admin_notes` displayed in order list: desktop `notes-input-${o.id}`, mobile `acc-notes-${o.id}`
- `adjustment_amount` is NOT rendered anywhere in V41 HTML (field exists in Supabase but unused in UI)

## Quick Diagnosis Guide
- If you see `final_sale_price ≠ __System_Final_Sale_Price` → check `admin_notes` first
- If admin_notes has concession reason → it's intentional, not a bug
- If admin_notes is empty and values differ → escalate to Fat Mo for clarification
- The $1,300 gap here = cross-part surcharge ($300) + second item price reset ($880 difference from same-part pricing) treated as same-part qty-2

## Authorization
- Decision by: Fat Mo
- Date: 2026-05-16
- Policy: Current platform policy allows entering actual transaction amount that differs from system suggested price; no explanation required in system
