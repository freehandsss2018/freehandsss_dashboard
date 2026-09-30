# 「重開訂單還原」同類 bug 排查方案（給 A4 審視）

> 日期：2026-10-01｜狀態：**方案已批，未執行**（Fat Mo 拷問後 2026-10-01 確認落檔）｜制度例外：decisions.md D101
> 觸發：訂單 0600930 重開時吊飾還原錯誤（2026-09-30 已修，commit c42f37d／PR #11）。Fat Mo 想知有無其他訂單、其他分支有同類問題。

## 0. 已對齊的決策（拷問結果）

| 決策 | 定案 |
|---|---|
| A4 角色 | 一次性例外：可執行（D101）；其餘情況 §7 不變 |
| A4 寫入範圍 | 只可改**獨立分支**上的 `Freehandsss_Dashboard/freehandsss_dashboardV42.html` 與測試；不碰資料庫、不 apply migration、不改生產訂單、不 push main、不部署 |
| 盤點誰做 | A3（Claude）跑全部唯讀 SELECT，結果連 SQL 落檔；A4 審證據 |
| 排查範圍 | 只查「重開訂單還原」鏈：鎖匙扣、立體擺設、追加件、大寶／家庭、`mapOrder` 總覽 |
| 受害單修法 | A3 列清單，Fat Mo 逐張批，經標準路徑「重開→改→sync」修正；`final_sale_price` 不被覆蓋 |
| `m_*_qty` 空白 | 納入盤點只查不修；是否原意由 Fat Mo 另決 |

## 1. 已知事實（可驗證）

- 根因：`reconstructOrderFromSupabase()`（V42.html 約 10598 行起）吊飾還原只信 `order_items.specification` 判方向；V2 起該欄只存刻字。
- 已修：吊飾先讀 `item_key` 尾段 `_M_(E_)?(LH|RH|LF|RF)$`，缺失才用舊規則。
- **重開只是顯示錯**；只有在錯畫面上按保存，才會把多出的部位寫回 `order_items`／`raw_form_state`／成本／利潤。故受害單＝「修復前重開並保存過」的單。
- 鎖匙扣還原：先用 `specification` 比 `左手/右手/左腳/右腳`，`!_matched` 才讀 `item_key`——**順序與吊飾相反且同樣依賴 specification，是首要嫌疑**。
- 程式內一句註解稱 `mapOrder` 總覽「用同一套後備規則」（約 10769 行）：須查證。
- `raw_form_state.m_*_qty` 自 2026-09-03 起最近 12 張單皆存 `""`（空白按 1 件計）。

## 2. 階段

### 階段 A — A3 唯讀盤點與代碼審查（不需 Fat Mo 逐步授權，全 SELECT）

**A1. 盤點 SQL（每條落檔：SQL、結果、判定）**——排除 `order_id ilike 'test%'` 與 `deleted_at is not null`。

| # | 目的 | 判定 |
|---|---|---|
| Q1 | 吊飾單：`raw_form_state` 的 `m_*_en=true` 部位集合 vs `order_items.item_key` 尾段部位集合 | 集合不等＝嫌疑 |
| Q2 | 鎖匙扣單：同上（`k_*_en` vs `_K_*` item_key） | 同上 |
| Q3 | 立體擺設／追加件：`pSubCat`、`p{N}_*` vs `_P_MAIN`／`_P_{N}` item_key | 不等＝嫌疑 |
| Q4 | `final_sale_price` vs `sum(item_sale_price)` | 不等＝嫌疑（`final_sale_price` 為真理，`item_sale_price` 為分配值） |
| Q5 | 吊飾件數 vs 頸鏈數（共用規則：2 吊飾配 1 頸鏈） | 與報價不符＝嫌疑 |
| Q6 | `updated_at - created_at` 大、曾重新保存的單 | **重點嫌疑集**（受害單只可能在此集） |
| Q7 | `item_key` 缺方向尾段的舊格式單（如 `TEMP_M_01`） | 後備規則仍生效，列出供評估 |
| Q8 | `m_*_qty`／`k_*_qty` 為空字串的單與其 `order_items.quantity` | 只報告，不判對錯 |

**A2. 代碼審查表（每項須附行號證據，不憑印象）**：每個還原分支列出「方向／數量／款式從哪個欄位讀」，標出依賴 `specification` 文字的位置。範圍：吊飾（已修）、鎖匙扣、立體擺設主件、追加件（`_P_{N}` slot）、大寶／家庭組合、`mapOrder`（約 20696 行起）、其餘讀取 `specification` 的位置（Grep 全檔）。

**A3. 產出**：`.fhs/reports/planning/2026-10-01_restore-bug-sweep-evidence.md`（盤點結果＋代碼表）；受害單候選清單（單號、錯處、推算正確值、影響售價／成本／利潤金額）。

### 階段 B — A4 審視（Fat Mo 親手觸發，見 a4-review.md）

A4 審：方案是否漏源頭、SQL 判定是否合理、代碼表是否漏分支、結論是否過度。**A4 此階段唯讀。**

### 階段 C — 修復（只在階段 A 證實有需要修的代碼 bug 才進行）

1. Fat Mo 確認進入階段 C。
2. A4（一次性例外）於**獨立分支**修 V42.html 並附測試。不 push main、不部署。
3. A3 審 A4 diff（不得跳過）；`code-reviewer` 稽核；A4 BLOCKER 不由 A3 推翻（§7 規則 4）。
4. 合併與部署依既有 `/commit` 流程，由 A3 執行。

### 階段 D — 受害單處理（只在階段 A 找到受害單才進行）

1. A3 給 Fat Mo：單號、錯處、正確值、影響金額。
2. **`finance-auditor` 必派**：確認受害單財務影響，只認其報告（財務紅線）。
3. Fat Mo 逐張批准；經標準路徑「重開→改→sync」修正；修前先 SELECT 記錄原值。
4. `finance-auditor` 對修正後每張單覆驗。

## 3. 停止條件（任一成立即停，交 Fat Mo）

- 受害單超過 **5 張**。
- 任一受害單已交貨或已全數收款結案（重新 sync 會重算成本，須先評估）。
- A4 與其他驗收衝突。
- A4 或 A3 發現須改動 `captureFormState()`、`raw_form_state` 結構或 HTML ID（禁止）。
- 重審超過 2 輪（`DISPUTE_ESCALATED`）。

## 4. 風險與回滾

| 風險 | 緩解 |
|---|---|
| Codex 寫入不經 hook 守護（財務守衛、current.html 守衛、handoff 閘）；§7 規則 3 明言 Codex 端 hook 不得當防線 | 只准獨立分支＋只改 V42.html／測試；A3 逐行審 diff；不部署；不給 Supabase 寫入 |
| 修復引入新回歸 | `/fhs-check` 5/5＋`code-reviewer`＋針對每個還原分支的回歸案例 |
| 受害單修正時 n8n 重算成本 | Fat Mo 逐張批；修前存原值；`finance-auditor` 前後對照 |
| 例外被當成常態 | D101 明訂自動失效條件 |

**回滾**：代碼＝`git revert` 對應 commit 並依 `/upload-web` 重新部署；資料＝以修前記錄的原值經標準路徑還原。

## 5. 給 A4 的審視重點

1. 鎖匙扣還原順序是否確有同類 bug（`specification` 先於 `item_key`）。
2. Q1–Q8 有否漏「受害單」的定義；有否誤把正常舊單判為受害。
3. 停止條件與權限邊界是否足夠；D101 例外有否留下不必要的寫入面。
4. 有無未列入的還原分支或讀取 `specification` 的位置。

## 6. 不在範圍

- 表單以外的全域潛在 bug 探索（另開任務）。
- `m_*_qty` 空白的修復（只查）。
- 修改 `captureFormState()`。
