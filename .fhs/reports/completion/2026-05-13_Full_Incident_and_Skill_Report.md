# 🛠️ FHS 全域架構與深度除錯指南 (Global Architecture & Deep-Dive Debugging Guide)

**適用對象**：FHS 核心開發者、AI Subagents (如 frontend-developer, finance-auditor, build-error-resolver)
**系統狀態**：v1.4.5 (Supabase-First 戰略過渡期)
**核心設計考量**：系統效能、資料不可變性 (Immutability)、直觀管理、Token 消耗極小化。

---

## 1. 系統四端定位與絕對真理協議 (The 4 Pillars & Truth Protocols)

FHS 系統由四個節點組成，資料的流動具有嚴格的「單向依賴性」。**越權計算或違背真理歸屬，是引發系統崩潰的唯一原因。**

| 系統節點 | 架構層級 | 核心職責 | 絕對真理領域 (SSoT Domain) | 嚴禁行為 (Anti-Patterns) |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** (前端 UI) | 交互與結算層 | 表單渲染、`raw_form_state` 序列化、異步還原、訂單金額結算。 | **前端利潤最高真理** (`final_sale_price`)、原始輸入狀態。 | 嚴禁更改 HTML ID（會導致 n8n Webhook 斷鏈）；**嚴禁顛倒資料還原的注入順序**。 |
| **n8n** (自動化引擎) | 運算與路由層 | SKU 正規化、陣列解構、業務邏輯判定與歷史訂單成本計算。 | **訂單總成本與淨利** (`total_cost`, `net_profit`)。 | 嚴禁 Code Node 輸出非 `[{json:{}}]` 陣列格式。 |
| **Supabase** (資料庫) | 主導數據核心 | 提供關聯式結構、強型別驗證、FK 約束與極速 RPC 讀取。 | **產品主檔與成本視圖** (動態)。 | **嚴禁使用 Trigger/Generated Column 重算訂單財務歷史資料。** |
| **Airtable** (後備庫) | 備援與營運層 | 提供過渡期 SSoT 與低頻參數修改介面（如基礎材料成本維護）。 | **低頻營運參數**（如 `Base_Costs`）。 | 嚴禁依賴 Formula 替代 n8n 進行複雜財務陣列加總。 |

---

## 2. 歷史資料還原與異步防衝突機制 (Frontend Restoration & Async Conflicts)

前端 Dashboard 在讀取 Supabase/Airtable 資料並進行「舊單還原 (`restoreFormState`)」或「依賴 `order_items` 重建 (`reconstructOrderFromSupabase`)」時，極易發生**異步注入與事件觸發衝突**。

### 2.1 衝突根因分析 (Root Cause)

還原表單時，程式碼會觸發 DOM 元素的 `change` 與 `input` 事件以帶動 UI 聯動（如展開隱藏面板）。
若在此時觸發了綁定於事件上的 `calculatePricing()`，系統會讀取「尚未完全還原」的半成品 UI 進行運算，最終導致 `Deposit`, `Balance`, `Additional Fee` 等財務數值被重置為預設值 0。

### 2.2 核心修復法則：財務最後原則 (Financial Last Rule)

Subagent 在處理任何前端資料還原或 UI 注入的任務時，必須嚴格遵守以下執行順序，**絕對不可顛倒**：

1. **結構還原 (Structure)**：優先還原產品大類開關、選項選單。
2. **動態 DOM 生成 (Dynamic Render)**：觸發 `renderLimbGrid()` 等函數生成底層子元素。
3. **明細填入 (Details)**：填充刻字、數量、部位勾選（並注意「方向池 Direction Pool」的順序對應，如 `k_lh_en` 需精準對應 `左手`）。確保子項勾選後，對應的隱藏面板有加上 `active` class 強制展開。
4. **財務與計算 (Financials - 鎖死在最尾端)**：
   * 待所有 UI 事件穩定後，最後再強行寫入 `Deposit`, `Balance` 等絕對數值。
   * 執行一次 `generate()` 與 `calculatePricing()`，完成最終視圖同步。

---

## 3. Subagent 深度診斷與除錯邏輯樹 (Debugging Logic Tree)

當系統發生錯誤時，AI Agent 應依循以下邏輯進行精確診斷，嚴禁盲目修改代碼與猜測：

### 🚨 症狀 A：前端資料還原不正確 / 進入修改模式後資料跑掉

* **Step 1. 數據源診斷**：查詢 Supabase `orders` 表的 `raw_form_state`。若 JSON 缺失或損壞，確認是否已觸發 `reconstructOrderFromSupabase` 利用 `order_items` 表進行二級重建。
* **Step 2. 注入序列檢查 (Injection Sequence)**：檢查還原函數。財務欄位（deposit, balance）賦值是否位於函數**最底部**？是否被中途的 `change` 事件洗掉？
* **Step 3. 類別與方向校對**：
  * 確認代碼中的 `item_category` 與資料庫精確匹配（如：`銀飾` 不能存成 `純銀頸鏈吊飾`）。
  * 若總覽顯示「腳」但修改介面為空，檢查 `mapOrder` 中提取的 `Direction Pool` (方向池) 是否成功映射到動態 DOM。
* **Step 4. UI 隱藏面板檢查**：確認子面板（如 `k_baby_sec_box`）是否依據勾選狀態正確開啟，避免 `generate()` 因抓不到隱藏 DOM 的資料而報錯。

### 🚨 症狀 B：Dashboard 利潤顯示異常 / 財務對帳失敗

* **Step 1. 源頭檢查**：檢查 Dashboard 傳給 n8n 的 Payload 中 `final_sale_price` 是否正確。
* **Step 2. SKU 檢查**：檢查 n8n `Parse Items` 節點是否遺漏 SKU 正規化（如 `3肢` 應被強制正規化為 `4肢` 成本）。
* **Step 3. 邊界檢查**：確認 Supabase 或 Airtable 是否被錯誤植入了 Trigger 或 Formula，導致覆蓋了 n8n 原本寫入的靜態「歷史總成本」。

### 🚨 症狀 C：訂單寫入失敗 / 雙寫不同步 (Supabase vs Airtable)

* **Step 1. 隔離檢查**：判定是 Airtable 還是 Supabase 拒絕寫入，並確認 n8n 的 `try-catch` 隔離是否生效（Airtable 必須成功以維持系統運作）。
* **Step 2. 約束檢查 (Supabase Constraint)**：
  * 是否違反 `NOT NULL`？(前端傳了 `null` 給 `final_sale_price`)。
  * 是否違反 FK Constraint？(`order_items.order_fhs_id` 找不到對應的 `orders.order_id`)。
  * 是否違反 Unique Constraint？(`order_items.item_key` 生成邏輯重複)。

---

## 4. 系統開發與維護指令 (Strategic Directives)

未來的架構擴充與 Subagent 任務必須朝以下方向推動：

1. **資料不滅定律**：每次修改訂單後，必須確保 `captureFormState()` 產生的 `raw_form_state` 完整回寫至 Supabase 與 Airtable，這是前端沙盒與歷史稽核的唯一生命線。
2. **前端視圖自癒 (Auto-repair)**：對於 `enableK/M` 為 `true` 但子項全關的早期遺留舊單，Dashboard 應在還原階段，自動依據 `order_items` 表中的資料重新勾選對應的肢體。
3. **消滅 n8n 冗餘運算**：積極推動將「產品底層主檔資料 (Master Data)」的加總權力移交給 Supabase Views (`v_products_with_costs`)，減少 n8n Token 消耗與 API 請求延遲。
4. **Airtable 降級計畫**：維持 Dashboard 直連 Supabase RPC 進行高速讀取的戰略。確保 Airtable 僅作為管理員手動維護低頻營運數據的介面。

***
*(本指南由 FHS 系統架構師總結，並由 Claude Code / Antigravity 代理嚴格執行)*
