# /cl-flow

**用途 (Purpose)**：真正的一鍵規劃協調器。觸發 `cl-flow-runner.js` 自動生成 PX + AG 真實 artifact，Claude 審閱後產出 `cl-final-plan.md`，等待 `/execute` 授權。
**對應 Agent**：A3 (Claude Code)
**Version**: v2.1.0 (2026-04-02)
**NO-TOUCH GUARDRAIL**：全程禁止任何業務代碼寫入，直到 Fat Mo 輸入 `/execute`。

---

## 路徑判斷（Path Selection）

收到 `/cl-flow [任務]` 時，先判斷走哪條路：

```
/cl-flow 觸發
    ↓
有傳入任務描述？
    → YES → 走【新路】：執行 runner 腳本，生成真實 artifact
    → NO  → 有 a1_implementation_plan.md + a2_implementation_plan.md？
                → YES → 走【舊路】：讀靜態檔，產出 a3_execution_verdict.md
                → NO  → 報錯停止，提示缺少輸入
```

---

## 【新路】預期行為 — Runner 模式

### Step 0 — 前置檢查（僅當本 session 未執行 /read 時）

若本 session 尚未執行 `/read` 初始化，執行前必須確認以下文件已知悉：
- `docs/repo-map.md` — 確認相關文件位置，避免重複搜索或漏查
- 若已執行 `/read`，跳過此步驟，直接進入 Step 1。

### Step 1 — 執行 Runner 腳本

當收到 `/cl-flow [任務]` 時，Claude 必須先執行：

```bash
node scripts/cl-flow-runner.js "[任務描述]"
```

- 腳本會自動生成 `flow_id`（格式：`YYYY-MM-DD-HHmm`）
- 從 stdout 最後一行讀取 `FLOW_ID=xxx` 以確認 flow_id
- 若腳本報錯（exit code ≠ 0），立即停止並回報錯誤，不繼續流程

### Step 2 — 確認 Artifact 存在（Deterministic Gate）

腳本完成後，必須確認以下 4 個檔案皆存在且非空：

```
artifacts/{flow_id}/task-brief.md
artifacts/{flow_id}/px-report.md
artifacts/{flow_id}/ag-plan.md
artifacts/{flow_id}/state.json
```

任一檔案缺失或為空 → 立即停止，回報缺失項目，不進行審閱。

### Step 3 — 審閱兩份 Artifact（真實消費，非模擬）

Claude 必須實際讀取並引述以下文件：

- `artifacts/{flow_id}/task-brief.md`
- `artifacts/{flow_id}/px-report.md`（A1 外部研究）
- `artifacts/{flow_id}/ag-plan.md`（A2 本地實作計劃）

審閱內容必須包含：
- 引述 PX 報告中至少 2 個具體風險或限制
- 引述 AG 計劃中至少 2 個具體任務步驟或影響檔案
- 識別 A1/A2 之間的衝突、遺漏、或 AGENTS.md 違規

### Step 4 — 產出 `cl-final-plan.md`

Claude 必須生成以下檔案：

**路徑**：`artifacts/{flow_id}/cl-final-plan.md`

**必要章節**：
1. **Verdict**：`APPROVED_READY` / `CONDITIONAL_READY` / `BLOCKED`
2. **已審閱 Artifact 清單**（含 flow_id 與生成時間）
3. **PX 主要發現**（直接引述）
4. **AG 主要發現**（直接引述）
5. **衝突/遺漏/違規**
6. **最終執行計劃**（分步驟，含影響檔案）
7. **驗證清單**
8. **批准提示**（提示 Fat Mo 輸入 `/execute`）

### Step 5 — 更新 state.json

寫入 `cl-final-plan.md` 後，更新：

```json
{
  "cl_status": "done",
  "status": "awaiting_approval",
  "execution_status": "locked"
}
```

### Step 6 — 停止等待

輸出最終計劃後，**強制停止**。
不得自行繼續任何修改。等待 Fat Mo 輸入 `/execute`。

---

## 【備援模式】靜態檔案模式（API 故障 / AG 手動規劃時啟用）

> ⚠️ 此模式為緊急備援，正常情況請使用【新路】Runner 模式。
> 適用場景：Perplexity/Gemini API 全掛、或 Antigravity 已在外部手動撰寫計劃。

當未傳入任務描述，且 `.fhs/notes/ai_reports/` 下存在以下兩個檔案時啟動：

- `a1_implementation_plan.md`
- `a2_implementation_plan.md`

### Step 1 — 讀取靜態檔案

嚴格讀取以下兩個路徑：
- `.fhs/notes/ai_reports/a1_implementation_plan.md`
- `.fhs/notes/ai_reports/a2_implementation_plan.md`

任一不存在或為空 → 報錯停止，不猜測、不 fallback。

### Step 2 — 技術審查

- 審視 A1 外部計畫與 A2 本地計畫
- 檢查互相衝突、遺漏、違反 AGENTS.md 規則

### Step 3 — 產出 Verdict

輸出 `.fhs/notes/ai_reports/a3_execution_verdict.md`，內容包含：
- 最終建議
- 主要風險
- 未解決問題
- `[NEW]` / `[MODIFY]` / `[DELETE]` 精確清單

### Step 4 — 停止等待

寫出 Verdict 後強制停止，等待 Fat Mo 輸入 `/execute`。

---

## 錯誤處理

| 情況 | 行動 |
|------|------|
| `PERPLEXITY_API_KEY` 或 `GEMINI_API_KEY` 缺失 | 報錯，提示填入 `.env` |
| 腳本 exit code ≠ 0 | 停止，顯示 stderr |
| px-report.md 或 ag-plan.md 為空 | 停止，回報哪個檔案異常 |
| repomix 不可用 | 繼續（runner 已有 fallback，AG context 降級） |

---

## 與舊版 /cl-flow 的差異

| 舊版 (v2.0) | 新版 (v2.1.0) |
|------------|--------------|
| 直接讀取 a1/a2_implementation_plan.md | 執行 runner 腳本生成真實 artifact |
| 輸出到 .fhs/notes/ai_reports/ | 輸出到 artifacts/{flow_id}/ |
| Claude 可能模擬審閱 | 強制引述真實 artifact 內容 |
| 無 state.json 狀態追蹤 | flow_id + state.json 全程追蹤 |
