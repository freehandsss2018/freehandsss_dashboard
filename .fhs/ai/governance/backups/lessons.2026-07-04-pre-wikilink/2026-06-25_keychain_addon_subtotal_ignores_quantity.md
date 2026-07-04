# Lesson — 加購鎖匙扣 subtotal_cost / keychain_cost 無視 quantity（成本系統性低估）

**日期**：2026-06-25（Session 122，flow 2026-06-25-1222 規劃階段 live 發現）
**類型**：財務成本計算 bug（n8n 側，非顯示層）
**狀態**：已 live 坐實，修復未執行（歸 Task A 同源，待另案 /cl-flow）

## 發現背景
Fat Mo 質疑 V42 Audit Ledger 截圖中「嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購) ×2 成本小計 $185」是否正確。
截圖訂單 = 0600905 / 0600908（deposit 3580 / total_cost 395 / handmodel 210 / keychain 185 / profit 3185）。

## 成本基準（live cost_configurations）
- 繪圖 `drawing_cost_baby_s` = $60（每單一次）
- 物料 `material_cost_keychain_stainless` = $115
- 環扣 `keychain_clasp_cost` = $10
- **首件全成本 = 60+115+10 = $185**；**加購件（免畫圖）= 115+10 = $125**

## 核心結論
品項 `quantity=2`（同手同款 `_K_RH`），正解應 = **185 + 125 = $310**，但 `subtotal_cost = item_base_cost = 185`，**完全無視 quantity**。$185 低估約 $125。

## 系統性證據（全體嬰兒不銹鋼鎖匙扣按 quantity 分組）
| quantity | rows | subtotal 範圍 |
|---|---|---|
| 1 | 7 | 185～185 ✓ |
| 2 | 9 | 185～580（185＝低估，部分手算 290/580）|
| 3 | 2 | 全 185（嚴重低估）|
| 4 | 5 | 全 185（嚴重低估）|

→ 多件加購鎖匙扣成本普遍未按「首件全價 + 加購件×N」累加，`subtotal_cost`/訂單層 `keychain_cost` 停在單件 $185。

## 關聯與啟示
- 與 [Task A 四欄寫入修復] 同源：該訂單 `drawing/printing/chain/shipping_cost` 四欄亦全 $0（91% 空欄）。
- 影響：Audit Ledger 點2（明細展開）無資料可顯示；點3（單件×數量）若直接顯示乘法會製造假數字（存值185≠真值310≠185×2）。故前端不可在資料修正前做乘法呈現。
- 修復方向：n8n 成本計算需對加購類別按 SUM(quantity) 累加（首件全價 + 加購件免畫圖），並回填歷史 subtotal_cost / keychain_cost。
- 不可走的捷徑：前端用 cost_configurations 自行重算明細 = 違反成本單一真源（AGENTS §財務欄位計算職責分工）。