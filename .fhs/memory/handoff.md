# FHS Handoff - 2026-05-21
當前版本：v1.4.6（憲法層）/ V41（UI層）
n8n Workflow：V47.9（Smart Cache Strategist 本地成本表）

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
5. **A2 implicit memory 觀察**：後續幾個 session 觀察 A2 在「say hi」後是否仍主動引導工作，記錄改善程度

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
- `fetch()` ❌ 靜默失敗
- `process.env` ❌ IIFE try-catch 繞過
- `require()` ❌ 完全不可用
- → 所有 HTTP 呼叫必須用 HTTP Request 節點，Code 節點只做計算

### Antigravity implicit memory 說明
- A2 的行為約束主要靠 implicit memory（1.73MB .pb 檔），非文件直接載入
- GEMINI.md 機制已驗證不存在（2026-05-19 測試）
- 文件層修復（SOP_NOW.md、橋接版）封閉了文件觸發路徑，但 implicit memory 本能仍在
