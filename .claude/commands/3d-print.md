# /3d-print（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/3d-print.md](/.fhs/ai/commands/3d-print.md)

### 流程摘要：
0. **Step 0** — 開工前雙檢（Blender MCP 連線健檢 + 查上一 case `learned` 旗標補課）
1. **Stage ①** — 參數預測（讀案例庫 `3d/param_memory.json` + rules_frozen 鐵律）
2. **Stage ②** — 自動執行（可派 `blender-3d-modeler` subagent 跑 pipeline v0 script）
3. **Stage ③** — 眼證（render 交 Fat Mo 目測）
4. **Stage ④** — 學習＋出貨（diff-learning 寫回案例庫 + convergence_log）

### 與 `/canva-auto` 關係：
姊妹指令，同一套 diff-learning 參數回饋迴圈架構，分別對應 3D 打印線與記念短片線。
