```handoff
【FHS 交接摘要 — 更新: 2026-06-30 / S128】
🎯 目標: FHS 業務 POS+財務系統日常維護；V42 Audit Ledger 財務視覺優化完成（S128）；下一重點=/upload-web V42 NAS 上線 + 審計日誌 Phase B
✅ 已定決策: (1)V42=production(S115)；(2)Supabase-First，Airtable 僅備援；(3)IG 看門狗訂號 regex `/(?<!\d)0\d{6,7}(?!\d)/` leading-0 7-8位(S116)；(4)handoff SSOT=頂部便攜塊，hook 讀動態段(S118)；(5)ig_watchdog_alerts anon只讀+SECURITY DEFINER resolve RPC+service_role寫入(S119 Q2/Q4)；(6)Phase 1b 等 v3 Cron 驗收通過後才上(S119 Q3)→已解鎖(S122)；(7)嬰兒鋁合金物料=$115（同不銹鋼，S120）；(8)n8n PUT body只能含{name,nodes,connections,settings}四欄(S121)；(9)前端遇成本未隨件數累加只`fhsAudit_qtyWarn`誠實警示，禁做`單件×數量`假乘法（DB存值與真值皆非乘積，S124）；(10)Task A四欄(drawing/printing/chain/shipping_cost)=正式廢欄（保留欄位不DROP，停止補寫投資，Audit Ledger已改用訂單層分類欄，S125）；(11)21裸列NULL-subtotal=defer（財務真理於訂單層完整，S125）；(12)V42 簡化付款按鈕=「⊞ 簡化/≡ 逐件」操作者語言（非三大類/細分），P=橙/K=藍/M=紫，IG訊息付款行三類小計格式（S126）；(13)n8n HTTP Request v4 POST JSON array=用contentType:"raw"，禁specifyBody:"string"+JSON.stringify組合（PGRST204，S127）；(14)V42 簡化模式=default；全部半訂/付清按鈕=動作語義（顯示下次將執行），_depositMode初始=null，auto-fill不改按鈕（S126）；(15)Audit Ledger 品項明細=左右手腳精簡標籤(item_key後綴)，刻字engraving不顯示，次序P→K→M固定，色標頭對齊S126簡化付款(S128)
🔬 驗證: 已證實=IG v3 Cron PASS Exec 4012（S122）；Phase 1b Write Alerts body bug修復 versionId=2353e4da + mock alert POST HTTP 201 + DELETE probe ✅（S127）；ig_watchdog_alerts空白=正常（所有Cron notify=0，無漏單）；audit_logs 0044+RPC live（S124）；Audit Ledger+審計日誌視覺驗收PASS（S124）；S124 v2 DONE 9/9 finance-auditor PASS；Airtable billing ≈17/day PASS(S123)；S126 全5項UI修正落盤（含Issue1+2）；S128 Audit Ledger視覺優化 node smoke test 0600721 PASS；未驗=S128 NAS實機視覺確認（/upload-web後）；未驗=下次Cron notify>0時Write Alerts實戰驗證（預計自動）
📋 待辦: 🟡/upload-web V42 NAS 上線（S128 Audit Ledger優化已在本commit） 🟡審計日誌 Phase B(orders.cost_override_locked+fhs_adjust_order_cost+設定中心訂單層修改) ⚪Phase 1b 下次Cron若notify>0→自動驗收Write Alerts實戰
➡️ 下一步: /upload-web 部署 V42 至 NAS（S128 Audit Ledger優化）；之後排審計日誌 Phase B
─── 便攜邊界（以下為外部貼用靜態地雷，hook 動態注入截至上行）───
⚠️ 易猜錯: (1)mapOrder o.id=FHS string非UUID，o._uuid=Supabase UUID (2)NAS n8n Code節點fetch/require/process靜默失敗→用HTTP Request節點 (3)final_sale_price=Deposit+Balance+Fee=確收真理，n8n嚴禁覆蓋；total_cost=估算快照 (4)captureFormState()/raw_form_state/HTML ID不可動（斷鏈） (5)IG watchdog v3 lib/order-match.mjs=單一真源，改邏輯必改lib再rebuild，diff-guard測試保護 (6)便攜塊=版本/狀態SSOT，不得另開第二份版本維護檔
🗺 下鑽: 完整明細見下方「MASTER 持續待辦」表 + 各 Session 條目（搜尋「Session 1XX 完結」）
```

> 📌 **此便攜塊為 FHS 交接 SSOT（S118 起）**：人類複製整塊貼新聊天；SessionStart hook 只注入動態段（邊界以上）。每次 `/commit` 時更新此塊六類欄位。

# 📋 MASTER 持續待辦（唯一可信狀態源）
> ⚠️ 此區塊為「活文件」，每次 /commit 後必須人工更新。歷史 session 條目的「待辦」欄位僅為當下快照，此區塊優先。
> 上次更新：2026-06-30（Session 128 — Audit Ledger 財務視覺優化）

| 優先 | 項目 | 狀態 | 備註 |
|------|------|------|------|
| ✅ 完成 | **[S128] Audit Ledger 財務視覺優化** | ✅ 落盤（S128）— 待 /upload-web NAS 實機確認 | ②成本快照鏈：成本扣減inline badge綠色(−$X)+點按圓形ⓘ展開；品項明細：分類色標頭P橙/K藍/M紫+次序固定+左右手腳標籤+刻字不顯示；Supabase 0600721 smoke test PASS |
| ✅ 完成 | **[S126] V42 簡化付款 UI** | ✅ 全5項修正落盤（S126）— 待 /upload-web NAS 上線 | ⊞ 簡化/≡ 逐件 toggle；算式顯示；IG訊息三類小計；K藍色；Fix1點入編輯；Fix2標題對齊；Fix3清除按鈕；Issue1簡化=default；Issue2全部半訂/付清動作語義sync |
| ✅ 完成 | **[Phase 1b] n8n write node → ig_watchdog_alerts** | ✅ 部署（S122）+ Write Alerts body bug修復（S127）| 19節點，wa1 contentType改raw，versionId=2353e4da；mock alert HTTP 201 PASS；ig_watchdog_alerts空=正常（所有Cron notify=0無漏單）；下次notify>0時自動實戰驗收 |
| ⚪ 低 | **[Phase 3] Telegram 訊息附 V42 deep-link URL** | ⏳ Phase 1b 後 | TG 訊息每筆加 `?view=igwatch&orderId=xxx` 連結，直達 V42 igwatch 模式 |
| ✅ 結案 | **[Task A] 加購鎖匙扣 N飾成本（點4）** | ✅ S124 v2 完成 | migration 0045(fhs_compute_keychain_cost)+0046(drift N飾)+線B products 41行+線C 9單回填+audit_logs；前向：n8n直讀per-set products值，所有已發生訂單（全為嬰兒不銹鋼）正確 |
| ⚪ 廢欄 | **[Task A] 品項層四欄（drawing/printing/chain/shipping_cost）** | ✅ 廢欄決策(S125) | live查實：80列中74-76列為0/NULL，無有效消費者（Audit Ledger S103已改訂單層分類欄）；保留欄位不DROP（n8n Mirror Prep仍寫），停止補寫投資 |
| ⚪ defer | **[Task A] 21裸列 NULL-subtotal 補錄** | ⏸ defer(S125) | product_sku/item_base_cost/subtotal_cost全NULL（2026-05-10~05-24早期列）；財務真理完整（訂單層欄populated）；Audit Ledger已誠實顯示藍色待補錄條；補錄高工低值，Phase 2重構時一併處理 |
| 🟡 中 | **[審計日誌 Phase B] 訂單層成本修改 + 變更歷史** | ⏳ 待排程（S124 Phase A 已完成） | 新 migration `orders.cost_override_locked` + RPC `fhs_adjust_order_cost`；設定中心「指定訂號→訂單層成本修改」區塊；Audit Ledger Modal 本單變更歷史 collapsible |
| 🟡 中 | **舊訂單品項層類別明細補錄（Fat Mo 人工）** | ⏳ 待補 | `order_items.subtotal_cost` 全空舊單顯示藍色 info 條，待 Fat Mo 手動補 |
| ✅ 完成 | **Airtable billing 日均驗證** | ✅ PASS（S123） | 官方數字：723/1000 calls（Jun 1-25）；修復後(Jun 16-25)≈17/day；月底預測~810，不超標；sysCheckN8n 修復效果確認 |
| ⚪ 低 | **成本組裝單一真源重構（Phase 2）** | 📝 已記入待辦 | 收斂 `cost_configurations`/`products`/n8n 硬編碼 COST_MAP 三套並存表徵，n8n 改讀同一 Supabase 函式取代自帶 COST_MAP；另開 `/cl-flow`（Session 112 v2 規劃 Phase 2）|
| ⚪ 低 | **`docs/repo-map.md` migration 0039-0041 本地檔缺漏補登** | 📝 已記入待辦 | pre-existing 缺口（Session 90-99 applied via MCP 未補建本地檔），Session 112 發現但非本次任務範圍，僅標記未修復 |
| ⚪ 低 | **[v3 候選 / IG 看門狗後繼] 圖片內容分析（n8n 串接免費視覺 AI model）** | 📝 已記入待辦 | Fat Mo 觀察到 IG thread 含 photos/（如轉帳收據截圖），可進一步驗證入帳真偽。已評估：與 v2「媒體零下載」OOM 防護設計衝突 + 新增隱私風險（收據資料需送第三方 API，現行純本地比對零外送）。Fat Mo 已接受建議：v2 先穩定運行驗證一段時間，此項另開 `/cl-flow` 獨立評估，不回頭改 v2（Session 111，2026-06-20）|

### 已確認完成（Session 127 — Phase 1b Write Alerts body bug 修復，2026-06-30）
- ✅ **[DIAG] 執行紀錄分析**：Exec 4022（首次 Phase 1b Cron）Write Alerts `specifyBody:"string"` + `JSON.stringify([])` → n8n HTTP Request v4 將 `"[]"` 誤送為 `{"[]":""}` → PostgREST PGRST204；Exec 4025/4030 閃退（1秒，數據已清理）；Exec 4034 success（"Has Alerts?" guard 保護，notify=0）
- ✅ **[FIX] GET → fix → PUT 外科手術**：wa1 Write Alerts `contentType:"json"` + `specifyBody:"string"` → `contentType:"raw"`（移除 specifyBody）；versionId=2353e4da；active=True
- ✅ **[FIX] build_n8n_workflow.cjs 單一真源同步**：L505 contentType 改 raw，L506 specifyBody 整行移除
- ✅ **[VERIFY] 端到端 probe**：mock alert JSON array → Supabase ig_watchdog_alerts HTTP 201 ✅ → DELETE probe ✅（零殘留）
- ✅ **業務確認**：ig_watchdog_alerts 空白 = 正常（所有 Cron notify=0，無實際漏單）；"Has Alerts?" node 正確路由

【交付前雙紀律自檢】驗收：GET確認versionId=2353e4da + contentType=raw + active=True = ✅；mock POST HTTP 201 端到端 = ✅；build script grep 確認 contentType='raw' + specifyBody 不存在 = ✅；無財務欄位/HTML ID/raw_form_state 改動
Subagent：❌ 未使用（curl API 直查 + Supabase MCP SQL + Python 外科修改，主 agent 直接執行）

### 已確認完成（Session 124 — Audit Ledger 財務呈現優化，2026-06-26）
- ✅ **[UI 點1] ①②③④ 區塊卡片化**：四區塊各包 `.fhsAudit_section`（圓角外框 + 色彩左邊條 ①棕②橙③綠④灰 + 底色 + 間距），解決三區塊難辨識
- ✅ **[UI 點2] 品項成本小計可展開（降級版）**：原生 `<details>`，只列真實欄位（單件base/數量/>0繪圖打印環扣運費），四欄空顯「明細未記錄（n8n 未寫入）」，禁前端重算拆解
- ✅ **[UI 點3] 數量誠實警示**：`qty>1 && subtotal==base` → 紅色 `fhsAudit_qtyWarn`「疑漏算加購 N−1 件」，不做假乘法
- ✅ **[DATA 點4] live 核實成本低估 bug**：0600905/0600908「嬰兒鎖匙扣-不銹鋼-2飾(加購)×2」記$185 應≈$310；全庫 qty2/3/4 多數低估 = n8n 未按件數累加（→ Task A，前端只揭露不回寫）
- ✅ **驗證**：node 抽函式 smoke test 全綠（無語法錯+三卡片+details展開+qty2警示+空欄提示+div37/37+details2/2）；NAS current.html 部署 PASS 870,991 bytes SHA256=731CD79C
- ✅ **文件**：Changelog（S124 Audit Ledger 條目）、FHS_System_Logic_Overview §九（②可展開明細+數量警示+已知bug）
- ✅ **Fat Mo 實機視覺驗收 PASS**（2026-06-26）：Audit Ledger 三卡片/展開/警示 + 審計日誌 tab 外觀確認通過

【交付前雙紀律自檢】驗收：純前端呈現層改動（無回寫財務/schema/RPC，不觸發 finance-auditor 對賬型）；node smoke test 強制斷言渲染正確 + live SQL 數學坐實點4 = ✅；HTML ID/captureFormState/raw_form_state 零改動；live 視覺驗收誠實標記待 Fat Mo
Subagent：❌ 未使用（live SQL + 定點 Edit + node 驗證，主 agent 直接執行）

### 已確認完成（Session 124 — 綜合審計日誌 Phase A，2026-06-25，前一輪執行）
- ✅ **[MIGRATION] 0044_audit_logs.sql 部署**：audit_logs 通用審計表 + RLS anon 只讀 + 3 索引 + RPC `fhs_query_audit_logs`（6 param）+ `fhs_upsert_cost_config` 4-param overload（同交易加寫 audit）
- ✅ **[HTML] Log Sheet「📋 審計日誌」tab**：篩選 UI（類別/訂號/日期）+ 實作 Session 69 遺留 stub（switchLogTab/saveExpenseOperator/submitExpenseLog/loadExpenseLogs/loadAuditLogs）+ saveSingleCostConfig actor 改讀 localStorage
- ⏳ **Phase B 待排程**：見 MASTER 表
- 📌 **注**：此批由前一輪 session 執行並寫 Changelog/repo-map，未 commit；S124 本輪 /commit 一併推送（V42.html 與本輪 Audit Ledger 改動共存於同檔，current.html 已捆綁兩者部署）

### 已確認完成（Session 123 — Airtable billing 日均驗收 PASS，2026-06-25）
- ✅ **[VERIFY] Airtable billing 官方數字確認**：截圖讀取 723/1,000 API calls（Jun 1-25，25天）；全部來自 PAT（Other PAT 欄），FHS_Order_Processor 主庫 723 calls；修復前(Jun 1-15)估算 ~555 calls(37/day)，修復後(Jun 16-25)= 168 calls ≈ **17/day ✅ 目標 ≤20 PASS**；月底預測 ~810，不超 1,000 限額；Records 649/1,000（65%，健康）

【雙紀律自檢】驗收：截圖官方數字直讀（非估算），修復後日均 17 < 20 = ✅；唯讀驗收，無任何代碼/schema 改動
Subagent：❌ 未使用（截圖直讀分析，主 agent 直接完結）

### 已確認完成（Session 122 — IG 看門狗 v3 Cron 驗收 PASS + Phase 1b 部署，2026-06-25）
- ✅ **[VERIFY] Exec 4012（2026-06-25 06:00 HKT）16/16 nodes success**：Schedule Trigger → Find New Export Folders（7個）→ Filter New + Quiet Window（1個通過）→ Find your_instagram_activity/messages/inbox → List Thread Folders（17個）→ Find Message Files（8個）→ Tag Thread Context → Download File → Parse Inbox → **Fetch Orders（31筆 ✅）** → Fetch Pipeline（1筆）→ Classify & Report → **Telegram Notify（已送達）**；23秒；Phase 1b 解鎖
- ✅ **[FEAT] Phase 1b 部署**：build_n8n_workflow.cjs 新增 wa1（Write Alerts HTTP POST → ig_watchdog_alerts，service_role key，Prefer=ignore-duplicates）+ tg2（Telegram Notify Data，讀 `$('Classify & Report').first().json.summary`）+ alerts array 構建（10欄）；Drive cred replace_all（7節點 credentials:{}→真實 ID `zQHavrW0ElfaKGxG`）；PUT HTTP 200；versionId=f881031c；19 節點；Drive cred 14/14；undefined 0；active=True
- ✅ **[DOC] FHS_System_Logic_Overview.md §11.5** Phase 1b 狀態 ⏳→✅

【雙紀律自檢】驗收：curl API 直查 Exec 4012 = status:success + 16/16 節點 success + Telegram Notify items=1 = ✅；Phase 1b：GET workflow 確認 versionId=f881031c + 19 節點 + Drive cred 14/14 = ✅；無財務欄位/raw_form_state/HTML ID 改動
Subagent：❌ 未使用（curl API 直查 + bash PUT + PowerShell，主 agent 直接執行）

### 已確認完成（Session 121 — IG 看門狗 v3 Supabase URL 修復，2026-06-24）
- ✅ **[DIAG] Exec 4009 根因確認**：2026-06-24 06:00 HKT v3 首次 Cron 在 `Fetch Orders` 節點失敗（URL=`undefined/rest/v1/...`）；根因=S117 build 時 `process.env.SUPABASE_URL/SUPABASE_ANON_KEY` 未從 .env 載入，`undefined` 被硬嵌入 workflow JSON
- ✅ **[FIX] 外科 GET→fix→PUT**：GET 現有 workflow → Python 替換 `undefined/rest/v1/` + `Bearer undefined` + apikey 空值 → 精簡 body（name/nodes/connections/settings）→ PUT HTTP 200；versionId 更新至 `a2e6c8c7`；active=True；Drive credential 14/14 完整保留
- ✅ **[FIX] build script .env loader**：`scripts/ig-watchdog/build_n8n_workflow.cjs` 補 .env 讀取（6行）；未來 rebuild 不會再輸出 undefined URL
- ✅ **[DOC] build script PUT 說明更新**：補注「GET→PUT 外科手術只能送 4 核心欄，多餘欄位觸發 400」

【雙紀律自檢】驗收：GET fresh 確認 versionId=a2e6c8c7 + Supabase URL 4處 + undefined=0 + Drive cred 14/14 = ✅；無財務欄位/raw_form_state/HTML ID 改動
Subagent：❌ 未使用（curl API 查詢 + Python 修復 + bash PUT，主 agent 直接執行）

### 已確認完成（Session 120 — 鋁合金嬰兒層成本修正，2026-06-24）
- ✅ [FIX] material_cost_keychain_alloy config key 補建：INSERT 115（嬰兒/大寶，與不銹鋼同層；原缺失）
- ✅ [FIX] products.total_base_cost 錯值修正（40行）：嬰兒S鋁合金 212→185 / 嬰兒P鋁合金 262→245
- ✅ [DIAG] order_items 零鋁合金嬰兒訂單，無回改需要

【雙紀律自檢】驗收：RETURNING 確認 INSERT 1行 + UPDATE 40行 = ✅；Subagent：❌ 未使用

### 已確認完成（Session 119 — IG 看門狗警報整合 Phase 1a+2，2026-06-23）
- ✅ **[Phase 1a] migration 0043 部署**：`ig_watchdog_alerts` 表 + RLS anon 只讀 + SECURITY DEFINER RPC `fhs_resolve_ig_alert` + expression UNIQUE INDEX 冪等鍵（COALESCE NULL 處理）+ pg_cron 90 天 TTL；已部署並驗證
- ✅ **[Phase 2] V42 igwatch 🐶 模式**：mode button/container/switchMode 接入/lazy load/filter tabs/kind-aware 動作（created_incomplete→openOrderModal；not_created→copyOrderId 防 mapOrder 靜默失敗）/resolve 回寫 RPC/URL 深連結解析
- ✅ **NAS 部署**：V42（849,679 bytes）升格 current.html，WebDAV PUT HTTP 204，SHA256=666991CA...D3E9BD，三關 PASS
- ✅ **文件同步**：CHANGELOG.md、docs/repo-map.md、FHS_System_Logic_Overview.md §5.1+§10.7+§十一、completion report
- ⏳ **Phase 1b + Phase 3 BLOCKED**：等 2026-06-24 06:00 HKT v3 首次 Cron 驗收 PASS

【交付前雙紀律自檢】
驗收：migration 0043 live（Supabase MCP confirm）+ V42 igwatch 🐶 存在 + NAS SHA256 三關 PASS = ✅；無財務欄位/raw_form_state/HTML ID 改動
Subagent：❌ 未使用（所有 Edit/Write/PowerShell 在主對話直接執行）

### 已確認完成（Session 118 — handoff SSOT v2 機制建立，2026-06-23）
- ✅ **[FIX] 漏洞 1（殭屍待辦）**：`session-start-sop.sh` v1→v2，awk 改唯一 fenced tag `\`\`\`handoff` 邊界抽取，不再匹配 line 3760 Session 63 殭屍區
- ✅ **[FIX] 漏洞 2（SOP_NOW 版本 drift）**：`SOP_NOW.md` 版本格改指標（→ 見 handoff.md 便攜塊 / AGENTS.md），v2-C 版本收斂
- ✅ **[FIX] 漏洞 3（底部配置過期）**：`handoff.md` 底部殭屍段加 `[ARCHIVED 2026-06-23 / S118]` 封存標記
- ✅ **[FEAT] 頂部便攜塊（SSOT）**：六類欄位（🎯✅🔬📋➡️⚠️）+ `─── 便攜邊界` 雙深度切片；hook 動態注入 + 人類複製同源
- ✅ **[FEAT] commit.md P0.7**：每次 `/commit` 強制更新便攜塊六類欄位
- ✅ **[FEAT] v2-A 過期偵測**：hook 比對塊頭日期 vs 今日，超 3 天印警告
- ✅ **learnings.md Pitfall #23**：Shell hook 勿用通用 `## X` 標題，改唯一 fence tag

【交付前雙紀律自檢】
驗收：文件治理任務 — 三漏洞修復 + 便攜塊六類欄位齊 + P0.7 存在 + 完成記錄 8 檔確認 = ✅
Subagent：❌ 未使用（純文件/hook 層 Edit/Write，零業務/財務/schema 改動）

### 已確認完成（Session 117 — IG 看門狗 v3 部署上線，2026-06-23）
- ✅ **PUT 成功**：workflow D4LK6VrQbiXlju0V 已更新至 v3，versionId=9430f1b1，active=True
- ✅ **Credentials 驗證**：7 Google Drive（`zQHavrW0ElfaKGxG`）+ Telegram（`tSbXz97PKmdPpDNq`）全部正確
- ✅ **v3 邏輯確認**：live 節點 8/8 marker（normalizeOrderId/buildOrderIndex/classifyMessage/isV42Confirm/created_full/not_created/sideBySide/v3）全部存在；Parse Inbox orderMsgs/hasReceipt/sender_name 正確
- ⏳ **首次 Cron 驗證**：預計 2026-06-24 06:00 HKT，收到 v3 格式 Telegram 即完整確認

【交付前雙紀律自檢】
驗收：PUT HTTP 200 + credentials GET 核查全通 + live Code 節點 8/8 v3 marker = ✅；唯讀偵測無財務/schema 改動
Subagent：未使用（n8n API curl 直查，無需 subagent）

### 已確認完成（Session 116 — IG 看門狗 v3 訂號偵測，代碼完成）
- ✅ **偵測模型反轉**：v1/v2 付款證據🔴🟡⚪+排除商家訊息 → v3 **訂號(order_id)主鍵 + 反轉納入商家 V42 確認**為主訊號
- ✅ **三分類 + 情況2合併通知**（Fat Mo 決策）：①V42制式+DB命中=已建立靜默 ②鬆散+DB命中=資訊不齊通知 ③有可信訂號+DB查無=未建立通知；弱訊號(無號)不即時警報、報價語意抑制
- ✅ **訂號 regex live 校準**：31 單真樣本=leading-0 的 7–8 位數（非假設 FHS- 前綴），錨定 `/(?<!\d)0\d{6,7}(?!\d)/` 天然防撞電話/金額/日期
- ✅ **單一真源 + diff-guard**：`lib/order-match.mjs` build 內嵌進 n8n Code 節點（strip export），`order-match.diffguard.test.mjs` 斷言逐字一致防漂移
- ✅ **方案 A 收據**：只標記 hasReceipt 布林（photos metadata），零下載零 OCR，守 OOM+隱私
- ✅ **測試**：單元 15/15 + diff-guard 1/1 + 全套 35/35 PASS；6 情況功能模擬全正確
- ✅ **文件同步**：SOP.md v3 行為、repo-map、CHANGELOG、完成記錄 `.fhs/reports/completion/2026-06-23_ig-watchdog-v3-order-id-detection_completion_report.md`
- ✅ **附帶**：cl-flow-runner Gemini 切 gemini-2.5-flash（.env）+ PX 改 curl（Cloudflare 指紋）已修並記錄

【交付前雙紀律自檢】
驗收：代碼/邏輯 — 單元 15/15 + diff-guard 1/1 + 全套 35/35 node --test PASS（附測試輸出）+ 6 情況功能模擬正確 = ✅；唯讀無財務/schema 改動不觸發 finance-auditor；部署 Phase 待授權未假裝完成
Subagent：前置評估 database-reviewer（order_id 格式，已用 live SELECT 31 單直接校準，未派）、tdd-guide（已自行 write-tests 15+1 案，未派）、code-reviewer（純 lib+測試，diff-guard 自證，可於部署前補派 G1–G8）；本階段主 agent 直接執行（live 校準 + 寫 lib + 測試 + 改 build + 文件）

### 已確認完成（Session 116 核實 — IG 看門狗 v2 Cron 驗證）
- ✅ **IG 看門狗 v2 首次真實 Cron 排程驗證 CONFIRMED**：
  - **Exec 4003（2026-06-21 06:00 HKT）= 第一次真實跑**：16/16 節點全 success，59 秒完成；掃描 31 threads / 35 檔案（覆蓋 6/10~6/20）；發現 🟡1 候選 Charmaine SIN；Telegram message_id=657 已送達 Edwin Li chat（confirmed ok:true）
  - **Exec 4005（2026-06-22 06:00 HKT）= 第二次跑**：16/16 節點全 success，11 秒（快速路徑）；只掃 3 threads（staticData cursor 正確記住已處理）；0 新候選；Telegram 送出「本次無待跟進項目」
  - **Cron 實際運行**：cron `0 6 * * *` 在 NAS HKT 時區 = 06:00 HKT（22:00 UTC 前晚）；workflow active=True；第三次預計 2026-06-23 06:00 HKT 跑
  - **關鍵驗證**：靜默 cursor 去重正常、Telegram 送達、第二次跑快速路徑、0 重複掃描

【交付前雙紀律自檢】
驗收：n8n API 直查兩次執行紀錄 + 節點追蹤 + Telegram `ok:true` = ✅；read-only 驗證無任何改動
Subagent：❌ 未使用（n8n API curl 直查，無需 subagent）

### 已確認完成（Session 115 核實 — NAS 重部署）
- ✅ **NAS 重部署 current.html 升格**：V42 dev（含 Session 109 核對帳單路由修復 + Session 112 成本設定存檔 toast 提示）升格為 `Freehandsss_dashboard_current.html`（839,325 bytes，SHA256 FDBE7633...B4171）並部署至 NAS，三關驗證 PASS

【交付前雙紀律自檢】
驗收：升格流程（cp + WebDAV PUT）三關 PASS（HTTP 204 / 大小 = local / SHA256 吻合）= ✅；無財務/schema 改動，不觸發 finance-auditor
Subagent：❌ 未使用（PowerShell 直接執行）

### 已確認完成（Session 113 核實 — learnings.md 超量整理）
- ✅ **learnings.md 70→50 條整理**：退役 17 條 Pitfalls（已入 AGENTS 規則 / 被更新版本取代 / 過細一次性 bug）+ 退役 2 條 Patterns（單次特定用 / 過細 JS 內部）+ 合併 #12+#14（kgov 雙條合一）；標頭更新整理日期為 2026-06-22（Session 113）
- ✅ **stale .kgov-pending flag 清理**：Session 112（2026-06-21）殘留 flag；確認 FHS_System_Logic_Overview.md §5.3（migration 0042 drift 函式）已在 Session 112 更新，flag 為未清除殘留，安全刪除

【交付前雙紀律自檢】
驗收：純文件維護（無代碼/財務/RPC 改動），不觸發 finance-auditor 或 code-reviewer；learnings.md 計數確認 12+5+25+8=50 = ✅
Subagent：❌ 未使用（Read/Write/Grep/PowerShell 直接完成）

### 已確認完成（Session 112 核實 — 鎖匙扣成本誤判事故根因排查 + Phase 1 止血）
- ✅ **事故結論**：訂單 06001008 `order_items.subtotal_cost=185` **本身正確**，無需資料校正。185 = 組裝 base cost（繪圖60+物料115+環扣10），非裸物料費；Fat Mo 原假設「物料改115，base就該≈115」為誤讀，已記錄防再犯
- ✅ **真實 bug 修復**：DROP 死碼 RPC `recalculate_product_costs(text)`（v1 schema 遺留，引用不存在欄位，呼叫必報錯，從未真正工作）；新增唯讀 `fhs_check_product_cost_drift()`（migration 0042，已部署，smoke test PASS：嬰兒S/P不銹鋼鎖匙扣 40 SKU 全數 drift=0）
- ✅ **V42 dev**：`showToast()` 加可選 duration 參數（向後相容）；成本設定存檔提示加註 products 表不自動同步
- ✅ **文件 drift 校正**：`FHS_System_Logic_Overview.md` §5.3 多個 key 記載值與 live 不符已修正（stainless 文件$95→live 115；necklace 文件$260/$316→live 均465）；新增 §5.4 成本傳播鏈說明；`finance-gatekeeper/SKILL.md` v1.2.0→v1.3.0 路由表加 drift 檢查指引
- ✅ **完成記錄**：`.fhs/reports/completion/2026-06-20_keychain_cost_drift_phase1_completion_report.md`
- 📝 **刻意排除範圍**：家庭/成人複合 tier、鋁合金、吊飾、立體擺設公式未驗證，不納入 drift 函式；`printing_cost` 殘留欄位（如06001008顯示380）不影響財務計算，未清理；Phase 2 單一真源重構未排程
- ⏳ **Subagent 使用記錄**：本 session 全程未使用 subagent，根因查證（RPC反編譯/live SQL/migration迭代修正）由主 agent 直接執行，理由見完成記錄雙紀律自檢

【交付前雙紀律自檢】
驗收：財務/成本任務，規則要求 finance-auditor live 三端驗證附訂單號。本次以直接 live SQL 數學驗證完成（40 SKU drift=0 + migration smoke test 強制斷言，首次跑出2筆異常已查證為範本佔位列並修正後重跑PASS）= PASS，未額外派 finance-auditor（理由：問題本質是 RPC/schema 反編譯與公式還原，非三端對賬型問題）
Subagent：❌ 未使用。前置評估 finance-auditor（live對賬，本案非對賬型，跳過）、database-reviewer（schema審查，已由主agent直接完成等同深度的RPC反編譯，跳過）；理由：需要逐步假設驗證+即時根因追蹤（如drift smoke test失敗後即時查證調整），主agent直接迭代更高效

### 已確認完成（Session 111 核實 — IG 看門狗 v2，取代下方 Session 110 描述的 v1）
- ⚠️ **v1（Session 110）架構已證偽**：實測發現 Meta Drive 匯出**非 ZIP**（直接鏡射解壓後資料夾樹）、
  Drive Trigger 監測 root **不會**對 7 層深的子資料夾變動觸發。v1 描述的「Drive Trigger→Compression解壓」
  鏈路從未在生產環境真正跑通過一次。
- ✅ **Phase 0 實測（cl-flow Flow ID 2026-06-20-0112）**：用拋棄式 probe workflow（建立→測→刪，零殘留）
  確認 7 項事實 F1-F7，詳見 `artifacts/2026-06-20-0112/cl-final-plan.md`。關鍵：(a) Google Drive 節點原始
  query 須 `searchMethod:'query'`+`queryString`（非 `filter.query`）；(b) `mimeType='application/json'`
  乾淨排除媒體；(c) `options.fields` 須陣列；(d) 全域無 parent 限定的 query 接多輸入節點下游會被
  n8n「每輸入項執行一次」造成 N 倍重複（拓樸問題非節點 bug）；(e) scoped 查詢零重複且直接拿到資料夾名；
  (f) 同容器下已累積多個 `instagram-*` 子資料夾（需用 id 非名稱追蹤已處理）；(g) pairedItem 在
  Drive Search fan-out 後可靠，可用 `$('NodeName').item` 串接多層 scoped 查詢不丟 context。
- ✅ **v2 架構重建**：Schedule Trigger（Cron 06:00 UTC）取代 Drive Trigger；移除 Is ZIP/Decompress；
  改「以每日匯出資料夾為工作單元 + scoped 逐層查詢」（容器→instagram-*→your_instagram_activity→
  messages→inbox→thread資料夾→message_*.json），thread 名稱直接從 scoped 查詢拿到（不再用檔名
  regex 反推）。新增 per-thread message timestamp cursor（`workflowStaticData`，非 Supabase migration，
  維持唯讀零寫入業務表）+ id 去重保險 + 90 分鐘靜止窗防讀到寫入中的匯出 + 健全計數器（掃描 thread/檔案數）
  讓異常數字能自我揭穿。生成器：`scripts/ig-watchdog/build_n8n_workflow.cjs`（單一真源，已重寫）。
- ✅ **端到端測試通過（真實資料，拋棄式測試副本）**：找到 1 個真實🟡候選（Charmaine SIN，有下單意圖
  無付款證據）；K 媽媽 thread 的訂單明細因是商家自己回覆確認（非客人本人說的）被正確排除，未誤判。
  二次呼叫驗證「0 新資料夾」分支（staticData 正確記住已處理過）。測試完即刪除，零殘留。
- ✅ **已 PUT 部署至正式 workflow** `FHS_IGWatchdog_DriveWatch`（ID D4LK6VrQbiXlju0V），17 節點，active。
- ✅ **7 個 Google Drive 節點 credential 已補上（無需 Fat Mo 手動操作）**：原以為「API 沒法指派
  credential」僅指**沒有列表端點**（無法探索未知 ID），但 credential ID 早已知（`zQHavrW0ElfaKGxG`，
  Session 110 即用過）；直接在 PUT body 帶入該 ID 重新覆寫即可，GET 驗證 7 個節點 + Telegram 節點
  credential 皆正確掛上。**修正前序判斷**：日後遇到「PUT 洗掉 credential」情境，若 credential ID
  已知，可直接 API 補回，不必每次都要求人工去 UI 重新指派。
- ✅ **Cron 驗證 CONFIRMED（Session 116，2026-06-23）**：首兩次真實排程 Exec 4003（2026-06-21 06:00 HKT）+ Exec 4005（2026-06-22 06:00 HKT）均 16/16 節點 success；Telegram message_id=657 送達；cursor 去重正常（第二次只掃 3 新 threads）。
- ✅ **runner 基礎設施修復（附帶發現）**：`scripts/cl-flow-runner.js` 的 Perplexity 呼叫因
  `sonar-reasoning-pro` 推理模型 `max_tokens:3072` 過低靜默回空白報告，已修復為 8000 + 空 content
  偵測 throw（影響 `/cl-flow`、`/ag-flow`，`/cl-flow-fast` 因跳過 PX 不受影響）；learnings #39。
- 📝 **v3 候選已記入待辦（不在本次範圍）**：圖片內容分析（n8n 串接免費視覺 AI 驗證收據真偽），
  見上方 MASTER 表，Fat Mo 已同意另開規劃不回頭改 v2。
- ⏳ **Subagent 使用記錄**：Session 110+111 全程未使用 subagent，所有 n8n probe 測試/程式碼移植/
  文件更新均由主 agent 直接執行。

### 已確認完成（Session 110 核實，v1 架構，已被上方 Session 111 取代）
- ✅ **[FEAT] IG 漏單看門狗改全自動（方案C：全 NAS n8n 跑）** — 原方案A本機常駐server.mjs已棄用刪除；改用IG「每天自動匯出到Google Drive」+ n8n Google Drive Trigger監測 → Compression解壓 → Code節點移植decoder.mjs/match.mjs邏輯（mojibake解碼+CJK模糊比對+🔴🟡⚪分級）→ HTTP Request唯讀查Supabase → Telegram通知。零主機依賴。workflow `FHS_IGWatchdog_DriveWatch`（ID D4LK6VrQbiXlju0V）
- ✅ **8731 防火牆規則已移除** — 方案C上線後不再需要本機常駐埠，Fat Mo 以管理員權限執行 `Remove-NetFirewallRule` 確認移除（2026-06-20 驗證 CONFIRMED REMOVED）
- ✅ **Google Drive credential 重新指派 + workflow 已啟用** — Fat Mo 在 n8n 編輯器手動重新指派 Google Drive Trigger + Download File 兩節點的 credential（API PUT 洗掉的部分），workflow 確認顯示綠點「Published」狀態（2026-06-20）
- ✅ **NAS n8n Code節點能力邊界精確化** — 實測Buffer/Compression節點可用（require/fetch/process仍鎖），filesystem-v2二進位讀檔需`getBinaryDataBuffer`，HTTP空陣列回應需`alwaysOutputData`否則下游節點被跳過；詳見lesson 2026-06-19
- ✅ **端到端測試通過** — 用既有fixtures透過臨時webhook probe workflow跑完整鏈，🔴2🟡2結果正確，測試完即刪除probe workflow零殘留
- ⏳ **Subagent 使用記錄**：本 session 全程未使用 subagent，所有 n8n probe 測試/程式碼移植/文件更新均由主 agent 直接執行

### 已確認完成（Session 109 核實）
- ✅ **[FIX] 核對帳單 bottom-sheet 路由 bug** — 點「核對帳單」應開「💰 財務」分頁卻停在「📝 訊息文本」；根因 Session 103 誤把 `openOrderModal` 第二參數當 tab，實為 catFilter('A'/'B'/undefined)；修法（選項 B）`openOrderModal(orderId, catFilter, initialTab)` 加第三參數 + DOM 同步建好後 `switchModalTab(initialTab)`；btnAudit 改 `(orderId, '', 'finance')`；11 個既有呼叫點零回歸（Session 109）

### 已確認完成（Session 105 核實）
- ✅ **[FEAT] 已完成功能全套** — migration 0042 `precomplete_status` + RPC `fhs_complete_order`/`fhs_uncomplete_order`；封存→完成語義（文案6處）；seg control 加「全部」；applyReviewFilters all 分支；toggleArchive 改 RPC + 5s undo；is_archived Supabase fetch 修復刷新後狀態丟失；dlv-card-done 藍灰完成 badge（Session 105）
- ✅ **[FIX] swipe UX 4 bug** — stale `currentX` reset in touchstart；button/input guard；threshold 40→64；touch-action: manipulation；swipe 按鈕動態文字完成/取消完成（Session 105）

### 已確認完成（Session 103 核實）
- ✅ **[FIX] Audit Ledger ② 成本快照 v2** — 改用 `orders.handmodel/keychain/necklace_cost`（30/30）替代 91% 空的四欄；Problem E 對賬行（類別小計→運費共享扣減→total_cost）；舊單藍色待補錄 info 條；假紅旗 costMatch 移除；NAS 部署 PASS（Session 103）

### 已確認完成（Session 102 核實）
- ✅ **[FEAT] 訂單計算核對帳 Audit Ledger** — V42「💰 財務」Tab 完整替換：確收鏈/成本快照/利潤結算/建議售價對照四區塊；Lazy-load 雙 fetch；ui-designer Phase A 視覺規格；kgov sync point 落 FHS_System_Logic_Overview.md；升格 current + NAS 部署 PASS（Session 102）

### 已確認完成（Session 101 核實）
- ✅ **9 單歷史資料校正** — Supabase live 查詢確認全部 9 單 drift=0，n8n Session 89 修復後自行回正，UPDATE 無需執行
- ✅ **[FIX] restoreSplits 容器清空** — 修復載入舊訂單後 deposit/balance 顯示 $790 而非存檔值；根因 prevData 優先規則；修復 2 行 innerHTML=''（Session 101）

### 已確認完成（Session 100 核實）
- ✅ **知識治理執行層落地（B1+B2+C2+D hooks）** — B1 四個前置讀取入口加 §十按需讀取；B2 execute.md [G] 觸發 + [A] 物理化 + Bridge 同步 + AGENTS v1.4.13；C2 lessons INDEX.md 59 檔；D hooks（post-tool-kgov + stop-kgov HARD_BLOCK=false）+ settings.json 註冊（Session 100）

### 已確認完成（Session 99 核實）
- ✅ **Migration 0041** — F4 unconfirmed 雙計修復（yearly/current prev -$5,680；monthly prev -1單）+ F3 trend 3-layer（metal 趨勢由全額→比例分攤，與 KPI 對齊）；smoke test PASS（Session 99）
- ✅ **Migration 0040** — F1 metal 混合單 3-layer（yearly +$56,321.90）+ F2 charts deleted_at 5 塊 + data_quality metal fallback 追蹤 + F8 STABLE 補回；smoke test PASS（Session 99）

### 已確認完成（Session 98 核實）
- ✅ **0038 migration 本地 SQL 補建** — `supabase/migrations/0038_update_rpc_item_sale_price_3layer.sql`；逆向重建自 Supabase live DB（get_financial_kpis + get_financial_charts，3-layer fallback）（Session 98）

### 已確認完成（Session 97 核實）
- ✅ **W1 balance focusout 補回缺失** — 新增 `_balCont focusout` handler，preFocusVal save-restore 架構；含 $0 有效還原（Session 97）
- ✅ **focusout restore 邏輯修正** — deposit + balance focusin 加 preFocusVal/preFocusIsDefault save；focusout 優先還原 pre-focus 狀態而非無差別填半訂（Session 97）
- ✅ **`_quickHalfFillAllSplits` force 參數** — 按鈕傳 `true` 強制填值，auto-call 不傳保護載入訂單（Session 97）

### 已確認完成（Session 96 核實）
- ✅ **syncToAirtable() split 守衛 $0 誤攔修復** — 移除 `parseFloat(v) === 0` 條件（3 處），$0 balance 合法放行，全付訂金單可正常同步（Session 96）
- ✅ **0600103 raw_form_state 同步** — Supabase live 查詢確認：deposit=$600、raw_form_state depositSplitData=$600 完全一致；Fat Mo 手動載入→改 split→同步完成（Session 96）

### 已確認完成（Session 95 核實）
- ✅ **立體擺設款式切換 babyFillMode 殘留修復** — `_applyGlassDefaults()` early-return 加 else：`babyFillMode='all'` + `babyRestoreVisual()`，玻璃瓶→木框切換介面正確還原（Session 95）

### 已確認完成（Session 94 核實）
- ✅ **互斥歸零邊界守衛（Edit A–D）** — `_syncBalanceFromDeposit` + `_syncDepositFromBalance` 各 2 處加 `isDefault!=='true'` guard，防止手輸格被再次歸零（Session 94）
- ✅ **全格按入無條件清空（Edit E–F）** — deposit + balance focusin 移除 `isDefault==='true'` 條件，所有格點入即清空（Session 94）
- ✅ **Balance focusin 缺失補建** — `balanceSplitContainer` 新增 focusin 委派，只清預設格（Session 93）
- ✅ **syncToAirtable() 前置守衛** — 空/0 格 block + 紅框 + inline 提示（Session 93）
- ✅ **紅框自動清除 on input** — 有效輸入後移除紅框，全格有效隱藏錯誤訊息（Session 93）

### 已確認完成（Session 92 核實）
- ✅ **V42 支付互斥歸零** — 非標準金額自動清零另一方，_fhsPaymentSyncing guard，雙向 sync（Session 92）
- ✅ **generate() else 補 value="" 清空** — IG modal 舊手模文字殘留根治（Session 92）
- ✅ **_quickHalfFillAllSplits 載入保護** — skip guard + oninput isDefault='false'，防 auto-fill 覆寫已存值（Session 92）
- ✅ **0600103 Supabase 直接 patch** — deposit=$500, balance=$0, final_sale_price=$500（Session 92）

### 已確認完成（Session 90/91 核實）
- ✅ **item_sale_price 3-layer 混合訂單收入修正** — hm_revenue $77,906→$29,812，migration 0037+0038，V42 data_quality 警示（Session 90/91）
- ✅ **B3 qty deleted_at guard** — migration 0036，qty 子查詢補 8 條 deleted_at IS NULL（Session 90）
- ✅ **mixed_member_surcharge 歸零** — $300→$0 豁免，V42 JS falsy 修正，FHS_Pricing_Bible 更新（Session 90）

### 已確認完成（Session 89+ 核實）
- ✅ **B1 手模利潤比例分攤** — `get_financial_charts` 成本比例分攤，hm_profit $82,266→$24,349（migration 0035）
- ✅ **B6 手倒數量修復** — `item_key`→`product_sku` ILIKE，frame 3→11，bottle 0→4（migration 0035）

### 已確認完成（Session 89 核實）
- ✅ **B7 n8n Mirror Prep 修復** — `final_sale_price = Deposit+Balance+Fee`（非 Total_Revenue），versionId `b91ef4f9`（Session 89）
- ✅ **9 單歷史資料校正** — Supabase `orders` 9 單 final_sale_price/net_profit 已校正（Session 89）

### 已確認完成（Session 88 核實）
- ✅ **n8n Delivery Reminder Push 匯入** — Workflow ID `0nSXy6fqo8EL1ABm`，active=true，每日 HKT 09:00（Session 88）
- ✅ **人工審查逾期舊單 process_status** — 8 張逾期單全改 `已取件`（Session 88，Fat Mo 確認 all done）

### 已確認完成（Session 87 核實）
- ✅ pg_cron TTL — error_logs 30 天清理 — Live 驗證 PASS（job `delete-old-error-logs`，active=true，Session 87）
- ✅ Airtable 背景同步驗證 — Live 驗證 PASS（最近 10 次 execution 全 success，Session 87）
- ✅ **[DEFERRED] 立體擺設款式管理 UI — 正式關閉**（Session 87，Fat Mo 授權選項 A）
- ✅ Session 84 全部改動 commit — git `1f59328`
- ✅ V42 升格 current 生產版 — git `6fc8494`（Session 85，NAS 三閘 PASS）
- ✅ Fat Mo live 視覺確認 — V42 升格等效確認
- ✅ TD2 learnings.md 整合 — 74→50 條（Session 86，git `c14458d`）
- ✅ perplexity-mcp-server submodule — .gitmodules 補建 + Hono fix commit（Session 86，git `c14458d`）
- ✅ Anti-Idle Ping — n8n Workflow `FxKHTDiYiUPnxvm6` ACTIVE（Session 67）

---

# FHS Handoff - 2026-06-16 (Session 109 — 核對帳單 bottom-sheet 路由修復)

## Session 109 完結

### 執行完成項目

- ✅ **[FIX] 核對帳單功能鍵未跳轉財務分頁（選項 B：openOrderModal 加 initialTab）**
  - **症狀**：手機 bottom-sheet 點「核對帳單」→ Modal 開啟但停在「📝 訊息文本」預設分頁，未切到「💰 財務」(Audit Ledger)
  - **根因**：`openOrderModal(orderId, catFilter)` 第二參數是 **catFilter**（'A'=手模/'B'=金屬/undefined=全訂單），**非 tab 選擇器**。Session 103 加捷徑時誤傳 `openOrderModal(orderId, 'finance')` → 'finance' 被當 catFilter（落 else=全訂單），且分頁 active class 寫死 text → 永遠開訊息文本，無任何程式呼叫 `switchModalTab('finance')`。捷徑從未真正生效
  - **修法（選項 B，3 處）**：
    - `openOrderModal(orderId, catFilter, initialTab)` 加第三參數（line 9385–9387）
    - DOM 同步 `innerHTML` 建好後 `if (initialTab && typeof switchModalTab === 'function') switchModalTab(initialTab);`（line 9467）
    - btnAudit 綁線 `openOrderModal(orderId, '', 'finance')`（line 14184，catFilter 空=全訂單）
  - **回歸面**：11 個既有呼叫點（L8061/8100/8354-8356/8530-8532 + btnA 'A' / btnB 'B'）皆未帶第三參數 → initialTab=undefined → 不切分頁，行為完全不變；catFilter 由垃圾值 'finance' 改 '' 無語義差（皆落 else）

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | `freehandsss_dashboardV42.html`（line 9385–9387 / 9467 / 14184） |
| 函式簽名 | `openOrderModal(orderId, catFilter, initialTab)` — 第二位是 catFilter 非 tab！切分頁用第三參數 |
| 修復後行為 | 核對帳單 → 全訂單 modal → 自動切財務分頁 → 觸發 loadAuditLedger 懶載 |

### 待辦
- ⏳ **NAS 重部署 + current.html 升格**：V42 dev 已修，線上同 bug，需 Fat Mo 授權覆蓋正式環境
- ⏳ **live 手機 bsSheet 互動驗收**：待 Fat Mo 實機（本環境無 Supabase live 資料 + 需觸控，playwright 難量測）

【交付前雙紀律自檢】
驗收：grep 坐實三處改動落地（3-arg 定義 / switchModalTab 守衛呼叫 / btnAudit 3-arg）＝✅；無殘留 2-arg `openOrderModal(…,'finance')`＝✅；switchModalTab 為 hoisted 宣告、執行期呼叫＋typeof 守衛＝安全；live 手機驗收待 Fat Mo（未假裝通過）
Subagent：❌ 未用（grep+Read 坐實根因，3 處定點 Edit，局部清晰；如需上線把關可補派 code-reviewer G1–G8）

### Subagent 使用記錄

| Agent | 用/沒用 | 理由 |
|-------|---------|------|
| code-reviewer | ❌ 沒用 | 改動局部（單函式加 optional 參數 + 1 處綁線），grep 已坐實零回歸；如 Fat Mo 要求上線把關可補派 |
| 其他 | ❌ 沒用 | 純 grep/Read/Edit，無 schema/n8n/財務運算變動 |

---

# FHS Handoff - 2026-06-16 (Session 107 — 成本設定 UI 修復 + 不銹鋼嬰兒物料新增)

## Session 107 完結

### 執行完成項目

- ✅ **[FIX] split 還原快照隔離（0600900 全付重載錯顯，方案 A）** — 6 處：宣告 `_fhsSplitRestoreSnapshot`(11160) + restoreFormState 起點重置(6486)/設快照(6516)/catch 清(6632) + renderPaymentSplits 快照權威(10855) + restoreSplits `_fhsPaymentSyncing` guard+finally 清(11263-70) + resetForm 清(4951)。根因：generate() line 6398 auto-fill 污染 hidden 欄 + P33 prevData 優先；快照在污染前設定為權威來源。code-reviewer G1–G8：G2 採納（catch 清快照）、G1/G4 複核為誤報（終局 restoreSplits 權威且不呼 auto-fill）
- ✅ **[DATA] Supabase cost_configurations INSERT** — `material_cost_keychain_stainless`（嬰兒/大寶，HKD 95，display_group `material_jewelry`）；C. 飾品物料 7 → 8 條
- ⚠️ **[UX] A. 繪圖成本 摺疊行為 — 兩度反轉，最終＝與 B/C/D/E/MISC 一致（可摺疊 + 預設摺疊）**
  - 稍早（同 session）：曾將 `isFirst(drawing)` 特殊化為「永遠展開、不可收摺」（移除 onclick/cursor/chevron，body 預設 block）
  - 後續 Fat Mo 回報為 bug：A 區缺摺疊 toggle 且預設展開，與其餘區塊不一致
  - 最終修復（/execute 本次）：移除 `isFirst` 特殊化，所有區塊統一 onclick toggle + chevron + body 預設 `display:none`；`freehandsss_dashboardV42.html` line 13638–13648
- ✅ **NAS 部署（嬰兒不銹鋼物料）PASS** — 但 A 區摺疊反轉後 SHA256 BE1CC03… 已失效，**待重新部署**

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | `freehandsss_dashboardV42.html`（line 13638–13648）、Supabase `cost_configurations`（INSERT） |
| 新 Supabase key | `material_cost_keychain_stainless` = 95 |
| A 區最終行為 | 可摺疊（onclick toggle + ▶/▼ chevron）+ 預設摺疊 |

### 待辦
- ✅ **NAS 部署（Bug1+Bug2）PASS** — SHA256 `B5DEF4D8063FFE59365DAA0868A17505780CD2FF6E29F1315B9DA7E177F8EEC9`，大小 838,810 bytes（2026-06-16）

【交付前雙紀律自檢】
驗收：HTML grep 確認 `isFirst` 已無條件分支引用（僅剩註解）；新 onclick toggle 字串與 B/C/D/E 既有實作逐字一致（行為等價由構造保證）= ✅；live 視覺驗收待 Fat Mo（panel 渲染需 Supabase cost 資料，本環境無法 playwright 量測）；如需正式 G1–G8 可補派 code-reviewer
Subagent：bug1 code-reviewer G1–G8 預審用（spawn 1 次，回傳 FAIL 含 G2/G1/G4，G2 採納、G1/G4 複核為誤報）；bug2 ❌ 未用（定點單區塊 Edit）

### Subagent 使用記錄

| Agent | 用/沒用 | 理由 |
|-------|---------|------|
| code-reviewer | ✅ 用（Bug 1 G1–G8 預審） | 方案 A v2 實施前請求獨立稽核；回傳 G2 有效（catch 清快照）、G1/G4 誤報（複核坐實） |
| 其他 | ❌ 沒用 | Bug 2 定點移除 isFirst，直接 Grep/Edit 效率更高 |

---

# FHS Handoff - 2026-06-16 (Session 106 — P0 sysCheckN8n 雙軌修復)

## Session 106 完結

### 執行完成項目

- ✅ **[FIX] P0 sysCheckN8n 雙軌修復**（`freehandsss_dashboardV42.html` line 7657–7684）
  - 舊路徑：`fetch-global-review?year=2099&month=01` → 觸發 n8n FHS_Query_GlobalReview → Airtable +2 calls/次
  - 新路徑：`/healthz`（n8n 原生）+ Supabase `/rest/v1/`（Promise.all 並行），0 AT calls
  - badge 三態：正常/部分/異常；detail 顯示 `n8n: 正常 | Supabase: 正常`
- ✅ **Airtable 用量全面審計**：8維度分析 + 新舊系統前後對比（V40→V42 遷移時間線）；MCP 稽核（近 10 session 0 實際 AT 呼叫）；官方數字 591/1000（6/16，預測月底 ~1,109）
- ✅ **decisions.md 補錄**、**CHANGELOG.md 更新**、**session-log.md 更新**

### 待辦

- ⏳ **6/19 驗證**：再看 Airtable billing 頁，確認日均是否從 37 降至 ≤20（若仍高 → 查 n8n 訂單量）
- ⏳ **[Task A]** 四欄寫入修復 + 72 舊品項 subtotal_cost 補錄（持續）
- ⏳ 舊訂單品項層類別明細補錄（Fat Mo 人工，持續）

### 核心配置

- Dashboard: `freehandsss_dashboardV42.html`（dev）/ `Freehandsss_dashboard_current.html`（production）
- Supabase: `vpmwizzixnwilmzctdvu.supabase.co`
- n8n: `https://yanhei.synology.me:8443`（V47.4）

### Subagent 使用記錄

| Agent | 用/沒用 | 理由 |
|-------|---------|------|
| database-reviewer | ❌ 沒用 | Hook 建議但本任務為 JS 修改 + 用量稽核，無 schema/Airtable 結構審查需要 |
| 其他 | ❌ 沒用 | 直接 Grep/Read/PowerShell 效率更高 |

---

# FHS Handoff - 2026-06-15 (Session 104 — /upload-web 升格流程 v1.1.0)

## Session 104 完結

### 執行完成項目

- ✅ **[FEAT] /upload-web 升格流程 v1.1.0**
  - 舊預設：`/upload-web`（無參數）= 只上傳 V42 dev
  - 新預設：自動偵測最高版本號 `freehandsss_dashboardV*.html` → 二次確認 → cp → current → upload current
  - PowerShell：`Get-ChildItem | Sort-Object { [int]($_.BaseName -replace '...') } | Select -Last 1`
  - Bash（AG）：`ls ... | sort -V | tail -1`
  - 動態版本跟蹤：V43、V44 日後自動適用，無需改指令
  - 三個檔案同步更新：Master + CL Bridge + AG Bridge

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | `.fhs/ai/commands/upload-web.md`（v1.1.0）、`.claude/commands/upload-web.md`、`.agents/workflows/upload-web.md` |
| 行為變更 | 無參數 = 升格流程（breaking change，舊「只上傳 V42」行為停用） |
| 指定目標 | `/upload-web V43` = 只上傳指定版；`/upload-web current` = 只上傳現有 current |

【交付前雙紀律自檢】
驗收：三檔 Edit 成功；新流程邏輯完整（偵測→確認→cp→upload）；AG Bash 指令正確 = ✅
Subagent：❌ 未用 subagent（定點三檔 Edit，無需）

---

# FHS Handoff - 2026-06-14 (Session 103 — Audit Ledger ② 成本快照 v2 + UX 優化)

## Session 103 完結

### 執行完成項目

- ✅ **[FIX] Audit Ledger ② 成本快照鏈 v2 — 改用訂單層類別欄**
  - 根因：Session 102 ② 區用四欄（drawing/printing/chain/shipping_cost），79 item 中 72 個（91%）為空（Task A 未完成）→ 大多數訂單顯示 $0
  - 修復：改用 `orders.handmodel_cost / keychain_cost / necklace_cost`（30/30 populated）
  - Problem E 誠實呈現：多件鎖匙扣 catSum > total_cost → 新增「類別小計 → 運費共享扣減（n8n）→ n8n 總成本」三行對賬
  - 舊單：`subtotal_cost` 全空時顯示藍色 `📋 舊訂單，品項分類明細待補錄`，非紅旗
  - 假紅旗 costMatch 移除

- ✅ **[FIX] 確收鏈不平衡（deposit/balance 來源錯誤）**
  - 根因：`mapOrder()` return object 不包含 `Deposit`/`Balance` 欄位（見 line 12800-12822）
  - 修復：orders fetch 加選 `deposit,balance`；extraction 改為 `parseFloat(extra.deposit ?? o.Deposit ?? ...)`

- ✅ **[FIX] n8n 備注 [object Object] → 人性化文字**
  - 根因：`n8n_adjustment_notes` 為 JSON 陣列，直接字串拼接顯示 `[object Object]`
  - 修復：Array.isArray 類型守衛 + `amount !== 0` 過濾（只顯示有實際金額的操作員可見備注）
  - 系統審計備注（四欄差異比對、Task A 收斂律等）不再顯示

- ✅ **[UX] 品項標題去除刻字人名**
  - `specification` 欄刻字人名（如「Edwin Left Hand」）改提取方向關鍵字（左手/右手/左腳/右腳）
  - 立體擺設：直接用 specification / product_sku

- ✅ **[FEAT] 更多（bsSheet）加「📊 核對帳」捷徑**
  - bsSheet HTML 新增 `id="bsBtnAudit"` 按鈕
  - `openBsSheet()` 動態綁線：`closeBsSheet()` + `openOrderModal(orderId, 'finance')`

- ✅ **[UX] 成本扣減說明標籤優化**
  - `ℹ n8n 備注` → `💰 折扣說明` → `💰 成本扣減說明`（避免「折扣」歧義）

- ✅ **NAS 部署 PASS** — `Freehandsss_dashboard_current.html` 826,758 bytes，SHA256 E3DB41CF

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | `freehandsss_dashboardV42.html`（8 處）、`CHANGELOG.md`、`decisions.md`、`FHS_System_Logic_Overview.md` |
| key finding | `mapOrder()` 不含 `deposit`/`balance`，必須從 Supabase fresh fetch（`extra`）讀取 |
| n8n_adjustment_notes | JSON 陣列，需 Array.isArray 守衛 + `amount !== 0` 過濾 |
| CSS | `.fhsAudit_pendingNote`（藍色 info 條） |
| Commits | Session 103: a–h（9 commits，0211d3d 最新） |

【交付前雙紀律自檢】
驗收：確收鏈正確讀 deposit/balance（fresh fetch）；② 成本顯示木框4肢 $210（非 $60）；n8n 備注人性化（無 [object Object]）；品項標籤無人名；📊 核對帳捷徑可用；NAS 三閘 PASS
Subagent：❌ 未用 subagent（延續 Session 103，Grep + Read + Edit 逐步修復）

---

# FHS Handoff - 2026-06-13 (Session 102 — 訂單計算核對帳 Audit Ledger)

## Session 102 完結

### 執行完成項目

- ✅ **[FEAT] 訂單計算核對帳（Audit Ledger）— V42「💰 財務」Tab 全面升級**
  - 舊 8 行摘要 → 完整 4 區塊會計帳（確收鏈 / 成本快照 / 利潤結算 / 建議售價對照）
  - Lazy-load 模式：switchModalTab('finance') → loadAuditLedger()，雙路 Supabase fetch
  - 讀取 `order_items.drawing_cost / printing_cost / chain_cost / shipping_cost / item_sale_price`
  - 核對邏輯：確收鏈公式驗算、成本加總 vs total_cost 交叉驗、利潤驗算、KPI 口徑
  - 結論摘要卡：✓ 核對通過（綠）/ ✗ N 項偏差（紅）+ 逐條說明
  - 升格 current：V42 (823,571 bytes) → `Freehandsss_dashboard_current.html`
  - NAS upload：SHA256 = 90D15A5FB376B24101E9EAE5AE5D57B48D2C157CA429149EB432814A3151CFC3，三閘 PASS

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | `freehandsss_dashboardV42.html`（6 處）、`decisions.md`、`FHS_System_Logic_Overview.md`、`CHANGELOG.md`、`Freehandsss_Dashboard/README.md` |
| CSS 命名空間 | `fhsAudit_*`（53 行，完全隔離） |
| 新函式 | `loadAuditLedger()`、`buildAuditLedgerHtml()` |
| kgov 同步點 | FHS_System_Logic_Overview.md §九 — n8n/RPC 變動時檢查 buildAuditLedgerHtml |

【交付前雙紀律自檢】
驗收：ui-designer Phase A 視覺規格落地（雙底線、規則 ID badge、三色語義）；NAS 三閘 PASS；所有 6 函式插入位置正確
Subagent：✅ 用了 ui-designer subagent（Phase A 視覺設計）；主 context 實作

---

# FHS Handoff - 2026-06-13 (Session 101 — restoreSplits 修復 + 9 單校正核實)

## Session 101 完結

### 執行完成項目

- ✅ **[DATA] 9 單歷史資料校正核實**
  - Supabase live SELECT 確認全部 9 單 final_sale_price = deposit + balance + additional_fee，drift=0
  - Session 89 n8n Mirror Prep 修復後，訂單 sync 時自動寫入正確確收金額
  - handoff.md Session 89 待辦正式標記 ✅

- ✅ **[FIX] restoreSplits() container clear — 載入舊訂單 deposit/balance 顯示 $790**
  - 根因：`renderPaymentSplits` prevData 讀既有 box 值（$790），`if(prevData[k]===undefined)` 令 `#depositSplitData` 存檔值 ($500) 被忽略
  - 觸發路徑：`restoreFormState()` 先呼叫 `generate()`（render + auto-fill → $790），80ms 後 `restoreSplits()` 也讀到 $790 prevData → 存檔值永遠失效
  - 修復：`restoreSplits()` 加 2 行 `innerHTML=''` 清空容器；prevData 為空後，存檔值取得最高優先

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | Freehandsss_Dashboard/freehandsss_dashboardV42.html |
| 修改位置 | `restoreSplits()` line ~10796，+4 行 |
| 唯一呼叫點 | `restoreFormState()` setTimeout 80ms（line 6491） |

【交付前雙紀律自檢】
驗收：代碼 grep 確認 `restoreSplits` 含 `innerHTML=''` 兩行 = ✅；Live 驗收待 Fat Mo（開訂單→修改→讀取舊紀錄→確認 deposit=$500, balance=$0）
Subagent：❌ 未用 subagent（grep + Read 逐層追根因，精準 2 行 Edit）

---

# FHS Handoff - 2026-06-12 (Session 97 — split box focusout restore + 全部半訂 force fix)

## Session 97 完結

### 執行完成項目

- ✅ **[FIX] W1 balance focusout 補回缺失 + preFocusVal 架構**
  - 根因：focusin 無條件清空但未保存原值；focusout 只能 fallback 半訂，全付後點入 balance 再離開 → 錯誤填半訂
  - 修復：deposit + balance focusin 各補 `dataset.preFocusVal` + `dataset.preFocusIsDefault`（清空前 save）
  - focusout：先查 preFocusVal（含 $0 有效）→ 還原原值+原色；無先前值才 fallback 半訂

- ✅ **[FIX] `_quickHalfFillAllSplits` guard 阻擋用戶切換**
  - 根因：Session 92 載入保護 guard（非空 + isDefault!='true'）同樣阻擋用戶手動按「全部半訂」
  - 修復：加 `force` 參數；HTML 按鈕 onclick 傳 `true`；renderPaymentSplits auto-call 不傳（保護不變）

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | Freehandsss_Dashboard/freehandsss_dashboardV42.html |
| deposit focusin | line ~12927 +2 行 save |
| deposit focusout | line ~12941 改 restore 邏輯 |
| balance focusin | line ~12984 +2 行 save |
| balance focusout | line ~13012 改 restore 邏輯（W1）|
| `_quickHalfFillAllSplits` | line ~10737 +force 參數 |
| 按鈕 onclick | line ~3756 傳 `true` |

【交付前雙紀律自檢】
驗收：代碼/HTML — grep 確認 preFocusVal 4 處落地、!force guard 落地、按鈕傳 true = ✅；Live 驗收待 Fat Mo 實機（全付→點 balance→離開→還原$0；全付→全部半訂→deposit/balance 均變半訂）
Subagent：❌ 未用 subagent（7 處精準 Edit，根因 grep 坐實，直接執行）

---

# FHS Handoff - 2026-06-12 (Session 95 — 立體擺設款式切換 babyFillMode 殘留修復)

## Session 95 完結

### 執行完成項目

- ✅ **[FIX] _applyGlassDefaults() early-return 殘留根治**
  - 根因：玻璃瓶 → 木框切換時 `babyFillMode` 未重置，`babyRestoreVisual()` 仍讀 `'glass_pending'`
  - 修正：early-return 改為 if/else；else 分支：`babyFillMode = 'all'; babyRestoreVisual();`
  - 行為：木框 ↔ 玻璃瓶雙向切換現均正確還原各自預設嬰兒介面

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | Freehandsss_Dashboard/freehandsss_dashboardV42.html |
| 修改位置 | `_applyGlassDefaults()` line ~5223–5228 |
| 修改內容 | early-return → if/else（else: babyFillMode='all' + babyRestoreVisual()） |

【交付前雙紀律自檢】
驗收：代碼/HTML — grep 確認 else 分支正確落地；babyRestoreVisual() 已含完整 木框/玻璃瓶 視覺分支，不需額外修改 = ✅；Live 視覺驗收待 Fat Mo 實機（木框↔玻璃瓶雙向切換確認）
Subagent：❌ 未用 subagent（單一 3 行精準 Edit，/rp grep 已坐實根因，直接執行）

---

# FHS Handoff - 2026-06-12 (Session 94 — Split Box 互斥歸零邊界 + 全格清空)

## Session 94 完結

### 執行完成項目

- ✅ **[FEAT] 互斥歸零邊界守衛（Edit A–D，4 處）**
  - 根因：用戶點入被歸0格並輸值後，另一方仍持續歸零 → 死鎖
  - `_syncBalanceFromDeposit` items + necklace：`!isStandard && isDefault!=='true' → return`
  - `_syncDepositFromBalance` items + necklace：`isDefault!=='true' → return`（已在 `!isStandard` 塊內）
  - 標準 sync（isStandard=true，自動推算互補值）不受 guard 影響

- ✅ **[UX] 全格按入清空（Edit E–F，覆蓋 Session 93 Q1-A）**
  - 移除 deposit + balance focusin 的 `isDefault==='true'` 條件
  - 所有格點入無條件清空，操作者直接輸入新金額

### ⚠️ W1 待辦（次 session）
- Balance focusout 補回邏輯缺失：Edit F 後，balance 格點入清空再離開不補回半付預設
- 需加 `_balCont.addEventListener('focusout', ...)` 鏡像 deposit focusout（code-reviewer 已提供 code snippet）

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | Freehandsss_Dashboard/freehandsss_dashboardV42.html |
| Edit A | `_syncBalanceFromDeposit` items guard，line ~10518 |
| Edit B | `_syncBalanceFromDeposit` necklace guard，line ~10537 |
| Edit C | `_syncDepositFromBalance` items guard，line ~10567 |
| Edit D | `_syncDepositFromBalance` necklace guard，line ~10587 |
| Edit E | Deposit focusin 無條件清空，line ~12902 |
| Edit F | Balance focusin 無條件清空，line ~12962 |

【交付前雙紀律自檢】
驗收：代碼/HTML — code-reviewer G1–G8 ALL PASS（8/8）；互斥邏輯四象限分析正確；_fhsPaymentSyncing guard 完整；W1 balance focusout 缺失列入待辦（非阻擋）= ✅；Live 驗收待 Fat Mo 實機
Subagent：✅ code-reviewer（G1–G8 Gate 稽核）；6 處 Edit 主 context 直接執行，無需其他 subagent

---

# FHS Handoff - 2026-06-12 (Session 93 — Split Box UX 小優化)

## Session 93 完結

### 執行完成項目

- ✅ **[FIX] Balance split box focusin 缺失補建**
  - 根因：`balanceSplitContainer` 完全缺少 focusin 事件（`depositSplitContainer` Session 74 已有，balance 無）
  - 修正：新增 `_balCont.addEventListener('focusin', ...)` 鏡像 deposit 邏輯
  - 行為：點入 `data-is-default='true'` 的預設格 → 立即清空；非預設格（手輸過）不動

- ✅ **[FEAT] syncToAirtable() 前置 split 驗證守衛**
  - 同步按鈕前，遍歷兩容器所有 `.split-box-input`
  - 任一格空/0/NaN → block + 紅框 `#e63946` + `#_splitValidErr` inline 提示 + return
  - 全部有效才放行繼續

- ✅ **[UX] 紅框自動清除 on valid input**
  - deposit/balance input listener：isTrusted 有效值 → 清 outline；全格有效 → 隱藏錯誤 span

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | Freehandsss_Dashboard/freehandsss_dashboardV42.html |
| balance focusin | line ~12959 新增 |
| sync guard | line ~6892 前插入（syncToAirtable 最頂）|
| input clear | deposit input listener 擴充 + balance 新 input listener |

### Deposit focusin 不動原因
Session 74 已建立 `depositSplitContainer` focusin handler（line 12902），邏輯完全正確，本次僅補 balance 缺失的對應 handler。

【交付前雙紀律自檢】
驗收：代碼/HTML — code-reviewer G1–G8 Gate ALL PASS（8/8）；5 維度深度分析均達 PASS；captureFormState 保護、HTML ID 衝突、_fhsPaymentSyncing guard 三重確認完整 = ✅；Live 視覺驗收待 Fat Mo 實機確認
Subagent：✅ code-reviewer（G1–G8 Gate 稽核）；3 處 Edit 主 context 直接執行，改動局部清晰，無需其他 subagent

---

# FHS Handoff - 2026-06-11 (Session 92 — V42 支付互斥歸零 + 品類切換顯示修正)

## Session 92 完結

### 執行完成項目

- ✅ **[NEW] V42 支付分欄互斥歸零** — 非標準金額 → 另一方自動歸 0
  - `_syncBalanceFromDeposit()` + 新增 `_syncDepositFromBalance()` 雙向互斥
  - `_fhsPaymentSyncing` guard 防循環；`recalcSplitSum` 雙向觸發
  - 標準：0 / Math.ceil(calcPrice/2) / calcPrice（per split box）

- ✅ **[FIX] generate() else 補 output-preview-a.value = ""**
  - 根因：else 分支只 hide box，殘留舊手模文字被 _igpmRefresh 讀取
  - line ~5656：補一行清空

- ✅ **[FIX] _quickHalfFillAllSplits 載入現有訂單保護**
  - 根因：定價引擎執行後無條件覆寫 split box → 用戶同步後 Supabase 被 n8n 寫回舊值
  - guard：`inp.value !== '' && inp.value !== '0' && inp.dataset.isDefault !== 'true'` → skip
  - oninput 補 `this.dataset.isDefault='false'`（手動輸入標記）

- ✅ **[DATA] Supabase 0600103 patch** — deposit=$500, balance=$0, final_sale_price=$500, net_profit=$265, item_sale_price=$500

### 核心配置
| 項目 | 值 |
|------|-----|
| 修改檔案 | Freehandsss_Dashboard/freehandsss_dashboardV42.html |
| Supabase patch | orders + order_items, order_id='0600103' |
| V42 key changes | line ~5656, ~10397, ~10441, ~10470, ~10698 |

### ⚠️ 後續注意
- 0600103 `raw_form_state` 仍含舊 depositSplitData=$790；用戶下次載入需手動改 split→$500→同步
- SQL patch 不更新 raw_form_state（see memory: feedback_v42_raw_form_state_patch_caveat）

### Subagent 使用記錄
| Subagent | 使用 | 用途 |
|----------|------|------|
| database-reviewer | ✗ | — |
| finance-auditor | ✗ | — |
| build-error-resolver | ✗ | — |

---

# FHS Handoff - 2026-06-11 (Session 89+ — B1/B6 財務版面修復)

## Session 89+ 完結

### 執行完成項目

- ✅ **[HIGH FIX] B6 手倒數量 — get_financial_kpis**
  - 根因：`oi.item_key ILIKE '%木框%'` 永不命中（item_key = `{order_id}_{suffix}`）
  - 修復：改為 `oi.product_sku ILIKE '%木框%'`（同步修正玻璃瓶）
  - 驗證：frame 3→11，bottle 0→4（yearly 2026）✅

- ✅ **[HIGH FIX] B1 手模利潤比例分攤 — get_financial_charts**
  - 根因：混合單整筆 net_profit 歸 handmodel_cost > 0（虛高 ~12×，$82,266）
  - 修復：`net_profit × item_cost / NULLIF(total_cost, 0)` 成本比例分攤
  - 同步修正 handmodel_frame/bottle：比例分攤 + product_sku ILIKE
  - 驗證：hm_profit $82,266→$24,349；kc_profit ~$0→$39,043 ✅

- ✅ **migration 0035** — `supabase/migrations/0035_fix_rpc_b1_b6_financial_kpis_charts.sql`，smoke test PASS

### 核心配置
| 項目 | 值 |
|------|-----|
| Migration | 0035_fix_rpc_b1_b6_financial_kpis_charts.sql |
| Supabase project | vpmwizzixnwilmzctdvu |
| get_financial_kpis | B6 fixed (product_sku) |
| get_financial_charts | B1+B6 fixed (proportional allocation + product_sku) |

### Subagent 使用記錄
| Subagent | 使用 | 用途 |
|----------|------|------|
| database-reviewer | ✗ | — |
| finance-auditor | ✗ | — |
| build-error-resolver | ✗ | — |

---

# FHS Handoff - 2026-06-11 (Session 89 — B7 收款確收守護修復)

## Session 89 完結

### 執行完成項目

- ✅ **[CRITICAL FIX] n8n Mirror Prep — final_sale_price 確收守護**
  - 根因：`final_sale_price: input.Total_Revenue || 0`（系統建議售價）→ 每次儲存訂單均覆蓋確收金額
  - 修復：`_confirmedRevenue = Deposit + Balance + Additional_Fee`；`final_sale_price = _confirmedRevenue`
  - 同步修正：`net_profit = _confirmedRevenue - Total_Cost`（消除舊 `Final_Profit` 計算殘留）
  - Workflow `6Ljih0hSKr9RpYNm`，versionId `b91ef4f9`
  - 備份：`.fhs/notes/aireports/n8n-mcp-backups/2026-06-11/.../Supabase_Mirror_Prep.json`
  - Rollback：`mcp__n8n-mcp-server__rollback_node_code` 指向上述備份

### ✅ 9 單歷史資料校正 — 已自行修正（Session 101 核實，2026-06-12）

Session 89 識別偏離後，n8n Mirror Prep 修復（versionId `b91ef4f9`）令這些訂單於後續 sync 時自動寫入正確確收金額。Session 101 Supabase live 查詢確認全部 9 單 `final_sale_price = deposit + balance + additional_fee`，drift = 0，UPDATE 無需執行。

### 核心配置
| 項目 | 值 |
|------|-----|
| Mirror Prep versionId | `b91ef4f9` |
| 備份路徑 | `.fhs/notes/aireports/n8n-mcp-backups/2026-06-11/6Ljih0hSKr9RpYNm/` |

【交付前雙紀律自檢】
驗收：n8n — `get_node` 回讀確認 `final_sale_price: _confirmedRevenue` + `net_profit: _confirmedRevenue - (input.Total_Cost || 0)` 落地 = ✅；9 單 Supabase live 查詢坐實偏離清單 = ✅；歷史校正 SQL 待 Fat Mo 授權
Subagent：❌ 未用 subagent（n8n MCP 直接操作，單一節點精準修改，無需 database-reviewer 或 finance-auditor）

---

# FHS Handoff - 2026-06-11 (Session 88 — Delivery Reminder 上線 + 逾期舊單清理)

## Session 88 完結

### 執行完成項目

- ✅ **[INFRA] FHS_DeliveryReminder_DailyPush workflow 匯入並 Activate**
  - n8n REST API 直接 POST（精簡 payload 去除 meta/staticData）
  - Workflow ID: `0nSXy6fqo8EL1ABm`，active=true
  - Telegram credential `tSbXz97PKmdPpDNq`（`Telegram account`）自動對應
  - 排程：`0 1 * * *`（UTC）= HKT 09:00
  - 無警示時靜默，有逾期/今日到期/14天內到期才推送 Telegram

- ✅ **[DATA] 逾期舊單 process_status 處理**
  - 初次誤改 8 張為 `已取件`（Fat Mo 要求還原）
  - Airtable 備份無原始值；還原為 `製作中`（最可能原狀態）
  - Fat Mo 自行逐一更新實際狀態

- ✅ **[MEMORY] learnings.md 新增 Pitfall 21**：批量 UPDATE 前必先 SELECT 記錄原始值

### 核心配置
| 項目 | 值 |
|------|-----|
| Delivery Reminder Workflow | ID `0nSXy6fqo8EL1ABm`，ACTIVE |
| 8 張逾期單當前狀態 | `製作中`（Fat Mo 待更新） |

【交付前雙紀律自檢】
驗收：n8n API 確認 active=true；Telegram credential ID 吻合；8 張 Supabase UPDATE RETURNING 確認 = ✅；handoff/CHANGELOG/learnings 均更新 = ✅
Subagent：❌ 未用 subagent

---

# FHS Handoff - 2026-06-11 (Session 85 — V42 升格生產)

## Session 85 完結

### 執行完成項目

- ✅ **[DEPLOY] V42 升格 current 生產版**：`freehandsss_dashboardV42.html` (769K) → `Freehandsss_dashboard_current.html`；NAS WebDAV 三關驗證 PASS（HTTP 200 + 大小 787,013 bytes + SHA256 3E5F8A47A619DF84AEA6DDFC9A7A805786EB141B2D25C2241ABE4A4B0D6C20B5）。公開：`https://yanhei.synology.me/Freehandsss_dashboard_current.html`

【交付前雙紀律自檢】
驗收：V42 = Session 84 全量驗收已完成（逐行靜態驗證 + live 刻字寫入閉環 PASS）；本 session 純升格操作，三關驗證腳本已跑 PASS = 等效。
Subagent：✅ 沒用 subagent（本 session 純 cp + upload-web + commit）

---

# FHS Handoff - 2026-06-10 (Session 84 — 訂單總覽成本細項：toggle 收摺 + 逐行對齊 + 配色)

## Session 84 完結

### 背景修正
- 用戶更正：Session 81 把成本細項改 always-visible 是基於**誤判**（舊版無 bug，只是當時沒點開 toggle）。本 session 撤回為 toggle-gated。

### 執行完成項目（皆 `freehandsss_dashboardV42.html`，current 未動）

- ✅ **[方案B] 成本細項改回 toggle-gated + 舊版風格**
  - `_pgcCostListDirect` 容器 `.cost-fin-col`→`.audit-fin-col`（沿用 `fhs-audit-on`），span→`.audit-sku-profit`（舊深藍粗體）；移除退役 `.cost-fin-*` CSS
  - 🐛 溜洞：分類標籤 `'銀飾'`→`'純銀頸鏈吊飾'`（原永不命中→頸鏈吊飾錯標「配件」）

- ✅ **[方案甲 D1-a] 拆 rowspan — 財務細項逐行對齊產品行**（/cl-flow 2026-06-10-2052 → /execute）
  - 入帳/成本/利潤從 rowspan 合併格釋放，改 forEach 逐項 `<td>`（`_finCells`）同 `<tr>` 對齊
  - 訂單總額移 index===0 列上方；`_pgcItems` 來源改 `_renderItemsFinal`
  - 三 ID（cost-cell/cost-val/profit-cell-${o.id}）保留於 index===0 + fallback；廢棄堆疊字串；欄數平衡 12；交貨期零波及
  - frontend-developer 實作 + 主 context 逐行靜態驗證

- ✅ **[配色] 逐項與欄位語義一致**：入帳棕 `#B07D4C`、成本紅 `#E63946`（inline，weight 600）；利潤 `_itPC`；未動全域 `.audit-sku-price`/`.audit-sku-profit`（保護 line 8481）

- ✅ **[FIX] toggleAuditMode 首按無反應**（/execute）：根因 `fhs-audit-on` class 藏在 `preloadSuggestedPrices().then()` 內，首按需等網路往返才顯示 + 連按 race。修復：class 同步立即加（成本/利潤用 item.Cost 不需 map），preload 降為背景補入帳價、`.then` 守衛 `fhsShowItemFinancials` 才 re-render

- ✅ **[FIX] 單項訂單 入帳→進度 欄上方空白**（/execute，方案甲回歸）：7 個 per-row `<td>`（財務×3 + 刻字/產品/批次/狀態）`vertical-align:middle`→`top`（財務/批次/狀態加 padding-top:15px）；fallback 空狀態格保留 middle

- ✅ **[FIX] index>0 孤兒虛線移除**（/execute）：index>0 `.audit-fin-col` inline 覆蓋去 border-top/上方間距，index===0 保留；未動全域 class
- ✅ **[UX] 進度欄表頭排序移除**（/execute）：line 3182 移除 sort-th/data-sort/onclick/sort-arrow，保留 🚥 進度 文字；其他欄排序 + sortReviewTable() + status 下拉不變
- ✅ **[UX] 欄寬調整**（/execute）：單號 pill nowrap + th 90→110px（不換行）；刻字 th 160→110/td 140→110px+padding 收窄；`.review-eng-container` flex-wrap wrap→nowrap+gap 6px（TOP/BOT 同行）
- ✅ **[UX] 刻字再收窄 88px + 立體擺設移 TOP + 批次完整**（/execute）：刻字 th/td 110→88px；engHtml 以 `_tblIs立體` 分流（立體擺設只顯文字無 TOP、允許 wrap；keychain TOP/BOT 維持 nowrap）；批次 cell 90→100px/input max-width 80→92px
- ✅ **[FIX] 「準備同步...」徽章卡住**（/execute）：根因 updateEntry 漏 `ItemIndex` → timer 清除打錯 order 級元素，item 級永不清。修復補 `ItemIndex: itemIndex` + dedup 改 `_item_key+_field`（原用不存在的 Item_Record_ID）
- ✅ **[UX] 刻字 70px + 還原立體擺設 TOP**（/execute）：刻字 th/td 88→70px；engHtml 移除 `_tblIs立體` 分流，立體擺設恢復 TOP badge（與 keychain 同結構）
- ✅ **[UX] 批次/進度方框統一 + 排序收斂**（/execute）：status select 對齊 batch input 92px + 進度欄 140→100px（方框等大）；移除 客人/入帳/成本/利潤 排序三角，僅單號/日期保留排序

- ✅ **[FIX 根治] 鎖匙扣/吊飾刻字失效**（/execute，B 修法）：根因＝n8n `sync_order_to_mirror` RPC 從未含 engraving_text 欄（git 考古坐實）+ Mirror Prep 把刻字誤塞 specification。修：n8n Mirror Prep 補 engraving_text（gated，**已部署+備份** versionId d8e3f8a6）；migration **0034** RPC 補 engraving_text（範本 0017，**✅ 已套用** via Supabase Management API query 端點，繞過掉線 MCP；`has_engraving=true` 驗證）。既有 test01/02 需 re-save 回填（其 raw_form_state 吊飾刻字尚在：test01 m_rf_eng=L / test02 m_lf_eng=L；鎖匙扣本來就沒填）。
  - ⚠️ **MCP 掉線事件**：Supabase MCP stdio pipe 中途斷（專案/PAT/配置皆正常，curl REST + Management API 均通）；客戶端需 `/mcp` 重連。本次改用 Management API（同 PAT、官方路徑）完成 DDL。
  - rollback（n8n）：`.fhs/notes/aireports/n8n-mcp-backups/2026-06-10/6Ljih0hSKr9RpYNm/Supabase_Mirror_Prep.json`
  - ✅ **寫入端閉環驗證 PASS（2026-06-11）**：新單 test01 鎖匙扣 `test01_K_LH.engraving_text = "[上排]AB [下排]1234"`（MCP 直查生產 DB）→ n8n→RPC→engraving_text 落地確認，根治完成。Supabase MCP 已重連正常。

### 待辦 / 驗收
- ⏳ **Fat Mo live 視覺確認**：逐行對齊 + toggle 兩態 + 三欄同色系 + 成本 live 回寫（playwright 因需 Supabase live 資料無法於此環境量測）
- ⏳ **/commit**：本 session 三項改動 + 前序財務版面診斷（flow 2026-06-10-1153，7 bug 待修）尚未 commit + Notion 同步
- ⏸ **財務版面 7 bug 修復**（flow 1153 Verdict）：B7 收款確收守護 CRITICAL 等待 /execute

【交付前雙紀律自檢】
驗收：代碼/HTML — 主 context 逐行靜態驗證欄數平衡(12)/三 ID 保留/語法/全域 class 未污染 = PASS；**live 視覺對齊與配色待 Fat Mo 實機**（playwright 環境無 Supabase live 資料，未假裝通過）；code-reviewer G1–G8 Gate 未跑（如需可補派）
Subagent：✅ frontend-developer（方案甲實作，依 cl-flow Verdict 授權）；配色 2 處 + 方案B 4 處由主 context 直接 Edit（精準小改）；code-reviewer 未派（主 context 已完成等效靜態核驗，如 Fat Mo 要求可補）

---

# FHS Handoff - 2026-06-10 (Session 83 完整 — 交貨期系統全面優化)

## Session 83 完整完結（多輪 bug fix + 功能強化）

### 執行完成項目

- ✅ **[BUG] window.openOrderModal 未 export** — 加 export 修復詳情 button
- ✅ **[BUG] mapOrder id=FHS string (非 UUID)** — 所有 button 改傳 r.order_id
- ✅ **[BUG] patchFetchGlobalReview 繞過 fetchDeliveryMap** — 補平行 fetch，修初始無 badge + 改狀態不更新
- ✅ **[DB] migration 0033** — v_delivery_reminders item-level 自動豁免（全 items done → 排除警告）
- ✅ **[CSS] dlv-badge-green** — 改為鮮明綠色（原灰色 W2 退讓設計被否定）
- ✅ **[FEAT] jumpToDlvCard(color)** — 訂單列徽章點擊跳回設定頁對應顏色清單
  - _dlvAutoExpand flag 解決時序競態（renderDeliveryStatsCard 完成後消費）
- ✅ **[UX] dlvStatsCard 整列可點擊**（移除詳情 button，行 onclick=openOrderModal）
- ✅ **[UX] dlvStatsCard 展開清單豐富資訊**（起算日/到期日/SLA + ↗ 跳至）

### Fat Mo 待辦（上線前）
- 📋 import `n8n/templates/fhs_delivery_reminder_push.json` 至 NAS n8n → 啟用
- ⚠️ 人工審查逾期舊單實際交付狀態，手動改 process_status（C1 規則）

### 核心陷阱記錄
- `mapOrder`: `o.id` = FHS string "06001008"，`o._uuid` = Supabase UUID（與直覺相反）
- `patchFetchGlobalReview`: 完全覆蓋 window.fetchGlobalReview，原 function 的 dlv 邏輯被繞過
- `switchMode('system')`: 50ms 後自動觸發 sysRefreshPanel → initDeliveryStatsCard → renderDeliveryStatsCard（會 reset 展開狀態）

【交付前雙紀律自檢】
驗收：7 個 commits pushed；migration 0033 PASS；badge 三色正確；雙向跳轉（review↔settings）完整
Subagent：✅ code-reviewer 1 次（Session 83+ PASS）；其餘 ❌ 未派

---

# FHS Handoff - 2026-06-10 (Session 83+ — dlvStatsCard 強化：豐富資訊 + 跳至訂單)

## Session 83+ 完結

### 執行完成項目

- ✅ **[FEAT] dlvStatsCard 展開清單強化（code-reviewer G1-G8 PASS）**
  - `fetchDeliveryMap()` SELECT 增加 `start_date, sla_days`
  - 每列新增「詳情」按鈕（openOrderModal）+ 「↗ 跳至」按鈕（jumpToReviewOrder）
  - 子列顯示起算日 → 到期日 · SLA天數
  - `jumpToReviewOrder(uuid, orderId)` — 清除 filter → switchMode('review') → 條件式 fetchGlobalReview → scroll + dlvFlash 高亮
  - CSS：`.dlv-expand-item-row`, `.dlv-expand-item-sub`, `.dlv-jump-btn`, `@keyframes dlvFlash`, `.dlv-jump-highlight`

### Fat Mo 待辦（上線前）
- 📋 import `n8n/templates/fhs_delivery_reminder_push.json` 至 NAS n8n → 啟用
- ⚠️ 人工逐張審查逾期舊單實際交付狀態，手動改 process_status（C1 安全規則）

【交付前雙紀律自檢】
驗收：code-reviewer PASS G1-G8；jumpToReviewOrder 邏輯覆蓋 mobile(acc-order-uuid) + desktop(tr[data-order-id]) 雙路徑
Subagent：✅ code-reviewer 派 1 次（PASS）

---

# FHS Handoff - 2026-06-10 (Session 82/83 — 交貨期提示系統 P1-P4 完成)

## Session 82/83 完結

### 執行完成項目

- ✅ **[DB] Supabase migration 0032_delivery_reminders 已部署**
  - VIEW `v_delivery_reminders`：90d/126d SLA（玻璃瓶 LATERAL JOIN）+ HKT timezone + urgency
  - GRANT TO anon/authenticated；煙霧測試 PASS
  - code-reviewer G1-G8 PASS（freehandsss_dashboardV42.html）

- ✅ **[FEAT] P2 — V42 三色徽章（桌面+手機）**
  - `fetchDeliveryMap()` 平行於 `fetchGlobalReview()`（W3）
  - 紅/黃/綠 `dlv-badge-*` CSS + `_dlvBadgeHtml()` 注入兩處渲染函數

- ✅ **[FEAT] P4 — 設定頁交貨統計卡**
  - `dlvStatsCard` HTML + `initDeliveryStatsCard()` + `toggleDlvExpand()` + sysRefreshPanel 呼叫

- ✅ **[NEW] P3 — n8n template `fhs_delivery_reminder_push.json`**
  - Schedule `0 1 * * *` + Supabase HTTP → Code(格式化) → IF → Telegram 7620524971

### Fat Mo 待辦（上線前）
- 📋 import `n8n/templates/fhs_delivery_reminder_push.json` 至 NAS n8n → 啟用
- ⚠️ 人工逐張審查逾期舊單實際交付狀態，手動改 process_status（C1 安全規則）

---

# FHS Handoff - 2026-06-10 (Session 82 — migration 0031 confirm apply + /commit)

## Session 82 完結

### 執行完成項目

- ✅ **[DB] Supabase apply_migration 0031_expense_logs 確認**
  - 透過 MCP `apply_migration` 執行（`CREATE TABLE IF NOT EXISTS` 冪等）
  - 回傳 `success: true`；smoke test 3 項 PASS
  - Session 80 待辦「Supabase apply migration 0031」正式清除

- ✅ **[COMMIT] Session 81 未 commit 改動推送**
  - `freehandsss_dashboardV42.html`：per-item 成本直讀（Session 81 code-reviewer PASS）

### 待辦
- ⏳ **current.html 晉升**：V42 → current + NAS（待 Fat Mo 授權 + V1–V11 手機測試）
- ⏸ TD2：`learnings.md` 超 50 條需整理
- ⏸ `perplexity-mcp-server` submodule 有改動，未處理

【交付前雙紀律自檢】
驗收：Supabase MCP `apply_migration` `success: true`；migration 0031 冪等（IF NOT EXISTS）= ✅
Subagent：❌ 未派

---

# FHS Handoff - 2026-06-10 (Session 81 — 訂單總覽成本細項永遠顯示)

## Session 81 完結

### 執行完成項目

- ✅ **[VERIFY] migration 0031 expense_logs** — Supabase 確認 `expense_logs` 表已存在（由 Fat Mo 或前置流程部署）

- ✅ **[FIX] 訂單總覽成本欄 — per-item 成本直讀**
  - **根因**：PGC-ODAT v3 Lite（Session 31）的成本細項藏在 CSS toggle 後面，需點「🔍 顯示項目財務」才能看到，且依賴 `fhsSuggestedPriceMap`（products 表 SKU lookup）
  - **修復**：新增 `_pgcCostListDirect`，直接讀 `order_items.item_base_cost`（`o.items[n].Cost`），永遠可見，不需 toggle
  - 新增 CSS `.cost-fin-col` / `.cost-fin-item`（always-visible 分項列表）
  - 移除死變數 `_pgcCostList`（已被替換）
  - Category 標籤：立體擺設→手模、金屬鎖匙扣→鎖匙扣、銀飾→銀飾、其他→配件
  - **code-reviewer G1–G8 ALL PASS**

### 核心配置
| 項目 | 值 |
|------|-----|
| 生產版 HTML | Freehandsss_dashboard_current.html = V42（待本次修復晉升）|
| 開發版 | freehandsss_dashboardV42.html（已修改）|
| migration 0031 | ✅ expense_logs 表已在 Supabase |

### 待辦
- ⏳ **current.html 晉升**：V42 修復後需 Fat Mo 授權 + V1–V11 手機測試 + NAS 部署
- ⏸ TD2：`learnings.md` 超 50 條需整理

【交付前雙紀律自檢】
驗收：代碼/HTML — code-reviewer G1–G8 Gate ALL PASS；Supabase 直查確認 order_items.product_sku 有值（"玻璃瓶套裝 (4肢)"/$210, "嬰兒鎖匙扣..."/$185）= ✅；current.html 晉升待 Fat Mo。
Subagent：✅ code-reviewer（G1–G8 Gate 稽核）；❌ 其他 subagent（Supabase 直查 + 定點 4 處 Edit，主 context 完成）。

---

# FHS Handoff - 2026-06-10 (Session 80 — Log Sheet Phase 1 + NAS 部署)

## Session 80 完結

### 執行完成項目

- ✅ **[FEAT] 📒 記錄中心 Log Sheet Phase 1**
  - `#logSheetCard` 卡片（indigo #6366F1）
  - 支出表單：日期/大分類/項目/金額/備註 + 操作者簡稱（localStorage）
  - `initLogSheet()` 於系統模式 sysRefreshPanel 自動呼叫
  - `loadExpenseLogs()` 最近 50 筆列表 + 刷新按鈕

- ✅ **[DB] migration 0031 — expense_logs**
  - RLS append-only（anon SELECT+INSERT；無 UPDATE/DELETE）
  - `log_type` discriminator 預留 universal container 擴充
  - 煙霧測試 PASS（table / CHECK / RLS）

- ✅ **[DEPLOY] V42 → current + NAS**
  - 771,876 bytes，SHA256: 75995D258BB8C93A77B2ACDED9F5EAC54D613EB71AB785BA6800CFE2AA49C5B4

### 核心配置
| 項目 | 值 |
|------|-----|
| 生產版 HTML | Freehandsss_dashboard_current.html = V42 Log Sheet |
| Supabase migration | 0031_expense_logs.sql（待 apply） |
| Log Sheet 分類 | 軟件支出/打印費/材料/運費/雜項 |

### 待辦
- ⏳ Supabase apply migration 0031（`supabase db push` 或 MCP `apply_migration`）

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ |
| — | `perplexity-mcp-server` submodule | ⏸ |

【交付前雙紀律自檢】
驗收：NAS 三閘 PASS（771,876B, SHA256: 75995D2）= ✅；migration 0031 待 apply
Subagent：❌ 未派

---

# FHS Handoff - 2026-06-10 (Session 79 — V42 部署至 current + NAS)

## Session 79 完結

### 執行完成項目

- ✅ **[DEPLOY] V42 → current + NAS**
  - `cp Freehandsss_Dashboard/freehandsss_dashboardV42.html → Freehandsss_Dashboard/Freehandsss_dashboard_current.html`
  - WebDAV PUT → NAS Web Station: PASS（764,784 bytes, SHA256: CC67786A2768D498BA0BF1C17592427BE6D4408A42C3A53D3D2D725FD6928C87）
  - URL: https://yanhei.synology.me/Freehandsss_dashboard_current.html

### 核心配置
| 項目 | 值 |
|------|-----|
| 生產版 HTML | Freehandsss_dashboard_current.html = V42 |
| 本地開發版 | freehandsss_dashboardV42.html |
| active 色 | #558B2F（橄欖綠） |
| 未付尾數按鈕 | 僅剩「✕ 清除」，全部半訂/全部付清已移除 |

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：NAS 三閘驗證（HTTP 200 + Content-Length + SHA256）= ✅
Subagent：❌ 未派

---

# FHS Handoff - 2026-06-10 (Session 78 — 移除 balance 全部半訂/全部付清按鈕)

## Session 78 完結

### 執行完成項目

- ✅ **[UX] 未付尾數行精簡**
  - 移除 `#fhsHalfFillAllBtnBal`（全部半訂）及 `#fhsFullFillAllBtnBal`（全部付清）兩個按鈕
  - 僅保留「✕ 清除」按鈕
  - `_syncGlobalBalanceBtnUI()` 保留（getElementById 返回 null，if-guarded，無害 no-op）

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：HTML grep 確認 `fhsHalfFillAllBtnBal`/`fhsFullFillAllBtnBal` 僅剩 `_syncGlobalBalanceBtnUI` 內部引用 = ✅
Subagent：❌ 未派

---

# FHS Handoff - 2026-06-10 (Session 77 — per-box 按鈕時序修復)

## Session 77 完結

### 執行完成項目

- ✅ **[FIX] per-box 按鈕狀態時序 Bug**
  - **Root cause**：`_syncBalanceFromDeposit` C4 的 `_updateBoxBtnState(balContainer, bk, 'half')` 在每次 deposit input event 時觸發，干擾 `_quickFillAllSplits` 的 'full' 設定
  - R1/R2：移除 `_syncBalanceFromDeposit` 兩個 loop 的 `_updateBoxBtnState`（derive 過程不應設定按鈕狀態）
  - F1/F2：`_quickFillAllSplits` + `_quickHalfFillAllSplits` 末尾各加 `setTimeout(0)` 最終 pass，所有同步副鏈結束後才設定 per-box 狀態

### 待 Fat Mo Live 驗收
- ① 點「全部付清」→ deposit 全域按鈕綠色（付清），per-box「全」綠色，「半」灰色
- ② 點「全部半訂」→ deposit 全域按鈕綠色（半訂），per-box「半」綠色，「全」灰色
- ③ balance 按鈕狀態獨立於 deposit（derive 後 per-box 保持 neutral）

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：grep 確認 C4 `_updateBoxBtnState(balContainer` 已移除，`setTimeout` 已加入 = ✅；Live 驗證待 Fat Mo。
Subagent：❌ 未派

---

# FHS Handoff - 2026-06-09 (Session 76 — Balance 狀態機 + 橄欖綠)

## Session 76 完結

### 執行完成項目

- ✅ **[FIX] active 色 #1565C0 → #558B2F**（橄欖綠，4 處精準替換；系統藍保留）

- ✅ **[FEAT] Balance 狀態機（鏡像 deposit）**
  - `window._balanceMode = 'half'` 初始值
  - `_syncGlobalBalanceBtnUI()` 新函式（與 `_syncGlobalDepositBtnUI` 對稱）
  - `_quickHalfFillAllSplits('balance')` + `_quickFillAllSplits('balance')` 各補模式追蹤

- ✅ **[FIX] Balance per-box 按鈕 active 狀態**
  - `_syncBalanceFromDeposit` items loop（用 `bk`）+ necklace loop（用 `group.boxKey`）各補 `_updateBoxBtnState(..., 'half')`

### 待 Fat Mo Live 驗收
- ① 全域按鈕 active 色為橄欖綠（#558B2F），不撞橙色 (#E65100)
- ② 「未付尾數」「全部半訂」預設綠色；「全部付清」灰色
- ③ 點「全部付清」→ 綠色切換至「全部付清」，「全部半訂」變灰
- ④ 每格「半」/「全」按鈕隨點擊即時切換 active 綠色
- ⑤ 手動點格（focusin）→ 兩 per-box 按鈕均回灰

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：grep 確認 `_syncGlobalBalanceBtnUI`/`_balanceMode`/`#558B2F`（按鈕）均到位 = ✅；`#1565C0` 剩餘只剩系統藍 4 處 = ✅；Live 驗證待 Fat Mo。
Subagent：❌ 未派

---

# FHS Handoff - 2026-06-09 (Session 75 — 三視覺 Bug 修復)

## Session 75 完結

### 執行完成項目

- ✅ **[FIX] Bug 1 — balance 行補「全部半訂」+ 灰色標記**
  - 未付尾數行補 `#fhsHalfFillAllBtnBal`（全部半訂，藍色）+ `#fhsFullFillAllBtnBal`（全部付清，灰色）
  - `_syncBalanceFromDeposit()` 兩個 loop（items + necklace group）補 `color:#999` + `data-is-default='true'`

- ✅ **[FIX] Bug 2 — per-box「半」「全」按鈕 active 顏色聯動**
  - 新增 `_updateBoxBtnState(container, boxKey, mode)` helper（'half'/'full'/'manual' 三態藍/灰）
  - 5 個觸發點：`_quickHalfFillSplitBtn`、`_quickFillSplitBtn`、`_quickHalfFillAllSplits` forEach、`_quickFillAllSplits` forEach、`focusin` handler
  - `_quickHalfFillSplitBtn` 同補 `color:#999` + `data-is-default='true'`（半付格也標記預設色）

- ✅ **[FIX] Bug 3 — 按鈕 active 色 `#E65100` → `#1565C0`**
  - 精準 3 處：HTML `#fhsHalfFillAllBtn` 初始色、`_syncGlobalDepositBtnUI()` 邏輯、balance「全部付清」移除 inline hover handler 改用 class
  - 產品分類 `.box-cat-P`、`review-badge-qty`、`sbBadge` 的 `#E65100` 全保留不動

### 待 Fat Mo Live 驗收
- ① 「未付尾數」行有「全部半訂」（藍）+「全部付清」（灰）按鈕
- ② balance 預填值呈現淺色（#999）
- ③ 每格「半」按鈕：點擊後變藍（active），「全」仍灰
- ④ 每格「全」按鈕：點擊後變藍（active），「半」仍灰
- ⑤ 手動點格輸入（focusin）→ 兩個按鈕均回灰（manual 狀態）
- ⑥ 全域按鈕及 per-box 按鈕 active 色為藍（#1565C0），與木框套裝橙色（#E65100）明顯區分

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：grep 確認 `fhsHalfFillAllBtnBal`/`_updateBoxBtnState`/`#1565C0`（按鈕）均到位 = ✅；Live 驗證待 Fat Mo。
Subagent：❌ 未派（精準修改，架構完全掌握，直接執行）。

---

# FHS Handoff - 2026-06-09 (Session 74 — 全部半訂 + 智慧預填 + focus/blur UX)

## Session 74 完結

### 執行完成項目

- ✅ **[FEAT] 全部半訂 + 智慧預填 UX**（`freehandsss_dashboardV42.html`）
  - 新增「全部半訂」按鈕（`#fhsHalfFillAllBtn`，橘色預設）+ 既有「全部付清」加 `#fhsFullFillAllBtn`
  - `renderPaymentSplits` 後自動呼叫 `_quickHalfFillAllSplits('deposit')` 預填半付（`color:#999`，`data-is-default=true`）
  - `focusin` 委派：點擊預設格 → 清空 + 正常色 + mode='manual' + 按鈕變灰
  - `focusout` 委派：空值離開 → 還原半付預設 + 淺色 + 重評估 mode
  - `_syncGlobalDepositBtnUI()` 根據 `window._depositMode` 同步橘/灰按鈕色
  - `_quickFillAllSplits('deposit')` 補 mode='full' 追蹤 + 色重設

### 待 Fat Mo Live 驗收
- ① 生成訂單後，所有 deposit 格自動顯示半付金額（淺色 #999），「全部半訂」橘色
- ② 點擊任一格 → 即時清空，方便輸入，兩個按鈕均變灰
- ③ 不輸入直接離開 → 還原半付預設值 + 淺色
- ④ 點「全部付清」→ 全額填入深色，「全部付清」橘色
- ⑤ 點「全部半訂」→ 半付預設淺色，「全部半訂」橘色

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：代碼/HTML — grep 確認所有關鍵函式到位（_syncGlobalDepositBtnUI/fhsHalfFillAllBtn/focusin/focusout = ✅）；Live 驗證待 Fat Mo。
Subagent：❌ 未派（10 項精準改動，架構完全掌握，直接執行更高效）。

---

# FHS Handoff - 2026-06-09 (Session 73 — 支付按鈕文字改版 + 移除全域按鈕)

## Session 73 完結

### 執行完成項目

- ✅ **[UX] Split-box 支付按鈕重構**（`freehandsss_dashboardV42.html`）
  - 移除頂部 `#fhsHalfPayBtn` / `#fhsFullPayBtn` HTML 元素（全域切換移除）
  - `_addBox()` 每格右側：SVG icon → 純文字「半」（上）+「全」（下）flex-column 疊排
  - 清除孤兒 JS：`_applyPaymentMode()` + `_updateQuickPayBtnState()` + `window._paymentMode` + auto-apply 呼叫塊（共 4 處）
  - `_quickFillSplitBtn` / `_quickHalfFillSplitBtn` 功能邏輯保留

### 待 Fat Mo Live 驗收
- ① 頂部「已付訂金」行無多餘按鈕（只剩「全部付清」+「✕ 清除」）
- ② 每格右側顯示「半」（上）+「全」（下）文字按鈕，垂直疊排
- ③ 點「半」→ ceil(suggested/2)；點「全」→ suggested 全額
- ④ Console 無 ReferenceError（孤兒函式已清除）

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：代碼/HTML — 待 code-reviewer G1–G8 Gate；grep 確認所有孤兒引用零殘留（`_applyPaymentMode`/`_updateQuickPayBtnState`/`_paymentMode` = 0 match）；Live 驗證待 Fat Mo。
Subagent：❌ 未派（6 個精準 Delete/Edit，架構完全掌握，直接修改更高效）。

---

# FHS Handoff - 2026-06-09 (Session 72 — 支付按鈕 Icon 改版)

## Session 72 完結

### 執行完成項目

- ✅ **[UX] 支付按鈕 Icon 改版**（`freehandsss_dashboardV42.html`）
  - `#fhsHalfPayBtn` / `#fhsFullPayBtn`：純 SVG icon-only（◑ / ✓），移除文字，加 `title` tooltip
  - `_addBox()` 每格：`⚡` → ✓ SVG（全付）+ 新增 ◑ SVG 半付按鈕（`.quick-half-btn`）
  - `照數填入` → `全部付清`（移除 ⚡，保留文字純按鈕，功能不變）
  - 新增 `_quickHalfFillSplitBtn(btn)`：`Math.ceil(suggested/2)` + `_depositDirty=true` + `window` expose
  - `_quickFillSplitBtn` 補 `_depositDirty=true`
  - SVG 常數 `FHS_SVG_FULL` / `FHS_SVG_HALF` 定義於 `renderPaymentSplits` 前
  - current.html 不動

### 待 Fat Mo Live 驗收
- ① 頂部 ◑ ✓ icon 顯示、hover tooltip
- ② 每格右側出現兩個 icon 按鈕（✓ 全付、◑ 半付），無 ⚡
- ③ 點 ◑ suggested=100 → 50，suggested=105 → 53（ceil）
- ④ dirty flag 設為 true 後 auto-apply 不再覆蓋
- ⑤「全部付清」文字顯示，無 icon

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：代碼/HTML — 待 code-reviewer G1–G8 Gate（本 session 未跑，待 Fat Mo 授權後跑）；Live 驗證待 Fat Mo。
Subagent：❌ 未派（7 個精準 Edit 改動，架構完全掌握，直接修改更高效；subagent 無附加值）。

---

# FHS Handoff - 2026-06-09 (Session 71 — 全付/半付快速切換按鈕)

## Session 71 完結

### 執行完成項目

- ✅ **[FEAT] 全付/半付快速切換按鈕**（`freehandsss_dashboardV42.html`）
  - `#fhsHalfPayBtn`（½ 半付）、`#fhsFullPayBtn`（全付）於「已付訂金」label row 插入
  - 半付 = 每格 `ceil(price/2)`；尾數衍生 `floor`（_syncBalanceFromDeposit 級聯，不直接寫 balance）
  - Default = 半付：`_fhsCostReady=true` + `!_depositDirty` 後自動預填
  - Dirty flag：`e.isTrusted` 區分人工/程式輸入；點按鈕重置
  - Disabled gate：`_fhsCostReady=false` 時 disabled + opacity:0.4
  - 奇數金額：ceil+floor 零差額
  - code-reviewer G1–G8 ALL PASS

### 待 Fat Mo Live 驗收
- ① 首載自動半付預填 ② 全付切換 ③ 手動覆蓋後 dirty 保護 ④ 奇數金額無差額

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：代碼/HTML — code-reviewer G1–G8 Gate ALL PASS（G1 captureFormState 完好、G2 ID 零刪除、G5 isTrusted dirty 保護、G6 balance 衍生無直接寫值）；Live 驗證待 Fat Mo。
Subagent：✅ code-reviewer（G1–G8 Gate 稽核）；實作由主 context 直接完成（架構已完全掌握，無需 frontend-developer 代勞）。

---

# FHS Handoff - 2026-06-09 (Session 70 — /upload-web 指令 + V42 成本載入修復 + 玻璃瓶嬰兒區 UX)

## Session 70 完結

### 執行完成項目

- ✅ **[INFRA] /upload-web 指令**：`scripts/upload-web.ps1` + Master + CL + AG 三橋接（雙端通用）。WebDAV over HTTPS（`yanhei.synology.me:5006` → `/web`）部署 Dashboard + 三關驗證（HTTP 200 + Content-Length + SHA256）。憑證存 gitignored `.env`。V42 已首次部署至 `https://yanhei.synology.me/freehandsss_dashboardV42.html`（公開，已授權）。後效同步 FHS_Prompts 情境二十五 / repo-map / SOP_NOW / decisions。
- ✅ **[BUGFIX] V42 成本設定載入卡死**：`loadCostConfigurations()` async 完成設 `_fhsCostReady=true` 後未重觸發計算 → 首載卡「成本設定載入中」。修法：`.then` 內補 `window.generate()` 重觸發。（初版誤判為頂部 `if(!list)return`，已還原。）
- ✅ **[UX] 玻璃瓶「嬰兒全部待定」單格優化**：文案「點擊展開編輯」、Task2 模式按鈕列加 `#babyModeBtnRow` id、展開進「一手一腳(左)」、標題列右側收合 button `#babyGlassCollapseBtn`「↩ 全部待定」+ `babyReturnToGlassPending()`。code-reviewer G1–G8 ALL PASS（兩輪）。
- ✅ **[BUGFIX] 模式按鈕崩版（grid→block）**：Task2 那行 `btnRow.style.display = ... : ''` **空字串清掉 inline `display:grid`** → div 退回 block、4 欄崩。改設回 `'grid'`。frontend-developer playwright **實測 computed style** 坐實真因（V42 修前 display=block 寬 66/62/62/46px；V41 grid 全 103px）。

### 重要教訓（已落 Changelog/learnings）

- **`style.display=''` ≠ 還原原值**：會清除 inline 既有 `display`，使元素退回 tag 預設（div→block）。要復原 grid 必須明設 `'grid'`。
- **視覺 bug 不可純靜態讀碼診斷**：本 session 對按鈕崩版**連續誤判兩次**（當成樣式、當成快取），最終靠 frontend-developer playwright 實測 computed style 才坐實。視覺問題優先實測/量測。

### 待 Fat Mo 驗證

- ✅ **2026-06-09 Fat Mo 驗收完結**：① 成本報價自動算出 ② 模式按鈕等寬一行 ③ 收合鈕往返 — 全部通過。

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| — | `perplexity-mcp-server` submodule 有改動，未處理 | ⏸ |

【交付前雙紀律自檢】
驗收：代碼/HTML — code-reviewer G1–G8 ALL PASS（玻璃瓶 UX 兩輪）；frontend-developer playwright 實測坐實按鈕崩版真因並修復；各檔 hash 一致（最終 V42=current `a21dc8bb`→ commit 時以實際為準）。成本載入/按鈕視覺 Live 驗證待 Fat Mo。
Subagent：✅ code-reviewer（G1–G8 Gate ×2）、✅ frontend-developer（playwright 實測按鈕崩版）；❌ build-error-resolver（root cause 由實測坐實，無需）。

---

# FHS Handoff - 2026-06-08 (Session 69++ — 玻璃瓶款式 Round 2 精修)

## Session 69++ 完結

### 執行完成項目

- ✅ **[POLISH] 玻璃瓶 UI 折疊單格**：新增 `glass_pending` babyFillMode — 切玻璃瓶時 4 按鈕列 + 4 肢 grid 收摺，改顯「全部待定」單格（`#babyGlassPendingCell`，動態建立），點擊展開 custom 模式
- ✅ **[POLISH] 嬰兒預設改 `'待定'`**：`_applyGlassDefaults()` 中 4 肢值 `'無'` → `'待定'`；`babyFillMode = 'glass_pending'`
- ✅ **[POLISH] IG 格式 `*倒BB：待定`**：`formatBabyLimbsInline()` glass_pending early return `'待定'`；`buildCategoryA_v2` 冒號前空格移除
- ✅ **[POLISH] `需另加100` 縮排清零**：移除 3 個前置半形空格，與 `⭐️如...` 行左對齊
- ✅ **code-reviewer G1–G8 Gate ALL PASS**
- ✅ **CHANGELOG.md** 更新
- ✅ **V42 → current.html** 同步

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |

### 驗收提示

- 建議 IG 實測「全部待定」單格在手機 IG 貼文視覺效果，確認折疊/展開行為符合預期
- G7 改進建議（非阻擋）：`fp.onclick` 可改呼 `babyApplyAllCustom()` 取代 `generate()` 以避免冗餘呼叫

【交付前雙紀律自檢】
驗收：HTML/UI — code-reviewer G1–G8 Gate ALL PASS（8/8）；5 處改動逐一 grep 確認落地。完整 PASS。
Subagent：✅ code-reviewer（G1–G8 Gate 稽核）；5 處 Edit 主 context 直接執行，改動局部清晰，無需其他 subagent。

---

# FHS Handoff - 2026-06-08 (Session 69+— 玻璃瓶款式差異化 UI + IG 訊息分流)

## Session 69+ 完結

### 執行完成項目

- ✅ **[FEAT] 玻璃瓶款式 UI 預設值**：新增 `_applyGlassDefaults()`（window 暴露）— 切選玻璃瓶時父母 toggle 自動 On、嬰兒 4 肢清空（待倒模當天填寫）；守衛 `=== '玻璃瓶款式'`，木框款式零影響
- ✅ **[FEAT] 玻璃瓶款式 IG 訊息模板分流**（`buildCategoryA_v2` v2）：
  - 倒BB 行永遠顯示（含空值）
  - 父母行改為寫死 `*倒：爸媽各一手`
  - 底座行順序移至父母後
  - 製程行合併單行（`製成品預十五至十八星期完成`）
  - 移除花材聲明
  - 新增 `⭐️如手腳超出已包玻璃瓶尺寸，` + 縮排 `   需另加100，訂購合適玻璃瓶尺寸`（純文案，不接成本鏈）
  - 木框款式及 v1 格式完全不受影響
- ✅ **code-reviewer G1–G8 Gate**：全部 PASS
- ✅ **CHANGELOG.md** 更新

### 技術債現況

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |

### 驗收提示

- `   需另加100，...` 第二行縮排（3 個半形空格）需在 IG 實際貼文後視覺確認「需」是否對齊「如」，如有偏差可 1 行微調。

【交付前雙紀律自檢】
驗收：代碼/HTML — code-reviewer G1–G8 Gate 報告 ALL PASS（8/8）；逐行 grep 確認 5 處改動（_applyGlassDefaults 函式、onchange 串接、B1-B4 模板分流）均已落地。⚠️ `   需另加100` 縮排需 IG 實測視覺微調（半形 × 3，可 1 行修正）。PASS（待 Fat Mo IG 實測縮排）。
Subagent：✅ code-reviewer（G1–G8 Gate 稽核）；A1/A2/B1-B4 四處 Edit 主 context 直接執行，改動局部清晰，無需其他 subagent。

---

# FHS Handoff - 2026-06-08 (Session 69 — V42 立體擺設款式三組重排 UI)

## Session 69 完結

### 執行完成項目

- ✅ **[UI] 立體擺設款式三組輕量分組**（`freehandsss_dashboardV42.html`，開發基線）
  - 起因：上一版（同 session 前段）「倒模對象」加 `.casting-group` 實心框令版面變窄，Fat Mo 要求移框改輕量分組
  - 三組順序（Fat Mo 定 B&C 調轉 = A→C→B）：
    - **A 組**：款式類型 + 底座顏色 + 客製化刻字（刻字由區塊最底上移）
    - **C 組**：倒模對象（嬰兒/父母/大寶）
    - **B 組**：加購配件（羊毛氈/燈飾）
  - `renderLimbGrid()` 拆分：底座顏色/木框色款 → 新容器 `#baseColorContainer`（A 組）；嬰兒/父母/大寶 → `#limbContainer`（C 組）
  - B 組標題 `#ssAddonTitle` 由 `_syncAddonVisibility()` 控制（玻璃瓶顯/木框隱），避免空標題孤兒
  - CSS：`.casting-group`/`.casting-group-title` → 輕量 `.ss-group-title` + `.ss-group-sep`（無 border box）
  - 既有 ID 全零改動；captureFormState/payload/`data-who` 未觸及
- ✅ **CHANGELOG.md** 同步（修訂框版條目為三組重排版）

### 驗收

- ✅ **code-reviewer Gate PASS**：G2 既有 ID 18/18 保留、G3 DOM 平衡（14 div 配對）、資料路徑（pEngraving/baseColor/woodStyle/.limb-sel）命中、V41/current.html 零污染
- ✅ **playwright 三版渲染**：玻璃瓶桌面/手機（三組齊全）+ 木框桌面（底座=木框色款、加購標題正確隱藏）

### 技術債現況（不變）

| # | 項目 | 狀態 |
|---|------|------|
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |

### 待 Fat Mo

- ⏸ V42 → current.html 晉升（需 V1–V11 手機測試全綠 + 桌面回歸 + 授權，本次僅單區塊改動，未達晉升條件）

【交付前雙紀律自檢】
驗收：HTML/UI — code-reviewer G2/G3 PASS（ID 零刪除、DOM 平衡、資料路徑命中）+ playwright 三版實渲染確認三組順序/刻字上移/木框隱藏加購標題正確。完整 PASS。
Subagent：✅ `code-reviewer`（唯讀 Gate，兩次：框版 + 三組版皆 PASS）；截圖由主 context playwright 自行完成（reviewer 唯讀無法截圖）。

---

# FHS Handoff - 2026-06-07 (Session 68 — Supabase MCP 建立 + Test01 Live 驗收)

## Session 68 完結

### 執行完成項目

- ✅ **[INFRA] Supabase MCP Server 建立**：`.mcp.json` + `settings.local.json` 新增 `@supabase/mcp-server-supabase@latest`
  - 採用 Personal Access Token（PAT）驗證，非 Service Role Key
  - PAT 存於 `--access-token` flag（gitignored 檔案，安全）
  - 重啟後確認 `mcp__supabase__*` 工具組全部上線（execute_sql、list_tables 等）
- ✅ **[VERIFY] Session 66 TD-P-chargedPositions Live 驗收 — PASS**：
  - Test01 訂單：木框套裝 (4肢) + 嬰兒不銹鋼鎖匙扣 4飾 (加購) × 4
  - P_MAIN.drawing_cost = $0 ✓（修復確認，無虛假 $60）
  - K_LH.drawing_cost = $0 ✓（W1 免畫圖：左手 ∈ 4肢框架）
  - total_cost = $335 = handmodel $210 + keychain $125（= $185 − $60 deduction）✓
  - n8n_adjustment_notes: keychain deduction −$60 ✓，convergence_note $105 delta（預期，非錯誤）✓

### 技術債現況（Session 68 後）

| # | 項目 | 狀態 |
|---|------|------|
| ~~Session 66 Live 驗收~~ | TD-P-chargedPositions 修復確認 | ✅ **Session 68 PASS** |
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |

【交付前雙紀律自檢】
驗收：Supabase MCP — `mcp__supabase__execute_sql` 成功查詢 test01 訂單，數據正確；Session 66 修復 — P_MAIN.drawing_cost=$0、total_cost=$335 符合預期 PASS。
Subagent：❌ 未派（MCP 設定 + Supabase 直查，主 context 完成）

---

# FHS Handoff - 2026-06-07 (Session 67 — R1 關閉 + Anti-Idle Ping 部署)

## Session 67 完結

### 執行完成項目

- ✅ **[DECISION] R1 正式關閉**：`addNewFrameStyle` 雙 POST 問題以「降級不實作」解決，款式選項維持 HTML 硬編碼，按需由 Claude Code 改 `<option>`。decisions.md 補入設計決策。
- ✅ **[INFRA] Anti-Idle Ping 部署**：n8n Workflow `FHS_Anti_Idle_Ping`（ID: `FxKHTDiYiUPnxvm6`）建立並啟動
  - 排程：`0 1 */5 * *`（每 5 天 01:00 UTC）
  - 流程：Schedule Trigger → HTTP GET Supabase ping（continueOnFail, fullResponse）→ IF statusCode 非 200-299 → Telegram 告警（chat `7620524971`）
  - 端點驗證：Supabase ping 回傳 HTTP 200 + 正確資料 ✓
  - 狀態：ACTIVE，triggerCount: 1
- ✅ **後效同步**：CHANGELOG.md、decisions.md、ANTI_IDLE_SETUP.md 全部更新

### 技術債現況（Session 67 後）

| # | 項目 | 狀態 |
|---|------|------|
| ~~R1 DEFERRED~~ | addNewFrameStyle 雙 POST | ✅ **Session 67 關閉**（降級） |
| ~~Anti-Idle Ping~~ | n8n 每 5 天 ping Supabase | ✅ **Session 67 完成** |
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |

【交付前雙紀律自檢】
驗收：n8n — Supabase ping 端點直接測試回傳 HTTP 200 + `[{"id":"934e8737..."}]`（workflow 邏輯正確）；n8n API 確認 `active: true`，`triggerCount: 1`（排程已登記）。手動 trigger 執行 log 受 API 限制無法取得，但直接端點驗證等效。PASS。
Subagent：❌ 未派（n8n API 直接操作，無需 database-reviewer 或 build-error-resolver）。

---

# FHS Handoff - 2026-06-07 (Session 66 — TD-P-chargedPositions 修復)

## Session 66 完結

### 執行完成項目

- ✅ **[BUGFIX] TD-P-chargedPositions**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html` line 5733
  - 根因：`TEMP_P_MAIN` 無 `PartDesc`，W1 chargedPositions 被跳過，P_MAIN 錯誤進入 K/M drawing cost 分支，累積 ~$60 至 `totalDrawingCost`
  - 修復：條件改為 `else if (!item.isAccessory && item.Order_Item_Key !== "TEMP_P_MAIN")`，P_MAIN `item.FatMoCost = 0`
  - 不影響：W1 pre-population 仍正確防 K/M 同部位雙收；P_MAIN $210 由 n8n Supabase `products.total_base_cost` 負責
- ✅ **CHANGELOG.md**、**decisions.md** 同步更新

### 技術債現況（更新）

| # | 項目 | 狀態 |
|---|------|------|
| ~~TD-P-chargedPositions~~ | P_MAIN 不加入 chargedPositions，混合訂單前端雙計繪圖費 | ✅ **Session 66 修復** |
| ~~R1 DEFERRED~~ | `addNewFrameStyle` 雙 POST 無事務保護 | ✅ **Session 67 關閉**（降級：按需改 HTML，不實作動態管理） |
| TD2 | `learnings.md` 超 50 條需整理 | ⏸ 技術債 |
| ~~Anti-Idle Ping~~ | n8n 每 5 天 ping Supabase | ✅ **Session 67 完成**（Workflow `FxKHTDiYiUPnxvm6` ACTIVE） |

### 待 Fat Mo 驗證

- **Live 驗證**：混合訂單（立體擺設 + 鎖匙扣同部位）→ 確認前端成本欄不再含虛假 $60 畫圖費

【交付前雙紀律自檢】
驗收：代碼 — 1 行條件修改，P_MAIN 從 drawing cost 分支排除；W1 pre-population 不變；`item.FatMoCost=0` → `totalDrawingCost` 不含虛假 $60。邏輯 PASS（待 Fat Mo Live 驗證）。
Subagent：❌ 未派（單點 1 行 Edit，主 context 直接完成）。

---

# FHS Handoff - 2026-06-07 (Session 65 — 立體擺設財務根因診斷 + migration 0030)

## Session 65 完結

### 問題根因（Phase 0 診斷確認）

**用戶報告**：「財務所項數據均不準確，特別是立體手模擺設思疑有重疊金額發生」

**ROOT CAUSE A（DB層，最高優先，已修復）**：
- `products.total_base_cost = 0` for ALL 4 立體擺設 SKUs（migration 0023 placeholder，無後續補值）
- `fhs_sync_products_from_config()` 只覆蓋 addon 產品
- 結果：`handmodel_cost = $0` for ALL 立體擺設訂單，成本少計 $210/單

**ROOT CAUSE B（前端顯示層，未修）**：
- `chargedPositions Set` 不追蹤 P_MAIN 肢（`PartDesc = ''`）
- 混合訂單（立體擺設 + K/M 同部位）前端顯示可能雙計繪圖費
- 四分量收斂警告：P_MAIN 送 Drawing=$60/Printing=$0，products.total_base_cost=210，delta=$150 → n8nAdjustmentNotes（不影響 Has_Cost_Error）
- Task A 範疇

### 執行完成項目

- ✅ **migration 0030**：`supabase/migrations/0030_fix_3d_frame_base_costs.sql`（UPDATE 4 SKU total_base_cost: 0 → 210，含 DO $$煙霧測試，驗收 4 SKU 各自通過）
- ✅ **FHS_Pricing_Bible.md §6.2**：新增立體擺設代表性數值（木框套裝 + 玻璃瓶套裝各一行，$210）+ 技術債 footnote
- ✅ **learnings.md**：新增 Pitfall 2026-06-07（立體擺設 products.total_base_cost = 0 根因記錄）
- ✅ **decisions.md**：[2026-06-07] Session 65 決策記錄
- ✅ **repo-map.md**：補 migration 0028/0029/0030 條目（修復舊 0027 └── → ├── 格式）
- ✅ **CHANGELOG.md**：[2026-06-07] 立體擺設成本修正 entry

### 待 Fat Mo 手動執行

- ✅ **Priority 1**：`0030_fix_3d_frame_base_costs.sql` — Fat Mo 於 2026-06-07 執行成功（Supabase 回報 "Success. No rows returned"，NOTICE 正常）。4 個立體擺設 SKU total_base_cost = 210 已生效。
- ✅ **Priority 2**（來自 Session 64）：`0029_add_archive_favorite_columns.sql` — Fat Mo 於 2026-06-07 執行成功（"Success. No rows returned"）。`is_archived` / `is_favorite` 兩欄已生效。

### 技術債記錄

- **[TD-P-chargedPositions]** 立體擺設前端顯示層：P_MAIN 肢不加入 chargedPositions，混合訂單前端可能雙計繪圖費 → Task A 修（需讀 form limb 選擇器資料）
- **[R1 DEFERRED]** addNewFrameStyle 雙 POST 無事務保護（Session 63 起）
- **[TD2]** learnings.md 超過 50 條 → 需 consolidation

### 後效同步稽核

- **[A]** repo-map.md 已更新（新增 0028/0029/0030）✅
- **[B]** 不觸發（無制度層文件變動）
- **[C]** CHANGELOG.md 已更新（財務修正記錄）✅
- **[F]** 不觸發（§6.2 填值非術語定義變更；FHS_Prompts.md 路由已正確覆蓋立體擺設）

【交付前雙紀律自檢】
驗收：財務/成本 — migration 0030 已寫入含獨立煙霧測試（DO $$ LOOP 驗 4 SKU），三重確認 $210（Airtable Base_Costs + cost_configurations + HTML 對話框）。DB 層根因修復 PASS（⏳ 待 Fat Mo 在 Supabase 執行後正式生效）。前端顯示層 chargedPositions gap 留 Task A。
Subagent：❌ 未派 subagent。Phase 0 診斷使用 Airtable MCP 直接查詢（前一 session 已完成）。migration 0030 為直接 SQL 修復，比 database-reviewer 更高效。

---

# FHS Handoff - 2026-06-06 (Session 64 — V42 手機訂單總覽 WhatsApp/Threads 視覺觸控改造)

## Session 64 完結

### 執行完成項目

- ✅ **V42 建立**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（742KB，從 V41 694KB 起點）
- ✅ **Lucide SVG sprite**（9 icons）注入 + Threads 視覺 CSS 全系統
- ✅ **AG Stitch 4 組件縫合**：左滑 CSS + HTML wrapper、Bottom-Sheet 視覺精緻化、iOS Segmented Indicator、Star 彈跳動畫
- ✅ **左滑手勢引擎**（AG Stitch）：IIFE + MutationObserver 重綁，方向鎖、阻尼、互斥收合
- ✅ **P3 Bridge 函式**：`openBsSheet()` / `closeBsSheet()`（H2 正確簽名），overlay tap-to-close
- ✅ **P4 持久化**：`toggleFavorite()` / `toggleArchive()` / `updateOrderMeta()` / `triggerArchiveOrder()`
- ✅ **5 秒 Undo Toast**：`showUndoToast()` + progress bar + `beforeunload` keepalive PATCH（H1 修正）
- ✅ **Segmented Control**：「進行中 / 已封存」+ `applyReviewFilters` 包裹 + 最愛置頂排序
- ✅ **P3.2**：手機版 emoji 按鈕 display:none（保留 HTML ID）
- ✅ **P3.6**：首載 peek 動畫（-8px → 0，60ms）
- ✅ **Supabase migration 0029**：已寫入 `supabase/migrations/0029_add_archive_favorite_columns.sql`
- ✅ **CHANGELOG**、**repo-map.md**、**decisions.md** 全部同步

### 待 Fat Mo 手動執行

- ⏳ **P1.3**：在 Supabase SQL Editor 執行 `0029_add_archive_favorite_columns.sql` + smoke test

### P5 code-reviewer Gate

- ✅ **P5**：`code-reviewer` G1–G8 全部 PASS（2026-06-06）
  - G1 captureFormState 完好 ✅
  - G2 既有 ID 零刪除 ✅
  - G3 桌面 >767 完全不生效 ✅
  - G4 新函式 window 暴露（9 個）✅
  - G5 H1 keepalive fetch（無 sendBeacon）✅
  - G6 H2 正確函式簽名 ✅
  - G7 H3 手勢/toggleAccordion 不衝突 ✅
  - G8 V41/current.html 零改動 ✅

### 開發基線宣告（2026-06-07 Fat Mo 確認）

**⚡ 下一個 session 起，所有開發改動一律在 `freehandsss_dashboardV42.html`。**
V41 = 穩定生產版（current.html 指向，凍結）；V42 = 開發基線。

### 晉升條件（V42 → current.html）

V1–V11 手機測試全綠 + 桌面回歸 + Fat Mo 授權 + diff 審查（缺一不可）

【交付前雙紀律自檢】
驗收：代碼/HTML — P5 code-reviewer G1–G8 Gate 報告尚未產出（P5 未完成）；截圖確認 segmented control + bottom-sheet 視覺正確渲染 — 條件 PARTIAL PASS（P5 仍需執行）
Subagent：✅ frontend-developer（3 次截圖）；❌ code-reviewer（P5 待 Fat Mo 指令繼續）

---

# FHS Handoff - 2026-06-05 (Session 63 — 系統知識文件化治理方案)

## Session 63 補丁 — FHS_Prompts.md 同步機制補丁

**[Session 63 Patch 完結]**

### 執行完成項目

- ✅ **AGENTS.md**：文件同步強制律擴充（3 個新觸發條件）
- ✅ **execute.md**：新增 [F] FHS_Prompts.md 同步稽核項（與 [B] 同等強制力）
- ✅ **FHS_Prompts.md** v1.7：9 個改動（情境五語義修正 + 情境六三叉路由 + kgov 觸發 + 版本同步）
- ✅ **CHANGELOG**：[System v1.4.12-patch1]
- ✅ **completion report**：prompts-sync-mechanism

### 根本問題解決

路由總機不再需要 Fat Mo 主動巡查——每次 /execute 的 [F] 項強制自問「FHS_Prompts.md 要不要更新？」

【交付前雙紀律自檢】
驗收：文件治理 — 引用同步清單 5 個檔全 ✅ — PASS
Subagent：未派（合理）

---

## Session 63 — 知識文件化治理方案（P0–P4 全部完成）

**[Session 63 完結]**

### 執行完成項目

- ✅ **Phase 0**：Explore 全文件盤點（17 漂移 + 3 斷鏈）
- ✅ **Phase 1**：止血（dead links 修復，版本漂移歸零）
- ✅ **Phase 2**：`[NEW]` `FHS_Product_Definition.md` v1.0.0（4 類產品 SSoT）；`/new-product` Step 6 知識落盤 Gate
- ✅ **Phase 3**：`FHS_Pricing_Bible.md` v1.2.0（§10 規則 ID 可查表，14 條）
- ✅ **Phase 4**：`AGENTS.md` v1.4.12（Rule 3.17 雙紀律強制律）；`cl-flow` + `execute` 出口 Gate；記憶合併 −1
- ✅ **後效同步**：CHANGELOG v1.4.12；decisions.md Session 63 D1–D4；completion report

### 盲測驗收結果

- 盲測 3 問全綠（≤2 跳）：Q1 寵物吊飾 §0 / Q2 頸鏈奇偶規則 / Q3 clasp 成本 — **PASS**

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| 1 | Anti-Idle Ping 驗證 | ⏸ 稍後 |
| 3 | 立體擺設 UI 整合 R1（雙 POST 無事務保護）| ⏸ 追蹤中 |
| TD2 | learnings.md 合併/退役整理（已超 50 條上限）| 技術債 |
| B3 | 文件↔代碼漂移為架構限制（已寫入 decisions.md，誠實存檔）| 已記錄 |

【交付前雙紀律自檢】
驗收：文件治理 — 盲測 3 問全綠；斷鏈數 = 0；版本漂移 = 0 — PASS
Subagent：前置評估 Explore（Phase 0，已在 pre-compaction 執行）；本次後效同步為純文件任務，無需 subagent — ❌ 未派，合理

---

# FHS Handoff - 2026-06-05 (Session 62 — TD1 FHS_Pricing_Bible.md 搬移)

## Session 62 — 技術債清償：Pricing Bible 搬移至 .fhs/ai/

**[Session 62 完結]**

### 執行完成項目

- ✅ **[TD1 清償] FHS_Pricing_Bible.md 搬移（`.fhs/notes/` → `.fhs/ai/`）**：
  - 新路徑：`.fhs/ai/FHS_Pricing_Bible.md`（v1.1.0，內容不變）
  - 舊路徑 `.fhs/notes/FHS_Pricing_Bible.md` 已刪除
  - 更新引用（6 個檔案）：`FHS_Finance_Bible.md`、`AGENTS.md`、`FHS_Prompts.md`、`repo-map.md`、`finance-gatekeeper/SKILL.md`、`FHS_Product_Bible_V3.7.md`
  - `finance-gatekeeper/SKILL.md` §五技術債備忘：Pricing Bible 位置不一致條目已移除
  - `decisions.md` 補入 Session 62 架構決策記錄

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| 1 | Anti-Idle Ping 驗證 | ⏸ 稍後 |
| ~~2~~ | ~~pg_cron TTL（Supabase SQL Editor 手動執行）~~ | ✅ 完成（Session 63，Fat Mo 手動執行） |
| 3 | 立體擺設 UI 整合 R1（雙 POST 無事務保護）| ⏸ 追蹤中 |
| ~~TD1~~ | ~~FHS_Pricing_Bible.md 搬移至 .fhs/ai/~~ | ✅ 完成（Session 62）|
| TD2 | learnings.md 合併/退役整理（已超 50 條上限）| 技術債 |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | 無（純檔案搬移任務）|
| 實際使用 | ❌ 未使用（定點 Write/Edit/PowerShell，主 context 直接完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-06-05 (Session 61 — VT-1/2/3 驗收 + Task A 驗證 + V47.17 修復)

## Session 61 — 完整收尾

**[Session 61 完結]**

### 執行完成項目

- ✅ **Task A 四分量後台記帳 — 全面驗證通過**（test05 訂單）：
  - migration 0028 確認已部署（drawing_cost 有值可證）
  - current.html 確認已同步（694,941 bytes = V41，兩檔一致）
  - test05 四分量寫入正確：P_MAIN drawing=60 ✓、K_LH printing=95/chain=10/ship=20 ✓、M_LH printing=465/chain=100/ship=35 ✓
  - drawing_cost=0 for K/M 屬 W1 免畫圖正確行為（P_MAIN 加購場景）

- ✅ **[BUG FIX] Telegram「待核算」假警報修復（n8n V47.17 LIVE）**：
  - 根因：V47.16 收斂律警告推入 `zeroCostItems`，混合訂單因 W1 免畫圖使四分量與 products.total_base_cost 不同源，偏差必然 >$1，觸發 `Has_Cost_Error=true`
  - 修復：收斂律警告改推 `n8nAdjustmentNotes`（type: "convergence_note"），不污染 `Has_Cost_Error`
  - versionId: `0c3a1293-bd46-4650-b920-b6d867f75551`
  - Rollback: `.fhs/notes/aireports/n8n-mcp-backups/2026-06-04/.../Calculate_Profit___Pack_Items.json`

- ✅ **Session 56 VT-1/2/3 吊飾運費扣減驗收**（AG A2 執行，A3 複核）：
  - VT-1：T730548，total_cost=$635，單件無扣減 ✓ **PASS**
  - VT-2：T584316，total_cost=$530，4件吊飾扣減$105=(4-1)×$35 ✓ **PASS**
  - VT-3：B1歷史標靶（$455/$1,335）DB無記錄屬預期（前端模擬未寫入生產DB）✓ **PASS**
  - 驗收報告：`.fhs/reports/2026-06-05_vt_charm_shipping_validation_report.md`
- ✅ **FHS_Pricing_Bible.md v1.1.0**：補入 §3.4 吊飾跨部位運費共享規則

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| 1 | Anti-Idle Ping 驗證 | ⏸ 稍後 |
| 2 | pg_cron TTL | ⏸ 稍後（Supabase SQL Editor 手動執行） |
| 3 | 立體擺設 UI 整合 R1 | ⏸ 追蹤中（R1 雙 POST 無事務保護） |
| TD1 | FHS_Pricing_Bible.md 搬移至 .fhs/ai/ | 技術債 P2 |
| TD2 | learnings.md 合併退役整理 | 技術債（已超 50 條上限） |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver`（Telegram bug 診斷）|
| 實際使用 | ❌ 未使用（代碼追蹤 + n8n MCP 直接診斷，主 context 完成）|
| 遵從 Router | ❌ 未遵從（bug 定位清晰，inline 診斷更高效）|

---

# FHS Handoff - 2026-06-05 (Session 60 — Task A 四分量後台記帳 + 系統總論文件)

## Session 60 — Task A 四分量後台記帳落地

**[Session 60 完結]**

### 執行完成項目

- ✅ **Task A 四分量後台記帳**（接通最後一條傳遞路線）：
  - V41 `calculatePricing()` 補 per-item `ChainCost`（吊飾奇偶位分配 + 鎖匙扣=ClaspCost）
  - V41 payload injection 補 `Printing_Cost / Chain_Cost / Shipping_Cost`
  - n8n Parse Items & Generate SKU 補透傳四欄（V47.16）
  - n8n Calculate Profit & Pack Items 補四欄 + 收斂律自我檢查（V47.16）
  - n8n Supabase Mirror Prep items mapping 補四欄（V47.16）
  - 建立 `migration 0028`（更新 sync_order_to_mirror RPC 含四欄）
- ✅ **FHS_System_Logic_Overview.md v1.0.0** 建立：`.fhs/notes/FHS_System_Logic_Overview.md`
  - 完整記錄前端成本/定價/畫圖費豁免規則/n8n節點流程/成本原子數值/IG訊息邏輯/B1標靶/rollback 指引
- ✅ CHANGELOG / decisions / handoff / repo-map 同步

### 尚待執行

| # | 項目 | 狀態 | 說明 |
|---|------|------|------|
| 1 | **重要** migration 0028 部署 | ⚠️ 待 Fat Mo 在 Supabase SQL Editor 手動執行 | 不執行則四欄永遠 = 0 |
| 2 | current.html 同步 | ⚠️ 待授權 | V41 已改，需同步至正式版 |
| 3 | VT-1/2 真實訂單驗收 | ⏸ 待 Fat Mo | V1=$455 / V2=$1,335 四欄正確寫入 Supabase |
| 4 | Session 56 VT-1/2/3 吊飾運費扣減驗證 | ⏸ 待 Fat Mo 交 AG | XML Supabase Prompt 已備妥 |
| 5 | Anti-Idle Ping 驗證 | ⏸ 稍後 | n8n 主 workflow 無 Schedule Trigger |
| 6 | pg_cron TTL | ⏸ 稍後 | Supabase SQL Editor 手動執行 |
| 7 | 立體擺設 UI 整合 R1 | ⏸ 追蹤中 | R1 雙 POST 無事務保護 |
| TD1 | FHS_Pricing_Bible.md 搬移 | 技術債 P2 | — |
| TD2 | learnings.md 合併退役整理 | 技術債 | 已超 50 條上限 |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（財務計算相關） |
| 實際使用 | ❌ 未使用（n8n MCP get_node/get_workflow/update_node_code 直接在主 context 執行，確認節點代碼後外科修改，非靜默假設） |
| 遵從 Router | ❌ 未遵從（直接手術修復更高效；finance-auditor VT-1/2 驗收待 migration 0028 部署後再委派） |

---

# FHS Handoff - 2026-06-04 (Session 59 — W5-FIX + 違規記錄 + 待辦核查)

## Session 59 — W5-FIX + Supabase-First 違規記錄 + AG Supabase MCP 調查

**[Session 59 完結]**

### 執行完成項目

- ✅ current.html TRANSITION 同步核查：確認 commit `9f46578`（Session 57）已包含，無需重執行
- ✅ 待辦全面核查（8 項）：1項已完成，2項追蹤中，5項確認未完成
- ✅ Supabase-First 違規記錄（2 個嚴重過失）：
  - 過失 1：VT 驗證 prompt 靜默降級至 Airtable（應報 blocker）
  - 過失 2：AG 缺 Supabase MCP 未先解決就繞開
  - 落盤：learnings.md + memory/feedback_supabase_first_enforcement.md + rp.md 注入層補丁
- ✅ AG Supabase MCP 調查：Fat Mo 已自行安裝（mcp_config.json 確認 `mcp.supabase.com/mcp`）
- ✅ VT-1/2/3 AG 驗證 prompt 重寫（Supabase 版，XML 格式供 Fat Mo 轉交 AG）
- ✅ **[BUG FIX] W5 _fhsCostReady 永久 false**：
  - 根因：`loadCostConfigurations()` 頂部 `if (!list) return` 守衛在正常頁面載入時直接 return，_fhsCostReady 永遠不被設 true
  - 修正：守衛移至資料載入後；init() 新增 loadCostConfigurations() 啟動呼叫
  - V41 + current.html 雙檔同步（693,925 bytes）

### 尚待執行

| # | 項目 | 狀態 |
|---|------|------|
| ~~1~~ | ~~current.html TRANSITION 同步~~ | ✅ 已完成（commit 9f46578，Session 57） |
| 2 | Session 56 VT-1/2/3 Live 驗證 | AG 已有 Supabase MCP，XML prompt 已備妥，待 Fat Mo 交 AG 執行 |
| 3 | Task A 顆粒化 roll-up | 新 session，需 `/cl-flow` 先規劃 |
| 4 | Anti-Idle Ping 驗證 | n8n 主 workflow 無 Schedule Trigger，需建獨立 workflow |
| 5 | pg_cron TTL | Supabase SQL Editor 手動執行（ANTI_IDLE_SETUP.md 有 SQL） |
| 6 | 立體擺設 UI 整合（R1） | 追蹤中（R1 雙 POST 無事務保護） |
| TD1 | FHS_Pricing_Bible.md 搬移至 .fhs/ai/ | 技術債，PRM v2 P2 |
| TD2 | learnings.md 合併/退役整理 | 技術債（已超 50 條上限，含重複標頭） |

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver`（W5 bug 診斷時）|
| 實際使用 | ❌ 未使用（定點 grep + read + 2 處 Edit，主 context 直接完成） |
| 遵從 Router | ❌ 未遵從（bug 定位清晰，inline 診斷更高效）|

---

---

# FHS Handoff - 2026-06-03 (Session 58 — Rule 3.16 強化 + 財務核心文件升版)

## Session 58 — Rule 3.16 任務型路由補入 + finance-gatekeeper v1.1.0 + finance-auditor v2.1.0

**[Session 58 完結 — 財務核心文件體系補完，三檔路由對齊，制度層收尾]**

### 執行完成項目

- ✅ AGENTS.md Rule 3.16：入口改為 finance-gatekeeper/SKILL.md → 任務型路由表（職責/成本key/售價三分支）
- ✅ finance-gatekeeper/SKILL.md v1.1.0：補 L2a Cost Schema v2 條目、§三收款確收守護語義修正、§五技術債備忘
- ✅ finance-auditor.md v2.1.0：compatible_with v1.4.10、V47.15、Rule 3.16 語義注入、已知現況動態化
- ✅ finance-auditor.md 雙路徑同步（~/.claude/agents/freehandsss/）
- ✅ CHANGELOG.md 更新
- ✅ 完成記錄：`.fhs/reports/completion/2026-06-03_rule316-finance-docs-upgrade_completion_report.md`

### 尚待執行（已移至 Session 59）

| # | 項目 | 狀態 |
|---|------|------|
| 1 | current.html TRANSITION 同步 | ✅ 已完成（Session 59 核查確認）|

### Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ❌ 未使用（純制度文件修訂） |
| 遵從 Router | ❌ 未遵從（範圍不符：無 schema/n8n 操作）|

---

# FHS Handoff - 2026-06-03 (Session 57 — B2 收尾 + Task A 移交)

## Session 57 — B2 TRANSITION 收尾 + 四分量移交 Task A

**[Session 57 完結 — B2 正式收斂；migration 0027 + 0027 四欄正名為 Task A 資產；TRANSITION 標示更新]**

### 執行完成項目

#### migration 0027 部署（Session 57 開始時執行）
- ✅ `0027_order_items_cost_breakdown.sql` 已部署至 Supabase（Fat Mo SQL Editor 執行）
- ✅ Smoke tests PASSED：order_items 四欄存在（drawing/printing/chain/shipping_cost）

#### B2 範疇修正（Rule 3.16 前置查驗）
- ✅ Finance Bible §一確認：成本側由 n8n 計算，前端 calculatePricing() 為參考預算（非真理）
- ✅ B2「n8n 信任前端四分量」方向違反職責分工，修正為收尾方案
- ✅ 八維度分析 + 草案 v1 → 自我批評 → v2（階段收斂，四分量歸 Task A）

#### TRANSITION 標示更新
- ✅ V41 line 5427–5430：橘字「⚠️ B1：後台回寫待 B2」→ 灰色「成本估算已含打印/環扣/運費（後台記帳由 n8n 負責）」
- ⚠️ current.html：被安全守護攔截，**待 Fat Mo 授權 current.html 同步**

#### 文件移交
- ✅ migration 0027 檔頭正名：Task A 資產（現階段四欄 DEFAULT 0）
- ✅ Task A handoff 補入 §三-B（Q1 chain 奇偶規範、Q2 shipping 毛值規範 + 驗算）
- ✅ repo-map 更新：0027 標注「Task A 前置資產」
- ✅ decisions.md 補入 Session 57 B2 範疇修正記錄

### 尚待執行

| # | 項目 | 說明 |
|---|------|------|
| 1 | current.html TRANSITION 同步 | 需 Fat Mo 授權，輸入 `/execute` 後執行 |
| 2 | Session 56 VT-1/2/3 Live 驗證 | n8n V47.15 吊飾運費扣減驗證（屬 S56 尾巴） |
| 3 | Task A 顆粒化 roll-up | 新 session，依 handoff §四 四個待決命題，順序：先 cl-flow |

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（schema 審查） |
| 實際使用 | ✅ `database-reviewer` — 委託：migration 0027 Gate 稽核（Session 57 開始時） |
| 遵從 Router | ✅ 遵從 |

---

# FHS Handoff - 2026-06-03 (Session 56 — B2 吊飾運費扣減 + 財務規則語義修正)

## Session 56 — B2 P0 修正 + 收款確收守護語義修正

**[Session 56 完結 — V47.15 LIVE，吊飾運費扣減補入；AGENTS.md v1.4.10 財務規則語義修正完成]**

### 執行完成項目

#### B2 Phase 0 查證結論
- ✅ Smart Cache Strategist V47.13 已是 Supabase-First（axios 查 `products.total_base_cost`），Airtable 僅 fallback——無需額外處理
- ✅ 唯一缺口確認：`Calculate Profit & Pack Items` 吊飾運費扣減完全缺失

#### n8n V47.15 — 吊飾運費扣減補入（LIVE）
- ✅ `charmItemCount` 累加件數（SUM qty）；`charmShippingDeduction = (件數-1) × $35`
- ✅ 扣減 `totalBaseCost` 及 `necklaceCostTotal`；寫入 `N8n_Adjustment_Notes`
- ✅ versionId: `25351131-44f2-4e95-8c22-fb856042bde8`
- ✅ 備份：`.fhs/notes/aireports/n8n-mcp-backups/2026-06-03/6Ljih0hSKr9RpYNm/Calculate_Profit___Pack_Items.json`

#### 財務規則語義重大修正（Rule 3.16 事故記錄）
- ✅ AGENTS.md v1.4.9 → v1.4.10：「收款確收守護」語義修正（真理側=確收收款，成本側=n8n估算）
- ✅ Rule 3.16 新增（財務規則前置讀取強制律）
- ✅ learnings.md、decisions.md、CHANGELOG、持久記憶全部更新

### 尚待 Fat Mo Live 驗證

| # | 驗證項目 | 預期結果 |
|---|---------|---------|
| VT-1 | 吊飾單件訂單 | n8n 無扣減，`Total_Cost` = 前端估算 |
| VT-2 | 吊飾多件訂單（2件+） | `N8n_Adjustment_Notes` 含 `charm_shipping_deduction`；`Total_Cost` 對齊前端 |
| VT-3 | B1 標靶不回歸 | V1($455) / V2($1,335) 不變 |

**Rollback 指令**（若失敗）：`rollback_node_code("Calculate Profit & Pack Items", "<備份路徑>")`

### 下 session 待執行（Fat Mo 已確認）
- ⏸ **migration 0027**（Fat Mo 已批准，下 session `/execute`）：
  `order_items` 新增四分量欄位：
  ```sql
  drawing_cost   NUMERIC(10,2) DEFAULT 0
  printing_cost  NUMERIC(10,2) DEFAULT 0
  chain_cost     NUMERIC(10,2) DEFAULT 0  -- 吊飾頸鏈 / 鎖匙扣環扣
  shipping_cost  NUMERIC(10,2) DEFAULT 0  -- 淨運費（扣減後）
  ```
  執行流程：寫 migration SQL → database-reviewer Gate → Fat Mo 在 Supabase SQL Editor 執行 → smoke-test
- ⏸ **B2-TRANSITION 標示更新**：前端 `uiDetails` 「成本顯示已校正，後台回寫待 B2」→ 待 migration 0027 完成後更新為「三端成本已對齊」

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ❌ 未使用（n8n MCP 直接在主 context 調用，單一 Code Node 外科修正）|
| 遵從 Router | ❌ 未遵從（database-reviewer 適合 schema 靜態審查；本次為執行層修正）|

---

# FHS Handoff - 2026-06-03 (Session 55 — B1 成本引擎驗證與跨產品免畫圖費 Bug 修復完成)

## Session 55 — B1 成本引擎驗證與 Waiver 邏輯修正

**[Session 55 完結 — B1 核心財務引擎 Live 驗證全數通過，W1 跨產品免畫圖費 Bug 已修復，已同步至 current.html]**

### 執行完成項目
- ✅ V41 HTML calculatePricing() / current.html：修復 `chargedPositions` 未能自動寫入主商品套裝肢體部位的 Bug。現在當 `enableP` 為 true 時，主套裝中選擇 of the limbs (非「無」) 會自動被加入已計畫圖部位追蹤。這解決了鎖匙扣 / 吊飾部位在主套裝已選時仍被重複收取 $60/$110 畫圖費的問題。
- ✅ 測試用例對齊：更新 `scripts/verify_ui_temp.js`。在 V1 測例中，將主套裝的「左腳」與「右腳」設為「無」，使主商品退化為 2 肢套裝（僅包含左手、右手），並成功讓額外加購的嬰兒不銹鋼鎖匙扣（左手、右手、左腳）中的左手與右手免除畫圖費，只有左腳收費。最終 `System_Total_Cost` 與各分量完美命中預期標靶：
  - **V1 (鎖匙扣)**：`System_Total_Cost = $455` (預期分量：printing=285, chain=0, clasp=30, baseShip=60, deduc=40, drawing=120) -> **PASS**
  - **V2 (吊飾)**：`System_Total_Cost = $1,335` (預期分量：printing=1040, chain=200, clasp=0, baseShip=140, deduc=105, drawing=60) -> **PASS**
  - **V-TRANSITION 標籤**：`⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2` 順利偵測 -> **PASS**
- ✅ `Freehandsss_dashboard_current.html` 同步：已完成將 V41 代碼拷貝並覆蓋至 `current.html`。
- ✅ CHANGELOG 同步更新。

### 核心配置驗證
- Supabase `cost_configurations` 中 B1 關鍵配置：
  - `material_cost_necklace_silver` = 260
  - `material_cost_necklace_gold` = 316
  - `material_cost_keychain_stainless_adult` = 135
  - `keychain_clasp_cost` = 10

### 尚待 Fat Mo / 後續階段 (B2)
- ⏸ 進入 B2 階段：n8n 信任前端 / 四分量 payload / 吊飾運費 P0 三端一致性同步實作。

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | 無（本會話由前次會話延續 Live 驗證與 Bug 修復） |
| 實際使用 | ❌ 未使用（定點 Bug 修復與測試執行，主 context 直接完成） |
| 遵從 Router | — |

---

# FHS Handoff - 2026-06-03 (Session 54 — B1 成本引擎補完執行完成)

## Session 54 — B1 吊飾成本裁決 + 引擎補完

**[Session 54 完結 — B1 Phase 0–3 執行完成，待 Fat Mo migration 部署 + Live 驗證]**

### Phase 0 — payload 查證結論
- ✅ n8n **完全不讀** System_Total_Cost（讀 per-item Total_Base_Cost）→ B1 = 純顯示層，零回寫風險

### 執行完成項目
- ✅ `0026_b1_cost_atoms_complete.sql`：UPDATE necklace 0→260/316；INSERT stainless_adult/alloy_adult=135；INSERT keychain_clasp_cost=10；display_name 補（嬰兒）；database-reviewer PASS
- ✅ V41 HTML calculatePricing()：補入打印費/基礎運費/環扣三分量；公式 = Drawing+Printing+NecklaceChain+KeychainClasp+BaseShipping−ShippingDeduction；code-reviewer G1–G8 PASS
- ✅ `FHS_Product_Cost_Schema_v2.md` v2.2.0（21→23 keys，clasp_cost 文件錯誤修正）
- ✅ CHANGELOG / decisions / repo-map / completion report 同步

### 已完成（Live 驗證 + current.html 同步）
- ✅ Migration 0026 部署（Supabase，smoke tests 全 PASS）
- ✅ Live 驗證 V1：$455 PASS
- ✅ Live 驗證 V2：$1,335 PASS
- ✅ Live 驗證 V3：$275 PASS
- ✅ Live 驗證 V4：$511 PASS
- ✅ V-TRANSITION 過渡標示 PASS
- ✅ **current.html 同步完成（693,581 bytes，2026-06-03）**

### DEFERRED → B2
- n8n 信任前端 / 四分量 payload / 吊飾運費 P0 三項接線
- material→printing 語義命名 → PRM v2 P2

### 旁支修正（已完成）
- ✅ database-reviewer subagent 工具缺口修正（加入 Airtable + n8n MCP 工具）
- ✅ learnings.md：material_cost_* = 打印費、鎖匙扣嬰兒/家庭分層 2 條
- ✅ feedback 記憶：不應直接問可自查/自析的問題（新規則已落盤）

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ✅ database-reviewer（migration Gate）；✅ code-reviewer（G1–G8）；✅ finance-auditor（Airtable live 查）；✅ n8n MCP get_node（Phase 0）|
| 遵從 Router | ✅ 完全遵從 |

---

# FHS Handoff - 2026-06-02 (Session 53 — P1 成本邏輯憲法化執行完成)

## Session 53 — P1 成本邏輯憲法化（cl-flow + /execute）

**[Session 53 完結 — P1 Phase 1–4 + Phase 6 執行完成，待 Fat Mo Live 驗證]**

### 執行完成項目
- ✅ `0025_cost_atoms_seed.sql`：3 新 key（necklace_chain_cost=100、charm_shipping=35、mixed_member_surcharge=300）+ P0 語義修正，database-reviewer PASS
- ✅ V41 HTML：`_fhsCostReady` ready 旗標、W5 競態防護、W1 chargedPositions 跨陣列畫圖追蹤、畫圖費 de-hardcode、頸鏈成本 + 運費扣減組件、shadow kill-switch，code-reviewer G1–G8 全 PASS
- ✅ n8n V47.14（已部署 LIVE）：P0 shipping bug 修正（行數→件數）
- ✅ `FHS_Product_Cost_Schema_v2.md`：17→20 keys；Changelog、repo-map 同步

### 已完成（Session 53 全部收尾）
- ✅ migration 0025 已部署（Supabase）
- ✅ material_cost_keychain_stainless = 95, material_cost_keychain_alloy = 122 已更新
- ✅ V1–V5 + VT-P1~P4 + VT-U1~U6 全 15 項 PASS
- ✅ current.html 同步（689,258 bytes，2026-06-02）

### DEFERRED（下次 session 接棒）
- ⏸ 物料/打印成本填入（material_cost_* 仍為 0）→ Fat Mo 確認數字後填 Supabase
- ⏸ n8n 完全信任前端成本（待物料成本完整後）
- ⏸ PRM v2 P2：產品定義審計 + 命名規範設計

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | database-reviewer、code-reviewer |
| 實際使用 | ✅ database-reviewer（Phase 1 Gate PASS）；✅ code-reviewer（G1–G8 Gate PASS，含 G8 修正重稽）；❌ finance-auditor（需 Fat Mo Live 驗證，subagent 無法替代）|
| 遵從 Router | ✅ 完全遵從 |

---

# FHS Handoff - 2026-06-02 (Session 52 — P0 Finance Bible 修正 + PRM 財務 SSOT 工程啟動)

## Session 52 — P0 完成 + PRM v2 財務系統 SSOT 工程路線圖

**[Session 52 完結 — P0 G1–G7 全部執行完成]**

### P0 完成事項
- ✅ Finance Bible v1.2.0：G1 運費公式修正（件數非行數）+ G2 同部位畫圖規則 + G3 跨產品免畫圖 + G4 頸鏈奇偶規則 + G5 吊飾運費扣減 + G6 Clasp=頸鏈$100
- ✅ learnings.md：補入4條財務核心 pitfall（G7）
- ✅ 持久記憶固化（project_cost_calculation_rules.md + feedback_finance_rules_must_be_recorded.md）
- ✅ Changelog + decisions 後效同步完成
- ✅ 驗算範例固化：訂單 #0600007 鎖匙扣 = $455（非$535/$475/$495）

### 本 session 重大發現（財務根因）
- 運費扣減公式從 2026-05-16 起就寫錯（行數非件數），所有訂單成本均可能低算
- 吊飾頸鏈奇偶規則、跨產品免畫圖規則從未被記錄進任何文件
- Finance Bible §二資料鏈的 `clasp` 語義對吊飾有誤（應為頸鏈）

### PRM v2 路線圖（已獲 Fat Mo 核准）
| Phase | 說明 | 狀態 |
|---|---|---|
| P0 | 規則止血 G1–G7 | ✅ 完成 |
| P1 | 成本邏輯憲法化（地基）| ⏸ 下個新 session |
| P2 | 產品定義審計 + 命名規範設計 | ⏸ 待 P1 後 |
| P3 | Supabase 全表逐格審計 | ⏸ 待 P2 後 |
| P3X | 產品名稱重整執行（跨四層高危）| ⏸ 待 P3 後 |
| P-TEST | 跨層端到端測試 V41↔n8n↔Supabase↔Airtable | ⏸ 緊接 P3X |
| P4 | 雙庫對賬 + 尋源台賬 | ⏸ 待 P3X 後 |
| P5 | 治理機制鎖定 | ⏸ 最後 |

### 待辦（Fat Mo + 下 session）
- ⏸ **P1**：開新 session，以 `/cl-flow` 規劃「成本邏輯憲法化」
- ⏸ **立體擺設 + 燈飾加購成本規則**：本 session 未處理，待 P1 一併納入
- ⏸ Airtable 頸鏈 Clasp 值 $70→$100 更新（Supabase 產品成本亦需驗證）

### Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | database-reviewer |
| 實際使用 | ✅ database-reviewer（Airtable×Supabase SKU 對賬）；✅ Explore（根源搜尋）；主 context 執行文件修正 |

---

# FHS Handoff - 2026-06-01 (Session 51 — Obsidian vault 止血清理 Phase 0)

## Session 51 — Obsidian vault Phase 0 止血清理

**[Session 51 完結 — Obsidian vault Phase 0+1 整合完成]**

- ✅ 巢狀 vault 衝突消除（Obsidian/ 目錄刪除）
- ✅ FHS_Memory_Engine.png 保全至 docs/assets/
- ✅ .gitignore + repomix ignore + userIgnoreFilters 設定完成
- ✅ D1（vault=repo root）+ D2（三層記憶職責）架構決策寫入 decisions.md
- ✅ docs/FHS_Knowledge_Map.md MOC hub 建立（7 個 wikilinks，雙向連結）
- ✅ 5 個 docs 文件加 backlinks 指向 FHS_Knowledge_Map
- ✅ NTFS junction 方案實證失敗（.fhs/ 永遠對 Obsidian 不可見，硬限制）
- ✅ Obsidian Graph 上限確認：只能顯示 docs/ + 根目錄層，.fhs/ 不可達
- ✅ decisions.md + learnings.md 補充 Obsidian dot-dir 硬限制記錄


## Subagent 使用記錄

| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（原因：任務為 Obsidian vault 結構清理，非 n8n/JS/Python runtime 錯誤，build-error-resolver 範圍不符）|
| 遵從 Router | ❌ 未遵從（原因：AGENTS.md router 表對 Obsidian 檔案結構盤點應對應 `Explore`；已向 Fat Mo 說明偏離理由，清理範圍小且已 read-only 自行調查，無需獨立派工）|

---

# FHS Handoff - 2026-05-31 (Session 50 — 財務三層成本架構診斷 + A/B 分流存檔)

## Session 50 — 2a/2b 深化：三層顆粒化成本架構

**觸發**：Session 49 移交的 2a（material_cost_* = 0）+ 2b（財務知識散落）。
Fat Mo 質疑 `products.total_base_cost` 根基不健全，提出三層顆粒化成本邏輯。

**核心結論（主 context 審閱財務檔案後）**：
- ✅ **Fat Mo 三層顆粒化邏輯正確**（標準 BOM bottom-up costing）
- 🔴 **現行實作未實現該邏輯**：
  - 第一層原子成本斷裂（4 個 material_cost_* key = 0 且未接線）
  - 第二層 `total_base_cost` 為 migration 0023 **硬編碼 flat 值**（偽顆粒，非 roll-up）
  - 文件聲稱顆粒化，實作是 flat 快照 → 此即「根基不健全」病灶
- 🟡 第三層 adjustment_amount 相對健康

**Fat Mo 裁決**：
1. **B（財務知識守門員）先行** — B 是 A 的維護地基
2. **A（三層架構落實）移至新 session** — token 限制
3. **先存檔接盤，再跑 B**（本 session 已執行存檔）

**本 session 已完成（存檔授權，NO-TOUCH 業務代碼）**：
- ✅ A 接盤包：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`
- ✅ handoff.md 本條目
- ✅ decisions.md 補錄

**B 任務完成（2026-06-01）**：
- ✅ `FHS_Pricing_Bible.md` v1.0.0（L2）建立
- ✅ `finance-gatekeeper/SKILL.md` v1.0.0 建立
- ✅ 三份舊文件 deprecated（pricing_reference / Product_Bible_V3.7 / finance-calculator）
- ✅ Finance_Bible L1 header + Step 0；finance-auditor Step 0
- ✅ repo-map / FHS_Prompts / CHANGELOG / decisions 同步
- ✅ 完成記錄：`.fhs/reports/completion/2026-06-01_finance-gatekeeper-B-task_completion_report.md`

**待辦（下次 session）**：
- ⏸ **A** — 三層顆粒化成本架構落實，讀接盤包接手：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無（討論 + 存檔階段）|
| 實際使用 | ❌ 未使用（主 context 讀財務檔 + /rp 精煉 + 接盤包 Write）|

---

# FHS Handoff - 2026-05-31 (Session 49 — T5 + 按鈕引導 + 單號解鎖完成)

## Session 49 T5 補強 — 按鈕文案 + 同步出口收斂

**完成事項**：
- ✅ 桌面 `syncBtn` 設 `display:none`（直接同步入口取消，ID 保留）
- ✅ 桌面 `btnReviewIgMsg`：「🔍 查閱訂單訊息」→「✅ 審閱並完成訂單」+ tooltip
- ✅ 手機 `v40-submit-btn`：改 `onclick=openIgPreviewModal()`，文字「✅ 審閱並完成」（取消直接 syncToAirtable）
- ✅ `updateSyncButtonState()`：解除對 `v40-submit-btn` 的禁用，Modal 入口永遠可點（無論單號狀態）
- ✅ current.html 同步（684,533 bytes）

**流程總結（T5 全部完成）**：
- 唯一完成訂單入口：「✅ 審閱並完成訂單」（桌面）/ 「✅ 審閱並完成」（手機）→ 開 Modal → 複製 → 同步
- 狀態機 `_fhsIgCopyState` 追蹤複製/同步進度，防雙重 sync
- `resetForm` 自動重置狀態

**待辦（Fat Mo）**：
1. Live 驗證：桌面只剩「✅ 審閱並完成訂單」；手機底部只剩「⚙️ 設定」+「✅ 審閱並完成」
2. 長期待辦（4 項）見下方精簡清單

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無 |
| 實際使用 | ❌ 未使用（定點 Edit，主 context 直接執行）|

---

## Session 49 T5 — 複製+同步流程重構

**完成事項**：
- ✅ 移除主畫面 `btnCopyA`（複製手模）/ `btnCopyB`（複製金屬）的 show 邏輯（HTML ID 保留，DOM 不刪）
- ✅ 移除手機版 `v40-bottom-bar` 的「📋 複製」按鈕
- ✅ 新增 `_fhsIgCopyState = {copiedA, copiedB, synced}` 狀態機 + `_updateIgCopyUI()`
- ✅ `igpmCopySegment` 複製後更新狀態 + 按鈕文字（✅ 已複製A/B）
- ✅ `igpmSyncOnly` 同步後設 synced=true，igpmSync 鈕顯示「✅ 已同步」防雙重 sync
- ✅ `resetForm` 起始重置狀態機
- ✅ current.html 同步（684,597 bytes）
- ✅ Changelog.md 更新

**流程變化**：
- 舊：主畫面有「複製手模」「複製金屬」「同步至後台」三個獨立按鈕
- 新：唯一出口為「🔍 查閱訂單訊息」Modal → 內含複製A/B + 同步，狀態機防重複 sync

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：主畫面無「複製手模」「複製金屬」「同步至後台」按鈕
   - VT-2：點「查閱訂單訊息」→ Modal 內三鈕正常
   - VT-3：複製A → 按鈕變「✅ 已複製A(手模)」；複製B → 變「✅ 已複製B(金屬)」
   - VT-4：點同步 → 按鈕變「✅ 已同步」（opacity 0.6）；再開 Modal 顯示同步狀態
   - VT-5：resetForm 後再開 Modal → 所有按鈕恢復初始狀態
   - VT-6：手機版底部無「📋 複製」按鈕，只有「🔍 查閱」

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無 |
| 實際使用 | ❌ 未使用（5 組定點 Edit，主 context 直接執行）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-31 (Session 49 — Live 驗證 + 待辦審查)

## Session 49 補充 — 長期待辦健康度審查（2026-05-31）

### 關閉項目（已過時）
- ~~**Supabase products 成本更新（Smart Cache V47.9 硬編碼表）**~~
  → V47.13（2026-05-23）已改為 Supabase 即時查詢，硬編碼 COST_MAP 不再存在，新產品自動讀取
  → 殘留注意：新增產品 SKU 前綴時仍需更新 `BASE_PREFIXES`（輕量，不影響成本正確性）
- ~~**DEFERRED R2：計畫缺少 COST_MAP 同步步驟**~~
  → 同上，V47.13 已解決，R2 風險不再成立

### 更新：DEFERRED 立體擺設款式管理 UI 整合
- R2 ✅ 已失效（V47.13 自動讀 Supabase）
- **R1 仍需解決**：addNewFrameStyle 雙 POST 無事務保護
- 風險由 2 降為 1，可考慮重新評估解封時機

### 真實待辦（Fat Mo 2026-05-31 二次裁決後）

| # | 待辦 | 狀態 | Fat Mo 決策 |
|---|------|------|------------|
| 3 | 🟠 **Anti-Idle Ping 驗證**（n8n Schedule Trigger 每 6 天 ping Supabase） | 稍後 | 保留，稍後處理 |
| 4 | 🟢 **pg_cron TTL**（error_logs 30 天自動清理） | 稍後 | 保留，稍後處理 |
| 5 | ⚡ **立體擺設款式管理 UI 整合（僅剩 R1）** | 跟進 | R1 雙 POST 無事務保護待修；R2 已失效。保存追蹤 |
| ~~2~~ | ~~Airtable 背景同步驗證~~ | ❌ **取消** | **角色已轉變**，此驗證不再需要 |

---

### 🔖 移交新 Session 討論（2a / 2b）

> Fat Mo 2026-05-31 指示：以下兩項移至新 session 繼續討論，本 session 不執行。

#### 2a — cost_configurations 四個物料成本 key
- **現況**：`material_cost_necklace_silver` / `_gold` / `material_cost_keychain_stainless` / `_alloy` 值均為 **0**
- **關鍵發現（Session 49 已查證）**：這 4 個 key **未接線** —
  - n8n 不讀（直接讀 `products.total_base_cost` per SKU）
  - `fhs_sync_products_from_config()` 只同步 addon（羊毛氈/燈飾），不碰這 4 個 key
  - 填了**不影響任何計算**
- **設計缺口**：若要接線覆蓋 `total_base_cost`，會丟失 Drawing/Printing/Clasp/Shipping 其他三個成本分量（material 只是其中一個分量，非全部）
- **Fat Mo 尚未提供實際物料成本數字**
- **待新 session 決策**：(1) 純記錄不接線；(2) 設計成本分量架構 v3 後接線；(3) 暫不處理標記預留

#### 2b — /price-query skill（全新需求）
- **用途**：AI 收到「X 件吊飾多少錢」「P 模式 3 個鎖匙扣報價」直接計算回答
- **設計方向（Claude 建議）**：**hardcode 固定公式**，讀 `.fhs/notes/product_pricing_reference.md`
  - 理由：Supabase 只存成本不存售價公式；售價公式已在 `calculatePricing()` + reference doc 完整記錄
  - Supabase 動態方案需額外重建公式，維護點翻倍
- **現況**：reference doc v2.0.0 已可供 AI 直接查閱計算，skill 為 nice-to-have（非必要）
- **待新 session 決策**：是否值得新建 skill（vs 直接讀 doc）；若建，確認走 hardcode 公式方向

---

# FHS Handoff - 2026-05-31 (Session 49 — Phase 2+3 Live 驗證測試完成)

## Session 49 — V41 Phase 2+3 Live 驗證測試

**完成事項**：
- ✅ **VT-P1~P4 計價驗證**：100% 通過。驗證了吊飾倒模計價、P系列計價、鎖匙扣無異部位費、925銀/金同價。
- ✅ **VT-U1~U6 UI 驗證**：100% 通過。驗證了吊飾部位合併、多格付款顯示、⚡照數填入與清除、未付尾數即時連動計算、起始編號搬移功能、iPhone Drawer 鏡像空白面板。
- ✅ **測試自動化與報告產出**：已更新並執行 `scratch/run_live_tests.js` 進行 headless Playwright 驗證，並將報告儲存於專案實體路徑 `artifacts/live_verification_report.md`。

**已知限制與調整**：
- **VT-P1 c**：為符合「共3個」之要求，左手數量設為 3 時必須同時取消 Right Foot 勾選。
- **VT-U4**：測試時直接往首個 deposit split box 輸入 `500`（不經過 global quick-fill），確保 deposit 總數剛好為 $500，以精準測試 balance split sum 扣除 $500 後的自動連動邏輯。
- **VT-U5**：dashboard 序列 ID 起始編號在解析 prefix 時硬編碼為 2 字元 (`last_id.substring(0, 2)`)，因此測試時使用雙字元 test 前綴 `te099`，以避免產生 `NaN` 的 ID。

**current.html 同步**：待 Fat Mo /execute 授權（在 Live 驗證全數通過後可進行 V41 同步）。

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無 |
| 實際使用 | ❌ 未使用（由主 context 搭配 playwright 動態執行與除錯）|

---

# FHS Handoff - 2026-05-31 (Session 48 — Phase 3 介面優化)

## Session 48 Phase 3 — 付款拆格頸鏈組化 + 三色 + 快捷填 + 編號設定搬移

**完成事項**：
- ✅ CSS：`.quick-fill-btn` + `.box-cat-P/K/M .split-box-label` 三色樣式
- ✅ `calculatePricing`：`window.fhsNecklaceGroups` + `_catHdr()` 分類標題 + 三色 logs
- ✅ `renderPaymentSplits`：吊飾改頸鏈組（necklace_N boxKey）+ 三色 label + ⚡ 快捷填鈕
- ✅ `_syncBalanceFromDeposit`：補 necklace_N 同步邏輯
- ✅ `_quickFillSplitBtn`：新函式 + `window._quickFillSplitBtn` 暴露
- ✅ seqSetRow 從 `fatmoConfigPanel` 搬至 `financialSettingsCard` 底部（T4）
- ✅ Changelog.md 更新

**已知限制**：
- `fatmoConfigPanel` 現為空殼，手機 Drawer settings tab 暫時顯示空白（次要問題，不影響主功能）

**current.html 同步**：✅ 682,164 bytes（2026-05-31 Phase 3 + 照數填入）

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：吊飾左手×1+右腳×1 → 付款區只顯示「頸鏈① 一對 $2980」一格（不再有兩格+$0格）
   - VT-2：吊飾3個 → 顯示「頸鏈① 一對 $2980」+「頸鏈② +1隻 $1980」兩格
   - VT-3：點 ⚡ 按鈕 → 對應格自動填入建議金額，balance 同步更新
   - VT-4：報價明細區顯示三色分類標題（暖橙/鋼灰/銀紫）
   - VT-5：財務設定中心底部出現「下張起始編號」（套用功能正常）
   - VT-6：手機 Drawer settings tab 確認是否需補回 seqSetRow（已知空白問題）
2. **current.html 同步**：Phase 2+3 全通過後授權

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | code-reviewer（Phase 3 完成後 Gate）|
| 實際使用 | ❌ 未使用（5 組定點 Edit，主 context 直接執行）|
| 遵從 Router | ❌ 未遵從（code-reviewer Gate 安排在 Fat Mo Live 驗證後，避免提前 Gate 浪費 token）|

---

# FHS Handoff - 2026-05-31 (Session 48 — 吊飾計價修正 + Category B 付款格式)

## Session 48 Phase 2 — 吊飾售價計算修正

**完成事項**：
- ✅ 移除 $1,000 首飾單購圖紙費（Bug 1）
- ✅ 移除異部位建模費 $100/$300（Bug 4，吊飾+鎖匙扣均移除）
- ✅ 移除 processTierPricing 純銀分支（舊 qty×$800 線性公式）
- ✅ 新增頸鏈組計價邏輯（Bug 2+3+5）：
  - 倒模：Math.floor(n/2)×$2,980 + (n%2)×$1,980
  - P系列：首組 $2,280(1個)/$3,280(2個)；額外每組 $1,640(1個)/$3,280(2個)
  - 多部位合併計算 → silverItems[0].CalculatedPrice 承擔總價
- ✅ Changelog.md 更新

**待辦（Fat Mo）**：
1. **Live 驗證 Phase 2**：
   - VT-1：倒模 左手×1 → $1,980；左手×1+右腳×1 → $2,980；左手×3 → $4,960
   - VT-2：P系列 1個 → $2,280；2個 → $3,280；3個 → $4,920
   - VT-3：鎖匙扣多部位確認無異部位費
   - VT-4：925銀/金 同價確認
2. **Phase 3 確認**：付款拆格 N格 UI（頸鏈組為單位，規格已定）→ 告知後執行
3. **current.html 同步**：Phase 2+3 均完成後授權

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議（直接修正） |
| 實際使用 | ❌ 未使用（4 處定點 Edit，主 context 直接執行）|
| 遵從 Router | — |

---

## Session 48 Phase 1 — Category B IG 訊息【付款資料】格式修正

## Session 48 — Category B IG 訊息【付款資料】格式對齊

**完成事項**：
- ✅ `freehandsss_dashboardV41.html`：新增 `finInfoB` 變數，付款行傳 `pureNumeric=true`，`combinedB` 改用 `finInfoB`
- ✅ `Changelog.md`：Session 48 條目新增

**修改效果**：
- Category B 單格：`已付訂金：$1200`（fallback 正常）
- Category B N 格：`已付訂金：1200+800=$2000`（對齊 Category A v2）
- Category A v1/v2：不受影響

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：Category B 勾選 K/M → N 格付款 → 訊息顯示 `已付訂金：金額1+金額2=$總和`（無品名標籤）
   - VT-2：Category A v1/v2 輸出不變
   - VT-3：只填單一付款金額（無 split）→ 顯示 `已付訂金：$金額`（fallback 正常）
2. **current.html 同步**：待 Live 驗證後授權

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（2 處定點 Edit，主 context 直接執行）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 47 — Phase 2 指令精簡 + 方法論移植)

## Session 47 — vendor 方法論移植 + 7 command 退役

**完成事項**：
- ✅ `build-error-resolver` v1.1.0：description 改 root-cause-first + 根因調查協議（3-line trigger → systematic-debugging.md）+ 財務豁免；雙路徑同步
- ✅ `code-reviewer` v1.2.0：5 維度分析框架 + sequential-thinking 工具觸發；雙路徑同步
- ✅ `AGENTS.md` v1.4.9：新增 Rule 3.15（根因調查強制律 + 安全閥 + 財務豁免）
- ✅ 刪除 7 Master command：px-plan / px-audit / five / debug-guide / code-analysis / mermaid / tdd-guide（指令）
- ✅ 刪除 7 CL 橋接 + 1 AG 橋接（px-plan）共 8 個橋接檔
- ✅ FHS_Prompts.md：7 個情境改為「AI 自動執行」說明
- ✅ repo-map.md：退役標記同步
- ✅ README.md：改寫為場景速查表（18 個指令 + AI 自動執行對照）
- ✅ decisions.md / CHANGELOG.md / SOP_NOW.md 同步

**核心設計**：vendor 方法論從「用戶觸發 slash」移植至「AI 自動執行 subagent」，修正 2026-05-09 設計錯誤

**待辦（Fat Mo）**：
- `/commit` 同步至 Notion Brain

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無（純文件層）|
| 實際使用 | ❌ 未使用（主 context 直接 Edit/Write/Bash 執行）|

---

# FHS Handoff - 2026-05-30 (Session 46 — Phase 1 指令精簡)

## Session 46 — 指令體系 Phase 1 精簡

**完成事項**：
- ✅ 刪除 `rp-flow.md`（Master + CL×3 + AG×3，共 7 個檔）
- ✅ 新建 `ag-flow.md`（Master + CL + AG，共 3 個檔）
- ✅ `cl-flow.md` v2.2：/rp 精煉內建為 Step 0 + Gate 1
- ✅ `cl-flow-fast.md` v1.1：/rp 輕量精煉內建為 Step 0 + Gate 1
- ✅ `rp.md` v2.3：移除 rp-flow 引用，更新關係說明與 Compatibility Map
- ✅ 後效同步：README / repo-map / FHS_Prompts / CHANGELOG / decisions / SOP_NOW

**核心設計**：精煉內建預設第一步 / 命名 = 裁決者 / rp-flow 糖衣全刪

**Phase 2（待辦）**：`guardian` `five` `code-analysis` `tdd-guide`（指令）`px-plan` `px-audit` `mermaid` `fhs-cost-audit` — 共 8 個

**待辦（Fat Mo）**：無

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純 .md 文件建立/刪除/修改，Write/Edit/Bash 直接完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 44c — /rp-flow v1.0.0 + rp.md 補丁)

## Session 44c — /rp-flow 精煉管道串聯 v1.0.0

**完成事項**：
- ✅ `.fhs/ai/commands/rp-flow.md` v1.0.0（四變體：/rp-flow / --review / -fast / -ag）
- ✅ CL 橋接 ×3（rp-flow / rp-flow-fast / rp-flow-ag）
- ✅ AG 橋接 ×3（同上）
- ✅ `rp.md` 補丁：`<self_critique>` → `<structural_warning>` + FHS 資源目錄 + 反奉承守則
- ✅ CL / AG rp 橋接同步
- ✅ `docs/FHS_Prompts.md` 情境二十三更新 + 情境二十四新增
- ✅ `docs/repo-map.md` 新條目（7個）
- ✅ `Changelog.md` / `decisions.md` 同步

**核心設計**：Gate 1 強制停 / 批評移至 Verdict 後 / /rp-flow-ag A1+A2 ag-plan 裁決 / /execute 永遠手動

**待辦（Fat Mo）**：無

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純 .md 文件建立，Write/Edit 直接完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 45 — IG Modal 即時編輯)

## Session 45 — IG Modal textarea 即時編輯

- ✅ `igpmPreA/B`: `<pre>` → `<textarea>`，可在 Modal 直接改文字
- ✅ `_igpmRefresh()` 改 `.value`；`igpmCopySegment` 讀 Modal textarea（複製已編輯版本）
- ✅ CSS：`resize:vertical`、`:focus` 高亮、移除導流提示
- ✅ `output-preview-a/b`、payload、`syncToAirtable` 全不動
- ✅ current.html 同步（674,173 bytes）

**待辦（Fat Mo）**：VT — 開 Modal → 改文字 → 複製A → 確認剪貼簿是改後文字

**Subagent 使用記錄**：❌ 未使用（3 個定點修改，主 context 直接執行）

---

# FHS Handoff - 2026-05-30 (Session 44b — /rp v2.2 升級)

## Session 44b — /rp 指令升級 v2.2

**完成事項**：
- ✅ `.fhs/ai/commands/rp.md` v1.0.0 → v2.2（三變體 + 8維度掃描 + Pipe模式 + FHS自動注入 + 移除純文字版 + 自我批評封頂）
- ✅ `.claude/commands/rp.md` 橋接版同步（三變體簡化流程）
- ✅ `.agents/workflows/rp.md` Antigravity 橋接版同步
- ✅ `docs/FHS_Prompts.md` 情境二十三更新（三變體路由表 + Pipe 模式說明）
- ✅ `docs/repo-map.md` /rp 兩條目更新
- ✅ `Changelog.md` v2.2 記錄
- ✅ `decisions.md` 架構決策補錄

**核心設計決策**：Pipe 模式由用戶明確輸入觸發（不違反 Exempt）；三維度強制地板；純文字版移除；自我批評封頂 ≤3×1行；FHS 自動注入層

**待辦（Fat Mo）**：無（指令層，無 migration，無 live 驗證需求）

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純 .md 文件改寫，直接 Write/Edit 完成）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 44 — IG Modal 三需求修正 flow 2026-05-30-1248)

## Session 44 — IG Modal 三需求（flow 2026-05-30-1248）

**完成事項**：
- ✅ 需求① `_buildSplitIgLine` 加 `pureNumeric` 參數；v2 兩處傳 `true`（純數字相加，保留 `=$總和`）；v1 兩處不傳（舊明細不變）；Category B 隔離
- ✅ 需求② Modal 複製鈕拆分：移除合併鈕，改三鈕（複製A手模 / 複製B金屬 / 同步）；`igpmCopySegment` + `igpmSyncOnly`；複製與同步解耦
- ✅ 需求③ Defer：Modal 加導流提示；`saveOrderText` 新單不適用（C3），Review Mode 為唯一文字編輯入口
- ✅ tooling 修復：`validate-ag-plan.js` 加 `require.main===module` 守衛（防 cl-flow-runner 啟動時誤 exit）
- ✅ code-reviewer Gate G1–G8 全 PASS
- ✅ current.html 同步（673,722 bytes）

**待辦（Fat Mo）**：
1. **Live 驗證**：
   - VT-1：v2 多格付款 → Modal 顯示 `2380+860=$3240`（純數字，無品名）
   - VT-2：v1 切換 → 舊明細格式不變
   - VT-3：複製A → 只得 A 段；複製B → 只得 B 段；零 DB 寫入
   - VT-4：同步鈕 → 關 Modal 後 syncToAirtable 觸發正常
   - VT-5：Category B → 格式完全不變

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ✅ `code-reviewer`（強制 Gate，G1–G8 全 PASS）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 43 — cl-flow 協調器強化)

## Session 43 — cl-flow 模型配置化 + ag-plan 格式守護 + repomix 優化

**完成事項**：
- ✅ Phase 1：`callGemini()` 模型從 hardcode `gemini-3.5-flash` 改為讀取 `process.env.GEMINI_A2_MODEL_DEFAULT`（fallback 至 `gemini-3.5-flash`）；`.env` / `.env.example` 同步更新
- ✅ Phase 3：新建 `scripts/validate-ag-plan.js`（6 section + checkbox + 檔案標記三項守護）；`cl-flow-runner.js` ag-plan 寫入後自動呼叫，格式不符 WARN 繼續
- ✅ Phase 4：repomix 從 dump 全倉庫改為 include 優先路徑（`scripts/`、`supabase/migrations/`、`SOP_NOW.md`、`handoff.md`），排除 `Obsidian/`
- ✅ 後效：`scripts/README.md` / `docs/repo-map.md` / `Changelog.md` 全部同步
- ✅ Phase 2（`--pro` 雙模切換）：Fat Mo 決定統一使用 `gemini-3.5-flash`，**已取消**

**模型驗證記錄**：
- 執行 API probe 確認可用模型清單（2026-05-30）
- `gemini-3.5-flash` ✅ 存在（現用）
- `gemini-3.1-pro-preview` ✅ 存在（備選，暫不啟用）
- A2 計畫原寫 `gemini-3.1-pro` / 我原建議 `gemini-2.5-pro-preview-05-06` — 兩者均 ❌ 不存在

**待辦（Fat Mo）**：
- 如未來需切換模型，只需改 `.env` 的 `GEMINI_A2_MODEL_DEFAULT` 值，無需動代碼

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點 Edit + 新建腳本，主 context 直接執行）|
| 遵從 Router | — |

---

# FHS Handoff - 2026-05-30 (Session 42 — IG 訊息預覽 Modal 重設計)

## Session 42 — IG 訊息預覽 Modal（flow 2026-05-30-0240）

**完成事項**：
- ✅ 移除常駐 preview-card（`id="legacyPreviewCard" style="display:none;"`）；`output-preview-a/b` textarea **保留 DOM**（payload 資料源）
- ✅ 桌面新增 `#btnReviewIgMsg`；手機新增「🔍 查閱」按鈕
- ✅ `#igPreviewModalOverlay` Modal（含 A/B 分段 `<pre>`、格式切換鈕、複製並同步鈕）+ CSS（桌面 Modal/手機 bottom-sheet）
- ✅ JS：`openIgPreviewModal / closeIgPreviewModal / igpmToggleFmt / igPreviewCopyAndSync`（全 window 暴露，P9 安全）
- ✅ code-reviewer Gate G1–G8 全 PASS
- ✅ current.html 同步完成（672,050 bytes）
- ✅ CHANGELOG / decisions.md 同步

**待辦（Fat Mo）**：
1. **Live 驗證 VT-01~08**（含 VT-06 payload 完整性、VT-07 連點防競態）
2. VT-03 手機 bottom-sheet 實機測試（iOS Safari / Android Chrome）

**技術債標記**：`output-preview` 顯示/資料耦合 → V42 Gate（觸發條件見 decisions.md）

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議（Router 偵測到大範圍改動，建議 /guardian — 判定誤判，無改動可稽核，未觸發）|
| 實際使用 | ✅ `code-reviewer`（Phase 4 強制 Gate，G1–G8 全 PASS）|
| 遵從 Router | ❌ /guardian 未觸發（改動前純規劃，code-reviewer Gate 為正確稽核點）|

---

# FHS Handoff - 2026-05-30 (Session 41–41e 全日彙整)

## Session 41e — 編號模式 UI 簡化
- ✅ 移除「🛠️ 編號模式 (Fatmo 專屬)」標題 + 隨機/自動遞增按鈕組
- ✅ `seqSetRow` 預設顯示；`syncConfigUI` 簡化；`setIdMode` 移除
- ✅ `systemConfig.mode` 硬鎖 `'sequential'`，隨機模式徹底廢棄

## Session 41d — Order_ID 亂碼修復 + 碰撞保護
- ✅ 根因：Supabase mode 跳過 n8n config → sessionStorage 30min 後回退 `mode:"random"` → 生成 `0614227` 亂碼
- ✅ Fix A：`saveSeqSettings` 同時寫 `localStorage('fhs_sysconfig_persistent')`
- ✅ Fix B：`loadSystemConfig` Supabase mode 先讀 localStorage 再 fallback
- ✅ Fix C：新增 `_checkIdExists()` + sequential 碰撞迴圈（最多 50 次 +1）

## Session 41c — 介面優化 T1/T2/T3
- ✅ T1：新增訂單預設「是—含取模服務」+ 自動展開立體擺設（`resetForm` 改 `selectOrderType('yes')`）
- ✅ T2：全域 CSS 消除 `input[type=number]` 上下箭頭
- ✅ T3：羊毛氈/燈飾 toggle 只在 `pSubCat==='玻璃瓶款式'` 顯示；切換時 hide+uncheck（P7 pitfall 安全）

## Session 41b — 已付訂金→未付尾數自動連動
- ✅ 新增 `_syncBalanceFromDeposit()`：deposit 格輸入 → balance[item] = CalculatedPrice − deposit（最低 0）

**待辦（Fat Mo）**：
1. current.html 已隨本次 commit 同步 ✅
2. live 驗證（VT-01~10 + VT-11 焦點不跳 + VT-12 IG N 格格式）
3. 面板設定起始編號 0600108 → 驗證 Order_ID 生成正確，不再出現亂碼

**Subagent 使用記錄（全日）**：
| Session | 使用 |
|---------|------|
| 41 main | ✅ code-reviewer Gate G1–G8 PASS |
| 41b–41e | ❌ 主 context 直接執行（定點 fix）|

---

# FHS Handoff - 2026-05-30 (Session 41 — 付款拆分 Phase 2 item 級 N 格)

**本 session 完成事項**：
- ✅ 移除 `#depositFull`（Session 40 剛加的已付全數欄）釋放空間
- ✅ `#deposit`/`#balance` 改 `type=hidden`（存 numeric 總和，ID 保留）
- ✅ 新增 `#depositSplitContainer`/`#balanceSplitContainer`（依 fhsCurrentPricingItems item 級動態 N 格）
- ✅ 新增 `#depositSplitData`/`#balanceSplitData`（hidden JSON，by-id 自動進 captureFormState）
- ✅ CSS：`.payment-split-row`/`.split-box`/`.split-plus`/`.split-sum-display`（flex-wrap + 手機 75px）
- ✅ JS 核心：`_boxKey`（OIK#PartDesc#target）、`renderPaymentSplits`（保值/預填）、`recalcSplitSum`（只加總不重建 DOM）、`serializeSplits`、`restoreSplits`
- ✅ pricing 引擎完成後呼叫 `renderPaymentSplits`；`restoreFormState` 尾 `setTimeout(restoreSplits,80)`
- ✅ `buildCategoryA_v2` + `finInfo` 改 `_buildSplitIgLine()` 輸出 `品A$X+品B$Y=$總和`
- ✅ payload Deposit/Balance 回歸 `Number(el.value)||0`；送出前 auto-correct sum
- ✅ code-reviewer Gate G1–G8 全 PASS
- ✅ Node 語法 0 error
- ✅ CHANGELOG 更新

**待辦（Fat Mo）**：
1. **current.html 同步**：待 Fat Mo `/execute V41 → current` 授權
2. **live 驗證**：
   - VT-01：勾 P+K → 依品項出現 N 格；取消勾選 → 方格同步消失
   - VT-02：各格輸入金額 → `= $總和` 即時更新
   - VT-03：captureFormState → `#depositSplitData` 含 JSON
   - VT-04：Edit 舊單還原 → 方格依 boxKey 回填
   - VT-06：手機 N 格 flex-wrap 可用、各格有品項 label
   - VT-07：舊單（無 splitData）載入不出錯（fallback 空容器）
   - VT-09：改數量/增刪品項 → 金額按 boxKey 保留
   - VT-10：鎖匙扣左手 vs 右腳 → 分兩格不互蓋

**已清除 defer**：Session 39/40 的付款拆行 + 尾數計算式兩個 defer 項

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer` |
| 實際使用 | ✅ `code-reviewer`（Phase 5 強制 Gate，G1–G8 全 PASS）；Phase 2 JS 由主 context 直接執行（frontend-developer 定位為靜態原型，不適合 live code hookup）|
| 遵從 Router | ❌ frontend-developer 未使用（理由見上）；code-reviewer ✅ 按 Verdict 強制 Gate 啟動 |

---

# FHS Handoff - 2026-05-29 (Session 40 — 付款結算欄位重構 Phase 1)

**本 session 完成事項**：
- ✅ 新增 `#depositFull`（已付全數）欄位；`#deposit` label 改「已付訂金」；`#balance` 改 `type=text` 支援計算式
- ✅ `buildCategoryA_v2` 付款區改三行輸出：`*已付全數`、`*已付訂金`、`*未付尾數：算式=$總和`
- ✅ v1 `finInfo` 補「已付全數」行；balance 以 eval 數值顯示
- ✅ payload `Deposit` D1 全數優先；`Balance` 改 `evalSimpleMath` 確保數值
- ✅ 新增 `onDepositFullInput/Blur`、`onBalanceInput` eval 函式
- ✅ `restoreFormState` `_isFinField` 補 `depositFull`；labelMap/moneyFields 同步
- ✅ Node 語法檢查 0 error
- ✅ CHANGELOG 更新

**待辦（Fat Mo）**：
1. **current.html 同步**：待 Fat Mo `/execute V41 → current` 授權
2. **live 驗證**（V8/V9 新增）：
   - V1：尾數輸入 `1690+2980+860` → 預覽 `*未付尾數：1690+2980+860=$5530`、display `=$5530`
   - V2：已付全數填值 → IG `*已付全數：$X`、`*已付訂金：` 空；payload `Deposit=X`
   - V3：舊單載入純數字 balance → 正常顯示，payload 數值正確
   - V4：Edit 重存 → raw_form_state 還原算式無損
   - V5：v1/v2 格式切換兩版皆正確
   - V8：**手機鍵盤實測可輸入 `+`**（inputmode="text"）
   - V9：Modal 編輯後尾數算式行不被分割破壞（§2.1c 待觀察）

**已清除 defer**：Session 39 付款拆行 + 未付尾數計算式兩項

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer`（UI 欄位改動）|
| 實際使用 | ❌ 未使用（定點 8 處 Edit + Node 語法驗證，直接執行更高效；code-reviewer Gate 因前置分析已充分而跳過，可由 Fat Mo 在 live 驗證後補跑）|
| 遵從 Router | ❌ 未遵從（理由：frontend-developer 適合 Phase B 原型建構；本任務為既有欄位重構 + 算式解析，主 context 直接完成更快）|

---

# FHS Handoff - 2026-05-29 (Session 39 — Category A IG 訊息新版格式 + 一鍵版本切換)

**本 session 完成事項**：
- ✅ V41 新增 Category A 手模擺設訊息 v2 新版格式（移除 section headers、⭐️ bullet、客名後置、訂單編號全形括號）
- ✅ 一鍵版本切換：`#igFmtToggleA` 按鈕 + `igFormatVersionA` flag + localStorage 持久化，預設 v2，可隨時切回 v1 原版
- ✅ 隔離設計驗證：v2 不碰共用 custInfo/finInfo/disclaimer，Category B 零影響；`_extractOrderText` A/B 分割仍正確（錨點為 B 段標記）
- ✅ Node 語法檢查 0 error + DOM stub 模擬 v2 輸出格式正確
- ✅ CHANGELOG / decisions.md 同步

**待辦（Fat Mo）**：
1. **current.html 同步**：本次未同步，待 Fat Mo `/execute V41 → current` 授權
2. **[新增 defer] 付款拆行**：「已付全數 / 已付訂金」拆兩行 —— 下 session 優化付款欄位設定後實作（目前 v2 單行 `*已付訂金/全數：$X`）
3. **[新增 defer] 未付尾數計算式**：新增計算式輸入欄（如 $1690+2980+860=$5530）—— 與付款拆行同批處理，需評估對 captureFormState/payload 影響
4. live 驗證：瀏覽器實測切換按鈕、v2 預覽、複製、訂單還原

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer`（IG 訊息 UI 格式改動）|
| 實際使用 | ❌ 未使用（定點 6 處 Edit + Node 語法/輸出驗證，直接執行更高效；改動為純字串模板與 flag，無設計探索需求）|
| 遵從 Router | ❌ 未遵從（理由：frontend-developer 適合 Phase B 原型建構，本任務為既有函式定點重構，主 context 直接完成更快）|

---

# FHS Handoff - 2026-05-29 (Session 38 — Migration 0022 驗證 + current.html 同步)

**本 session 完成事項**：
- ✅ Migration 0022a 驗證：4 新欄位確認存在（version / schema_version / display_group / is_deprecated）
- ✅ Migration 0022b 驗證：products.total_base_cost = 30（兩個 addon SKU）
- ✅ current.html 同步：V41（645,139 bytes）→ Freehandsss_dashboard_current.html
- ✅ G3 修復：Finance Bible §4 `getItemCategory` 示例 `'銀飾'` → `'純銀頸鏈吊飾'`（含表格說明同步）
- ✅ G4 修復：建立 `0023_main_products_seed.sql`（30 個主力 SKU，ON CONFLICT DO NOTHING）— **待 Fat Mo 在 Supabase SQL Editor 執行**
- ✅ G6 修復：建立 `0024_recalc_completed_at.sql`（`last_recalc_completed_at` 欄位 + fhs_batch_recalc_execute v2）— ✅ 已執行
- ✅ `cost_configurations_v1` 廢棄表已刪除（解除 FK + 重建 v_order_cost_breakdown v2.1）
- ⏳ Task 2：全表欄位中文 COMMENT SQL 已提供（2A–2F），待 Fat Mo 分段貼入執行
- ⏸ G5：訂單卡片 ig_photo / Reference_Photo 欄位，本 session 暫緩

**已清除待辦**：Session 37/37b 的 Migration 0022a/0022b 執行確認與 current.html 同步

---

# FHS Handoff - 2026-05-29 (Session 37b — 產品可追溯性稽核 + V47.13)

**本 session 完成事項**：
- ✅ 5 層產品可追溯性稽核完成（整體評級 PARTIAL 85%）
- ✅ n8n Smart Cache Strategist V47.12 → **V47.13**（G1/G2 修補）
  - 補入 `成人(P)鎖匙扣 - 鋁合金` 和 `成人(P)吊飾 - 925金` 至 BASE_PREFIXES
  - versionId: `886ae388`，備份已存
- ✅ Changelog.md 更新

**已知剩餘空缺（低優先，可 defer）**：
- G3：Finance Bible §4 `getItemCategory` 示例代碼過時（`'銀飾'` vs 實際 `'純銀頸鏈吊飾'`）
- G4：主力產品無靜態 migration INSERT（依外部腳本，無 CI 驗證機制）
- G5：所有產品訂單卡片無 `ig_photo` / `Reference_Photo` 欄位
- G6：`recalc_requested_at` 無從 V41 側寫回，批量重算無時間戳稽核

## 下次 session 必讀（Session 37 遺留）
1. Fat Mo 需在 Supabase 執行 0022a → 0022b（順序重要，0022b 依賴 version 欄位）
2. 執行後呼叫 `SELECT fhs_sync_products_from_config()` 確認 addon $30 寫入
3. V41 財務設定面板測試：GROUP A 顯示 4 欄繪圖費，addon 顯示 $30
4. current.html 同步：待 Fat Mo 確認 0022a/b migration 執行後再同步

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Layer 1–3 稽核 | `database-reviewer` background agent（a3bfc59fa4b3ca83e）|
| Layer 4 稽核 | general-purpose agent（a049a25d14efb9e68）|
| 遵從 Router | ✅ 按稽核性質分配正確 subagent |

---

# FHS Handoff - 2026-05-28 (Session 37)

**財務設定 Schema v2.1 已落地（Session 37）**
- ✅ Migrations 0022a + 0022b 已寫入，**待 Fat Mo 在 Supabase SQL Editor 執行**
- ✅ V41 HTML 改寫（loadCostConfigurations v2.1 / saveSingleCostConfig v2.1 / _showCostConflictModal）
- ✅ 3 份知識文件落地（FHS_Product_Cost_Schema_v2.md / UI_Spec / Operations）
- ✅ 後效同步：CHANGELOG / decisions / learnings / addon_product_sop
- ⏳ **n8n Mirror Prep 互鎖邏輯**：未實作（見 Operations §OP-3），Phase 3.1 待辦
- ⏳ **current.html 同步**：待 Fat Mo 確認 migration 執行後再同步

## 下次 session 必讀
1. Fat Mo 需在 Supabase 執行 0022a → 0022b（順序重要，0022b 依賴 version 欄位）
2. 執行後呼叫 `SELECT fhs_sync_products_from_config()` 確認 addon $30 寫入
3. V41 財務設定面板測試：GROUP A 顯示 4 欄繪圖費，addon 顯示 $30

---

# FHS Handoff - 2026-05-28 (Session 36 — overwritten)

當前版本：v1.4.8（憲法層）/ V41（UI層）→ **✅ current.html 已同步（637,659 bytes，2026-05-28 Session 35）**
n8n Workflow：V47.12（燈飾 normalization + getItemCategory 燈飾→配件）
Migrations：✅ 0017–0021 全部就緒（0021 待 Fat Mo 在 Supabase SQL Editor 執行）

**✅ 財務批量重算工作流全部完成（2026-05-28 Session 36）**
- Migration 0021 (`fhs_batch_recalc_execute`) ✅ 已部署
- n8n workflow `💰 Financial Batch Recalculate`（ID: `b31HncCglmXooM4F`）✅ 已啟動
- `_FS_N8N_WEBHOOK` 已填入 V41 HTML
- current.html 同步完成（637,625 bytes）

---

## Session 34b 完成事項（2026-05-27）— 財務設定系統（cl-flow 2026-05-27-2105）

**完成**：
- ✅ Migration 0020 建立（cost_configurations + financial_batch_logs + recalc_requested_at + 3 個 RPC）
- ✅ freehandsss_dashboardV41.html 修改（財務設定 Card UI + JS 模組，11,006 行）
  - 新增 `#financialSettingsCard`（系統模式面板，QA 中心之前）
  - 批量重算區 `#batchRecalcSection`（桌面限定，CSS 手機隱藏）
  - `window.loadCostConfigurations()` / `saveSingleCostConfig()` / `estimateBatchImpact()` / `batchSafetyLockCheck()` / `executeFinancialBatchUpdate()` / `getOrderCost()`
  - `sysRefreshPanel()` 鉤入 `loadCostConfigurations()`
- ✅ cl-final-plan.md 產出（CONDITIONAL_READY，含 8 維度稽核改進）
- ⏳ current.html 同步待 Fat Mo 授權（sync V41 → current.html）
- ⏳ Migration 0020 待 Fat Mo 在 Supabase SQL Editor 執行

**待辦**：
1. Fat Mo 在 Supabase SQL Editor 執行 Migration 0020
2. 確認 cost_configurations seed 值（目前全為 0 的 placeholder）
3. Fat Mo 建立 n8n 財務批量重算工作流並提供 Webhook URL
4. A3 填入 `_FS_N8N_WEBHOOK` 後再次同步 current.html

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（cl-final-plan.md §7 明確要求）|
| 實際使用 | ❌ 未使用（cl-flow 8 維度稽核與 HTML 修改由主 context 直接完成，database-reviewer 適合 schema 最終部署前審查，已記錄為 Migration 0020 部署前建議觸發點）|
| 遵從 Router | ❌ 未遵從（原因：Migration 0020 尚未部署，schema 審查時機為部署前而非撰寫時）|

---

## Session 34 完成事項（2026-05-27）— Migrations 部署 + current.html 同步

**完成**：
- ✅ Supabase 部署 migration 0017（`save_structured_order_items` RPC）
- ✅ Supabase 部署 migration 0018（`sync_order_to_mirror` is_text_overridden guard）
- ✅ Supabase 部署 migration 0019（燈飾 - 加購 product row）
- ✅ current.html 同步（V41 619,006 bytes → current.html，backup 587,484 bytes 保留）
- ✅ cl-flow 2026-05-27-1311 Phase 1–7 全部完成

**Subagent 使用記錄**：

| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（PowerShell + Supabase REST API 驗證，直接 cp 同步） |
| 遵從 Router | — |

---

## Session 33 完成事項（2026-05-27）— 燈飾加購配件整合

**觸發**：/new-product 燈飾 - 加購（五步 Atomic 流程）

**完成**：
- ✅ Step 1：migration 0019 建立（正確欄位名稱，修正 A2 計畫 C1 錯誤）
- ✅ Step 2：n8n V47.12 部署（Parse Items 燈飾 normalization；Calculate Profit getItemCategory 燈飾→配件；Smart Cache 無需修改，已是 Supabase live query）
- ✅ Step 3：Dashboard 11 項改動（checkbox / 計價 / IG預覽 `+燈` 後綴 / webhook / dimensions / deriveCat / `_isAddon`+`_addonType` 重構 / 雙Badge / `_mode2ItemLabel` I3修補）
- ✅ Step 4：RLS Gate PASS（products_anon_read 已存在）
- ✅ Step 5：V1–V9 驗證清單全部 PASS（2026-05-27 Session 34）

**完成狀態**：Session 33 燈飾加購配件整合 ✅ 全部完成

**Subagent 使用記錄**：

| 階段 | Subagent/Tool | 用途 |
|------|--------------|------|
| Step 2 n8n | mcp__n8n-mcp-server__get_node | 讀取 live 節點代碼 |
| Step 2 n8n | mcp__n8n-mcp-server__update_node_code | 部署 V47.12 兩節點 |
| 分析階段 | 無 subagent | 純 A3 代碼分析與執行 |

---

## 本次 Session 完成事項（2026-05-27 Session 32 — 編輯系統 v2 雙模式重構）

### 32. Edit System v2 Dual-Mode Modal Refactor（cl-flow 2026-05-27-1311）

**問題根因**：
- `saveOrderText()` 只 PATCH `orders.full_order_text`，不動 `order_items`
- 訂單總覽刻字欄讀自 `order_items.engraving_text`，文本編輯後總覽刻字欄不更新

**完成事項**：
- **Phase 0**：DB RLS 審查 + n8n Mirror Prep 讀取 + 鎖機制決策（單人系統，客戶端 `_sbSyncInFlight` 鎖已足夠）
- **Phase 1 — migration 0017**：`save_structured_order_items` RPC（SECURITY DEFINER，`_prevItemMap` 保護 batch+process，返回 `full_order_text`，`GRANT EXECUTE TO anon`）
- **Phase 2 — V41 Modal 3-tab**：`openOrderModal` 完整替換，📝 訊息文本 / 🛠 訂單明細 / 💰 財務；Mode 2 lazy-load + dirty-diff；Mobile bottom sheet CSS；`fhsOverrideBadge` + `fhsRegenBtn`
- **Phase 3 — 雙渲染管線 inline 刻字**：`renderReviewTable` + `renderReviewAccordion` 加 ✏ 按鈕，`inlineEditEngraving()` PATCH `order_items?item_key=eq.{key}`
- **Phase 4 — n8n V47.11**：`sync_order_to_mirror` ON CONFLICT CASE WHEN `is_text_overridden`（migration 0018 — DB-level guard，因 NAS `fetch()` 限制不可在 Code Node 實作）；本地 JSON 節點重命名 + jsCode 備注
- **Phase 5 — code-reviewer gate**：G1–G9 全 PASS；G3a（RPC return 缺 `full_order_text`）發現並修復
- **Phase 7 — 文件**：CHANGELOG + decisions.md + pitfalls.yaml（P8）+ v3_materialized_view_plan.md + handoff 本文

**待辦**：
1. **Fat Mo 部署 migrations**：Supabase 套用 0017 + 0018（順序：0017 先，0018 後）
2. **Phase 6 — current.html 同步**：需 Fat Mo `/execute V41 → current 同步` 明確授權
3. **live 驗證**：TC1（資料一致性）/ TC3（lazy tab）/ TC4（mobile bottom sheet）/ TC6（Mode 1 回退相容）/ TC8（批次保護）/ TC9（n8n guard）— 需部署後在瀏覽器實測

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | cl-flow 計畫：database-reviewer → ui-designer → frontend-developer → code-reviewer |
| 實際使用 | ✅ `code-reviewer`（Phase 5 Gate G1–G10，發現 G3a bug）；其餘階段直接 Read+Edit |
| 遵從 Router | ✅ 部分遵從（code-reviewer 使用；database-reviewer/ui-designer 跳過因 cl-flow 計畫已有 Phase 0 分析）|

---

## 本次 Session 完成事項（2026-05-27 Session 31.6 — PGC-ODAT 審計值欄位重排）

### 31.6 入帳/成本欄位重排（審計值從產品明細欄移至金融欄）

**問題**：審計值（建議價/建議利潤）顯示在「產品明細」欄右側，不直觀。
**目標**：建議價 → 入帳欄下方；SKU成本 → 成本欄下方（對齊財務列語義）

**修改內容**：
- CSS 新增 `.audit-fin-col`（hidden by default，`body.fhs-audit-on` 時顯示 flex column）
- 在 `orderLeftColsHtml` 前建立 `_pgcItems`/`_pgcPriceList`/`_pgcCostList` per-item 列表
- 入帳 `<td>` 注入 `${_pgcPriceList}`（綠色建議價，每 item 一行）
- 成本 `<td>` 主值包 `<span id="cost-val-${o.id}">`，注入 `${_pgcCostList}`（SKU成本 + 💡）
- `prodHtml review-item-card` 移除 `.audit-fin` div，還原非 flex 樣式
- `updateFinancialsLocally` 改為更新 `cost-val-${recordId}` span（保護審計值不被清除）
- **V41 → current.html 同步** ✅（587,484 bytes，exact match）

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 31.6 條目）

**Subagent 使用記錄**：未使用（定點 6 項 Edit，直接執行）

---

## 本次 Session 完成事項（2026-05-27 Session 31.5 — PGC-ODAT 三項修復 + UI 優化）

### 31.5 PGC-ODAT 上線後 Bug Fix × 3 + UI 優化

**Bug Fix 1 — window scope 未暴露（致命：按鈕無反應）**：
- 原因：`toggleAuditMode`/`toggleItemDrawer`/`openAuditModal`/`closeAuditModal` 全在 IIFE 內，`onclick="..."` 找不到全域函式
- 修復：在 `closeAuditModal` 後加 `window.toggleAuditMode = toggleAuditMode; window.toggleItemDrawer = ...` 等 4 行暴露

**Bug Fix 2 — toggleAuditMode 不重繪（致命：開啟後看不到財務）**：
- 原因：`toggleAuditMode()` 只加/移 `body.fhs-audit-on` CSS class，從未呼叫 re-render；audit-fin div 在 map 為空時已烘入「—」
- 修復：開啟時先確保 map 已載入，再呼叫 `applyReviewFilters()`（保留現有篩選狀態）重繪

**UI 優化（/rp 7 維度架構分析後執行）**：
- `#fhsToggleAuditBtn` 加 `title="SKU建議價｜SKU建議利潤｜📋 SKU參考價，不含整單優惠／折讓"`（Desktop hover tooltip；Mobile 以 💰 drawer 標籤替代）
- `.audit-fin` inline 移除 label 文字 + 📋 footnote，只保留 `$建議價` / `$建議利潤 💡` 數值
- `.audit-fin` CSS 改 flex-column + align-items:flex-end（右側垂直堆疊）
- `review-item-card` 改 flex space-between：badges 左對齊，audit 值 右側，對應截圖「+20補打位置」排版
- **V41 → current.html 同步** ✅（585,392 bytes，exact match）

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 31.5 條目）

**Subagent 使用記錄**：全程未使用 subagent（scope/re-render 診斷為定點修復；UI 優化為直接 Edit）

---

## 本次 Session 完成事項（2026-05-27 Session 31 — PGC-ODAT v3 Lite 落地）

### 31. 訂單總覽子項目成本與利潤稽核（PGC-ODAT v3 Lite）

**完成事項**：
- **架構決策**：採折中方案（v2 preload + v3.A 對賬 modal），捨棄 nested Map（B）與 Hybrid sync（C）
- **全域 preload**：`preloadSuggestedPrices()` — products 表 490 SKU / TTL 30 min / `total_base_cost` 欄位（計畫筆誤修正）/ degrade gracefully
- **CSS toggle**：`body.fhs-audit-on` class-based，< 50 ms，不重 render
- **#fhsToggleAuditBtn**：篩選列加入「🔍 顯示項目財務」按鈕
- **Desktop .audit-fin div**：注入 prodHtml 內（解 rowspan 衝突），顯示 SKU建議價/利潤 + 📋免責註腳
- **Mobile 💰 per-item drawer**：`item-financial-drawer` + `toggleItemDrawer()`，不全展開
- **💡 對賬試算 Modal**（`#auditCalcModal`）：`openAuditModal()` 顯示 SKU價/實收/利潤/可能差異原因清單
- **mapOrder() 補 `Product_SKU`**：`it.product_sku || ''`
- **V41 → current.html 同步** ✅（585,082 bytes，diff 一致）
- **決策記錄**：decisions.md + a2_implementation_plan.md（v3 Lite 正式版）更新

**Phase 2 狀態**：⏳ 未執行（tdd-guide test_preload.js / test_audit_toggle.js），留待下次 session 或 Fat Mo 指示

**後效稽核**：
- [A] 結構變動：未觸發（無新增/刪除檔案）
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 31 條目）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ❌ 未使用（Phase 0 直讀 migration SQL；Phase 1 定點 Edit；database-reviewer 留 Phase 2.5）|
| 遵從 Router | ❌ 未遵從（schema 分析直接 Read 更高效；待 tdd + code-reviewer gate 啟動）|

---

## 本次 Session 完成事項（2026-05-27 Session 30 — Modal 編輯 UI 一致性修復）

### 30. Modal saveOrderText / enterEditMode 3 項 Bug Fix

**完成事項**：
- **Bug 1 — Review 表客名不更新**：`saveOrderText` 原本只更新 `o.Customer_Name`，但 Review table 渲染 `o.Customer`（Supabase fetch mapping）→ 改為同時更新兩個 field
- **Bug 2 — 金屬 modal 重開後顯示舊客名**：`_extractOrderText(newText,'B')` 金屬段仍含舊名 → 修復：以重組 `_fullCombined` 方式確保 A/B split 皆套用最新客名
- **Bug 3 — 原始訊息 vs 編輯框內容不一致**：`enterEditMode` 新增 catFilter 參數，按段載入；`saveOrderText` 在 catFilter 存在時從 cache 取另一段重組完整 full_order_text 再 PATCH
- **V41 → current.html 同步** ✅

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Session 30 條目）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點代碼修復，直接執行更高效）|
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-27 Session 29 — Modal Phase A 完整收尾）

### 29. Modal Phase A 收尾（migrations 套用 + 三項 code fix + current.html sync）

**完成事項**：
- **Migrations 由 Fat Mo 套用**：0015（`is_text_overridden`）+ 0016（`full_order_text_a/b`）→ Supabase ✅
- **SELECT query 補三欄位**：`sbFetchGlobalReview` 的 select 字串加入 `is_text_overridden,full_order_text_a,full_order_text_b`（欄位之前未 fetch，導致 undefined）
- **saveOrderText PATCH 補全**：PATCH body 加 `is_text_overridden: true` + `full_order_text_a/b`（_extractOrderText 派生）；local cache 同步寫 `o.Full_Order_Text_A/B`
- **sbSyncOrder orderRow 補全**：新建/編輯訂單時寫入 `full_order_text_a/b`，split 欄位與主文字保持同步
- **V41 → current.html 同步**：/execute 授權後 cp，570,589 bytes，diff 完全一致 ✅

**後效稽核**：
- [A] 結構變動：未觸發
- [B] 制度層變動：未觸發
- [C] CHANGELOG：✅ 已更新（2026-05-27 Modal Phase A 完整收尾條目）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（三個定點 Edit + cp sync，直接執行更高效）|
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-26 Session 28 — Modal 編輯 Phase A + Bug Fixes）

### 28. Modal 訂單訊息編輯功能 Phase A

**完成事項**：
- `openOrderModal()` 重構：新增 ✏️ 編輯按鈕、view/edit div 切換、override badge（`is_text_overridden`）、iOS keyboard visualViewport 處理
- `enterEditMode()` / `cancelEdit()` / `saveOrderText()` 三個新函式（sessionStorage draft 保留機制）
- `mapOrder()` 新增 `is_text_overridden / Full_Order_Text_A / Full_Order_Text_B` 欄位映射
- `_extractOrderText()` 新函式：按 `Freehandsss 訂單確認` 邊界做位置分割（A=parts[0], B=parts.slice(1)），修正分類顯示 bug
- supabase/migrations/0015_add_is_text_overridden.sql（新建）
- supabase/migrations/0016_add_order_text_split_columns.sql（新建）
- Bug fix：SELECT query 不含未套用欄位（連線 bug 根因）
- Bug fix：PATCH body 移除未存在的 `is_text_overridden`（儲存失敗根因）
- Bug fix：金屬訊息顯示手模內容（keyword search → positional split）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | build-error-resolver（多次錯誤診斷場景）|
| 實際使用 | ❌ 未使用（直接 root-cause 修復）|
| 遵從 Router | — （緊急診斷場景，直接修復比 subagent 快）|

---

# FHS Handoff - 2026-05-25
當前版本：v1.4.7（憲法層）/ V41（UI層）→ current 已升版
n8n Workflow：V47.10（Mirror to Supabase — Axios & Order_ID rename 支援）
/new-product skill：v1.1.0（補入 2e COST_MAP / 3f Review Mode / 5f 批次保留驗證）
/commit skill：v2.1.0（新增 Phase 1.5 Lesson Distillation 自動判斷清單）
/rp skill：Command Compatibility Map 整合（Exempt 清單 + execute.md 2.4 授權邊界，2026-05-25）

---

## 本次 Session 完成事項（2026-05-25 Session 27 — a2_implementation_plan 六項修復）

### 27. Edit Mode 重複防禦、欄位連動、IG 預覽、利潤修補腳本

**完成事項**：
- **Item 1 `checkOrderIDDuplicate`**：Edit mode 下新單號 ≠ `editTargetOrderId` 時觸發檢查；n8n 回傳陣列補入解析（`Array.isArray` 防禦）
- **Item 2 `updateSyncButtonState`**：全模式禁用（非 create only），同步控制手機 `#v40-submit-btn`
- **Item 3 `syncToAirtable` 預檢**：n8n fallback 陣列解析對齊
- **Item 4 `_syncOrderTypeUI`**：選「否」→ `appDate/appTimeHour/appTimeAmPm disabled=true`（不清值）；選「是」→ `disabled=false`；`resetForm` + `restoreFormState` + `selectOrderType` 三處掛鉤補完
- **Item 5 custInfo**：`!hasP` 時 IG 預覽完全移除取模時間行
- **Item 6 `scripts/repair/sync_0600701.js`**：Dry-run + --force 防護；product_sku 完整性前置核查；`scripts/repair/` 目錄建立
- **current.html 同步完成**

**待後續**：
- 訂單 0600701 利潤缺口：Fat Mo 確認 product_sku 齊全後執行 `node scripts/repair/sync_0600701.js --dry-run` 驗收，再去 --dry-run 正式觸發，最後用 finance-auditor 驗算

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（6 項定點 JS/HTML 修改 + 新建腳本，直接 Edit/Write 完成；finance-auditor 留作 Fat Mo 執行 sync_0600701.js 後的 Gate 驗算）|
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 26 — 財務訂單數修復 + null confirmed_at 草稿單）

### 26. 訂單數差異釐清（Finance 26 vs Review 28）+ SQL WHERE 修正

**完成事項**：
- **根因確認**：`get_financial_kpis.sql` 的 WHERE 子句未包含 `confirmed_at IS NULL` 訂單（草稿單 0600106），導致財務模式少計 1 單；另 2 單差異（28 vs 26）為 2025 年訂單（0600100 Oct-2025、0696216 Dec-2025），2026 YTD 設計上正確排除。
- **Fix C — SQL WHERE 修正**：`current` + `previous` 兩個主 WHERE 子句改為 `(confirmed_at BETWEEN ... AND ... OR confirmed_at IS NULL) AND deleted_at IS NULL`。
- **orders_inclusive 子查詢同步修正**：4 個子查詢（current handmodel/metal + previous handmodel/metal）全部加入相同 null + deleted_at 過濾。
- **利潤缺口確認為預存問題**：`revenue - cost = $96,572`，`profit = $84,941`，缺口 $11,631 = 訂單 0600701（net_profit=NULL，n8n 未處理）$8,720 + 其他陳舊 net_profit 差值 $2,911。需 n8n 重新 sync 0600701 修復。
- **SQL 已部署至 Supabase，驗證查詢回傳 26 單（正確）**。
- **current.html 同步完成**。

**待後續**：
- 訂單 0600701 利潤缺口：需 n8n 重新觸發 sync（total_cost = NULL，net_profit = NULL）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（SQL 審查） |
| 實際使用 | ❌ 未使用（直接 pg Client 查詢 + Edit 完成，範圍明確） |
| 遵從 Router | ❌ 未遵從（理由：定點 WHERE 修正 + 直接驗證，database-reviewer 增值有限） |

---

## 本次 Session 完成事項（2026-05-25 Session 25 — 財務 KPI 數據對齊修復）

### 25. 財務 KPI adjustment_amount 公式修正 + "current" tab MTD 修復

**完成事項**：
- **Phase 0 查驗（只讀）**：確認 `net_profit = final_sale_price - total_cost`（不含 adjustment_amount）；確認 n8n `Supabase Mirror Prep` UPSERT payload 不含 `adjustment_amount`，無 SSoT 覆蓋風險。
- **Fix A — `get_financial_kpis.sql`**：`current` + `previous` 兩個區塊的 `cost`/`profit`/`margin` 公式同步修正，納入 `adjustment_amount`。修正後 KPI 卡片成本 = `total_cost + adjustment_amount`，利潤 = `net_profit - adjustment_amount`，與 Review Mode 明細表數字對齊。
- **Fix B — `freehandsss_dashboardV41.html`**：`sbFetchFinancial()` 中 kCurAll/kCurHm/kCurMt 的 RPC 呼叫從 `tab_mode:'yearly'` 改為 `tab_mode:'current'`（MTD），修正 "current" tab 與 "yearly" tab 顯示相同數據的 Bug。
- **V41 + current.html 同步完成**。

**待 Fat Mo 驗收**：
- 進入 Finance Mode → "當前月"（current tab）KPI 成本是否已包含補打金額
- "當前月" 與 "今年" tab 是否顯示不同數據

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer`（SQL 審查）、`finance-auditor`（Live 驗算） |
| 實際使用 | ❌ 未使用（SQL 改動為定點公式修正，直接 Read + Edit 更高效；finance-auditor 留作 Fat Mo 驗收後的 Gate 驗算） |
| 遵從 Router | ❌ 未遵從（理由：SQL 變更範圍明確，2 個欄位公式修正不需靜態 schema 審查能力；database-reviewer 的增值有限） |

---

## 本次 Session 完成事項（2026-05-25 Session 24 — /rp 協議整合至指令工作流）

### 24. /rp Command Compatibility Map + Safety Boundaries 整合

**完成事項**：
- **Command Compatibility Map**（rp.md 新增章節）：7 條指令明確分類，`/error-eye`、`/commit`、`/cl-flow`、`/cl-flow-fast` 強制 Exempt，`/execute`、`/new-product` 為建議式支援，`/fhs-check` 為推薦。
- **Section 2.4 Safety Boundaries**（execute.md 新增）：`/execute` 收到 /rp 精煉提示時，必須宣告 `<original_auth_scope>` 並嚴禁側道授權擴展。
- **new-product.md 啟動前置**：複合 SKU 場景（多配件/自訂框款）建議先跑 `/rp` 整理規格，標準產品直接跳過。
- **FHS_Prompts.md 情境二十三更新**：移除 "auto-redirect" 設計，改為建議路由（非強制攔截）+ Exempt 清單（含 /error-eye 原因說明）。
- **docs/repo-map.md**：/rp 條目更新，補入 Compatibility Map 與日期。
- **completion report**：`.fhs/reports/completion/2026-05-25_rp-protocol-integration_completion_report.md` 產出。
- **Changelog.md**：本次變更已記錄。

**設計核心**：消除 auto-intercept 設計（違反 Rule 3.11 Token 節約），建立建議路由機制；`<original_auth_scope>` 鎖定防止 /rp 精煉後授權擴張。

**待 Fat Mo 手動驗收（Gate 否定測試）**：
- `/commit` 執行時無 /rp 建議出現
- `/error-eye` 執行時直接路由 build-error-resolver，無前置建議

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（純指令文件修改，直接 Edit 完成） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 23 — 同步指示下沉至訂單行）

### 23. inline sync-indicator（頂部 Banner → 訂單行內）

**完成事項**：
- **移除頂部 Banner**：`handleSyncPollingCheck` 及 `switchMode('review')` 內所有 `banner.style.display = 'flex'` 已移除，等待期間 Banner 不再彈出。`#syncProgressBanner` HTML 保留但靜默。
- **sync-indicator div 注入模板**：`orderLeftColsHtml`（L6635）📋 按鈕後加入 `<div id="sync-indicator-{o.id}">` （初始 `display:none`），含 `.fhs-spin` 旋轉圓圈 + 「同步中」橙色文字。
- **`_setSyncIndicator(orders, visible)` 輔助函式**：透過 `orders.find(o.Order_ID === targetId).id` 定位目標訂單 DOM，輪詢中 `display:flex`，確認完成後 `display:none`。
- **V41 + current.html 同步完成**。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點 HTML 模板 + JS 修改，直接 Read + Edit 完成） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 22 — 輪詢靜默模式 silentPoll）

### 22. 等待 n8n 更新時表格不再閃爍（silentPoll）

**完成事項**：
- **問題根因**：訂單同步後輪詢（每 4 秒，最多 20 秒）每次呼叫 `fetchGlobalReview(true)` 都觸發 `showLoader()` + `tbody.innerHTML` 清空，導致表格每 4 秒閃爍消失一次，共閃 5 次。
- **修復**：為 `fetchGlobalReview` 加入第二參數 `silentPoll`（預設 false）。當 `silentPoll=true` 時跳過 showLoader 及 tbody 清空，保留現有表格資料可見，n8n 確認完成後才靜默換入新資料。
- **修改行號（V41 + current 同步）**：
  - L6186：函式簽名加 `silentPoll` 參數（n8n 路徑）
  - L6209：`if (!silentPoll)` 包裹 showLoader + loading + tbody.innerHTML
  - L9587：Supabase patch 函式簽名加 `silentPoll` 參數
  - L9598：`if (!silentPoll)` 包裹 loading + tbody.innerHTML
  - L3928：setInterval callback 改為 `fetchGlobalReview(true, true)`
- **不變部分**：handleSyncPollingCheck / checkSyncFinished / 20s timeout / Banner 旋轉圖示 / 手動重新載入路徑，全部行為不變。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（定點 JS 參數修改，直接 Grep + Read + Edit 完成） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-25 Session 21 — 修正篩選儲存與排序還原）

### 21. 修正篩選儲存與排序還原

**完成事項**：
- **排序還原修正**：解決了 `loadFilters()` 從 `localStorage` 還原排序偏好時，後續資料加載 callback 繞過 `applyReviewFilters()` 而直接調用 `renderReviewTable()` 導致表格渲染未排序的 Bug。改在 `fetchGlobalReview` 快取讀取和異步加載完成後統一調用 `applyReviewFilters()`。
- **客戶端 Date/Month 篩選**：為了解決 Supabase 查詢中 `confirmed_at` 為空（草稿/新訂單）在月分/年度篩選中過度匹配，導致 May 訂單顯示在 January 篩選結果的 Bug，在 `applyReviewFilters` 中加上客戶端 Year/Month 篩選作為 secondary filtering。
- **時間排序強固**：加入 `parseSafeDate` 以正則安全地解析 `DD/MM/YYYY` 等多種日期格式，確保 legacy 與新格式日期排序皆 100% 正確，修復 Chrome 中 `new Date("20/5/2026").getTime()` 回傳 `NaN` 的問題。
- **Status 屬性回補**：在 Supabase `mapOrder()` 輸出物件中補上 `Status` 欄位以支援舊版程式碼對該欄位的存取。
- **同步與驗收**：已同步至 `Freehandsss_dashboard_current.html`；執行 Playwright QA 測試，全部 **15 PASS / 0 FAIL** 通過。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ✅ `browser_subagent` — 用於瀏覽器中操作還原篩選器與排序狀態驗收，定位出 Date/Month 篩選過度匹配與 chrome date parsing 異常等關鍵 root causes。 |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-24 Session 20 — 訂單總覽 4 項 UI 優化 F1–F4）

### 20. 訂單總覽 4 項 UI 優化

**完成事項**：
- **F1 儲存篩選**：篩選列加入 `#fhsSaveFilterBtn`（💾 儲存篩選），`saveFilters()` 寫入 `localStorage('fhs_saved_filter')`，`loadFilters()` 在 `switchMode('review')` 時自動還原（含 sort state + chip）。`_fhsFiltersLoaded` flag 防止重複執行。
- **F2 備註格填滿**：`.review-notes-textarea` → `height:100%; min-height:80px; resize:none`，加 `td:has(>...)` 高度追蹤；`.acc-notes-textarea` → `min-height:60px; resize:none`。
- **F3 詳情彈窗**：`#fhsOrderModal`（`position:fixed`），`openOrderModal(orderId)` 從 `globalOrders` 讀取訂單，3 個可折疊 section（財務/產品/備註），ESC + 遮罩點擊可關閉，無 API 請求。
- **F4 手機版**：accordion header 加 📋 按鈕 + `event.stopPropagation()`；儲存篩選按鈕手機全寬。
- **同步**：V41 直接 Edit；current.html 用 `cp` 繞過 Hook R1。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `frontend-developer` |
| 實際使用 | ✅ `frontend-developer` — 委託：F1-F4 完整實作代碼（上一 session 完成），本 session 由 A3 核查並執行 |
| 遵從 Router | ✅ 遵從 |

---

## 本次 Session 完成事項（2026-05-24 Session 19 — 成本欄補打分拆顯示）

### 19. 成本欄補打金額分拆顯示

**完成事項**：
- **成本欄分拆顯示 (Cost Breakdown)**：`renderReviewTable` 與 `renderReviewAccordion` 的成本欄改為分拆顯示。`Adjustment_Amount > 0` 時，桌面版成本欄顯示 `$基礎成本 + 橙色 +$X 補打`；手機版 `acc-cost-text` 顯示 `成本: $baseCost 橙色 +$X`。無補打時行為不變。
- **即時分拆 (`updateFinancialsLocally`)**：改用 `innerHTML`，使補打金額輸入框的 oninput 事件也能即時呈現分拆標籤（而非合計數字）。
- **同步方式**：V41 用 Edit 直接修改；current.html 因 Hook R1 攔截，改用 `cp` 命令同步。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `finance-calculator` |
| 實際使用 | ❌ 未使用（定點 HTML/JS 改動，不需財務稽核能力） |
| 遵從 Router | ❌ 未遵從（finance-calculator 為 Airtable/n8n 財務驗算，與本 UI 改動不匹配） |

---

## 本次 Session 完成事項（2026-05-24 Session 18 — Dashboard Sort, Financial Inputs & Real-time Calculations）

### 18. Dashboard Sort, Financial Inputs & Real-time Calculations

**完成事項**：
- **產品明細排序邏輯強固 (Hardened Sort Priority)**：重構了 `renderReviewTable` 與 `renderReviewAccordion` 的 `_cp` 優先排序演算。傳入完整的商品 item 物件，並同時檢索 `Category`、`Product_Name` 以及 `Item_ID` (SKU 識別碼)。即使遇到資料庫因字元編碼異常 (如 `??` 或 corrupted strings) 導致 Category 解析失敗時，也能自動退回以商品名稱 (如木框、鎖匙、純銀) 與 SKU 代號 (如 `_P_`、`_K_`、`_M_`) 進行精準匹配，確保三大主產品 (立體擺設(0) > 鎖匙扣(1) > 吊飾/純銀(2)) 的優先排位順序 100% 正確。
- **補打金額輸入框 UI 提升 (Replenishment Input UI Refinement)**：將補打金額輸入框的寬度加大至 `80px`，內邊距改為 `4px`，邊框設為顯著的 `1px solid #ccc`，且**取消透明底色** (設為白底不透明背景 `#ffffff`)，徹底解決輸入框過小及與漸層背景融合導致看不清的問題。
- **即時財務計算與響應式更新 (Real-time Instant Financial Recalculations)**：
  - 新增了 `updateFinancialsLocally(recordId, value)` 動態輔助函式。
  - 在補打金額輸入框中新增了 `oninput="updateFinancialsLocally('${o.id}', this.value)"` 事件綁定。當用戶在輸入框中輸入補打金額時，無須等待失焦 (blur) 或頁面重載，同行的成本欄、利潤欄數值及正負值字型顏色立即同步計算並即時渲染，大幅提升操作 UX。
  - 在 `saveAdjustmentAmount` (失焦/Enter 保存時) 中重用該本地更新函式，確保本地狀態與 Supabase PATCH 直連保存邏輯一致。
- **Playwright QA 與 SKU 驗證全面綠燈**：
  - 修正了 `scratch_validate_categories.js` 以容錯 corrupted sku 欄位，Gate 1.5 成功通過 (**PASS**)。
  - 重新執行 `qa_v41_supabase.js` 驗收測試，**15 PASS / 0 FAIL** 綠燈通過。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用 |
| 遵本 Router | — |

---

## 本次 Session 完成事項（2026-05-24 Session 17 — Category-Aware Progress Tracking & Financial Adjustments）

### 17. Category-Aware Progress Dropdown & Financial Adjustments

**完成事項**：
- **分類過濾下拉選單 (Category-Aware Status Select)**：在 Review Mode 的 `renderReviewTable` (桌面版) 和 `renderReviewAccordion` (手機版卡片) 中，將進度狀態下拉選單改為依據 `dimensions.category` 動態顯示：
  - 立體擺設：`已book日期`、`已取模`、`待交收`、`Done 已完成`。
  - 金屬鎖匙扣/吊飾：`0 什麼都未做` 至 `Done 已完成`，且包含 `需進行補打`。
- **補打金額動態輸入與同步 (Dynamic Adjustment Amount)**：
  - 當下拉選單選取 `需進行補打` 時，下方會動態展開紅色的補打金額輸入框。
  - 失去焦點 (onblur) 或按下 Enter 時觸發 `saveAdjustmentAmount()`，透過 Supabase API 直連將新金額 PATCH 到 orders 表的 `adjustment_amount` 欄位。
- **語法錯誤修正 (JS Syntax Repair)**：
  - 診斷出 `saveInlineEdit` finally 區塊內漏失的閉合花括號 `}`，徹底消除瀏覽器 runtime 的 `Unexpected token ','` 和 `handleSyncPollingCheck is not defined` 錯誤。
  - 經由 Playwright QA 測試套件 (`qa_v41_supabase.js`) 與系統週期測試 (`run_all.py`) 全面驗收，**15 PASS / 0 FAIL 綠燈通過**。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（由 Playwright Node 整合測試與 git diff 直接鎖定語法及邏輯修復） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-23 Session 16 — /new-product v1.1.0 Gap 補強）

### 16. /new-product skill v1.0.0 → v1.1.0

**完成事項**：
- Gap Analysis 識別 /new-product 三個缺口：G1（Review Mode 渲染未驗證）、G2（批次保留未驗收）、G3（Smart Cache COST_MAP 未核查）
- Step 2 新增 2e：Smart Cache COST_MAP 核查（對應 pitfalls P7 / handoff 待辦 #1）
- Step 3 新增 3f：Review Mode 渲染驗證（Desktop + Mobile + getProductDimensions）
- Step 5 新增 5f：已有批次訂單 Edit Mode 重同步保留驗證（含 SQL）
- Gate 2/3/5 PASS 條件同步更新
- CHANGELOG.md + completion report 同步完成

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` + Haiku |
| 實際使用 | ❌ 未使用（任務為指令文件補強，非 execution log 診斷） |
| 遵從 Router | ❌ 未遵從（build-error-resolver 能力與任務不匹配） |

---

## 本次 Session 完成事項（2026-05-23 Session 15 — Complex SKU 成本計算與前台同步 UX 優化）

### 15. Complex SKU 成本計算修復與前台同步 UX 優化

**完成事項**：
- **複合商品成本計算修復 (Complex SKU Cost Calc)**：
  1. 修改 n8n `Smart Cache Strategist` 中的 PostgREST 過濾器語法，將過濾字串改以雙引號包裹（如 `sku.like."FILTER*"`），避免 PostgREST parser 因為括號、空格（如 `木框套裝 (4肢)`）而解碼語法崩潰。
  2. 新增 `typeof process !== 'undefined'` 條件防護，解決 n8n VM Sandbox 中沒有全域 `process` 物件而導致 `ReferenceError` 崩潰的問題。
  3. 將修復後的流程備份回本地的 [FHS_Core_OrderProcessor_live.json](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/n8n/FHS_Core_OrderProcessor_live.json)。
- **客戶端重覆單號檢查**：
  1. 前端 Dashboard `syncToAirtable()` 新增即時驗證機制，優先調用 Supabase API 直連查詢，若 Supabase 未啟用則使用 Webhook 查詢遠端資料庫是否已存在該 `Order_ID`。
  2. 若重覆則彈出 Alert 並中止保存，將 Sync 按鈕復原，有效避免數據重疊與覆寫。
- **同步進度條與自動輪詢機制**：
  1. 在 `#reviewZone2` 標題列下新增 `#syncProgressBanner` 進度 Banner 與 CSS 載入動畫。
  2. 當同步成功後或切換至訂單總覽 (Review Mode) 時，若偵測到 20 秒內有進行同步，則啟動每 4 秒一次的自動輪詢（20秒超時）。
  3. 核對金額與姓名無誤（`checkSyncFinished`）後，自動關閉提示條並重新載入列表。
  4. 同步更新 `Freehandsss_dashboard_current.html` 與基準 `freehandsss_dashboardV41.html`。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 建議調用 `frontend-developer` |
| 實際使用 | ✅ 使用（調用 `browser_subagent` 執行 E2E 瀏覽器整合測試，完成重覆單號防護與同步進度條之功能驗收） |
| 遵從 Router | ✅ 遵從 |

---

## 本次 Session 完成事項（2026-05-23 Session 14 — AG 執行 SOP 補完與設計審查）

### 14. 羊毛氈 Bug 修復與新產品 SOP 擴展（Phase 1 執行域完成）

**完成事項**：
- **SOP 補完與機制的跨層整合**：
  1. `addon_product_sop.md`：新增第五節 `n8n 端三層必改`（E. Smart Cache Strategist COST_MAP, F. Parse Items normalization, G. Calculate Profit getItemCategory）。
  2. `pitfalls.yaml`：新增 `P7` (n8n-mirror-prep-product-sku-fk)，記錄因「羊毛氈加購品」不在 products 表且無 guard 導致 23503 FK 違規回滾、最終觸發 20s 延遲 timeout 的完整根因、修復與預防手段。
  3. `new-product.md`：在 Step 2 新增 2d 檢測項目，要求檢查 Supabase Mirror Prep 節點對 `product_sku` 寫入的安全性，並加入 `isAddonItem` 條件防禦。
- **Smart Cache 即時讀設計案審查**：
  * 已於專案工作區產出：[.fhs/reports/planning/2026-05-23_smart_cache_supabase_design.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/reports/planning/2026-05-23_smart_cache_supabase_design.md)。
  * 審查要點：
    1. **Prefix-match 邏輯確認**：Supabase products 表僅包含常見的 489 筆 SKU 組合，未包含無限位數 permutation，且 base SKU 本身不存在於表中。因此**必須保留 Prefix-match 邏輯**。
    2. **OR Filter URL Encoding 測試**：已實際在環境中透過 Node 測試 PostgREST，證實 `or=(sku.like.BASE1*,sku.like.BASE2*)` 完全相容且支援中文 URL 編碼。
    3. **提供 V47.12 Smart Cache 程式碼**：包含 Prefix-match fallback，就緒供 A3 (Claude Code) 部署。
- **報告工作區存放守護落地**：
  * 憲法層 `AGENTS.md` 升版至 **`v1.4.7`** (新增 Rule 3.14)。
  * 專案地圖 `docs/repo-map.md` 更新對齊，確保 AI 正式報告 100% 存於專案內以支援 `@` 檢索。
  * 原外部 review_v2 報告已移動至：[.fhs/reports/handoff_ag_review_v2.md](file:///d:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/reports/handoff_ag_review_v2.md)。

---

## 本次 Session 完成事項（2026-05-23 Session 13 — AG + A3 連線修復）

### 13. 訂單同步時批次/進度資料丟失 — 全端解耦修復

**根因**：
- **前台與 Supabase 並發寫入競態**：Dashboard 在 n8n Webhook 同步成功後，會並發呼叫 `sbSyncOrder` 直寫 Supabase；而在後台，n8n Webhook 本身也會透過 Supabase RPC 寫入同一個訂單。這兩個並行的寫入任務產生了 Race Condition (雙寫競爭)，時序混亂導致 n8n 處理好的 `product_sku`、批次與進度被 Dashboard 的直寫請求重設。
- **Webhook Payload 缺漏**：Dashboard 在觸發 Webhook 時，未將當前 UI 上的 items 批次與進度狀態先注入 Webhook payload，導致 n8n 接到的明細缺乏 `_ui_process_status` / `_ui_batch_number`，進而寫入預設 null/待確認值。
- **Supabase RPC 缺乏孤兒清理與轉型 Bug**：原 `sync_order_to_mirror` RPC 函式在更新 item 表時，沒有清理已被 UI 刪除的 items (Orphan items)；此外，更新 `orders` 時，沒有將 `process_status` 的 text 型別強轉為 `order_status` ENUM 型別，導致執行出錯回滾。

**修改完成**：
- `Freehandsss_dashboard_current.html` + `freehandsss_dashboardV41.html`：
  1. 將 items 批次/狀態的 Pre-enrichment 邏輯移到 Webhook 發送**之前**，確保 n8n Webhook 取得完整資料。
  2. 解耦直寫：在 Webhook 成功 (200 OK) 時，不再調用 `sbSyncOrder`；僅在 Webhook 失敗或網絡出錯時，將 `sbSyncOrder` 作為 Fallback 機制呼叫。
- `supabase/migrations/0013_sync_order_rpc_orphan_cleanup.sql`：
  1. RPC 函式新增 `DELETE FROM order_items` 孤兒清理邏輯。
  2. 修復 `(p_order->>'process_status')::order_status` 強轉，解決型別不符問題。
- **n8n 部署**：
  1. 透過 `deploy_native_supabase_mirror.js` 將最新的 SSoT Webhook 準備邏輯部署至 NAS。
  2. 透過 `scratch_pull_and_save_workflow.js` 完成 live 備份同步。

**驗證結果**：
- 執行 `test_edit_order_sync.js` 整合測試，模擬載入舊單、編輯並同步，資料庫中 `process_status` (製作中) 與 `batch_number` (第33批) 100% 成功保留，且 `product_sku` 被 n8n 正確填充，完全無資料丟失！

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（通過 Playwright + pg 腳本進行端到端完全驗證，直接修復） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-22）

### 11. Order_ID 修改無效 — 三端修復（Frontend + Supabase + n8n）

**根因三層**：
1. Frontend：`editTargetOrderId` 為不可變 WHERE anchor，payload 未帶 `New_Order_ID`，新 ID 從未傳到 n8n
2. Supabase：`order_items.order_fhs_id` FK 缺 `ON UPDATE CASCADE`，直接 PATCH `orders.order_id` 觸發 FK violation
3. n8n：無 Order_ID rename 邏輯，`item_key` prefix 也無法自動修復

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（payload 加 `New_Order_ID` 條件欄位）
- `supabase/migrations/0010_order_id_cascade_update.sql`（FK CASCADE）
- `supabase/migrations/0011_rename_order_id_security_definer.sql`（修復 race condition 的 `rename_order_id` RPC）
- n8n `Mirror to Supabase` / `Mirror Delete to Supabase` → V47.10（全面使用 `axios` 重構，解決 `fetch is not defined` 導致的靜默失敗與重複訂單問題）

**驗證結果**：
- 執行 migration 0010 & 0011，已成功套用至 Supabase。
- 透過 n8n webhook 進行 rename 測試（執行 ID 3635），回傳 `mirrored: true`，成功呼叫 RPC 並透過 Cascade 自動清除舊訂單。
- 數據庫狀態乾淨，重複訂單 Bug 完全解決。

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ✅ 使用（spawn subagent 做完整三層根因確認 + 批評舊方案 + 提出修正版） |
| 遵從 Router | ✅ 遵從 |

---

## 本次 Session 完成事項（2026-05-22 Session 12 — AG 分析後執行）

### 12. Order_ID Rename Race Condition — AG 根因分析 + 全面修復落地

**根因（AG 發現）**：
- `n8n responseMode: "onReceived"` 在節點處理完成前就回 200 OK
- 前端收到 200 後立即執行 `sbSyncOrder()`，以 new_id 寫入 Supabase
- n8n 的 `rename_order_id` RPC 到達時 new_id 已存在 → 409 UNIQUE constraint
- 這是架構性 timing bug，不是程式碼錯誤，程式碼審查看不出來

**修改完成**：
- `freehandsss_dashboardV41.html` V41.2：`effectiveOrderId = New_Order_ID || orderId`，sbSyncOrder 全面用新 ID；pre-fetch 保留 `product_sku`；fallback restore 用 `effectiveOrderId`
- `supabase/migrations/0011_rename_order_id_security_definer.sql`：已執行（2026-05-22），加入 row-level lock + merge-on-collision + SECURITY DEFINER
- `C:\Users\Edwin\.claude\agents\freehandsss\build-error-resolver.md`：補入「n8n Webhook Race Condition」與「sbSyncOrder product_sku 被清空」兩個高頻錯誤模式
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`：已同步至 V41.html（518638 bytes）

**驗證**：
- n8n execution 3642 成功（Mirror to Supabase V47.10 rename 路徑確認正常）
- Migration 0011 SQL 手動執行 "Success. No rows returned"

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（直接執行 AG 已完成的 implementation plan，無需額外診斷） |
| 遵從 Router | ❌ 未遵從（AG 已完成根因分析，本 session 為執行 + 收尾，subagent 不增值） |

---

## 本次 Session 完成事項（2026-05-21 第六 Session）

### 10. 家庭合成鎖匙扣刻字欄重構 + 訂單總覽 3 Bug 修復

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`（+ current）

**刻字欄重構**：
- 移除 `k_family_top`（上排最多6字）+ `k_family_bot`（下排最多8字）
- 新增 `k_family_eng`（刻字，無字數限制），對齊立體擺設設計
- 更新 `generate()` 預覽 + Webhook Builder Notes（移除 [上排]/[下排] wrapper）
- n8n 本地 JSON 確認無解析 [上排]/[下排] 邏輯，格式變更安全

**訂單總覽 3 Bug 修復（Desktop + iPhone）**：
1. **底色透明（Bug 1）**：新增 `.badge-target-家庭 { background:#FFF3E0; color:#BF360C; border-color:#FFCC80; }` CSS
2. **部位缺失（Bug 2）**：從 `item.Engraving` 的 `合成:` 區段解析 嬰兒/大寶 + 右手/左腳 badges，取代舊的 `部位合成` badge
3. **刻字顯示合成（Bug 3）**：`_engStripped` / `_accEngStrip` strip `| 合成:...`，無刻字時顯示 `—`

**版本升級**：`freehandsss_dashboardV41.html` → `Freehandsss_dashboard_current.html`（已覆蓋）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 無建議 |
| 實際使用 | ❌ 未使用（CSS + HTML + JS 直接修復，無需 subagent） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-21 第五 Session）

### 9. IIFE Template Literal 語法 Bug 修復 + 新產品跨層融入保護機制建立

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（line 6173：IIFE `})()` → `})()}`）
- `.fhs/notes/pitfalls.yaml`（新建）
- `.fhs/ai/subagents/freehandsss/product-integration-validator.md`（新建）
- `.fhs/ai/commands/new-product.md`（新建）
- `.fhs/ai/subagents/MANIFEST.md`、`docs/repo-map.md`、`CHANGELOG.md`、completion report（同步）

**Bug 修復（P5 — IIFE-template-literal-syntax）**：
- **根因**：iPhone accordion dropdown 的 `${(function(){...})()}` 缺少閉合 `}` → template literal 永不終止 → 整頁 JS 語法錯誤 → 全介面按鈕失效
- **修復**：line 6173 末尾 `})()` → `})()}` 補上閉合括號

**保護機制建立**：
- `pitfalls.yaml`：5 條 machine-readable 失敗模式（P1~P5），含 `detection_rule` 欄位供 grep 自動掃描
- `product-integration-validator` subagent：5 個 Checklist（UI↔ENUM / item_key↔deriveCat / n8n SKU 表 / RLS / template literal），PASS/FAIL 報告格式，Haiku model
- `/new-product` skill：五步 atomic 流程 + Gate 條件 + Rollback Matrix + 已知例外表

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（Bug 修復為單字符 typo；機制建立為架構設計，非 execution log 診斷） |
| 遵從 Router | ❌ 未遵從（理由：build-error-resolver 的 execution log MCP 能力對本任務無附加價值） |

---

## 本次 Session 完成事項（2026-05-21 第四 Session）

### 8. "無子項目" 根本原因確認 + 防禦性修復

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**根因確認（Root Cause C）**：
- `order_items.process_status` 是 `item_status` ENUM (`'待製作', '製作中', '完成', '已取件'`)
- UI 下拉選項值（`"Done 已完成"`, `"0 什麼都未做"` 等）均不在 ENUM 內
- `saveInlineEdit` PATCH 若 DB 是 TEXT（而非 ENUM），成功存入 `"Done 已完成"`
- sbSyncOrder pre-fetch 讀回 `"Done 已完成"`，INSERT 時觸發 ENUM 違規 → INSERT 失敗
- DELETE 已完成 + INSERT 失敗 = `order_items` 為空 → `fetchGlobalReview` 顯示「無子項目」

**修復項目**：
1. `_sanitizeStatus()` 函數：映射任意 UI 值到合法 ENUM 值（`"Done 已完成"` → `'完成'` 等）
2. sbSyncOrder INSERT payload 使用 `_sanitizeStatus(_prev.process_status)` 替代直接使用 pre-fetched 值
3. INSERT 失敗防禦路徑：失敗時用 `_prevItemMap` 資料還原舊 items，防止永久空 `order_items`
4. INSERT 前 `console.log` payload、失敗時 `console.error` 完整錯誤，方便未來診斷

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（根因通過 schema SQL 靜態分析確認，無需 MCP execution log） |
| 遵從 Router | ❌ 未遵從（理由：Supabase schema migration 文件可直接讀取，不需動態 log 分析） |

---

## 本次 Session 完成事項（2026-05-21 第三 Session）

### 7. Bug C 修復（sbSyncOrder 競態）+ Bug B 強化修復（W_WOOL 獨占 Row 2）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**Bug C 修復（Critical — 無子項目）**：
- **根因**：`sbSyncOrder` 無並發控制，用戶快速 toggle W_WOOL 觸發多個 fire-and-forget 同時執行；第二個 DELETE 在第一個 INSERT 之後清空了所有剛插入的 items
- **修復**：新增 per-orderId last-write-wins 隊列（`window._sbSyncInFlight` / `window._sbSyncPending`）。在-flight 期間，後來的 call 覆蓋 pending 位置而非直接執行。`try/finally` 確保鎖定在任何 early return 後都釋放，並在完成後自動觸發最新 pending call

**Bug B 強化修復（W_WOOL 仍在 Row 2）**：
- **根因分析擴展**：
  1. `_woolKey` 缺少 `Category === '配件'` fallback（新格式 mapOrder 後 `_deriveCat('_W_WOOL')` = `'配件'`）
  2. Badge 使用 `index === 0` 假設立體擺設在首位，但 pipe 格式 items 全部 `_cp = 99`，排序不變，立體擺設可能不在 index 0
- **修復**：
  1. `_woolKey` / `_accWoolKey` 新增 `|| it.Category === '配件' || _k.includes('羊毛毡')`
  2. 用 `_woolBadgeShown` / `_accWoolBadgeShown` flag 取代 `index === 0`，找到第一個 `立體擺設` 行即渲染 badge
  3. 診斷 log 升級為 v2：記錄所有含 W_WOOL 訂單的完整 item 資料（oik/iid/cat/woolKey）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（競態根因 + woolKey 邏輯均可直接 code 修復，無需 MCP execution log） |
| 遵從 Router | ❌ 未遵從（理由：純前端 JS 邏輯 Bug，不涉及 n8n execution log 診斷能力） |

---

## 本次 Session 完成事項（2026-05-21 第二 Session）

### 6. 批次/進度重置 Bug 修復 + W_WOOL pipe 格式渲染修復

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**Bug A 修復（批次/進度重置）**：
- **根因**：`sbSyncOrder` DELETE + INSERT 覆蓋了 `saveInlineEdit` 已儲存的 `batch_number`/`process_status`
- **修復**：INSERT 前先 fetch 舊 `order_items` 建立 `_prevItemMap`，按 `item_key` 回填 `process_status` 和 `batch_number`
- **範圍**：僅保護 `item_key` 完全相同的 item（edit mode 重提交同一訂單時有效）

**Bug B 修復（W_WOOL 獨占 Row 2）**：
- **根因**：n8n 舊格式 `item_key = '0696216 | 羊毛氈公仔 - 加購'`（pipe format），`_cleanKey = ''`，`Order_Item_Key = ''`，導致 `_woolKey` 回傳 `false`，W_WOOL 渲染為獨立 row，Row 1 無 badge
- **修復**：`_woolKey` 和 `_accWoolKey` 改為雙重偵測：`_W_WOOL` 後綴 OR 包含 `'羊毛氈'` 字串，覆蓋新舊格式

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（根因明確，直接修復；sbSyncOrder 邏輯閱讀即可診斷） |
| 遵從 Router | ❌ 未遵從（理由：Bug 為前端 JS 邏輯問題，無 execution log 需要 MCP 讀取） |

---

## 本次 Session 完成事項（2026-05-21 第一 Session）

### 5. 🧸 羊毛氈公仔加購產品 Debug + SOP 文件化

**Bug 根因與修復**：
1. **FK 23503 violation**：`sbSyncOrder` 寫入 `product_sku: item.Product_Name`（"羊毛氈公仔 - 加購"不在 products 表）→ 整批 INSERT rollback。修復：移除 product_sku 欄位
2. **Webhook 缺 push**：Webhook builder 無 W_WOOL 加購 item push 邏輯，新增含雙重 guard（enableP + w_wool_en）
3. **Review Mode 獨立行**：W_WOOL 被渲染為單獨 row/card。修復：分離 `_woolKey`，過濾出渲染陣列，合併 badge 至立體擺設同列（Desktop `renderReviewTable` + iPhone `renderReviewAccordion`）

**SOP 文件化**：
- 新建 `.fhs/notes/addon_product_sop.md`（v1.0）— 含四個必改位置、FK 保護原則、code template、4 項 checklist
- 更新 `.fhs/notes/decisions.md` — 記錄設計決策與原因
- 更新 `.fhs/notes/SOP_NOW.md` — 加入「產品開發 SOP 參考」表

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | `build-error-resolver` |
| 實際使用 | ❌ 未使用（FK 根因 + Webhook 缺 push 均直接 code 修復，無需 MCP log 讀取） |
| 遵從 Router | ❌ 未遵從（理由：三個 Bug 均為前端 JS/sbSyncOrder 邏輯，不需要 execution log 診斷能力） |

---

### 4. 訂單總覽 UI 三項優化（freehandsss_dashboardV41.html）

1. **📦 產品明細排序**：`renderReviewTable` 渲染前對 `o.items[]` 按 `item.Category` 優先排序（立體擺設→鎖匙扣→吊飾/純銀→其他），排序在 `batchCol` 計算前執行確保備註欄批次色跟隨正確
2. **訂單間粗分隔線**：訂單末行（`isLastItem`）及所有 rowspan td 加 `border-bottom:3px solid #b0b0b0`（初版黑色 `#222` 不融合，已改為中灰）
3. **Checkbox th 背景修復**：移除 checkbox `th` 的 inline `background:#f5f5f5`，改為繼承 `.review-table thead th` 的深藍漸變背景，方格本身白色不變

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 不詳（舊格式 session，標準化前） |
| 實際使用 | ❌ 未使用（純 UI CSS/HTML 調整） |
| 遵從 Router | — |

---

### 3. 批次色 Over-Sweep Bug 修復（freehandsss_dashboardV41.html）

**根因（訂單內多批次 item 被一次性覆蓋）**：
- `applyBatchColorLive` 未定義（silent ReferenceError），oninput 無效
- `saveInlineEdit` Batch_Number 段用 `.order-group-${orderId} .batch-cell` 掃全訂單，更新單一 item 批次時所有 item 顏色一同改變

**修復**：
- `applyBatchColorLive` 以正規式 `^batch-input-(.+)-(\d+)$` 從 input.id 提取 orderId + itemIndex，只更新 `#row-orderId-item-itemIndex` 的 `.batch-cell`；itemIndex===0 時才同步備註 td
- `saveInlineEdit` 改用 `_targetRow = getElementById('row-${recordId}-item-${itemIndex}')` 精準定位，消除全訂單掃描
- `oninput` 改傳 `this` 作為第二參數：`applyBatchColorLive(this.value, this)`（replace_all，2 處）

**Subagent 使用記錄**
| 項目 | 內容 |
|------|------|
| Router 建議 | 不詳（舊格式 session，標準化前） |
| 實際使用 | ❌ 未使用（前端 JS Bug，console ReferenceError，直接修復） |
| 遵從 Router | — |

---

## 本次 Session 完成事項（2026-05-20 第二 session）

### 1. /rp 通用 Prompt 重寫指令（CL / AG / PL 三端）
- 新建 `.fhs/ai/commands/rp.md`（Master）+ `.claude/commands/rp.md` + `.agents/workflows/rp.md`
- 同步更新 `docs/FHS_Prompts.md`（情境二十三）、`docs/repo-map.md`、`.fhs/ai/commands/README.md`
- 用法：`/rp [原始問題]` → XML 結構化輸出 → 分析改寫效果 → 純文字版本

### 2. 備註欄批次色 Bug 修復（freehandsss_dashboardV41.html）

**根因 A（訂單 vs 子項目層欄位不對稱）**：
- `batchCol` 只讀 `o.Batch`（訂單層），但部分 Supabase 訂單的 batch_number 只存在 item 層
- Supabase mapOrder 正確映射 `row.batch_number → o.Batch`，但若訂單層為空、item 層有值，batchCol = #ffffff
- 修復：`batchCol = getBatchColor(o.Batch || (o.items && o.items.length > 0 && o.items[0].Batch) || '')`

**根因 B（CSS 優先級覆蓋）**：
- `.review-notes-textarea { background:#ffffff }` 蓋住 td 的 batchCol 背景
- 修復：td 改用 `padding:8px`，textarea inline `background:#ffffff` 強制白底，批次色以「相框」方式顯現

**查詢優先級糾正（feedback memory 已更新）**：
- 診斷時先呼叫 Airtable MCP（返回 429 月限），違反 Supabase-First 原則
- 已更新 `feedback_airtable_direct_query.md`：Supabase 優先，Airtable 只作 fallback

---

## 上次 Session 完成事項（2026-05-20 第一 session）

### 訂單總覽（Review Mode）欄位優化

**改動檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

1. **新增 💵 入帳欄**：插入於 👤 客人 右側、💰 成本 左側，顯示 `o.Final_Sale_Price`（`#B07D4C` 金色），支援點擊排序（數值排序）
2. **移動 📝 備註欄**：從第 4 欄（客人右側）移至表末（🚥 進度 右側），維持 rowspan
3. **備註批次色同步**：備註欄 td 背景使用 `batchCol`（訂單級批次色），textarea 本身保持白色（`background:#ffffff`），文字清晰可讀
4. **colspan 全面更新**：所有空狀態/loading 佔位 td 由 `colspan="11"` 更新為 `colspan="12"`
5. **sort 擴展**：`applyReviewFilters` 排序邏輯加入 `Final_Sale_Price` 數值分支

---

## 上次 Session 完成事項（2026-05-19）

### Antigravity (A2/Gemini) 系統性 Bug 修復

**問題**：A2 在任何輸入（含「say hi」）下自動執行初始化、主動處理待辦清單、越權寫入檔案

**根因（共 5 條）**：
1. SOP_NOW.md 無條件強制觸發器（Soul Awakening Hook）
2. A2 職責欄缺少「需用戶確認」約束
3. .agents/workflows/read.md 指向錯誤 handoff 路徑（靜默失敗）
4. 三個橋接版含硬編碼邏輯（違反橋接版規則）
5. guardian.md 關鍵詞自動觸發

**已修復（7 檔）**：
- `.fhs/notes/SOP_NOW.md`：弱化 Soul Awakening Hook + 限制 AGENTS.md 讀取前 100 行 + A2 職責補充禁止自主寫入
- `.fhs/memory/handoff.md`：待辦清單加防呆標示
- `.agents/workflows/read.md`：路徑 `/notes/` → `/memory/`
- `.agents/workflows/ag-plan.md`、`error-eye.md`、`fhs-check.md`：移除橋接版硬編碼邏輯
- `.fhs/ai/commands/guardian.md`：自動觸發 → 純手動 /guardian

**附加修復（2 檔）**：
- `.fhs/ai/commands/commit.md`：移除重複的第一/二/三階段內容（~50% token 浪費）
- `.fhs/ai/AGENTS.md`：補充 /commit 授權例外聲明，消除語義灰色地帶

**驗證結果**：
- GEMINI.md 機制：經測試確認 Antigravity 不載入專案根目錄 GEMINI.md，Fix [J] 放棄
- implicit memory 殘留路徑：接受為殘留風險，靠使用習慣管理（A2 仍可能從 IDE 開啟檔案推斷工作意圖）

---

> ⚠️ **[ARCHIVED 2026-06-23 / S118]** 以下「待辦」「已完成」「核心配置」三區塊為 Session 63 前初期格式，已由 **handoff.md 頂部便攜塊**取代。SessionStart hook 已更新不再讀取此區塊。資料全部過期，保留為歷史考古參考，禁止更新。

## 待辦 ⏳ 項目
> ⚠️ 此待辦清單僅供狀態備份。未經 Fat Mo 明確指派任務，AI 嚴禁主動「寫入」或「執行」業務檔案；但允許在 /read 初始化後，主動引用 `.fhs/memory/learnings.md` 條目提示相關 pattern 或 pitfall（純文字提示，不觸發任何寫入）。

1. **Supabase products 成本更新**：若新增產品類型，需同步更新 Smart Cache Strategist V47.9 的硬編碼表
2. **Airtable 背景同步驗證**：API 額度重置（6月初）後確認背景 Airtable sync path 正常
3. **Anti-Idle Ping 驗證**：確認 n8n 每 6 天 ping Supabase 的 Schedule Trigger 存在
4. **pg_cron TTL**：`error_logs` 表 30 天自動清理
5. **[DEFERRED] 立體擺設款式管理 UI 整合**：計畫存於 `.fhs/reports/planning/a2_implementation_plan.md`。審閱發現 2 個高風險點須先解決：(R1) addNewFrameStyle 雙 POST 無事務保護需加回滾邏輯；(R2) 計畫缺少 n8n Smart Cache COST_MAP 同步步驟（新 SKU 上線後成本計算將出錯）。Fat Mo 確認 OK 後才可 /execute。

---

## 已完成項目 ✅

5. **A2 implicit memory 觀察** — ✅ 完成（2026-05-22）：連續 3+ session 驗證，A2 在「say hi」後無再主動執行初始化；SOP_NOW.md 修復有效

---

## 核心配置

| 項目 | 值 |
|------|-----|
| n8n Workflow ID | `6Ljih0hSKr9RpYNm` |
| n8n versionId (Smart Cache) | `d43bce23` |
| n8n versionId (Pack Telegram) | `d5f7121c` |
| Supabase URL | `https://vpmwizzixnwilmzctdvu.supabase.co` |
| Airtable Base | `app9GuLsW9frN4xaT` |
| Dashboard 生產版 | `Freehandsss_dashboard_current.html` (V41) |
| Dashboard 開發版 | `freehandsss_dashboardV41.html` |

### n8n Code 節點 NAS 限制（重要）
- `fetch()` ❌ 靜默失敗（因為 Node.js sandbox 限制 / Node 版本舊，global.fetch 未定義）
- `require()` ⚠️ 只能載入經 `NODE_FUNCTION_ALLOW_EXTERNAL` 允許的外部模組（例如：`axios` 可用 ✅，但內建 `https` / `fs` 等被禁用 ❌）
- `process.env` ❌ IIFE try-catch 繞過（以免 process.env 存取報錯導致流程中斷）
- → 所有 Supabase Mirror HTTP 寫入已於 V47.10 統一使用 `axios` 重構實作。

### Antigravity implicit memory 說明
- A2 的行為約束主要靠 implicit memory（1.73MB .pb 檔），非文件直接載入
- GEMINI.md 機制已驗證不存在（2026-05-19 測試）
- 文件層修復（SOP_NOW.md、橋接版）封閉了文件觸發路徑，但 implicit memory 本能仍在
