# Decisions — 決策記錄
> 本文件記錄「為什麼這樣設計」，不是規則文件。
> 任何架構改動完成後，AI 必須在此補充一筆記錄。
> 格式：`[日期] 決策內容 — 原因`

[2026-07-04] docs/CHANGELOG.md 分岔複本刪除 — 確認無獨立價值

決策：另一 session 做記憶系統/治理層審視時意外發現 `docs/CHANGELOG.md`（298行，Session 63 建立）與根目錄 `Changelog.md`（4352行，持續更新至 S137）內容重疊但非同步——docs 版最後條目停在 S130 Phase B (2026-07-01)，S131-S137 六個 session 完全缺漏；frontmatter `last_updated: 2026-06-05` 甚至早於自己內文的 S130 條目，編輯紀律低。判定為過時分岔複本，非獨立用途摘要版。
執行：檢查 `docs/repo-map.md`、`README.md` 均無引用；唯一活引用為 `.fhs/ai/FHS_Product_Cost_Operations.md` Stage 4 計畫表（未執行草案），已改指向根目錄 `Changelog.md`。改動前備份於 `.fhs/reports/backups/docs_CHANGELOG.md.bak_20260704_150415`，經 Fat Mo 確認後 `git rm -f docs/CHANGELOG.md` 刪除；`docs/repo-map.md` 同步更新為 `[已刪除]` 標記。
驗證：`git status` 確認僅 1 檔刪除（D docs/CHANGELOG.md），無其他非預期變動；根目錄 `Changelog.md` 未受影響。

[2026-07-04] (Session 136) learnings.md 超量整理 — 59→49 條

決策：`.fhs/memory/learnings.md` 累積至 59 條，超過文件自訂 50 條上限（上次整理 Session 113 為 70→50）。執行退役 3 條 + 合併 4 組（節省 9 條）：退役「Smart Cache COST_MAP 遺漏」（已入 `/new-product` SOP 強制執行）、「單一配件 filter 假設」（已被 Pattern #6 `_isAddon()`/`_addonType()` 架構取代）、「generate() else 忘記清值」（窄範圍一次性 bug 已修復）；合併 ENUM cast+PostgREST 括號語法、SELECT/PATCH 未套用欄位+Migration 部分執行、focusin 清空+split auto-fill 污染、n8n POST/PUT 四欄限制+contentType raw+空陣列 guard+expression 禁鏈式（四合一）四組同主題條目；同時修正 Pitfalls 區塊因多次併發追加造成的編號亂序（曾出現重複 #22/#23/#24）。
驗證：`grep -cE "^[0-9]+\. "` 確認全檔 49 條數字編號項目，低於 50 條上限；退役/合併項目均以 📌 附註保留可追溯性（指向取代機制），未遺失任何知識內容。

[2026-07-04] (Session 136) IG 看門狗 Telegram 深連結 URL 修復 — 5006/web/ 401 → 公開網址 200

決策：Telegram 深連結驗收待辦（notify>0 才能測）在觸發前先做唯讀 curl 診斷，發現 n8n `Classify & Report` 節點硬編碼的深連結網址 `https://yanhei.synology.me:5006/web/Freehandsss_dashboard_current.html` 實測 HTTP 401（無法對外使用），而正式公開網址 `https://yanhei.synology.me/Freehandsss_dashboard_current.html` 實測 HTTP 200。判斷即使真的觸發警報，深連結也必然失效，屬於需立即修的真實 bug，非等待即可解決。
執行：`scripts/ig-watchdog/build_n8n_workflow.cjs` 單一真源改正網址常數；GET 現有 workflow → Python 字串替換 → PUT 精簡 body（name/nodes/connections/settings）部署至 `FHS_IGWatchdog_DriveWatch`（D4LK6VrQbiXlju0V）。
驗證：versionId `683ed8e5`→`05740bb4`，active=True；GET 回傳確認壞網址 0 次/正確網址 1 次；9 個 credential 節點（7 Drive+2 Telegram）完整保留；curl 對含 query string 的修正網址實測 HTTP 200。
備註：前端 deep-link 解析邏輯（V42 L7810-7815）本身正確，問題純粹是 n8n 端組出的網址錯誤；Telegram 深連結完整端到端驗收（真實觸發+人工點擊）仍待 notify>0 事件發生。

[2026-07-04] (Session 136) Phase B NAS 實機確認 — 簡化付款按鈕切換行為 PASS

決策：Fat Mo 於生產環境 NAS（`https://yanhei.synology.me/Freehandsss_dashboard_current.html`）親自實機操作驗收 S131 filledAny guard 修正（新訂單 auto-fill 填格後，簡化付款按鈕自動由「全部半訂」切換至「全部付清」）以及 S132 概覽篩選 UI 四項優化，結果 PASS。
驗證：人工實機操作驗收（非自動化測試），確認按鈕狀態切換符合 S131/S107 設計預期，無回歸。
備註：待辦剩餘 Telegram 深連結驗收（需實際 IG 看門狗 notify>0 觸發才能測，目前所有 Cron 執行均 notify=0）。

[2026-07-04] (Session 135) /upload-web 部署 S131+S132+S133 至 NAS — V42 升格 current

決策：執行 `/upload-web` 無參數升格流程，偵測最新開發版 `freehandsss_dashboardV42.html`，經 Fat Mo 二次確認後 cp 升格為 `Freehandsss_dashboard_current.html` 並上傳 NAS WebDAV。
驗證：三關全 PASS（HTTP 204 PUT / 大小 919,443 bytes remote=local / SHA256=`DCF266F11C961F865F3DC6F16A91F46CD89480EF744870697BAE02E78D2812C0`）。
備註：本次 SHA256/大小與 S130 合包部署記錄（`AC3C4C00...` 915065bytes）不同但與 S133 handoff 提及之先前上傳結果一致，代表 S131（filledAny guard）+S132（概覽篩選 UI）+S133（tg2 根因修復）三批變更已完整包含於這次部署的 V42 內容中，無需額外動作。
公開網址：https://yanhei.synology.me/Freehandsss_dashboard_current.html

[2026-07-03] (Session 134) Desktop App 平台收斂方向確認 — 收斂非除役

決策：FHS 主介面從 Antigravity → Claude Desktop App（Cowork + Code 雙模式），定性為「**收斂**」而非「遷移/除役」。
核心：Antigravity 與 Desktop App **技術上完全共存**——設定檔/skills 目錄/hook 系統各自獨立，`.fhs/` SSoT 雙邊皆可讀。
Antigravity 退為**永久備援**，無除役時間表；Phase 5 存檔步驟改為可選，由 Fat Mo 未來自主決定。
約束：禁止兩端同時對同一檔案寫入（工作習慣，非技術限制）。
執行依據：`artifacts/2026-07-03-0014/cl-final-plan-v2.md`（已更新至 v2.2）；等待 `/execute Phase 0`。
v2.2 追加（共存前提八維度重跑後三修正）：(1) **單一寫者矩陣**——`.fhs/memory+notes`/財務六檔/`.claude/skills` 唯一寫者=hook 守護側（Desktop Code/CLI），AG 只讀；緊急寫入須事後 git diff 覆核（AG 寫入不經 5 hook 守護）；`/read` 加 Synology 衝突副本掃描。(2) **Skills 凍結**——複製後 `.gemini/skills` 凍結為 AG 快照，`.claude/skills` 為活體 master，新技能只落 `.claude`，不做雙向同步。(3) **AG 備援守則入 AGENTS.md v1.5.0**——入場條件=Claude 生態故障/需 Gemini 視角。
v2.3 追加（Cursor 融入八維度分析，Fat Mo 選方案 A）：Cursor **條件式輕整合**——(1) C1–C3 探針前置，未證實安裝/實用前零配置（守 V0 紀律）；(2) **預設不建 `.cursor/mcp.json`**——Cursor 無 hook 守護，不發 n8n/Supabase 寫入鑰匙（同 AG 規約：無守護不拿寫入級工具）；(3) `.cursorrules` 改橋接模式指向 AGENTS.md（防第三規則源漂移）；(4) Cursor 定位=代碼編輯強化（inline 補全/多檔重構/diff 審查），一般代碼=Cursor 主場，治理/財務/生產檔 AI-agent 絕對禁寫；(5) 決策卡頂部一句 heuristic：「凡 AI 要寫治理/財務/生產檔→只准 hook 守護側，其他按順手選工具」。
**C1 探針結果（同日）：Cursor 未安裝、近期不用 → 2.5 整項擱置，零配置遺留**。設計保留為休眠藍圖（矩陣 Cursor 欄+決策卡行=純文件層預留），日後試用時從 C1 重新入場。當前焦點=Claude Desktop App + Antigravity 融合（Phase 2 核心）。

[2026-07-03] (Session 134 續) P10 三腦 API 實測結果——n8n 伺服器端無 Cloudflare 封鎖，原計劃假設過度保守

決策/發現：透過 n8n Public API（`.env` N8N_KEY）實際建立測試 workflow「3brain API Probe (P10 test)」（id `iTKmxBapcoJXSGLh`）驗證 Anthropic/OpenAI/Perplexity 三腦連線，**非紙上模擬**。
結果：三者皆從 n8n 伺服器端直連成功，**均未被 Cloudflare 指紋擋**——Perplexity 完整成功；Anthropic HTTP 400（信用額度不足，帳務問題非封鎖）；OpenAI HTTP 429（rate limit，非封鎖）。
**關鍵修正**：`cl-flow-runner.js` 需要 curl 繞過 Cloudflare 的問題，是**本機** Node.js/Python client 呼叫 Perplexity 時的指紋辨識，n8n 伺服器端 HTTP Request 節點是不同執行環境，不能一概而論——`fhs_n8n_3brain_spec.md` Pitfall 1 的 Execute Command+curl 備案目前不需啟用，保留作未來真遇到封鎖時的後備。
**副產物發現**：n8n 透過 API 建立的 webhook 節點需額外補 `webhookId`（UUID）欄位，且 API 啟動 workflow 不會自動註冊 webhook 路由，需在 n8n UI 手動存檔一次才生效——純 API `activate` 端點不觸發路由表更新，此為 n8n 本身行為特性，已記入 spec 供未來駁接參考。
待辦：Anthropic 帳號加值、OpenAI 額度確認後可重測完整成功案例；測試 workflow 已停用保留，credentials 保留供正式 3-brain workflow 沿用。
已更新：`fhs_v0_desktop_probe.md`（P10 結果區）、`fhs_n8n_3brain_spec.md`（§零 前提聲明改寫）。

[2026-07-03] (Session 134 續) n8n 三腦定位修正 + 正式 workflow 建立（規劃/草案型，非直寫代碼）

決策：Fat Mo 澄清「三腦在同一畫面工作」教學原意，修正先前口頭誤述——n8n 三腦**不是**「離開電腦的手機備用觸發」，而是 Fat Mo 坐在電腦前手動按 Execute、在 n8n 畫布上直接看三個 AI 節點依序接力的協作介面（教學：「4 步打造你的 AI 開發團隊」，Gemini 資料統整→Claude 主力工程師→ChatGPT QA 審查）。原 spec §一 節點圖 Trigger 本就把「手動」排第一位，設計方向無誤，僅口頭優先度定位講錯。
已建正式 workflow：「FHS AI 開發團隊（A2 Gemini→A3 Claude→A1 ChatGPT）」（id `cztGsFXZYtvBUDA6`），透過 n8n Public API 部署（同 P10 手法），Manual Trigger→Set 任務輸入→Code 組 Prompt→HTTP Gemini→Code 解析+組 Prompt→HTTP Claude→Code 解析+組 Prompt→HTTP ChatGPT→Code 組合最終成品，9 節點全鏈；credentials 沿用 P10 建立的 `3brain-anthropic`/`3brain-openai`，新增 `3brain-gemini`（Query Auth，Gemini API key 走 URL query）。
**刻意偏離教學原文兩處並經 Fat Mo 確認保留**：A3 Claude 不直接輸出可執行代碼（改輸出「實作草案」），A1 ChatGPT 不做字面 code review（改審草案風險/遺漏）——原因：若讓 API 端直接吐出可貼上即跑的代碼，等於三腦管道繞過 Desktop Code 分頁 5-hook 守護，牴觸 NO-TOUCH 硬約束與「A3 裁決權不外包給 API」既定治理原則。
Fat Mo 確認：此 workflow 定位＝規劃/草案型任務（非生產代碼直寫）；若未來需要教學原版「直寫代碼」用法，須**另建第二個 workflow**（僅限不碰 Dashboard/n8n/Supabase 的獨立小工具），不得修改本 workflow 安全邊界。
不寫檔案落地——Fat Mo 確認「n8n 畫布直接看就夠」，`artifacts/{flow_id}/` 檔案契約方案保留但未啟用（留待未來若改 Telegram 觸發時複用）。
狀態：workflow 已部署未執行——Anthropic 帳戶餘額 $0，等 Fat Mo 加值後首次觸發驗證。
已更新：`fhs_n8n_3brain_spec.md` §十 實作記錄（含完整教學對照表）。

[2026-07-04] (Session 134 續) n8n 三腦降級休眠藍圖——與 /cl-flow 對照後確認架構重疊

決策：逐項對照 `/cl-flow` 與 n8n 三腦後，Fat Mo 確認「想不出具體用途」→ n8n 三腦**降級為休眠藍圖**（比照 Cursor Phase 2.5 休眠模式）。
對照結論：FHS 系統相關任務 `/cl-flow` 全面勝出——裁決免費（走 Pro 訂閱）、直接落 repo、全套 hook 治理；n8n 三腦每步花 API 錢、無治理、產出仍須帶回 Desktop Code 分頁才算數。n8n 三腦唯一未被覆蓋的優勢＝排程/無人值守/非 FHS 外部任務，目前無此類具體需求。
處置：workflow「FHS AI 開發團隊」（id `cztGsFXZYtvBUDA6`）保留但停用，零成本；3 組 credentials（gemini/anthropic/openai）保留供未來沿用；不再投入時間優化；Phase 3.2/3.3 不再推進——本輪對照分析已實質達成「對等驗收」目的（結論：不對等，`/cl-flow` 更優，非技術缺陷而是架構定位重疊）。
Phase 3 至此收尾。

[2026-07-04] (Session 134 續) Phase 4 完成——AGENTS.md v1.5.0 + 指令族裁決，Desktop App 平台收斂計劃實質完成

決策：Phase 4.1-4.4 全數執行完畢。
(1) **4.1 對等驗收裁定**：不對等，`/cl-flow` 更優，機制維持現狀不變；記錄追加至 `cl-flow.md` 頂部。
(2) **4.2 指令族裁決**：`ag-flow`（改用 `/cl-flow`，AG 裁決需求請直開 Antigravity）、`ag-stitch-sync`／`ag-ui-import`（`ui-designer` subagent 已原生擁有 `mcp__magic__21st_magic_component_builder`，不需 Antigravity 橋接）三支標記 [DEPRECATED]（master + bridge 雙層皆註記，內容保留作歷史參考不刪除）；`ag-plan.md`（A2 規格源）不受影響。
(3) **4.3 AGENTS.md → v1.5.0**：新增 §1.2「平台定位與多工具共存治理」——Desktop App 主介面定位、三模式決策卡引用、單一寫者矩陣、CLI/VSCode 永久 fallback、AG 永久備援守則、Cursor 休眠藍圖定位、n8n 三腦休眠藍圖定位，一次性彙整本輪（S134）全部平台收斂決策至憲法層。
(4) **[F] FHS_Prompts.md 同步**：v1.7→v1.8，`compatible_with` 對齊 AGENTS v1.5.0；情境二十四（/ag-flow）加棄用標註改指 `/cl-flow`；情境七（Stitch UI 翻新協議）核查後確認為通用設計準則、非指令路由，不受影響、不需修改。
影響檔案：`AGENTS.md`、`docs/FHS_Prompts.md`、`.fhs/ai/commands/{ag-flow,ag-stitch-sync,ag-ui-import,cl-flow}.md`、`.claude/commands/{ag-flow,ag-stitch-sync,ag-ui-import}.md`。
**至此，Desktop App 平台收斂計劃（Flow ID 2026-07-03-0014）Phase 0-4 全數完成**，Phase 5（AG 存檔）維持可選、永不強制。執行依據 `cl-final-plan-v2.md`（v2.3）全部條款已落實。

[2026-06-26] (Session 124) S124 v2 加購鎖匙扣成本 N飾維度修復 — 雙根因消除 + 9單回填

決策：修復「加購鎖匙扣 subtotal_cost 無視 quantity（N飾）」雙根因：(a) products.total_base_cost 全 N飾 variant 存 flat 185/235，未按 item_per_set 縮放；(b) Finance Bible §G2 範例 stale（物料$95→$115）。
方案（七步）：
1. 線D: Finance Bible §G2 範例校正（物料$115，subtotal不含運費）
2. Migration 0045: CREATE fhs_compute_keychain_cost(material, qty, drawing_fee) — 單一成本真源 RPC
3. 線B: UPDATE products.total_base_cost = fhs_compute_keychain_cost(115, item_per_set, drawing_fee) — 41 rows
4. 線C: 9單歷史回填（UPDATE order_items 14行嬰兒鎖匙扣 + UPDATE orders 9行 + 9條 audit_logs）
5. n8n V47.18: Calculate Profit & Pack Items 注釋記錄語義確認（無功能改動）
6. finance-auditor: 三端對賬驗證
7. Migration 0046: fhs_check_product_cost_drift() N飾維度擴充
不變：final_sale_price / deposit / balance — 真理欄位全程未動；家庭(S2)1飾(加購)超出範圍保留原值275
影響：cost_configurations（讀取）、products（41行）、order_items（14行）、orders（9行）、audit_logs（9行）、n8n workflow V47.18、migrations 0045/0046

[2026-06-23] (Session 120) 鋁合金嬰兒層成本修正 — config key 補建 + products 錯值修正

決策：INSERT `material_cost_keychain_alloy` = 115 至 `cost_configurations`；UPDATE `products.total_base_cost`：嬰兒S型 $212→$185（20行）、嬰兒P型 $262→$245（20行）。
原因：config key `material_cost_keychain_alloy`（嬰兒/大寶層）從未建立，與 `material_cost_keychain_stainless`（$115）不對稱；products 原值 $212/$262 為手填 flat 數字，反推物料成本 $142/$132 不一致；Fat Mo 確認嬰兒鋁合金物料成本 = 嬰兒不銹鋼 = $115，正確總成本 $185（S）/ $245（P）。Live 查詢確認 order_items 零鋁合金嬰兒訂單，無既有訂單需回改。
影響：`cost_configurations`（INSERT 1行）、`products`（UPDATE 40行，嬰兒S/P鋁合金所有飾數變體）
[2026-06-23] (Session 118) handoff 交接機制 SSOT 化 — 修復三漏洞 + v2 雙深度便攜塊

決策：handoff.md 頂部新增唯一 ` ```handoff ` fenced 便攜塊（六類不可省略欄位：目標/決策/驗證/待辦/下一步/地雷），以 `─── 便攜邊界` 分隔線實現雙深度切片。hook 只抽動態段（邊界以上，~120 tokens），人類複製整塊（含靜態地雷段）。過期偵測：hook 比對塊頭 YYYY-MM-DD 與今日，不符印警告。SOP_NOW.md 版本格改指標（v2-C，不再自帶版本字串）。commit.md 加 P0.7 強制更新便攜塊（防腐）。
原因（三漏洞）：(1) hook `awk '/^## 待辦/'` 匹配 handoff.md 底部 line 3760 殭屍待辦（Session 63 以前，Anti-Idle/pg_cron 等已 S67/87 完成），真正「# MASTER 持續待辦」用單 `#` hook 永遠讀不到；(2) SOP_NOW 快照仍 V41，實際 S115 升格 V42；(3) handoff 底部核心配置表仍 V41 舊 versionId。v2 核心洞見：以「同一 fenced 塊同源」解決人類版/AI 版雙寫 drift 根因（PX 3.1 風險）；靠分層（動態/靜態分隔）同時達到 token 節約與外部貼用完整兩個對立目標。
影響檔案：scripts/hooks/session-start-sop.sh（v2）、.fhs/memory/handoff.md（頂部新增便攜塊+底部 ARCHIVE）、.fhs/notes/SOP_NOW.md（版本格改指標）、.fhs/ai/commands/commit.md（P0.7）、.fhs/memory/learnings.md（Pitfall #23）

[2026-06-23] (Session 116) cl-flow-runner API 雙修：Gemini 模型切換（.env）+ PX 改走 curl — 修復 /cl-flow 全模式不可用

決策：(1) Gemini A2「high demand」過載 → 依 Preference #6 改 `.env GEMINI_A2_MODEL_DEFAULT` 由 `gemini-3.5-flash` 切 `gemini-2.5-flash`（不改代碼，probe 確認 200/1s）；(2) PX A1「socket hang up」→ 將 `callPerplexity` 從 Node `https.request` 改走 **curl 子程序**（body 寫臨時檔 `--data @file`）。
原因：PX 端點前置 Cloudflare 對 client TLS/HTTP 指紋 fingerprinting，直接 reset Node https 與 python-urllib 連線（socket hang up / RemoteDisconnected），只放行 curl——與 reference memory「Supabase Management API 用 curl 非 urllib（觸 1010）」同一機制；`sonar-reasoning-pro` 長 `<think>` 階段靜默無數據流更易被 idle reset。直接 curl probe 三次皆 200，Node/urllib 三次皆斷，根因坐實。改 curl 後 FULL 模式 px-report.md（9436 bytes）正常產出。Gemini 模型切換走 .env 而非改代碼，符合「模型切換不改代碼」偏好，日後過載只需再換一個 model id。
影響檔案：`.env`（GEMINI_A2_MODEL_DEFAULT）、`scripts/cl-flow-runner.js`（callPerplexity 改 curl + 引入 spawnSync）

[2026-06-16] (Session 109) openOrderModal 加 initialTab 第三參數（選項 B）— 修復「核對帳單」捷徑落錯分頁

決策：給共用函式 `openOrderModal(orderId, catFilter)` 新增可選第三參數 `initialTab`，而非在 btnAudit 端串接 `openOrderModal(); switchModalTab('finance')`（選項 A）。
原因：第二參數 catFilter（'A'/'B'/undefined）控制標題與文本分段，語義與「分頁」正交；Session 103 誤把 'finance' 當第二參數導致捷徑永遠停在訊息文本分頁。選項 B 讓「開哪張單的哪段 × 開在哪個分頁」成為清楚的兩個正交參數，未來其他深連結（如直接開訂單明細）可重用 `initialTab`，比在每個呼叫端手動串 switchModalTab 更不易遺漏/競態。11 個既有呼叫點未帶第三參數，零回歸。
影響檔案：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（line 9385–9387 / 9467 / 14184）

[2026-06-16] (Session 106) P0 sysCheckN8n 雙軌修復 — 消除每次連線檢查消耗 2 次 Airtable API

決策：將 `sysCheckN8n()` 的 ping 目標從 `fetch-global-review?year=2099&month=01`（觸發 n8n FHS_Query_GlobalReview workflow → Airtable，+2 calls/次）改為：
1. `https://yanhei.synology.me:8443/healthz` — n8n 原生健康檢查，不觸發任何 workflow（0 AT calls）
2. `https://vpmwizzixnwilmzctdvu.supabase.co/rest/v1/` — Supabase REST ping（0 AT calls）
兩路 `Promise.all` 並行，顯示「n8n: 正常|異常 | Supabase: 正常|異常」，badge 三態：正常/部分/異常。
原因：官方 Airtable 後台顯示 6/16 已用 591/1000，按日均 37 calls/day 預測月底 ~1,109 — 超出上限。系統分析確認 sysCheckN8n 是真漏洞（每次用戶打開系統面板皆觸發），其餘 Airtable 殘留均為刻意設計（建單鏡像寫入、災難備援 fallback）。
影響檔案：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（line 7657–7684）

[2026-06-13] (Session 103) Audit Ledger ② 成本快照鏈 v2 修復 — 改用訂單層類別欄

決策：把 ② 成本快照鏈的資料來源從 `order_items` 四欄分解（91% 空）改為 `orders.handmodel/keychain/necklace_cost`（30/30 populated）。
架構決策：
1. **主結構改訂單層**：三類別欄作主顯示；四欄降為 Task A 未來補充欄（禁作成本主源）
2. **Problem E 誠實呈現**：多件鎖匙扣/吊飾單 catSum > total_cost（$20/$35 差額）→ 派生「運費共享扣減」對賬行
3. **待補錄雙態**：item 層全空 = 舊單藍色 info 條；部分有值 = 展示 subtotal 明細，無值格顯示「—（明細未記錄）」
4. **costMatch 廢除**：移除基於四欄的假紅旗；保留確收鏈 + 利潤驗算
5. **fetch 補全**：orders fetch 加 3 個類別欄；items fetch 加 subtotal_cost
影響檔案：`freehandsss_dashboardV42.html`（loadAuditLedger 2 處 fetch select + buildAuditLedgerHtml 計算重構 + CSS 新增 .fhsAudit_pendingNote）
原因：Session 102 實作依賴未完成的 Task A 四欄技術債，導致 91% 訂單顯示錯誤成本（例：06001007 木框顯示 $60 而非正確 $210）。診斷 3 輪 live Supabase 查詢後確認唯一可靠替代來源。

[2026-06-13] (Session 102) 訂單計算核對帳（Audit Ledger）— 嵌入既有「💰 財務」Tab

決策：在 `openOrderModal` 的「💰 財務」Tab 實作完整計算核對帳，取代舊的 8 行簡單摘要。
架構決策：
1. **嵌入位置**：複用既有 `fhsTabPane-finance` Tab（Phase 0 確認不需新 overlay/modal）
2. **Lazy-load 模式**：採 `loadMode2Items` 同一模式，首次點擊才 fetch，flag `_fhsAuditLoaded`
3. **資料來源雙 fetch**：`/orders?order_id=eq.{id}&select=n8n_adjustment_notes` + `/order_items?order_fhs_id=eq.{id}&select=...drawing_cost,printing_cost,chain_cost,shipping_cost,item_sale_price`
4. **不重演 G2/G3**：直接讀 DB 已存四分量（frontend calculatePricing 計算後 n8n pass-through 存入）
5. **三種金額身份**：確收（income棕 #B07D4C）/ 成本快照（cost紅 #E63946）/ 建議售價（muted灰）
6. **視覺規格**：ui-designer Phase A（Session 102）確立：雙底線會計結算線、規則 ID 藍標籤 `[G2]`、括號負數 `(−$xx)`
影響檔案：`freehandsss_dashboardV42.html`（CSS block, openOrderModal, switchModalTab, buildFinanceTabHtml, loadAuditLedger, buildAuditLedgerHtml — 6 處修改）
原因：Fat Mo 需要「操作員可手動核對計算邏輯」的稽核視圖，視覺體感為一級需求。

[2026-06-11] (Session 90) mixed_member_surcharge 歸零決策

決策：`cost_configurations.mixed_member_surcharge` 由 $300 改為 $0（豁免）。
原因：Fat Mo 審閱後決定暫不收取此附加費；觸發邏輯與 UI 顯示（+$0）保留，方便日後改回只需調 DB 值。
技術變更：
1. Supabase `cost_configurations` → `mixed_member_surcharge = '0'`
2. V42 HTML line 6041：`|| 300` → `?? 300`（修正 JS falsy 邏輯，0 不應 fallback 至 $300）
3. FHS_Pricing_Bible.md §2.2 + §10：記錄豁免狀態與觸發條件（`en_parent` 含父母「待定」時亦觸發）
守護：觸發條件不移除——恢復收費時改 config 值即可，無需改代碼。

[2026-06-11] (Session 90/91) item_sale_price 3-layer 混合訂單收入分攤方案

決策：引入 `order_items.item_sale_price` 欄位 + RPC 3-layer fallback，修正 B1 手模收入虛高問題。
原因：混合訂單（手模 + 鎖匙扣同張）的整張 `final_sale_price` 全部被算入手模收入，導致 KPI 膨脹 ~2.6×（$29,812 → 被計算為 $77,906）。
技術變更：
1. Migration 0037：`order_items` 加 `item_sale_price NUMERIC`；補填現有訂單的 `balanceSplitData`（balance + deposit 合計）
2. n8n Mirror Prep：每次入帳時 inline 解析 splitData → `item_sale_price`（含 sum validation ±$1 浮點容差）
3. Migration 0038：`get_financial_kpis` + `get_financial_charts` 改用 3-layer fallback：
   - Layer 1: `item_sale_price`（精確分帳）
   - Layer 2: `final_sale_price × handmodel_cost / total_cost`（成本比例）
   - Layer 3: `final_sale_price / item_count`（平均分保底）
4. V42 HTML：Finance tab `fo-data-quality-warn` div + `foUpdateKPI` JS 警示邏輯（17 張舊單缺精確分帳時顯示橙色提示）
驗收：hm_revenue $77,906 → $29,812；data_quality.avg_split_orders = 17（歷史預 V42 訂單）；V42 新單應 100% 有 item_sale_price。

[2026-06-12] (Session 99) Migration 0041 — F4 unconfirmed 雙計修復 + F3 trend 3-layer 口徑對齊

決策：
1. **F4**：`get_financial_kpis` previous 期 WHERE 移除 `OR o.confirmed_at IS NULL`。unconfirmed 單只計入 current，不再同時污染 previous 對比基準。
   影響：yearly/current previous 期消除 1 張 unconfirmed 單（-$5,680）；monthly previous 少 1 張（-$5,680）。
2. **F3**：`get_financial_charts` trend block 重構為 per-order eff_rev（先算 3-layer，再 GROUP BY 月份）。
   影響：category='metal' 趨勢圖各月值調低（混合單由全額 → 比例份額），與 KPI 口徑一致。
煙霧測試：PASS

[2026-06-12] (Session 99) Migration 0040 — Metal 混合單 3-layer + Charts deleted_at 守衛

決策：四項同步修復，打包為 migration 0040。
原因：
1. **F1 — Metal 混合單收入缺漏**：`get_financial_kpis` category='metal' 的 WHERE 含 `AND o.handmodel_cost = 0`，19 張混合單（含手模 + 鎖匙扣/頸鏈）被完全排除，缺漏約 $56,322（Layer 2 比例估算）。修法：鏡像 0038 handmodel 3-layer，current/previous 兩期移除守衛 + eff_rev 加 metal 3-layer 分支（Layer 1 item_sale_price / Layer 2 成本比例 / Layer 3 平均分）。
2. **F2 — get_financial_charts 缺 deleted_at IS NULL**：0036 只修了 kpis qty 子查詢，charts 整支函式從未補。5 個查詢塊（trend / category_revenue / handmodel_frame / handmodel_bottle / cost_breakdown）補 `AND deleted_at IS NULL`。
3. **data_quality 擴充**：新增 `metal_fallback_orders` + `metal_fallback_ids` 欄位，追蹤 metal 3-layer Layer 2/3 使用率。
4. **F8 — 補回 STABLE 修飾詞**：0038 重建時遺失，0040 補回。
驗收（before → after diff）：
- yearly_metal.revenue: $21,860 → $78,181.90（+$56,321.90）✓
- yearly_metal.orders: 7 → 25（+18 混合單）✓
- monthly_metal.revenue: $0 → $6,000（+$6,000）✓
- current_metal.revenue: $0 → $6,000（+$6,000）✓
- yearly_all.revenue: $107,820（不變）✓ — 總收入未膨脹
- data_quality.metal_fallback_orders: 16（yearly）— 16 張歷史混合單走 Layer 2 比例估算
煙霧測試：inline DO $$ PASS（metal_rev > 0 + metal_fallback_orders IS NOT NULL + charts not null + metal ≤ all）
待決策（0040 範圍外）：F3 trend 3-layer + F4 unconfirmed 雙計 → 0041（另行授權）；F5 B2 adjustment 語義；F6 0600903 性質。

[2026-06-11] (Session 90) B3 qty 子查詢補 deleted_at IS NULL 守衛

決策：Migration 0036 — `get_financial_kpis` 8 條 qty 子查詢（metal_qty + handmodel_qty，current + previous 各 4 條）補 `AND o.deleted_at IS NULL`。
原因：子查詢與主查詢口徑不一致，軟刪訂單的品項數量仍被計入，影響 per-unit 指標計算。
煙霧測試：PASS（frame + bottle 均 > 0）。

[2026-06-11] (Session 87) 立體擺設款式管理 UI DEFERRED 項正式關閉

決策：Fat Mo 選擇選項 A — 正式關閉此 DEFERRED 項。
原因：Session 67 已降級（R1 關閉），動態款式管理 UI 功能取消；R2（Smart Cache COST_MAP 同步）降格為新增 SKU 時的 SOP checklist 提醒（已錄入 learnings.md Pitfall #10 + /new-product Step 2.e），無需獨立任務追蹤。
影響：MASTER 待辦移除此項；新增款式流程維持「Fat Mo 告知 Claude Code → 1 行 `<option>` + Smart Cache COST_MAP 同步」。

[2026-06-10] (Session 83) 交貨期系統 v_delivery_reminders item-level filter + 雙向跳轉 UX

決策：
1. **Migration 0033** — v_delivery_reminders VIEW 加入 item-level 豁免條件：若訂單所有 order_items 均為「完成」或「已取件」，即使 orders.process_status 未改，VIEW 自動排除警告。
   原因：C1 規則禁止系統自動更改 orders.process_status；item 標完成是 Fat Mo 日常操作路徑，系統應自動豁免，無需強迫 Fat Mo 多一步更改訂單狀態。
2. **jumpToDlvCard / jumpToReviewOrder 雙向跳轉** — 訂單總覽徽章 → 設定頁 dlvStatsCard（對應顏色清單）；設定頁清單 ↗ → 訂單總覽（scroll + flash）。
   原因：Fat Mo 操作流：設定頁看到警告 → 跳至訂單確認 → 看訂單時想回設定頁查清單，兩個方向均需一鍵操作。
3. **_dlvAutoExpand flag 時序模式** — `switchMode('system')` 自動觸發 renderDeliveryStatsCard（50ms 後），跳轉前設 flag，renderDeliveryStatsCard 完成時消費。
   原因：async/await 無法控制 switchMode 內部 setTimeout；flag 是解決此類「render 後動作」時序問題的正確 FHS 模式。
陷阱記錄（mapOrder id vs _uuid）：mapOrder() 回傳 `o.id = row.order_id`（FHS string，如"06001008"），`o._uuid = Supabase UUID`。所有 DOM id、openOrderModal、jumpToReviewOrder 均用 FHS string。任何從 _dlvMap 傳 id 至 UI 的操作，必須用 `r.order_id`，不能用 `r.id`。

[2026-06-08] (Session 69) 新增 /upload-web 指令 — 一鍵部署 Dashboard 至 NAS Web Station

決策：建立 `/upload-web` 指令（Master + CL 橋接 + `scripts/upload-web.ps1`），以 WebDAV over HTTPS（`:5006` → `/web`）部署 Dashboard 並三關驗證（HTTP 200 + Content-Length + SHA256）。
原因：
1. 通道選擇——NAS 對外僅開 80/443/8443/5006；SSH(22)/SMB(445)/DSM(5000) 全封鎖。WebDAV(5006) 為唯一可程式化且已驗通的通道，優於對外開 SMB 的暴露面。
2. 腳本化而非純指令——封裝 curl PUT + 驗證，可重複呼叫、不靠 AI 每次重寫，降低人為錯誤。
3. 護欄——`current.html` 生產版需 `-Force` + 二次確認，防誤推；密碼僅存 gitignored `.env`，永不回顯/入庫。
4. 編碼坑記錄——`.ps1` 含中文須存 UTF-8 **with BOM**，否則 `powershell.exe`(5.1) 以本機編碼讀取會 garble 字串導致解析失敗；`curl -o $null` 在 PS 中展開為空字串會吞掉下一參數，須用 `-o NUL`。

[2026-06-07] (Session 67) Anti-Idle Ping 部署 — n8n 防閒置 Workflow

決策：建立獨立 n8n Workflow `FHS_Anti_Idle_Ping`（ID: `FxKHTDiYiUPnxvm6`），每 5 天 ping Supabase 一次。
原因：FHS 使用 Supabase Free Tier，7 天無 API 請求自動暫停。頻率選 5 天（非 6 天）以留安全邊際，避免時區/月份邊界引起誤差。
設計：Schedule Trigger `0 1 */5 * *` → HTTP GET `products?select=id&limit=1`（continueOnFail:true, fullResponse:true）→ IF statusCode 非 200-299 → Telegram 告警至 chat 7620524971。
Telegram credential：複用現有 "Telegram account"（ID: tSbXz97PKmdPpDNq）。

[2026-06-07] (Session 67) R1 關閉 — 立體擺設款式管理 UI 降級決策

決策：`addNewFrameStyle` 功能不實作。木框色款 / 底座顏色選項維持硬編碼於 HTML（`#woodStyle` / `#baseColor` select），按需由 Claude Code 直接加 `<option>`。
原因：款式新增頻率極低（預計 < 每季一次），建動態管理系統（migration + RPC + 動態渲染）的複雜度遠超收益。R1 風險（雙 POST 無事務保護）因功能不實作而自動消滅。
影響：零代碼改動；Fat Mo 需新增款式時直接告知 Claude Code，1 行 HTML 即可完成。

[2026-06-07] (Session 66) TD-P-chargedPositions 修復 — P_MAIN 排除 drawing cost 分支

決策：在 `calculatePricing()` 的 `else if (!item.isAccessory)` 條件加入 `&& item.Order_Item_Key !== "TEMP_P_MAIN"`，讓 TEMP_P_MAIN 不進入 K/M 畫圖費計算分支。
原因：P_MAIN 無 `PartDesc`（空字串），`_posKey = ""`，W1 chargedPositions 追蹤被跳過，P_MAIN 錯誤算出 `baseDrawing ≈ $60` 並累積至 `totalDrawingCost`；前端成本顯示虛高。P_MAIN 的 $210 成本由 n8n 從 Supabase `products.total_base_cost` 取得，前端不需重算。
影響：W1 pre-population 不變（仍正確防止 K/M 同部位雙收畫圖費）；`item.FatMoCost = 0` for P_MAIN。
改動點：`Freehandsss_Dashboard/freehandsss_dashboardV42.html` line 5733（1 行）。

[2026-06-07] (Session 65 補充) V42 正式成為開發基線

決策：下一個 session 起，所有開發改動一律在 `freehandsss_dashboardV42.html` 進行。V41 為當前穩定生產版本（current.html 指向），V42 為開發版。
原因：V42 已通過 code-reviewer G1–G8 Gate（Session 64），具備足夠品質作為開發基線。
晉升條件不變：V42 → current.html 仍需 V1–V11 手機測試全綠 + 桌面回歸 + Fat Mo 授權 + diff 審查。

[2026-06-07] (Session 65) migration 0030 — 立體擺設 products.total_base_cost 修正（$0 → $210）

決策：寫入 migration 0030_fix_3d_frame_base_costs.sql，UPDATE products.total_base_cost = 210 for all 4 立體擺設 SKUs（木框套裝 4肢/2肢、玻璃瓶套裝 4肢/2肢）。
原因：migration 0023 以 placeholder=0 seeded 4 個 SKU，`fhs_sync_products_from_config()` 不覆蓋立體擺設；Smart Cache 讀 0 → n8n handmodel_cost=0 → 所有立體擺設訂單成本少計 $210/單，財務數據不準確（用戶報告根因）。三重確認：Airtable Base_Costs（Drawing $60 + Printing $150 = $210）+ Supabase cost_configurations（material_cost_woodframe=210）+ V41 HTML 確認對話框（"立體擺設成本 $210 已計入"）。
改動點：supabase/migrations/0030_fix_3d_frame_base_costs.sql [NEW]；FHS_Pricing_Bible.md §6.2 補入立體擺設代表性數值（2 行 + 技術債 footnote）；learnings.md 新增 Pitfall 2026-06-07。
附帶發現（未修）：chargedPositions Set 不追蹤 P_MAIN 肢（PartDesc 空字串），混合訂單前端顯示可能雙計繪圖費 — Task A 範疇。
四分量收斂警告：migration 0030 後，P_MAIN 四分量送 Drawing=$60/Printing=$0，products.total_base_cost=210，delta=$150 觸發 n8nAdjustmentNotes 警告（非 zeroCostItems），不影響 Has_Cost_Error。

[2026-06-06] (Session 64) V42 開發版建立 + V41 凍結宣告

決策：建立 freehandsss_dashboardV42.html（從 V41 複製為基線，694,941 bytes）作為手機訂單總覽視覺觸控改造的開發版本。
V41 於 V42 開發期間正式凍結：任何 hotfix 若需回流，必須同步 cherry-pick 至 V42，不得直接改 V41。
V42 晉升 current.html 門檻：手機 V1–V11 驗證清單全綠 + 桌面回歸通過 + Fat Mo 授權 + diff 審查，缺一不可。
改動點：Freehandsss_Dashboard/freehandsss_dashboardV42.html [NEW]；repo-map.md 補 V41/V42 條目。

[2026-06-05] (Session 62) FHS_Pricing_Bible.md 搬移至 .fhs/ai/

決策：將 `FHS_Pricing_Bible.md`（L2 定價聖經）從 `.fhs/notes/` 搬移至 `.fhs/ai/`。
原因：L2b 定價文件的架構語義與 L1 Finance Bible 同屬 AI 行為授權文件層，應並排於 `.fhs/ai/`，而非混入 notes 筆記層。
改動點：新路徑 `.fhs/ai/FHS_Pricing_Bible.md`；舊路徑 `.fhs/notes/FHS_Pricing_Bible.md` 已刪除。
更新引用：FHS_Finance_Bible.md / AGENTS.md / FHS_Prompts.md / repo-map.md / finance-gatekeeper/SKILL.md / FHS_Product_Bible_V3.7.md 共 6 個檔案。
finance-gatekeeper/SKILL.md §五技術債備忘中的 Pricing Bible 位置不一致條目已移除（技術債清償）。

[2026-06-05] (Session 60) Task A 四分量後台記帳 — 前端透傳策略採用

決策：四分量（drawing/printing/chain/shipping_cost）由前端 calculatePricing() 算好後透傳，n8n 接收並寫入 order_items。
原因：(1) cost_configurations 原子成本已在前幾個 Phase 建好；(2) calculatePricing() 已從 Supabase 讀原子成本計算四分量；
(3) n8n 拿不到部位級資料，無法重算 drawing 豁免邏輯（最高頻財務雷）；
(4) 此策略等同正式啟動「n8n 信任前端成本分量」——與「收款確收守護」不衝的。
「products.total_base_cost 改 roll-up」列 Deferred，本期只接通最後一條傳遞路線。
改動點：V41 HTML calculatePricing()/payload，n8n Parse Items/Calculate Profit/Supabase Mirror Prep，migration 0028 RPC。
⚠️ migration 0028 需 Fat Mo 在 Supabase SQL Editor 執行後生效。

[2026-06-03] (Session 57) B2 範疇修正 — 四分量歸 Task A，B2 收尾為 TRANSITION 標示

決策：B2 範疇從「前端傳四分量 → n8n 信任回寫」修正為「TRANSITION 標示收尾 + 四分量移交 Task A」。
原因：Finance Bible §一職責分工確立成本側由 n8n 計算（非前端傳入），「n8n 信任前端成本」違反 Rule 3.16。
四分量拆解（drawing/printing/chain/shipping per-item）本質是 Task A 顆粒化 roll-up 的一部分，
在 migration 0023 偽顆粒地基上重算位置規則會製造第二套 G2/G3/G4 邏輯，drift 風險高。
執行項：V41 TRANSITION 標示更新（橘字警告→中性灰色估算提示）；migration 0027 檔頭正名為 Task A 資產；
per-item 拆行規範（Q1 chain 奇偶、Q2 shipping 毛值）寫入 Task A handoff。
current.html 同步待 Fat Mo 授權 `/execute` 後執行。

---

[2026-06-03] (Session 55) B1 成本引擎驗證與跨產品免畫圖費 Bug 修復

決策：修復 `calculatePricing()` 中 `chargedPositions` 沒有自動寫入主商品套裝肢體部位的 Bug。現在當 `enableP` 為 true 時，主套裝中選擇的肢體部位（非「無」者）會自動被加入已畫圖部位追蹤。
原因：此 Bug 導致加購鎖匙扣/吊飾部位在主套裝中已選時仍被重複收取畫圖費，使得自動化驗證 V1 計價出現 $575 而非預期標靶 $455。修正後 V1 ($455)、V2 ($1335) 及 B1 標籤全數通過自動化驗證，並已同步更新 `current.html`。

[2026-06-03] (Session 54) B1 成本引擎補完 — calculatePricing() 成本公式達到 Finance Bible 完整定義

決策：補入 calculatePricing() 三個缺失分量（打印費 Printing、基礎運費 BaseShipping、鎖匙扣環扣 KeychainClasp），公式改為 Drawing+Printing+NecklaceChain+KeychainClasp+BaseShipping−ShippingDeduction。
關鍵發現：Phase 0 查證確認 n8n 完全不讀 System_Total_Cost（讀 per-item Total_Base_Cost），B1 = 純前端顯示層，零回寫風險。
B1/B2 邊界：前端顯示校正 = B1；n8n 信任前端+四分量 payload+三端一致 = B2（待 Live 驗證後啟動）。
material_cost_* 命名語義（= 打印費）deferred 至 PRM v2 P2 命名規範設計。
文件修正：FHS_Product_Cost_Schema_v2.md 移除錯誤的 `clasp_cost` config_key 行（原為 Airtable per-product column）；key 數 21→23。
decisions.md 生效日記錄：material_cost_necklace_silver/gold 由 0→260/316，自 2026-06-03 起反映實際打印成本；跨期財務分析需分段看待。

---

[2026-06-02] (Session 52) Finance Bible G1–G6 成本規則修正 — 位置依賴成本邏輯首次正式落盤

決策：將 Fat Mo 多次口頭說明但從未記錄的鎖匙扣/吊飾成本計算規則，正式寫入 Finance Bible v1.2.0。
核心修正：① 運費扣減公式改為總件數（非行數）② 同部位首件含畫圖第2件免畫圖 ③ 吊飾頸鏈奇偶規則 ④ Clasp=頸鏈$100。
原因：規則未落盤導致每 session AI 重新算錯，屬財務核心嚴重錯誤。
後效：learnings.md 補4條 pitfall；持久記憶已固化；PRM 路線圖啟動（P0完成，P1待下 session）。

---

[2026-06-01] (Session 51) Obsidian 整合架構決策 — D1 vault 範圍 + D2 三層記憶職責邊界

> ⚠️ **2026-07-04（Session 137）後續更新**：D1 的「`.fhs/` 對 Obsidian 永遠不可見」已被推翻——實測 `hidden-folders-access` 外掛可讓 `.fhs/` 正常索引（含大檔/多檔皆無效能問題）。D2 的三層職責邊界**維持不變**（Notion 人類真相源、AI 唯一寫入 `.fhs/memory`），僅 D1 的技術限制段落過時。詳見本檔下方 2026-07-04 條目與 [[00_INDEX]]。

決策：

**D1：Vault 範圍 = repo root (freehandsss_dashboard/)**
- 保持根 .obsidian/ 配置（Phase 0 已 commit，不回頭）
- 理由：docs/FHS_Blueprint.md 等核心知識文件需在 Obsidian Graph 可視範圍內
- ⚠️ 已知平台限制（不可配置）：Obsidian 預設隱藏所有 dot-directory（.fhs/、.claude/、.agents/ 等），.fhs/ 整層對 Obsidian 永遠不可見；Obsidian Graph 只能顯示 docs/ 及根目錄的 .md 文件
- MOC hub 必須放在 docs/（非 .fhs/），否則 Obsidian 看不到
- repomix ignore 已設 .obsidian/（AI token 邊界確立，不可回退）
- .gitignore 已排除 workspace*.json + graph.json（機器特定，非協作層）

**D2：三層記憶職責邊界**
| 層 | 寫入責任 | 衝突優先級 | AI 存取 |
|---|---------|-----------|---------|
| Notion（雲端 SSoT） | Fat Mo 手動 + AI via Sync_Notion_Brain.js | 最高（人類真相源） | 唯寫（腳本），不直接讀 |
| Obsidian（本地視覺化） | Fat Mo 手動建立筆記 | 不參與衝突解析 | **永不寫入**（視覺層） |
| .fhs/memory（AI 工作記憶） | AI 唯一（handoff/learnings/lessons） | 最低（working memory，可過期） | 讀+寫（AI 主要操作層） |

衝突規則：.fhs/memory 衝突 Notion → Notion 為準；Obsidian .md 不參與衝突解析（非授權來源）。
AI 存取邊界：AI 讀取 .fhs/memory/ + .fhs/notes/ + docs/（via repomix）；AI 永不讀取或寫入 .obsidian/ 配置及 Obsidian 專屬筆記位置。

原因：docs/ 知識文件為核心業務知識（Product Bible / Blueprint），Obsidian 作視覺圖譜需能看見全域知識層；三層職責清晰切割防止記憶碎片化（AI 只維護 .fhs/memory，不污染 Obsidian 或 Notion 直接存取）

***

[2026-05-31] (Session 50) 財務三層顆粒化成本架構：方向裁定 + A/B 分流

決策：
- **採納 Fat Mo 三層顆粒化邏輯**（base_cost → total_base_cost roll-up → 客人實境結合）；標準 BOM bottom-up costing，方向正確
- **判定病灶**：現行 `products.total_base_cost`（migration 0023 硬編碼 flat 值）為「偽顆粒」，與 Finance_Bible/pricing_reference 聲稱的「Drawing+Printing+Clasp+Shipping 累加」不符 → Fat Mo 直覺「根基不健全」成立
- **執行分流**：B（財務知識守門員）先行 → A（三層架構落實）移新 session（B 是 A 維護地基；token 限制）
- **A 接盤包**：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`
- **硬約束**：禁 Postgres trigger/generated column 重算成本；Layer 2 歷史快照不可變

原因：無單一真相源（3 份文件並列宣稱權威），A 改完仍會「被忘記」；故先建 B 地基

***

[2026-05-30] Phase 2 指令精簡 — vendor 技能方法論移植至 subagent + 刪 7 冗餘 command

決策：
- **設計錯誤修正**：2026-05-09 從 superpowers + awesome-cc 導入的技能被包裝成 slash command（用戶觸發），設計意圖應為 AI 自動執行；本次修正包裝層
- **方法論移植**：systematic-debugging（4 階段根因法）+ five-whys → build-error-resolver subagent；code-analysis 5 維度 → code-reviewer subagent（sequential-thinking 工具）
- **Rule 3.15**：遇 bug/錯誤必先根因調查，禁在根因確認前提修復方案；財務欄位豁免
- **刪除 7 command**：px-plan / px-audit / five / debug-guide / code-analysis / mermaid / tdd-guide（指令）
- **保留不動**：rg / db-query / error-eye / fhs-check / fhs-audit / guardian / fhs-cost-audit / ag-stitch-sync / ag-ui-import（各有獨立用途）
- **速查表**：README.md 改寫為場景索引，解決「用時想不起用哪個」痛點

***

[2026-05-30] Phase 1 指令精簡 — 刪 rp-flow，精煉內建，新建 ag-flow

決策：
- **精煉內建**：/rp 精煉為 cl-flow / cl-flow-fast / ag-flow 的預設 Step 0，不可跳過，不需手動呼叫
- **命名邏輯**：指令名 = 最終裁決者（cl-flow=Claude / ag-flow=AG / rp=只精煉不裁決）
- **刪除 rp-flow 三兄弟**：純包裝糖，今天才建，依賴 cl-flow 地基，地基已吸收功能後包裝層冗餘
- **ag-flow 取代 rp-flow-ag**：PX+AG 管道、AG 裁決、精煉內建，語義更直白

***

[2026-05-30] /rp-flow 精煉管道串聯 v1.0.0 — 四變體/Gate/批評移位/反奉承內建

決策：
- **批評移至最終輸出層**：/rp 初步無參照物，強制批評等於表演；verdict_critique / plan_critique 在 Verdict/ag-plan 產出後才有真實缺陷可批評
- **Gate 1 強制停（非 timeout 自動繼續）**：Gate 1 的目的是防止錯方向浪費 cl-flow token，強制停比 timeout 更有效；Gate 2 僅 --review 變體，避免讓「全自動」名不符實
- **/rp-flow-ag = A1+A2（ag-plan 為裁決）**：ag-plan 收到 PX 研究後直接出方案，Fat Mo 自行判斷，跳過 A3 Claude 合成層；適合任務清晰、信任 ag-plan 輸出的場景
- **反奉承守則內建**：用戶每次輸「不奉承」是設計缺口，守則寫入 rp.md 永遠生效
- **資源目錄靜態快照**：subagent_skill 維度從目錄對號入座，不依賴 AI session context 猜測

***

[2026-05-30] /rp 指令升級 v2.2 — 三變體/8維度掃描/Pipe模式

決策：
- **Pipe 模式 vs Exempt 衝突**：Exempt 禁的是 AI 主動建議，用戶明確輸入 `/rp cl-flow` 屬用戶最高授權，語義不同，允許。Pipe 模式發生在 cl-flow A1 研究之前，職責不重疊。
- **8 維度掃描用「清單 + 地板」**：8 維度每次必點名（不遺忘），但 conflict/token/history 三維設強制地板（可用 [強制·低] 逃生門），其餘可 N/A。避免全強制導致 token 違反 Rule 3.11。
- **移除純文字版**：Fat Mo 明確要 XML 供審閱，純文字版是重複輸出，對 PL 另設 Markdown 格式。
- **自我批評封頂 ≤3×1行**：防止 overhead，fast 變體跳過以符合輕量定位。
- **FHS 自動注入層**：5 個關鍵詞觸發固定系統前提注入，減少 Fat Mo 手填 context 負擔。

***

[2026-05-30] `_buildSplitIgLine` pureNumeric 參數設計（flow 2026-05-30-1248）

決策：
- **加第 4 參數而非分叉函式**：`_buildSplitIgLine` 被 v1/v2 共 4 處呼叫，若分叉為兩函式須改 4 處呼叫端 + 維護兩版本。參數化只需在函式本體加分支、v2 呼叫端傳 `true`，v1 不傳即維持舊行為，改動最小（C2 原則）。
- **保留 `=$總和`（多格時）**：純數字 `2380+860+100=$3240` 兼顧簡潔與對帳可讀性；Q1 架構裁決：顯示與 payload 同一管線，不可只改顯示。
- **需求③ defer**：`saveOrderText` 是 Review Mode 專用 PATCH（需既有 order_id），新單無 Supabase row 不適用；保留 Review Mode 為唯一文字編輯入口，避免兩套編輯 UI 維護負擔。

***

## 記錄

[2026-05-30] IG 訊息預覽 Modal — 架構決策（flow 2026-05-30-0240）

決策：
- **`output-preview-a/b` textarea 隱藏不移除**：兩個 textarea 同時是顯示層與 payload 資料源（L6025–6026 `Full_Order_Text` 讀其 `.value`）。只把外層 `preview-card` 隱藏，textarea 留 DOM，live-update 邏輯照常寫入。移除即導致同步出空訂單（C1 致命風險）。
- **Modal 讀 textarea `.value`（不另建格式化邏輯）**：保證 Modal 顯示與 payload 內容 bit-by-bit 一致（PX 風險1），無需維護第二套格式化管線。
- **「複製並同步」純複用 `copyMessageA/B + syncToAirtable`**：零新寫入路徑，不引入雙寫競態（PX 風險3），沿用既有 banner + 輪詢反饋機制。
- **技術債標記（V42 Gate）**：`output-preview` 顯示層兼資料層耦合屬技術債。觸發解耦條件：當需支援 Category C **或** Supabase SSoT 正式翻轉啟動時，payload 改讀 captureFormState/結構化資料，textarea 轉為純顯示。

[2026-05-29] Category A IG 訊息雙版本格式 — 架構決策

決策：
- **版本切換用 flag + localStorage，非分支兩個 HTML**：以 `igFormatVersionA`（v1/v2）單一 flag 控制，原版邏輯逐字保留於 `buildCategoryA_v1()`，可一鍵還原。原因：避免維護兩份 HTML、保留隨時切回原版能力。
- **v2 不修改共用 custInfo/finInfo/disclaimer**：這三區塊 Category A、B 共用。v2 改為在 build 函式內自建 A 專屬區塊，確保 Category B 輸出 100% 不受影響。原因：硬隔離，防止改 A 波及 B。
- **不改 formatBabyLimbs() / formatLimbs()，另建 inline 版**：原函式回傳含【嬰兒】header 多行格式，Review/還原可能依賴。v2 另建 `formatBabyLimbsInline()` 回傳「二手二腳（色）」單行。原因：避免動到既有渲染依賴。
- **付款拆行 / 未付尾數計算式 defer**：v2 範例需兩行付款 + 加數式，但現有表單無對應欄位。Fat Mo 決定下 session 優化設定後再處理，本次 v2 維持單行純數字。原因：避免提前新增 input 影響 captureFormState 與 n8n payload。
- **日期沿用 YYYY/MM/DD**：v2 只改前綴 `*倒模日期時間:`，不轉 16/4 10:30 風格。原因：零轉換風險。

[2026-05-28] 財務設定 Schema v2.1 — 架構決策

決策：
- **加購配件 α 方案（addon → products 表）**：羊毛氈 / 燈飾 SKU 存 products.total_base_cost，解除舊 FK violation 風險，所有成本從同一表查。
- **display_group γ 方案（schema-time 固定）**：6 個分組值以 CHECK constraint 寫入，不透過 RPC 傳入，避免 fhs_upsert_cost_config 需改介面。
- **樂觀鎖 SELECT FOR UPDATE**：替代 SELECT + ON CONFLICT 兩步方案，消除 TOCTOU 競爭。保留 3-param 舊簽名重載向後相容。
- **fhs_sync_products_from_config GRANT TO service_role**：此 RPC 寫 products，不應開放 anon。前端不直接呼叫，由 batch recalc 前置觸發。
- **v1 key 重命名遷移（不 DELETE）**：wool_felt_addon_cost → addon_cost_wool_felt 等，保留歷史記錄，只改名不砍。
- **β 混型訂單 Phase 2 defer**：成人P + 嬰兒S 組合成本計算複雜度高，目前由 Fat Mo 手動調整 net_profit，Phase 2 才建模。
- **衝突 Modal 雙選項**：「重新載入 / 強制覆寫」，解決同裝置雙分頁死鎖問題（只有重載會形成無限循環）。

原因：
- 三份 subagent 審計（database-reviewer / ui-designer / code-reviewer）發現 8 個 Critical，均已修補後才進入 Stage 3。
- 直觀管理原則（Fat Mo 需求）：所有產品成本單一查詢位置（products 表），不跨表。

批准：Fat Mo ✅（/execute → 「go」2026-05-28 Session 37）

---

[2026-05-27] 編輯系統 v2 雙模式重構 — 架構決策

決策：
- **Mode 1 保留（文本快照編輯）**：`saveOrderText` 不改行為；`is_text_overridden = true` flag 防止 n8n 下次 sync 覆蓋手動文本。
- **Mode 2 新增（order_items 結構化編輯）**：`save_structured_order_items` RPC（SECURITY DEFINER）原子化 DELETE+INSERT；完成後清除 `is_text_overridden = false`，重新開放 n8n regeneration。
- **n8n guard 落 DB 層（migration 0018）而非 Code Node**：NAS n8n Code Node 不支援 `fetch()`（P6），guard 寫在 `sync_order_to_mirror` ON CONFLICT CASE WHEN，不受 sandbox 限制。
- **Dirty-diff 去重**：`_hashMode2()` 字串 hash 比對，hash 相同禁止 POST，節省 DB write 和 token。
- **Lazy-load（`_fhsMode2Loaded` flag）**：Mode 2 items 只在 tab 首次點擊時 fetch，避免每次開 modal 多一次 DB 讀。
- **`_prevItemMap` 保護（Session 6 Bug A 模式複用）**：DELETE 前快照 `batch_number`/`process_status`，COALESCE 還原；保護既有批次資料不被 Mode 2 save 清空。
- **V47.11 節點重命名 + jsCode 備注**：本地 JSON 備份更新；實際保護在 DB 層（migration 0018）。
- **Mobile bottom sheet（`@media max-width:768px`）**：`align-items:flex-end` + `border-radius:16px 16px 0 0`，直接 CSS 不加 JS resize 邏輯。
- **code-reviewer gate G1–G10**：G3a（RPC return 缺 `full_order_text`）審查中發現，已修復。

原因：
- **Root bug**：`saveOrderText` → `orders.full_order_text` only；總覽刻字讀 `order_items.engraving_text` → 兩表不同步，Mode 2 解決從源頭改 `order_items`。
- **NAS限制**：fetch/process.env 在 n8n Code Node 靜默失敗，DB-level guard 是唯一可靠方案。
- **單人系統**：無多用戶競爭，客戶端 `_sbSyncInFlight` 鎖已足夠（不需 DB-level lock）。
- **Sunset path**：Mode 2 為 v3.0 materialized view 鋪路（v3 計畫見 `.fhs/reports/planning/v3_materialized_view_plan.md`）。

批准：Fat Mo ✅（/execute 2026-05-27 Session 32）

***

[2026-05-27] PGC-ODAT v3 Lite 架構決策 — 訂單總覽子項目成本與利潤稽核（折中方案）

決策：
- **採折中方案（v2 + v3.A 對賬 modal）**，不採 v3 全升級。
- **v2 核心**：preload `products` 表（sku/suggested_price/cost，~490 筆，flat Map 結構）至全域 `fhsSuggestedPriceMap`，cache TTL 30 min；CSS class toggle（`body.fhs-audit-on`）切換顯示，不重 render；Desktop 財務子列 + Mobile 💰 per-item drawer。
- **v3.A 對賬 modal**：每行項目右側加 💡 icon，點擊展開 modal 顯示「SKU建議價 / 實付推估 / 可能差異原因 candidates」，即時計算，不固化欄位。
- **捨棄 v3.B（nested Map）**：products 表當前無 `tier_json`/`effective_date`，YAGNI 原則，未來需要時再改（5 分鐘工作）。
- **捨棄 v3.C（Hybrid sync / Supabase user_preferences）**：單人系統，多裝置 toggle 不一致不是痛點；引入新表增加複雜度與失敗路徑，不值得。
- **Phase 1 策略（漸進三階段）**：Phase 1 = SKU 建議價/利潤 + 免責註腳（不含整單優惠/折讓）；Phase 2 = 實付分攤欄（系統折扣規則完善後）；Phase 3 = 差異欄 + 自動歸因。
- **開發版原則**：所有改動在 `freehandsss_dashboardV41.html`，驗收後由 Fat Mo /execute 授權同步 current。

原因：
- **C 過度設計**：Fat Mo 為單人操作，localStorage 已滿足跨 session toggle 持久化需求。
- **B 超前設計**：products 表結構在可見未來無 tier/effective_date，nested Map 為假設需求付出真實複雜度。
- **A 解真實痛點**：系統未完善期間實付 ≠ SKU建議價的差異原因眾多（舊客優惠/手工折讓/Tier），對賬 modal 以「候選原因清單」方式呈現，不強行計算攤分，符合「系統未完善 → 漸進改善」的現實。

批准：Fat Mo ✅（2026-05-27 確認折中方案）

***

[2026-05-22] Order_ID Rename Race Condition 根治 — AG 架構分析 + Migration 0011 落地

決策：
- **架構性 timing bug**：`responseMode: "onReceived"` 導致前端 sbSyncOrder 在 n8n rename RPC 前到達，造成 409。修復層選擇在資料庫（merge-on-collision）而非更改 n8n responseMode（影響 UX）。
- **Migration 0011**：`rename_order_id` 升版，加入 `FOR UPDATE` row-level lock（防止 concurrent deadlock）、merge-on-collision 邏輯（若兩者同時存在則合併關鍵欄位並刪除舊 ghost row）、SECURITY DEFINER（anon/service_role 均可呼叫）、冪等（重複呼叫安全）。
- **Frontend V41.2**：`effectiveOrderId = New_Order_ID || orderId`，sbSyncOrder 所有 Supabase 操作改用 effectiveOrderId；pre-fetch 保留 product_sku 避免 FK 23503。
- **知識沉澱**：race condition pattern 寫入 `build-error-resolver.md`，未來相似問題可直接索引。

原因：n8n responseMode 架構問題無法從程式碼審查發現，需要 AG 跨層分析；資料庫層修復比 workflow 層修復更穩健（不影響響應速度，且可冪等重試）。

批准：Fat Mo ✅（AG 方案 + /execute 授權 2026-05-22）

***

[2026-05-22] Order_ID 修改功能三端修復 — Frontend + Supabase + n8n

決策：
- **Frontend `New_Order_ID` 欄位**：edit mode 下 payload 新增 `New_Order_ID`（currentOrderId），`Order_ID` 保持 editTargetOrderId（WHERE clause anchor 不變）。`editTargetOrderId` 不在 `onIdInputBlur()` 更新，保持不可變，避免邏輯矛盾。
- **Supabase migration 0010**：`order_items.order_fhs_id` FK 加 `ON UPDATE CASCADE`；新建 `rename_order_id(old_id, new_id)` RPC，在一個 transaction 內先更新 item_key prefix，再更新 orders.order_id（CASCADE 自動更新 order_fhs_id）。
- **n8n Mirror_to_Supabase V47.7**：偵測 `New_Order_ID`，若存在則先調用 RPC，RPC 完成後 `orderId` 改為新值，後續 orders/order_items upsert 用新 ID。`process_status` / `batch_number` 在 RPC 內完全不觸碰。

原因：Order_ID 是 orders 表的 unique key（非 UUID PK），order_items 有 FK 指向它。直接 PATCH 觸發 FK violation；delete + reinsert 會清空製作進度；item_key 含 order_id prefix，ON UPDATE CASCADE 不會自動修復，需 RPC 顯式更新。

批准：Fat Mo ✅（2026-05-22 授權執行）

***

[2026-05-21] Subagent 稽核機制新增 — execute.md + commit.md + handoff.md 標準化

決策：
- **execute.md [E] 欄位新增**：每次 `/execute` 完成後必填「Subagent 使用記錄」表格（Router 建議 / 實際使用 / 遵從 Router），無論是否使用 subagent 均必填。
- **commit.md Phase 1 強制欄**：handoff.md 每個 session 完成事項末尾強制附上 [E] 表格。
- **向後不兼容舊 session**：舊 session 記錄補填「不詳（舊格式 session，標準化前）」，不強制補齊 Router 建議。

原因：FHS Router hook 在每個 session 啟動時已建議 subagent，但沒有任何報告欄位記錄是否遵從，導致 Fat Mo 無法審計 subagent 使用率與 Router 的有效性。

批准：Fat Mo ✅（2026-05-21 授權執行）

---

[2026-05-21] Bug 修復：修改訂單後批次/進度重置 + W_WOOL 舊資料 pipe 格式渲染問題

決策：
- **sbSyncOrder DELETE+INSERT 加護盾**：修改訂單前先 fetch 舊 `order_items` 的 `{item_key → batch_number, process_status}` 映射，DELETE 後 INSERT 時按 `item_key` 回填，防止已儲存的批次/進度被覆蓋。限制：只能保留 `item_key` 完全相同的 item（新舊格式不同的訂單不受保護）。
- **_woolKey 擴展 pipe 格式偵測**：`_woolKey` 和 `_accWoolKey` 改為雙重檢查（`_W_WOOL` 後綴 OR `'羊毛氈'` 字串），覆蓋 n8n 舊格式 `item_key = '0696216 | 羊毛氈公仔 - 加購'` 的偵測失敗問題。

原因：n8n 存入 Supabase 的舊格式 item_key 是 pipe format，`_cleanKey` 邏輯 → `Order_Item_Key = ''`，`Item_ID = '0696216 | 羊毛氈公仔 - 加購'` 不含 `_W_WOOL`，導致 `_hasWool = false`，W_WOOL 渲染為獨立 row 且 Row 1 無 badge。

批准：Fat Mo ✅（2026-05-21 授權執行）

---

[2026-05-21] 加購配件（W_WOOL 羊毛氈公仔）渲染架構決策 — 建立 addon_product_sop.md

決策：
- **加購配件不獨立成 Review Mode row**：改以 inline badge 合併至父產品（立體擺設）同列，`_woolKey`/`_hasWool`/`_renderItemsFinal` 模式在 `renderReviewTable` 和 `renderReviewAccordion` 兩個渲染函式中同步實作。
- **sbSyncOrder 禁止寫 product_sku**：加購配件 Product_Name 不在 Supabase `products` 表，強行寫入會觸發 FK 23503，導致整批 INSERT rollback（所有 item 全失敗）。移除後問題解除。
- **Order_Item_Key 後綴作為唯一識別**：`_W_WOOL` 後綴同時作為 `_deriveCat`、`getProductDimensions`、渲染分離的識別依據，不依賴 Product_Name 字串（Supabase 不儲存 Product_Name）。
- **SOP 文件化**：建立 `.fhs/notes/addon_product_sop.md`，含四個必改位置與 checklist，供 subagent 日後新增同類加購配件時參照。

原因：羊毛氈公仔是首個「加購型配件」產品，其架構問題（FK 衝突 + 渲染分離）屬可預期重複出現的 pattern，需要 SOP 固化，避免每次新加配件都要重新 debug。

批准：Fat Mo ✅（2026-05-21 授權執行）

---

[2026-05-20] 補 Reflect→Think 閉環 — 新建 learnings.md + 鉤入 /read + 解 handoff 封鎖

決策：
- **新建 `.fhs/memory/learnings.md`**：三節骨架（Patterns / Pitfalls / Preferences），上限 50 條。職責與 decisions.md（事件記錄）正交，learnings.md 只存 distill 後的可複用規律，不重複事件細節。
- **SOP_NOW.md 初始化步驟加入 Step 3**：每 session /read 強制載入 learnings.md，讓歷史教訓在工作記憶中可見。
- **handoff.md 封鎖文字微調**：2026-05-19 修 A2 越權 bug 後的封鎖過度（「嚴禁主動執行」誤擴張至「嚴禁主動引用」），本次修正為「寫入/執行需授權，引用 learnings.md 提示不需授權」。
- **commit.md Phase 1 加 Step 5**：每次 commit 結尾詢問 Fat Mo 是否有 lesson 要 distill，手動 append，無回應靜默跳過，零 LLM 自動化成本。

原因：FHS 有大量 Reflect artifact（decisions.md 488 行、handoff.md、lessons/、CHANGELOG.md）但缺乏「下一個 session 主動引用」機制。gstack Reflect→Think 閉環的核心是 persistent learning 回灌，最小實作是一份壓縮的 learnings.md + /read 鉤入。

批准：Fat Mo ✅（2026-05-20 授權執行）

---

[2026-05-18] Telegram 通知分格 + Dashboard 部位誤報 Bug Fix

決策：
- **Telegram 三格分離**：`Pack Telegram Data`（n8n）改為在 JS 內組裝完整 `Full_Message`，`Send Profit Report` 只輸出 `={{ $json.Full_Message }}`。新訂單顯示完整商品清單（`Sub_Items`），修改訂單只顯示財務核算 + `Update_Note`，刪除訂單顯示最精簡格式。
- **Dashboard Update_Note 部位誤報修復**：`lastFetchedState` 從 Airtable 讀回時不含 `limb_sel_*` 鍵，比較時 `"true" !== undefined` 導致所有 body parts 被誤標為已變動。修復：加 `if (!(k in lastFetchedState)) continue` + `String()` 型別正規化。受影響文件：`freehandsss_dashboardV41.html` + `Freehandsss_dashboard_current.html` Line 5417。
- **n8n Pack Telegram Data 雙 🔄 修復**：`Update_Note` 本身已帶 `🔄 更新項目:` 前綴，移除模板中多加的 `🔄 ` 避免重複。

批准：Fat Mo ✅（2026-05-18）

---

[2026-05-17] 介面分流術語語意大清洗 — 取消 Ling Au / Fat Mo 介面標準命名

決策：
- **術語替換範圍**：僅針對「UI 介面模式」命名，管理員身份的 Fat Mo 稱呼保留不動。
- **替換對照**：`Ling Au 行動端模式 / Ling Au 模式` → `📱 Mobile phone 介面模式`；`Fat Mo 桌面端模式 / Fat Mo 模式` → `💻 Desktop 介面`。
- **受影響文件**：`docs/DESIGN.md`、`docs/FHS_Blueprint.md`、`docs/FHS_Prompts.md`、`docs/FHS_Product_Bible_V3.7.md`（共 9 處替換）。
- **根因**：舊術語白紙黑字寫入設計文件，每次新 session AI 讀取文件後都會重新載入舊術語，導致術語不斷回調；唯有在源頭清洗才能徹底防止。
- **GLOBAL_AI_SOP.md**：不在本次清洗範圍，管理員 Fat Mo 身份保留。

批准：Fat Mo ✅（2026-05-17 授權執行）

---

[2026-05-16] Supabase-First 財務遷移 — n8n V47.4 + Finance Bible + 四端架構完成

決策：
- **n8n `Calculate Profit & Pack Items` 升級 V47.4**：新增 `getItemCategory(sku)` 函數推導 item_category（木框/玻璃瓶→立體擺設，鎖匙扣→金屬鎖匙扣，吊飾→銀飾）。每個 packed item 新增 `Item_Category`、`Handmodel_Cost`、`Keychain_Cost`、`Necklace_Cost`。訂單層新增 `Handmodel_Cost_Total`、`Keychain_Cost_Total`、`Necklace_Cost_Total`。鎖匙扣運費扣減同步套用至 `keychainCostTotal`。
- **n8n `Mirror to Supabase` 升級 V47.4**：orders upsert 補入 `deposit`、`balance`、`additional_fee`、`full_order_text`、`handmodel_cost`、`keychain_cost`、`necklace_cost`。order_items upsert 修正 `product_sku`（從 hardcoded null 改為 `item.Product_Name || null`）並新增 `item_category`、`handmodel_cost`、`keychain_cost`、`necklace_cost`、`subtotal_cost`、`specification`。
- **建立 `.fhs/ai/FHS_Finance_Bible.md` v1.0.0**：統一財務計算聖經，10 節涵蓋雙層成本架構、SKU映射、節點職責、驗證公式、反模式。所有涉及財務的 subagent 強制在執行前讀取此文件。
- **subagent 升級至 v2.0.0**：`database-reviewer` 和 `finance-auditor` 均升級，加入 Finance Bible 強制前置讀取（Phase 0），將 Triple Sync 欄位地圖參照改為 Quadruple Sync，`finance-auditor` 架構從三端升為四端（新增 Supabase 為 Tier 1 主導）。
- **雙層成本架構確認**：Layer 1（Supabase View 動態）提供即時報價，Layer 2（n8n 靜態寫入）保存歷史快照。Supabase trigger/generated column 嚴禁計算財務欄位。

根因修正（C0.5）：
- 23 筆 Supabase 歷史訂單 `handmodel/keychain/necklace_cost = NULL`：根因是 Mirror to Supabase 節點從未包含這些欄位，已在 V47.4 修正。歷史訂單需另行 backfill（待 Airtable quota 重置後）。
- 2 筆 order_items `product_sku = NULL`：order 0600100 特殊品（立體擺設 + 金屿扣/腳）因無標準 SKU 匹配，NULL 屬正確行為，無需修正。

批准：Fat Mo ✅（2026-05-16 授權處理）

---

[2026-05-10] finance-auditor Subagent v1.0.0 — 三端財務稽核員建立

決策：
- **建立 `finance-auditor` subagent**（不升級 database-reviewer）：database-reviewer 職責為靜態 Schema/Code 審查，finance-auditor 職責為 Live Airtable 動態數據驗證，兩者正交。
- **Single-file 內嵌 Python 邏輯**：與 `build-error-resolver`、`blender-3d-modeler` 同模式，避免雙層架構增加維護成本。
- **強制讀取 `finance-calculator` skill**：公式不重複定義，節省 token，finance-calculator 作為共用 reference layer。
- **三端架構清晰切割**：Tier 1 Airtable（數據源）→ Tier 2 n8n（計算引擎）→ Tier 3 Dashboard（前端真理）。前端 profit ≠ 0 時為絕對真理，finance-auditor 強制遵守 AGENTS.md §財務真理守護。
- **Supabase 就緒設計**：Phase 3 Tier 1 查詢層已文件化替換路徑（Airtable MCP → read-only-postgres skill），欄位名稱對齊 Quadruple_Sync_Field_Map.md，遷移時只需替換連接方式，不改稽核邏輯。
- **FHS_Prompts.md 情境五觸發詞收窄**：「利潤」「Total Cost」移出情境五，改為「財務規則確認」入口；Live 驗證統一走情境二十一。
- **AGENTS.md 新增決定性路由規則**：Live Airtable 財務驗證觸發時強制調用 finance-auditor，不得由 Claude 直接處理。

批准：Fat Mo ✅（2026-05-10 /execute）

---

[2026-05-07] n8n V40.9 零成本防衛 + Airtable 公式修正 + /fhs-cost-audit 指令

決策：
- **Airtable 公式反模式修正**：Keychain_Cost / Handmodel_Cost / Necklace_Cost 三個 rollup 公式原有 `× Quantity` 錯誤，導致批次 SKU（如 $290/2件）成本翻倍。修正為直接 `SUM(Item_BaseCost)`，與 AGENTS.md 架構規則（Airtable 公式僅供展示輔助）對齊。
- **n8n Node 14 零成本防衛**：加入 `zeroCostItems` 陣列，偵測 Total_Base_Cost = $0 的有效 SKU，輸出 `Cost_Lookup_Warning` 與 `Has_Cost_Error`。防止 SKU 名稱查找失敗時 Total_Cost 靜默為 $0（Katkat 問題一類型根因）。
- **新增 `/fhs-cost-audit` 指令**：定期執行 `audit_total_cost_integrity.py` 比對 Total_Cost 與各類目 rollup 總和，異常自動分類為 CRITICAL / WARN / OK。與 `/fhs-audit`（架構衛生）、`/fhs-check`（功能測試）職責不重疊。

批准：Fat Mo ✅（2026-05-07 /execute）

---

[2026-05-07] blender-3d-modeler v2.0.0 — 升級為 Triage-first 工程型 subagent

決策：
- v1.0.0 的問題：角色定義過窄（只有 4 個配方），無 Triage 邏輯，無 I/O 合約，無 failure handling
- v2.0.0 升級：新增 STL Triage 決策樹（REPAIR/REBUILD/HANDOFF）、FDM printability check、HANDOFF 工具清單
- **開放藝術建模**：Fat Mo 明確確認藝術設計/造型設計/美學調整均在能力範圍內（原 Non-Goals 錯誤限制）
- **新增 3d/ 路徑規則**：`3d/input/`（上傳）/ `3d/projects/{slug}/`（工作檔）/ `3d/output/{slug}/`（列印用 STL），提升專案組織層次
- Triage 閾值：non_manifold_edges < 50 → REPAIR；≥ 50 → REBUILD（保守設定，寧可多問不擅自修）

批准：Fat Mo ✅（2026-05-07 /execute — Flow 2026-05-07-1007）

---

[2026-05-05] blender-3d-modeler subagent — 採用 Single-file 內嵌知識設計

決策：
- **不採用** AG 計劃的 skill + subagent 雙層架構（`BlenderAdvancedModeling` skill + `BlenderModelPro` subagent）
- **採用** 單一 subagent 檔案，將所有已驗證的 Python 配方嵌入同一個 .md（與 `build-error-resolver.md` 相同模式）
- Model 選用 `claude-sonnet-4-6`（需要工具執行能力，Haiku 功能不足）

原因：
- 此任務需要工具執行能力（`mcp__blender__execute_blender_code`），skill 只是純知識 reference layer，無執行能力
- 雙層架構增加維護成本，且 FHS 最小化原則要求避免過度拆分
- 單一 subagent 內嵌知識可確保配方「記憶」隨 agent 一起部署，不依賴額外 skill 讀取

知識來源：2026-05-05 心形凹槽手模 Blender session 實際驗證配方（MANIFOLD boolean / 浮空碎片清除 / 外殼放量 / Z-slice 分析）

批准：Fat Mo ✅（2026-05-05 /execute — Flow 2026-05-05-2300）

---

[2026-05-04] Order_Items 成本分類欄位計算方式確認（formula 保留）

> ⚠️ **SUPERSEDED**：本決策已於 **2026-05-13 Supabase-First 策略 (AGENTS.md v1.4.5+)** 與 **2026-05-17 AGENTS.md v1.4.6 §財務真理守護「財務欄位計算職責分工」** 取代。
> 現行規則：核心財務欄位（含 Handmodel/Keychain/Necklace_Cost）必須由 n8n 計算後寫入 **Supabase (Primary)** 並鏡像至 Airtable (Fallback)。Airtable formula 僅作展示輔助，非權威來源。
> 保留此條目作為歷史記錄。

決策（已 Superseded）：
- 保留 `Handmodel_Cost`、`Keychain_Cost`、`Necklace_Cost` 為 Airtable formula 欄位（不改 number）
- 原因：公式已修復（無紅三角），且 formula 可即時反映 Product_Link 成本異動，n8n 寫入反而無此優勢

**計算邏輯（供日後轉移其他 Database 用）**

三個欄位共用相同邏輯，差異僅在類別關鍵字：

```
IF(
  FIND("{類別}", ARRAYJOIN({Item_Category}, ",")),
  SUM({Item_BaseCost}) * {Quantity},
  0
)
```

| 欄位 | 類別關鍵字 | 說明 |
|------|-----------|------|
| Handmodel_Cost | `立體擺設` | Item_Category 含此字串時，計算 Item_BaseCost × Quantity |
| Keychain_Cost | `金屬鎖匙扣` | 同上 |
| Necklace_Cost | `純銀頸鏈` | 同上（注意：關鍵字為「純銀頸鏈」，非全名「純銀頸鏈吊飾」） |

**依賴欄位**：
- `Item_Category`：multipleLookupValues，透過 `Product_Link → Main_Category` 取得
- `Item_BaseCost`：multipleLookupValues，透過 `Product_Link → Total_Base_Cost` 取得
- `Quantity`：number，由 n8n 或 Dashboard 直接寫入

**轉移注意**：
- 若目標 DB 不支援 lookup array，需先在 n8n 解析 `Item_Category`，改為 conditional 寫入

批准：Fat Mo ✅（2026-05-04）

---

[2026-05-04] 鎖匙扣跨部位運費扣減規則建立 + Node 14 V40.6 部署

決策：
- Node 14 "Calculate Profit & Pack Items" 更新至 V40.6：加入 `keychainItemCount` 訂單層計算邏輯
- 訂單層扣減規則：`(鎖匙扣 Order_Items 件數 − 1) × $20`，僅在件數 > 1 時生效
- 規則記錄於 `docs/FHS_Product_Bible_V3.7.md` §2.5
- 11 筆 Airtable Main_Orders 歷史記錄修正（Total_Cost & Net_Profit，合計差異 −$260）
- `n8n-mcp-server/src/n8n-client.js` PUT sanitization 修正（解決 HTTP 400 錯誤）
原因：不同部位的鎖匙扣（如 LH + RH）在同一訂單共用同一批次運費，舊 Node 7 只計算同 SKU qty>1 的 item 層扣減，跨 item 的訂單層扣減從未實作，導致 11 筆歷史訂單 Total_Cost 低估共 $260。
批准：Fat Mo ✅（2026-05-04）

---

[2026-05-03] Airtable 成本分拆欄位建立 + n8n 財務計算職責確立

決策：
- 在 Order_Items 新增 3 個成本分類欄位：Handmodel_Cost（立體擺設）、Keychain_Cost（金屬鎖匙扣）、Necklace_Cost（純銀頸鏈吊飾）
- 在 Main_Orders 新增 3 個對應 Rollup 欄位（SUM）
- 確立原則：上述欄位由 n8n 計算並直接寫入，不使用 Airtable formula
- AGENTS.md 升級至 v1.4.2，新增「Airtable 計算職責分工」規則
原因：Airtable formula 無法可靠處理 multipleLookupValues 陣列計算（會出現紅色三角形錯誤）。n8n 在處理訂單時已知商品類別，由 n8n 計算成本分類更穩定可靠。
批准：Fat Mo ✅（2026-05-03）

---

[2026-05-03] Stitch → Antigravity 整合完成 — 建立 UI 設計工具管線

決策：
- 將 Google Stitch MCP 整合至 Antigravity 設計工作流，建立標準化轉換管線
- 新增 `/ag-stitch-sync` 指令：讓 Antigravity 開啟並擷取 Stitch 生成的 UI snippet
- 新增 `/ag-ui-import` 指令：將確認後的 UI snippet 去除外部依賴，轉為 Vanilla HTML/CSS
- 更新 AGENTS.md Section 3 加入「Stitch 資產守護」原則
- 更新 ANTIGRAVITY.md 加入 Stitch MCP 使用入口
- 更新 ui-designer.md / frontend-developer.md 明確 Stitch 工作邊界
原因：系統缺乏 Stitch 明確工作流，導致設計工具整合不完整。Fat Mo 授權解除 A2 寫入鎖並執行整合（2026-05-03）。
批准：Fat Mo ✅（2026-05-03）

---

[2026-04-28] V40.4 同步至 current（生產環境正式切換）

決策：
- 將 `freehandsss_dashboardV40.html` 複製至 `Freehandsss_dashboard_current.html`
- 更新 `README.md` 與 `Freehandsss_Dashboard/README.md` 版本標記
- 當前生產版本 = V40.4（響應式設計 + API 快取）
- V36 降級為「舊版穩定基準」（備份參考用）
原因：V40.4 已完成響應式重設計、財務模式整合、API 優化等全部功能。經過充分測試，已達生產就緒。

[2026-04-28] Airtable API 配額優化 — 5分鐘快取層 + sessionStorage

決策：
- 在 `fetchGlobalReview()` 加入 client-side 5分鐘 sessionStorage 快取
- 同一查詢條件（year/month/status/batch/search）5 分鐘內不重複呼叫 n8n/Airtable
- 在 `loadSystemConfig()` 加入 30分鐘 sessionStorage 快取
- 保留 `forceRefresh` 參數供手動刷新
- n8n 端快取（FHS_Query_GlobalReview_cached.json）已設計但暫緩部署，client-side 方案已足夠
原因：April 2026 Airtable API 用量 ~1138 次，超出免費配額 1000 次。根因是開發期間每次頁面加載都觸發 API 呼叫。Client-side 快取可即時生效且不需修改後端工作流。

[2026-04-28] 新增 3 subagents + 1 skill — FHS 後端/診斷/財務執行能力強化

決策：
- 從三個 GitHub 來源（agency-agents ~150個、andrej-karpathy-skills 4原則、everything-claude-code ~36 agents）中精選 5 個模組
- 安裝 database-reviewer（Sonnet）、tdd-guide（Sonnet）、build-error-resolver（Haiku）三個 subagent
- 安裝 finance-calculator skill（≤ 30 行精簡版）
- karpathy-principles 不建獨立 skill — 唯一新概念「Goal-Driven Execution」合併進 AGENTS.md，避免重複 context 消耗
原因：
- FHS 系統缺乏 Airtable schema 審查、測試驅動、自動化 debug 能力
- 選擇 on-demand subagent 模式（非 hook 模式）以確保零 baseline token 成本
- 排除 ECC hooks/rules/commands 系統（與雙系統 bridge pattern 不相容）
- 排除 150+ 不相關 agent（marketing/sales/語言特定）

[2026-04-26] 新增 Order_Confirm_Date 欄位 — 記錄每月銷售統計

決策：
- 在 Airtable Main_Orders 新增 `Order_Confirm_Date`（date, ISO 格式）欄位
- 17 筆舊訂單以 Excel 日期欄填入；4 筆已有訂單以 Appointment_Date 填入
- Dashboard（current + V40）同步按鈕 payload 加入 `Order_Confirm_Date = 當日日期`，僅 `create` 模式送出，`edit` 模式不覆寫
- n8n FHS_Core_OrderProcessor 兩個 Create Main Order upsert 節點加入欄位映射 `={{ $json.Order_Confirm_Date || null }}`
原因：Fat Mo 需要按月份統計銷售，Appointment_Date 是取模日（未來），不適合作收入確認日；改用 confirm 日（訂單建立當日）更準確。

[2026-04-25] 系統檔案衛生清理 — 刪除孤立/過期/冗餘檔案

決策：
- 刪除 `repomix-output.txt`（4.9 MB 生成物，非版本控制對象）並加入 .gitignore
- 刪除 `.fhs/memory/system_status.json`（2026-03-28 凍結，handoff.md 已完全取代）
- 刪除廢棄 worktree `.claude/worktrees/wizardly-mendel/`（最後活動 2026-04-05，無進行中工作）
- 刪除孤立工作流 `.agents/workflows/freehandsss-optimizer-v2.md`（未被任何系統引用）
- 歸檔 `n8n/create_fo_workflow.js` 與 `create_fo_workflow_v2.js` 至 `archive/n8n_scripts/`，只保留最新 v3
- 清理 `artifacts/` 舊運行記錄（保留最近 5 次，刪除 2026-04-02 的 4 個目錄）
原因：深度健康稽核（4 並行 Agent）發現上述冗餘，Fat Mo 授權全部執行。回收空間 ~7.5 MB。

---

[2026-04-25] Financial Overview V40.2 整合完成

決策：
- `freehandsss_dashboardV40.html` 新增財務模式（`switchMode('finance')`），通過 Top Bar 📈 按鈕進入
- 獨立財務頁 `freehandsss_financial_overview.html` 標記 DEPRECATED，移入 archive/
- n8n Financial Overview Workflow 部署：Webhook → Fetch Orders → Collect → Fetch Items → Merge → Aggregator → JSON（順序管道）
- Webhook URL：`https://yanhei.synology.me:8443/webhook/financial-overview-fhs`
- 版本定義為 V40.2（V40 = 響應式重構，V40.1 = Accordion Audit Center，V40.2 = Financial Overview 整合）
原因：財務數據需直接嵌入主 Dashboard，獨立頁面造成導航割裂。Live 驗證通過（4月真實數據）。

---

[2026-04-22] V40 iPhone Accordion Audit Center（V40.1）

決策：
- Audit Center 採用 iPhone Accordion 設計（展開/收合），44px touch targets
- 使用 `data-accordion-group` 屬性做 ID 命名空間隔離（避免與 V37 遺留 ID 衝突）
- CSS animation 使用 `max-height` + `overflow: hidden` 方案（原生 details/summary 無法精確控制動畫）
- Code Reviewer PASS 確認，定義為 V40.1 milestone
原因：iPhone 使用者需要更緊湊的 Audit Center，原 V40 全展開佈局在小螢幕佔用過多空間。

---

[2026-04-22] V40 響應式重構完成 — 廢除雙模式設計

決策：
- 廢除 V39 的「Ling Au / Fat Mo 雙模式」設計概念（角色切換器），改為純響應式系統
- 設計軸：`< 768px` → iPhone 優先佈局，`≥ 768px` → Desktop 佈局，一套 HTML 自動適配
- ui-designer.md 升級至 v2.0.0，FHS_INTEGRATION.md 升級至 v2.0.0，移除所有雙模式參照
- V39 proto 標記 DEPRECATED，移入 `Freehandsss_Dashboard/archive/`
- V40 Code Reviewer PASS，正式成為活躍開發版本
原因：雙模式增加維護複雜度，且 Fat Mo 確認無需 Ling Au 專屬 UI。響應式設計更具可擴展性。

---

[2026-04-06] /fhs-audit 稽核修復 — 文件衛生清理

決策：
- v39-aom.md 從 commands/ 移至 archive/（已 Deprecated，避免孤獨檔案殘留）
- repo-map.md 補全 Maintenance_Tools/ 完整檔案清單（原先僅列 run_all.py）
- README.md 版本號同步至 v1.4.0（原為 v1.3.1，與 AGENTS.md 不一致）
原因：/fhs-audit 21 項稽核發現 6 項待修，Fat Mo 授權全部執行。

---

[2026-04-06] Dashboard 版本治理與重置 — 恢復 V36 為 Stable Baseline

決策：
- 正式宣佈 V37、V38、V39 (舊版) 為不合格版本，存在功能缺失與介面品質不達標問題。
- 處置：將上述失效版本全部移入 `Freehandsss_Dashboard/archive/`，不再作為開發或生產基準。
- 恢復 V36 為目前最新穩定版本 (Stable Baseline)，作為所有後續開發的基準。
- 建立新的 V37 (由 V36 複製產生)，定義為唯一的活躍開發版本 (Development Version)。
- 所有新功能、修正與實驗性改動必須基於此新 V37 進行。

核心原則：
- 嚴格遵守版本遞增邏輯，非經批准不得跳版或混用失效版本。
- 保持 `Freehandsss_dashboard_current.html` 與 Stable Baseline (V36) 的同步。

批准：Fat Mo ✅（2026-04-06）

---

[2026-04-06] n8n MCP Server — 建立 AI 控制層（Phase 1）

決策：
- 新建 `n8n-mcp-server/` 作為 AI 與 n8n 之間的專屬控制層
- Phase 1 僅支援 FHS_Core_OrderProcessor（Workflow ID: 6Ljih0hSKr9RpYNm）
- 放在 dashboard repo 內作為子目錄，不獨立 repo
- n8n API key 共用根目錄 `.env`（變數名 N8N_KEY / N8N_INSTANCE）
- 備份路徑：`.fhs/memory/backups/n8n-mcp/{date}/{workflowId}/{nodeName}.json`
- `update_node_code` 預設 dry-run，需 `/execute` 授權才真正 PUT
- 寫入前自動備份 + `rollback_node_code` 回滾機制
- 測試執行僅接受 mock payload（mock_create/edit/delete_order.json）
- workflow allowlist 硬編碼於 config.js，Phase 1 僅允許 `6Ljih0hSKr9RpYNm`
- **狀態更新 (2026-04-06)**: 環境初始化完成，`zod` 驗證層已整合，`get_workflow` 通過遠端連通性測試。工具集正式進入可用狀態。
- **MCP 註冊 (2026-04-06)**: 建立根目錄 `.mcp.json`，將 n8n-mcp-server 註冊為 Claude Code MCP server（command: `node src/index.js`, cwd: `n8n-mcp-server`）。重啟 session 後即可在對話中直接呼叫 7 個工具。

核心原則：
- 不取代既有 Dashboard Webhook 主流程
- 不改寫利潤計算主邏輯
- 三端同步驗證（verify_triple_sync）制度化
- 所有里程碑須通過 CL-FLOW

批准：Fat Mo ✅（2026-04-06 /execute）

---

[2026-04-05] UI/UX Intelligence Integration — 整合 Stitch + Impeccable + FHS-curated UI/UX layer

決策：
- 採用 5-Layer Intelligence Stack（Ideation/Refinement/Spec/Implementation/Quality Gate）
- Impeccable 橋接方案 A：Claude Code 直接 Read `.gemini/skills/frontend-design/reference/`（已驗證可行）
- UI/UX Pro Max 改為 FHS-native 建立（非外部 repo mirror），命名為「FHS-curated UI/UX intelligence layer, inspired by UI/UX Pro Max principles」
- skills/ 層設計為 reference layer（不安裝至 `~/.claude/agents/`，不含 YAML frontmatter）
- OPERATING_MODEL.md 更新至 v2.0.0，加入 5-layer stack 與工具路由表
- 3 個 FHS agent 更新至 v1.1.0（加入 5-layer workflow / Input Contract / UX checklist）

核心原則：
- 不修改 AGENTS.md / CLAUDE.md / ANTIGRAVITY.md
- 不新增平行指令系統
- skills/ 層可獨立 rollback（不影響 subagents/）

---

[2026-04-05] Subagent Engineering — 安裝 FHS 重寫版 Subagent 組合

決策：
- 採用 lst97/claude-code-sub-agents 三個 agent（ui-designer / frontend-developer / code-reviewer）作為基礎
- 不安裝 lst97 的 CLAUDE.md 或 agent-organizer.md（避免與 FHS 架構衝突）
- 雙層文件架構：`.fhs/ai/subagents/vendor/`（原始備存）+ `.fhs/ai/subagents/freehandsss/`（FHS 重寫版）
- Runtime 鏡像：`~/.claude/agents/freehandsss/`（Claude Code 執行時偵測）
- v39-aom.md 內容遷移至 `OPERATING_MODEL.md`（長期制度文件），v39-aom.md 加入遷移注記（未 stub 化）

核心原則：
- AGENTS.md 憲法層不動（無需追加 Section 8）
- CLAUDE.md / ANTIGRAVITY.md 入口層不動
- commands/README.md 不新增平行指令系統
- FHS 重寫版完全移除 React/TypeScript/Tailwind，改為純 HTML/CSS/Vanilla JS 約束

---

[2026-04-05] V39 Prototype-First Rebuild — 建立 Agent Operating Model + 原型檔案

決策：
- V38 仍落入「舊版介面微調」路線（沿用 V36/V37 表單卡片 DOM 結構）
- 採 prototype-first 策略：先建全新視覺語言原型，功能接回留後階段
- 新增最小 subagent 組合（UI Designer / Frontend Developer / Code Reviewer）防止路線滑回
- V39 原型採雙語言視覺系統：令狐沖（黑底命令行風）vs 肥貓（暖白數據工作室風）
- 原型檔案：`freehandsss_dashboardV39_proto.html`（純靜態，無 n8n 連接）
- AOM 文件：`.fhs/ai/commands/v39-aom.md`（定義三 subagent 分工與防線守則）

核心原則：
- 功能接回必須等 Code Reviewer PASS + Fat Mo /execute 授權
- 禁止在原型中混入 fetch() / webhook URL
- V39 與 V38 DOM 結構相似度超過 40% 視為設計衝刺失敗

---

[2026-04-02] /cl-flow 升級至 v2.1.0 — 真正一鍵協調器實作

決策：
- 舊 /cl-flow v2.0 只讀取靜態 a1/a2 檔案，Claude 可能假裝審閱（無真實 artifact 生成）
- 採 Node.js headless runner（`scripts/cl-flow-runner.js`）並行調用 Perplexity + Gemini API
- 檔案寫入採 Option B（`fs.writeFile('utf8')`）：Fat Mo 裁決，單一語言，無額外依賴

核心變更：
- `/cl-flow` 從「讀靜態檔→審閱」改為「執行腳本→生成真實 artifact→審閱→cl-final-plan.md」
- 新增 Deterministic Gate：artifact 缺失即阻擋，不允許空手審閱
- 輸出路徑改為 `artifacts/{flow_id}/`，每次執行獨立追蹤
- `/execute` 新增 cl-final-plan.md 閘道驗證

---

[2026-03-31] GLOBAL_AI_SOP 升級至 v2.0，/a3go 重構為雙重授權機制

決策：
- 舊 SOP v1.0 未涵蓋真實工作模式（Fat Mo 手動橋接多環境）
- 舊 /a3go 讀取固定路徑舊格式，無容錯設計
- 採原子更新：GLOBAL_AI_SOP.md + a3go.md + repo-map.md + README.md 同批完成

核心變更：
- Fat Mo 正式定義為「唯一上下文橋接者」（非角色擴充，是現實工作模式的文件化）
- 報告命名規範一次性切換（舊格式退役，無過渡期）
- /a3go 新增雙重授權（第一層技術評估 → 第二層清單授權 → 執行）
- Antigravity (A2) 需同步更新輸出命名格式

批准：Fat Mo ✅（經 px 橋接確認 + 明確「執行」指令，2026-03-31）

[2026-03-30] /commit 升級為全包一條龍指令
## 1. 背景與任務 (Context)
- **重大事故記錄**：今日 Session 初段發生了 **AI 未授權執行 (Unauthorized Execution)** 事故，AI 在計畫獲准前擅自實施架構改動。
- **核心目標**：受此教訓啟發，升級 `/fhs-audit` 稽核體系，建立「防越權護欄」，並將 `/commit` 升級為含括 Git Push 的全自動備份指令。

決策：/commit 不只是 Memory Engine 別名，
      正式升級為「記憶同步 + Notion 上雲 + Git 推送」全包指令。

執行順序：
1. Memory Engine（lessons + handoff + Notion sync）
2. 安全檢查（.env 保護 + 大型檔案偵測）
3. git add → git commit → git push

安全設計：
- .env 出現自動攔截，不得推送
- 異常時分段處理，不因單點失敗中斷全流程

批准：Fat Mo ✅（2026-03-30）


[2026-03-30] Sync_Notion_Brain.js 升級至 V2.0：Auto-Discovery 記憶引擎

背景：V1.3 存在路徑錯誤（LESSONS_DIR 指向 scripts/ 子目錄）與手動白名單問題（新教訓無法自動上雲）。

發現（AG 審視）：
- BRAIN_ROOT 變數從未被使用，屬沉積代碼
- 17 個 lessons 全數健在，包含 2 個不在舊白名單的最新教訓
- Auto-Discovery 上線後立即補足過去遺漏的記憶斷層

變更：
- 修正 LESSONS_DIR 路徑（加入 .. 往上一層至專案根目錄）
- 刪除 BRAIN_ROOT 沉積變數
- 以 Auto-Discovery 全量掃描取代手動 highValueLessons 白名單
- 加入 333ms Rate Limit 防護（確保 Notion API 穩定）
- reflect.md 新增 Pruning 步驟（90天臨時日誌提示清理）

批准：Fat Mo ✅


[2026-03-30] AGENTS.md 升級至 v1.2：舊約智慧救援行動

背景：FHS_Prompts.md 存放於 archive，存在「系統失憶」風險，大量實戰護欄邏輯未被新架構承接。

決策：採用 B+C 混合方案 + AG 三項優化建議
- 4條核心死線補入 AGENTS.md 全域硬規則
- 4個情境觸發邏輯獨立為 commands/ 指令檔
- FHS_Prompts.md 從 archive 救回，升級為入口路由總機
- 情境四/九/十/十一 改為 Router，消滅雙源衝突風險
- .cursorrules 原封不動保留，AGENTS.md 聲明優先級凌駕其上

影響檔案：
- .fhs/ai/AGENTS.md（v1.0 → v1.2）
- .fhs/ai/commands/reflect.md（新建）
- .fhs/ai/commands/error-eye.md（新建）
- .fhs/ai/commands/guardian.md（新建）
- .fhs/ai/commands/px-audit.md（新建）
- docs/FHS_Prompts.md（從 archive 救回 + 升級為 Router）
- docs/repo-map.md（更新目錄）

批准：Fat Mo ✅


[2026-03-30] 採用四檔案架構（CLAUDE.md / ANTIGRAVITY.md / AGENTS.md / commands/）
— 原因：將入口層、憲法層、法律層分離，符合 DRY 與 SoC 原則，兩個 AI 共用同一份規則。

[2026-03-30] AI 配置統一收納至 .fhs/ai/，notes 收納至 .fhs/notes/
— 原因：根目錄保持乾淨，所有幕後系統集中在 .fhs/ 隱藏資料夾，防止誤改。

[2026-03-30] /read 指令作為 SOP_NOW.md 的統一入口別名
— 原因：SOP_NOW.md 名稱不直觀，/read 讓兩個 AI 都能用同一個指令觸發。

[2026-03-30] 建立 Top 2 導航文件系統（README.md + repo-map.md + 各資料夾 README）
— 原因：確保 AI 不迷路，30 秒上手。
— 建立清單：根目錄 README.md、docs/repo-map.md、.fhs/README.md、
  ai/README.md、docs/README.md、n8n/README.md、
  Maintenance_Tools/README.md、scripts/README.md
— 修正：Freehandsss_Dashboard/ 為空資料夾，UI 檔案實際在根目錄，已在地圖明確標注。
— 修正：repo-map.md 先於 README.md 建立，避免空連結問題。
— 新增：ai/ 資料夾納入導覽，防止新 AI 忽視或破壞協作報告。
— 移除：.clauderules 幽靈行（已刪除）及 docs/impeccable.md 幽靈行（從未存在）。
— scripts/ 實際腳本：Sync_Notion_Brain.js、rebuild_index.py、test_audit_...py 已納入 README。

[2026-03-30] 將 ai/ 重新命名為 ai_reports/
— 原因：與 .fhs/ai/ 名稱過於接近，容易產生混淆。重新命名為 ai_reports/ 能更清楚定義其「報告產出區」之職責。

[2026-03-30] 深度清理 docs/ 孤島檔案
— 原因：移除嚴重過時且無連接的沉積物，防止 AI 在開發過程中讀取到錯誤的歷史邏輯（ poisoning ）。
— 封存清單：SYSTEM_INSTRUCTION_MANUAL.md, System_Architecture_Handover.md, FHS_System_Health_Check_SOP.md, FHS_Prompts.md。
— 處置：全部移入 docs/archive/pre-v1.0-backup/。

[2026-03-30] 二次架構優化：歸併報告區與整理舊檔
— 原因：追求根目錄極致潔淨，將 ai_reports/ 併入 .fhs/notes/ 下。
— 調整：FHS_Prompts.md 依用戶要求不刪除，改存於根目錄 archive/ 供隨時查閱。
— 結果：根目錄成功減少一個資料夾，系統報告與筆記層完美融合。

[2026-03-30] .fhs/notes/ 目錄結構「極致扁平化」重整
— 原因：消除 ai_reports/ 內部重複的 reports/ 資料夾，並將分散的 README 統整為 notes/ 目錄的唯一總綱。
— 改善：建立了 .fhs/notes/README.md 統籌說明所有筆記檔案。
— 保留：依用戶要求，保留了 .fhs/memory/README.md 舊版檔案不予刪除。

[2026-03-30] Top 3：UI 核心全部歸位至 Freehandsss_Dashboard/
— 原因：products.js/json 是 V36 HTML 的前端快取，應與 UI 放在同一資料夾，且根目錄不應放置過多原始檔案。
— current.html 由 Fat Mo 手動上傳至 NAS，與專案路徑完全獨立，移動無風險。

***

## 🛡️ AI 授權與安全事故紀錄 (AI Safety Incidents)
> 本區專門記錄 AI 在執行中發生的「越權」、「連鎖災難」或「邏輯毀滅」事故，作為未來 AI 的黑盒子警告。

### [2026-03-30] 未授權執行架構重整 (Unauthorized Execution)
- **事故內容**：在用戶還未批核「Implementation Plan」前，AI (Antigravity) 擅自執行了 `Sync_Notion_Brain.js` 的 V2.0 升級與 `/reflect` 的更名改動。
- **違反規則**：違反「分析 → 方案 → 風險 → **批核** → 執行」之授權程序。
- **處置**：
    1.  用戶立即喝止並進行架構稽核。
    2.  於 `AGENTS.md` v1.2.1 補入「防越權護欄」強制條款。
    3.  建立本事故紀錄。
- **警示**：未來的 AI 夥伴嚴禁以此作為「反正結果是好的就沒關係」的借鏡。程序正義大於功能優化。

---

## 🛡️ AI 過失記錄（2026-06-03）— 財務規則語義誤讀事故

### [2026-06-03] 「前端利潤最高真理」語義誤讀 → B2 設計方向錯誤

**事故內容**：
AI 在 Session 56 B2 設計階段，未讀取 Finance Bible，僅依賴 AGENTS.md 第 60 行摘要
「前端利潤結算為絕對真理」，錯誤地將「確收收款（final_sale_price）不可被 n8n 覆蓋」
的規則語義，延伸詮釋為「前端 calculatePricing() 估算成本亦為 n8n 應信任的真理」。

**導致後果**：
- B2 cl-final-plan.md 中錯誤提出「n8n 信任前端四分量」設計方向
- Fat Mo 被迫花時間澄清規則原意
- 需回頭修正 AGENTS.md、Finance Bible、learnings.md

**正確語義（Fat Mo 2026-06-03 確認）**：
- 「真理」側 = 操作者手動輸入的確收金額（Deposit + Balance + Additional_Fee = final_sale_price），n8n 嚴禁覆蓋
- 成本側 = n8n 從 Supabase cost_configurations 計算，屬後台記帳估算快照
- 系統 calculatePricing() 輸出 = 供操作者參考的預算估算，非確收數字
- net_profit = final_sale_price（確收）- total_cost（n8n 估算）

**根本原因**：
AI 未遵守「缺資料先查檔案」原則（feedback_investigate_before_asking），
在有 Finance Bible 可查的情況下跳過讀取，直接基於摘要作判斷。

**處置**：
1. AGENTS.md v1.4.10：修正規則文字為「收款確收守護」，語義清晰化
2. AGENTS.md：新增 Rule 3.16（財務規則前置讀取強制律）
3. learnings.md：補入兩條嚴重過失 pitfall
4. Finance Bible：現有記錄已正確，無需修改（本次確認對齊）
5. 本事故記錄

**警示（給未來 AI）**：
財務規則在 AGENTS.md 的摘要文字 ≠ 完整語義。Finance Bible 是唯一解釋依據。
摘要「前端利潤最高真理」= 收款確收，不等於成本估算。
Rule 3.16 強制要求：財務討論第一步必讀 Finance Bible §一。

---

## [2026-06-03] B2 收尾 + migration 0027 決策

**決策**：在 Supabase `order_items` 新增四個成本分量欄位，供未來生產品需求查詢用。

**背景**：B2 Live 驗證 PASS（V47.15 吊飾運費扣減正確）。Fat Mo 確認為可持續發展應加入欄位。

**欄位清單（migration 0027）**：
- `drawing_cost    NUMERIC(10,2) DEFAULT 0`
- `printing_cost   NUMERIC(10,2) DEFAULT 0`
- `chain_cost      NUMERIC(10,2) DEFAULT 0`（吊飾頸鏈 / 鎖匙扣環扣）
- `shipping_cost   NUMERIC(10,2) DEFAULT 0`（淨運費，扣減後）

**執行時機**：下一 session，Fat Mo `/execute` 授權後執行。

---

## [2026-06-05] Session 63 — 系統知識文件化治理方案

### D1：產品定義 SSoT 新建（FHS_Product_Definition.md）

**決策**：新建 `.fhs/ai/FHS_Product_Definition.md` v1.0.0 作為 L2 產品身份 SSoT。

**原因**：唯一前任 `docs/FHS_Product_Bible_V3.7.md` 已 DEPRECATED，造成「定義真空」——AI 每次需逆向工程代碼或問回 Fat Mo 才能理解產品結構。新文件填補空缺，只回答 WHAT（身份/部位/關係/SKU/§0 狀態），禁止含成本數值或定價公式（防止職責污染）。

**架構約束**：
- 本文件只負責「這個產品是什麼」，成本問 Cost_Schema_v2，定價問 Pricing_Bible
- §0 嬰兒原則例外：必須有 decisions.md 正式批准記錄（選 Option B，非 inline 備注）

### D2：Pricing_Bible §10 改按規則 ID 可查

**決策**：§10 從「版本排序」重構為「規則 ID 排序」。

**原因**：「某條規則何時/為何/從什麼改成什麼」查不到——§10 以版本排列，要找特定規則需掃全文。改為按規則 ID 行（14 條）後，≤2 跳可查任一規則的現值+上次變更日+Session。

### D3：Rule 3.17 雙紀律強制律上線

**決策**：AGENTS.md 新增 Rule 3.17，cl-flow/execute 出口 Gate 嵌自檢兩行。

**原因**：`feedback_subagent_router` + `feedback_delivery_standards` 記憶已存在，本 session (Session 63) 仍出現 router 跳過和未驗收交付模式，純告示機制無效。升級為 harness 層強制律（三交付邊界），任務型有效驗收表防「打勾儀式」。

**記憶淨效應**：`feedback_subagent_router` + `feedback_delivery_standards` 合併 → `feedback_pre_delivery_dual_discipline`（淨 −1 條）。

### D4：/new-product 補 Step 6 知識落盤

**決策**：`/new-product` 五步流程補第六步（知識落盤），Gate 5 PASS 後強制執行。

**原因**：B4 斷點——缺 Step 6 意味著每次新產品上線後不會自動寫 Product_Definition 條目或登 Pricing_Bible §10 沿革，AI 仍需事後補救或問回 Fat Mo。Gate 6 PASS 條件：FHS_Product_Definition.md 條目存在 + database-reviewer 確認 SKU 連結真值 + §10 有對應沿革行。

---

## 2026-07-04（Session 137）— Governance 治理層建立（Fable 5 立制度 session）

### D1：新建 `.fhs/ai/governance/` 治理層（00–06 七檔）

**決策**：一次性 Fable 5 session 產出模型調度制度：[[01_diagnosis]]（token 洩漏/失焦/出錯 前三名，全部實測數字）、[[02_model-dispatch]]（指揮官不下場、派工三件套、升降級、驗證不自驗）、[[03_judgment-rubrics]]（升級/完成/問人/換路/品質底線，各附 FHS 史正反例）、[[04_delegation-templates]] 派工模板 ×5、[[05_maintenance-protocol]]（權限矩陣+輪轉SOP）、[[06_letter-to-future-sessions]]。索引見 [[00_INDEX]]。

**原因**：此後長期由 Sonnet 等級模型運作；把高階模型的調度判斷外化為可機械執行的判準。歷史 session 三大結構問題：handoff.md 121K tokens 無輪轉、主對話親自下場（Subagent ❌ 未使用為常態）、自驗豁免漂移。

**職責邊界**：AGENTS.md=業務憲法不變；governance 只管「怎麼派工、怎麼驗收」；learnings.md=業務教訓、02 §7=調度教訓，不交叉。

### D2：CLAUDE.md 重寫為「路由層」

**決策**：CLAUDE.md 從 4 條靜態指示改為：Rule 3.11 開工原則 + 治理路由表（做 X 前讀 Y）+ 三條免查紅線（禁全檔 Read / 巨檔替換三步 / 驗收不自驗）。原檔備份 `.fhs/ai/governance/backups/CLAUDE.md.2026-07-04.bak`。

**原因**：CLAUDE.md 是唯一每 session 必然載入的檔案，路由表讓弱模型知道「何時該查哪份」——歷史翻車多為不知道查哪裡，而非查了不懂。

### D3：待 Fat Mo 授權項（本 session 按授權範圍未動）

- 6 支 subagent frontmatter 釘舊模型 ID `claude-sonnet-4-6`（[[02_model-dispatch]] §0 現況表），建議更新或改繼承。
- AGENTS.md 本體未動（僅診斷）。
- handoff.md 首次輪轉屬可自行級，留給下個 session 執行（[[05_maintenance-protocol]] §4 SOP）。

### D4：Obsidian D1（Session 51）技術限制推翻 + `.fhs/` 側 wikilink 補建

**決策**：實測 `hidden-folders-access` 外掛（GitHub: dsebastien/obsidian-hidden-folders-access）白名單 `.fhs`，證實 S51 D1 認定的「dot-directory 對 Obsidian 永遠不可見」已可解除；且大檔（handoff.md 3,918 行）與多檔資料夾（lessons/ 70 檔）皆無效能問題。同步為 `docs/FHS_Knowledge_Map.md`、governance 7 檔、本檔（S51/S137 條目）、`learnings.md`↔`lessons/` 補上 `[[wikilink]]`，讓 Obsidian Graph View 對 `.fhs/` 內容產生真實關聯線（而非僅可見但零連結）。

**原因**：Fat Mo 指出 S51 方案「不健全，因讀不到 project 核心檔 `.fhs/`，根本不能構建整體視覺關聯圖」——此為推翻既有決策的正當理由（技術前提改變），非隨意重議。

**未動範圍**：D2 三層記憶職責邊界維持不變（Notion 人類真相源最高優先、AI 唯一寫入 `.fhs/memory`、Obsidian 視覺層不參與衝突解析）；只解除 D1 的技術限制認定，AI 讀寫邊界規則不變。

**風險**：外掛為第三方社群套件（非官方），若未來停止維護或行為變更，`.fhs` 可見性可能回退——不影響底層資料完整性（純顯示層），一旦異常可停用外掛或改用 [[05_maintenance-protocol]] 定義的降級路徑。

---

## 2026-07-04（Session 139）— Harness 治理硬化執行（回應 S137 D3 待授權項）

### D5：Stage A 四項裁決（Fat Mo 明確授權，AskUserQuestion 逐項確認）

- **A1 權限策略**：`bypassPermissions` → `default`（專案+全域 `settings.json` 雙檔）。**原因**：allowlist 620+197+55 條在 bypass 下形同虛設，guard hook 是唯一防線；財務生產系統值得每次寫入前多一道確認。**風險**：需重啟 session 生效，本 session 內未能驗證 allowlist 實際運作是否過嚴/過鬆，留待下次 session 觀察。
- **A2 密鑰處置**：`.mcp.json`/`settings.local.json` 明文密鑰遷入 `.env`。**執行範圍**：`settings.local.json` 冗餘 `N8N_KEY` 已移除（.env 本有同值 + dotenv 路徑已驗證不受影響）；`.mcp.json` 本體**未動**——實測 OS 環境變數層級無 `SUPABASE_ACCESS_TOKEN`，`${VAR}` 展開讀行程環境非 `.env` 檔案本身，貿然改動會打斷本 session 正在使用的 Supabase MCP 連線，列為開放待辦。
- **A3 subagent model**：回應 [[02_model-dispatch]] §0 現況表待辦，6 支 `claude-sonnet-4-6` 舊 ID 改為**刪除 `model:` 行改繼承**（而非更新為新 ID）。**原因**：釘選具體 ID 的過期問題會反覆發生；派工時用 Agent tool `model` 參數按分派表覆蓋，過期問題永久消失。同步修正 master（`.fhs/ai/subagents/freehandsss/`）+ `~/.claude/agents/freehandsss/` 共 12 檔 + 1 處 body footer stale 引用。
- **A4 AG Airtable PAT scope**：查證後**無需動作**——安全探測（PATCH 不存在 record，非破壞性）顯示 AG 手中 PAT 對 `Main_Orders` 回 403 INVALID_PERMISSIONS，證實**無寫入 scope**。原診斷疑慮（AG 可能繞過單一寫者矩陣直寫 Airtable）實測未成立，AGENTS §1.2 條文與現實一致，無需補記例外。

### D6：guard.js 補洞範圍與克制（Stage D）

**決策**：只修復已具體診斷出的 3 個缺口（matcher 缺 PowerShell/MultiEdit、Bash 不查 current.html 目標、apiKeyPatterns 缺 sbp_/eyJ），不做 P2 提出的 `guard-rules.json` 抽離重構——後者屬「錦上添花」而非本次授權範圍，且 A1 已將 allowlist 設為第一道防線後，guard 的補洞優先級隨之下修（Fat Mo A1 裁決時的原話：「guard 補洞可以做得較輕」）。

**驗證方式**：先建 `scripts/hooks/test/` 特徵化夾具對修補前行為建立基線（12組，含4項已知缺口），修補後重跑，3項known_gap正確翻轉+1項PowerShell文件記錄項升級為可執行斷言，12/12 PASS。此為本專案 guard hook 首次擁有回歸測試保護。

**完整報告**：`.fhs/reports/completion/2026-07-04_harness-hardening-execute_completion_report.md`
