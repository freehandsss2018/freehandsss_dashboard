---
description: 輕量規劃協調器 — 跳過 PX，只跑 AG + Claude 精簡 Verdict (Antigravity Bridge)
---

# /cl-flow-fast (Antigravity Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/cl-flow-fast.md](/.fhs/ai/commands/cl-flow-fast.md)

### 簡化流程：
1. 執行 `node scripts/cl-flow-runner.js --quick "[任務]"`
2. 確認 `ag-plan.md` 存在
3. Claude 審閱 → 輸出精簡 Verdict（cl-final-plan.md）
4. 停止，等待 `/execute`

### 適用場景：
- ✅ 功能實作、UI 修改、Bug 修復
- ❌ 技術選型、引入新 API → 改用 `/cl-flow`
