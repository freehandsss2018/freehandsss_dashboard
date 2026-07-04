# Lessons — 2026-05-03 Order Integrity Audit & Dashboard Fixes

## 1. Airtable MCP create_field 不支援 formula / rollup 欄位

`create_field` API 回傳 `UNSUPPORTED_FIELD_TYPE_FOR_CREATE`，formula 和 rollup 欄位只能在 Airtable UI 手動建立。
**應對**：先建 formula/rollup 需求，告知用戶在 UI 操作，不要嘗試用 API 建立。

## 2. Raw_Form_State 只記錄最後一次提交快照

`captureFormState()` 每次執行都完整覆蓋，多次提交（如先 P 後 K）只保留最後一次的狀態。導致 RFS 與 Full_Order_Text 內容不一致（0601100 案例）。
**應對**：診斷訂單缺漏問題時，優先讀 Full_Order_Text（記錄累積），RFS 只做參考。

## 3. enableK=false 但子項目已勾選 → payload 漏傳 K items

`buildOrderItemsForPricing()` 以 section toggle 為 gate，若操作員先開後關 toggle 但子項目仍保留 checked 狀態，K/M items 不進 payload。
**修正**：改為「section toggle OR 子項 section 任一為 true」即納入。

## 4. Item_BaseCost 是動態 lookup，Total_Cost 是靜態快照

Product_Database 成本更新後，Order_Items.Item_BaseCost 自動變化，但 Main_Orders.Total_Cost 是 n8n 寫入的靜態值不更新。長期會產生漂移（0600800 的 $48 差異）。
**應對**：定期做 Total_Cost vs Order_Items sum 的 reconciliation 掃描。

## 5. 訂單 SKU 錯誤源頭識別

`嬰兒(P)` 前綴表示「照片建模系統用 SKU（單購模式）」，無 P 前綴為標準加購 SKU。  
若訂單誤判為 P 圖系統，Item_BaseCost 會用錯 SKU（$340 vs $290）。
查 Product_Name 有無 `(P)` 即可快速診斷。
