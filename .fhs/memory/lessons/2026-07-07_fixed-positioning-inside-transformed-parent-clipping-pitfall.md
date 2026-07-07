# Lesson — CSS Transform 容器導致 Fixed 子元素定位與裁剪失效

**日期**：2026-07-07（Session 151，手機版導覽列與 Supabase 狀態列優化）
**類型**：Pitfall
**來源**：手機版底部導覽按鈕群 `.fhs-top-bar__actions` 在向下滑動隱藏標題列時一併消失，以及 Supabase 狀態指示器在絕對定位時與 `reviewCountBadge` 發生重疊

## 現象

1. **滾動隱藏問題**：
   在手機版上，我們將 `.fhs-top-bar__actions` 設定為 `position: fixed` 常駐底部。然而在向下滑動頁面時，頂部的 `.fhs-top-bar` 會被加入 `fhs-header-hidden` 樣式並觸發 `transform: translateY(-48px)` 動畫。此時，即便 `.fhs-top-bar__actions` 宣告了 `position: fixed`，它依然會跟著頂部標題列一起向上移動 `-48px`，且因為父元素設有 `overflow: hidden`，該底部導覽列會被完全剪裁隱藏。

2. **絕對定位重疊問題**：
   為了將 Supabase 指示器移至手機版頂部，最初將其設定為 `position: absolute; right: 12px;`，這導致它直接覆蓋在原本就位於頂部右側的「33筆」數量徽章上。

## 根因

1. **CSS 規範中 Transform 對 Containing Block 的改變**：
   根據 W3C CSS 規範，當父元素套用任何非 `none` 的 `transform`、`perspective` 或 `filter` 屬性時，它會為所有後代元素（包括 `position: absolute` 和 `position: fixed` 的後代）建立一個新的**包含塊 (Containing Block)**。
   這意味著，`.fhs-top-bar__actions` 雖然設定了 `position: fixed`，但其坐標系已不再是瀏覽器視口 (Viewport)，而是被限制在被 transform 的父容器 `.fhs-top-bar` 內部。當父元素向上移動並因 `overflow: hidden` 剪裁超出邊界內容時，位於下方的 fixed 子元素自然會一起移動並被剪裁。

2. **絕對定位脫離 Flex 佈局流**：
   因為使用絕對定位硬性指定了 `right: 12px`，該元素脫離了 Flex 彈性容器的流動排列，無法與並排的綠色數量徽章自動分配剩餘空間，進而產生重疊。

## 修法

1. **破除 Transform 限制 (DOM 搬移)**：
   在網頁載入時（`DOMContentLoaded`），若偵測為手機版尺寸（寬度 < 768px），使用 JavaScript 動態將 `.fhs-top-bar__actions` 搬移至 `<body>` 根節點下，使其成為頂部標題列的兄弟元素。
   ```javascript
   document.body.appendChild(actions);
   ```
   如此一來，它便能真正相對於 Viewport 進行 `position: fixed` 定位，完全擺脫頂部滾動動畫的影響。

2. **復原 Flex 排列 (Flex Flow)**：
   同時將 Supabase 狀態指示器重新掛回頂部的 `#v40-top-bar` 中，並移除手機版下的絕對定位，改回相對定位 `position: relative !important; right: auto !important;`，使其作為 Flex 子元素與綠色數量徽章自然並排。

## 檢查清單

1. 當需要設定 `position: fixed` 控制項時，務必確認其所有祖先元素中是否有套用 `transform` 或 `filter` 屬性。
2. 避免在具有隱藏收合動畫 (`transform`) 的容器內放置需要全域常駐的 fixed 浮動控制項。
3. 對於需要動態隱藏/顯示的標題列內控制項，若有重疊疑慮，應優先利用 Flex 彈性容器自動排列，而非使用 `position: absolute` 強行覆寫。

## 關聯

- `Freehandsss_Dashboard/freehandsss_dashboardV42.html`
- `Changelog.md` 2026-07-07 Session 151
