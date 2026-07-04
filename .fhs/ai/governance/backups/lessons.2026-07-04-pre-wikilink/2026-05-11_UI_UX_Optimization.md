# FHS Lesson - 2026-05-11: UI/UX Optimization for Critical Navigation

## Context (情境)
在行動版 Dashboard 中，右下角的浮動按鈕（Pill）雖然在桌機版很方便，但在手機版會遮擋底部的固定功能列（如「提交」、「同步」、「設定」按鈕）。這導致了嚴重的可用性問題，使用者無法輕易點擊到被遮擋的功能。

## Lesson Learned (教訓/經驗)
1. **浮動元素 (Floating Action Buttons) 的風險**：在行動裝置上，空間極其寶貴。任何固定或浮動的元素都必須仔細考慮其層級 (z-index) 以及是否會遮擋主要的操作路徑。
2. **狀態指示與切換的整合**：與其使用獨立的浮動按鈕來切換系統狀態（如 Supabase 讀取開關），不如將其整合進現有的導覽列或狀態列。這不僅節省空間，也能讓 UI 看起來更專業且具一致性。
3. **呼吸燈動畫的引導作用**：使用微小的動畫（如脈動的綠色光點）可以有效地在不佔用額外文字空間的情況下，傳達「系統正在運行」或「即時連線中」的狀態。
4. **響應式標籤處理**：在小螢幕上，應優先保留圖示並隱藏文字標籤，以維持版面的整潔。

## Actionable Patterns (可重用模式)
- **Status Chip Pattern**: 
  ```html
  <div class="status-chip" onclick="toggle()">
    <span class="status-dot pulse"></span>
    <span class="status-label">Supabase</span>
  </div>
  ```
- **Responsive Hiding**: 
  ```css
  @media (max-width: 600px) {
    .status-label { display: none; }
  }
  ```

## Related Files
- `Freehandsss_dashboardV41.html`
