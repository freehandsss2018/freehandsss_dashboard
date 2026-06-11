# FHS Learnings — Pattern / Pitfall / Preference

> 由 /commit 結尾手動 distill，每條上限 150 字元含日期來源。
> 全檔上限 50 條；超過時必須合併或退役，嚴禁變成第二份 decisions.md。
> 由 /read Phase 2.5 載入至工作記憶。
> 上次整理：2026-06-11（TD2 整合，74→50 條，退役 24 條）

---

## Patterns（成功反覆驗證的做法）

1. 雙層成本架構：Supabase View（Layer 1 即時報價）+ n8n 靜態寫入（Layer 2 歷史快照），職責不重疊 — 源自 2026-05-16
2. 四端同步隔離：Supabase 失敗不中斷 Airtable、Airtable 失敗不中斷 Supabase，用 try-catch 分隔鏈路 — 源自 2026-05-16
3. Subagent 單一職責：database-reviewer=靜態 schema；finance-auditor=Live 動態驗證，兩者正交不互換 — 源自 2026-05-10
4. 同步進度輪詢機制：同步後切換訂單總覽，前端以 4s 輪詢 Supabase（20s 超時），進度 Banner 提供樂觀 UI — 源自 2026-05-23
5. **data-spec 通過屬性隔離**：DOM 顯示文字為衍生標籤時，必以 `data-spec="..."` 存原始值供 save 讀取；直接讀 textContent 會把 UI label 寫入 DB — 源自 2026-05-27
6. **`_isAddon()` + `_addonType()` 多配件過濾架構**：三層向後兼容（key 後綴 match → name keyword → category fallback）；新配件只需在 `_addonType()` 加一個 return 分支 — 源自 2026-05-27
7. **3 subagent 並發審計 + Schema 文件拆 3 層**：並發比序列快 2 倍；文件拆 Core/UI/Ops 按需載入，減少 token 恆定消耗 — 源自 2026-05-28
8. **`_fhsCostReady` flag 競態防護**：page-load 讀 Supabase 後才設 true；calculatePricing 入口 guard 若 false 拒絕計算，防空值算出 0 — 源自 2026-06-02
9. **`chargedPositions Set` 跨陣列追蹤**：PartDesc trim+toLowerCase 正規化，同部位跨產品第 2 件 baseDrawing=0；新產品類型必查是否需擴充 Set — 源自 2026-06-02
10. **Phase 0 payload 流向前置查證**：前端改動影響財務計算前，先 get_node 確認 n8n 是否實際讀取該欄位，再決定隔離策略 — 源自 2026-06-03
11. **事件派發副鏈 + setTimeout(0) 最終同步**：dispatchEvent 同步觸發副鏈（如 _syncBalanceFromDeposit）可覆蓋即將設定的按鈕狀態；setTimeout(0) 最終 pass 在所有副鏈完成後執行 — 源自 2026-06-10
12. **kgov 知識治理框架設計模式**：治理文件須有同步觸發機制（AGENTS 規則層 + /execute [F] 稽核），不能靠 AI 自律；最小改動原則：+1 文件填真空，改既有不膨脹 — Session 63
13. **Supabase MCP 掉線用 Management API 繞過**：`POST api.supabase.com/v1/projects/{ref}/database/query` + `Bearer PAT` 跑任意 SQL/DDL；⚠️ 必用 curl（python-urllib 觸 Cloudflare 1010）— Session 84

---

## 財務核心（Fat Mo 確認，違反=嚴重過失）

1. **運費扣減公式必用件數而非行數**：`(總件數-1)×單件運費`，總件數=SUM(quantity)；鎖匙扣$20/件，吊飾$35/件 — Fat Mo 確認 2026-06-02
2. **同部位首件含畫圖費，第 2 件起免畫圖（位置依賴成本）**：鎖匙扣/吊飾均適用；跨產品規則：部位已有任何產品，後加同部位其他類型亦免畫圖 — Fat Mo 確認 2026-06-02
3. **吊飾 Clasp=頸鏈（非扣夾），奇偶規則**：成本=畫圖+打印+頸鏈+運費；奇數件加$100頸鏈，偶數件免頸鏈（共用同鏈） — Fat Mo 確認 2026-06-02
4. **`material_cost_*` = 打印/鑄造費（非原材料進價）**：necklace_silver=260、gold=316、keychain_stainless=95、alloy=122（嬰兒）；命名問題 deferred 至 PRM v2 — 源自 2026-06-03
5. **鎖匙扣打印費依嬰兒/家庭分層**：嬰兒：不鏽鋼$95/鋁$122；家庭(S/P)：$135（兩材質相同）；吊飾各對象一致（銀$260/金$316）— 源自 2026-06-03

---

## Pitfalls（重複踩過的雷）

1. **立體擺設 products.total_base_cost=0**：migration 0023 ON CONFLICT DO NOTHING placeholder，後無補值；Smart Cache 讀 0→成本少$210。⚠️ 含：W1 混合訂單收斂律假警報（n8n四分量 vs products 在有免畫圖訂單必然偏差>$1，應推 n8nAdjustmentNotes 非 zeroCostItems）。修復：migration 0030 — Session 65
2. **RPC return 遺漏前端所需欄位（P8）**：RPC 只返回 {success, order_id}，前端讀欄位靜默 false。必須對照前端所有讀取欄位，在 RETURN jsonb_build_object 逐一確認 — 源自 2026-05-27
3. **【高頻 ⚠️】n8n + sbSyncOrder 雙寫競態**：responseMode:onReceived 令前端在 n8n RPC 完成前觸發 sbSyncOrder，DELETE+INSERT 與 UPSERT 並發 → 409 .catch() 靜默吞。架構解法：n8n RPC 為 SSoT，sbSyncOrder 只在 webhook 失敗時觸發 — 源自 2026-05-23
4. **PostgreSQL ENUM 型別不符（42804）**：`->>` 得 text，不能隱式轉型為 ENUM；整個 RPC 交易 rollback。必須 explicit cast `(v_json->>'field')::order_status` — 源自 2026-05-23
5. **Webhook payload 缺漏（Late Enrichment）**：enrichment 在 response.ok 後才執行，webhook 發出時 items 缺 `_ui_process_status`/`_ui_batch_number`。UI 狀態必須在 fetch() **前**注入 — 源自 2026-05-23
6. **n8n 沙箱 process 未定義**：限制性 sandbox 中 `process` 完全未定義，直取 `process.env` 崩潰。必以 `typeof process !== 'undefined'` 條件保護 — 源自 2026-05-23
7. **PostgREST 括號語法崩潰**：SKU 含括號時（如 "木框套裝 (4肢)"），過濾值必須用雙引號包裹 `sku.like."FILTER*"` — 源自 2026-05-23
8. **RPC GRANT 安全層級**：SECURITY DEFINER 函式若寫業務表（如 products），GRANT 應給 service_role 而非 anon；否則任何持 anon key 的人可觸發 — 源自 2026-05-28
9. **n8n Code 節點 NAS 限制（fetch 禁用）**：fetch() 未定義、https 模組被禁用，靜默失敗；必須使用 require('axios') 或 HTTP Request 節點 — 源自 2026-05-22
10. **Smart Cache COST_MAP 硬編碼遺漏**：新 SKU 上線若未在 Smart Cache Strategist 節點新增成本條目，成本計算返回 0；已補入 /new-product Step 2.e — 源自 2026-05-23
11. **Airtable formula 不可靠處理 lookupValues**：multipleLookupValues 陣列計算失可靠；核心財務欄位必須由 n8n 計算後直接寫入 — 源自 2026-05-03
12. **try-catch 靜默吞掉 TDZ 錯誤**：Temporal Dead Zone 錯誤被 catch 吞掉，導致 Order_Items_List 空白無任何錯誤提示 — 源自 memory
13. **【高頻 ⚠️】Chrome Date Parsing + 排序還原失效**：`new Date("DD/MM/YYYY")` → Invalid Date；載入時還原 filters 繞過 applyReviewFilters()。解法：正則手動解析 DD/MM/YYYY；fetch callback 尾端強制呼叫 applyReviewFilters() — 源自 2026-05-25
14. **【高頻 ⚠️】靜默降級禁止（Supabase-First 守護）**：工具缺 Supabase 存取 = blocker，須先解決，禁止靜默降級至 Airtable。Airtable 僅用於：歷史補救/冷備援/緊急回退 — 源自 2026-06-04
15. **【P9】IIFE 閉包函式 onclick 靜默失效**：函式在 IIFE `(function(){'use strict';})()` 內，`onclick="fn()"` 全域找不到，完全靜默。修復：IIFE 末尾明確 `window.fn = fn` 暴露 — 源自 2026-05-27
16. **SELECT / PATCH 帶未套用欄位 → PostgREST 400**：新欄位加入 SELECT 或 PATCH body 前必確認 migration 已套用；否則整個訂單總覽失連。順序：migration 套用 → 加 SELECT → 加 PATCH — 源自 2026-05-26
17. **globalOrders cache 欄位名稱陷阱**：Supabase fetch 映射為 `o.Customer`（非 `o.Customer_Name`）。更新 cache 若只寫 `o.Customer_Name`，Review 表渲染永遠不更新 — 源自 2026-05-27
18. **單一配件 filter 假設靜默失效**：`_woolKey` 只過濾一種配件，新增第二配件後 Badge 靜默遺失。每次新增配件必查：① 前端 filter 函式 ② n8n getItemCategory() — 源自 2026-05-27
19. **item_base_cost ≠ subtotal_cost × quantity（Mirror Prep 陷阱）**：Mirror Prep 實際寫入 `item_base_cost = subtotal_cost = Total_Base_Cost`（不乘 quantity）。批量重算 SQL 必須以 Mirror Prep 代碼為準，非欄位說明文字 — 源自 2026-05-28
20. **【高頻 ⚠️】Migration 部分執行靜默失敗**：`CREATE TABLE IF NOT EXISTS` 在表已存在時靜默跳過，後續 PART（ALTER/INSERT/RPC）不執行無報錯。預防：各 PART 必須有獨立 smoke-test 查詢 — 源自 2026-05-29
21. **批量 UPDATE 前必先 SELECT 記錄原始值**：直接 UPDATE 無法回滾（Supabase 無交易歷史），Airtable 備份不保證有值。每次批量改狀態前先 `SELECT ... RETURNING` 存快照 — 源自 2026-06-11
21. **【P10】付款拆格 boxKey 改動須同步三函式**：改 boxKey 格式後，`_syncBalanceFromDeposit` / `serializeSplits` / `restoreSplits` 均用舊格式靜默失效。凡改 boxKey 必查三函式 — 源自 2026-05-31
22. **路由總機被動維護 = 路由腐爛**：FHS_Prompts.md 只在 commands/ 增刪時觸發更新；AGENTS Rule 新增/L2 文件新增/語義修正不觸發 → 累積 3–5 session 後路由過時。修復：AGENTS 文件同步律擴充 4 觸發 — Session 63
23. **n8n API `POST /workflows` active 欄位 read-only**：建立 Workflow 含 `"active":true` → 400。正確流程：POST（不含 active）→ 得 ID → 單獨 `POST /api/v1/workflows/{id}/activate`。亦無 /run 端點 — Session 67
24. **新增 order_items 欄位必須同步 n8n 寫入鏈**：新單主寫入走 n8n sync_order_to_mirror RPC（非前端 sbSyncOrder）。新欄位若未改 (a)Mirror Prep items.map + (b)RPC INSERT/VALUES/ON CONFLICT 三處 → 永遠 NULL。前例：engraving_text 缺欄致鎖匙扣/吊飾刻字全失 — Session 84
25. **【CRITICAL】Mirror Prep final_sale_price 必用確收三欄，禁用 Total_Revenue**：`Total_Revenue` 是系統建議售價，≠ 操作者確收金額。`final_sale_price` 必須 = `Deposit + Balance + Additional_Fee`；`net_profit` 同步改為 `_confirmedRevenue - Total_Cost`。使用 Total_Revenue 導致 9 單偏差最高 $2,880 — Session 89
26. **_quickHalfFillAllSplits 覆寫已載入訂單 split box**：定價引擎執行後無條件 auto-fill，包括載入既存訂單場景 → 按同步後 n8n 把 auto-fill 值寫回 Supabase。修復：`inp.value !== '' && inp.value !== '0' && inp.dataset.isDefault !== 'true'` guard + oninput 補 `isDefault='false'` — Session 92
27. **generate() else 分支 hide box 必須同時 clear value**：`display='none'` 只隱藏 UI，`output-preview-a.value` 保留舊值，被 _igpmRefresh 等讀取路徑讀到。凡 hide textarea 必同時 `.value=""` — Session 92
28. **SQL patch orders/order_items 不更新 raw_form_state**：直接 patch 財務欄位後，raw_form_state 的 depositSplitData 仍為舊值；下次載入→同步 → n8n 讀舊 split 值覆寫 Supabase。永久修正需用戶手動改 split→同步，或額外 jsonb_set patch raw_form_state — Session 92
29. **多模式 UI early-return 遺漏 else 重置閉包狀態**：條件切換函式 early-return 時若不重置閉包變量（如 babyFillMode），restore 函式仍讀殘留值，UI 停留錯誤狀態。修復：else 分支明確重置 + 呼叫 restore — Session 95

---

## Preferences（Fat Mo 已確認的偏好）

1. **完成訂單唯一出口為 Modal 審閱**：桌面/手機均不設直接 syncToAirtable 按鈕，操作者必須進入 Modal 審閱後才能同步。Modal 入口永遠可點 — 源自 2026-05-31
2. **最小改動優先**：能補一個釘子就不重做廚房，v2 優先於 v9 — 源自多次 cl-flow 對話
3. **橋接版禁止含邏輯**：.claude/commands/ 與 .agents/workflows/ 只做指向，邏輯只在 Master (.fhs/ai/commands/) — 源自 2026-05-19
4. **表單新增 input 前必評估 captureFormState + n8n payload 影響**：新欄位進 captureFormState 會改 webhook payload 結構；先確認範圍，不確定就 defer — 源自 2026-05-29
5. **反奉承守則內建於指令設計**：用戶每次輸入「不奉承」「專業」是設計缺口；守則寫入 Master 後永遠生效，用戶無需重複輸入 — 源自 2026-05-30
6. **cl-flow A2 模型策略**：統一使用 `gemini-3.5-flash`；模型切換一律透過 `.env GEMINI_A2_MODEL_DEFAULT`，不改代碼 — 源自 2026-05-30
7. **外部 API endpoint 必先 probe 再推薦**：知識截止日後的 model ID 可能已過時；推薦前必須 curl/node probe 確認端點存在 — 源自 2026-05-30
8. **Skill vs Subagent：規則 context 問題用 Skill**：「忘記財務/業務規則」是 context 沒帶規則進來的問題，解法是 Skill（task 開始前 load）；Subagent 是 spawn 出去做事，無法解決 AI 呼叫前不知道規則的問題 — 源自 2026-06-01
