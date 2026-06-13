# 診斷報告 — Audit Ledger 成本顯示異常（訂單 06001007 木框套裝）

> **日期**：2026-06-13（Session 102 後續）
> **觸發**：Fat Mo 報「訂單 0600007 木框成本計錯，60畫圖+60木框套裝小計，不知出處，整體成本210」
> **模式**：`/cl-flow-fast` → Gate 1 → Fat Mo 選「先只診斷不修」
> **狀態**：診斷完成，**未修改任何代碼/數據**（NO-TOUCH）
> **數據源**：Supabase live（project `vpmwizzixnwilmzctdvu`，30 訂單 / 79 order_items）

---

## 一、結論先行

**用戶報的「木框成本計錯」實質是 Session 102 Audit Ledger 的顯示 bug，DB 數據本身正確。**

- 訂單實為 `06001007`（YY，木框套裝4肢，售價 $2,380）
- DB `total_cost = $210` **正確**（繪圖 $60 + 物料 $150，存在 `handmodel_cost`）
- Audit Ledger `buildAuditLedgerHtml()` 錯把「四欄加總 $60」當成本顯示，真正成本 $210 在 `handmodel_cost` 卻沒被讀

---

## 二、根因鏈

### 根因 1（核心，顯示層）— Audit Ledger 依賴不可靠的四欄分解

`buildAuditLedgerHtml()`「② 成本快照鏈」把每件成本算成
`drawing_cost + printing_cost + chain_cost + shipping_cost`（四欄加總）。

**實測 79 個 order_items：**
| 指標 | 數量 | 佔比 |
|---|---|---|
| 四欄全為 $0 | 72 | **91%** |
| 四欄有值 | 7 | 9% |
| 四欄加總 ≠ subtotal_cost | 54 | **68%** |

→ 對 91% 訂單，Audit Ledger ② 區顯示 $0 或殘缺成本。

### 根因 2（數據層）— 四欄是未完成的「Task A」前端半成品

前端 `freehandsss_dashboardV42.html` line 7188-7193：
```javascript
if (window.fhsCurrentPricingItems && window.fhsCurrentPricingItems.length === orderItemsArray.length) {
    oItem.Drawing_Cost   = pItem.FatMoCost        || 0;
    oItem.Printing_Cost  = pItem.PrintingCost     || 0;  // Task A
    oItem.Chain_Cost     = pItem.ChainCost        || 0;  // Task A
    oItem.Shipping_Cost  = pItem.BaseShippingCost || 0;  // Task A
}
```
- 整塊被 `fhsCurrentPricingItems.length === orderItemsArray.length` 把關 → **只有當下經 calculatePricing 報價的新單才寫四欄**；edit 重同步、舊單一律跳過 → 四欄留 $0（解釋 72/79 全空）
- 立體擺設的 `pItem.PrintingCost` 從未設值 → 印刷 $150 永遠進不了四欄（解釋 06001007 缺 $150）
- 對應 Pricing Bible §6.1/§6.2「三層顆粒化架構（Task A）」未落實的技術債

### 四欄語義不一致實測（7 個有值 item）
| 訂單 | 類別 | qty | subtotal | 四欄加總 | 問題 |
|---|---|---|---|---|---|
| 06001007 | 立體擺設 | 1 | $210 | **$60** | 缺印刷 $150 |
| 0600103 | 鎖匙扣 | 1 | $235 | $235 | ✓ 唯一對賬 |
| 0600802 | 鎖匙扣 | 1 | $235 | $235 | ✓ |
| 06001008 | 鎖匙扣 | 4 | $185 | **$500** | 四欄被 ×qty |
| 0600106(×2) | 鎖匙扣 | 4 | $185 | **$500** | 四欄被 ×qty |

→ 四欄僅「qty=1 鎖匙扣/吊飾」可靠。

---

## 三、其他發掘問題（用戶要求自行發掘）

### 問題 B — 立體擺設四欄缺印刷費 $150
根因 2 已涵蓋。DB `total_cost` 仍正確（$150 在 handmodel_cost），僅四欄分解殘缺。

### 問題 C — 鎖匙扣 qty>1 四欄被 ×qty
`printing_cost = $95×4 = $380` 等，與 `subtotal_cost`（per-SKU base，不×qty，pitfall 19）口徑衝突。

### 問題 D — 舊單 0600100 類別污染
`item_category = '??'`，鎖匙扣成本誤入 `necklace_cost`（$185）、玻璃瓶誤入 `necklace_cost`（$210）。前分類時代遺留，僅此 1 單 2 item。

### 問題 E（新發掘，最隱蔽）— 運費扣減破壞 Finance Bible 驗證1
訂單層 `handmodel + keychain + necklace = total_cost`（驗證1）在 **4 單破裂，全部 diff = −$20**：

| 訂單 | total_cost | 類別相加 | diff |
|---|---|---|---|
| 0600104 | $450 | $470 | −$20 |
| 0600723 | $1,190 | $1,210 | −$20 |
| 0600724 | $770 | $790 | −$20 |
| 0600801 | $450 | $470 | −$20 |

**根因**：鎖匙扣運費扣減 (n-1)×$20 套進了 `total_cost`，卻未從 `keychain_cost` 類別欄扣掉。
Finance Bible §四明定 `orders.keychain_cost = SUM(item keychain) − keychainShippingDeduction`，
n8n 實際未對類別欄扣減 → 多件鎖匙扣單的類別欄各高 $20。

**影響**：即使 Audit Ledger 改用「類別小計」作可靠來源，多件鎖匙扣單仍會 cat_sum ≠ total_cost $20。
唯一 100% 可靠的單一數字是 `orders.total_cost`；類別小計需「顯示運費扣減行」才能對賬。

---

## 四、可靠口徑（修復時的依據）

| 欄位 | 可靠度 | 說明 |
|---|---|---|
| `orders.total_cost` | ✅ 100% | 唯一絕對可靠的成本真理（30/30 非零） |
| `orders.handmodel/keychain/necklace_cost` | 🟡 26/30 | 多件鎖匙扣單因問題 E 偏高 $20，需顯示運費扣減行 |
| `order_items.subtotal_cost / item_base_cost` | ✅ | per-SKU base（不×qty） |
| `order_items.handmodel/keychain/necklace_cost` | 🟡 | 舊單（0600100）誤分類 |
| `order_items` 四欄（drawing/printing/chain/shipping） | ❌ 9% | Task A 半成品，禁作成本真理 |

---

## 五、建議修復方案（未執行，待 Fat Mo 授權）

### 方案 1（推薦，僅顯示層）— 重構 Audit Ledger ② 區
- 改以「類別小計」為主結構：立體擺設→handmodel_cost；鎖匙扣→keychain_cost；吊飾→necklace_cost
- 每件顯示 `item_category + subtotal_cost`，**不再用四欄加總當成本**
- 四欄細項降級為「可選明細」：僅 `four_sum ≈ subtotal` 時展開，否則「（成本明細未逐項記錄，以類別小計為準）」
- 訂單層顯示運費扣減行（鎖匙扣 (n-1)×$20 / 吊飾 (n-1)×$35），對賬 cat_sum → total_cost
- `costMatch` 改用 `total_cost` 為基準
- 立體擺設加靜態註腳「繪圖$60 + 物料$150」（引 Pricing Bible §6.2）
- 範圍：僅 `buildAuditLedgerHtml()`，read-only，風險最低

### 方案 2（數據層，獨立大案）— 修 Task A 四欄
- 前端：立體擺設補 PrintingCost、移除 qty 不一致、移除 length 把關
- n8n：四欄寫入邏輯對齊 subtotal 口徑
- migration：回填 72 筆舊單四欄
- 問題 E：n8n 從 keychain_cost 扣運費 + migration 校正 4 單
- 範圍大，涉 n8n 改動 + 歷史數據遷移，需獨立 /cl-flow

---

## 六、未改動聲明
本次全程 read-only，未修改任何 HTML / n8n / Supabase 數據。所有數字來自 Supabase live 查詢。
