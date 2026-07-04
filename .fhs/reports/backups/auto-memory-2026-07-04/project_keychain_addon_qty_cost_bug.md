---
name: project_keychain_addon_qty_cost_bug
description: 加購鎖匙扣 subtotal_cost/keychain_cost 無視 quantity 的成本系統性低估 bug（2026-06-25 S122 live 坐實，歸 Task A，未修）
metadata: 
  node_type: memory
  type: project
  originSessionId: d4319f8e-2481-46f7-9397-469ead267335
---

V42 Audit Ledger 點(4) live 核實（flow 2026-06-25-1222，訂單 0600905/0600908）發現：加購鎖匙扣的 `order_items.subtotal_cost` 與訂單層 `keychain_cost` **無視 quantity**，多件只算單件。

嬰兒不銹鋼鎖匙扣成本基準（live cost_configurations）：繪圖60(drawing_cost_baby_s) + 物料115(material_cost_keychain_stainless) + 環扣10(keychain_clasp_cost) = **首件全成本$185**；加購件免畫圖=**$125**。quantity=2 正解=185+125=**$310**，但實存=185。

系統性證據：全體嬰兒不銹鋼鎖匙扣 qty=1全185✓、qty=3/4全185（嚴重低估）、qty=2 為185/290/580混雜。

啟示：
- 這是 **n8n 成本計算 bug**（非顯示 bug），歸 [[Task A]] 同源（該訂單 drawing/printing/chain/shipping 四欄亦全$0=91%空欄）。
- Audit Ledger 前端**禁做 185×N 假乘法**（存值≠真值≠單件×數量），資料修正前只能誠實標警示。
- 禁用捷徑：前端用 cost_configurations 自行重算明細=違反成本單一真源（AGENTS §財務欄位計算職責分工）。
- 見 [[project_cost_calculation_rules]]（首件全價/加購免畫圖/運費按件數扣減）。
