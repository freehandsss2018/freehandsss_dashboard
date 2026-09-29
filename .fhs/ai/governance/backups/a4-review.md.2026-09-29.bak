# /a4-review

**用途 (Purpose)**：實作完成後，準備 A4（Codex，代號 GPT）獨立審查的交付包，並處理 A4 的 findings。
**對應 Agent**：A3 (Claude Code) 準備交付包與回應意見；**A4 審查由 Fat Mo 觸發，A3 不代跑**。
**Version**: v1.3.0 (2026-09-26，D98；v1.1.0 範圍改基準 SHA；v1.2.0 非空自檢計入未追蹤檔；v1.3.0 修第 4 次實審 P2：舊版流程交付包路徑、失敗判定獨立於輸出檔、main 上禁用退化 merge-base)
**角色表唯一本文**：`.fhs/ai/AGENTS.md` §7「跨代理角色表 A1–A4」。本檔只寫流程，不複製角色表。
**NO-TOUCH GUARDRAIL**：本指令只產出 `artifacts/{flow_id}/` 內的報告檔，不改業務代碼；A4 不得執行任何寫入類指令。

---

## 適用範圍

- **必審**：代碼／HTML／n8n／migration／hook／腳本變更（AGENTS.md Rule 3.17 A4 附加層）。
- **可標「A4 不適用：理由」**：純文件搬移、純文案潤飾。
- 財務仍只認 `finance-auditor`；代碼／HTML 仍認 `code-reviewer` G1–G8。A4 是附加層，不取代。

## 前置（缺一不可）

1. Fat Mo 已 `/execute` 且實作完成。
2. 測試已跑並有結果。
3. `code-reviewer` G1–G8 已完成（Rule 3.17）。

## Step 1 — A3 產出交付包 `<PKG>/a4-scope.md`

**路徑定義**（依 `/execute` 前序流程，與 `execute.md` 一致）：
- 有 artifacts 的 `/cl-flow` 流程：`<PKG>` ＝ `artifacts/{flow_id}`；plan ＝ `<PKG>/cl-final-plan.md`；基線 ＝ `<PKG>/a4-baseline.txt`。
- 舊版無 artifacts 流程：`<PKG>` ＝ `.fhs/reports/planning/a4`（不存在則建立）；plan ＝ `.fhs/reports/planning/a3_execution_verdict.md`；基線 ＝ `.fhs/reports/planning/a4_baseline.txt`。
以下文中的 `artifacts/{flow_id}/` 一律讀作 `<PKG>/`，`cl-final-plan.md` 讀作上述 plan。

必含：
- **範圍基準 SHA**（`<BASE>`）：優先取 `/execute` 開工時記下的實作前 SHA（`artifacts/{flow_id}/a4-baseline.txt`，舊版無 artifacts 路徑則 `.fhs/reports/planning/a4_baseline.txt`；首行 `HEAD=<sha>`）；沒有則用 `git merge-base HEAD <目標分支>`（通常 `main`）——**但目前分支即目標分支（例如直接在 `main` 上 commit）時 merge-base 會退化成 `HEAD`，範圍必為空，此時禁用此後備，須由 Fat Mo 或實作紀錄提供明確的實作前 SHA（或其他有效祖先），否則標「A4 受阻：缺基準」**。**實作已 commit 時 `git diff HEAD` 為空，不得用它定義範圍。**
- 現時 `git rev-parse HEAD`（審查終點）。
- 已 commit 部分：`git diff <BASE>..HEAD` 的 sha256 與 `--stat`。
- 未 commit 部分：`git diff HEAD` 的 sha256（可為空）。
- `git --no-optional-locks status --porcelain` 全文。
- 未追蹤檔清單＋各自 sha256。
- **範圍非空自檢**：`<BASE>..HEAD`、工作區 diff、**未追蹤實作檔**（上列清單，排除 `artifacts/` 與自動產生的 handoff／報告檔）三者皆空時，才標「範圍為空，A4 不適用或基準錯誤」，不得送審。只有未追蹤新檔時範圍**非空**，須送審。
- 已批准 plan 路徑（`cl-final-plan.md`）。
- **批准清單 vs 實際變更清單**比對。審查範圍由 git 獨立枚舉；A3 宣告的清單只用來標「越出已批准範圍」。
- 測試結果。

## Step 2 — Fat Mo 觸發 A4（A3 不代跑）

三種途徑，由 Fat Mo 選：
- **(a)** 在 Claude Code 輸入 `/codex:review`（工作區）或 `/codex:review --base main`（分支範圍）。財務／migration 可用 `/codex:adversarial-review`（**未實測**）。
- **(b)** 在 repo 根目錄開 `codex -s read-only`，貼下方提示詞模板。
- **(c)** 桌面版 Codex 手動貼提示詞。**只能寫「要求 A4 只讀」**，不得寫已保證。

注意：`codex review --uncommitted` **不可**併用自訂提示（exit 2）。

### 提示詞模板

```
你是 A4（獨立審查者），只審不改，不得執行任何寫入。
請審查基準 <BASE> 到目前 HEAD 的已 commit 變更（git --no-optional-locks diff <BASE>..HEAD），加上工作區未 commit 變更（git diff HEAD、git status）；自行枚舉，不要只看我列的清單。
已批准 plan：artifacts/{flow_id}/cl-final-plan.md；交付包：artifacts/{flow_id}/a4-scope.md。
找出：bug、回歸、遺漏測試、安全問題、與已批准 plan 不符之處，以及越出批准範圍的變更。
每條 finding 標嚴重度（BLOCKER/MAJOR/MINOR，或 [P1]/[P2]），附檔案與行號、失敗情境。
不要給批准或裁決；沒有問題就明說沒有。
```

## Step 3 — 存檔 `<PKG>/gpt-review.md`

**重跑前**先把既有 `gpt-review.md`（若有）改名為 `gpt-review.prev-<時間>.md`，避免陳舊檔冒充本次結果。

檔頭必含：工具與版本、執行指令、範圍 sha256、Codex thread／job id、時間、**效力級別**（三級定義見 AGENTS.md §7 規則 2）。正文不改、不潤飾。

## Step 4 — A3 逐條回應

- severity 照抄，不調級；外掛的 `[P1]`／`[P2]` 照抄。
- 每條標：已修／待處理／不採納＋證據。
- A4 的 BLOCKER 不得由 A3 推翻；與其他驗收衝突交 Fat Mo。
- 審後任何代碼改動使舊報告作廢（純報告或註解除外），需重審。
- **重審上限 2 輪**；仍有未解 BLOCKER 標 `DISPUTE_ESCALATED`，停止並交 Fat Mo。

## 失敗態

| 狀況 | 判定 |
|---|---|
| 非 0 exit（無效模型 exit 1、逾時 exit 124、未登入 exit 1），**不論輸出檔是否存在** | 標「A4 受阻」；舊輸出檔不得沿用 |
| 輸出檔存在但檔頭 thread／job id 或範圍 sha256 與本次不符（陳舊檔） | 標「A4 受阻」，重跑 |
| Codex 越權寫入 | 標「A4 受阻」，回報 Fat Mo |
| A3 自行呼叫 Codex 或轉存結果 | 效力只能是「A4 未獨立驗證」 |

A4 受阻時停在驗收前，不得以「A4 已審」收尾；替代交接由 Fat Mo 決定。

## 已知限制

見探針報告 `.fhs/reports/planning/2026-09-26_a4-probe-report.md`：`codex exec -s read-only` 下寫入由沙盒阻擋；桌面版／互動模式只是「要求只讀」；Codex 端 `.codex/hooks.json` 對本 repo 未能證明生效，不是防線。

---

## Known failure modes（迴圈追加，格式勿改）

（暫無條目）
