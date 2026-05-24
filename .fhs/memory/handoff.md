# FHS Handoff - 2026-05-23
當前版本：v1.4.7（憲法層）/ V41（UI層）→ current 已升版
n8n Workflow：V47.10（Mirror to Supabase — Axios & Order_ID rename 支援）
/new-product skill：v1.1.0（補入 2e COST_MAP / 3f Review Mode / 5f 批次保留驗證）
/commit skill：v2.1.0（新增 Phase 1.5 Lesson Distillation 自動判斷清單）

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
