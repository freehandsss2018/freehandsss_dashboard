# FHS V42 Mobile Review UI Snippets Sync Report
**Date**: 2026-06-06 | **Target Version**: V42 | **Status**: PROTOTYPES COMPLETED

This report contains the Vanilla HTML, CSS, and JS snippets designed by Antigravity (A2) for the 4 interactive components of the V42 Mobile Review UI. These snippets are prepared for integration by Claude Code (A3) in Phase P3.

---

## 1. 外部依賴與相容性分析 (Dependency Analysis)
- **React/JSX 依賴**：無 (全數轉換為 Vanilla HTML/JS)
- **Tailwind CSS 依賴**：無 (全數轉換為 Vanilla CSS，利用 V42 已注入的 Threads tokens)
- **外部 CDN 載入**：無 (使用 V42 本地 Lucide SVG Sprite `#icon-xxx`)
- **檔案寫入安全**：依循 Rule 3.14，本報告及草稿已寫入專案實體目錄，無外部修改。

---

## 2. 視覺組件 Snippets

### 組件 1 — 左滑卡片效果 (Swipe Row Wrapper)
#### A. CSS 樣式修正 (補入特定背景色)
```css
.swipe-btn--archive {
    background-color: #F0EBE4 !important; /* 暖米 */
    color: var(--fhs-text-secondary) !important;
}
.swipe-btn--more {
    background-color: #E0D8CC !important; /* 暖灰 */
    color: var(--fhs-text-primary) !important;
}
```

#### B. HTML 結構模板 (用於 `renderReviewAccordion` 的 `o.items` 渲染循環)
```html
<div class="swipe-row-wrapper" id="swipe-row-${o.id}">
    <div class="swipe-underlay">
        <button class="swipe-btn swipe-btn--archive" type="button" onclick="event.stopPropagation(); triggerArchiveOrder('${o.id}')">
            <svg width="20" height="20" aria-hidden="true"><use href="#icon-archive"/></svg>
            <span>封存</span>
        </button>
        <button class="swipe-btn swipe-btn--more" type="button" onclick="event.stopPropagation(); openBsSheet('${o.id}', '${o.Order_ID}')">
            <svg width="20" height="20" aria-hidden="true"><use href="#icon-more-horizontal"/></svg>
            <span>更多</span>
        </button>
    </div>
    <div class="swipe-content">
        <!-- 原有的 .acc-order DOM 節點 -->
        <div class="acc-order" id="acc-order-${o.id}">
            <!-- Accordion Header & Body -->
        </div>
    </div>
</div>
```

#### C. JS 手勢拖曳事件委派 (Touch Drag Delegator)
```javascript
// 綁定於 reviewAccordionContainer 的全局事件委派，支援 iPhone 阻尼拖曳與滾動防衝突
(function() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isSwiping = false;
    let activeWrapper = null;
    let activeContent = null;
    let isOpen = false;
    const maxSlide = 140;
    const threshold = 40;

    const container = document.getElementById('reviewAccordionContainer');
    if (!container) return;

    container.addEventListener('touchstart', (e) => {
        const wrapper = e.target.closest('.swipe-row-wrapper');
        if (!wrapper) return;

        // 關閉其他已滑開的卡片
        document.querySelectorAll('.swipe-row-wrapper.is-open').forEach(el => {
            if (el !== wrapper) {
                el.classList.remove('is-open');
                const content = el.querySelector('.swipe-content');
                if (content) content.style.transform = '';
            }
        });

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        activeWrapper = wrapper;
        activeContent = wrapper.querySelector('.swipe-content');
        isOpen = wrapper.classList.contains('is-open');
        isSwiping = false;
        
        if (activeContent) {
            activeContent.style.transition = 'none';
        }
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (!activeWrapper || !activeContent) return;

        const diffX = e.touches[0].clientX - startX;
        const diffY = e.touches[0].clientY - startY;

        // 若垂直滾動大於水平滑動，則判定為滾動頁面而非側滑
        if (!isSwiping && Math.abs(diffY) > Math.abs(diffX)) {
            activeWrapper = null;
            activeContent = null;
            return;
        }

        isSwiping = true;
        activeWrapper.classList.add('is-swiping');
        
        let targetX = isOpen ? -maxSlide + diffX : diffX;
        if (targetX > 0) targetX = 0;
        if (targetX < -maxSlide) {
            targetX = -maxSlide + (targetX + maxSlide) * 0.2; // 阻尼抗力
        }
        
        activeContent.style.transform = `translateX(${targetX}px)`;
        currentX = targetX;
    }, { passive: true });

    container.addEventListener('touchend', () => {
        if (!activeWrapper || !activeContent) return;

        activeWrapper.classList.remove('is-swiping');
        activeContent.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        
        if (isOpen) {
            if (currentX > -maxSlide + threshold) {
                activeContent.style.transform = '';
                activeWrapper.classList.remove('is-open');
            } else {
                activeContent.style.transform = `translateX(-${maxSlide}px)`;
            }
        } else {
            if (currentX < -threshold) {
                activeContent.style.transform = `translateX(-${maxSlide}px)`;
                activeWrapper.classList.add('is-open');
            } else {
                activeContent.style.transform = '';
            }
        }

        activeWrapper = null;
        activeContent = null;
        isSwiping = false;
    });
})();
```

---

### 組件 2 — Bottom-Sheet 行動選單視覺打磨 (Action Menu Visual Polish)
#### A. CSS 樣式補丁 (精緻化對齊、Hover 態、A/B 標籤、危險區)
```css
/* ── Bottom-Sheet 視覺精緻化 ── */
.bs-list {
    list-style: none;
    margin: 0;
    padding: 8px 0;
}

.bs-item {
    width: 100%;
    height: 52px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 0 20px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
    color: var(--fhs-text-primary);
    text-align: left;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 0.15s ease, color 0.15s ease;
}

.bs-item svg {
    color: var(--fhs-text-secondary);
    flex-shrink: 0;
    transition: color 0.15s ease;
}

/* Hover 與觸發態 */
.bs-item:hover {
    background-color: var(--fhs-bg-elevated);
    color: var(--fhs-text-primary);
}

.bs-item:hover svg {
    color: var(--fhs-text-primary);
}

.bs-item:active {
    background-color: var(--fhs-border);
}

/* 最愛狀態標示 */
.bs-item--star.is-starred {
    color: var(--fhs-star-amber);
}

.bs-item--star.is-starred svg {
    color: var(--fhs-star-amber);
    fill: var(--fhs-star-amber);
}

/* 分隔線 */
.bs-divider {
    height: 1px;
    background: var(--fhs-border);
    margin: 8px 20px;
    opacity: 0.6;
}

/* 刪除危險區 */
.bs-item--danger {
    color: var(--fhs-danger);
}

.bs-item--danger svg {
    color: var(--fhs-danger);
}

.bs-item--danger:hover {
    background-color: rgba(194, 89, 63, 0.08); /* 8% 暖紅淡色背景 */
    color: var(--fhs-danger);
}

.bs-item--danger:active {
    background-color: rgba(194, 89, 63, 0.16);
}

/* A/B 小型定位標籤疊加 */
.bs-icon-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
}

.bs-icon-badge {
    position: absolute;
    bottom: -3px;
    right: -3px;
    font-size: 8px;
    font-weight: 850;
    width: 10px;
    height: 10px;
    line-height: 9px;
    border-radius: 50%;
    text-align: center;
    color: #fff;
    border: 1px solid var(--fhs-bg-surface);
    pointer-events: none;
}

.bs-icon-badge--a {
    background-color: var(--fhs-accent);
}

.bs-icon-badge--b {
    background-color: #457B9D;
}
```

#### B. HTML 結構補丁 (針對 Model A / B 的 Icon 標籤疊加)
```html
<ul class="bs-list" role="list">
    <li><button class="bs-item" type="button" id="bsBtnModelA" onclick="closeBsSheet()">
        <div class="bs-icon-wrapper">
            <svg width="20" height="20" aria-hidden="true"><use href="#icon-message-circle"/></svg>
            <span class="bs-icon-badge bs-icon-badge--a">A</span>
        </div>
        <span>手模 IG 訊息</span>
    </button></li>
    <li><button class="bs-item" type="button" id="bsBtnModelB" onclick="closeBsSheet()">
        <div class="bs-icon-wrapper">
            <svg width="20" height="20" aria-hidden="true"><use href="#icon-message-circle"/></svg>
            <span class="bs-icon-badge bs-icon-badge--b">B</span>
        </div>
        <span>金屬 IG 訊息</span>
    </button></li>
    <!-- 其餘按鈕保持不變 -->
</ul>
```

---

### 組件 3 — Segmented Control iOS 滑動指示器 (iOS Sliding Indicator)
#### A. CSS 補充樣式
```css
/* ── iOS 風格 Segmented Control 滑動指示器 ── */
.fhs-seg-ctrl {
    position: relative;
    z-index: 1;
}

.fhs-seg-btn {
    position: relative;
    z-index: 1;
    background: transparent !important;
    box-shadow: none !important;
}

.fhs-seg-indicator {
    position: absolute;
    top: 3px;
    bottom: 3px;
    left: 3px;
    z-index: 0;
    background: var(--fhs-bg-surface);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(44, 36, 22, 0.12), 0 0 0 1px var(--fhs-border);
    transition: transform 0.25s cubic-bezier(0.32, 0.94, 0.6, 1), width 0.25s cubic-bezier(0.32, 0.94, 0.6, 1);
    will-change: transform, width;
}
```

#### B. JS 初始化與位移追蹤 (iOS Slide Logic)
```javascript
function initSegmentedControls() {
    document.querySelectorAll('.fhs-seg-ctrl').forEach(ctrl => {
        // 動態生成指示器背景，確保 DOM 架構向下相容
        let indicator = ctrl.querySelector('.fhs-seg-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'fhs-seg-indicator';
            ctrl.insertBefore(indicator, ctrl.firstChild);
        }

        const updatePosition = () => {
            const activeBtn = ctrl.querySelector('.fhs-seg-btn.is-active');
            if (!activeBtn) return;
            
            const ctrlRect = ctrl.getBoundingClientRect();
            const btnRect = activeBtn.getBoundingClientRect();
            
            const leftOffset = btnRect.left - ctrlRect.left;
            const width = btnRect.width;
            
            requestAnimationFrame(() => {
                indicator.style.width = `${width}px`;
                indicator.style.transform = `translateX(${leftOffset}px)`;
            });
        };

        // 切換點擊事件
        ctrl.querySelectorAll('.fhs-seg-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                ctrl.querySelectorAll('.fhs-seg-btn').forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');
                updatePosition();
            });
        });

        // 頁面初次渲染與視窗大小改變時重算
        setTimeout(updatePosition, 50);
        window.addEventListener('resize', updatePosition);
    });
}
```

---

### 組件 4 — 最愛啟動動畫 (Star Spring Pop Animation)
#### A. CSS 彈跳 keyframes
```css
/* ── 最愛 Star 彈跳 Spring 動畫 ── */
@keyframes fhsStarPop {
    0% { transform: scale(1); }
    35% { transform: scale(1.35); }
    70% { transform: scale(0.88); }
    100% { transform: scale(1.0); fill: var(--fhs-star-amber); }
}

.bs-item--star.is-animating svg {
    animation: fhsStarPop 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    transform-origin: center;
}
```

#### B. JS 動畫引導 Trigger
```javascript
function animateStarToggle(btn, isStarred) {
    if (!btn) return;
    
    // 注入彈跳動畫類
    btn.classList.add('is-animating');
    
    if (isStarred) {
        btn.classList.add('is-starred');
    } else {
        btn.classList.remove('is-starred');
    }
    
    // 動態移除以供下次點擊重複觸發
    setTimeout(() => {
        btn.classList.remove('is-animating');
    }, 350);
}
```

---

## 3. 測試草稿文件
Stitch 視覺交互展示草稿已寫入：
`file:///D:/SynologyDrive/Free_handsss/freehandsss_dashboard/.fhs/reports/planning/stitch_draft_2026-06-06.html`
*(可用瀏覽器開啟驗收左滑拖曳、BS A/B 標籤、iOS 指示器與星星點擊彈跳動畫效果)*

---

### 【交付前雙紀律自檢】
驗收：[Stitch 視覺片段擷取與依賴識別已完成，產出實體草稿 stitch_draft_2026-06-06.html 且無任何 React/Tailwind/CDN 外部依賴，PASS]
Subagent：[本會話為定點 UI snippet 設計與依賴分析，無複雜 runtime 錯誤診斷或 schema 靜態審查需求，故未委派 subagent，PASS]
