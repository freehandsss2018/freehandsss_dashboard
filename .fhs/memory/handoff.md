# FHS Handoff - 2026-05-21
當前版本：v1.4.6（憲法層）/ V41（UI層）
n8n Workflow：V47.9（Smart Cache Strategist 本地成本表）

---

## 本次 Session 完成事項（2026-05-21）

### 3. 批次色 Over-Sweep Bug 修復（freehandsss_dashboardV41.html）

**根因（訂單內多批次 item 被一次性覆蓋）**：
- `applyBatchColorLive` 未定義（silent ReferenceError），oninput 無效
- `saveInlineEdit` Batch_Number 段用 `.order-group-${orderId} .batch-cell` 掃全訂單，更新單一 item 批次時所有 item 顏色一同改變

**修復**：
- `applyBatchColorLive` 以正規式 `^batch-input-(.+)-(\d+)$` 從 input.id 提取 orderId + itemIndex，只更新 `#row-orderId-item-itemIndex` 的 `.batch-cell`；itemIndex===0 時才同步備註 td
- `saveInlineEdit` 改用 `_targetRow = getElementById('row-${recordId}-item-${itemIndex}')` 精準定位，消除全訂單掃描
- `oninput` 改傳 `this` 作為第二參數：`applyBatchColorLive(this.value, this)`（replace_all，2 處）

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
