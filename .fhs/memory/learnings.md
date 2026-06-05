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

- [Pitfall 2026-06-05] 收斂律比對不同源成本系統必觸假警報：n8n 四分量合計 vs products.total_base_cost 在有 W1 免畫圖的混合訂單中必然偏差>$1，不可推入 zeroCostItems，應改推 n8nAdjustmentNotes。

- [Pitfall 2026-06-01] Obsidian Windows 不追蹤 NTFS junction：mklink /J 建立的 junction 在 PowerShell 可見，但 Obsidian 索引/Graph/FileExplorer 完全看不到。實證確認。
- [Pitfall 2026-06-01] Obsidian dot-directory 硬限制：.fhs/ 等 dot-dir 對 Obsidian 結構性不可見（Graph + FileExplorer），userIgnoreFilters 只影響 QuickSwitcher，Graph 需用 Graph View 自身 filter 設定。
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
- **【高頻 ⚠️】AI 誤將驗證報告儲存於 root/artifacts/ 而非 .fhs/reports/**：因受 IDE 目前開啟檔案在 `artifacts/` 的導引以及系統內建「artifacts 專用目錄」提示的影響，忽視了 Rule 3.14 關於正式報告與計畫必須存於 `.fhs/reports/` 或 `.fhs/notes/` 的限制。未來不論 IDE 開啟何處的檔案，均須以 `AGENTS.md` 憲法之目錄存放限制為第一優先。 — 源自 2026-06-03
- **【嚴重過失 ⚠️ Rule 3.16 觸發】財務規則摘要 ≠ 完整語義，入口必為 finance-gatekeeper**：AI 在 B2 設計階段僅讀 AGENTS.md 摘要，未走 finance-gatekeeper 路由，錯將「確收收款（final_sale_price）不可被 n8n 覆蓋」延伸至「前端估算成本亦為真理」，導致 B2 方向錯誤。修正後 Rule 3.16：先讀 `.fhs/ai/skills/finance-gatekeeper/SKILL.md`，再按任務路由讀對應文件（L1/L2a/L2b）。禁依賴 AGENTS.md 摘要直接推斷財務語義。 — 源自 2026-06-03 Rule 3.16（2026-06-03 v1.4.11 路由升級）
- **【嚴重過失 ⚠️】未走路由層即作財務設計判斷（feedback_investigate_before_asking 財務升級版）**：「嚴禁直接問可自查/自析的事」已有記錄，但 AI 仍在未讀 Finance Bible 下建議「n8n 信任前端四分量」方向。財務討論第一步 = 讀 finance-gatekeeper/SKILL.md 取路由（Rule 3.16 v1.4.11），違者同等嚴重過失。 — 源自 2026-06-03（2026-06-03 v1.4.11 更新）
- **【嚴重過失 ⚠️】工具限制不得成為繞開 Supabase-First 的理由（靜默降級禁止）**：發現執行工具（AG/subagent）缺少 Supabase 存取能力時，正確行動 = 報告 blocker + 詢問解法，而非靜默降級至 Airtable。根因：設計 prompt 時以「工具能做什麼」為起點，而非「架構要求什麼」，導致主動繞過 Supabase-First 原則。Airtable 僅用於：歷史記錄補救 / 冷備援 / Supabase 不可達時的緊急回退。任何 live 資料查詢設計必須以 Supabase 為起點 — 源自 2026-06-04 事故


- **【P9】IIFE 閉包函式 onclick 靜默失效**：函式定義在 IIFE `(function(){'use strict';})()` 內，`onclick="fn()"` 全域找不到函式，完全靜默無錯誤。修復：在 IIFE 末尾明確 `window.fn = fn` 暴露。所有新增 onclick 函式必查此項 — 源自 2026-05-27
- **CSS toggle-only 顯示陷阱**：以 CSS class toggle 控制 display，若內容在 Map 空時已烘入 `—`，切換後只顯示舊快照。必須在 toggle ON 時重新 render（呼叫 applyReviewFilters），而非純 CSS 切換 — 源自 2026-05-27
- **SELECT / PATCH 帶未套用欄位 → PostgREST 400 整個 fetch 炸掉**：新欄位加入 SELECT 或 PATCH body 前，必須先確認 migration 已套用；否則整個訂單總覽失連。順序：migration 套用 → 加 SELECT → 加 PATCH。 — 源自 2026-05-26
- **文字分割用位置邏輯比 keyword search 更可靠**：`indexOf('吊飾產品')` 在舊版模板訂單上找不到關鍵字，返回空字串後 `||` fallback 暴露全文。正確做法：`parts[0]` = A、`parts.slice(1)` = B，位置不依賴模板版本 — 源自 2026-05-26
- **globalOrders cache 欄位名稱陷阱**：Supabase fetch 把 snake_case 映射為 `o.Customer`（非 `o.Customer_Name`）。更新 cache 若只寫 `o.Customer_Name`，Review 表渲染的 `o.Customer` 永遠不更新。寫 cache 時必須同步確認欄位映射關係。 — 源自 2026-05-27
- **單一配件 filter 假設靜默失效**：`_woolKey` 只過濾一種配件，新增第二個配件後 Badge 注入對第二個配件靜默遺失。n8n `getItemCategory()` 亦只含羊毛氈條件，同樣靜默遺漏。每次新增配件前必查：①前端 filter 函式是否支援多配件、②n8n category 函式是否覆蓋新 SKU — 源自 2026-05-27
- **item_base_cost ≠ subtotal_cost × quantity（Mirror Prep 陷阱）**：descriptions_comments.sql 稱 `subtotal_cost = item_base_cost × quantity`，但 Mirror Prep 實際寫入 `item_base_cost = subtotal_cost = Total_Base_Cost`（兩欄相等，不乘 quantity）。批量重算 SQL 必須以 Mirror Prep 代碼為準，而非欄位說明文字 — 源自 2026-05-28
- **【高頻 ⚠️】Migration 部分執行靜默失敗**：`CREATE TABLE IF NOT EXISTS` 在表已存在時靜默跳過，同一 migration 後續 PART（ALTER TABLE / INSERT / RPC）不會執行，整體功能靜默失效無報錯。預防：新 migration 若含多 PART，各 PART 必須有獨立 smoke-test 查詢確認執行；不能只靠「沒報錯」判斷成功 — 源自 2026-05-29
- **【P10】付款拆格 boxKey 改動須同步更新所有相關函式**：`renderPaymentSplits` 改 boxKey 格式（如改為 necklace_N）後，`_syncBalanceFromDeposit` / `serializeSplits` / `restoreSplits` 均用舊 boxKey 匹配，balance 靜默不更新無錯誤提示。凡改 boxKey 格式，必查三個函式 — 源自 2026-05-31
- **【財務核心 ⚠️】運費扣減公式必用件數而非行數**：Finance Bible 舊公式 `(order_items行數-1)×$20` 是 BUG。正確：`(總件數-1)×單件運費`，總件數=SUM(quantity across all same-category order_items)。例：左手×1+右手×2=3件，扣減=(3-1)×$20=$40，非$20。吊飾同理用$35 — Fat Mo 確認 2026-06-02
- **【財務核心 ⚠️】同部位首件含畫圖費，第2件起免畫圖（位置依賴成本）**：鎖匙扣與吊飾均適用。同部位第1件=全成本，第2件起=免畫圖。跨產品規則：部位已有任何產品，後加同部位其他類型亦免畫圖。此規則之前從未記錄，是 AI 反覆算錯根本原因 — Fat Mo 確認 2026-06-02
- **【財務核心 ⚠️】吊飾 Clasp=頸鏈非扣夾，1鏈最多2飾（奇偶規則）**：吊飾成本=畫圖+打印+頸鏈+運費，無環扣。Airtable Clasp欄對吊飾=頸鏈，現行$100（舊$70已過時）。奇數件加$100頸鏈，偶數件免頸鏈（共用同鏈） — Fat Mo 確認 2026-06-02
- **【財務核心 ⚠️】財務規則必須即時落盤，不可只靠口頭說明**：Fat Mo 多次口頭解釋的規則因未寫進文件，每 session AI 重新算錯。任何財務規則一經確認：①寫入 Finance Bible ②寫入 learnings.md ③寫入持久記憶。財務算錯=嚴重核心錯誤 — 2026-06-02
- **【Pattern】`_fhsCostReady` flag 競態防護**：前端從 Supabase 非同步載入 config 後才設 true；`calculatePricing` 入口 guard 若 false 則拒絕計算並提示。任何 page-load 讀 Supabase 再用於計算的場景均須此模式，防止空值算出 0 — 源自 2026-06-02 P1 W5 Live 驗證
- **【Pattern】`chargedPositions Set` 跨陣列位置追蹤**：在 metal/silver/family 外層建 Set，PartDesc `.trim().toLowerCase()` 正規化後追蹤已計畫圖費的部位；同部位跨產品第 2 件 baseDrawing=0。新增產品類型時必查此 Set 是否需要擴充 — 源自 2026-06-02 P1 W1 Live 驗證

- **【成本架構 ✅ 2026-06-03】`material_cost_*` = 打印/鑄造費（非原材料進價）**：4 個 key 按材質訂立：necklace_silver=260、necklace_gold=316、keychain_stainless_baby=95（現 keychain_stainless）、keychain_alloy_baby=122（現 keychain_alloy）。語義命名問題（"material"≠"printing"）已確認存在，deferred 至 PRM v2 P2 命名規範設計一并處理，本階段不改 key 名稱。
- **【成本架構 ✅ 2026-06-03】鎖匙扣打印費依嬰兒/家庭分層**：嬰兒：不鏽鋼=$95，鋁合金=$122；家庭(S/P)：兩種材質均=$135（Airtable Base_Costs 實測）。引擎須按訂單對象選用對應值，不可用嬰兒值套家庭訂單（低估$40）。吊飾打印費跨所有對象一致（銀=$260，金=$316）。
- **【Pattern ✅ 2026-06-03】Phase 0 payload 流向前置查證**：前端改動影響財務計算前，先查 n8n Code Node 是否實際讀取該欄位（get_node MCP），再決定隔離策略。B1 實證：System_Total_Cost 在 payload 但 n8n 完全不讀（讀 per-item Total_Base_Cost），使 B1 從「需隔離旗標」降為「純顯示層」。省去複雜防護設計 — 源自 2026-06-03 B1 Phase 0

---

## Preferences（Fat Mo 已確認的偏好）

- **完成訂單唯一出口為 Modal 審閱**：桌面/手機均不設直接 syncToAirtable 按鈕，操作者必須進入「查閱訂單訊息」Modal 審閱後才能同步。Modal 入口按鈕永遠可點（不因單號狀態禁用），同步驗證由 syncToAirtable 內部處理 — 源自 2026-05-31 T5
- 當 action items 超過 5 個時，問「其中哪一個才是真正的釘子？」往往收斂到 1 個 — 源自 2026-05-20
- 最小改動優先：能補一個釘子就不重做廚房，v2 優先於 v9 — 源自多次 cl-flow 對話
- 收斂指令體系：零新指令、零新 subagent，除非現有工具無法完成任務 — 源自 2026-04-28
- 橋接版禁止含邏輯：.claude/commands/ 與 .agents/workflows/ 只做指向，邏輯只在 Master (.fhs/ai/commands/) — 源自 2026-05-19
- 表單新增 input 前必評估 captureFormState + n8n payload 影響：新欄位若進入 captureFormState，會改變 webhook payload 結構，可能破壞 n8n 解析。先確認範圍再動手，不確定就 defer — 源自 2026-05-29
- 批評必須在有輸出後才發生：/rp 初步精煉無參照物，強制批評是表演（有激勵問題）；verdict_critique / plan_critique 在最終輸出後批評才有真實缺陷可指 — 源自 2026-05-30
- 反奉承守則應內建於指令設計：用戶每次輸入「不奉承」「專業」是設計缺口，守則寫入 Master 後永遠生效，用戶無需重複輸入 — 源自 2026-05-30
- **cl-flow A2 模型策略**：Fat Mo 決定統一使用 `gemini-3.5-flash`，不做 `--pro` 雙模切換。模型切換一律透過 `.env GEMINI_A2_MODEL_DEFAULT`，不改代碼 — 源自 2026-05-30
- **外部 API endpoint 必先 probe 再推薦**：AI 知識截止日後的 API model ID 可能已過時或不存在（如 `gemini-2.5-pro-preview-05-06` 不存在）。推薦前必須 `curl` 或 `node` probe 確認端點，不可憑訓練資料直接使用 — 源自 2026-05-30
- **管道指令命名 = 最終裁決者**：精煉內建為 Step 0（不另建包裝指令），指令名反映裁決者（cl-flow=Claude / ag-flow=AG / rp=只精煉不裁決）；包裝糖衣增加記憶負擔，地基吸收功能後糖衣應刪除 — 源自 2026-05-30
- **「AI 忘記規則」= Skill 前置載入，非 Subagent**：「忘記財務/業務規則」是 context 沒帶規則進來的問題，解法是 Skill（task 開始前 load）；Subagent 是 spawn 出去做事，無法解決 AI 在呼叫前已不知道規則的問題 — 源自 2026-06-01
- **vendor 技能正確包裝層是 subagent 非 slash command**：方法論應 AI 自動執行，slash command 是用戶觸發設計；若用戶要知道何時用才需要 AI 幫助 — 源自 2026-05-30
- **方法論嵌入 subagent 用 3-line trigger（不 inline 全量）**：brief summary（3 行）+ 指向 vendor 技能路徑；Core 常駐記憶，全量按需載入；避免 token 恆定成本（inline 30 行 × 每次召喚 ≈ +600 tokens）— 源自 2026-05-30

---

## Patterns（成功反覆驗證的做法）

- **【Pattern ✅ 2026-06-05 Session 63】kgov 知識治理框架設計模式**：治理文件（路由總機/規則索引）必須有**同步觸發機制**（AGENTS 規則層 + execute [F] 稽核項），不能靠 AI 自律維護。最小改動原則：+1 文件填真空，改既有不膨脹，規則用 harness 鎖不靠告示。Pattern 驗證：Session 63 P0–P4 完整執行，盲測 3 問全綠（≤2跳）。

---

## Pitfalls（重複踩過的雷）

- **【Pitfall ✅ 2026-06-05 Session 63】路由總機被動維護 = 每次系統演進後路由腐爛**：FHS_Prompts.md 只在 commands/ 增刪時觸發更新，AGENTS Rule 新增 / L2 文件新增 / 語義修正不觸發 → 累積 3–5 個 session 後路由過時，AI 走錯路。修復：AGENTS 文件同步律擴充 4 觸發 + execute.md [F] 強制稽核，每次 /execute 自動問「路由總機要不要更新？」。
