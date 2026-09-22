# 完成記錄 — D83 防再發方案裁決與執行（Stop hook 舉證責任倒置）

**日期**：2026-09-22　**決策編號**：D83　**Flow**：`artifacts/2026-09-21-1536`（cl-flow-fast）
**授權**：Fat Mo `/execute A`（Verdict CONDITIONAL_READY）

---

## 一、任務背景

Fat Mo 就 2026-09-19～21 同一 session 內「成本系統角色反覆遺忘、建議立場三度翻轉」（見 `decisions.md`「AI 過失記錄」）要求防再發方案。本人撰寫 4 層 3 期方案（`.fhs/reports/planning/2026-09-21_component-charter-prevention-plan.md`），Fat Mo 要求用 `/cl-flow-fast` 評估好唔好。

## 二、評審過程（唯讀，遵 cl-flow-fast 規格）

- **A3 草案**：`artifacts/2026-09-21-1536/a3-draft.md`——基礎分析發現原方案有 R1–R5 增量效益被高估（大部分同已落盤嘅 `FHS_Cost_System_Overview.md`／D82 重疊）、自我適用測試（方案叫人「冇錯數就唔好改」，而事故帳簿零出錯）過唔到自己條門檻、現有 Stop hook 有精確缺口（`LOOKBACK_TURNS` 無條件放行）。
- **A2 對抗評審**：`artifacts/2026-09-21-1536/ag-review.md`（Gemini 3.6-flash，主模型 3.8-flash 過載自動降級）——1 BLOCKER + 4 MAJOR + 1 MINOR。
- **Verdict**：`artifacts/2026-09-21-1536/cl-final-plan.md`——CONDITIONAL_READY，Option A′。

## 三、批評處理表（全部採納，見 Verdict §2 完整版）

| # | 批評 | Severity | 結果 |
|---|---|---|---|
| 1 | 損害定義過窄，漏咗知識庫污染（5 份錯誤文件推上 main） | MAJOR | 採納，更正損害定義 |
| 2 | Hook 無法用純程式判斷「新／舊斷言」 | **BLOCKER** | 採納，改用舉證責任倒置設計 |
| 3 | `PROPOSES_CHANGE` 正則無法排除否定句 | MAJOR | 採納，整條唔加 |
| 4 | `SKILL.md` 加速查表違反 SSOT | MAJOR | 採納，`SKILL.md` 零改動 |
| 5 | 自我適用測試雙重標準 | MAJOR | 採納，收窄至「已證實嘅重複性流程風險」 |
| 6 | 用真實 transcript 測試＝過擬合 | MINOR | 採納，加同義變體＋邊界案例 |

## 四、執行內容

### 期 1 — `scripts/hooks/stop-finance-auditor.js` v1.1.0

放行邏輯由「lookback 5 輪內派過即無條件放行」改為三選一：
1. 本輪本身有 `finance-auditor` dispatch
2. 回覆含依據標記 `【依據：finance-auditor <flow_id 或日期>】`（引用既有報告）
3. 回覆含既有豁免標記 `【finance-auditor 豁免：理由】`

`LOOKBACK_TURNS` 降級為僅喺條件 2 命中時標註 `cited-verified`／`cited-unverified`（合法性提示，唔影響是否放行）。**不動**：`stop_hook_active` 防死鎖、`WAIVER_MARK`、解析錯誤靜默放行三項既有安全設計。

**刻意唔做**：AG 否決嘅「改動建議」語義偵測正則（`PROPOSES_CHANGE`）。

### 期 2 — `.fhs/notes/FHS_Cost_System_Overview.md`

新增「五之二、組件現行立場」速查（5 行表格，純指針：組件／立場／決策編號），`finance-gatekeeper/SKILL.md` 零改動。

## 五、驗證

### 5.1 夾具（`scripts/hooks/test/run-finance-stop-fixtures.js`）

- 既有 20 條中，**F5 期望值由「放行」改「攔截」**（刻意行為改變，正正係修緊嘅缺口，唔算改壞）；其餘 19 條維持不變。
- 新增 15 條：F17–F20（依據標記 4 條）、G1–G6（同義變體 6 條）、B1–B5（邊界案例 5 條，覆蓋 Verdict 指定嘅五類）。
- **結果：35/35 PASS**（首輪 G1 因測試設計錯誤 fail 一次，已修正測試本身後重跑全過，非代碼問題——G1 原意測「PROPOSES_CHANGE 唔存在唔會誤攔」，但用戶提問本身含「成本」已觸發現有訊號，同新正則無關，已更正描述同期望值）。

### 5.2 真實 transcript 重播

用本 session 真實 transcript（`275997f1-5dcb-40e8-840b-ee6327ea3a1a.jsonl`，44 個 prompt 邊界）重播：
- 基礎偵測機制（execute_sql／Read 財務文件／用戶 prompt 含財務字眼）喺新舊版本都正確攔截，確認冇改壞。
- **🔴 意外發現新缺口**：第二次 `/commit` 嘅完成摘要（含錯誤 4「沒有任何裁決要求改或不改」）喺**舊同新版本 Hook 之下都係 `no-signal`**——因為該輪係陳述句（冇問號、冇「請確認」），且冇叫 `execute_sql`／Read 財務文件（純用 Edit/Write 寫入 decisions.md／Changelog），現有 `financeSignal()` 完全唔檢查 Edit/Write 工具。

**呢個發現嘅意義**：本次修復嘅係「派過一次之後幾輪新結論免檢」呢個缺口（lookback 過寬），但「純陳述句、用 Edit 寫入財務文件」呢類財務結論，**由 v1.0.0 到 v1.1.0 都從未被偵測過**——係獨立、更大嘅缺口。呢個未經 AG 評審設計方案，按 execute.md 範圍紀律，本次刻意唔擴大範圍修，已記入 `handoff.md` `[D83-follow]`，留待下次另開 `/cl-flow-fast` 評估（候選方向：`financeSignal()` 加 Edit/Write 財務文件路徑偵測；或改用「回覆含財務數字結論」而非依賴問句嘅訊號設計）。

## 六、影響檔案

| 檔案 | 改動 |
|---|---|
| `scripts/hooks/stop-finance-auditor.js` | v1.0.0→v1.1.0，放行邏輯改三選一 |
| `scripts/hooks/test/run-finance-stop-fixtures.js` | F5 期望值更正＋新增 15 夾具 |
| `.fhs/notes/FHS_Cost_System_Overview.md` | 新增「五之二、組件現行立場」 |
| `.fhs/notes/decisions.md` | 新增 D83 |
| `Changelog.md`／`.fhs/notes/session-log.md`／`.fhs/memory/handoff.md` | 同步摘要 |
| `.fhs/reports/planning/2026-09-21_component-charter-prevention-plan.md` | 標記已被否決取代 |

## 七、後效同步稽核

- **[A] 結構變動**：新增 `FHS_Cost_System_Overview.md`（已於上一輪 session 登記 `docs/repo-map.md`）；`planning/` 目錄已有籠統登記，個別規劃檔跟現有慣例不逐一列。
- **[B] 制度層變動**：Stop hook 行為改動 → 本完成記錄。
- **[C] CHANGELOG**：已更新（行為邏輯改變）。
- **[G] 運算邏輯變動**：不觸發（無 migration／n8n／`calculatePricing`／`cost_configurations` 改動；本次係治理 hook，非財務運算邏輯）。

## 八、Subagent 使用記錄

❌ 本輪為治理設計評估，用 `/cl-flow-fast`（Claude A3 草案 ＋ Gemini A2 對抗評審），非財務數字判斷，豁免 `finance-auditor`。

【交付前雙紀律自檢】
驗收：Hook 改動經 35/35 夾具＋真實 transcript 重播雙重驗證；意外發現嘅新缺口已誠實記錄而非隱藏，未超出 Verdict 批准範圍擅自修復。
Subagent：❌ 豁免（治理設計評估，非財務數字判斷；已用 cl-flow-fast 對抗評審取代）。
