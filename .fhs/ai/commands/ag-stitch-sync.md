# /ag-stitch-sync

**用途 (Purpose)**：讓 Antigravity 開啟 Google Stitch MCP，檢視並擷取 Stitch 生成的 UI snippet，識別外部依賴，為後續 `/ag-ui-import` 轉換做準備。
**Added in**：v1.4.2（2026-05-03 Stitch 整合）
**執行方**：Antigravity (A2)

---

## 執行步驟（嚴格順序）

1. **確認輸入**：確認 `ui-designer` 已產出 FHS Design Spec（含 CSS Variables 規格與 wireframe）
2. **開啟 Stitch**：調用 `mcp__magic__21st_magic_component_builder`，根據 FHS Design Spec 生成 UI 組件
3. **審視輸出**：檢查 Stitch 生成的 HTML/CSS，識別所有外部依賴：
   - React `className` / JSX 語法
   - Tailwind class（如 `px-4`, `text-sm`, `flex`）
   - 外部 CDN `<link>` / `<script>`
4. **標注依賴清單**：列出所有需要去除的項目，供 `/ag-ui-import` 使用
5. **存入草稿**：將原始 Stitch 輸出存入 `.fhs/notes/ai_reports/stitch_draft_{YYYY-MM-DD}.html`

---

## 守護規則

- ❌ 禁止：Stitch 輸出直接覆寫任何主核心（`current.html` / V36 / V37 / V40）
- ❌ 禁止：跳過依賴清單步驟直接進入轉換
- ✅ 必須：草稿只存入 `.fhs/notes/ai_reports/`，不得存入 `Freehandsss_Dashboard/`
- ✅ 必須：依賴清單明文輸出，讓 Fat Mo 可審視

---

## 副作用 (Side Effects)

- 是否寫檔：**是**（只限 `.fhs/notes/ai_reports/stitch_draft_*.html`）
- 是否修改主核心：**絕對禁止**
- 是否執行 shell：**否**
