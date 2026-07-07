# S150 審計修復實施計畫（Audit Fix Implementation Plan）

> **Session**: S150（2026-07-06，Fable 5 規劃）
> **方法論**: 八維度分析 → v1 草案 → 自我批評（3 弱點）→ v2 定稿（同 S148/S149 慣例）
> **事實依據**: [S150 全面審視報告](../2026-07-06_s150-full-system-review-report.md)（診斷細節不在此重複展開，敘事單源）
> **狀態**: ⏳ 待 Fat Mo 批准 → Sonnet 5 執行（時序與 S148/S149 關係見 §4.9）
> **本檔性質**: 純規劃，零代碼改動

---

## §0 前提盤點（規劃 session 補充實測，2026-07-06）

**修復標的**（來自審計報告 §3）：F1 igwatch 三按鈕、F2 記錄中心寫入、F3 seg control Desktop、P1a 看門狗正向記錄、P1b orders anon DELETE 撤除、exec 4069 診斷。**P2（訊息入庫+內容比對+AI 回覆準備）已剝離**，理由見 §3-W1。

**本 session 新增實測事實**（規劃期先查，避免執行期踩雷）：

| # | 事實 | 對計畫的影響 |
|---|---|---|
| E1 | `ig_watchdog_alerts.kind` 有 CHECK constraint，只允許 `not_created`/`created_incomplete`（pg_constraint 實查） | 新 kind `verified_ok` **必須先出 migration 擴充 CHECK**，否則 n8n 寫入直接 500 |
| E2 | 去重 unique index `ix_igwatch_alerts_dedup (alert_date, thread, COALESCE(order_id,''), kind)` 已存在 | verified_ok 體積天然有界（每日每 thread 每單至多 1 筆） |
| E3 | n8n Write Alerts 節點已帶 `Prefer: resolution=ignore-duplicates`（build script L507） | 重複寫入=靜默忽略，冪等性免費獲得 |
| E4 | 看門狗 workflow id=`D4LK6VrQbiXlju0V`（active），近 12 次執行 4 error（6/29-7/2 夜間）+ 7/2 人工調試恢復 | Phase 0 需取 exec 4069 error detail；error 期間資料夾可能被 best-effort 標記而漏解析 |
| E5 | orders 表有兩條 anon UPDATE 政策（`anon_update_orders` + `orders_anon_update`）並存 | Phase 5 順手清重複（先比對 qual 等價性再擇一） |
| E6 | migration 最新編號 0048（S147） | 本計畫用 0049-0051；執行前 `list_migrations` 再確認，有他人插隊則順延 |

**與 S148/S149 檔案接觸面對照（零交集證明）**：

| 計畫 | 觸碰檔案域 |
|---|---|
| S148 迴圈硬化 | `scripts/hooks/`（guard/kgov/loop 制度）、governance 文件、fixtures |
| S149 治理可攜化 | `.fhs/ai/governance/`、抽取器、模板、guard.js 引擎拆分 |
| **S150（本計畫）** | `Freehandsss_Dashboard/*.html`、`supabase/migrations/`、`scripts/ig-watchdog/build_n8n_workflow.cjs`、n8n live workflow |

唯一共享資源＝`handoff.md` 便攜塊與 Changelog（/commit 序列化即可，無代碼衝突）。

---

## §1 八維度架構分析（Fat Mo 指定維度）

### 1. perf 系統效能
現狀：Dashboard 載入 orders limit 200 + alerts limit 200，各查詢有索引支撐（E2 + `ix_igwatch_alerts_resolved_date`）。
決策：(a) verified_ok 加量後日增 ~1-3 筆（E2 去重上界），`limit 200` 查詢 6 個月內不受衝擊，**不需分頁重構**；(b) F2 走 SECURITY DEFINER RPC 單跳，與現有 resolve 模式同構，零額外往返；(c) F1/F3 為純前端字串/CSS，零效能面。
長期註記（不排本計畫）：verified_ok >90 天保留策略併入未來 P2 /cl-flow 或 /fhs-slim 機制評估。
→ 注入 Phase 4（去重驗收）；其餘維持現狀。

### 2. ux_mgmt 直觀管理
現狀：igwatch 卡片按鈕全滅=操作閉環斷裂；`created_full` 無聲=操作者無法區分「掃過且齊」vs「沒掃到」（審計 §1.3 缺口 2——Fat Mo 本次「看門狗不工作」觀感的直接來源）。
決策：(a) verified_ok 寫入時 `resolved=true` 預設——**不進「未處理」計數、不吵**，只在「已處理/全部」頁籤以綠色 ✓「已核對」低調呈現；徽章文案「N 筆警報｜M 待處理」語義不變；(b) 複製訂號在 HTTP 環境給真剪貼簿（execCommand fallback）而非 alert 彈窗；(c) 記錄中心維持既有成功/失敗回饋 span，不加新 UI。
→ 注入 Phase 1（clipboard）、Phase 4（verified_ok 顯示策略）。

### 3. conflict 衝突避免
現狀：三方合約斷裂兩處（RPC 缺失、kind CHECK 未覆蓋新值）；`lib/order-match.mjs` 是單一真源受 diff-guard 保護。
決策：(a) **lib 一行不動**——`created_full`→`verified_ok` 的映射放在 build script 編排層（alerts payload 組裝處），diff-guard 測試零波動；(b) 三 migration 順序固定 0049→0050→0051，先擴 CHECK 再改 n8n（先 DB 後寫入端，中間態安全：舊 workflow 寫舊 kind 仍合法）；(c) content 比對「真理方向」紅線預先寫死：`final_sale_price`=確收真理（AGENTS §3），未來任何 mismatch 警報**只提示人工核對，永不自動改 DB**——此紅線同樣約束本計畫的 verified_ok（唯讀比對，零回寫 orders）；(d) 與 S148/S149 零檔案交集（§0 對照表），與 S147 待辦（Mirror Prep 共享鎖 RPC）不同 RPC 域不相干。
→ 注入 Phase 4 全程 + §4.9。

### 4. token Token 消費
現狀：V42 巨檔 15.6K 行（禁全檔 Read）、n8n workflow JSON 大（curl 落檔紀律）。
決策：(a) 執行 session 免重稽核——本檔 §0/§4 已含全部行號、SQL、探針命令，開檔即做；(b) 巨檔全程 Grep 窗口+三步計數；n8n GET dump 落 `.fhs-local/`，jq 定點提取；(c) **fresh-context 對抗審查合併為單次 opus 派工**：待 Phase 3-5 機械驗收全過後，一次派 opus 攜三份 migration diff + n8n diff + HTML diff + 各 phase 證據批次複審（省 2 次 spawn 冷啟動，審查獨立性不減——審查者仍是零上下文 fresh agent）；(d) Phase B 級 AI 標註（已剝離至 P2）未來用既有 regex 資產離線跑，零 LLM token 起步。
→ 注入 §4.0 執行紀律。

### 5. long_term 長期方向
現狀：AI 自動回覆願景（Fat Mo issue 7）依賴訊息資料底座；Supabase SSoT 翻轉在途；S149 治理可攜化在排程。
決策：(a) P2 剝離但**方向鎖定**：本計畫的 0050 CHECK 擴充只加 `verified_ok`、**不預埋** `content_mismatch`（S147 Stage 3 精神：約束反映現實，未上線的值不進 CHECK；未來 P2 migration 自行擴充）；(b) F2 新 RPC 沿用 `fhs_` 前綴 + SECURITY DEFINER + 固定 search_path 慣例，成為 advisors N2（24 函式 search_path）批量修復的示範樣板；(c) 所有新物件 Supabase 原生、零 Airtable 鏡像，與 SSoT 翻轉方向一致；(d) V43 之前不做 UI 重設計，F3 是最小補丁。
→ 注入 Phase 3/4 migration 規格。

### 6. responsive Desktop+手機
現狀：seg control 鎖手機（CSS L2907-2912）但過濾器全域生效 → Desktop 歸檔單隱形（審計 §1.5）；igwatch 卡片按鈕列已有 `flex-wrap`，手機不溢出。
決策：(a) F3 修法＝開放 `#fhsSegWrapper` 全尺寸顯示，≥768px 補 desktop 樣式（`max-width:380px` 靠左、融入表格上緣工具帶），**767px 以下零改動**（不碰 S132 已驗收的手機佈局）；(b) 機械驗收＝playwright/preview 實測 computed style（375px：維持現狀；1280px：`display:block`）+ 點「已完成」後 `#reviewTableBody` 出現歸檔列——依 feedback_visual_bug 紀律，實測不臆測；(c) verified_ok 卡片沿用既有卡片模板，無新響應式面。
→ 注入 Phase 2 全程。

### 7. subagent & skill
派工矩陣（依 governance/02 §4-§5，本計畫具體化）：

| 工作 | 執行者 | 理由 |
|---|---|---|
| Phase 1-3 HTML/CSS/migration 撰寫 | 主對話（Sonnet 5）直改 | 已知行號定點改，§1「主對話可直接做」 |
| HTML 改動品質 gate | `code-reviewer`（haiku 釘選）×1 | 生產 HTML 改動慣例 gate，G1-G8 |
| 財務/schema/n8n 對抗審查 | fresh-context `general-purpose` **opus** ×1（合併批審，見維度 4） | §5 驗證不自驗，此三域不得降級 |
| 視覺驗收 | playwright/preview 工具實測 | feedback_visual_bug：量測不臆測 |
| skill 載入 | Phase 3 開工前載 `finance-gatekeeper`；部署前 `/upload-web` 自帶 Step0 `/fhs-check` | 既有硬規則 |
| 明確不派 | 掃描/研究類 subagent | 診斷已完成（審計報告），執行期無探索需求 |

→ 注入 §4.0 執行紀律。

### 8. history 歷史記錄
現狀：expense_logs 無 UPDATE/DELETE 政策＝天然 append-only（審計友善，**保持**）；alerts 有 resolved_by/resolved_at 軌跡；migration 編號線性（0048 最新）。
決策：(a) 每 Phase 獨立 commit（S148/S149 慣例），單獨可 revert；(b) F1 修復後 igwatch 操作軌跡（誰標記、何時）首次真正開始累積——這本身就是歷史記錄機制的啟用；(c) 收尾強制五落盤：Changelog S150、decisions.md（編號接續）、`FHS_System_Logic_Overview.md` 對應章節（igwatch 三分類→四分類、記錄中心寫入路徑）、learnings（onclick 引號 pitfall + 「前端呼叫的 RPC 先探針再信任」pattern）、lessons/INDEX；(d) n8n 改動前 GET dump 存 `.fhs-local/ig-watchdog/`（回滾底稿），versionId 前後值記入執行報告。
→ 注入 Phase 6 + 回滾矩陣。

---

## §2 實施計畫草案 v1（保留供追溯，**執行以 §4 v2 為準**）

- Phase A：F1+F2+F3 三修合併一個 commit，NAS 實機驗收
- Phase B：verified_ok——n8n classify 輸出直接加 kind，寫入 alerts；UI kindLabel 補一項
- Phase C：訊息入庫 `ig_messages` + 內容比對層（審計 §4 Phase A/C）排入本計畫連續執行
- Phase D：orders DELETE 政策撤除 + 收尾落盤

---

## §3 自我批評（v1 的 3 個弱點）

**W1 範圍紀律失守**：v1 把 P2（訊息入庫+內容比對）塞進 bugfix 計畫。這是全新架構域（新表、PII 政策、n8n 管線大改），審計報告自己都判「另開 /cl-flow」；與 S148/S149 連發撞期，單一計畫膨脹到不可批准粒度。**v2 修正**：本計畫收斂為 P0+P1（止血+快贏），P2 正式剝離（§4.8），批准本計畫≠批准 P2。

**W2 事實漏洞（已被本 session 實測證實）**：v1 的 verified_ok 直寫方案會撞 `ig_watchdog_alerts_kind_check`——CHECK 只允許兩個舊值，寫入即 500（E1）。v1 也沒設計去重/膨脹防護（後查明 E2/E3 已天然覆蓋，但 v1 是「碰巧沒事」而非「設計使然」）。**v2 修正**：migration 0050 先擴 CHECK 再動 n8n（先 DB 後寫入端的順序約束入 §4.5）；冪等以「同輸入跑兩次 count 不變」列為機械驗收。

**W3 部署安全與可回退性缺失**：v1 三修合一 commit——F1 若實測翻車，F2/F3 陪葬無法單獨 revert；「NAS 實機驗收」沒定義執行者、失敗路徑、與 S140 `.deploy-ok` 授權機制（只能 Fat Mo touch）的銜接；生產 V42 是 live POS，覆蓋 `current.html` 是紅線動作。**v2 修正**：每修一 commit；部署統一走 `/upload-web` 三關+Step0；回滾矩陣逐 Phase 列明（§4.10）；`current.html` 覆蓋列入授權清單且部署動作單獨停等。

---

## §4 實施計畫 v2（**定稿，Sonnet 5 照此執行**，各 Phase 獨立 commit）

### §4.0 執行紀律（開工前必讀）
1. 開工先讀本檔全文＋審計報告 §1/§3（免重稽核，行號/SQL/探針已備）
2. 巨檔三步：改前 `grep -c` 目標 pattern =1 → 替換 → 改後舊 pattern=0、新 pattern 計數符合預期
3. Phase 3 開工前載入 `finance-gatekeeper` skill
4. n8n 改動：GET dump 落 `.fhs-local/ig-watchdog/pre-change.json` → 改 build script → rebuild → diff-guard 測試過 → PUT（body 只含 name/nodes/connections/settings 四欄）→ 記 versionId
5. fresh-context opus 批審安排在 Phase 5 後一次派（見 §1 維度 4），FAIL 項逐項回修再驗
6. guard fixtures 16/16 + health fixtures 12/12 開工基線與收工迴歸各跑一次
7. 執行中任何一步與本檔預期不符（grep 計數、HTTP 碼、constraint 現值）→ 停，按 03_judgment-rubrics 判斷，不硬闖

### §4.0b 授權清單（Fat Mo 批准本計畫＝一併授權以下八項；執行時不再逐項問）
1. 生產 V42 HTML L13345/13347/13352 三處 onclick 改寫 + `_igwCopyOrderId` 加 execCommand fallback（Phase 1）
2. `#fhsSegWrapper` CSS 開放全裝置 + desktop 樣式微調（Phase 2；767px 以下零改動）
3. migration 0049：新建 `fhs_write_expense_log`（SECURITY DEFINER、固定 search_path、GRANT anon/authenticated）+ 前端 fallback 兩行改用同 IIFE 常數（Phase 3）
4. migration 0050：kind CHECK 擴充至含 `verified_ok`；n8n build script 編排層映射 created_full→verified_ok（`resolved=true` 預設，不進待處理計數）；UI kindLabel 補綠色「✓ 已核對」；watchdog workflow PUT（versionId 變更）（Phase 4）
5. migration 0051：`DROP POLICY orders_anon_delete`；兩條重複 anon UPDATE 政策查證後擇一清理（Phase 5；此項屬 05§1「先問」級——本清單即為問）
6. Phase 1-3 完成且 code-reviewer PASS 後，`/upload-web` 三關部署覆蓋 `current.html`（含 Step0 `/fhs-check`；`.deploy-ok` 由 Fat Mo 親手 touch——此動作永遠人工）
7. exec 4069 診斷若揭露 6/29-7/2 有匯出資料夾被標記而未成功解析 → 授權從 staticData `processedFolderIds` 移除該 id 觸發補掃（Phase 4 附帶）
8. TG 深連結待辦（S136 遺留）：若 Fat Mo 確認 7/2 曾收到 Telegram 通知且連結可開 → 該待辦結案（批覆時一句話確認即可）

### §4.1 Phase 0 — 前置探查與基線（無 commit，唯讀）
- `list_migrations` 確認 0048 仍最新（E6 防插隊）
- 重確認 E1 CHECK 現值、E5 兩條 UPDATE 政策 qual 全文（SQL 落執行報告）
- exec 4069：`curl /api/v1/executions/4069?includeData=true` 落檔 scratchpad → jq 提取 error 節點名+message（禁全量入 context）
- 基線 grep 計數：三處 onclick pattern 各 =1；`#fhsSegWrapper` CSS 塊 =1；`window._sbUrl` 引用 =1（L14944）
- guard 16/16 + health 12/12 基線
- **驗收**：五組基線數字寫入執行報告表格

### §4.2 Phase 1 — F1 igwatch 按鈕修復（commit #1）
- 三處 onclick 改「雙引號屬性內用單引號包 JS 字串」寫法（訂號=正規化大寫英數、id=UUID hex，字元集安全無需轉義；此判斷已在規劃期核實 `normalizeOrderId` L28-34）
- `_igwCopyOrderId`：保留 navigator.clipboard 優先，新增 textarea+`document.execCommand('copy')` fallback（HTTP 可用），兩路皆失敗才 alert 顯示訂號
- **驗收**：三步計數（舊 pattern=0）；preview/playwright 點三顆按鈕 console 零 SyntaxError；「標記已處理→標回未處理」一組抵銷操作 Network 見兩次 RPC 2xx（live 資料零淨變動）；剪貼簿內容=訂號字串
- 紅線自檢：無 HTML ID 變更、無 raw_form_state/captureFormState 觸碰

### §4.3 Phase 2 — F3 seg control Desktop 開放（commit #2）
- L2907-2912：`#fhsSegWrapper` 基樣式改常顯，≥768px 補 `max-width:380px` 等 desktop 微調；767px 以下維持現有呈現（media query 內容不刪）
- **驗收**：playwright computed style 雙尺寸（375px 現狀無變／1280px `display:block`）；1280px 點「已完成」→ `#reviewTableBody` 出現歸檔列（前提：live 有歸檔單，否則以「全部」列數 > 「進行中」列數證明）；375px 前後截圖比對零視覺回歸

### §4.4 Phase 3 — F2 記錄中心寫入雙修（commit #3 + migration 0049）
- migration 0049：`fhs_write_expense_log(p_log_type text, p_entry_date date, p_category text, p_item_name text, p_amount numeric, p_remarks text, p_operator text)` → INSERT expense_logs RETURNING id；SECURITY DEFINER + `SET search_path=public,pg_temp` + GRANT EXECUTE anon/authenticated（參數名須與 V42 L14924-14931 呼叫端逐字一致）
- 前端 L14944/L14947：`window._sbUrl`→`_FS_SB_URL`、`window._sbHdr`→以 `_FS_SB_ANON` 現組 headers（同 IIFE L14443-14444 常數）
- **驗收**：live 探針提交一筆 `operator='s150-probe'` 支出 → RPC 2xx → 列表刷新可見 → SQL DELETE 該 probe 列並附輸出；審計日誌 tab 順手實測一次查詢 2xx

### §4.5 Phase 4 — P1a verified_ok 正向記錄（commit #4 + migration 0050 + n8n PUT）
- **順序鎖死**：migration 0050（CHECK 擴充）先 apply 並驗證 → 才動 n8n（中間態安全：舊 workflow 寫舊值仍合法）
- build script：alerts payload 組裝處把 `created_full` 納入寫入、映射 `kind='verified_ok'`、`resolved=true`、`notify` 邏輯與 Telegram 文本**不含** verified_ok（TG 不加噪音）；`lib/order-match.mjs` 一行不動
- V42 UI：`kindLabel` map 補 `verified_ok` → 「✓ 已核對」綠色；「未處理」filter 邏輯天然排除（resolved=true）
- exec 4069 結論處置（授權 7）
- **驗收**：diff-guard 測試 PASS；PUT 後 GET 確認 versionId 變更+節點 payload 含新映射；手動 trigger 一次執行 success；**冪等實測**＝同一匯出資料夾重跑（移除 processedFolderIds 後）alerts count 不變（E2+E3 驗證）；Dashboard「全部」頁籤可見綠色已核對卡片
- **回填校驗**（規劃期已知答案的試金石）：0600805/06001008 應以 verified_ok 出現——若未出現＝該訊息所在匯出資料夾已被消費且不重掃，屬預期（寫入執行報告即可，不算 FAIL）

### §4.6 Phase 5 — P1b orders anon 權限收斂（commit #5 + migration 0051）
- `DROP POLICY orders_anon_delete ON orders`（Dashboard 全檔 grep 無 DELETE orders 呼叫，審計已證）
- 兩條 anon UPDATE 政策：Phase 0 取回 qual 全文，等價則留 `orders_anon_update` 刪另一條；不等價則**不動並上報**（超出本計畫授權）
- **驗收**：anon key DELETE 探針回 RLS 拒絕（0 rows / 403）；Dashboard smoke：載入訂單、開單、改 process_status 儲存各一次 2xx（UPDATE 路徑未受傷）
- migration 註解內保留被刪政策原始定義（回滾底稿）

### §4.7 Phase 6 — 制度收尾（commit #6）
- 五落盤：Changelog S150 條目、decisions.md（編號接續現況）、`FHS_System_Logic_Overview.md`（igwatch 四分類、記錄中心寫入路徑、seg 全裝置）、learnings 兩條（onclick 引號 pitfall；「前端呼叫的 RPC 先探針再信任」）、lessons/INDEX
- handoff.md 便攜塊六欄更新 + MASTER 表回填 + TG 深連結待辦按授權 8 處置
- fresh-context opus 批審（§4.0-5）證據歸檔 → `/commit` 全流程（Notion 同步）
- kgov [G] 屆時觸發＝真觸發（本輪動了財務相關 RPC/schema），以 Logic_Overview 更新結案，不走誤觸刪 flag 路徑

### §4.8 P2 剝離聲明
訊息入庫（ig_messages）、內容比對層（content_mismatch）、意圖標註、回覆範本庫＝未來獨立 `/cl-flow`，前置需求與紅線已存審計報告 §4 + 本檔 §1 維度 3/5。**本計畫批准不含 P2 任何實作。**

### §4.9 執行順序與依賴
- 內部：Phase 0→1→2→3→4→5→6 線性；4 依賴 0（exec 診斷）+ 0050 先於 n8n PUT
- 外部：與 S148/S149 **零檔案交集**（§0 對照表）。建議序＝**S150 Phase 1-3 最先**（生產 POS 止血，三個小 commit）→ S148 → S149 → S150 Phase 4-6（n8n/schema 快贏）；若 Fat Mo 偏好整計畫連跑亦可，唯 /commit 與 handoff 更新需序列化。執行者統一 Sonnet 5，fresh-context 審查 opus
- 熔斷：任一 Phase 機械驗收 FAIL 且一次回修不過 → 停在該 Phase 前沿（已完成 commit 不 revert），上報 Fat Mo

### §4.10 回滾矩陣

| Phase | 回滾動作 |
|---|---|
| 1/2（HTML） | `git revert` 單 commit；未跑 /upload-web 前 NAS 生產零影響 |
| 3（0049） | `DROP FUNCTION fhs_write_expense_log` + revert 前端 commit |
| 4（0050+n8n） | PUT 回 `.fhs-local/ig-watchdog/pre-change.json`；`DELETE FROM ig_watchdog_alerts WHERE kind='verified_ok'` 後 CHECK 縮回 |
| 5（0051） | 按 migration 註解內原始定義重建政策 |
| 部署 | `/upload-web` 自帶備份規範，覆蓋前快照可直接回放 |

---

## 執行狀態（執行 session 回填）

| Phase | 狀態 | commit | 驗收證據 |
|---|---|---|---|
| 0 | ✅ | — | 0048仍最新；CHECK現值=not_created/created_incomplete；兩條UPDATE政策qual皆'true'等價；exec 4069=Telegram markdown解析失敗(byte 568)，Write Alerts已成功寫入1筆＋processedFolderIds標記邏輯在更早Code節點完成，**資料夾未漏處理**，不觸發授權7；基線grep三onclick pattern=3、fhsSegWrapper=1、_sbUrl=1；guard 16/16+health 12/12基線PASS |
| 1 | ✅ | 待定（本session未commit，見下） | 三處onclick改單引號包裹，舊JSON.stringify(r.order_id/r.id) pattern計數0；execCommand fallback+1.5s逾時保護（實測發現navigator.clipboard權限pending會永久卡住，屬新增防護非計畫原文）；preview驗證：onclick屬性正確解析、「標記已處理」跑通一次真實RPC 2xx（DB寫入後已復原零淨變動）、剪貼簿分支因headless權限模型無法直接演練但生產HTTP環境會走fallback |
| 2 | ✅ | 同上 | #fhsSegWrapper基樣式display:block+新增≥768px media query；375px computed style與修改前一致；1280px實測：進行中74列+已完成6列=全部80列完全吻合（修復前6筆歸檔單Desktop不可見） |
| 3 | ✅ | 同上 | migration 0049（fhs_write_expense_log，SECURITY DEFINER+search_path固定+GRANT anon/authenticated）已apply；前端fallback改用_FS_SB_URL/_FS_SB_ANON同IIFE常數；curl探針200+UI表單實跑200（RPC呼叫+自動刷新列表皆2xx）；審計日誌tab查詢2xx；probe資料皆已刪除零殘留 |
| 4 | ⬜ | | 待S148/S149完成後接續（依handoff建議序） |
| 5 | ⬜ | | 同上 |
| 6 | ⬜（部分提前完成） | | FHS_System_Logic_Overview.md §5.6/§10.12/§11.4已補（涵蓋Phase1-3範圍）；Changelog/decisions/learnings/handoff同步中；code-reviewer haiku PASS（見執行報告）；commit尚未建立——本session按/execute紀律停在Phase 3收尾，未跑git commit，等Fat Mo檢視後再定commit粒度 |

> **中止點說明（2026-07-07）**：本session按Fat Mo核准的建議序，只執行Phase 1-3（生產POS止血），Phase 4-6（verified_ok正向記錄+orders anon權限收斂+制度收尾）留待S148/S149完成後的session接續，執行者可直接續讀本檔§4.5起。code-reviewer gate已跑（PASS，見任務對話紀錄），尚未部署NAS（`/upload-web`+`.deploy-ok`留待Fat Mo批准）。
