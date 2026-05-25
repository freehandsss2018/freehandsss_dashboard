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

## Pitfalls（重複踩過的雷）

- **【高頻 ⚠️】n8n + sbSyncOrder 雙寫競態**：`responseMode: onReceived` 令前端在 n8n RPC 完成前就觸發 sbSyncOrder，DELETE+INSERT 與 RPC UPSERT 並發搶佔同一 item_key，INSERT 409 衝突後 `.catch()` 靜默吞掉，n8n 的 null 值勝出。架構解法：n8n RPC 為 SSoT，sbSyncOrder 只在 webhook 失敗/catch 時觸發 — 源自 2026-05-23
- **PostgreSQL ENUM 型別不符（42804）**：JSONB extract（`->>`）得到 text，不能隱式轉型為 `order_status` ENUM，整個 RPC 交易 rollback，COALESCE 無從保護。必須 explicit cast：`(v_json->>'field')::order_status` — 源自 2026-05-23
- **Webhook payload 缺漏（Late Enrichment）**：enrichment 放在 `if (response.ok)` 後才執行，webhook 發出時 items 缺 `_ui_process_status` / `_ui_batch_number`，n8n 收到空值落回預設。Payload 序列化是邊境管制，UI 狀態必須在 `fetch()` **前**注入 — 源自 2026-05-23
- **n8n 沙箱 process 未定義**：n8n 限制性 sandbox 中 `process` 完全未定義，直取 `process.env` 拋出 `ReferenceError` 崩潰。必須以 `typeof process !== 'undefined'` 進行條件保護 — 源自 2026-05-23
- **PostgREST 括號語法崩潰**：SKU 含有括號時（如 "木框套裝 (4肢)"），PostgREST `sku.like.FILTER*` 會因 URL 括號特殊字元解析出錯；過濾值必須用雙引號包裹 `sku.like."FILTER*"` 避免語法崩潰 — 源自 2026-05-23

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

---

## Preferences（Fat Mo 已確認的偏好）

- 當 action items 超過 5 個時，問「其中哪一個才是真正的釘子？」往往收斂到 1 個 — 源自 2026-05-20
- 最小改動優先：能補一個釘子就不重做廚房，v2 優先於 v9 — 源自多次 cl-flow 對話
- 收斂指令體系：零新指令、零新 subagent，除非現有工具無法完成任務 — 源自 2026-04-28
- 橋接版禁止含邏輯：.claude/commands/ 與 .agents/workflows/ 只做指向，邏輯只在 Master (.fhs/ai/commands/) — 源自 2026-05-19
