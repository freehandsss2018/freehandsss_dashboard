# Lesson — Audit Ledger 誠實成本呈現原則（不製造假數）

**日期**：2026-06-26（Session 124）
**類型**：Pitfall + Preference
**來源**：`/cl-flow-fast` flow 2026-06-25-1222（Audit Ledger 財務呈現優化，路線①）

## 背景
Fat Mo 要求把品項成本小計加「單件 × 數量 = 小計」乘法呈現，並展開繪圖/物料/環扣明細。Live 核實發現：
- 加購鎖匙扣 `order_items.subtotal_cost` / 訂單層 `keychain_cost` **未按 quantity 累加**（qty=2/3/4 多數仍只記首件 $185，應為 首件185 + 加購125×(N−1)）。範例 0600905 / 0600908。
- 品項層四欄 `drawing/printing/chain/shipping_cost` 對該批訂單**全為 $0**（Task A 91% 空欄）。

## 原則（前端財務呈現遇資料異常時）
1. **禁止製造假數**：DB 存值（185）與真值（310）皆非 `base×qty` 乘積 → 顯示「185×2=370」會憑空造一個從不存在的數字。改以 `fhsAudit_qtyWarn` 紅色警示「疑漏算加購 N−1 件，待 n8n 修正」，**不顯示乘法等式**。
2. **展開明細只列真實欄位**：缺則明確標「明細未記錄（n8n 未寫入）」，**禁止前端用 `cost_configurations` 自行重算拆解**（違反成本單一真源 / AGENTS §財務欄位計算職責分工，是架構反模式）。
3. **呈現 vs 資料分線**：成本算錯是 n8n/資料層 bug（歸 Task A），前端任務只負責**誠實揭露**不回寫、不掩蓋。

## 偵測啟發式
`qty > 1 && Math.abs(subtotal_cost − item_base_cost) < 0.01 && item_base_cost > 0` → 成本完全未隨件數累加 → 觸發警示。

## 關聯
- 記憶 `project_keychain_addon_qty_cost_bug.md`（本次 live 再確認）
- `FHS_System_Logic_Overview.md §九`（②成本快照鏈 可展開明細 + 已知 bug）
- 待修：點4 n8n 加購鎖匙扣按件數累加 + 歷史回填（另開 `/cl-flow`，Task A 同源）