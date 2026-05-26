# /ag-stitch-sync（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/ag-stitch-sync.md](/.fhs/ai/commands/ag-stitch-sync.md)

### 流程摘要：
1. 確認 `ui-designer` 已產出 FHS Design Spec
2. 調用 `mcp__magic__21st_magic_component_builder` 生成 UI 組件
3. 識別所有外部依賴（React/JSX、Tailwind、CDN）
4. 草稿存入 `.fhs/reports/planning/stitch_draft_{YYYY-MM-DD}.html`

### 防守檢查：
- ✅ 草稿禁止直接覆寫 current.html / 任何 V 版主核心
- ✅ 草稿只存入 `.fhs/reports/planning/`，不得存入 `Freehandsss_Dashboard/`
- ✅ 依賴清單必須明文輸出供 Fat Mo 審視
