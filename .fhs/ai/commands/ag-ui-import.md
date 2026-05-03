# /ag-ui-import

**用途 (Purpose)**：將 Stitch 生成的 UI 草稿標準化為 FHS-compliant 的 Vanilla HTML/CSS，去除所有外部框架依賴，並封裝至 V[N] prototype 中。
**Added in**：v1.4.2（2026-05-03 Stitch 整合）
**執行方**：Antigravity (A2) + frontend-developer

---

## 前置條件（必須全部滿足）

- [ ] `/ag-stitch-sync` 已完成，草稿存在於 `.fhs/notes/ai_reports/stitch_draft_*.html`
- [ ] 依賴清單已由 `/ag-stitch-sync` 識別完畢
- [ ] Fat Mo 已確認草稿方向正確

---

## 轉換流程（嚴格順序）

1. **去除 React 依賴**：移除所有 `className` → 改為 `class`，移除 JSX 語法與 hooks
2. **去除 Tailwind**：將所有 Tailwind class 轉為等效的 inline CSS 或 `--fhs-*` Custom Properties
3. **去除 CDN**：移除所有外部 `<link>` / `<script>` CDN，改為本地 inline CSS
4. **FHS token 對齊**：確保所有色彩、間距使用 `--fhs-*` token（符合 AGENTS.md §設計規範）
5. **移交 frontend-developer**：整合至 `Freehandsss_Dashboard/freehandsss_dashboardV[N]_proto.html`

---

## 驗收標準（Code Reviewer 稽核點）

| 項目 | 通過條件 |
|------|---------|
| React 語法 | ❌ 零 `className` / JSX |
| Tailwind | ❌ 零 Tailwind utility class |
| 外部 CDN | ❌ 零外部 `<link>` / `<script>` |
| FHS tokens | ✅ 全部使用 `--fhs-*` CSS Variables |
| Code Reviewer | ✅ PASS（AGENTS.md §HARD_RULES）|

---

## 副作用 (Side Effects)

- 是否寫檔：**是**（只限 `Freehandsss_Dashboard/freehandsss_dashboardV[N]_proto.html`）
- 是否修改主核心：**絕對禁止**（只能寫入 `_proto.html`，不得觸碰 `current.html` / V36 / V37 / V40）
- 是否執行 shell：**否**
