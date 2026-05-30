# /cl-flow (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/cl-flow.md](/.fhs/ai/commands/cl-flow.md)

### 簡化流程：
1. Step 0：執行 /rp 精煉（完整 8 維度掃描）→ XML 輸出
2. Gate 1：強制停，等 Fat Mo 審閱（Y / 修改 / 取消）
3. 執行 `node scripts/cl-flow-runner.js "[精煉後 objective]"`（PX + AG）
4. 確認 artifacts（task-brief / px-report / ag-plan / state.json）
5. Claude 審閱 → 輸出 Verdict（cl-final-plan.md）
6. 停止，等待 `/execute`

### 裁決者：Claude（A3）
### 防守檢查：
- ✅ Step 0 精煉不可跳過
- ✅ Gate 1 必須強制停
- ✅ NO-TOUCH：禁止任何業務代碼寫入，直到 /execute
