# FHS Learnings — Pattern / Pitfall / Preference

> 由 /commit 結尾手動 distill，每條上限 150 字元含日期來源。
> 全檔上限 50 條；超過時必須合併或退役，嚴禁變成第二份 decisions.md。
> 新條目須過 stage-3 驗證門檻（診斷有核實證據，見 `.fhs/ai/governance/07_compounding-loop.md` §1）；未驗證的猜測落 todo.md「未解待驗證」節，不入本檔。
> 由 /read Phase 2.5 載入至工作記憶。
> 上次整理：2026-07-13（Session 171 `/commit` Lesson Distillation，退役 Pitfall #24 [hook路徑安全判斷，修復已結構化不再需記憶提醒]，對等替換1條新教訓（PostgREST ignore-duplicates 缺 on_conflict 冪等假象），維持50條上限；歷史：S170 51→50、S168 51→50、S167 51→50、S166 51→50、S158 51→50、S146 51→50、S144 對等替換、S143 對等替換、S142 51→50、S136 59→49）

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
> 📌 **退役**（Session 136）：kgov 知識治理框架 Pattern 已升格為憲法層規則，完整定義見 `AGENTS.md`（Session 63/100），不再需要於此重複記錄。
>
> 📌 **退役**（Session 143，`/commit` Lesson Distillation，全檔滿50條需替換）：「Supabase MCP 掉線用 Management API 繞過」——與 auto-memory `reference_supabase_mcp_dropout_workaround.md` 內容重複，該處為專屬記錄，此處純占位，退役騰出額度給本次新教訓。

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
7. **Migration 套用時序與可見性**：①新欄位加入 SELECT 或 PATCH body 前必確認 migration 已套用，否則 PostgREST 400（順序：migration 套用→加 SELECT→加 PATCH）；②`CREATE TABLE IF NOT EXISTS` 在表已存在時靜默跳過，後續 PART（ALTER/INSERT/RPC）不執行無報錯，各 PART 必須有獨立 smoke-test 查詢 — 源自 2026-05-26，2026-05-29
8. **批量 UPDATE 前必先 SELECT 記錄原始值**：直接 UPDATE 無法回滾（Supabase 無交易歷史），Airtable 備份不保證有值。每次批量改狀態前先 `SELECT ... RETURNING` 存快照 — 源自 2026-06-11
9. **n8n workflow API 送出限制集**：①POST 建立含 `"active":true` → 400，正確：POST→得ID→單獨 activate；②PUT 更新只接受 `{name,nodes,connections,settings}` 四欄；③`process.env.X` 須先載 .env 否則得字面量 `"undefined/..."`；④POST JSON array body 須 `contentType:"raw"`（`specifyBody:"string"`+`JSON.stringify`會被誤序列化成 `{"[...]":""}` → PGRST204）；⑤POST 空陣列 `[]` 觸發 PostgREST "Could not find '[]' column"，寫入前必加 `alerts.length > 0` guard；⑥expression 欄位（Text/URL）不支援 `.filter().map().join()` 鏈式語法，複雜邏輯移至 Code 節點輸出簡單欄位 — Session 67/121/124/127/133
10. **新增 order_items 欄位必須同步 n8n 寫入鏈**：新單主寫入走 n8n sync_order_to_mirror RPC（非前端 sbSyncOrder）。新欄位若未改 (a)Mirror Prep items.map + (b)RPC INSERT/VALUES/ON CONFLICT 三處 → 永遠 NULL — Session 84
13. **【高頻 ⚠️】mapOrder() return object 不含 deposit/balance**：`mapOrder()` 只映射 `Final_Sale_Price / Additional_Fee / Net_Profit / Total_Cost / Adjustment_Amount`，`Deposit`/`Balance` 完全缺席。凡需讀 deposit/balance，必須從 Supabase orders fresh fetch 的 `extra` 物件讀取 — Session 103
14. **前端 client-side Set 刷新即清空陷阱**：`window._fhsArchivedIds`（及類似 in-memory Set）初始化為 `new Set()`，session 內手動 add/delete，但刷新後全空。影響分類/過濾的 Set 必須在 `sbFetchGlobalReview` 後從 fetch 結果重建 — Session 105
15. **openOrderModal 第二參數是 catFilter 非 tab**：第二位 catFilter（'A'手模/'B'金屬/空=全訂單）控制標題與文本分段；要指定開啟分頁必須用**第三參數 initialTab**（內部呼 switchModalTab）。誤把 'finance' 當第二參數 → 捷徑永遠停訊息文本分頁 — Session 109
16. **【高頻 ⚠️】cl-flow runner Perplexity 推理模型靜默空白**：`sonar-reasoning-pro` 低 `max_tokens`（舊值3072）吃光 think 階段，HTTP 200 + finish_reason:'stop' 卻 content 空，px-report.md 恆寫空白。修復：`max_tokens`→8000 + 空 content 視為失敗 throw 交 withRetry — Session 110 [[2026-06-23_cl-flow-runner-cloudflare-px-gemini-fix]]
17. **order_items 成本是組裝值非單一原子**：勿拿 `subtotal_cost` 直接比對 `cost_configurations` 單一 key 判斷「未同步」；改值後 products 表無自動回算機制，唯一檢查工具 `fhs_check_product_cost_drift()` 範圍有限 — Session 112 [[2026-06-20_keychain-cost-drift-misdiagnosis-and-propagation-gap]]
18. **Python json.dump emoji → n8n surrogate pair "invalid syntax"**：用 Python 序列化含 emoji（如 🔗）的 n8n workflow JSON 時，若 `ensure_ascii=False` 且環境 CP950，emoji 被寫成 surrogate pair（`\udcfx...`）；n8n 求值表達式時 "invalid syntax" 靜默失敗。修法：`json.dump(..., ensure_ascii=True)` 強制 ASCII escape，或改用純 ASCII 替代符號（`>` 代替 🔗）— Session 128
19. **【Pitfall #19】Postgres `CREATE OR REPLACE FUNCTION` 不能改參數名**：`CREATE OR REPLACE` 替換函數時若參數名與原函數不同，報 `42P13: cannot change name of input parameter`。解法：保留原參數名，或先 `DROP` 再建。改函數前必須讀原 migration SQL 確認 param names — Session 130 Phase B
20. **【git】checkout 會靜默攜帶未提交修改跨分支，merge 因而空操作**：編輯完檔案後忘記 commit 就 `git checkout main`，修改內容原封不動跟過去（不報錯不提示）；此時對原分支 `merge --no-ff` 只會輸出 `Already up to date`（無 diffstat）——這個異常平淡的訊息就是空合併的訊號，需 `git log <branch> --oneline` 核對該分支是否真有獨立 commit。切分支/宣告完工前先 commit，不要等到 merge 前才做 — Session 144
22. **既有「不可配置」的平台限制認定需定期複驗**：S51 判定「Obsidian dot-directory 永遠不可見」為不可配置硬限制，S137 實測外掛 `hidden-folders-access` 白名單機制即可解除（含大檔 handoff.md/多檔 lessons/ 皆無效能問題），限制認定已推翻。過往結論標「不可配置」時應附查證日期，逾期重大決策前先花 10 分鐘 WebSearch 複驗，見 decisions.md D4 — Session 137
23. **文件是否停更不能只看 frontmatter `last_updated`**：`docs/CHANGELOG.md` frontmatter 標 `last_updated: 2026-06-05`，但內文實際含 2026-07-01 的 S130 條目——metadata 比內容還舊，若只讀 frontmatter 會誤判停更時間點。判斷任一文件是否過時，須比對其**最新一條實際內文日期**，而非宣稱的 metadata 欄位 — Session 138
25. **[G] 判準已於 S148 對齊 execute.md diff 物理特徵，.md 與 hooks.js 編輯只 warn 不落 flag**：舊版判準（任何 .md 含財務詞即落 flag）已替換為真值表驅動（migrations .sql / MCP apply_migration / Dashboard HTML 含財務 → flag；其他 → warn-only）；歷史誤觸模式見 governance/02 §7，治本見 planning/2026-07-06_s148-loop-hardening_implementation_plan.md §4.2 — Session 147/S148
26. **【高頻 ⚠️】顏色 bug 純讀碼/grep 查不全，JS `style.color='inherit'` 非「還原」**：舊色號散落多分頁寫法不一致，grep 抓不齊；`inherit` 會抓外層色，應設 `''` 讓 class 接管。改用瀏覽器 DOM 掃描量測 computed color 找離群值 — S157(未修好)/S159(補完)
27. **【高頻 ⚠️】Dashboard 巨檔多 `<script>` block，看似頂層 function 可能只是另一 IIFE 內的區域函式**：`_findOrder` 定義在獨立 `<script>(function(){...})()` （P3/P4 Bottom-Sheet 區塊）內，於較早 script block 呼叫得 `ReferenceError`，onchange handler 內被靜默吞掉、UI 無任何反應。新函式引用「看起來是全域」的 helper 前，grep 確認其宣告是否包在 IIFE 內；務必實機點擊驗證（confirm/console mock），不能只靠語法檢查 — Session 161續
28. **`.fhs/.deploy-ok` 旗標內容必須是純 ISO timestamp 字串，寫描述文字會被靜默清空**：guard 用 `new Date(content)` 解析旗標檔，非合法時間格式 → `NaN` → 判定過期並自動刪除，下一步 cp 升格仍被攔截且無明確錯誤提示。建立旗標時只寫 `new Date().toISOString()` 輸出，不可夾帶說明文字 — Session 167
30. **第三方 Claude Skill 若 frontmatter 含 `disable-model-invocation:true`，喺 Claude Code harness 內完全無法被呼叫**：唔止係「唔自動觸發」，AI 主動用 Skill 工具呼叫都會被系統拒絕。裝第三方技能包前應逐支查 frontmatter；若要設中文召喚詞疊加，改為直接呼叫其底層無此旗標嘅技能（如 `grill-me`→改叫 `grilling` 本體），使用者體驗不受影響 — Session 170 [[project_mattpocock_skills]]
29. **【高頻 ⚠️】移除 RLS 政策前必查真實呼叫+驗真實資料狀態，勿信 HTTP 200**：稽核「表是否有 anon 呼叫」不能只 grep 單行 pattern（`method:'DELETE'` 常與 URL 分行漏判）；移除政策後，若 table 級 GRANT 仍在但無 permissive RLS，PostgREST 回 HTTP 200+0 rows 而非 403，驗收只看 status code 會誤判成功。政策變更驗收須用真實（非 bogus）測試列，確認資料真的被改動 — Session 168 [[2026-07-12_rls-policy-removal-silent-2xx-write-failure]]
31. **PostgREST `Prefer:ignore-duplicates` 冪等假象**：POST body 不帶 PK 值時，UPSERT 仲裁鍵預設落 PRIMARY KEY（永不匹配），URL 未帶 `?on_conflict=<欄位>` 明確指定真正的 dedup UNIQUE INDEX 就不會生效——真撞號時 23505 打回整批，配合 `continueOnFail`+`return=minimal` 會靜默丟失整批資料。任何用 ignore-duplicates 模式的 POST 節點，必須確認 on_conflict 參數對齊真正的 dedup 索引欄位。**附加陷阱**：若 dedup 索引是 expression index（如 nullable 欄位常見的 `COALESCE(col,'')`），PostgREST 的 `on_conflict` 只接受 plain column 名稱、不支援 expression，不能照抄 plain-column 表的修法直接把欄位名塞進去——須先加具現化欄位（`GENERATED ALWAYS AS (expr) STORED`）+ 對應 plain-column 唯一索引取代原 expression index，`on_conflict` 才能正確命中 — Session 171/171續II [[project_p2a_ig_message_pii]]
32. **【高頻 ⚠️】Canva MCP `resize_element` 嘅 `preserve_aspect_ratio=true` 保留嘅係「目前 element container 現有比例」，唔係 asset 原生像素比例**：新素材（如客人上載嘅直向 960×1920 影片）拖入 Canva 時預設 container 形狀（如舊格 864×864 方形）可能同新 asset 完全唔同比例，淨傳一個維度（如 height）靠 `preserve_aspect_ratio` 自動推，實際保留嘅係 container 舊比例（1:1），唔係 asset 原生比例（0.5），導致嚴重變形/重疊。凡新素材原生比例明顯異於現有 container 比例時，必須明確傳 width+height（`preserve_aspect_ratio=false`），唔可以淨靠 `preserve_aspect_ratio` 自動推 — Session 172 [[project_canva_video_automation]]
33. **【高頻 ⚠️】財務 bug 只查單一訂單/單一欄位會被巧合算術誤導，必須交叉比對訂單層聚合欄位**：`order_items.item_base_cost` 語意不一致（同一 SKU 不同訂單，有時存單件價有時存整套 catalog 價），前兩輪查證分別誤判「數字都對是前端誤報」同「n8n真的漏算quantity」，直到用 `orders.keychain_cost` 配合已知運費扣減公式 `(總片數-1)×$20` 反推交叉驗證，先坐實 subtotal_cost/keychain_cost/total_cost 從未算錯，問題純屬 item_base_cost 輔助欄位誤導前端假警示判斷式。查任何「數字對唔對」類 bug，必須反推對照上一層聚合欄位，唔可以單憑同層兩個欄位互相比較就下結論 — Session 176 [[project_keychain_addon_qty_cost_bug]]

> 📌 **退役**（Session 136）：①「Smart Cache COST_MAP 硬編碼遺漏」已補入 `/new-product` Step 2.e 程序強制執行，不再需要靠此記錄提醒；②「單一配件 filter 假設靜默失效」已被 Pattern #6（`_isAddon()`/`_addonType()` 架構）永久取代；③「generate() else 分支忘記清值」為窄範圍一次性 bug，已修復且此函式模式無再犯風險。
>
> 📌 **退役**（Session 142，`/fhs-slim` 觸發，全檔滿50條上限）：「try-catch 靜默吞掉 TDZ 錯誤」——條目本身無 session/日期來源（僅標「源自 memory」），同一教訓已完整記錄於 auto-memory `feedback_tdz_silent_catch.md`，此處純重複佔位，退役騰出額度。
>
> 📌 **退役**（Session 144，`/commit` Lesson Distillation，全檔滿50條需對等替換）：「Shell hook 勿用通用標題抓取」（原 Pitfall #21，Session 118）——修復已是結構性（fence tag 格式已固化進 handoff.md 設計本身），非需要每次靠記憶提醒的操作紀律，未來復發風險低，退役騰出額度給本次新教訓（git checkout 攜帶未提交修改導致 merge 空操作）。
>
> 📌 **退役**（Session 146，`/fhs-slim` 觸發，全檔滿51條超50上限）：「IIFE 閉包函式 onclick 靜默失效」（原 Pitfall #7，Session 2026-05-27）——修復手法（IIFE 末尾明確 `window.fn = fn` 暴露）已是本專案標準寫法慣例，非需靠記憶提醒的操作紀律，未來復發風險低，退役騰出額度使全檔回落至50條上限（本輪無新教訓對等替換）。
>
> 📌 **退役**（Session 168，`/commit` Lesson Distillation，全檔滿51條超50上限）：「n8n Code 節點內嵌 dashboard 網址禁憑印象寫死」（原 Pitfall #21，Session 136）——一次性歷史事故（硬編碼錯誤內網 URL），正確公開網址已永久記錄於 `decisions.md`，非需靠記憶提醒的操作紀律，未來復發風險低，退役騰出額度給本次新教訓（RLS 政策移除稽核 grep 盲點 + anon 寫入靜默 2xx 失敗）。
>
> 📌 **退役**（Session 171，`/commit` Lesson Distillation，全檔滿51條超50上限）：「hook 判斷路徑是否安全不可靠 regex 猜測外部路徑」（原 Pitfall #24，Session 145）——修復已是結構性（改讀 `fhs-health-rules.json` 顯式設定值，非需靠記憶提醒的操作紀律），未來復發風險低，退役騰出額度給本次新教訓（PostgREST `ignore-duplicates` 缺 `on_conflict` 冪等假象）。

---

## Preferences（Fat Mo 已確認的偏好）

1. **完成訂單唯一出口為 Modal 審閱**：桌面/手機均不設直接 syncToAirtable 按鈕，操作者必須進入 Modal 審閱後才能同步。Modal 入口永遠可點 — 源自 2026-05-31
2. **最小改動優先**：能補一個釘子就不重做廚房，v2 優先於 v9 — 源自多次 cl-flow 對話
4. **表單新增 input 前必評估 captureFormState + n8n payload 影響**：新欄位進 captureFormState 會改 webhook payload 結構；先確認範圍，不確定就 defer — 源自 2026-05-29
7. **外部 API endpoint 必先 probe 再推薦**：知識截止日後的 model ID 可能已過時；推薦前必須 curl/node probe 確認端點存在 — 源自 2026-05-30
8. **Skill vs Subagent：規則 context 問題用 Skill**：「忘記財務/業務規則」是 context 沒帶規則進來的問題，解法是 Skill（task 開始前 load）；Subagent 是 spawn 出去做事，無法解決 AI 呼叫前不知道規則的問題 — 源自 2026-06-01
9. **文件權威＝被使用（路由）＋被保養（合約），非自我聲明**：一份文件自稱「必讀/核心真相」不會令 AI 真的讀它——若無任何 hook/CLAUDE.md 路由表/查詢路由指向它，且無任何 execute.md 後效稽核合約要求同步它，它會腐爛而無人發現（FHS_Blueprint.md 案例：13 處過時、含財務事故誤讀源頭寫法，腐爛一個月無 session 察覺）。新建「必讀文件」前必須同時掛路由+寫回合約，否則寧可不留（S158 Fat Mo 裁決：無合約支撐的內容應遷至有真讀者處，而非降級留存） — S158
10. **視覺改動若會犧牲原有語意（如財務科目色彩區分）需先問，不要單方面統一簡化**：表頭對比度不足，修法是統一改白字，犧牲了入帳/成本/利潤原本紅綠琥珀的語意色彩區分；Fat Mo 檢視後不滿意，要求整段回退（含背景漸層也退回更早版本）。下次遇到「有取捨」的視覺修復，先列選項問，別直接套一個方案上去 — S159續
11. **3D 打印鎖匙扣生產規格（腳固定/手讀檔名/環唯一擺位/指甲可創作）**：腳=30.5mm固定；手尺寸無公式必由Fat Mo標籤於輸入檔名讀取，AI禁自行推算；掛環=固定標準件`3d/input/Ring-24545.obj`，pipeline只做擺位禁自造禁縮放；指甲類細節「創作可接受非還原」（石膏實物本身都冇清晰指甲），用參數化模板 stamp — S161
12. **3D 打印 v0 範圍降級：紋理留師傅、AI 只做機械部分**：Phase1腳全流程機械QC全PASS，但AI紋理誇張化(頻帶分離k=2.5)風格與師傅手工仍有差距（偏腫/線條不夠幼細）。Fat Mo裁決：v0實用範圍=師傅已修紋理mesh為輸入，AI只做縮放+刻字+加環+QC+出檔（MASTER模式），紋理功能日後再逐步加強，非放棄。Phase2（手）沿用同一降級範圍 — S166 2026-07-12

> 📌 **退役**（Session 167，`/commit` Lesson Distillation，全檔滿50條達上限）：「自我遞迴陷阱：健檢工具測試夾具被自身掃描邏輯掃到」（原 Pitfall #24，Session 142）——修復已是結構性（`fhs-health-check.js` 已內建排除測試夾具目錄），非需記憶提醒的操作紀律，退役騰出額度給本次新教訓（`.fhs/.deploy-ok` 旗標內容格式）。
>
> 📌 **退役**（Session 158，接續 S154/S148 Phase 0 慣例，全檔滿50條達上限）：「UI toggle 標籤用操作者語言」（原 Preference #9，S126）——經 S132/S153 等多個 UI session 反覆遵循已成本專案設計慣例，無需靠記憶提醒，窄場景低復發風險，退役騰出額度。
>
> 📌 **退役**（Session 166，`/commit` Lesson Distillation，維持50條上限）：「反奉承守則內建於指令設計」（原 Preference #5，S05-30）——守則本身已寫入 Master 指令設計自動生效（該教訓自述之機制即為永久修復），非需記憶提醒的操作紀律，退役騰出額度給本次新教訓（3D打印v0範圍降級決策）。
>
> 📌 **退役**（Session 161，`/commit` Lesson Distillation，全檔滿52條超50上限）：①「n8n PUT credential ID已知可直接補回」（原 Pattern #10，Session 111）——單一 credential 修復episode 早已結案，無持續復發風險；②「付款 split UX 清空/污染雙雷」（原 Pitfall #12，Session 97/107）——`_fhsPaymentSyncing` guard 已是結構性永久修復，機制本身即防護，非需記憶提醒的操作紀律；③「cl-flow A2 模型策略統一 gemini-3.5-flash」（原 Preference #6，Session 05-30）——env-var 切換機制本身已是慣例基礎設施，該教訓已內化於機制設計。三項退役騰出額度給本次新教訓（3D打印鎖匙扣生產規格）。

> 📌 **退役**（Session 154/S148，Phase 0 `/fhs-slim`，全檔滿51條超50上限）：「Toggle 按鈕用動作語義」（原 Preference #10，S126）——已是本專案 POS UI 的設計慣例，無需靠記憶提醒，窄場景低復發風險，退役騰出額度給 S148 Phase 2 改寫 Pitfall #26 的空間。
>
> 📌 **退役**（Session 166，`/fhs-slim` 觸發，全檔滿51條超50上限）：「橋接版禁止含邏輯」（原 Preference #3，S05-19）——該規則已升格為治理層成文規則，完整定義見 `.fhs/notes/SOP_NOW.md` §同步更新規則第2點，不再需要於此重複記錄（比照 Session 136 kgov 退役先例）。
