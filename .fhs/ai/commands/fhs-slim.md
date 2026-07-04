# /fhs-slim（文件健康清理 v1.0）

**用途**：讀取 L1（`scripts/hooks/fhs-health-check.js`）的健康報告，對五種文件病（過肥/沉積孤兒/過時漂移/同名重複/歸檔斷鏈）逐項出清理方案，停等 Fat Mo 批准後才動手。

**觸發指令**：`/fhs-slim`
**性質**：診斷＋清理管道。診斷階段唯讀；清理階段需 Fat Mo 明確批准（比照 `/execute` 授權模式），不得自行判斷「看起來安全就做」。
**版本**：v1.0.0（2026-07-05，S142 新建）

---

## 與 `/fhs-audit` 的分界（避免重複造輪）

| | `/fhs-audit` | `/fhs-slim` |
|---|---|---|
| 深度 | 30 項架構衛生深稽核，含語義層（D1-D5 五維、A1-A7 七大類） | 5 種文件病快檢，純結構層 |
| 觸發時機 | 按需，人工執行，較重（含 Python 語義稽核腳本） | 每次 SessionStart 自動偵測（L1），輕量 |
| 執行動作 | 唯讀報告，等待 Fat Mo 指示 | 唯讀報告 **+ 內建清理執行流程**（獲批准後） |
| 適用場景 | 定期全面健檢、上線前稽核 | L1 警示觸發後的日常維護、S141 式瘦身任務 |

兩者共用 `.fhs/tools/canonical_keys.yml` 真理值清單，不重複維護第二份。`/fhs-audit` A7-1/A7-3（D1 Stale / D3 Conflict）與 `/fhs-slim` 的「過時漂移」檢查邏輯相同來源，`/fhs-audit` 若已涵蓋語義層仲裁（A7-4 Redundant，需 AI 判斷）則 `/fhs-slim` 不重做，只處理 L1 能程式化偵測的部分。

---

## 執行流程

### Step 1 — 讀取 L1 報告

讀取 `.fhs/.health-report.json`（不存在 → 提示先跑一次 `node scripts/hooks/fhs-health-check.js`，或告知使用者 SessionStart hook 尚未執行過）。

若 `issue_count` = 0 → 輸出「✅ 健康檢查乾淨，無需清理」，結束。

### Step 2 — 逐項分類與方案生成

依 issue 前綴分類（過肥/孤兒/斷鏈/過時/重複），對每項：

1. **核實現況**：Grep/Read 定位確切位置（禁全檔 Read 紅線適用：`handoff.md` 只讀前 120 行）
2. **判斷清理方式**（比照 S141 分類邏輯）：
   - 已在別處有完整記錄 → 壓縮為一行索引＋連結
   - 無他處收錄但有保留價值 → 全文歸檔至 `.fhs/memory/archive/` 或對應目錄，原處留連結
   - 確認為過時/已合併/孤兒且無保留價值 → 標記為可安全移除（附判斷依據），repo 內檔案用 `git rm`（git 歷史即備份）；repo 外檔案（auto-memory）**必須先整目錄備份**才可刪（比照 S141 E2）
   - 過時漂移 → 標明「以 source_of_truth 為準，修正各 allowed_reference 的值」
   - 重複 → 標明保留哪份、其餘如何處理（合併或歸檔）
3. 輸出方案清單，格式：

```
【問題 N】<issue 原文>
判斷：<分類>
方案：<具體動作 + 目標路徑>
```

### Step 3 — 停等 Fat Mo 批准

```
┌──────────────────────────────────────────────────────┐
│  ⏸ 清理方案審閱                                       │
│  回覆「Y」全部批准 / 「N: <編號>」排除特定項 / 「取消」 │
└──────────────────────────────────────────────────────┘
```

**不得**在未獲批准前執行任何 Write/Edit/git 操作。

### Step 4 — 執行（獲批准後，S141 紀律）

1. 開分支（若非小型單一改動；單一檔案微調可在當前分支直接做，比照既有慣例判斷）
2. Repo 外檔案（auto-memory）改動前先整目錄備份
3. 只歸檔不刪：能連結解決就不刪，真要刪的（repo 內）用 `git rm`（歷史仍在）
4. **每步一 commit**，附回退指令
5. 全部改完後，若改動範圍 ≥3 檔或涉及 handoff/decisions/governance，派 **fresh-context general-purpose subagent** 做零損失對抗核對（比照 S141 38/38 模式）；範圍小（1-2 檔純數值修正）可主對話自驗
6. 重跑 `node scripts/hooks/fhs-health-check.js` 確認對應 issue 已消失、無新增回歸

### Step 5 — 完成回報 + 後效稽核

輸出格式：
```
✅ /fhs-slim 完成 [YYYY-MM-DD]
- 處理項目：N / 總 issue 數
- 排除項目：M（原因：...）
- Commit 清單：[hash 列表]
- 重跑健康檢查：issue_count N → N'
```

依 `execute.md` 規則核查 [A]/[B]/[C]/[F] 後效同步稽核（新增/刪除檔案觸發 [A]；若動到治理層文件觸發 [B]；行為/流程有變動觸發 [C]）。

【交付前雙紀律自檢】格式比照 `execute.md` [E]，驗收行標準：「文件治理」型 = 重跑健康檢查 issue 數下降 + fresh-context 核對結果（若有派工）。

---

## 執行規則

- Step 1-2（診斷+出方案）全程唯讀，不修改任何檔案
- Step 4 之前不得有任何 Write/Edit/git 操作
- 過時漂移的修正方向固定「以 canonical_keys.yml 的 source_of_truth 為準」，不得反向修改真理來源去遷就過時的引用檔
- 若某 issue 判斷不了安全與否（例如刪除價值不明），列入方案時標記「建議：保留＋加 TODO 註記」而非自行決定刪除
- 若 L1 報告本身可能有誤報（見 `.fhs/tools/fhs-health-rules.json` 的 `exclude_dir_names`/`allowlist_basenames` 設計），先核實是否為規則資料檔需要調整（新增排除項），而非照單全收去清理不該清的東西

## 版本更新日誌

- v1.0.0（2026-07-05，S142）：初版，對接 L1 `fhs-health-check.js` 五病偵測
