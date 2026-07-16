---
description: 精煉（內建）→ 跳 PX，AG + Claude 精簡 Verdict。Claude 裁決。(Claude Code Bridge)
---

# /cl-flow-fast (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/cl-flow-fast.md](/.fhs/ai/commands/cl-flow-fast.md)

### 簡化流程（v2.0.0，D37 A3-first 鏡像縮水版）：
1. Step 0：執行 /rp 精煉（⚡ 輕掃描）→ XML 精簡輸出
2. Gate 1：強制停，等 Fat Mo 審閱（Y / 修改 / 取消）
3. 執行 `node scripts/cl-flow-runner.js --init "[精煉後 objective]"`（開檔，不叫 API）
4. Claude 撰寫 `a3-draft.md`（同 `/cl-flow` 規格，不因 fast 降低品質）
5. 執行 `node scripts/cl-flow-runner.js --review {flow_id} --fast`（淨 A2 Gemini 評審，跳 A1）
6. 確認 artifacts（task-brief / a3-draft / ag-review / state.json；無 px-review 屬正常）
7. Claude 審閱 → 產出批評處理表 + 精簡 Verdict（cl-final-plan.md）
8. 停止，等待 `/execute`

### 適用場景：
- ✅ 功能實作、UI 修改、Bug 修復
- ❌ 技術選型、引入新 API → 改用 `/cl-flow`

### 裁決者：Claude（A3），跳過 A1 PX（評審一步保留，跳嘅係外部研究）
