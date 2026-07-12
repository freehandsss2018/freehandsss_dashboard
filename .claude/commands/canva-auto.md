# /canva-auto（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/canva-auto.md](/.fhs/ai/commands/canva-auto.md)

### 流程摘要：
0. **Step 0** — 開單前補課檢查（查上一 case `learned` 旗標）
1. **Stage ①** — AI 開殼（copy-design/改名/歸檔）
2. **Stage ②** — Fat Mo 人手（僅 2 步：片去背+上載）
3. **Stage ③** — AI 換料＋比例校正（local_prep.py 圖加工 + update_fill 換母版格繼承座標）
4. **Stage ④** — 學習＋出貨（diff-learning 寫回案例庫）

### 與 `/3d-print` 關係：
姊妹指令，同一套 diff-learning 參數回饋迴圈架構，分別對應記念短片線與 3D 打印線。
