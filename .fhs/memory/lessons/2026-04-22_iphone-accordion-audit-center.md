---
name: iPhone Accordion 全域核對中心實作要點
description: V40.1 — 橫向表格改為 Accordion List 的實作策略與關鍵決策
type: feedback
---

## 關鍵策略：資料驅動渲染，不遍歷 DOM

**Rule:** 在已有資料驅動渲染函數（如 `renderReviewTable()`）的情況下，響應式分支應直接在函數頂部加 `if (isMobile)` 分支，而非事後遍歷 DOM `<tr>` 元素。

**Why:** AG Plan（Gemini）建議「遍歷 `<tr>` DOM 生成 Accordion」，這是錯誤策略：
1. 資料已在 `globalOrders` 陣列，DOM 遍歷是二次解析
2. 每次 `fetchGlobalReview()` 重新渲染後，Accordion 會被清空但不重建（因為渲染是表格，Accordion 獨立生成）
3. 正確做法：`renderReviewTable()` 頂部 `if (window.innerWidth < 768) { renderReviewAccordion(orders); return; }`

**How to apply:** 任何「表格 → 行動版替換」的任務，先找渲染函數入口，加分支而非後置 DOM 操作。

---

## Accordion 動畫：純 CSS `max-height`，不用 JS 控高度

**Rule:** 展開/摺疊動畫使用 `max-height: 0 → max-height: 2000px` transition，不用 JS 控制高度。

**Why:** JS 控制高度會觸發 layout reflow，在舊款 iOS 裝置（iPhone SE/舊型號）會掉幀。純 CSS `max-height` transition 由 GPU 加速，不觸發 layout。

**How to apply:**
```css
.acc-order-body { max-height: 0; overflow: hidden; transition: max-height 0.3s ease; }
.acc-order.open .acc-order-body { max-height: 2000px; }
```
JS 只需 `el.classList.toggle('open')`。

---

## Accordion ID 命名規則（避免與 Desktop Table 衝突）

**Rule:** Accordion 中的 `input`/`select` ID 必須加前綴 `acc-`，避免與 Desktop Table 的相同元素 ID 衝突。

**Why:** Desktop Table 中已有 `batch-input-${o.id}-${idx}` 和 `status-select-${o.id}-${idx}`。若 Accordion 使用相同 ID，`document.getElementById()` 只會取到第一個匹配的元素，在 Desktop 視圖下 `saveInlineEdit()` 可能讀到隱藏的 Accordion 元素值。

**Accordion ID 前綴**：
- `acc-batch-${o.id}-${idx}` （批次輸入）
- `acc-status-${o.id}-${idx}` （進度下拉）
- `acc-notes-${o.id}` （備註 textarea）

**How to apply:** 任何「同資料多種 DOM 渲染」的場景，各渲染版本的互動元素 ID 必須有命名空間前綴。

---

## 觸控目標最小 44px（Apple HIG）

**Rule:** 任何行動端可點擊元素（按鈕、Header）的 `min-height` 必須 ≥ 44px。

**Why:** Apple Human Interface Guidelines 標準。低於 44px 的觸控目標誤觸率顯著上升，尤其在手指操作密集的核對中心場景。

**How to apply:** Accordion Header 設 `min-height: 56px`；行動按鈕（快跳、刪除）設 `min-height: 44px`。
