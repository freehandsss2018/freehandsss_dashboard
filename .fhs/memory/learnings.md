# FHS Learnings — Pattern / Pitfall / Preference
> 由 /commit 結尾手動 distill，每條上限 150 字元含日期來源。
> 全檔上限 50 條；超過時必須合併或退役，嚴禁變成第二份 decisions.md。
> 由 /read Phase 2.5 載入至工作記憶。

---

## Patterns（成功反覆驗證的做法）

- 「批評答案 + 更好版本」迭代模式有效：要求指出 3 個弱點逼出自我批評，比直接請求修改產出更精準的 v2 — 源自 2026-05-20
- 雙層成本架構：Supabase View（Layer 1 即時報價）+ n8n 靜態寫入（Layer 2 歷史快照），職責不重疊 — 源自 2026-05-16
- 四端同步隔離：Supabase 失敗不中斷 Airtable、Airtable 失敗不中斷 Supabase，用 try-catch 分隔鏈路 — 源自 2026-05-16
- Subagent 單一職責：database-reviewer=靜態 schema；finance-auditor=Live 動態驗證，兩者正交不互換 — 源自 2026-05-10
- 同步進度輪詢機制：在同步後切換訂單總覽，前端以 4s 輪詢 Supabase 核對金額與姓名（20s超時），配合進度 Banner 消除背景延遲時差，提供樂觀 UI 體驗 — 源自 2026-05-23

---

## Patterns（成功反覆驗證的做法）

- **data-spec 通過屬性隔離**：當 DOM 元素的顯示文字是「衍生標籤」（非原始資料）時，必須以 `data-spec="..."` 存放原始值供 save 讀取；直接讀 textContent 會把 UI label 寫入 DB。適用所有 renderX 函式中「從 item_key 推導顯示名稱」的場景 — 源自 2026-05-27
- **`_isAddon()` + `_addonType()` 通用多配件過濾架構**：以三層向後兼容過濾（key 後綴 match → name keyword → category fallback）替代單一 `_woolKey` 假設。未來新增第三個配件只需在 `_addonType()` 加一個 return 分支，Accordion 與 Table 渲染邏輯零改動 — 源自 2026-05-27

## Patterns（成功反覆驗證的做法）

- **3 subagent 並發審計模式**：database-reviewer + ui-designer + code-reviewer 同時跑，收到 3 份 verdict 後一次性修補所有 Critical，比序列審計快 2 倍且漏洞更少 — 源自 2026-05-28
- **Schema 文件拆 3 層（Core / UI Spec / Operations）**：Core 常駐記憶，UI 和 Ops 按需載入，大幅減少 AI 每次讀全文的 token 消耗 — 源自 2026-05-28

## Pitfalls（重複踩過的雷）

- **RPC return 遺漏前端所需欄位（P8）**：RPC 只返回 `{success, order_id}`，前端 `if (result.full_order_text !== undefined)` 永遠 false，UI 刷新靜默失敗。每次寫 RPC 必須對照前端 result 讀取的所有欄位清單，在 RETURN jsonb_build_object 中逐一確認 — 源自 2026-05-27

- **【高頻 ⚠️】n8n + sbSyncOrder 雙寫競態**：`responseMode: onReceived` 令前端在 n8n RPC 完成前就觸發 sbSyncOrder，DELETE+INSERT 與 RPC UPSERT 並發搶佔同一 item_key，INSERT 409 衝突後 `.catch()` 靜默吞掉，n8n 的 null 值勝出。架構解法：n8n RPC 為 SSoT，sbSyncOrder 只在 webhook 失敗/catch 時觸發 — 源自 2026-05-23
- **PostgreSQL ENUM 型別不符（42804）**：JSONB extract（`->>`）得到 text，不能隱式轉型為 `order_status` ENUM，整個 RPC 交易 rollback，COALESCE 無從保護。必須 explicit cast：`(v_json->>'field')::order_status` — 源自 2026-05-23
- **Webhook payload 缺漏（Late Enrichment）**：enrichment 放在 `if (response.ok)` 後才執行，webhook 發出時 items 缺 `_ui_process_status` / `_ui_batch_number`，n8n 收到空值落回預設。Payload 序列化是邊境管制，UI 狀態必須在 `fetch()` **前**注入 — 源自 2026-05-23
- **n8n 沙箱 process 未定義**：n8n 限制性 sandbox 中 `process` 完全未定義，直取 `process.env` 拋出 `ReferenceError` 崩潰。必須以 `typeof process !== 'undefined'` 進行條件保護 — 源自 2026-05-23
- **PostgREST 括號語法崩潰**：SKU 含有括號時（如 "木框套裝 (4肢)"），PostgREST `sku.like.FILTER*` 會因 URL 括號特殊字元解析出錯；過濾值必須用雙引號包裹 `sku.like."FILTER*"` 避免語法崩潰 — 源自 2026-05-23

- **樂觀鎖 TOCTOU 陷阱**：SELECT version + ON CONFLICT 兩步方案有競爭窗口，必須改 SELECT FOR UPDATE 才能真正消除並發覆蓋 — 源自 2026-05-28（code-reviewer 發現）
- **RPC GRANT 安全層級**：SECURITY DEFINER 函式若寫業務表（如 products），GRANT 應給 service_role 而非 anon；否則任何持 anon key 的人可觸發 — 源自 2026-05-28
- AI 在計畫未批核前擅自執行架構改動（2026-03-30 事故）→ /execute 是唯一授權信號，任何結果好壞都不能事後合理化
- n8n Code 節點 NAS 限制：fetch() 未定義、https 模組被禁用，會導致靜默失敗；必須使用 axios (require('axios')) 進行 HTTP 呼叫 — 源自 2026-05-22
- **Smart Cache COST_MAP 硬編碼表遺漏**：新 SKU 上線若未在 Smart Cache Strategist 節點新增成本條目，成本計算返回 0；此缺口在 /new-product v1.0.0 未被覆蓋，已補入 Step 2.e — 源自 2026-05-23
- Airtable formula 無法可靠處理 multipleLookupValues 陣列計算，核心財務欄位必須由 n8n 計算後直接寫入 — 源自 2026-05-03
- try-catch 靜默吞掉 TDZ 錯誤（Temporal Dead Zone），導致 Order_Items_List 空白，無錯誤提示 — 源自 memory
- 對標外部方法論（如 gstack）時，AI 本身也需要先走 Forcing Questions（「用戶真正缺什麼？」），否則容易產出「答對了錯誤題目」的過度工程 — 源自 2026-05-20
- 備註欄批次色陷阱：`batchCol = getBatchColor(o.Batch)` 若訂單層空、item 層有值則返回白色；需用 `o.Batch || items[0].Batch || ''`；CSS class `background:#fff` 蓋過 td batchCol，需 inline `background:#ffffff` + td `padding` 相框方案 — 源自 2026-05-20
- HTML table rowspan 排位陷阱：rowspan 欄若需在逐行渲染欄之後（如備註在進度右側），必須在 `index === 0` 條件內單獨追加 `<td rowspan>`，不能放入 orderLeftColsHtml；否則瀏覽器將後續行的逐行欄錯位填入 rowspan 欄之前 — 源自 2026-05-20
- 批次色全訂單 over-sweep 陷阱：用 `.order-group-${orderId} .batch-cell` sweep 會掃到同訂單所有 item，導致更新一行批次色時全部同步；必須用 `#row-${orderId}-item-${itemIndex}` 定位單行，備註 td 則只在 itemIndex===0 時同步 — 源自 2026-05-20
- **【高頻 ⚠️】Chrome Date Parsing 異常與表格排序還原失效**：`new Date("DD/MM/YYYY")` 在 Chrome 等瀏覽器中會解析為 `Invalid Date` (NaN)，導致以該格式進行的日期排序失效。且在頁面載入時還原 filters 雖成功設定選單，但渲染卻繞過 `applyReviewFilters()` 而直接 `renderReviewTable()` 導致表格未排序。解法：在排序前以正則/切割手動解析 `DD/MM/YYYY`，且在 fetch callback 尾端強制呼叫 `applyReviewFilters()` 進行二次過濾與排序。 — 源自 2026-05-25
- **【高頻 ⚠️】AI 違反 Rule 3.14 未將實施計畫寫入專案實體路徑**：AI 未遵循 `/ag-plan` 指令將實施計畫寫入專案的 `a2_implementation_plan.md`，且未使用繁體中文。必須牢記：所有正式報告與計畫一律實體落盤至專案相對應目錄，且對話與生成內容須遵守繁體中文原則。 — 源自 2026-05-25

- **【P9】IIFE 閉包函式 onclick 靜默失效**：函式定義在 IIFE `(function(){'use strict';})()` 內，`onclick="fn()"` 全域找不到函式，完全靜默無錯誤。修復：在 IIFE 末尾明確 `window.fn = fn` 暴露。所有新增 onclick 函式必查此項 — 源自 2026-05-27
- **CSS toggle-only 顯示陷阱**：以 CSS class toggle 控制 display，若內容在 Map 空時已烘入 `—`，切換後只顯示舊快照。必須在 toggle ON 時重新 render（呼叫 applyReviewFilters），而非純 CSS 切換 — 源自 2026-05-27
- **SELECT / PATCH 帶未套用欄位 → PostgREST 400 整個 fetch 炸掉**：新欄位加入 SELECT 或 PATCH body 前，必須先確認 migration 已套用；否則整個訂單總覽失連。順序：migration 套用 → 加 SELECT → 加 PATCH。 — 源自 2026-05-26
- **文字分割用位置邏輯比 keyword search 更可靠**：`indexOf('吊飾產品')` 在舊版模板訂單上找不到關鍵字，返回空字串後 `||` fallback 暴露全文。正確做法：`parts[0]` = A、`parts.slice(1)` = B，位置不依賴模板版本 — 源自 2026-05-26
- **globalOrders cache 欄位名稱陷阱**：Supabase fetch 把 snake_case 映射為 `o.Customer`（非 `o.Customer_Name`）。更新 cache 若只寫 `o.Customer_Name`，Review 表渲染的 `o.Customer` 永遠不更新。寫 cache 時必須同步確認欄位映射關係。 — 源自 2026-05-27
- **單一配件 filter 假設靜默失效**：`_woolKey` 只過濾一種配件，新增第二個配件後 Badge 注入對第二個配件靜默遺失。n8n `getItemCategory()` 亦只含羊毛氈條件，同樣靜默遺漏。每次新增配件前必查：①前端 filter 函式是否支援多配件、②n8n category 函式是否覆蓋新 SKU — 源自 2026-05-27
- **item_base_cost ≠ subtotal_cost × quantity（Mirror Prep 陷阱）**：descriptions_comments.sql 稱 `subtotal_cost = item_base_cost × quantity`，但 Mirror Prep 實際寫入 `item_base_cost = subtotal_cost = Total_Base_Cost`（兩欄相等，不乘 quantity）。批量重算 SQL 必須以 Mirror Prep 代碼為準，而非欄位說明文字 — 源自 2026-05-28
- **【高頻 ⚠️】Migration 部分執行靜默失敗**：`CREATE TABLE IF NOT EXISTS` 在表已存在時靜默跳過，同一 migration 後續 PART（ALTER TABLE / INSERT / RPC）不會執行，整體功能靜默失效無報錯。預防：新 migration 若含多 PART，各 PART 必須有獨立 smoke-test 查詢確認執行；不能只靠「沒報錯」判斷成功 — 源自 2026-05-29

---

## Preferences（Fat Mo 已確認的偏好）

- 當 action items 超過 5 個時，問「其中哪一個才是真正的釘子？」往往收斂到 1 個 — 源自 2026-05-20
- 最小改動優先：能補一個釘子就不重做廚房，v2 優先於 v9 — 源自多次 cl-flow 對話
- 收斂指令體系：零新指令、零新 subagent，除非現有工具無法完成任務 — 源自 2026-04-28
- 橋接版禁止含邏輯：.claude/commands/ 與 .agents/workflows/ 只做指向，邏輯只在 Master (.fhs/ai/commands/) — 源自 2026-05-19
- 表單新增 input 前必評估 captureFormState + n8n payload 影響：新欄位若進入 captureFormState，會改變 webhook payload 結構，可能破壞 n8n 解析。先確認範圍再動手，不確定就 defer — 源自 2026-05-29
