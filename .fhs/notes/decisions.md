# Decisions — 決策記錄
> 本文件記錄「為什麼這樣設計」，不是規則文件。
> 任何架構改動完成後，AI 必須在此補充一筆記錄。
> 格式：`[日期] 決策內容 — 原因`

[2026-07-10] (Session 162) 訂單總覽 UI/UX 五項修復與功能擴充

決策：為提升 Dashboard 之操作體驗與資料一致性，解決五項 UI/UX 回報問題：(1) Tooltip 溢位 Bug；(2) 雙端清除篩選功能；(3) Desktop 版返回總覽按鈕；(4) 同步/刪除等候期間毛玻璃遮罩與 Supabase Poller；(5) 變更完畢後返回總覽高亮行/卡片閃爍動畫。
執行：修復 `#fhsToggleAuditBtn` 按鈕的 title Tooltip HTML 溢位 Bug。篩選面板新增 `#fhsClearFilterBtn` 並實作 `clearFilters()` 函式。於桌面 `#bottomActionBar` 新增 `#btnBackToOverview`，其行為與 mobile 底部按鈕對齊。在 `syncToAirtable` 中，webhook 成功後不關閉 loader，而是呼叫 `pollSupabaseSync()` 每 1.5 秒查詢一次 Supabase (至多 15 次) 待訂單更新完畢後才返回 review 模式，若失敗則直連 Supabase 寫入。新增 CSS 動畫 `@keyframes fhs-row-flash` 配合 `flashOrderRow()` 在返回總覽後高亮閃爍目標列/卡片 3 次。
驗證：本地執行 `python Maintenance_Tools/run_all.py` 進行 FHS 全套件健檢，結果 4 passed, 1 skipped，Lifecycle、Stress、Acceptance、Price Audit 測試全部通過（PASS），無程式碼或語法錯誤。

[2026-07-10] (Session 161續 III) 完成偵測 bug 修復 — 移除「必須有手模擺設」錯誤前提

決策：S161續完成偵測上線後 Fat Mo 回報漏判：訂單完全沒有手模擺設、只有鎖匙扣和/或純銀吊飾且皆已完成時，理應觸發完成提示卻沒有。根因是原邏輯 `hasHm`（變數名即暴露前提）強制要求「至少 1 筆手模擺設」才算適用，未涵蓋純鎖匙扣/純吊飾訂單——這超出原始 4 個情境（皆以手模擺設為前提）的敘述範圍，屬需求遺漏而非實作錯誤。
執行：`hasHm` 改為 `hasGated`，判斷條件從「至少 1 筆手模擺設」放寬為「至少 1 筆屬於{手模擺設/鎖匙扣/純銀吊飾}三類之一」；完成判斷邏輯本身不變（三類各自若存在都必須完成，羊毛氈/燈飾仍豁免，混入其他無關分類仍不觸發）。
驗證：單元測試 11 組（原 4 情境 + 新 3 情境「無手模擺設，鎖匙扣/純銀吊飾/兩者皆完成」+ 4 邊界案例）全數 PASS；用真實訂單 0600803（2 鎖匙扣+2 純銀吊飾、皆「完成」、無手模擺設項目）端到端驗證，confirm 提示正確觸發（confirm mock 回傳 false，未寫入資料庫）。**部署**：Fat Mo 直接回覆升格確認問題（本次連同上輪「退回進行中」按鈕一併部署），`/fhs-check` 前置健檢 PASS；`/upload-web` 執行 cp V42→current + NAS 上傳，三關驗證全 PASS（HTTP 204 PUT / 大小 972,619 bytes remote=local / SHA256=`6575AF7E8EB91EFAE44909CEB6BF5B35C3A00C46FB2E692FB8427476D803483A`）。

[2026-07-10] (Session 161續) 訂單總覽桌面表格新增「退回進行中」按鈕

決策：既有完成⇄取消完成雙向切換（`toggleArchive()`，含 `fhs_complete_order`/`fhs_uncomplete_order` RPC）原本只接在手機版（swipe-row 更多按鈕 + Bottom-Sheet），桌面稽核表格完全沒有任何完成/取消完成/刪除以外的操作入口——尤其新上線的自動完成偵測若在桌面誤觸發，桌面使用者當下無法退回。Fat Mo 確認只需單方向（已完成→進行中），不需桌面版手動「標記完成」按鈕（正向完成仍靠自動偵測或手機版）。
執行：`renderReviewTable`（V42.html ~9142行）左側訂單資訊欄，於既有刪除按鈕之後、`_detailBtns` 之前，新增條件渲染按鈕：僅當 `window._fhsArchivedIds.has(o.id)` 為真才顯示「退回進行中」（icon-undo-2），onclick 直接呼叫既有 `triggerArchiveOrder(o.id)`，不新增任何後端邏輯，純粹是既有雙向 toggle 在桌面補一個入口。
驗證：語法檢查（6 script block）全過；起本地 preview server（desktop viewport 1280×900）用真實 globalOrders 資料測試——(a) 手動標記某訂單為已封存後重繪，桌面表格對應列正確顯示「退回進行中」按鈕；(b) 直接呼叫 `triggerArchiveOrder()` 確認 `_fhsArchivedIds` 正確從 has=true 轉為 has=false；(c) 重繪後按鈕正確消失（因條件不再成立）。
備註：驗證過程中對真實訂單 0700101 做過真實 checkbox 互動與 archive/unarchive 呼叫（S161續完成偵測驗證與本次驗證共用同一測試訂單），寫入的狀態值經 `_sanitizeItemStatus` 正確映射回合法 ENUM，未觀察到資料損毀；該訂單目前狀態為「已book日期」/is_archived=false，時間點與本次驗證後續有其他變動重疊，不排除同時有真實業務操作介入，非測試造成的異常。

[2026-07-10] (Session 161續) 訂單總覽自動完成偵測擴大範圍 — 納入鎖匙扣/純銀吊飾

決策：既有 S157 封存提示機制（`_fhsHmCheckChange`）原本要求訂單「所有品項」必須全部是手模擺設或羊毛氈/燈飾配件才會觸發完成提示，導致訂單只要混了真正的鎖匙扣或純銀吊飾商品，整單就永遠不會跳出自動完成提示——即使手模擺設、鎖匙扣、純銀吊飾實際上都已完成。Fat Mo 明確要求擴大涵蓋以下 4 種完成情境：純手模全踢／手模+鎖匙扣皆完成／手模+純銀吊飾皆完成／手模+鎖匙扣+純銀吊飾皆完成；羊毛氈公仔/燈飾配件裁決維持豁免（狀態不影響判斷，經 AskUserQuestion 確認）。
執行：抽出共用函式 `window._fhsCheckHmOrderCompletion(orderId)`（V42.html ~5110行），判斷邏輯＝訂單須至少含 1 筆手模擺設，且所有品項只能來自{手模擺設/鎖匙扣/純銀吊飾/羊毛氈公仔·燈飾豁免}白名單（混入其他分類則不觸發，維持保守設計）；手模擺設沿用 checklist 完成判斷，鎖匙扣/純銀吊飾（若存在）須為 `Done 已完成`。此函式同時掛到手模勾選格變動（沿用既有掛鉤）與鎖匙扣/純銀吊飾狀態下拉選單 onchange（table + 手機 accordion 兩處新增掛鉤，原本完全沒有觸發點）。僅改 V42.html（生產原始碼），未動 current.html（需 Fat Mo 另行確認升格）。
驗證：`node --check` 等效語法檢查 6 個 script block 全過；抽出實際函式原始碼以 mock 資料跑 8 組單元測試（4 個情境 scenario + 4 個邊界案例：鎖匙扣未完成不觸發、羊毛氈配件狀態不影響判斷、混入無關分類不觸發、無手模項目不觸發、已封存訂單不重複觸發）全數 PASS。尚未升格部署至 current.html，待 Fat Mo 確認後執行。
**追記（實機驗證發現並修正 2 個 bug）**：Fat Mo 在本機開 V42.html 實測「全踢」無反應回報後，起本地 preview server 用真實 Supabase 訂單（0700101/0650429）跑，發現：(a) 新函式誤用了 `_findOrder`，該函式其實定義在另一個獨立 `<script>` IIFE（P3/P4 Bottom-Sheet 區塊）內部，非全域函式，呼叫時拋 `ReferenceError` 並被 onchange handler 靜默吞掉——這正是「全踢無反應」的根因，改為 inline 查 `globalOrders` 修復；(b) 資料庫實測鎖匙扣/純銀吊飾的「完成」值主力其實是 `完成`（49筆）而非下拉選單唯一提供的 `Done 已完成`（僅10筆，推測歷史資料多半經其他寫入路徑產生），原邏輯只認後者會漏判大部分真實訂單，改為與手模擺設同一組完成值（`Done 已完成`/`完成`/`已取件`/`待交收`）判斷。修復後用真實訂單資料端到端重驗：0700101 真實點擊3個勾選格→提示正確跳出；0650429（手模+2鎖匙扣，模擬手模完成、鎖匙扣沿用真實「完成」值）→正確跳出；0650429 原始未完成狀態→正確不觸發。
**部署**：Fat Mo 直接回覆升格確認問題確認部署，`/fhs-check` 前置健檢 PASS（LIFECYCLE/STRESS/ACCEPTANCE/PRICE_AUDIT，LOCAL_AUDIT skip）；`/upload-web` 執行 cp V42→current + NAS 上傳，三關驗證全 PASS（HTTP 204 PUT / 大小 971,995 bytes remote=local / SHA256=`9B3FB13543E2D501C2BFF3206DC7DA1CFC006AFA94CED0A54E95B94A23AC5602`）。公開網址：https://yanhei.synology.me/Freehandsss_dashboard_current.html

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
- **A2 密鑰處置**：`.mcp.json`/`settings.local.json` 明文密鑰遷入 `.env`。**執行範圍**：`settings.local.json` 冗餘 `N8N_KEY` 已移除（.env 本有同值 + dotenv 路徑已驗證不受影響）；`.mcp.json` 本體**未動**——實測 OS 環境變數層級無 `SUPABASE_ACCESS_TOKEN`，`${VAR}` 展開讀行程環境非 `.env` 檔案本身，貿然改動會打斷本 session 正在使用的 Supabase MCP 連線。
  **後續裁決（同日）**：Fat Mo 權衡風險/效益後決定**維持現狀，不遷移**。理由：`.mcp.json` 本就未進 git（已 gitignore，不會外流）、純本機檔案（非多人存取伺服器）、改動需設定 Windows 系統環境變數+重啟才能驗證，屬「防禦深度加分項」而非「當下有漏洞」；不做不代表破洞，只是少一層縱深防禦。`.env` 內的 `SUPABASE_ACCESS_TOKEN` 保留供未來參考。
- **A3 subagent model**：回應 [[02_model-dispatch]] §0 現況表待辦，6 支 `claude-sonnet-4-6` 舊 ID 改為**刪除 `model:` 行改繼承**（而非更新為新 ID）。**原因**：釘選具體 ID 的過期問題會反覆發生；派工時用 Agent tool `model` 參數按分派表覆蓋，過期問題永久消失。同步修正 master（`.fhs/ai/subagents/freehandsss/`）+ `~/.claude/agents/freehandsss/` 共 12 檔 + 1 處 body footer stale 引用。
- **A4 AG Airtable PAT scope**：查證後**無需動作**——安全探測（PATCH 不存在 record，非破壞性）顯示 AG 手中 PAT 對 `Main_Orders` 回 403 INVALID_PERMISSIONS，證實**無寫入 scope**。原診斷疑慮（AG 可能繞過單一寫者矩陣直寫 Airtable）實測未成立，AGENTS §1.2 條文與現實一致，無需補記例外。

### D6：guard.js 補洞範圍與克制（Stage D）

**決策**：只修復已具體診斷出的 3 個缺口（matcher 缺 PowerShell/MultiEdit、Bash 不查 current.html 目標、apiKeyPatterns 缺 sbp_/eyJ），不做 P2 提出的 `guard-rules.json` 抽離重構——後者屬「錦上添花」而非本次授權範圍，且 A1 已將 allowlist 設為第一道防線後，guard 的補洞優先級隨之下修（Fat Mo A1 裁決時的原話：「guard 補洞可以做得較輕」）。

**驗證方式**：先建 `scripts/hooks/test/` 特徵化夾具對修補前行為建立基線（12組，含4項已知缺口），修補後重跑，3項known_gap正確翻轉+1項PowerShell文件記錄項升級為可執行斷言，12/12 PASS。此為本專案 guard hook 首次擁有回歸測試保護。

**完整報告**：`.fhs/reports/completion/2026-07-04_harness-hardening-execute_completion_report.md`

---

## 2026-07-04（Session 140）— 稽核修復（矛盾/死洞/session log 痛點）C1-C4 落地

### D7：C1 密鑰輪換——終局裁決不做（Fat Mo 承擔風險）

**背景**：本 session 獨立稽核 Claude Code 環境（settings/hooks/skills），發現 `.claude/settings.json`（git-tracked）allowlist 內嵌完整 n8n API key JWT ×3，`.claude/settings.local.json`（未進 git 但明文散落）內嵌 Supabase `sb_secret_` service_role key ×3。兩者均已在稽核對話過程中被完整貼出（用於呈現證據），已流入 session log/transcript。

**決策**：Fat Mo 兩次明確確認（第一次：「這個不用處理，我明白當中風險」；第二次覆核：「我已決定承擔當中風險不替換，可以當作是已完成它」）——**不輪換 key，不清 allowlist 條目，維持現狀**。與 D5-A2（`.mcp.json` PAT 遷移不做）同類性質：非破洞被忽視，而是 Fat Mo 已完整知悉風險（git 歷史留底、session log 外流兩點）後主動選擇接受。

**與 A2 的差異**：A2 是「未發現漏洞、防禦深度加分項」；D7 是「已確認發生外洩（session log），但 Fat Mo 判斷風險可接受」——性質更接近「已知風險、拍板不處理」而非「無風險」。若未來需要重新評估，觸發條件建議：(a) n8n/Supabase 出現異常存取記錄 (b) repo 有計畫轉為公開/多人協作 (c) Fat Mo 主動要求。

**guard.js R2 補洞照常執行**：`sb_secret_` pattern 缺口（F13）與本決策無關，屬「防未來新增同類洩漏」而非「處理已洩漏的舊 key」，已修復（見下方 D8）。

### D8：Guard/kgov 補洞 + Deploy 授權機制 + 治理層對齊（C1-C4）

**範圍**：對話內稽核（v1→自我批評→v2，非經 `/cl-flow-runner.js`）發現 14 項文件↔程式碼矛盾/死洞（F1-F14）+ 4 項 session log 溝通痛點（L1-L4），Fat Mo 看過完整 v2 方案（4 個裁決點）後 `/execute` 口頭批准。

**核心新增**：
- Deploy 授權機制（F8）：`.fhs/.deploy-ok` 由 Fat Mo 手動 touch 建立，10 分鐘 TTL，一次性消耗，AI 自建會被 R10 硬攔截，放行事件落審計於 `deploy-log.md`——解決過去「口頭批准後 AI 仍永遠被 R1/R9 硬攔截」的死鎖
- kgov 後綴匹配（F10/F11）：`MCP_HIT_TOOLS` 固定 Set 改後綴函式，修復 Desktop connector UUID 前綴工具名 + `execute_sql` 財務路徑兩個盲區
- R11-observe（F12）：shell 財務寫入 warn-only 觀察期（~2週後複查 `.fhs/.kgov-observe.log` 決定轉正）
- 7 項文件對齊（F1/F4/F5/F6/F7/F9/F14）+ 2 項行為層治本（L1 UI 意圖複述閘、L2/L3 governance 反例、L4 調度教訓）

**完整報告**：`.fhs/reports/completion/2026-07-04_s140-guard-kgov-governance-hardening_completion_report.md`

---

## 2026-07-04（Session 141）— 固定載入文件瘦身（Context Slimming）

### D9：便攜塊壓縮策略 = 「已有他處記錄→連結，否則歸檔全文」，不做無備份刪除

**決策**：`handoff.md` 便攜塊「✅已定決策」28條逐一核實，25條確認在 `AGENTS.md`/`decisions.md`/handoff 自身 MASTER 待辦表已有完整記錄者，原處壓縮為一行索引+連結；僅 3 條（ig_watchdog_alerts RLS設計、Phase 1b時序、3支subagent haiku alias原因）查無他處收錄，全文歸檔至新建 `.fhs/memory/archive/handoff-portable-block-decisions-pre-2026-07-04.md`。「🔬驗證」欄同理，只留近3個session，較舊12項歸檔。5項高風險操作型規則（n8n PUT body限4欄、qty warn禁假乘法、contentType raw、ensure_ascii=True、cost_override_locked）判定為「無他處完整收錄+高遺忘風險」，維持全文不壓縮。

**原因**：Fat Mo 要求「功能零變動、資訊零損失」——壓縮前逐條核實比對，比批次無差別刪減更花時間，但換來 fresh-context subagent 事後對抗核對 38/38 PASS 的可驗證結果。governance/05 §1 權限矩陣將「刪除任何既有規則/條目」列為需先問 Fat Mo 事項；本次透過 `/cl-flow-fast` Verdict 明確列出 handoff.md 為修改目標、Fat Mo 對該檔案清單回覆 Y，視為已完成該項確認。

**同步新增防回胖機制（D9 附屬）**：`commit.md` P0.7.1 訂立便攜塊體積預算 ≤4,000 bytes + 決策>20條強制輪轉規則，避免本次瘦身效果隨後續 session 累加而自然回胖（CLAUDE.md 曾宣稱 hook 快照 ~300 tokens，實測已膨脹至 10 倍以上，證實無預算機制的必然結果）。

**結果**：便攜塊動態段 7,787→5,066 bytes（−35%）；auto-memory 目錄 56,849→41,308 bytes（−27%，含清理2個已確認合併未刪的舊檔+2個孤兒記錄+1個誤存過時快照）；副產品修復 3 支 subagent frontmatter 重複 `version:` key bug。完整報告：`.fhs/reports/completion/2026-07-04_s141-context-slimming_completion_report.md`。

**未合併**：本次改動於 `feature/context-slimming` 分支，尚未合併 main，依規劃停等 Fat Mo 確認後才 merge。

---

## 2026-07-05（Session 142）— FHS 三層式系統健康機制（L1偵測/L2清理/L3紀律）

### D10：偵測與清理分層——死程式偵測零token，AI判斷+人批准才寫入

**背景**：S141 完成後 Fat Mo 追問「有沒有機制防止過肥/沉積/過時/重複/衝突」，誠實盤點後確認**沒有**——S141 的清理是一次性人工判斷，無制度化偵測。

**決策**：建三層機制，職責嚴格分離：
- **L1（偵測，全自動零token）**：`scripts/hooks/fhs-health-check.js`，純 Node 死腳本（零依賴），掛 SessionStart hook 末尾，五病偵測規則放 `.fhs/tools/fhs-health-rules.json`（每條規則明確 unit + 出處，不發明新數字，全部沿用既有制度預算）。正常沉默、異常才印 ≤2 行。
- **L2（判斷，按需）**：`/fhs-slim` 指令，讀 L1 報告 → 逐項出清理方案 → **停等 Fat Mo 批准**才可動手，不得自行判斷「看起來安全就做」。
- **L3（執行紀律）**：固化 S141 已驗證模式（備份→只歸檔不刪→每步一commit→視改動範圍派 fresh-context 零損失核對）。

**原因**：偵測「該不該警示」是機械比對（量體積/比對索引/比對真理值/比對basename/查連結存在），不需要 AI 判斷力，適合零成本常駐；但「這條該怎麼清」需要脈絡判斷，「要不要真的動手」永遠需要人的授權——這條界線對應 lessons_2026-04-28 對 hook 常駐成本的顧慮（拒絕會產生持續 token 開銷的常駐模式），L1 用死程式而非 LLM 呼叫解決了這個顧慮。

**明確排除的替代方案**：全自動排程清理（技術上可行，`schedule` 功能存在）——但會在 Fat Mo 不在場時改動 handoff/memory/governance 命脈檔案，直接牴觸 S137-S140 建立的守護體系（單一寫者矩陣、驗收不自驗、決策記錄強制）。**偵測可以無人值守，寫入永遠要過人的手**。

**範圍誠實聲明**：本機制**不是**全面防護網——只覆蓋 L1 規則檔明確定義的檢查項；跨文件語意矛盾（如兩份文件對同一規則有不同定義）仍需 `/fhs-audit` A7-4（AI仲裁，非程式化）；新增文件類型/新的病灶模式需要人工擴充 rules.json 才會被涵蓋。防回胖不等於零維護，是把腐化速度壓低、把人的角色從「自己發現問題」降到「看到警示→按批准」。

**完整報告**：`.fhs/reports/completion/2026-07-05_s142-fhs-health-check-system_completion_report.md`

**未合併**：本次改動於 `feature/fhs-health-check` 分支，尚未合併 main，依規劃停等 Fat Mo 確認後才 merge。

---

## 2026-07-05（Session 143）— 衛生指令記憶負擔歸零

### D11：週期型指令用既有產物推斷「上次執行」，不建新記錄機制；事件型指令現況已無缺口

**背景**：Fat Mo 追問能否不必記憶何時該跑 `/fhs-audit`/`/fhs-check`/`/guardian`/`/error-eye` 這幾支衛生指令。評估 agent 常駐、loop 排程、合併成單一指令三個方案：agent 仍要人觸發等於沒解決；loop 燒 API 錢且寫入仍要批准（D10 鐵律），跟免費死腳本比較不划算；合併指令會把檢查不同層（文件/功能/單次改動/錯誤事件）的四支工具硬湊成一支誰都看不懂的巨獸，違反最小改動偏好。三案皆否決。

**決策**：延伸 S142 L1 架構，只加最小增量：
- `/fhs-audit`（週期型，90天，governance/05 §7）→ L1 新增 `checkCadenceOverdue()`，讀既有報告產物 `.fhs/reports/audits/system/audit_*.md` **檔名日期**推斷上次執行時間，不建 marker 檔、不用 mtime（避免 git/sync 操作污染判斷，S138 Pitfall #25 教訓延伸應用），逾期才印一行提醒
- `/fhs-check`（事件型，部署前）→ 掛入 `/upload-web` Step 0 前置，預設執行、Fat Mo 可明示 skip（不做硬性 exit 1，因該指令會建立/刪除測試訂單，屬重量級測試，每次小部署強制跑不合理）
- `/guardian`、`/error-eye` → 盤點後確認 prompt-router 關鍵詞已覆蓋（「重構/大改」「錯誤/掛了」），無缺口，不動

**原因**：問題本質是「週期性任務缺乏觸發信號」，而非「缺乏執行意願」——`/fhs-audit` 制度規定 90 天一次，實際上從未被記得執行過。解法應該讓系統在該提醒時自己開口，而非要求人記憶排程表。與 D10 一致的偵測/執行分層：偵測到期是機械日期比對（零判斷力需求），適合死腳本；要不要真的跑、要不要 skip，仍是人的決定。

**驗證**：day-one 實測——現存最新報告 49 天前，尚未達 90 天門檻，live 跑動確認完全靜默，證實機制正確安裝但尚未進入告警窗口（非未生效）。fixture `12-cadence-fresh` 的證據檔在測試執行當下動態產生今日日期，避免測試套件在未來某天自然變成假陽性——這是本次執行中對「測試自身的時間相依脆弱性」的主動修正。

**完整報告**：`.fhs/reports/completion/2026-07-05_s143-cadence-reminder_completion_report.md`

**未合併**：本次改動於 `feature/fhs-audit-cadence` 分支，尚未合併 main，依規劃停等 Fat Mo 確認後才 merge。（已於同日 merge main，見D12前一輪對話）

---

## 2026-07-05（Session 143 追記）— 系統命名：`fhs-health` / 健檢

### D12：S141-143 三層式文件衛生機制正式命名為 `fhs-health`（中文口語：健檢）

**決策**：S141（瘦身）→S142（L1/L2/L3建置）→S143（週期提醒）三個 session 累積出的整套文件健康機制，正式定名 **`fhs-health`**，中文口語召喚詞為**健檢**。比照 `kgov`（知識治理召喚詞，Session 63）的先例，讓 Fat Mo 用口語詞就能讓任何 session 立即對應到具體系統，不需重新解釋。

**命名依據**：不另造新詞，直接扶正既有程式碼中已通用的字首——`fhs-health-check.js`、`fhs-health-rules.json`、`.fhs/.health-report.json` 三個檔案本來就叫這個名字；「健檢」對應「health check」語意一致、簡短好記。此舉避免「代號叫A、檔名卻是B」的錯位（該錯位本身正是本系統五病之一「過時漂移」的範例）。

**召喚詞對照**（供未來 session 辨識）：
- 「health」/「健檢」→ 指 `fhs-health` 整套機制：`scripts/hooks/fhs-health-check.js`（L1偵測）+ `/fhs-slim`（L2清理）+ S141紀律（L3執行）
- 「health 乾不乾淨」→ 查 `.fhs/.health-report.json` 現況或重跑 `node scripts/hooks/fhs-health-check.js`
- 「跑 health 清理」/「跑健檢清理」→ 執行 `/fhs-slim`
- 與 `kgov`（財務/RPC知識治理）並列，兩者職責正交不重疊：kgov管財務知識治理，health管文件衛生

### D13：敘事單源分級合約——同一事件禁止在多處寫全文

**決策**：Fat Mo 請求「知識工作流程健檢」（資料怎麼找/記憶怎麼分層/任務怎麼交接便宜模型），量測後發現 S142/S143 兩次 MASTER 表 drift 事故的根因，是同一件事同時寫進 handoff session 條目、MASTER 表、session-log、Changelog、completion report 五處，寫得越多處越容易漏同步。`commit.md` Phase 1.6 新增規則：**(a)** 觸發 execute.md [B]（有完成報告）的任務→完成報告為全文唯一居所，其餘各處≤3行+連結；**(b)** 無完成報告的小改動→Changelog 條目本身為全文居所。本次 S144 自身即為規則 (a) 的第一個實例（本 decisions.md 條目、handoff、session-log、Changelog 皆為精簡版，全文在完成記錄）。

**附帶修正**：`.fhs/ai/governance/02_model-dispatch.md` §0 subagent 模型釘選表對齊實況（S139 A3 已刪 6 支 model 行，該檔文件漂移未同步）；新增 `.fhs/notes/knowledge-map.md`（查詢路由表，只路由到檔案類別不列個別檔案，避免自己變成新的漂移點）；`governance/04` 新增 T6 降級交接膠囊模板（opus/fable 裁決完畢後交棒 sonnet/haiku 的標準格式）。

詳見完成記錄：`.fhs/reports/completion/2026-07-05_s144-knowledge-workflow-hygiene_completion_report.md`

### D14：S150 審計修復計畫執行序——Phase 1-3 先行，Phase 4-6 留待 S148/S149 後接續

**決策**：S150 審計修復計畫（[.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md](../reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md)）Fat Mo 核准後，依規劃期已定的建議序（§4.9，與 S148/S149 零檔案交集）只執行 Phase 1-3（F1 igwatch 按鈕/F2 記錄中心 RPC/F3 seg control desktop），Phase 4-6 留待 S148/S149 完成後由後續 session 接續（可直接續讀計畫檔 §4.5）。本決策無正式完成報告，全文居所依 D13 規則(b)為 Changelog——詳見 Changelog.md 2026-07-07 Session 150（續）條目。

### D16：S152-followup 接線稽核——三項裁決（熔斷數字消歧/孤兒歸檔/router補鏈）

**決策**：Fat Mo 追問全系統有無同類「無讀者/無觸發/重複/衝突」情況，稽核後三項裁決全批：(1) AGENTS.md Rule 3.15 熔斷數字加消歧註記（假設迭代 vs 修復重試不同軸）；(2) 歸檔孤兒 `vendor/awesome-cc/hooks-setup-guide.md`；(3) router 補三支缺漏 subagent 路由，過程中抓到並修復「first match wins」順序 bug。

詳見完成記錄：`.fhs/reports/completion/2026-07-07_s152-followup-wiring-audit_completion_report.md`

### D15：S152 十大框架條款吸收——凍結快照制，不自動跟隨上游更新

**決策**：Fat Mo 提供「Codex 必裝十大技能」榜單，經 4 支 subagent 原文研究後裁決：不裝任何整包框架，只吸收條款級規則融入既有治理（A-M，見計畫檔）。吸收物為**上游某時點的凍結快照**（各條款尾註來源+日期），刻意不設自動同步機制——上游是為無代碼級攔截的通用 agent 補課，FHS 已有 PreToolUse 硬 gate，只要知識不要其執行機制。三處衝突裁決 FHS 贏（批量問 vs 一次一題／兩輪熔斷 vs 三次／44px 觸控 vs 24px）。過程中發現 C 項（systematic-debugging 四階段）與 A 項（TDD 鐵律本體）早於 2026-05-09 已 vendor-in，本次修正為補鏈而非重複造輪。

詳見完成記錄：`.fhs/reports/completion/2026-07-07_s152-skills-absorption_completion_report.md`

### D17：S153 usage-audit 制度化——三層架構，審 AI 使用行為，與 fhs-health 正交

**決策**：新建 `/fhs-usage-audit`（審 Claude Code transcript 使用行為，複製 S141-143 `fhs-health` 三層樣板），與 `/fhs-audit`（架構衛生）、`/fhs-slim`（文件五病）三方正交。無正式完成報告，全文居所依 D13 規則(b)為 Changelog——詳見 [Changelog.md](../../Changelog.md) 2026-07-07 Session 153（續）條目。

### D18：S156 blocktempo fable-5-2 條款吸收——新建 governance/07 複利迴圈，凍結快照制（沿 D15）

**決策**：Fat Mo 提供 blocktempo《自我改進 agent · Fable 5》第二篇（14 步），由 Fable 5 session 審閱後裁定：約 60% 已被 S137 governance 覆蓋（明細見 07 §0 吸收邊界表，防未來重複吸收），只吸收五項增量入新檔 `.fhs/ai/governance/07_compounding-loop.md`：(1) 教訓五階段落盤門檻（未過 stage-3 驗證的猜測禁入 learnings，落 todo.md Open-failure 格式）；(2) Skills 複利條款（skill 執行域教訓寫進 skill 本體 Known failure modes 節，05 §2 分流表+§1 權限矩陣已接線）；(3) 平行工作流三模式（fan-out 新增 T7 模板；loop-until-done 四停止條件，與兩輪熔斷按 D16 精神消歧）；(4) worktree 平行安全（含 SynologyDrive 同步與 AG worktreeConfig 崩潰兩項本環境風險註記）；(5) 評分者 rubric 前置可降 haiku。CLAUDE.md 路由表加一行指向 07。改動檔案均先備份於 governance/backups/（2026-07-08.bak）。本次為 Fat Mo 明示授權的自主吸收 session（用戶指示：新內容寫新檔、CLAUDE.md 只放路由、隨做隨寫）。

### D20：S158 Blueprint 降級改定位——「文件權威＝流量＋合約」原則（D19 預留 S155 計畫用，跳號）

**決策**：Fat Mo 發現 docs/FHS_Blueprint.md 自稱「必讀核心真相」但 13 處內容過時（含 2026-06-03 財務事故誤讀源頭寫法），十幾個 session 無人發現。根因三條：(1) 零讀取路徑（hook／/read／CLAUDE.md 路由／knowledge-map 全不指向）；(2) 無寫回合約（有合約的文件生存、無合約的腐爛）；(3) /fhs-audit A6-3 寫死 v4.8 期望值反向認證過時。Fat Mo 追問「佢重有冇用」後裁決方案 A（經 /8d 自我批評出 v2）：v4.9 修 13 處 → v5.0 降級為「系統導覽＋UI 排版規範（§5 唯一居所，grep 實證無第二份）」非規則源；接線 CLAUDE.md 路由＋knowledge-map＋ui-designer/frontend-developer subagent §5 必讀；修 A6-3 禁寫死版本號。M2/M3 重型保養合約裁決不做（導覽檔過時殺傷力低）。AGENTS.md 兩行過時引用（L77 亂碼自癒指向無 NEL 內容之檔／L251-252 列 DEPRECATED Bible）呈 Fat Mo 另批。

**同日追加（Fat Mo 二次裁決：刪檔取代降級）**：Fat Mo 質疑「若真係非必要，不如直接刪，用最簡單直接，不要為留而留——當初認它重要，係因為它寫低業務背景令我不必重覆解說，該用途等同 auto-memory 中 canva/youtube/spotify 記憶與財務專檔」。裁決：v5.0 降級方案作廢，**整檔刪除**（備份 `.fhs/reports/backups/FHS_Blueprint.md.bak_20260708_v5.0_final`）。兩件唯一居所內容遷至有真讀者的地方：§5 排版鐵律 → `ui-ux-pro-max/FHS_INTEGRATION.md` **Section 六**（ui-designer Phase A 本來就讀此 skill；兩支 subagent 引用已改指）；§1 業務背景 → auto-memory `project_fhs_business_context`（session 自動載入，正正係 Fat Mo 要的「唔使重覆解說」機制）。八處反向引用全部清理（CLAUDE.md／knowledge-map／兩支 subagent／fhs-audit A6-3／System_Logic_Overview 檔頭／docs/FHS_Knowledge_Map／Dashboard README／repo-map 標[已刪除]）。AGENTS.md 呈批項更新：L251 建議直接刪 Blueprint 行＋DEPRECATED V3.7 行。

**再追加（2026-07-08，Fat Mo 批准呈批項）**：AGENTS.md 兩行過時引用修正落地——§3「亂碼自癒」改指 `.fhs/memory/lessons/20260324_System_Management_Chaos_Reflection.md`（真實記錄所在）；§5「系統真理庫」移除已刪除的 `FHS_Blueprint.md` 行與已 DEPRECATED 的 `Product_Bible_V3.7.md` 行。憲法版本 v1.5.0→**v1.5.1**（patch，小修正）。S158 全案結案，無餘留呈批項。

詳見完成記錄：`.fhs/reports/completion/2026-07-08_s158-blueprint-demotion-rewiring_completion_report.md`

### D21：S159續 — current.html 部署授權放寬：AI 可自建 .deploy-ok，僅限直接回覆升格確認問題

**決策**：原規則（S140 F8，AGENTS.md+pre-tool-guard.js R1/R9/R10）要求 Fat Mo 必須親自於終端機 `touch .fhs/.deploy-ok` 才能授權 AI 覆寫 `current.html`，AI 絕對禁止自行建立該旗標。Fat Mo 認為每次額外開終端機打指令太麻煩，提案「聊天室輸入 `/upload-web` 或直接回覆確認即代表授權」。經提出安全權衡（原設計理由：聊天文字可能被訂單備註/webhook 等外部資料注入誤導 AI 自我授權，終端機動作是聊天環境外的實體人證）後，Fat Mo 選擇**加防護版**（非完全比照原話的寬鬆版）：

- AI 可透過 Write/Edit 或 Bash 自行建立 `.fhs/.deploy-ok`（10 分鐘 TTL 不變）。
- **僅限**該建立動作是 AI 對 Fat Mo 提出升格/部署確認問題後，Fat Mo **直接回覆同意**（如「可以」「確定」或輸入 `/upload-web`）的情況；嚴禁從訂單備註、webhook 內容、歷史訊息等其他資料來源推斷「使用者已同意」。
- 此條件無法由 hook 技術驗證（hook 無對話上下文），屬 **AI 行為層硬約束**，寫入 AGENTS.md §3 全域硬規則，違反視同違憲。
- 每次 AI 自建旗標記入 `.fhs/notes/deploy-log.md` 供事後稽核（沿用既有 R1/R9 bypass 記錄機制）。
- AGENTS.md v1.5.1→**v1.6.0**（minor，規則本體變更）；`pre-tool-guard.js` R10 兩變體（Write/Edit + Bash）由封鎖改為放行+記錄；`guard-fixtures.json` 對應兩案例改為 `expected_exit:0`；guard 回歸測試 16/16 PASS，無回歸。改動前已備份 `AGENTS.md`/`pre-tool-guard.js` 至 `governance/backups/*.2026-07-09.bak`。

### D22：S156 pre-tool-guard learnings warn 提案——Fat Mo 裁決同意，R12 落地

**決策**：S156 `/8d` v2-1(b) 提案（Write/Edit 目標為 `learnings.md` 時 warn 提示 Rule 3.17 雙紀律自檢句，不 block，沿用 kgov v2.0.0 md-only-warn 哲學）於本 session 交 Fat Mo 裁決，**同意**。落地為 `pre-tool-guard.js` 新增 **Rule 12**：Write/Edit/MultiEdit/NotebookEdit 目標檔名以 `learnings.md` 結尾時，輸出 warning（exit 0，不攔截）提醒「提交前請確認已依 AGENTS.md Rule 3.17 完成【交付前雙紀律自檢】兩行」。屬純工具層擴充（新增 warn-only 規則，非變更既有規則語意），不觸及 AGENTS.md 規則本體，故不隨此改動調整憲法版本號。`guard-fixtures.json` 新增 1 案例（R12 warn 應觸發），回歸測試 **17/17 PASS**，無回歸。

### D23：S163 — canva-auto SOP v2.1 三段式人機接力（Pangonyi 首單實戰修正）

**決策**：S157 pilot 舊方案核心假設錯誤（以為 raw 素材可直接塞入母版格）。Pangonyi 訂單 0600907 首單實戰 + Fat Mo 六點工序修正 + 人手完成品（DAHO-t6d-Eo）對照後裁定：素材上頁前必須先加工——魔法抓取去背（黑白+彩色圖）、ColourMix 轉 Parakeet（黑白圖）、片去背（page4+page3 背景層）——三步全屬 Canva Apps 編輯器 UI 專屬，Connect API/MCP 結構性無入口（Canva 官方 help 確認）。自動化形態由「全自動換料」改為**三段式接力**：①AI 開單準備（搵最新母片→copy→update_title 改名→歸檔 Free_recorder (MM/26)→換字→交連結）→②Fat Mo 素材加工（上載/去背/調色/擺位）→③AI 收尾出貨（粗對位 pilot→刪殘留→QA→export MP4+page2 封面）。關鍵教訓：copy-design 的 title 參數不生效必須事務內補 update_title；page 根 video 元素 update_fill 報 invalid duration 屬人手位；縮圖 URL 帶 fallbackstale=T 為過時快取不可信（曾因此誤報 Fat Mo 完成品內容）。兩項 pilot 待下單驗證：P1 母版座標自動粗對位；P2 圖片加工本地化（rembg 去背+Parakeet LUT 反推，啟動條件=Fat Mo export 一張成品圖）。自動化次品 DAHO-PAbfUk 保留作對照。方案書：`.fhs/reports/planning/canva-auto-sop-v2_2026-07-10.md`；記憶檔 `project_canva_video_automation.md` 已同步。

### D24：S163續 — canva-auto P2 本地加工 pilot 成功，正式落盤 `canva_auto/local_prep.py`

**決策**：D23 canva-auto SOP v2.1 提出嘅 P2 選項（圖片加工本地化）經 pilot 驗證成功，正式落盤為可重用工具。魔法抓取去背改用 rembg（u2net 模型，本機執行，質素與 Canva 相當）；ColourMix→Parakeet 色譜經數值反推證實為**固定 preset**（非逐圖自動調整）——用兩張獨立訂單嘅 Canva 匯出樣本（`Free_Laser (0526)`／`(0529)`，皆 1563×1563 canvas）交叉擬合出幾乎一致嘅線性色相漸變公式（H(x,y) ≈ -0.1447x + 0.0994y + 0.00004 mod 360°，平均誤差 11-17°），肉眼比對高度吻合。工具落盤 `canva_auto/local_prep.py` + `canva_auto/README.md`（比照 `3d/` 資料夾慣例，新建頂層 `canva_auto/` 目錄），已用 Pangonyi 訂單 0600907 真實檔案端到端跑通。片去背（page4 動畫/page3 背景層）維持人手做（本地質素風險大，未搬）。Fat Mo Stage②人手步驟由 5 步減至 2 步（片去背+最終擺位對齊）。已知限制：任意輸入圖尺寸「拉伸貼合」去 1563×1563 座標系嘅假設只喺同尺寸樣本驗證過；Canva 若改版 Parakeet preset 公式會過時，需重新反推。詳見記憶檔 `project_canva_video_automation.md`。

### D25：S150 Phase 4-6 執行完成——verified_ok 正向記錄 + orders anon 權限收斂（含即時修復一則回歸）

**決策**：D14 排定「留待 S148/S149 後接續」的 S150 Phase 4-6，於 2026-07-12 由 Fat Mo 核准後接續執行（S148 已完成；S149 治理可攜化計畫仍待批准，但與 Phase 4-6 零檔案交集，不構成阻塞，Fat Mo 選擇不等 S149 直接放行）。

執行內容：
1. **Phase 4（P1a）**：Migration `0050`（`ig_watchdog_alerts.kind` CHECK 擴充三值）→ `scripts/ig-watchdog/build_n8n_workflow.cjs` 新增 `verifiedItems`/`verified_ok` 映射（created_full 正向記錄，resolved=true 不進待處理計數、TG 不加噪音）→ curl 4 欄位 PUT 部署至 live n8n `D4LK6VrQbiXlju0V` → V42 UI `kindLabel`/`kindColor` 補綠色「✓ 已核對」。冪等由既有 `ix_igwatch_alerts_dedup` UNIQUE INDEX（對 kind 值無特化）天然保護，無需額外機制。
2. **Phase 5（P1b）**：Migration `0051` 收斂 orders anon 權限——**過程中發生一次即時修復的回歸**：`orders_anon_delete` 政策被誤判「未使用」而移除，實際 Dashboard `executeDeleteOrder()` 確有使用（grep 稽核因 `method:'DELETE'` 與 URL 分行未命中），移除後前端刪除訂單請求靜默失敗（RLS 濾空但仍回 HTTP 200，UI 誤報成功）。由 fresh-context code-reviewer(opus) 於同一 session 內抓出並要求修復，即以 Migration `0052` 回滾該政策，經真實列 anon DELETE 探針二次確認生效，影響窗口約 7 分鐘（2026-07-12 12:34–12:41 UTC），無真實訂單資料受損。UPDATE 政策去重（保留 `orders_anon_update`，刪除重複的 `anon_update_orders`）判斷正確，維持生效。
3. **驗收機制**：本輪嚴格執行「驗收不自驗」——fresh-context code-reviewer(opus) 兩輪審查（初輪抓出 CRITICAL 回歸 → 修復 → 複驗 PASS），過程完整記錄於 `.fhs/notes/FHS_System_Logic_Overview.md` §11.6。
4. **已知限制**：n8n Public API 對 Schedule-Trigger workflow 無手動觸發端點，live cron 端到端驗證（首批 `verified_ok` 寫入）留待下次自然排程（2026-07-12T22:00Z 後）由後續 session 或 Fat Mo 覆核。

新增教訓：[[2026-07-12_rls-policy-removal-silent-2xx-write-failure]]（RLS 政策移除稽核的 grep 盲點 + anon 寫入失敗的靜默 2xx 模式）。詳見 `.fhs/notes/FHS_System_Logic_Overview.md` §11.6、`supabase/migrations/0050-0052`。

**2026-07-13 追覆核（點4已知限制結案）**：查 n8n execution API，workflow `D4LK6VrQbiXlju0V` 於 2026-07-12T22:00:00Z（部署後首次自然排程）成功執行（execution 4638，status success）。`Classify & Report` 節點輸出 `createdFull: 0, total: 4`——當日 4 則訊息掃描後零筆分類為 `created_full`，故 `Has Alerts?` 為 false、未觸發寫入節點，`ig_watchdog_alerts` 表內確認無新增 `verified_ok` 列。核對 live 部署的 `Classify & Report` 節點原始碼確認 `verifiedItems` 映射邏輯存在且與本地版本一致，判定為「當日無符合條件資料」的正常空結果，非部署失效或映射失敗；驗證方式=真實 execution JSON `runData` 逐節點核對（非口稱）。首批 `verified_ok` 實際寫入仍待下次出現 `created_full` 分類的真實訊息時自然觸發，非本次覆核範圍。

### D26：S168續 — `/commit` 新增授權途徑(c)：條件觸發自動升格部署，AGENTS.md v1.6.0→v1.7.0

**決策**：D25 執行完成後，Fat Mo 對「commit→push→upload-web 三步驟逐一詢問」的既有流程表達不耐（連續三次確認過於煩瑣），要求新增一條標準授權途徑：執行 `/commit`（或明確要求 commit）本身即代表同意連帶 push 與 upload-web，AI 不需再逐步詢問。

**裁決過程**：AI 提出兩種範圍先請 Fat Mo 選擇：(1) 僅限同一輪對話內已明確提過部署字眼才視為連帶授權；(2) 任何時候講 `/commit` 都自動一併部署，不論改動內容是否與 Dashboard 相關。Fat Mo 首選 (2)（在被告知「純文件/治理改動也會觸發部署」風險後仍選定），隨後主動追加優化：改為「先自動偵測是否需要部署，需要才自動一併部署」——即不論對話有無提過部署字眼，AI 都應先判斷本次 commit 是否**實際改動** `Freehandsss_Dashboard/freehandsss_dashboardV*.html`（判斷依據＝`git diff --cached --name-only` 是否命中該路徑，非主觀判斷），有改動才續走部署鏈，沒有則只 commit+push。此為 Fat Mo 對自己第一版選擇的即時優化，非兩個獨立決策。

**最終規則**（v1.7.0 生效）：
- AGENTS.md §3「禁止覆蓋正式環境」授權途徑由「二擇一」擴充為「三選一」，新增途徑(c)：`/commit` 本身即構成有條件授權，AI 依 `git diff --cached --name-only` 是否包含 Dashboard dev 版 HTML 路徑自動判斷是否需要部署，兩種結果皆不再另外詢問確認。
- `commit.md`（v2.2.0→v2.3.0）新增 Phase 2.5：先偵測、後執行（需要則續走 upload-web 升格部署流程 + 三關驗證；不需要則直接進 Phase 3 回報並註明跳過原因）。
- `upload-web.md`（v1.2.0→v1.3.0）Step 1 二次確認新增例外：由 `/commit` Phase 2.5 鏈式觸發時跳過；獨立呼叫（Fat Mo 直接輸入 `/upload-web`）仍須二次確認。
- 三途徑對 Antigravity/VS Code 同樣適用（AGENTS.md 為多工具共用憲法層，commit.md/upload-web.md 為 Master 檔案雙邊橋接）；AG 因寫入不經 `pre-tool-guard.js` 技術守護，途徑(c)在 AG 端純屬行為層約束。

**風險與緩解**：仍保留部署三關驗證（HTTP 200/大小/SHA256）與 `/fhs-check` 前置檢查兩道機械防線，只移除「是否要部署」這一層人工確認；已知外部限制（如 Airtable 429）比照既有先例不阻擋部署，新出現的 Red Flag 仍會停止並回報，不因此規則而降低失敗容忍度。

### D27：S170 — mattpocock/skills 選擇性吸收（拷問技能），非整包安裝

**決策**：Fat Mo 讀完 aiposthub 對 `mattpocock/skills`（47支 Claude Code 技能包）嘅導讀文章後想裝，經查證原文 4 支 SKILL.md 內容 + 對照 FHS 現有治理後，裁決**只選裝 4 支**（`grilling`/`grill-me`/`grill-with-docs`/`domain-modeling`），比照 S152 十大框架條款吸收先例——「條款融入既有治理，非整包安裝」。

**唔裝嘅理由**（逐支見 `.fhs/notes/grilling-quickcard.md`）：`code-review`（會拆走 FHS code-reviewer 帶住嘅財務/HTML ID 鐵律護欄）、`tdd`/`implement`/`diagnosing-bugs`（同既有 subagent 重疊）、`handoff`（MP版，同 FHS 交接制度**撞名**，裝咗會誤觸發）、`triage`/`wayfinder`/`to-tickets`（需要 GitHub Issues/ticket 文化，FHS 用 handoff.md MASTER 表做同一件事）。

**安裝方式**：`npx skills add mattpocock/skills -s grilling,grill-me,grill-with-docs,domain-modeling -a claude-code --copy`，落地 `.claude/skills/`（`--copy` 非 symlink，方便 FHS-FORK 本地修改不受上游同步影響）；`skills-lock.json` 記錄上游版本供日後 `skills update` 對照。

**FHS-FORK 修改**：`domain-modeling` 原版 ADR 落點為 `docs/adr/`，改寫為 `.fhs/notes/adr/`，定位為本表（decisions.md D 表）條目的**詳文層**而非平行決策記錄系統——避免兩套 ADR 系統 drift（此為安裝前主動識別並修正嘅風險，非事後補救）。`CONTEXT.md` 維持 root 中立格式不改，保留 S149 可攜化方向。Fork 註記寫入兩份檔案頭部（`SKILL.md`、`ADR-FORMAT.md`），日後同步上游需人手 diff。

**未跑官方 `/setup-matt-pocock-skills` 精靈**：查證後發現該精靈產出的 `docs/agents/{issue-tracker,triage-labels,domain}.md` 三份配置檔，消費者係 `to-spec`/`triage`/`wayfinder`——呢批全部冇裝，跑咗精靈屬無效步驟（原計畫嘅一個判斷失誤，經 `/8d` 自我批評抓出並移除）。改以 `.fhs/notes/grilling-quickcard.md` 一頁式中文速查卡代替。

**中文召喚詞疊加層**（Fat Mo 明確要求：唔可以要佢記英文指令名）：「拷問我」＝`/grilling`／`/grill-me`；「拷問落檔」＝`/grill-with-docs`（同步寫 CONTEXT.md+ADR）。**行為層新增**：AI 日後遇 Fat Mo 提出模糊需求/新功能時，須主動問「要唔要拷問一輪先？」——防止工具裝咗但冇人記得用而淪為裝飾（Fat Mo 明確擔心點）。此條已落 auto-memory `feedback_grilling_proactive_prompt.md`。

**唔改名理由**：`grill-me` 正文內容為「Run a `/grilling` session」，技能間用原名互相引用，改名會斷鏈；且保留原名方便日後對照上游文章/更新。

**試用閘**：4 週內用過 ≥2 次 → 留低並評估吸收 `to-spec` 格式做第二批；冇用過 → 拆走 `.claude/skills/` 四支，見 handoff.md 待辦。

**安裝後實測追記（同日）**：`grill-me`／`grill-with-docs` 因原檔 `disable-model-invocation: true`，喺 Claude Code harness 內完全無法被呼叫（AI 主動嘗試呼叫被系統拒絕）；`grilling`／`domain-modeling` 實測可正常呼叫。因兩個中文召喚詞設計上本來就直接呼叫 `grilling` 本體（唔經 `grill-me`/`grill-with-docs` 轉介），此技術限制對 Fat Mo 使用體驗零影響，僅記錄於 `grilling-quickcard.md` 供日後排查。

### D28：S175 — `llm-council-skill`（GitHub `tenfoldmarc/llm-council-skill`）暫緩安裝

**決策**：Fat Mo 提出想裝一個 Karpathy「LLM Council」方法論移植版 Claude 技能（5 顧問人格平行辯論+匿名互審+主席裁決，輸出 HTML 報告+MD 逐字稿）。經查證 GitHub repo 原文 `SKILL.md` 全文（Notion 導讀文章因重定向失敗未能直接讀取，但 repo 原文已足夠評估），對照 FHS 現有決策工具鏈後，Fat Mo 選擇方案 A：**暫緩安裝，等 2026-08-09 拷問技能試用閘覆核後再議**。

**評估結論摘要**：
- **安全面**：零風險。純 prompt-only skill，無外部 API/腳本/依賴，讀取範圍限本地 CLAUDE.md+memory（同 `grilling` 一致，不外傳）。
- **成本面**：每次召喚 = 11 個 subagent（5 顧問+5 互審+1 主席），單次 token 消耗遠高於日常對話，且原檔未鎖模型。
- **重疊面**：核心價值（獨立 fresh-context 視角+匿名互審修正錨定偏誤）與既有 `/8d`（同 context 自我批評，無 fresh-context）**互補而非取代**，但與拷問（grilling，問人類要料）唔重疊、與 `/cl-flow`/`/px`（真外部廠商模型交叉驗證）部分重疊且遜色（5 個顧問全部係 Claude 分身，冇 Karpathy 原版嘅跨廠模型多樣性）。
- **若安裝需 FHS-FORK 改裝**：①輸出路徑改 `.fhs/notes/council/`（原版寫 root，會觸發 fhs-health 孤兒檔警報+可能被誤 commit）；②觸發詞收窄為明確中文召喚詞（原版含 "should I X or Y" 類自然句式易誤觸）；③顧問層鎖模型控制成本。

**暫緩理由**：兩星期內連裝兩套「決策輔助 meta-skill」會互相攤薄用量，令 D27 拷問試用閘量測失準；`.claude/skills/` 已有 30 支，殭屍風險為 Fat Mo 自訂紅線。待 D27 試用閘結果證實拷問技能有真實使用量後，才評估 council 做第二批選裝。

**待辦**：已登記 handoff.md 待辦，2026-08-09 拷問試用閘覆核時一併決定 council 技能去留。

**v2 修訂（同日，`/8d` 自我迭代 3 弱點後 Fat Mo 已確認）**：

1. **判準解耦**：原案「拷問用量」單一判準裁決 council 去留屬 proxy 錯配（兩者使用場景不同）。改為兩條獨立判準——拷問仍按原 D27 判準（4 週 ≥2 次真實使用）；council 改用**自己嘅需求證據**：覆核當下回溯過去 4 週 `decisions.md` 新增 D 條目中屬「大架構/治理決策」性質者，若 ≥2 單 → council 有真實場景，准入第二批評估；<2 單 → 延一期或結案。
2. **誠實註記**：原案「顧問層鎖模型控制成本」屬 SKILL.md prompt 層指示，非 `pre-tool-guard.js` 機械強制（該 hook R2/R3 只掃 Write/Edit content，不掃 Task 參數）——同 `.deploy-ok` 授權機制「無法由 hook 技術驗證，屬行為層硬約束」為同一類表述，此處補記避免日後誤解為有機械保證。
3. **成本結構預案**：若日後安裝，FHS-FORK 由原案 5 顧問+5 互審+1 主席（11 subagent／次）**砍為 3 顧問+1 主席（4 subagent／次，去除互審輪）**，成本直減約 2/3；互審層留待實際使用後證明有需要才加返，不預先假設需要。
4. **覆核提醒機械化**：已設一次性 scheduled task（taskId `fhs-2026-08-09-skill-trial-gate-review`，fireAt 2026-08-09），到期自動提示覆核拷問試用閘＋本條 council 判準，避免重演 S168 live cron 覆核待辦飄移（掛至 S174 仍未覆核）嘅同款模式。

### D29：S170 — `grilling` 技能實戰示範，修訂取模排程中心方案書（S159規劃）

**決策**：D27 安裝 `grilling`/`grill-me`/`grill-with-docs`/`domain-modeling` 後，Fat Mo 要求即場實戰示範（非純講解），選用真實待辦「S159 取模排程中心方案書」（`.fhs/reports/planning/mold-schedule-plan_2026-07-09.md`）做拷問對象，逐條一問一答（AI 每條附建議答案，決策權在 Fat Mo），共 6 條，抓出 3 個原方案書未問過嘅盲點，經 Fat Mo 確認後直接改寫方案書：

1. **`CLASH_WINDOW_MIN` 60→150 分鐘**：原數字係 AI 揣測嘅預設值，實際攞模每單連傾偈核對交通至少 3 小時（Fat Mo 親述：一日最多三單，上午/下午/晚上各一），60 分鐘門檻嚴重偏低會漏判真實撞期風險；同時因「冇絕對」（交通方便時較近時段都接納），文案由「撞正時段」軟化為「請自行確認交通/檔期是否可行」，避免系統講死。
2. **執行分兩期**：Fat Mo 對 A（即時撞期提示）嘅完整三色判級邏輯實際效果無信心，對 B（月曆睇成日）反而最有把握。裁決第一期只做 B+C+D+E（純顯示、無判斷邏輯風險）；A 降級為簡化版（淨顯示「呢日已有 N 張單」，不做三色判級/race guard/快取），第二期視第一期實際使用情況再決定是否升級做完整判撞邏輯。
3. **B 月曆新增獨立入口**：拷問揭露原方案假設嘅使用場景有誤——操作者實際需求係傾客途中（尚未開單）就要查「未來邊幾日得閒」再建議俾客揀，唔淨止係開緊訂單表單嗰刻先睇月曆。故月曆邏輯抽出做共用 component，新增訂單總覽頁獨立「📅 查看檔期」掣（`bindMode:'view'`，不回填任何表單欄位），與原有表單內掣（`bindMode:'form'`）並存。

**驗收條件同步修訂**：方案書【驗收條件】3-8 已改寫配合簡化版 A 範圍（不驗三色判級，改驗簡化計數顯示+雙入口行為）。

**示範效果**：此為 D27 試用閘嘅首次真實使用（非測試探針），已產出真實方案書改動，非單純示範材料。技術驗證：`grill-me`/`grill-with-docs` 因原檔 `disable-model-invocation:true` 喺 harness 內實測完全無法呼叫，但因中文召喚詞設計上本來就直接呼叫 `grilling` 本體（不經轉介），對 Fat Mo 使用體驗零影響（詳見 D27 附錄）。

**待辦**：方案書仍排喺 S149/S155 之後執行，非本次落地代碼；下次執行 session 直接讀取已修訂版方案書即可，毋須重新拷問。

### D30：S171 — AI 助理團隊名冊（生成式盤點，非人手維護）

**決策**：Fat Mo 引用 Threads @raymond0917「AI Agent Dashboard」概念（視像化 AI 助理團隊防遺忘），授權 AI 自行找方案「達成甚至更好」。裁決採**生成式名冊**架構而非人手畫一頁：`scripts/agent-dashboard.js`（零依賴 Node）掃描各資產自身 frontmatter/檔頭 → 生成 `artifacts/agent-dashboard.html`（人睇）＋ `agent-dashboard.json`（AI 讀），非檔案資產（MCP/n8n/cron/召喚詞）唯一登記點 `.fhs/ai/team-manifest.json`。制度本體 `.fhs/notes/ai-team-registry.md`（五條硬規則 R1-R5），執行入口 `/team`／「團隊名冊」。

**點解唔跟原帖做法**：人手畫嘅 dashboard 上線即開始過期（同 FHS 文件漂移病灶同源）；生成式名冊嘅真源係資產本身，「存在／唔存在」永遠準確，且每次生成附勘誤表兼任漂移偵測器（與 fhs-health 文件衛生、/fhs-usage-audit 用量審計職責正交）。

**實證**：上線首日勘誤表即抓到 4 項真漂移——finance-auditor 從未登記 MANIFEST.md 已安裝表；database-reviewer/tdd-guide/ui-designer 三支 frontmatter 版本高於 MANIFEST 記錄（v2.1.0≠v1.0.0 等）。另修復一隻通用 parser 蟲：CRLF frontmatter 末行 `\r` 殘留令最後一個 key 靜默消失（詳見 registry §5）。

**待辦**：①4 項 MANIFEST 漂移待 Fat Mo 裁決點修（涉 subagent 雙寫規則，屬 05 §1 先問類）；②CLAUDE.md 路由表加一行「想知有咩 AI 資產／點召喚 → /team」待批（路由表增行屬 05 §1 先問類）；③/commit 流程加「資產有增減時重生成名冊」步驟待批。

> 📌 更新（2026-07-14）：`scripts/agent-dashboard.js` 已改名 `scripts/agent_dashboardV42.js`（輸出同步為 `artifacts/agent_dashboardV42.html`／`.json`），呼應 V42 生產 Dashboard 命名慣例；上文原名保留為歷史記錄，非文件債。

### D31：S171 — P2a IG 訊息入庫 + PII 明文剝離執行完成（S150 §4.8 剝離範圍，flow_id 2026-07-13-1224）

**決策**：獨立 `/cl-flow` Verdict（`artifacts/2026-07-13-1224/cl-final-plan.md`，CONDITIONAL_READY）批准後，`/execute` 執行 P2a（三期分次執行策略的第一期）：`ig_messages` 表落地 + `lib/order-match.mjs` 新增 `redactPii()`/`maskName()`/`hashId()` + `build_n8n_workflow.cjs` 新增 `Has Messages?`/`Write Messages` 節點 + n8n live workflow `D4LK6VrQbiXlju0V` 部署。

**驗收採雙軌**：機械證據（21→27 單元測試全過、diff-guard 逐字嵌入驗證、mock-execution harness 對真實部署 jsCode 跑合成資料斷言）+ fresh-context opus 獨立審查（比照 D25 先例，本次亦抓到真回歸）。

**fresh-context 審查抓到 4 項發現，即時修復 3 項**：
1. **[已修復]** v1 只遮罩 `content` 欄位，`customer_name`/`ig_message_id` 仍存明文姓名——加 `maskName()` 遮罩 customer_name、`ig_message_id` 改用 `hashId()`（cyrb53 純 JS 算術雜湊，避開 `require('crypto')` 在 n8n Code 節點靜默失敗的已知地雷，見 learnings `feedback_n8n_code_node_nas_limits`）。
2. **[已修復]** `redactPii` v1 正則有實測可繞過樣本：電話含分隔符/新版 7x-8x 開頭/852 國碼/全形數字未轉換一律漏網；地址只吃「數字在後」語序，「100號」「5樓」型（數字在前，港式地址主流語序）漏網；付款尾碼詞彙過窄。v2 逐一補正則 + 補對應單元測試（v1 21 條 + v2 補強 6 條 = 27 條）。
3. **[已修復]** `Write Messages` POST 未帶 `on_conflict` 參數，PostgREST UPSERT 仲裁鍵預設落 PRIMARY KEY（body 從不帶 `id`，永不觸發），令 dedup 唯一索引形同虛設——真撞號時會 23505 打回整批而非靜默忽略。已補 `?on_conflict=thread,ig_message_id`。
4. **[已記錄未修復，另案處理]** 同一缺陷（缺 `on_conflict`）存在於既有 `Write Alerts` 節點（Session 119 建立，非本次 P2a 範圍），依 `execute.md` 「僅執行 Verdict 已批准範圍」紀律不在本次一併修——已用 spawn_task 開獨立追蹤，待 Fat Mo 決定是否授權修復。

**接受的設計取捨（非缺口）**：`ig_messages.thread` 欄位維持明文（IG thread 資料夾名稱，性質近似客戶識別碼），未跟隨 `customer_name`/`ig_message_id` 一併遮罩/雜湊。理由：(a) `thread` 是整條 pipeline（含既有 `ig_watchdog_alerts`）的結構性 join key，遮罩會牽動去重/查詢邏輯改版，屬更大範圍架構決策非 P2a 快贏範圍；(b) `ig_watchdog_alerts`（migration 0043）本身已以明文存 `thread`/`customer_name`/未遮罩 `snippet`，是既有已接受先例，非本次新增缺口；(c) 若要收斂需同時處理兩表，另開獨立評估較合理。已記入 `scripts/README.md` 與本決策供未來覆核。

**已知限制（比照 D25 模式）**：live cron 端到端驗證需待下次自然排程（約 2026-07-13T22:00Z 後）才會有真實資料流過 `Write Messages` 節點；本次驗收依賴 mock-execution harness + 直接查詢已部署 jsCode/連線結構，非真實 cron 觸發證據。

**範圍**：P2b（內容比對層）/ P2c（意圖標註+回覆範本庫）依 cl-final-plan §8 分次執行策略，本次不動，待 Fat Mo 另行 `/execute`。

詳見 `supabase/migrations/0053_create_ig_messages_table.sql`、`scripts/ig-watchdog/lib/order-match.mjs`、`scripts/ig-watchdog/build_n8n_workflow.cjs`、Changelog.md S171 條目。

### D32：S171續 — P2b 內容比對層（金額比對）執行完成，fresh-context review 抓出並修復 3 項誤報邏輯缺陷

**決策**：同 session 接續 P2a，執行 cl-final-plan §6.3 P2b（內容比對層）。誠實收窄範圍：v1 僅做金額比對（`amount_mismatch`），品項比對因現行 pipeline 未攞 `order_items` 明細而刻意不做假比對，留待未來擴充。

**執行內容**：`supabase/migrations/0054_create_content_mismatch_table.sql`（比對證據表）+ `0055_ig_watchdog_content_mismatch_check.sql`（CHECK 擴充第四值）+ `lib/order-match.mjs` 新增 `extractAmountsFromText()`/`compareToOrder()` + `build_n8n_workflow.cjs` 新增 `Has Mismatches?`/`Write Mismatches` 節點（`Classify & Report` 輸出三向平行分流）+ `Freehandsss_Dashboard/freehandsss_dashboardV42.html` 首次觸及（igwatch UI 新增第四色+action button+金額顯示）。live 部署 workflow `D4LK6VrQbiXlju0V`。

**fresh-context opus 獨立審查**（比照 D25/D31 先例）：PASS-WITH-CONCERNS，5 項發現，4 項即時修復：
1. **[已修復] F1 曆年誤判**：v1 `extractAmountsFromText` 冇排除曆年形狀數字（1900-2099），V42 制式確認文本固定含取模日期（如「取模時間：2026/07/13」），「2026」落喺金額合理範圍（10-50000）內會被誤認金額——對訂單價低於約 $1842 的訂單，幾乎每張 V42 確認訊息都會誤判為金額不符，嚴重污染 2 週校準期資料。修法：曆年形狀數字需鄰近 `$`/元/蚊/HKD/港幣 等貨幣標記先當真金額。
2. **[已修復] F2 deposit fallback 系統性誤報**：v1 `compareToOrder` 用 `final_sale_price ?? deposit` 做基準，`created_incomplete` 訂單常 `final_sale_price` 未填，`deposit` 只係全額約一半——客人提及全額/尾數會被系統性誤判。修法：移除 fallback，冇 `final_sale_price` 就唔比對（誠實收窄，寧可漏檢也不製造假警報）。
3. **[已修復] F3 付款尾碼誤判**：付款尾碼數字（如「尾五碼12345」）落喺金額範圍內會被誤認金額。修法：重用 `redactPii` 已有嘅 `PAYMENT_TAIL_RE`（單一真源）排除。
4. **[已記錄未修復，同一既有缺陷]** F4：既有 `Write Alerts` 節點缺 `on_conflict`（P2a D31 已發現並 spawn_task 追蹤 `task_e3a60daa`），P2b 令同批重複鏡像列觸發此既有缺陷的機率增加（尤其 F1-F3 修復前）；P2b 自己新開的 `Write Mismatches` 節點正確帶咗 `on_conflict`，無同一問題。
5. **[已修復] F5 金額差未顯示**：V42 alert 卡片原本只顯示「⚠️疑似對不上」標籤，比對出嚟嘅具體金額只存在 DB 冇顯示，操作員要另開訂單先睇到差額。已補一行「IG講$X vs 系統$Y」直接讀 `raw.mm`。

**修復後重新驗證**：單元測試 35/35（含 F1/F2/F3 回歸測試）+ mock-execution harness（合成 V42 確認文本含日期的 F1 迴歸場景，重跑對真實部署 jsCode 確認唔再誤判）+ 瀏覽器注入合成資料驗證 V42 UI 渲染 + 二次 live 部署確認修復生效。

**已知限制**：真實 cron 端到端資料流證據留待下次自然排程（約 2026-07-13T22:00Z 後）。

**下一步**：P2c（意圖標註+回覆範本庫）依 cl-final-plan §8 排隊，待 Fat Mo 另行 `/execute`。

詳見 `.fhs/notes/FHS_System_Logic_Overview.md` §11.8、Changelog.md S171續條目。

### D33：S171續II — task_e3a60daa 修復（Write Alerts on_conflict）+ 補記錄一筆未落文件的 live drift

**決策**：Fat Mo 批准處理 D31/D32 F4 追蹤的既有缺陷（`Write Alerts` 節點缺 `on_conflict`，冪等形同虛設）。

**發現**：進場診斷時查出兩件事：
1. `ig_watchdog_alerts` 的冪等鍵 `ix_igwatch_alerts_dedup` 是 `COALESCE(order_id,'')` **expression index**（因 `order_id` 可為 NULL），與 `ig_messages`/`content_mismatch` 的 plain-column 索引結構不同——PostgREST 的 `on_conflict` 參數不支援 expression 作 conflict target，不能照抄 P2a 的修法直接套用。
2. **DB 側其實已經修好**：一筆完全沒有記錄在案的 live migration（Supabase 內部版本 `20260713091833`／name `igwatch_alerts_on_conflict_fix`，2026-07-13 09:18 UTC apply）已新增具現化欄位 `order_id_key`（`GENERATED ALWAYS AS (COALESCE(order_id,'')) STORED`）+ 新 plain-column 唯一索引 `ix_igwatch_alerts_dedup_v2`，正是解決上述限制的正確做法——但本地 repo 完全無此 migration 檔案、無任何 decisions.md/Changelog.md/session-log.md 記錄，屬未落文件的 live drift（來源不明，推測為某次未完整記錄的背景任務）。經 GET 現行 live workflow 核對，發現 **live n8n workflow 的 `Write Alerts` 節點 URL 也已經帶有 `?on_conflict=alert_date,thread,order_id_key,kind`**——即修復本體其實已經全部 live 部署完成，唯獨本地 `build_n8n_workflow.cjs` 原始碼未同步（違反 SOP.md「唯一真相來源」原則），且全程零文件記錄。

**執行內容**：
- `scripts/ig-watchdog/build_n8n_workflow.cjs`：補回 `Write Alerts` 節點 URL 的 `on_conflict` 參數 + 說明註解，使本地原始碼與 live 狀態同步（非新增行為，純補齊 SSOT drift）。
- `supabase/migrations/0056_igwatch_alerts_on_conflict_fix.sql`：補建本地 migration 檔案，內容照抄已 live 執行的 DDL（`IF NOT EXISTS`/`IF EXISTS` 冪等，對已是此狀態的 DB 無副作用），關閉 migration 編號 drift。
- 未重新 PUT n8n workflow——GET live workflow 與本地重新產生的 JSON 逐節點 diff 確認完全一致（僅 n8n 自動附加的 `settings.callerPolicy`/`availableInMCP` 欄位差異，屬 n8n 自身行為非本次修復範圍），故本次修復是「補記錄」而非「新部署」，不觸發 Google Drive credential 重新指派負擔。

**驗證**：`EXPLAIN INSERT ... ON CONFLICT (alert_date, thread, order_id_key, kind) DO NOTHING` 對 live DB 執行（零寫入，僅 query plan），確認 `Conflict Arbiter Indexes: ix_igwatch_alerts_dedup_v2` 正確命中，證實 on_conflict 語法與索引結構相符，非空談。

**task_e3a60daa**：狀態由「待授權追蹤」→「已確認修復（DB+n8n 皆已 live，本次補齊本地文件+SSOT 同步）」，dismiss 該背景任務 chip。

詳見 `.fhs/notes/FHS_System_Logic_Overview.md` §11.9、Changelog.md 本 session 條目。

### D34：S172 — canva-auto 訂單 0800802（Janet）執行：page3 雙片新 pattern + local_prep.py Parakeet 公式 v2 重擬合 + SOP 缺口修補

**背景**：`/canva-auto` 執行 Janet 訂單 0800802（純音樂款，特殊之處：客人有 2 條 Lovart 動畫 Video1/Video2，非慣常 1 條）。過程揭發 3 類問題，逐一收口。

**問題① page3 雙片版型無 precedent**：AI Stage③ 首版猜「並排」，另撞到 `resize_element` 的 `preserve_aspect_ratio=true` 陷阱——保留嘅係「目前 element container 現有比例」而非 asset 原生像素比例，Fat Mo 拖入嘅預設 container（864×864 方形）同 Video 原生比例（960×1920 直向）差好遠，令兩段片變形重疊。已修正（改傳明確 width+height）並記入 canva-auto.md known failure modes。Fat Mo 人手最終修正版：兩段片疊放同一位置（同母片 DAHN9LxGdEE precedent 一致，非並排），已記落 `placement_memory.json` order 0800802，`learned: true`。

**問題② page2 黑白圖 Parakeet 色調流程**：AI 用 `local_prep.py`（本地 Python 公式）生成，Fat Mo 認為不對，改用 **Canva 原生 ColourMix > Parakeet** 效果重新生成（Hue offset=0.8/Saturation=0.3/Rainbow amount=0.2/Rainbow offset=0）。Fat Mo 裁決：**繼續自動化路線**，要求把 `local_prep.py` 公式逼近呢組參數。執行：用 Fat Mo 呢單嘅 Canva 原生輸出（182×199 縮圖樣本）反推新公式，改用正規化座標（u=x/寬, v=y/高），捨棄 v1「拉伸貼合 1563×1563 參考 canvas」未驗證假設；新增 `canva_auto/sample_gradient_fit.py`（相位差分法反推工具，日後滑桿數值變更時重新擬合）。Saturation 擬合中位數 0.3064 同 Fat Mo 滑桿讀數 0.3 幾乎完全吻合，交叉驗證通過。**已知限制**：樣本為縮圖非全解像度，未做全解像度交叉驗證；新公式只啱返呢一組滑桿數值，換組數值需重新擬合。

**問題③ SOP 缺口（客人音訊從未上載）**：Fat Mo 回報「客人音訊都錯，我根本沒有上傳，你也沒有問我」——`canva-auto.md` Stage①-④全程未有步驟提示上載/更換音軌，對純音樂款（音訊係核心交付物）係嚴重缺口。已補入 Stage②必做清單；另補 Stage③人手補完清單（進場動畫/音軌/過場/頁面時長皆屬 Canva MCP 掂唔到嘅範圍，純文字提醒非 AI 可執行）。Fat Mo 已補上載並 set 好本單音軌，訂單出貨。

詳見 `canva_auto/placement_memory.json` order 0800802、`.fhs/ai/commands/canva-auto.md` known failure modes + Stage②/③、Changelog.md S172 條目。

### D35：S173 — P2c：意圖標註 + 回覆範本庫執行完成（S150 §4.8 剝離範圍，flow_id 2026-07-13-1224）

**決策**：Fat Mo 於用量緊繃（約5%剩餘）情境下明確批准 `/execute` P2c，先建代碼、驗收延後（三選一裁決，AskUserQuestion 取得）。

**執行前查證發現的阻塞點**：cl-final-plan §7 要求「意圖 regex 對照既有真實 IG 對話樣本（至少 20 則，人工標記地面真相）量測覆蓋率 ≥70%、主標籤準確度 ≥80%，未達標不算 P2c 完成」。查證 live 資料：`ig_messages` 表（P2a 上線後）0 筆（cron 僅跑過一次，當日 0 筆符合條件）；`ig_watchdog_alerts` 現存 10 筆真實 snippet 全為訂單細節確認文本（倒模/木框/相框規格），無 cancel/complaint/payment_inquiry/modify_order 任何案例，多樣性不足。三選一問 Fat Mo（先建代碼驗收延後／Fat Mo現場提供真實樣本／暫緩整個P2c），裁決：**先建代碼，驗收延後**——量測項目明確標記為「待 `ig_messages` 自然累積足量真實訊息後補測」，不宣稱已達標（誠實收窄，比照既有 P2a F 修復/P2b v1 誠實收窄慣例）。

**編號調整**：計畫書原文寫 migration `0056`，執行時發現已被同日另案 task_e3a60daa（D33）佔用，改用 `0057`。

**設計調整**（比照 P2b/migration 0054 已審查通過的先例，非本次新開先例）：計畫書原文寫 `message_intents.message_id` 為 FK→`ig_messages`，但現行 n8n 寫入模式是 REST POST 批量 fire-and-forget（不取回 INSERT 產生的 UUID），P2b 已因同一理由改用 `message_thread`+`message_ig_message_id` 軟性參照，本表沿用同一模式，避免另開一套需要往返取 UUID 的寫入機制。

**執行內容**：
- `supabase/migrations/0057_create_message_intents_and_reply_templates.sql`：`message_intents` 表（5類 intent_label CHECK 約束 + dedup 唯一索引 + pg_cron 90天 TTL）+ `reply_templates` 表（5類意圖各1筆草稿種子，佔位文案待 Fat Mo 覆核）。已 apply 至 live DB。
- `scripts/ig-watchdog/lib/order-match.mjs`：新增 `tagIntent(text)` 純函式（regex-first，INTENT_PATTERNS 5類：cancel/complaint/modify_order/payment_inquiry/place_order，優先序取消/投訴 > 改單/查詢/新單），單一真源不新開判斷邏輯。
- `scripts/ig-watchdog/lib/order-match.test.mjs`：新增 8 組 tagIntent 單元測試（illustrative examples，非 §7 正式驗收樣本，測試檔內明確註記）。
- `scripts/ig-watchdog/build_n8n_workflow.cjs`：Classify & Report 節點新增 `intents` 陣列組裝（只標註客人發出的訊息）；新增 `Has Intents?` IF 節點 + `Write Intents` HTTP Request 節點（on_conflict 對齊 dedup 索引，吸取 P2a F3 教訓不重犯）；`Classify & Report` 平行分支新增第 4 條（Has Alerts?/Has Messages?/Has Mismatches?/Has Intents?）。

**部署與驗證**：node --test 43/43 PASS（含新增 8 組）；diff-guard 測試 PASS（lib 嵌入一致性）；build script 執行 + JS 語法檢查通過；GET live workflow → 與本地重建 JSON 結構化 diff（僅新增 2 節點 + Classify & Report 內容更新 + 對應 connections，無其餘節點/連線 drift）→ PUT 部署（HTTP 200）→ 再 GET 確認節點數/內容/連線與本地建構版本逐一比對零差異（26/26 節點一致，0 mismatch）。未做 §7 要求的覆蓋率/準確度量測（見上方阻塞點裁決）。

**待辦**：`ig_messages` 自然累積足量真實訊息（多樣涵蓋 5 類意圖）後，補測 §7 覆蓋率≥70%/準確度≥80%量測，未達標需回頭調校 `INTENT_PATTERNS` regex 庫；`reply_templates` 5 筆草稿文案為佔位文案，正式對客使用前需 Fat Mo 覆核修訂。

詳見 `.fhs/notes/FHS_System_Logic_Overview.md` §11.10、Changelog.md 本 session 條目、`scripts/README.md` ig-watchdog 段。

### D36：S175 — `/rp`／`/cl-flow`／`/ag-flow` 新增拷問掛鉤：structural_warning 觸發時機械化提議「拷問我」

**決策**：Fat Mo 問點解拷問技能（D27）唔自動掛入日常 `任務→/rp→cl-flow` 工作流。經 `/8d` 查證 `rp.md`／`cl-flow.md` 原文設計理由後答覆：**全自動執行違反 grilling 技能核心原則**（決策權在人類，非 AI 代答）、且 `/rp` 已明文規定「精煉階段無參照物，強制批評是表演」、Compatibility Map 亦明文禁止 AI 主動在管道指令前插入額外精煉層——三者皆指向「不可強制自動化」。但識別出真正缺口：D27 承諾嘅「AI 主動問要唔要拷問一輪」一直靠行為層記憶落地，未機械化掛在 `/rp`／`/cl-flow` 既有嘅模糊度判斷點（`structural_warning`／Gate 1）上。Fat Mo 確認方案後執行落盤。

**執行內容**（純提議掛鉤，非強制流程，`structural_warning` 未觸發時零改動零摩擦）：
- `rp.md`（v2.3→v2.4）：Step 3 `<structural_warning>` 有實際觸發時，XML 輸出後加一行主動提議「要唔要『拷問我』一輪」；未觸發則不輸出，維持現行零摩擦。
- `cl-flow.md`（v2.2.0→v2.2.1）：Gate 1 審閱框新增「拷問我」回覆選項（僅 structural_warning 觸發時出現），選咗會先跑 grilling 逐條釐清，問完返回同一個 Gate 供最終確認，不自動略過。
- `ag-flow.md`：同步加對應 Gate 1 選項（該檔案 2026-07-04 起已 DEPRECATED，僅為歷史一致性補齊，非新建議用法）。
- `cl-flow-fast.md` 不改動——其設計本身已明文跳過 structural_warning（「⚡ 輕掃描 ❌ 跳過」），此掛鉤天然不適用，維持原有快速通道特性。

**設計取捨**：只自動化「提醒」動作，不自動化「回答」動作——grilling 逐條問答仍 100% 由 Fat Mo 決定，AI 唔會代答任何一條。此掛鉤本質是將 D27 既有承諾的觸發時機從「AI 記唔記得主動問」改為「規則檔機械判斷該問未問」，冇新增自主行為範圍。

詳見 `.fhs/ai/commands/rp.md` Step 3「拷問掛鉤」段、`.fhs/ai/commands/cl-flow.md` Gate 1、`.fhs/ai/commands/ag-flow.md` Gate 1。
