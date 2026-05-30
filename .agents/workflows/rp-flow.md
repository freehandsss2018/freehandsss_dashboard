---
description: /rp精煉自動串聯cl-flow完整管道（A1+A2+A3），Gate1審閱後自動執行，Verdict批評後提示/execute (Antigravity Bridge)
---

# /rp-flow (Antigravity Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/rp-flow.md](/.fhs/ai/commands/rp-flow.md)

### 簡化流程：

1. Step 1：執行 /rp 精煉（8維度掃描 + structural_warning）→ XML 輸出
2. Gate 1：強制停，等 Fat Mo 審閱（Y / 修改 / 取消）
3. Step 2：自動接 cl-flow（A1 PX + A2 ag-plan + A3 Verdict）
4. Step 3：verdict_critique（3點批評，針對 Verdict 本身）
5. Step 4：提示「請輸入 /execute」（不自動觸發）

### 防守檢查：

- ✅ Gate 1 必須強制停，不可跳過
- ✅ /execute 永遠由 Fat Mo 手動輸入
- ✅ 標示【/rp-flow → cl-flow 自動接管，輸入已精煉】
- ✅ verdict_critique 必須針對 Verdict 真實缺陷，禁止套模板
