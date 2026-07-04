# Lesson — Audit Ledger 四欄成本不可靠（Task A 半成品）

**日期**：2026-06-13（Session 102 後續診斷）
**類型**：Pitfall
**觸發**：Fat Mo 報訂單 06001007 木框成本顯示 $60（應 $210）

## 雷點
Session 102 Audit Ledger `buildAuditLedgerHtml()` 用 `order_items` 四欄
（drawing/printing/chain/shipping）加總當每件成本。**實測 79 item 中 72（91%）四欄全空**，
68% 四欄 ≠ subtotal。四欄是前端 line 7188-7193 標 `// Task A` 的未完成功能：
- 被 `fhsCurrentPricingItems.length === orderItemsArray.length` 把關，只有當下報價的新單才寫，舊單/edit 重同步跳過
- 立體擺設的 `pItem.PrintingCost` 從未設值 → 印刷 $150 進不了四欄
- 鎖匙扣 qty>1 四欄被 ×qty，與 subtotal（不×qty，pitfall 19）衝突

## 資料源可靠度（live 實測 30 orders / 79 items，2026-06-13 規劃補錄）
| 來源 | 覆蓋 | 裁決 |
|---|---|---|
| `orders.total_cost` | 30/30 | ✅ 唯一成本真理 |
| `orders` 訂單層類別欄(handmodel/keychain/necklace) | **30/30** | ✅ 可靠成本結構 |
| `order_items.subtotal_cost`/item_base_cost/item級類別 | 57/79 全有或全無 | 🟡 稀疏，僅選配 |
| `order_items` 四欄(drawing/printing/chain/shipping) | 7/79 | ❌ 禁用 |

⚠️ **二次踩雷警告**：item 層 `subtotal_cost` 與四欄一樣稀疏（多單整單=$0，如 0600723
item 全 $0 但訂單層 keychain $1000）。設計成本顯示時**禁止讀任何 item 層成本欄當主結構**，
必須用訂單層類別欄。規劃時我差點用 subtotal_cost 重蹈覆轍，被 live 查詢當場推翻。

## 預防檢查清單
1. **顯示成本永遠以 `orders.total_cost` 為唯一可靠真理**；訂單層類別欄
   （orders.handmodel/keychain/necklace_cost，30/30 populated）為可靠結構；
   **所有 item 層成本欄（含 subtotal_cost）+ 四欄禁作主來源**
2. 多件鎖匙扣/吊飾單：類別小計比 total_cost 高 (n-1)×$20 或 ×$35
   （**問題 E**：運費扣減套進 total_cost 但未從類別欄扣）→ 需顯示運費扣減行才對賬
3. 任何讀 order_items 四欄的新功能，先驗 `four_sum ≈ subtotal` 才可信
4. Pricing Bible §6.1/§6.2「Task A 三層顆粒化」未落實 = 四欄技術債未清

## 相關
- 診斷報告：`.fhs/reports/diagnostics/2026-06-13_audit_ledger_cost_display.md`
- Finance Bible §四 驗證1（類別相加=total_cost，受問題 E 影響）
