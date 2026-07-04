# Lesson: 鎖匙扣成本誤判 + cost_configurations→products 傳播缺口

**日期**：2026-06-20（Session 112）
**類型**：Pitfall（重複踩雷風險高）

## 問題

Fat Mo 將 `cost_configurations.material_cost_keychain_stainless` 改為 115，發現訂單 06001008 的
`order_items.subtotal_cost = 185` 未變，判定「成本未同步」。

## 根因（兩層，不可混為一談）

1. **誤判本身**：`order_items.subtotal_cost`（185）是**組裝值**，非單一原子：
   `185 = drawing_cost_baby_s(60) + material_cost_keychain_stainless(115) + keychain_clasp_cost(10)`
   115 已經是新值，185 本來就對。把「組裝結果」與「設定中心單一 key」直接比對必定產生假性 drift。
2. **真實缺口**：`cost_configurations` 變更**沒有任何機制**回算 `products.total_base_cost`。
   本案數字剛好對是巧合（seed 本就用 115 算）。已壞死的 `recalculate_product_costs(text)` RPC
   引用 v1 schema 不存在欄位，呼叫必報錯，從未真正運作過（已於 migration 0042 移除）。

## 預防檢查清單

- 看到「設定中心改了 X，但訂單顯示的成本沒變/變得不對」時，**先還原組裝公式**（查
  `FHS_Product_Cost_Schema_v2.md` + 對應 migration），確認該欄位是裸原子還是組裝值，再下結論。
- 改任何 `cost_configurations` key 後，若想知道「products 表是否真的同步了」，**唯一**可信工具是
  `SELECT * FROM fhs_check_product_cost_drift();`——但範圍**僅**覆蓋嬰兒 S/P 不銹鋼鎖匙扣（已驗證公式）。
  其餘 tier（家庭/成人/鋁合金/吊飾/立體擺設）**無工具覆蓋**，drift 函式回傳空集合不代表「沒問題」，
  代表「沒檢查」。
- 新增/修改任何成本原子 key 前，先確認該 key 是否已存在於 live `cost_configurations`
  （勿假設文件記載=live 現值；`FHS_System_Logic_Overview.md` 本身就曾記載過期值）。

## 附帶發現（未修復，獨立議題）

`material_cost_keychain_alloy`（嬰兒層鋁合金物料原子）在 live `cost_configurations` 完全不存在
此 key，但對應 SKU（`嬰兒鎖匙扣 - 鋁合金`，`products.total_base_cost=212`）確實在售。212 的成本
來源無法用現有 key 還原，需另行排查（已記入 handoff 待辦）。

## 影響範圍

未來任何成本原子調整（不限鎖匙扣），都應預期「改了設定中心 ≠ products 表會更新」，需人工或擴充
drift-check 覆蓋率才能確認真正同步。Phase 2（成本組裝單一真源重構）規劃見
`FHS_System_Logic_Overview.md` §5.4。
