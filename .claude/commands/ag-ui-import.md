# /ag-ui-import（Claude Code Bridge）

> ## ⚠️ [DEPRECATED]（2026-07-04）— 前置步驟 `/ag-stitch-sync` 已棄用，改用 `ui-designer` + `frontend-developer` 原生流程
> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/ag-ui-import.md](/.fhs/ai/commands/ag-ui-import.md)

### 前置條件（必須全部滿足）：
- `/ag-stitch-sync` 已完成，草稿存在於 `.fhs/reports/planning/stitch_draft_*.html`
- 依賴清單已識別完畢
- Fat Mo 已確認草稿方向

### 流程摘要：
1. 去除 React/JSX 依賴（className → class）
2. 去除 Tailwind（轉為 inline CSS 或 `--fhs-*` token）
3. 去除外部 CDN（全部 inline）
4. FHS token 對齊（`--fhs-*` Custom Properties）
5. 移交 frontend-developer 整合至 V[N]_proto.html

### 防守檢查：
- ✅ 不修改任何現有主核心檔案
- ✅ 所有色彩間距必須使用 `--fhs-*` token
