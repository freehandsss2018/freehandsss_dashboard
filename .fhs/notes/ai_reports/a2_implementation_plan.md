# A2 Implementation Plan: True 1-Click `/cl-flow` Coordinator

**Target Document**: `d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\notes\ai_reports\a2_implementation_plan.md`
**Author**: Antigravity (A2)

---

## 1. 總結 (Executive Summary)

本計畫旨在回應「真正一鍵 `/cl-flow` 協調器」的需求，解決過去需手動呼叫 `/px` 與 `/ag` 的斷層問題。
我們將引入一支基於 Node.js 的本地調度腳本（`scripts/cl-flow-runner.js`），由 Claude Code 接收到 `/cl-flow` 指令時透過系統層面觸發。該腳本將：
1. 自動生成 `flow_id` 與獨立資料夾 `artifacts/{flow_id}/`。
2. 透過系統內置的 API (Perplexity API 與 Gemini API + Repomix) 以 headless 模式並行代理 PX 與 AG 的規劃工作。
3. 等待兩個真實的 artifact (`px-report.md`, `ag-plan.md`) 寫入落盤。
4. 將控制權交還給 Claude Code，由它執行最終的審閱與綜合 verdict，產出 `cl-final-plan.md` 並等待 `/execute`。

此方案確保了 **FR-1 至 FR-7** 以及所有非功能需求 (NFR) 的達成，消除了 Claude「造假」審閱的風險，實現 100% 可審計性。

---

## 2. 任務拆解 (Task Breakdown)

### Phase 1: Artifact 架構準備與環境設定
- [ ] 於 `scripts/` 下建立 `cl-flow-runner.js`（Node.js 腳本）。
- [ ] 設定 `artifacts/` 目錄，確保它被獨立儲存並納入 `.gitignore` 的合理管理區（若是臨時產生）或保留於 `notes/ai_reports` 之下。

### Phase 2: 開發自動化腳本 (`cl-flow-runner.js`)
- [ ] **State Initialization**: 生成唯一 `flow_id`，創建資料夾，並初始化 `state.json` 與寫入輸入任務至 `task-brief.md`。
- [ ] **PX Orchestration (A1)**: 腳本內部調用 Perplexity API（讀取 `.env` 中的 `PERPLEXITY_API_KEY`），要求對外部技術/情報進行分析，強制將結果串流寫入 `px-report.md`。
- [ ] **AG Orchestration (A2)**: 腳本調用系統中已有的 `repomix`（打包 codebase 上下文），利用 `GEMINI_API_KEY` 呼叫 Gemini 模型，模擬本地 Antigravity 代理產生技術實作計畫，寫入 `ag-plan.md`。
- [ ] **Synchronization**: Promise.all 確保雙報告皆落盤，並更新 `state.json`，最終腳本 stdout 提示 Claude "Reports generated. Please process artifacts and output cl-final-plan.md".

### Phase 3: Claude Code 協定修改
- [ ] 修改 `.fhs/ai/commands/cl-flow.md`。指示 Claude (A3) 當收到 `/cl-flow [指令]` 時：
  1. 執行 `node scripts/cl-flow-runner.js "[指令]"`。
  2. 讀取腳本生成目錄中的 `task-brief.md`, `px-report.md`, `ag-plan.md`。
  3. 執行最終審核並輸出 `artifacts/{flow_id}/cl-final-plan.md`。
  4. 詢問 Fat Mo: "請檢查最終計劃。輸入 /execute 以執行。"
- [ ] 修改 `.fhs/ai/commands/execute.md`。指示 A2/A3 當遇到 `/execute`：
  1. 讀取 `artifacts/{flow_id}/state.json` 確認 `execution_status` & `cl_status`（或直接讀 `cl-final-plan.md` 檢查 verdict 為 `APPROVED_READY`）。
  2. 開始依計畫動手修改。

---

## 3. 影響檔案 (Impacted Files)

#### [NEW] `scripts/cl-flow-runner.js`
- 核心調度邏輯，封裝了對 PX 與 AG 的自動 API 調用與檔案 I/O 操作。

#### [NEW] `artifacts/` (目錄)
- 運行時產生的資料總管目錄，內部結構：`{flow_id}/state.json`, `task-brief.md`, `px-report.md`, `ag-plan.md`, `cl-final-plan.md`。

#### [MODIFY] `.fhs/ai/commands/cl-flow.md`
- 變更 `/cl-flow` 的觸發定義，從單純讀取改為**主動執行腳本 -> 跨端讀取 -> 產出終案**。

#### [MODIFY] `.fhs/ai/commands/execute.md`
- 新增對 `cl-final-plan.md` 與狀態閘道（Deterministic Gate）的依賴卡控。

#### [MODIFY] `docs/repo-map.md`
- 記錄加入 `artifacts/` 及 `scripts/cl-flow-runner.js` 的系統結構變更。

---

## 4. 驗證計畫 (Verification Plan)

**自動化/預期行為測試**：
1. **Runner Test**: 手動在終端機執行 `node scripts/cl-flow-runner.js "測試一鍵生成"`。
   - 預期結果：成功建立隨機 `flow_id` 資料夾，且內含四個真實且非空的檔案 (`state.json`, `task-brief.md`, `px-report.md`, `ag-plan.md`)。
2. **Deterministic Gate Test**: 故意刪除 `px-report.md`，並強制呼叫 Claude 進行處理。
   - 預期結果：Claude 依照 `cl-flow.md` 規則因缺少輸入檔案而拒絕規劃，觸發報錯並阻止推進。
3. **Claude Code e2e Test**: 於 IDE 內輸入 `/cl-flow 幫我加上首頁 banner`，觀察 Claude Code 是否正確觸發腳本、等待完成、並基於這兩份本地檔案產出 `cl-final-plan.md`。

---

## 5. 回滾計畫 (Rollback Plan)

- 刪除 `scripts/cl-flow-runner.js`。
- 將 `.fhs/ai/commands/cl-flow.md` 與 `execute.md` 透過 Git 撤回至本次 commit 前的舊有 v2.0 版本。
- System 恢復手動輸入 `/px` 與 `/ag` 的模式。

---

## 6. 風險及緩解措施 (Risks & Mitigations)

| # | 面臨風險 (Risk) | 緩解措施 (Mitigation) |
|---|----------------|----------------------|
| 1 | **Headless AI Timeout** <br> (PX 或 AG API 生成超時或斷線) | 在 `cl-flow-runner.js` 中實現重試機制 (Retry 3 times) 及適當的 timeout，並及時透過 stderr 把錯誤傳給 Claude，令其回報給 user。 |
| 2 | **API Key 金鑰依賴缺失** | 腳本啟動初始即執行 `process.env` 檢查（`PERPLEXITY_API_KEY` 及 `GEMINI_API_KEY`），若缺失，立刻阻斷流程。 |
| 3 | **AI 幻覺假審閱** | 嚴格修改 `cl-flow.md` 規則：強制 Claude 必須引述 `px-report.md` 與 `ag-plan.md` 中特定的 bullet point 才能算是真正消費。 |
| 4 | **Repomix Token 負載過高** | 為 AG 的 codebase context 加入 `.repomixignore` 動態優化，避免將所有肥大不相關文件送給 Gemini。 |

---
> No-Touch Guardrail: 此為規劃階段，尚未動手撰寫程式碼。等待批准。
