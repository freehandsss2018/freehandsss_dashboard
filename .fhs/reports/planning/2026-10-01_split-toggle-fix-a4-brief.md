# A4 執行規格：模式切換無聲覆寫數值修復（D102）

> 撰寫：A3（Claude Code），2026-10-01。授權：`.fhs/notes/decisions.md` D102（Fat Mo 批）。
> 執行者：A4（Codex）。本檔為 A4 唯一任務書；範圍以外一律不做。

## 0. 硬邊界（違反即停手回報）

- **只准改**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`；**只准新增**：`scripts/tests/split_toggle_ui/run.js`（及同目錄 README，可選）。
- **工作位置**：獨立 git worktree，**唔好喺 Fat Mo 主倉 checkout 切分支**：
  ```
  git worktree add .claude/worktrees/a4-split-toggle-fix -b a4/split-toggle-fix e978c42
  ```
  （於 repo 根 `D:\SynologyDrive\Free_handsss\freehandsss_dashboard` 執行）
- **禁止**：改 `Freehandsss_dashboard_current.html`；改任何 HTML `id`；改 `captureFormState()`／`restoreFormState()` 序列化結構；改計價公式（`calculatePricing()` 等）；碰資料庫／n8n；push；部署；執行 `/execute`、`/commit`、`/upload-web` 等寫入類指令。
- **快照只存 JS 記憶體變數**，不得寫入任何會被 `captureFormState()` 序列化嘅 DOM 欄位（例如追加件 hidden input `${ns}babyMode` 唔可以拎嚟存快照）。
- 完成後 commit 喺 `a4/split-toggle-fix` 分支（本地），交回 A3；唔好 merge。

## 1. Bug 一：鎖匙扣「統一／分開填」切換（嬰兒 `prefix=''`、大寶 `prefix='e_'`）

### 重現（Fat Mo 2026-10-01 實測）
1. 新增訂單 → 鎖匙扣 → 嬰兒 → 揀「左手」「左腳」→「如果有部位想唔同 → 分開填」。
2. 左手：數量 4／上排 Yun／下排 0905；左腳：數量 2／Yun／0905。
3. 撳「改返全部部位統一設定」→ 統一欄顯示 4。**此時左腳 `k_lf_qty` 已被無聲改成 4**。
4. 再撳「分開填」→ 左手 4、左腳 4（原本 2 遺失）。刻字（上排／下排）同樣會被覆寫。

### 根因
`fhsD51KToggleOverride(prefix)`（約 V42.html:7966）：
- 關閉分開填時，以第一個已選部位值填統一欄，接住 `fhsD51KSharedChange(prefix)` 寫入**全部已選部位** → 無提示覆寫。
- 開啟分開填時，以統一欄值寫入四個部位。

### 規格（必須全部符合）
- **K1 確認框**：由「分開填」改返統一時，若已選部位之間 `qty／top／bot` 任何一項唔同，`confirm()` 提示，內容需列出差異，例如：
  `各部位設定唔同（左手 4件 Yun/0905；左腳 2件 Yun/0905）。改返統一會全部變成：4件 Yun/0905。確定？`
  撳取消 → 保持分開填，**任何欄位都唔改**。全部相同 → 唔彈框，直接切。
- **K2 快照**：確認切統一前，將各已選部位 `qty/top/bot` 存入記憶體快照（例如 `FHS_D51_K_SNAP[prefix]`）。統一後照現行行為將統一值寫入各部位（WYSIWYG：統一模式下保存＝統一值）。
- **K3 還原**：由統一切去分開填時：
  - 快照存在且統一期間**冇人手改過統一欄** → 各部位還原快照值（只還原快照內且仍然已選嘅部位；新加嘅部位用統一值）。
  - 統一期間改過統一欄（三個統一 input 嘅 `oninput`）→ 丟棄快照，各部位維持現值（即統一值）。
  - 無論如何，**切去分開填本身唔可以再用統一值覆寫部位**（部位喺統一模式下已等於統一值）。
- **K4 清快照**：以下情況必須清走對應 prefix 嘅快照：`fhsD51ClearCategory('K')`、`fhsD51SyncPillsFromState()`（載入／重開訂單）、`resetForm()`（新增訂單）。防止上一張單數值滲入。
- **K5** 統一模式下藥丸加／減部位、`fhsD51KApplySharedToPart` 等現有行為不變。

## 2. Bug 二：立體擺設（手模）嬰兒顏色模式切換

### 重現
1. 立體擺設 → 嬰兒 → 「自訂」→ 逐肢揀：左手 粉紅色、右手 藍色、左腳 粉紅色、右腳 藍色。
2. 撳「二手二腳」→ 四肢被快選顏色覆寫。
3. 再撳「自訂」→ 四肢全部重設「待定」，步驟 1 揀好嘅顏色遺失。
4. 追加件（第二件起，`fhsPExtraBabyMode(slot, mode)`）同樣問題。

### 根因
- 主件 `babySetMode(mode)`（約 :8868）：非 custom → `babyApplyFill` 覆寫；custom → `babyCustomColor='待定'` + `babyApplyAllCustom()` 全設待定。
- 追加件 `fhsPExtraBabyMode(slot, mode)`（約 :8564）同構。

### 規格
- **P1 保留 2026-05-09 決定**：**第一次**入「自訂」（冇快照）時，四肢照舊預設「待定」（確保二手二腳報價 $2380 計入四肢，見 Changelog.md:6473）。
- **P2 確認框**：由「自訂」切去快選模式（all／left／right）時，若切換會將任何一肢**現值為實際顏色（非「待定」／「無」）**改成另一個值，`confirm()` 列出受影響肢體，取消 → 保持自訂、唔改任何值。
- **P3 快照**：確認後、套用快選前，存四肢顏色快照（主件一份、每個追加件 slot 各一份，記憶體變數）。
- **P4 還原**：由快選切返「自訂」時：快照存在且快選期間**冇改過快選顏色**（`babyColorChanged`／`fhsPExtraBabyColorChanged`）→ 還原快照；改過 → 丟棄快照，行 P1 預設行為。
- **P5 清快照**：`resetForm()`、訂單還原（含追加件還原，約 :10451 附近）、`renderLimbGrid()` 重建、`_applyGlassDefaults()`、`babyReturnToGlassPending()`、追加件刪除（`fhsPExtraRemove`）、`pSubCat` 款式切換時清走對應快照。
- **P6** `glass_pending` 流程、玻璃瓶款式行為完全不變。

## 3. 不受影響（A4 毋須改，但請審視確認）
- 925 頸飾（`m_*`）：每部位獨立欄位，無共用／分開切換。
- `copyToOthers()`（約 :7734）：無呼叫者，死碼，**本次唔刪**（刪除需 Fat Mo 另批）。

## 4. 測試（A4 新增 `scripts/tests/split_toggle_ui/run.js`）
參照 `scripts/tests/restore_ui/run.js` 格式（Playwright `browser_run_code_unsafe`；`cfg.mode` assert／observe；攔截一切非 GET 寫入請求並記 violation；唔撳保存／同步）。最少案例：

| # | 案例 | 預期 |
|---|---|---|
| T1 | 嬰兒 K：分開填 左手4/左腳2 → 統一（confirm=取消） | 仍分開填，左手4、左腳2 |
| T2 | 同上 → 統一（confirm=確定） | 統一欄 4；兩部位 qty=4 |
| T3 | T2 後直接 → 分開填 | 左手4、左腳2（還原） |
| T4 | T2 後改統一數量 5 → 分開填 | 兩部位 5 |
| T5 | 刻字差異（上排 Yun／Ming）走 T2→T3 | 刻字還原 |
| T6 | 大寶 `e_` 重複 T1–T3 | 同上 |
| T7 | 全部相同 → 統一 | 唔彈 confirm |
| T8 | T2 後 resetForm（新增）→ 再揀部位 → 分開填 | 無舊快照滲入 |
| T9 | 手模主件：自訂 4 色 → 二手二腳（確定）→ 自訂 | 4 色還原 |
| T10 | T9 中途改快選顏色 → 自訂 | 四肢「待定」 |
| T11 | 第一次入自訂 | 四肢「待定」（P1） |
| T12 | 自訂 → 快選（取消） | 保持自訂、顏色不變 |
| T13 | 追加件 slot 重複 T9、T12 | 同上 |
| T14 | 回歸：以同一方式跑現有 `scripts/tests/restore_ui/run.js`（17 案例）desktop＋mobile | 全綠 |

`confirm()` 用 `page.on('dialog')` 控制接受／拒絕。observe 模式對 `e978c42` 原版跑一次，證明 T1–T3、T9 等案例喺修復前係紅（測試有效）。

## 5. 交回 A3 時必附
1. 分支名、commit SHA、`git diff e978c42..HEAD --stat`。
2. 測試結果：修復前（observe）／修復後（assert）× desktop／mobile。
3. 改動函數清單＋每項對應規格編號（K1–K5、P1–P6）。
4. 任何偏離規格之處及理由；遇到規格未覆蓋情況，停手列出，唔好自行擴大範圍。
