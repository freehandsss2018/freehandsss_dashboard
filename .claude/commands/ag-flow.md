# /ag-flow (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/ag-flow.md](/.fhs/ai/commands/ag-flow.md)

### 簡化流程：
1. Step 0：執行 /rp 精煉（完整 8 維度掃描）→ XML 輸出
2. Gate 1：強制停，等 Fat Mo 審閱（Y / 修改 / 取消）
3. Step 1：執行 `node scripts/cl-flow-runner.js "[精煉後 objective]"`（完整 PX+AG）
4. Step 2：確認 artifacts 存在（task-brief / px-report / ag-plan / state.json）
5. Step 3：輸出 `<plan_critique>`（ag-plan 真實缺陷，≤3點）
6. Step 4：提示「請輸入 /execute」

### 防守檢查：
- ✅ Step 0 精煉不可跳過
- ✅ Gate 1 必須強制停
- ✅ A3 Claude Verdict 不執行（ag-plan 為最終裁決）
- ✅ /execute 永遠由 Fat Mo 手動輸入
