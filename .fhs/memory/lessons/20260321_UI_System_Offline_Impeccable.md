# FHS Lesson: 離線版頂級 UI 重構 (Offline Impeccable Design)

## 💡 學習點總結
在網路不穩或 CDN 連線受限 (ConnectError) 的環境下，過度依賴外部 Tailwind CSS CDN 會導致 Dashboard 渲染崩潰或失去樣式。

## 🛠️ 解決方案
- **原生 Pure CSS**: 將原有的 Tailwind Utility Classes 轉化為內建的 `style` 區塊，實現 100% 離線可用。
- **Impeccable 規範**: 
  - **Glassmorphism**: 使用 `backdrop-filter: blur(10px)` 與 `rgba(255, 255, 255, 0.9)` 實現。
  - **4pt Grid**: 所有的 Padding、Gap、Margin 必須對齊 4px 網格。
  - **Slate/Zinc Palette**: 採用專業深灰調，取代飽和度過高的色彩。

## ⚠️ UI 保全協議 (Stitch Protocol)
- **ID 不變原則**: 為了確保 n8n 與 Airtable 寫入鏈路，絕對禁止修改任何 `input id` (如 `momName`, `pSubCat`)。
- **JS 隔離**: UI 翻新應盡量限制在 CSS 與 HTML 結構，不要改動底層 `captureFormState` 邏輯。

---
*Created: 2026-03-21*
*Reference Session: 4d98d815-4689-4fb6-9e49-16f47e8fc94d*
