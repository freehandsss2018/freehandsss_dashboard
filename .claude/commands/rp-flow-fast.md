---
description: /rp輕量精煉自動串聯cl-flow-fast（A1+A2+A3 fast），跳過自我批評，Gate1後快速輸出Verdict (Claude Code Bridge)
---

# /rp-flow-fast (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/rp-flow.md](/.fhs/ai/commands/rp-flow.md)

### 簡化流程（fast 變體）：

1. Step 1：執行 /rp 精煉（輕掃描，跳過 structural_warning 判斷）→ XML 精簡
2. Gate 1：強制停，等 Fat Mo 審閱（Y / 修改 / 取消）
3. Step 2：自動接 cl-flow-fast（A1+A2+A3 輕量）
4. Step 3：跳過 verdict_critique（fast 定位）
5. Step 4：提示「請輸入 /execute」

### 防守檢查：

- ✅ Gate 1 必須強制停
- ✅ /execute 永遠由 Fat Mo 手動輸入
- ✅ 標示【/rp-flow-fast → cl-flow-fast 自動接管，輸入已精煉】
- ✅ Gate 2 不存在於 fast 變體
