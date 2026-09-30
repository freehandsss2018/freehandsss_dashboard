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

### 階段 A2 — UI/UX 還原測試（2026-10-01 追加，Fat Mo 指示；A3 執行，唯讀、零寫入）

> 目的：SQL 盤點只證明「資料一致」，證明不了「重開畫面對不對」。0600930 的症狀（多出左手、數量空白、報價變 3 吊飾／2 頸鏈）是畫面層症狀，必須在真實 UI 上驗。

**測試方法（鐵律：不得產生任何寫入）**
- 工具：Playwright（瀏覽器自動化）。目標：生產版 `current.html`（已含修復）；並用同一批案例對「修復前版本」（git `c42f37d^` 的 V42.html，本機 http 服務）跑一次，作**對照組**以證明測試能抓到 bug（測試自身有效性）。
- **網路攔截**：對 Supabase REST（`/rest/v1/orders`、`/rest/v1/order_items`）以 fixture 回應（合成資料）餵給前端，**不對生產庫發出任何 POST／PATCH／DELETE／webhook**；任何寫入類請求一律 `abort` 並記為測試失敗。不點「保存／同步／新增」按鈕。
- 每個案例：載入訂單 → 讀 DOM（各部位開關、數量、顏色、刻字、`calculatePricing()` 報價卡文字、頸鏈條數、console error）→ 與預期值逐項比對。

**案例矩陣（fixture 由真實訂單結構脫敏而成）**

| # | 案例 | 預期（重點斷言） |
|---|---|---|
| U1 | 0600930 型：吊飾右手＋左腳（specification 空／`L`） | 只有右手、左腳開；左手關；報價「吊飾 2個／1條頸鏈」 |
| U2 | 吊飾四肢（0600721 型） | 四肢皆開，2 條頸鏈 |
| U3 | 大寶吊飾 `_M_E_RH`＋嬰兒 `_M_LH` | 大寶右手、嬰兒左手；大寶區塊展開 |
| U4 | 舊格式 `TEMP_M_01`（無方向後備） | 後備規則仍生效，不報錯 |
| U5 | 鎖匙扣 `_K_LF`＋`_K_RH`（specification＝`[上排]…[下排]…` 刻字） | 只有左腳、右手；刻字上下排正確還原 |
| U6 | 鎖匙扣＋家庭組合 `_K_FAM_COMBO`（0600107 型） | 家庭組合還原、單品肢體不多不少 |
| U7 | 立體擺設主件＋追加件 `_P_2`（slot 制） | 追加件落在 slot 2，不錯位 |
| U8 | 鎖匙扣 specification 含「左手」字樣的刻字（邊界案例） | 不因刻字文字誤判方向（驗證 K 分支對 specification 的依賴） |
| U9 | `raw_form_state` 為空、僅靠 `order_items` 重建 | 部位、數量、報價一致 |
| U10 | `m_*_qty`／`k_*_qty` 為空字串的單 | 空白數量不使報價少算／多算（空白按 1 件） |

**視窗矩陣**：桌面（1440×900）與手機（375×812，含 iPhone 觸控模擬）各跑全部案例。手機額外驗：部位開關可點擊、報價卡不溢出、無橫向捲動。

**UX 觀察項（不判 PASS／FAIL，只記錄供 Fat Mo 決定）**
- 還原後畫面與原單不符時，使用者有無任何提示（目前沒有；0600930 是 Fat Mo 肉眼發現）。
- 數量欄空白是否令使用者誤以為資料丟失。
- 報價卡在部位數異常時有無警示。

**產出**：`.fhs/reports/planning/2026-10-01_restore-bug-sweep-ui-test-report.md`（案例表、修復前／後對照、截圖、console／網路日誌）；測試腳本存 `scripts/tests/restore_ui/`（不接生產寫入路徑，可重複執行，供日後回歸）。

**判定**：對照組（修復前）必須在 U1（與其他吊飾案例）出現預期的失敗，測試才算有效；修復後版本任一案例失敗＝發現新 bug，轉階段 C。

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
- 階段 A2 任一案例對修復後版本失敗（發現新還原 bug）。
- 測試過程偵測到任何寫入類網路請求（測試腳本自身違規，立即停止並回報）。

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
5. 階段 A2 UI 測試矩陣有無漏案例；「對照組必須失敗」的有效性設計是否充分；網路攔截能否真正保證零寫入。

## 6. 不在範圍

- 表單以外的全域潛在 bug 探索（另開任務）。
- 修改任何 UI 版面或文案（UX 觀察項只記錄，不改）。
- `m_*_qty` 空白的修復（只查）。
- 修改 `captureFormState()`。
