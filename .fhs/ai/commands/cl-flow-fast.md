# /cl-flow-fast

**用途 (Purpose)**：輕量版規劃協調器。跳過 Perplexity 外部研究，直接以 Gemini（AG）產出本地實作計劃，Claude 審閱後輸出精簡 Verdict，等待 `/execute` 授權。
**適用場景**：功能實作、UI 修改、Bug 修復、已定架構的改動（不涉及技術選型或新系統引入）
**不適用場景**：引入全新 API / 外部服務、重大架構重組、技術選型決策 → 請改用 `/cl-flow`
**對應 Agent**：A3 (Claude Code)
**Version**: v1.0.0 (2026-04-26)
**NO-TOUCH GUARDRAIL**：全程禁止任何業務代碼寫入，直到 Fat Mo 輸入 `/execute`。

---

## 與 /cl-flow 的差異

| 項目 | /cl-flow | /cl-flow-fast |
|------|---------|--------------|
| Perplexity A1 外部研究 | ✅ 執行 | ❌ 跳過 |
| Gemini A2 本地實作計劃 | ✅ 執行 | ✅ 執行 |
| Claude A3 審閱 + Verdict | ✅ 完整版 | ✅ 精簡版 |
| repomix codebase context | ✅ | ✅ |
| 適合任務 | 架構決策、新系統 | 功能實作、UI、Bug |
| token 消耗 | ~30,000–40,000 | ~15,000–20,000 |

---

## 執行步驟

### Step 0 — 前置檢查（僅當本 session 未執行 /read 時）

若本 session 尚未執行 `/read` 初始化，執行前必須確認以下文件已知悉：
- `docs/repo-map.md` — 確認相關文件位置，避免重複搜索或漏查
- 若已執行 `/read`，跳過此步驟，直接進入 Step 1。

### Step 1 — 執行 Runner 腳本（quick 模式）

```bash
node scripts/cl-flow-runner.js --quick "[任務描述]"
```

- `--quick` flag 跳過 Perplexity，只調用 Gemini
- 腳本自動生成 `flow_id`（格式：`YYYY-MM-DD-HHmm`）
- 從 stdout 最後一行讀取 `FLOW_ID=xxx`
- 若腳本報錯（exit code ≠ 0），立即停止並回報錯誤

### Step 2 — 確認 Artifact 存在

腳本完成後，確認以下 3 個檔案皆存在且非空：

```
artifacts/{flow_id}/task-brief.md
artifacts/{flow_id}/ag-plan.md
artifacts/{flow_id}/state.json
```

注意：quick 模式**不產出** `px-report.md`，此為正常現象。

### Step 3 — 審閱 AG 計劃

Claude 必須實際讀取：

- `artifacts/{flow_id}/task-brief.md`
- `artifacts/{flow_id}/ag-plan.md`（A2 本地實作計劃）

審閱重點：
- 影響檔案清單是否完整（有無漏掉的依賴檔）
- 步驟是否違反 AGENTS.md 硬規則（HTML ID、API Key、三端同步）
- 驗證計劃是否可操作

### Step 4 — 產出精簡 Verdict

**路徑**：`artifacts/{flow_id}/cl-final-plan.md`

**精簡格式（必要章節）**：

```markdown
# Verdict — {flow_id}

## 1. 判決
APPROVED_READY / CONDITIONAL_READY / BLOCKED

## 2. 風險 / 違規（若有）
- [列出問題，若無則寫「無」]

## 3. 執行確認清單
- [ ] 影響檔案 1 — 改動說明
- [ ] 影響檔案 2 — 改動說明
...（最多 10 項）

## 4. 批准提示
輸入 `/execute` 開始執行。
```

> 注意：精簡格式不要求重複複述 ag-plan 全文，只需列出確認清單與異常。

### Step 5 — 更新 state.json

```json
{
  "cl_status": "done",
  "status": "awaiting_approval",
  "execution_status": "locked"
}
```

### Step 6 — 停止等待

輸出 Verdict 後**強制停止**，等待 Fat Mo 輸入 `/execute`。

---

## 錯誤處理

| 情況 | 行動 |
|------|------|
| `GEMINI_API_KEY` 缺失 | 報錯，提示填入 `.env` |
| 腳本 exit code ≠ 0 | 停止，顯示 stderr |
| ag-plan.md 為空 | 停止，回報異常 |
| repomix 不可用 | 繼續（AG context 降級至最小） |
| 任務明顯需要外部研究 | 警告 Fat Mo 改用 `/cl-flow` |
