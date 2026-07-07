# FHS 全面系統審視報告（V42 Dashboard + n8n + Supabase）

> **Session**: S150（2026-07-06）
> **性質**: 唯讀審計 + 修復方案（零代碼改動；所有修復待 Fat Mo 批准）
> **方法**: 巨檔 Grep 窗口讀（無全檔 Read）+ Supabase live SQL/REST 探針 + n8n API 實查
> **證據原則**: 每項結論附 檔案:行號 或 live HTTP/SQL 證據，不做臆測

---

## §1 已知問題逐項診斷（Fat Mo 提報 5 項，全部找到根因）

### 1.1 記錄中心 (Log Sheet) 不能運作 — 雙路寫入皆斷

| 路徑 | 狀態 | 證據 |
|---|---|---|
| 讀取（最近50筆） | ✅ 正常 | live GET `expense_logs` = HTTP 200；RLS `expense_logs_anon_read` 存在 |
| 寫入主路徑 RPC | ❌ 斷 | `fhs_write_expense_log` **在 Supabase 不存在**（live POST = PGRST202；pg_proc 查無此函式） |
| 寫入 fallback | ❌ 斷 | V42 L14944/L14947 引用 `window._sbUrl`/`window._sbHdr`——全檔 grep **零賦值**（只有各函式內的區域變數同名），fallback 實際 fetch `'undefined/rest/v1/expense_logs'` 必敗 |
| 審計日誌 tab | ✅ 應正常 | `fhs_query_audit_logs` 存在且 anon EXECUTE 已授權 |

**根因**：Session 69 前端寫好呼叫 `fhs_write_expense_log`，但對應的 Supabase migration 從未建立該函式；fallback 又引用了從未掛上 window 的變數 → 防線雙斷。
**修復方案（F2）**：
(a) migration 新建 `fhs_write_expense_log`（SECURITY DEFINER + `set search_path=public,pg_temp`，仿 `fhs_resolve_ig_alert` 現有模式）；
(b) 前端 fallback 改用同一 IIFE 內已有的 `_FS_SB_URL`/`_FS_SB_ANON` 常數（L14443-14444）直接 PostgREST insert——RLS `expense_logs_anon_insert` 政策已存在，DB 端本來就 ready。
**驗收**：live 提交一筆測試支出 → HTTP 2xx + 列表刷新可見 → SQL 刪除測試列。

### 1.2 igwatch 複製訂號 / 標記已處理失效 — 一個引號 bug 殺死三顆按鈕

**根因**（100% 確定，後端無辜）：L13345 / L13347 / L13352 三處以
`onclick="fn(' + JSON.stringify(x) + ')"` 拼 HTML——`JSON.stringify` 產生**雙引號**，塞進**雙引號屬性**後，屬性值在第一個內部雙引號被截斷，onclick 淪為殘缺 JS（`fn(`），點擊即 SyntaxError，肉眼看按鈕正常。

**後端健康證據**：
- `fhs_resolve_ig_alert` 存在（SECURITY DEFINER）+ anon EXECUTE 授權 ✓
- live no-op 探針（隨機 UUID）= HTTP 204 ✓
- 4 筆警報資料完好（與截圖完全一致）

受害按鈕：`開訂單`（created_incomplete）、`複製訂號`（not_created）、`標記已處理/標回未處理`（全部）——即 igwatch 卡片**所有動作按鈕全滅**。全檔 grep 確認同型 bug 僅此 3 處，未擴散。

**附帶問題**：`_igwCopyOrderId`（L13389-13395）依賴 `navigator.clipboard`——NAS HTTP 環境下為 undefined，即使修好引號也只會 alert 顯示訂號而非真複製。
**修復方案（F1）**：三行 onclick 改單引號包字串（訂號/UUID 無特殊字元，安全）；clipboard 加 `document.execCommand('copy')` textarea fallback（HTTP 可用）。
**驗收**：NAS 實機點三顆按鈕 + Network 面板見 RPC 200/204 + resolved 狀態翻轉 + 剪貼簿實貼。

### 1.3 + 1.4 看門狗「找不到新訂單」「不提示已訂單更新」— 存在性偵測正常，缺的是內容比對層

**先澄清：存在性偵測本身運作正常**——兩筆真漏單（06001010 Samuel、06001006 K🦦，DB 查無）看門狗都正確抓到並警報。

**Fat Mo 兩張截圖的訂單其實都已在 DB**，所以按 v3 設計（`order-match.mjs` 三分類）被歸 `created_full` → 刻意靜默。但 live 比對揭露了真正的業務缺口：

| 訂單 | IG 訊息內容 | DB 實況 | 缺口 |
|---|---|---|---|
| 0600805 (Lana) | 已付全數 **$4000**；嬰兒左手×4 + 嬰兒左腳×4 鎖匙扣（各有刻字 O.Lee/0901、L.H.S/9.1.26） | `final_sale_price`=**$2380**；order_items 只有 1 件木框套裝主件，**兩件鎖匙扣完全不在** | 金額差 $1,620 + 兩件商品未入庫 |
| 06001008 (Mandy) | 加購嬰兒右腳×4，刻字 上排AP/下排0416 | 加購件有入庫（$125×4=$500 成本計算正確，無假乘法回歸）但 `engraving_text`=null、`specification`=空 | 刻字資料遺失（生產風險：無刻字資訊） |

**三個缺口**：
1. **設計缺口**：看門狗只查「訂號存在」，不比對「訊息內容 vs DB 欄位」→ 金額/品項/刻字不一致永遠無法偵測（上表兩案皆然）
2. **UX 缺口**：`created_full` 完全無聲無記錄 → 操作者無法區分「掃過且齊」vs「根本沒掃到」→ 產生「看門狗不工作」的觀感
3. **時效缺口**：資料源 = Meta 官方匯出 → Google Drive（`instagram-*` 每日資料夾）→ n8n 22:00 Cron。最新警報止於 7/2；7/5 的訊息要等下一個匯出資料夾上傳才可見。另 exec log 顯示 **6/29、6/30、7/1、7/2 夜間定時共 4 次 error**（7/2 上午人工調試後恢復，7/3-7/5 連續成功）——error 期間可能有匯出資料夾被 `processedFolderIds` best-effort 標記掉（標記=已嘗試，不保證解析成功），需查 exec 4069 確認有無漏掃

**修復方案（F4/P1 + P2）**：
- P1 快贏：`created_full` 也寫入 `ig_watchdog_alerts`（`kind='verified_ok'`, `notify=false`）→ UI「全部」頁籤可見正向核對記錄，消除缺口 2；診斷 exec 4069 error 根因
- P2 根治：內容比對層（金額、品項數、刻字 hash 對照 DB）→ 新 kind `content_mismatch`；前置依賴訊息入庫（見 §4 方案）

### 1.5 訂單總覽 Desktop 缺「全部/進行中/已完成」— 且比想像嚴重

**根因**：Segmented control（L3421-3428）CSS 鎖手機（L2907-2912：預設 `display:none`，僅 `max-width:767px` 顯示）。但過濾器 wrapper（L15582-15607）**全域生效不分裝置**，`_fhsSegTab` 未設時預設走「進行中」分支 →

> **Desktop 訂單總覽現在永遠只顯示未完成訂單，且沒有任何 UI 可以切到「已完成」或「全部」**——歸檔訂單在 Desktop 總覽等於隱形。

資料層健康（`_fhsArchivedIds` 每次載入由 `o.is_archived` 重建，L14109-14110；Desktop 行內也有完成按鈕 L8676）。
**修復方案（F3）**：CSS 開放 `#fhsSegWrapper` 全尺寸顯示（數行；Desktop 佈局微調 padding 即可），邏輯層零改動。

---

## §2 新發掘問題（Fat Mo 未提報）

| # | 嚴重度 | 問題 | 證據 | 建議 |
|---|---|---|---|---|
| N1 | 🔴 | **orders 表 anon 可 DELETE/UPDATE/INSERT**（RLS 政策 always-true），anon key 又硬編碼在 HTML——拿到 Dashboard 檔案的任何人可刪改全部訂單 | pg_policies：`orders_anon_delete` 等；advisors `rls_policy_always_true` ×9 | 短期撤 DELETE 政策（Dashboard 無刪單功能，撤了不影響）；UPDATE 長期收斂到 SECURITY DEFINER RPC。屬財務/schema 域 → 需 opus fresh-context 審查後動 |
| N2 | 🟡 | 24 個函式 `search_path` 未固定（advisors WARN；SECURITY DEFINER + 可變 search_path 是提權面） | advisors `function_search_path_mutable` ×24 | migration 批量 `ALTER FUNCTION ... SET search_path=public,pg_temp` |
| N3 | 🟡 | n8n 工作流蔓生：35 支僅 10 active；**7 個 FHS_Core_OrderProcessor 變體**、`TEMP_DELETEME_*`、`Qqq`、`My workflow`×2 | n8n API 全清單 | 歸檔/刪除 inactive 殘骸，防誤啟用誤改（先匯出備份） |
| N4 | 🟡 | 看門狗 6/29-7/2 夜間定時 4 連錯（4038/4046/4061/4069），7/2 人工修復後恢復 | n8n executions API | 查 4069 error detail；若 error 期間有資料夾被標已處理但未成功解析，需人工重掃該時段 |
| N5 | ⚪ | V42 內 Supabase URL/anon key 重複散落 6+ 處（L4844 `_V41_SB_URL` 殘留、L6999、L8015、L9877…） | grep `supabase.co` | 收斂單一 config 區（低急迫，改時順手） |
| N6 | ⚪ | Advisors：23 個 SECURITY DEFINER 函式 anon 可執行 | advisors WARN ×23 | 多為刻意設計（Dashboard 無登入架構）；逐支確認即可，暫不動 |
| N7 | ⚪ | Telegram 深連結端到端驗收（S136 遺留待辦）：notify>0 已於 7/2 發生 | 4 筆警報 + Fat Mo 已見到 igwatch UI | 若 Fat Mo 確認當時 TG 有收到通知且連結可開 → 該待辦可正式結案 |

**三方衝突盤點**：HTML↔Supabase 合約斷裂 2 處（1.1 的 RPC 缺失、N1 的權限過寬）；n8n↔Supabase 寫入路徑健康（4 筆警報成功寫入即證據）；n8n↔HTML 的 webhook 硬編碼群未逐一探活（建議另跑 `/fhs-check` 補全）。

---

## §3 修復優先級總表（全部待批准，建議按此分批）

| 批次 | 項目 | Diff 規模 | 風險域 | 驗收紀律 |
|---|---|---|---|---|
| **P0**（一個 session 可完） | F1 igwatch 三行 onclick + clipboard fallback | ~10 行 | 生產 HTML | 巨檔三步計數 + NAS 實機點擊 |
| | F2 expense RPC migration + fallback 修正 | 1 migration + ~5 行 | Supabase schema | live 寫入探針 + opus fresh-context（財務域紀律） |
| | F3 seg control Desktop 開放 | ~5 行 CSS | 生產 HTML | 實機雙尺寸 playwright/截圖 |
| **P1** | 看門狗 verified_ok 正向記錄 + exec 4069 診斷 + N1 orders DELETE 政策撤除 | 中 | n8n + schema | live 驗證附 versionId/HTTP 碼 + opus 審查 |
| **P2**（另開 /cl-flow） | 訊息入庫 + 內容比對層（§4 方案）、N2 批量 search_path、N3 workflow 清理 | 大 | 跨三端 | 完整規劃流程 |

**與 S148/S149 的排序**：S148（迴圈硬化）/S149（治理可攜化）已批准排程 7/7 後執行。本報告 P0 屬小規模 bugfix，可在其前或其後獨立小批執行，由 Fat Mo 裁定順序；P2 規模大，建議排在 S149 之後。

---

## §4 Issue 7 方案：IG/WhatsApp 訊息儲存學習（AI 自動回覆的資料底座）

**現有資產盤點**：Meta 匯出 → Drive → n8n 解析管線**已經在跑**（watchdog），只是訊息解析完即棄。加一層落庫 = 複用 90% 現有管線，不是從零建。

**分期方案**（每期獨立可停，前期不依賴後期）：

| Phase | 做什麼 | 產出 | 依賴 |
|---|---|---|---|
| **A 訊息入庫** | Supabase 新表 `ig_messages`（thread_key、sender、direction、ts、text、has_receipt、source_folder、msg_hash 防重複）；n8n Parse Inbox 之後加一支 write 節點（複用 alerts 的 contentType:raw 模式）。WhatsApp 未來同表加 `channel` 欄位即接入 | 全量對話史可查可回放 | 無 |
| **B 意圖標註** | 新表 `message_annotations`：意圖分類（查價/落單/改單/付款證明/物流/售後）、訂號連結、金額抽取——先用現有 regex 資產（DEAL_RE/QUOTE_RE/NUM_ID_RE 已在 lib）離線批跑，Fat Mo 抽查校正建立標準答案集 | 結構化知識 + 校正資料集 | A |
| **C 內容比對** | §1.3 的根治：訊息內金額/品項/刻字 vs orders/order_items 欄位對照 → `content_mismatch` 警報（例：Lana $4000 vs $2380 這種案例自動抓） | 財務對帳自動化 | A |
| **D AI 回覆準備** | 回覆範本庫 `reply_templates` + 常見問題聚類報告；**人審迴圈先行**（AI 草擬→Fat Mo 按發送），不做全自動 | 半自動客服 | A+B |

**紅線與注意**：
- 訊息含客人 PII → `ig_messages` RLS **只開 service_role**（不學 alerts 開 anon SELECT；Dashboard 只顯示經 RPC 過濾的摘要）
- 體積估算：現量級（月 ~31 單對話）每月數 MB，Supabase 免費額度內
- **明確不做**：直接接 IG 私訊 API 自動回覆（Meta 平台政策 + 帳號封禁風險）——先建資料底座，回覆永遠人手按發送
- Phase A 動 n8n live workflow → 依紀律需 fresh-context 審查 + live 驗證

---

## §5 附錄：本次 live 證據清單

- Supabase REST 探針：`expense_logs` GET=200；`rpc/fhs_write_expense_log` POST=404 PGRST202；`rpc/fhs_resolve_ig_alert`（隨機UUID no-op）POST=204
- SQL：`pg_proc`（expense RPC 不存在）、`pg_policies`（orders anon 全 CRUD、expense_logs 有 INSERT 政策）、`ig_watchdog_alerts` 4 筆與截圖一致、orders/order_items 逐欄比對（0600805/06001008）
- n8n API：35 workflows 全清單；watchdog `D4LK6VrQbiXlju0V` 近 12 次 executions（4 error + 人工調試軌跡）
- Supabase advisors（security）：79 WARN / 0 ERROR（明細已按類別統計於 §2）
- V42 grep：onclick+JSON.stringify 全檔僅 3 處；`window._sbUrl|_sbHdr` 零賦值；`navigator.clipboard` 僅 1 處；seg CSS L2907-2912
