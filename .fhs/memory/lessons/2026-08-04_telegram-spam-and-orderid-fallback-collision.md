# Lesson — 壓測 Telegram 逐單騷擾整治，順藤摸出 Order_ID 缺失 fallback 撞單 bug + PATCH 中文值靜默 0-rows

**日期**：2026-08-04
**類型**：Pitfall（含一次即場自我修正記錄）
**來源**：Fat Mo 反映 `FHS_System_StressTester.py` 壓測一次連環發 9+ 則 Telegram 通知過分騷擾，要求整治

## 現象

`FHS_Core_OrderProcessor`（n8n，同時處理真實客戶訂單與壓測腳本）每次 create/delete 都各發一則 Telegram，壓測腳本一次跑 5 個測試案例（各 create+delete）連環觸發 9+ 則通知。整治後 Fat Mo 截圖回報：多咗一個「👤 未命名 | #未命名」嘅幽靈新訂單通知，且訂單總覽從未清理過。

## 根因（兩層，逐層排查）

1. **Telegram 逐單騷擾**：`Notify Telegram (Create/Edit)`（經 `Pack Telegram Data` 節點）與 `Notify Telegram (Delete)`（直接掛喺 `Switch Action` 嘅 delete 分支）對每張訂單都各發一則，無視係咪測試單。

2. **「未命名」幽靈訂單**（整治過程中意外揭發嘅獨立 bug）：`Parse Items & Generate SKU` 節點對缺 `Order_ID` 嘅請求用固定字面值 `orderId = body.Order_ID || "未命名"` 做 crash-defense 退路，但下游 `sync_order_to_mirror` RPC 以 `order_id` 做 UPSERT 仲裁鍵——任何兩次缺 ID 請求都會撞落**同一筆**殘留訂單。查證：直接查 Supabase 發現 `order_id='未命名'` 嘅 row `created_at` 係 2026-08-02（兩日前），非今日新建；壓測腳本 TC-05（"Missing Main Info"，刻意唔帶 Order_ID）每次跑都 upsert 落呢筆共用 row，令佢「復活」（`deleted_at` 被清空）並重新觸發通知。

## 修復

**n8n（`FHS_Core_OrderProcessor`）**：
- `Pack Telegram Data`（create/edit 分支）加 guard：`Order_ID` 符合 `/^test\d+$/i` → `return []`，唔發個別通知。
- 新增 Filter 節點「Filter Test Delete Notify」，插喺 `Switch Action` delete 分支同 `Notify Telegram (Delete)` 之間（`Mirror Delete to Supabase` 呢條**平行**邊完全唔經過 Filter，真實刪除路徑不受影響——呢個係設計上最關鍵嘅一點，混埋落串聯會打爛真實訂單刪除）。
- 新增 `Switch Action` rule：`action === 'test_summary'` → 新節點「Send Test Summary」，繞過成個訂單處理鏈直接發 `Full_Message`。
- `Parse Items & Generate SKU`：`"未命名"` 改為 `"未命名_" + Date.now()`，每次缺 ID 請求都獨立，唔再共用撞單。

**Python（`FHS_System_StressTester.py`）**：
- 新增 `send_test_summary()`，所有案例跑完後一次性 POST `action:"test_summary"`，取代逐單通知。
- TC-05 補返 `Order_ID: "test1005"`（保留原意——仍然唔帶 Customer_Name/Deposit 等主資料測 failsafe），令佢同其他案例一樣自動靜音＋自動清理。

**清理**：手動用正式刪除 webhook 刪咗一次「未命名」殘留單，發現 **HTTP 200 但實際 0 rows 命中**（`Mirror Delete to Supabase` 對中文 `order_id` 嘅 PATCH `?order_id=eq.<encodeURIComponent值>` 冇匹配到），改用 `execute_sql` 直接 UPDATE 先成功清走。根因未查清（疑似 URL 編碼後嘅中文值同 PostgREST filter 比對唔上），但同 [[2026-07-12_rls-policy-removal-silent-2xx-write-failure]] 屬同型「勿信狀態碼」陷阱——第二宗同類個案，已 cross-reference 落 `learnings/supabase.md`。

## 過程中嘅自我修正（值得記低嘅操作紀律教訓）

用 `update_node_code` 改 `Parse Items & Generate SKU` 節點時，因為要喺 chat 入面完整重打一次成個 ~95 行嘅 jsCode（工具要求傳入完整新內容非 diff），第三次重打**手快漏咗兩個物件屬性**（else 分支嘅 `Necklace_Deduction: 0, Drawing_Cost: 0,`）。即場用 `get_node` 拉返 live 版本、寫 python script 逐字 diff 原始版本 vs 部署版本先發現（唔係靠肉眼再讀一次），確認淨係漏咗嗰兩個 key 之後即刻補一次 apply 修正，再用同一個 diff 手法驗證最終結果**只有一行**改動（`未命名` → `未命名_" + Date.now()`），冇夾雜任何非預期差異。

## Pattern：改動需要「整段重貼」嘅工具介面時，必須程式化 diff 驗證，唔可以肉眼核對

任何工具介面若要求傳入**完整內容**取代目標檔（而非精準 diff/patch），人手重打長內容天生有手誤風險，尤其中英文夾雜、多層縮排嘅 code block。驗收唔可以「睇落啱就算」，必須：
1. 改動前保存原始內容到暫存檔。
2. 改動後用 `difflib`（或等效工具）程式化 diff 原始 vs 部署後版本。
3. 確認 diff 只包含**預期嘅那一行/那幾行**，冇任何非預期差異先算完成。

呢個紀律同既有「巨檔替換三步（grep -c=1 → 替換 → count 驗證）」同源，但適用範圍更廣：任何「要求完整重貼」嘅介面（n8n Code node 工具、部分 API 嘅 update 端點）都應該套用，非只限巨檔案編輯。

## 應用

- 任何「缺必要欄位時 fallback 到固定字面值」嘅防禦寫法，若該欄位同時係下游 UPSERT/唯一鍵，必須用**每次獨立**嘅 fallback（見 `learnings/n8n.md` #6）。
- 任何靠 PATCH/DELETE 嘅 `?col=eq.<動態值>` 刪除/更新非純 ASCII 識別碼後，必須直接查 DB 確認實際受影響列數（見 `learnings/supabase.md` #13）。
- 任何要求「完整內容取代」嘅節點/檔案編輯工具，改動後一律程式化 diff 驗證，唔可以肉眼核對長內容。

## 未解事項（未過 stage-3，非猜測，如實記錄）

驗證期間發現：今日（2026-08-04）測試 create webhook 呼叫（包括第一輪 TC-01「正常訂單」）都冇喺 Supabase `orders` 表留低新 row，即使 execution log 顯示 success、Telegram 通知正常發出。最近一筆真實訂單係 2026-08-02。單憑測試數據判斷唔到係「今日冇真實客人落單」定係「真實訂單 sync 都受影響」，已提醒 Fat Mo 自行核實，未在本次任務範圍內深挖。

## 關聯

- `n8n/FHS_Core_OrderProcessor`（live workflow，versionId 由 `632bbe57...` → `08151a96...`，經多次 dry-run/diff 驗證後應用）
- `Maintenance_Tools/FHS_System_StressTester.py`
- `.fhs/memory/learnings/n8n.md` #6、`.fhs/memory/learnings/supabase.md` #12
- [[2026-07-12_rls-policy-removal-silent-2xx-write-failure]]（同型「勿信狀態碼」教訓）
