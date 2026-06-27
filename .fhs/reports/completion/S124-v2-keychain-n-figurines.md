---
session: S124
flow_id: 2026-06-26-0922
task: 加購鎖匙扣成本 N飾維度修復（點4）
completed_at: 2026-06-26
status: DONE
verdict_original: CONDITIONAL_READY
---

# S124 v2 完成記錄：加購鎖匙扣成本 N飾維度修復

## 根因（雙根因）

1. `products.total_base_cost` 對所有 N飾 variant 存 flat 185（嬰兒S）/235（嬰兒P），完全不隨 `item_per_set` 縮放
2. Finance Bible §G2 範例 stale（物料 $95 應為 $115，subtotal 含/不含運費語義混淆）

## 執行摘要

| 步驟 | 狀態 | 說明 |
|------|------|------|
| 線D: Finance Bible §G2 校正 | ✅ DONE | 物料 $115，subtotal 不含運費，4件示例 |
| Migration 0045: fhs_compute_keychain_cost RPC | ✅ DONE | 單元測試 5/5 PASS |
| 線B: products UPDATE (41 rows) | ✅ DONE | 嬰兒S/P 不銹鋼全 N飾，RETURNING 確認 |
| 線C: 9單回填 | ✅ DONE | order_items 14行 + orders 9行 + audit_logs 9行 |
| n8n V47.18 | ✅ DONE | 純注釋，備份已建 |
| finance-auditor 三端對賬 | ✅ DONE | Supabase 9/9 PASS，Airtable 舊值為預期行為 |
| Migration 0046: drift N飾擴充 | ✅ DONE | Smoke PASS |
| 後效稽核 A/B/C/D/G | ✅ DONE | repo-map, CHANGELOG, decisions, FHS_System_Logic_Overview |

## 9單回填結果

| order_id | 舊 kc | 新 kc | 舊 profit | 新 profit | fsp（未動） |
|---|---|---|---|---|---|
| 06001008 | 125 | 440 | 3345 | 3030 | 3680 ✓ |
| 0600106 | 230 | 860 | 5240 | 4610 | 5680 ✓ |
| 0600107 | 605 | 905 | 8579 | 8279 | 10300 ✓ |
| 0600710 | 350 | 440 | 4575 | 4485 | 5560 ✓ |
| 0600809 | 185 | 440 | 3985 | 3730 | 4380 ✓ |
| 0600905 | 185 | 230 | 3185 | 3140 | 3580 ✓ |
| 0600908 | 185 | 230 | 3185 | 3140 | 3580 ✓ |
| 0650429 | 350 | 440 | 3700 | 3610 | 4260 ✓ |
| 0696216 | 350 | 440 | 4360 | 4270 | 4920 ✓ |

## 安全守護確認

- `final_sale_price / deposit / balance / additional_fee` — 真理欄位全程未動 ✓
- `net_profit = final_sale_price − total_cost` — 僅動成本側 ✓
- 家庭(S2)鎖匙扣 1飾(加購) 超出範圍 — 保留原值 275 ✓
- n8n V47.18 — 純注釋，無功能改動 ✓

## 新增成品

- `supabase/migrations/0045_keychain_cost_rpc.sql` — fhs_compute_keychain_cost RPC
- `supabase/migrations/0046_drift_function_n_figurines.sql` — drift 函式 N飾擴充
- `audit_logs` — 9 rows (log_type='order_cost_adjust', source='migration/S124_v2')

## Rule 3.17 雙紀律自檢

✅ 成本側更動（kc/tc/np）僅修歷史快照錯誤，final_sale_price 真理欄位全程守護
✅ 回填前 dry-run SELECT 確認所有 9 單預期值，RETURNING 回傳值 100% 對齊計畫值
