# FHS Learnings — Pattern / Pitfall / Preference

> 由 /commit 結尾手動 distill，每條上限 150 字元含日期來源。
> 全檔上限 50 條；超過時必須合併或退役，嚴禁變成第二份 decisions.md。
> 由 /read Phase 2.5 載入至工作記憶。
> 上次整理：2026-07-05（Session 142 `/fhs-slim`，51→50 條，退役 Pitfall 1 條 [TDZ，已存於auto-memory]，修正 Pitfalls 編號連續性；歷史：Session 136 整合 59→49 條）

---

## Patterns（成功反覆驗證的做法）

1. 雙層成本架構：Supabase View（Layer 1 即時報價）+ n8n 靜態寫入（Layer 2 歷史快照），職責不重疊 — 源自 2026-05-16
2. 四端同步隔離：Supabase 失敗不中斷 Airtable、Airtable 失敗不中斷 Supabase，用 try-catch 分隔鏈路 — 源自 2026-05-16
3. Subagent 單一職責：database-reviewer=靜態 schema；finance-auditor=Live 動態驗證，兩者正交不互換 — 源自 2026-05-10
4. 同步進度輪詢機制：同步後切換訂單總覽，前端以 4s 輪詢 Supabase（20s 超時），進度 Banner 提供樂觀 UI — 源自 2026-05-23
5. **data-spec 通過屬性隔離**：DOM 顯示文字為衍生標籤時，必以 `data-spec="..."` 存原始值供 save 讀取；直接讀 textContent 會把 UI label 寫入 DB — 源自 2026-05-27
6. **`_isAddon()` + `_addonType()` 多配件過濾架構**：三層向後兼容（key 後綴 match → name keyword → category fallback）；新配件只需在 `_addonType()` 加一個 return 分支；已取代舊版「單一配件 filter 假設」問題類別 — 源自 2026-05-27
7. **`_fhsCostReady` flag 競態防護**：page-load 讀 Supabase 後才設 true；calculatePricing 入口 guard 若 false 拒絕計算，防空值算出 0 — 源自 2026-06-02
8. **`chargedPositions Set` 跨陣列追蹤**：PartDesc trim+toLowerCase 正規化，同部位跨產品第 2 件 baseDrawing=0；新產品類型必查是否需擴充 Set — 源自 2026-06-02
9. **Phase 0 payload 流向前置查證**：前端改動影響財務計算前，先 get_node 確認 n8n 是否實際讀取該欄位，再決定隔離策略 — 源自 2026-06-03
10. **Supabase MCP 掉線用 Management API 繞過**：`POST api.supabase.com/v1/projects/{ref}/database/query` + `Bearer PAT` 跑任意 SQL/DDL；⚠️ 必用 curl（python-urllib 觸 Cloudflare 1010）— Session 84
11. **n8n PUT credential 若 ID 已知可直接 API 補回**：API 限制是「無列表端點」（探索不到未知 ID），但若 credential ID 早已知，可直接寫進 PUT body 覆寫，GET 驗證即可；只有 ID 真的未知時才需人工 UI 點選 — Session 111

> 📌 **退役**（Session 136）：kgov 知識治理框架 Pattern 已升格為憲法層規則，完整定義見 `AGENTS.md`（Session 63/100），不再需要於此重複記錄。

---

## 財務核心（Fat Mo 確認，違反=嚴重過失）

1. **運費扣減公式必用件數而非行數**：`(總件數-1)×單件運費`，總件數=SUM(quantity)；鎖匙扣$20/件，吊飾$35/件 — Fat Mo 確認 2026-06-02 [[2026-05-16_keychain_shipping_deduction]]
2. **同部位首件含畫圖費，第 2 件起免畫圖（位置依賴成本）**：鎖匙扣/吊飾均適用；跨產品規則：部位已有任何產品，後加同部位其他類型亦免畫圖 — Fat Mo 確認 2026-06-02
3. **吊飾 Clasp=頸鏈（非扣夾），奇偶規則**：成本=畫圖+打印+頸鏈+運費；奇數件加$100頸鏈，偶數件免頸鏈（共用同鏈） — Fat Mo 確認 2026-06-02
4. **`material_cost_*` = 打印/鑄造費（非原材料進價）**：necklace_silver=465、gold=465、keychain_stainless=115（嬰兒/大寶）、alloy=115（嬰兒/大寶）；命名問題 deferred 至 PRM v2 — 源自 2026-06-03，2026-06-25 更正
5. **鎖匙扣打印費依嬰兒/家庭分層**：嬰兒：不鏽鋼$115/鋁$115；家庭(S/P)：$135（兩材質相同）；吊飾各對象一致（銀$465/金$465）— 源自 2026-06-03，2026-06-25 更正

---

## Pitfalls（重複踩過的雷）

1. **【高頻 ⚠️】n8n + sbSyncOrder 雙寫競態**：responseMode:onReceived 令前端在 n8n RPC 完成前觸發 sbSyncOrder，DELETE+INSERT 與 UPSERT 並發 → 409 .catch() 靜默吞。架構解法：n8n RPC 為 SSoT，sbSyncOrder 只在 webhook 失敗時觸發 — 源自 2026-05-23
2. **PostgreSQL/PostgREST 型別與過濾陷阱**：①`->>` 得 text，不能隱式轉型為 ENUM，須 explicit cast `(v_json->>'field')::order_status`（42804）；②SKU 含括號時（如 "木框套裝 (4肢)"），過濾值必須用雙引號包裹 `sku.like."FILTER*"` — 源自 2026-05-23
3. **Webhook payload 缺漏（Late Enrichment）**：enrichment 在 response.ok 後才執行，webhook 發出時 items 缺 `_ui_process_status`/`_ui_batch_number`。UI 狀態必須在 fetch() **前**注入 — 源自 2026-05-23
4. **RPC GRANT 安全層級**：SECURITY DEFINER 函式若寫業務表（如 products），GRANT 應給 service_role 而非 anon；否則任何持 anon key 的人可觸發 — 源自 2026-05-28
5. **【更正】n8n Code 節點 NAS 限制**：`fetch`/`require`/`process` 三者皆鎖（require('axios') 同樣失敗），改用 HTTP Request 節點；但 `Buffer` 全域物件、`compression` 節點（解壓ZIP）可用；HTTP Request 回應空陣列時下游 0-item 節點被跳過，須設 `alwaysOutputData` — 源自 2026-05-22，2026-06-19 修正補充 [[2026-05-18_n8n-nas-code-node-limits-telegram-debug]] [[2026-06-19_n8n-nas-code-node-buffer-compression-capabilities]]
6. **【高頻 ⚠️】Chrome Date Parsing + 排序還原失效**：`new Date("DD/MM/YYYY")` → Invalid Date；載入時還原 filters 繞過 applyReviewFilters()。解法：正則手動解析 DD/MM/YYYY；fetch callback 尾端強制呼叫 applyReviewFilters() — 源自 2026-05-25
7. **【P9】IIFE 閉包函式 onclick 靜默失效**：函式在 IIFE `(function(){'use strict';})()` 內，`onclick="fn()"` 全域找不到，完全靜默。修復：IIFE 末尾明確 `window.fn = fn` 暴露 — 源自 2026-05-27
8. **Migration 套用時序與可見性**：①新欄位加入 SELECT 或 PATCH body 前必確認 migration 已套用，否則 PostgREST 400（順序：migration 套用→加 SELECT→加 PATCH）；②`CREATE TABLE IF NOT EXISTS` 在表已存在時靜默跳過，後續 PART（ALTER/INSERT/RPC）不執行無報錯，各 PART 必須有獨立 smoke-test 查詢 — 源自 2026-05-26，2026-05-29
9. **批量 UPDATE 前必先 SELECT 記錄原始值**：直接 UPDATE 無法回滾（Supabase 無交易歷史），Airtable 備份不保證有值。每次批量改狀態前先 `SELECT ... RETURNING` 存快照 — 源自 2026-06-11
10. **n8n workflow API 送出限制集**：①POST 建立含 `"active":true` → 400，正確：POST→得ID→單獨 activate；②PUT 更新只接受 `{name,nodes,connections,settings}` 四欄；③`process.env.X` 須先載 .env 否則得字面量 `"undefined/..."`；④POST JSON array body 須 `contentType:"raw"`（`specifyBody:"string"`+`JSON.stringify`會被誤序列化成 `{"[...]":""}` → PGRST204）；⑤POST 空陣列 `[]` 觸發 PostgREST "Could not find '[]' column"，寫入前必加 `alerts.length > 0` guard；⑥expression 欄位（Text/URL）不支援 `.filter().map().join()` 鏈式語法，複雜邏輯移至 Code 節點輸出簡單欄位 — Session 67/121/124/127/133
11. **新增 order_items 欄位必須同步 n8n 寫入鏈**：新單主寫入走 n8n sync_order_to_mirror RPC（非前端 sbSyncOrder）。新欄位若未改 (a)Mirror Prep items.map + (b)RPC INSERT/VALUES/ON CONFLICT 三處 → 永遠 NULL — Session 84
12. **【CRITICAL】Mirror Prep final_sale_price 必用確收三欄，禁用 Total_Revenue**：`Total_Revenue` 是系統建議售價，≠ 操作者確收金額。`final_sale_price` 必須 = `Deposit + Balance + Additional_Fee`；使用 Total_Revenue 導致 9 單偏差最高 $2,880 — Session 89
13. **付款 split UX 清空/污染雙雷**：①focusin 無條件清空 input 而不先 `dataset.preFocusVal = e.target.value`，focusout 只能 fallback 半訂，全付/自訂值被錯誤覆蓋；②【高頻⚠️】restoreFormState 內 generate() 無條件 auto-fill 污染 hidden 欄，renderPaymentSplits prevData 優先讀污染值使存檔值被忽略。根治：focusin 必先 save 原值 + 快照隔離（pollute 前存 JSON 為權威）+ `_fhsPaymentSyncing=true` 壓 cross-sync + finally 清快照 — Session 97/107 [[2026-06-12_split-box-ux-and-zeroing-boundary]]
14. **【高頻 ⚠️】mapOrder() return object 不含 deposit/balance**：`mapOrder()` 只映射 `Final_Sale_Price / Additional_Fee / Net_Profit / Total_Cost / Adjustment_Amount`，`Deposit`/`Balance` 完全缺席。凡需讀 deposit/balance，必須從 Supabase orders fresh fetch 的 `extra` 物件讀取 — Session 103
15. **前端 client-side Set 刷新即清空陷阱**：`window._fhsArchivedIds`（及類似 in-memory Set）初始化為 `new Set()`，session 內手動 add/delete，但刷新後全空。影響分類/過濾的 Set 必須在 `sbFetchGlobalReview` 後從 fetch 結果重建 — Session 105
16. **openOrderModal 第二參數是 catFilter 非 tab**：第二位 catFilter（'A'手模/'B'金屬/空=全訂單）控制標題與文本分段；要指定開啟分頁必須用**第三參數 initialTab**（內部呼 switchModalTab）。誤把 'finance' 當第二參數 → 捷徑永遠停訊息文本分頁 — Session 109
17. **【高頻 ⚠️】cl-flow runner Perplexity 推理模型靜默空白**：`sonar-reasoning-pro` 低 `max_tokens`（舊值3072）吃光 think 階段，HTTP 200 + finish_reason:'stop' 卻 content 空，px-report.md 恆寫空白。修復：`max_tokens`→8000 + 空 content 視為失敗 throw 交 withRetry — Session 110 [[2026-06-23_cl-flow-runner-cloudflare-px-gemini-fix]]
18. **order_items 成本是組裝值非單一原子**：勿拿 `subtotal_cost` 直接比對 `cost_configurations` 單一 key 判斷「未同步」；改值後 products 表無自動回算機制，唯一檢查工具 `fhs_check_product_cost_drift()` 範圍有限 — Session 112 [[2026-06-20_keychain-cost-drift-misdiagnosis-and-propagation-gap]]
19. **Python json.dump emoji → n8n surrogate pair "invalid syntax"**：用 Python 序列化含 emoji（如 🔗）的 n8n workflow JSON 時，若 `ensure_ascii=False` 且環境 CP950，emoji 被寫成 surrogate pair（`\udcfx...`）；n8n 求值表達式時 "invalid syntax" 靜默失敗。修法：`json.dump(..., ensure_ascii=True)` 強制 ASCII escape，或改用純 ASCII 替代符號（`>` 代替 🔗）— Session 128
20. **【Pitfall #20】Postgres `CREATE OR REPLACE FUNCTION` 不能改參數名**：`CREATE OR REPLACE` 替換函數時若參數名與原函數不同，報 `42P13: cannot change name of input parameter`。解法：保留原參數名，或先 `DROP` 再建。改函數前必須讀原 migration SQL 確認 param names — Session 130 Phase B
21. **Shell hook 勿用通用標題 `## X` 抓取，改唯一 fence tag**：`awk '/^## 待辦/'` 匹配「檔案內第一個同名段」，若歷史 session 有舊同名 section 則讀錯。交接欄位應以唯一 fenced tag（如 ` ```handoff `）+ awk 邊界精確抽取（`found` flag + 分隔線 exit）；fence tag 需確認全檔唯一 — Session 118
22. **n8n Code 節點內嵌 dashboard 網址禁憑印象寫死**：Telegram 深連結硬編碼 `yanhei.synology.me:5006/web/`（NAS 內網路徑）實測 401，正確應為 decisions.md 記載之公開網址。修法：任何嵌入網址一律對照 decisions.md + curl 實測 200 才寫入，勿假設內網 port/路徑對外可達 — Session 136
23. **既有「不可配置」的平台限制認定需定期複驗**：S51 判定「Obsidian dot-directory 永遠不可見」為不可配置硬限制，S137 實測外掛 `hidden-folders-access` 白名單機制即可解除（含大檔 handoff.md/多檔 lessons/ 皆無效能問題），限制認定已推翻。過往結論標「不可配置」時應附查證日期，逾期重大決策前先花 10 分鐘 WebSearch 複驗，見 decisions.md D4 — Session 137
24. **文件是否停更不能只看 frontmatter `last_updated`**：`docs/CHANGELOG.md` frontmatter 標 `last_updated: 2026-06-05`，但內文實際含 2026-07-01 的 S130 條目——metadata 比內容還舊，若只讀 frontmatter 會誤判停更時間點。判斷任一文件是否過時，須比對其**最新一條實際內文日期**，而非宣稱的 metadata 欄位 — Session 138

> 📌 **退役**（Session 136）：①「Smart Cache COST_MAP 硬編碼遺漏」已補入 `/new-product` Step 2.e 程序強制執行，不再需要靠此記錄提醒；②「單一配件 filter 假設靜默失效」已被 Pattern #6（`_isAddon()`/`_addonType()` 架構）永久取代；③「generate() else 分支忘記清值」為窄範圍一次性 bug，已修復且此函式模式無再犯風險。
>
> 📌 **退役**（Session 142，`/fhs-slim` 觸發，全檔滿50條上限）：「try-catch 靜默吞掉 TDZ 錯誤」——條目本身無 session/日期來源（僅標「源自 memory」），同一教訓已完整記錄於 auto-memory `feedback_tdz_silent_catch.md`，此處純重複佔位，退役騰出額度。

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
9. **UI toggle 標籤用操作者語言，技術代號留文件**：「三大類/細分」是實作代號，操作者看不懂；按鈕文字改「簡化/逐件」等口語詞，技術名稱只在 §2.5 文件保留 — S126
10. **Toggle 按鈕用動作語義（顯示下次執行），非狀態語義（顯示當前狀態）**：「全部半訂」應代表「點擊後將填半價」；auto-fill 不得改按鈕標籤（只有用戶手動 force 才更新），避免載入訂單後按鈕誤報當前狀態 — S126
