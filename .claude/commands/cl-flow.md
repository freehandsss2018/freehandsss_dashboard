# /cl-flow (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/cl-flow.md](/.fhs/ai/commands/cl-flow.md)

### 簡化流程（v3.0.0，D37 A3-first）：
1. Step 0：執行 /rp 精煉（完整 8 維度掃描）→ XML 輸出
2. Gate 1：強制停，等 Fat Mo 審閱（Y / 修改 / 取消 / 拷問我）
3. 執行 `node scripts/cl-flow-runner.js --init "[精煉後 objective]"`（開檔，不叫 API）
4. Claude 撰寫 `a3-draft.md`（基礎分析＋部署方案，附真實檔案路徑）
5. 執行 `node scripts/cl-flow-runner.js --review {flow_id}`（A1 Perplexity + A2 Gemini 評審草案）
6. 確認 artifacts（task-brief / a3-draft / ag-review / px-review / state.json）
7. Claude 審閱評審意見 → 產出批評處理表 + Verdict（cl-final-plan.md）
8. 停止，等待 `/execute`

### 裁決者：Claude（A3）
### 防守檢查：
- ✅ Step 0 精煉不可跳過
- ✅ Gate 1 必須強制停
- ✅ NO-TOUCH：禁止任何業務代碼寫入，直到 /execute
