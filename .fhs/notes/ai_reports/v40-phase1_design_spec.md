# FHS V40 — Phase 1 Design Spec
**日期**：2026-04-21
**階段**：PHASE 1（設計規格，NO-TOUCH 業務檔案）
**基準版本**：`Freehandsss_Dashboard/freehandsss_dashboardV37.html`（穩定生產版）
**輸出目標**：`Freehandsss_Dashboard/freehandsss_dashboardV40.html`
**設計軸**：唯一維度 = 裝置（iPhone < 768px / Desktop ≥ 768px）

> ⚠️ 本文件取代 `v39-rebuild_phase1_design_spec.md`。
> 雙模式（令狐沖/肥貓）已廢除。所有 `--ling-*` / `--fcat-*` token 不得出現。

---

## 1. CSS Design Tokens

```css
:root {
  /* === 背景層 === */
  --fhs-bg-base: #FAF7F4;
  --fhs-bg-surface: #FFFFFF;
  --fhs-bg-elevated: #F0EBE4;
  --fhs-bg-overlay: rgba(0, 0, 0, 0.4);

  /* === 文字層 === */
  --fhs-text-primary: #2C2416;
  --fhs-text-secondary: #7A6A55;
  --fhs-text-muted: #B0A090;
  --fhs-text-on-accent: #FFFFFF;

  /* === 品牌色 === */
  --fhs-accent: #C9714A;
  --fhs-accent-hover: #B5603B;
  --fhs-accent-light: #F5E8E0;

  /* === 邊界與分隔 === */
  --fhs-border: #E0D8CC;
  --fhs-border-focus: #C9714A;
  --fhs-border-strong: #C4B8A8;

  /* === 狀態色 === */
  --fhs-success: #2E7D32;
  --fhs-success-bg: #E8F5E9;
  --fhs-warning: #F57F17;
  --fhs-warning-bg: #FFF8E1;
  --fhs-danger: #C62828;
  --fhs-danger-bg: #FFEBEE;
  --fhs-info: #1565C0;
  --fhs-info-bg: #E3F2FD;

  /* === 字號 Scale === */
  --fhs-text-xs: 12px;
  --fhs-text-sm: 14px;
  --fhs-text-base: 16px;
  --fhs-text-lg: 18px;
  --fhs-text-xl: 22px;
  --fhs-text-2xl: 28px;

  /* === 間距系統（8px grid）=== */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-8: 48px;
  --space-10: 64px;

  /* === Touch Target === */
  --touch-target-min: 44px;

  /* === Desktop 密度 === */
  --table-row-height: 36px;
  --table-cell-padding: 8px 12px;

  /* === 圓角系統 === */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-pill: 999px;

  /* === 陰影 === */
  --shadow-sm: 0 1px 3px rgba(44, 36, 22, 0.08);
  --shadow-md: 0 4px 12px rgba(44, 36, 22, 0.12);
  --shadow-lg: 0 8px 24px rgba(44, 36, 22, 0.16);

  /* === 過渡 === */
  --transition-fast: 150ms ease-out;
  --transition-base: 250ms ease-out;
  --transition-slow: 400ms ease-out;

  /* === Bottom Bar 高度（iPhone 專用）=== */
  --bottom-bar-height: 64px;
}
```

---

## 2. 響應式斷點策略

```css
/* iPhone：單欄 POS 模式（預設）*/
/* 所有基礎樣式以 iPhone 為準 */

/* Desktop：多欄管理視圖 */
@media (min-width: 768px) {
  /* 覆蓋 iPhone 佈局，展開多欄 */
}
```

---

## 3. iPhone 佈局架構（< 768px）

```
┌─────────────────────────────┐
│  Top Bar (Header)           │  h: 56px, sticky
│  [Logo] [訂單#] [狀態燈]    │
├─────────────────────────────┤
│                             │
│  Main Content (scroll)      │
│                             │
│  ┌─ Card: 客戶資料 ──────┐  │
│  │ 媽媽姓名 / 日期 / 月齡 │  │
│  └────────────────────────┘  │
│                             │
│  ┌─ Card: 立體擺設 (P) ──┐  │
│  │ [開關] [子選項...] │  │
│  └────────────────────────┘  │
│                             │
│  ┌─ Card: 鎖匙扣 (K) ────┐  │
│  │ [開關] [子選項...] │  │
│  └────────────────────────┘  │
│                             │
│  ┌─ Card: 吊飾 (M) ──────┐  │
│  │ [開關] [子選項...] │  │
│  └────────────────────────┘  │
│                             │
│  ┌─ Card: 飾物 (J) ──────┐  │
│  │ [開關] [子選項...] │  │
│  └────────────────────────┘  │
│                             │
│  ┌─ 備注 ──────────────────┐  │
│  └────────────────────────┘  │
│                             │
│  [底部留白 = bottom-bar-height] │
│                             │
├─────────────────────────────┤
│  Bottom Bar (fixed)         │  h: 64px
│  [核對] [計算] [提交訂單]   │
└─────────────────────────────┘

Drawer（從底部向上）：
┌─────────────────────────────┐
│  ▬ (handle bar)             │
│  [Tab: 設定] [Tab: QA]      │
│  [Tab: 全域核對]            │
│                             │
│  ... 面板內容 ...            │
└─────────────────────────────┘
```

---

## 4. Desktop 佈局架構（≥ 768px）

```
┌────────────────────────────────────────────────────┐
│  Top Bar (Header)                                  │
│  [FHS Logo] [訂單#] [狀態燈] [模式切換] [設定]    │
├──────────────────────────┬─────────────────────────┤
│                          │  Side Panel             │
│  Main Form               │  ┌─ Fat Mo 設定 ──────┐ │
│  (max-width: 600px)      │  │ 沙盒 / 序號模式    │ │
│                          │  └────────────────────┘ │
│  [客戶資料卡片]          │                         │
│  [P 立體擺設]            │  ┌─ QA Center ────────┐ │
│  [K 鎖匙扣]              │  │ 測試記錄 / 日誌    │ │
│  [M 吊飾]                │  └────────────────────┘ │
│  [J 飾物]                │                         │
│  [備注]                  │  ┌─ 全域核對中心 ─────┐ │
│                          │  │ 多欄資料表格       │ │
│  [提交按鈕區]            │  │ 斑馬紋             │ │
│                          │  └────────────────────┘ │
└──────────────────────────┴─────────────────────────┘
```

---

## 5. 組件規格

### 5.1 Top Bar
| 屬性 | iPhone | Desktop |
|------|--------|---------|
| 高度 | 56px | 56px |
| 背景 | --fhs-bg-surface | --fhs-bg-surface |
| 顯示內容 | Logo + 訂單# + 狀態燈 | Logo + 訂單# + 狀態燈 + 設定入口 |
| position | sticky top: 0 | sticky top: 0 |

### 5.2 Card（各分類主體）
```css
.fhs-card {
  background: var(--fhs-bg-surface);
  border: 1px solid var(--fhs-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
  box-shadow: var(--shadow-sm);
}
.fhs-card__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--touch-target-min);
}
```

### 5.3 Toggle Switch（類別開關）
```css
.fhs-toggle {
  width: 44px;
  height: 26px;
  border-radius: var(--radius-pill);
  /* checked: accent 色，unchecked: border 色 */
}
```

### 5.4 Input Field
```css
.fhs-input {
  min-height: var(--touch-target-min);  /* ≥ 44px */
  font-size: var(--fhs-text-base);       /* ≥ 16px，防 iOS 縮放 */
  border: 1px solid var(--fhs-border);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
}
.fhs-input:focus {
  border-color: var(--fhs-border-focus);
  outline: 2px solid var(--fhs-accent-light);
}
```

### 5.5 Bottom Bar（iPhone 專用）
```css
.fhs-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--bottom-bar-height);
  background: var(--fhs-bg-surface);
  border-top: 1px solid var(--fhs-border);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  gap: var(--space-3);
  z-index: 100;
}
@media (min-width: 768px) {
  .fhs-bottom-bar { display: none; }
}
```

### 5.6 Drawer（iPhone 次要面板）
```css
.fhs-drawer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--fhs-bg-surface);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: var(--shadow-lg);
  transform: translateY(100%);
  transition: transform var(--transition-base);
  z-index: 200;
  max-height: 85vh;
  overflow-y: auto;
}
.fhs-drawer.is-open {
  transform: translateY(0);
}
.fhs-drawer__handle {
  width: 36px; height: 4px;
  background: var(--fhs-border-strong);
  border-radius: var(--radius-pill);
  margin: var(--space-3) auto var(--space-2);
}
@media (min-width: 768px) {
  .fhs-drawer { display: none; }
}
```

### 5.7 全域核對中心（iPhone Accordion / Desktop Table）

**iPhone（Accordion 卡片）**：
```css
.audit-accordion {
  /* 每筆訂單 = 一張可摺疊卡片 */
}
.audit-accordion__header {
  min-height: var(--touch-target-min);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.audit-accordion__body {
  display: none;  /* 預設收起 */
}
.audit-accordion.is-open .audit-accordion__body {
  display: block;
}
```

**Desktop（多欄表格）**：
```css
@media (min-width: 768px) {
  .audit-table {
    width: 100%;
    font-size: var(--fhs-text-sm);
    border-collapse: collapse;
  }
  .audit-table tr:nth-child(even) {
    background: var(--fhs-bg-elevated);  /* 斑馬紋 */
  }
  .audit-table td, .audit-table th {
    padding: var(--table-cell-padding);
    border-bottom: 1px solid var(--fhs-border);
  }
}
```

### 5.8 CTA 按鈕
```css
.fhs-btn-primary {
  background: var(--fhs-accent);
  color: var(--fhs-text-on-accent);
  border: none;
  border-radius: var(--radius-md);
  min-height: var(--touch-target-min);
  padding: 0 var(--space-5);
  font-size: var(--fhs-text-base);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.fhs-btn-primary:hover {
  background: var(--fhs-accent-hover);
}
```

### 5.9 Toast 通知
```css
.fhs-toast {
  position: fixed;
  /* iPhone: top center，Desktop: top right */
  background: var(--fhs-text-primary);
  color: var(--fhs-text-on-accent);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--fhs-text-sm);
  z-index: 999;
  animation: fhs-toast-in var(--transition-base) forwards;
}
```

---

## 6. Drawer 內容對應

| 面板 | iPhone 位置 | Desktop 位置 |
|------|-------------|--------------|
| Fat Mo 設定（沙盒/序號）| Drawer Tab 1 | Side Panel 頂部 |
| QA Center（測試/日誌） | Drawer Tab 2 | Side Panel 中部 |
| 全域核對中心 | Drawer Tab 3（Accordion） | Side Panel 底部（Table） |

---

## 7. 禁止清單（frontend-developer 必須遵守）

- ❌ 不得出現 `--ling-*` / `--fcat-*` 任何 token
- ❌ 不得出現 `.mode-ling` / `.mode-fcat` 任何 class
- ❌ 不得以 `setRole()` / `roleLingBtn` 驅動視覺主題切換
- ❌ 不得修改 `captureFormState()` / `restoreFormState()` 邏輯
- ❌ 不得更改任何 Contract-Critical HTML ID（見 phase0 contract freeze）
- ❌ 不得引入任何外部 CSS 框架或字體 CDN
- ❌ 不得呼叫任何 fetch() / webhook URL

---

## 8. 交接給 frontend-developer 的指引

1. **基礎版本**：從 `freehandsss_dashboardV37.html` 開始，不要從 V39_proto 開始
2. **輸出檔案**：`freehandsss_dashboardV40.html`（不可覆蓋 current.html）
3. **保留所有 Contract-Critical IDs**（見 `v39-rebuild_phase0_contract_freeze.md`）
4. **保留所有業務邏輯 JS**（captureFormState, restoreFormState, generate, syncToAirtable 等）
5. **只改 CSS + HTML 結構**：增加 Bottom Bar, Drawer, 響應式 media queries
6. **測試**：分別在 375px（iPhone SE）和 1280px（Desktop）寬度下驗證佈局

---

*本文件由 Claude Opus 4.6 產出，2026-04-21*
*取代 v39-rebuild_phase1_design_spec.md*
*授權來源：Fat Mo /execute*
