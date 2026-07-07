# FHS-Curated UI/UX Intelligence Layer — FHS Integration Guide

> FHS 原生建立的設計 intelligence 參考層，靈感來源於 UI/UX Pro Max 原則。
> 憲法層：AGENTS.md（最高優先級，凌駕本文件）
> **版本**：v2.0.0（2026-04-21）— 改為純響應式設計，廢除雙模式（令狐沖/肥貓）

---

## Section 一｜FHS Style Library

### 設計軸：唯一維度為裝置（iPhone vs Desktop）

FHS V40 採用**純響應式**設計。沒有角色模式、沒有 ling/fcat 切換。
- **iPhone（< 768px）**：單欄、大 touch target、Bottom Bar 主導操作
- **Desktop（≥ 768px）**：多欄展開、側欄面板可見、密集資訊表格

### 統一色彩 Token（`--fhs-*`）

```css
/* === 背景層 === */
--fhs-bg-base: #FAF7F4;          /* 最底層背景（暖白）*/
--fhs-bg-surface: #FFFFFF;       /* 卡片/面板背景 */
--fhs-bg-elevated: #F0EBE4;      /* hover/active 狀態 */
--fhs-bg-overlay: rgba(0,0,0,0.4); /* modal backdrop */

/* === 文字層 === */
--fhs-text-primary: #2C2416;     /* 主文字（暖棕）*/
--fhs-text-secondary: #7A6A55;   /* 次要文字 */
--fhs-text-muted: #B0A090;       /* 佔位符/停用 */
--fhs-text-on-accent: #FFFFFF;   /* accent 背景上的文字 */

/* === 品牌色 === */
--fhs-accent: #C9714A;           /* 主要 CTA（暖珊瑚）*/
--fhs-accent-hover: #B5603B;     /* hover 狀態 */
--fhs-accent-light: #F5E8E0;     /* accent 淡底色（chip/badge）*/

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
```

---

### 字體規範

**統一字體方針（iPhone + Desktop 共用）**：
- 主字體：`system-ui, -apple-system, 'Helvetica Neue', sans-serif`
- 數字/金額：`font-variant-numeric: tabular-nums`（確保對齊）
- 字重：400（正文）/ 600（標籤/按鈕）/ 700（數字重點）
- 行高：1.5（正文）/ 1.3（標題/按鈕）

**字號 Scale（響應式）**：
```css
--fhs-text-xs: 12px;
--fhs-text-sm: 14px;
--fhs-text-base: 16px;    /* iPhone 表單最小字號，防止 iOS 自動縮放 */
--fhs-text-lg: 18px;
--fhs-text-xl: 22px;
--fhs-text-2xl: 28px;
```

> 禁用：Inter、Roboto、Arial（過於通用）。禁用 monospace 作為主字體（非命令行介面）。

---

### 間距系統

```css
/* 基礎單位：8px grid */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-8: 48px;
--space-10: 64px;

/* Touch target 最小尺寸（iPhone 必須）*/
--touch-target-min: 44px;

/* Desktop 密度（資訊表格）*/
--table-row-height: 36px;
--table-cell-padding: 8px 12px;
```

---

### 響應式斷點

```css
/* iPhone（單欄 POS 模式）*/
@media (max-width: 767px) { ... }

/* Desktop（多欄管理視圖）*/
@media (min-width: 768px) { ... }
```

**iPhone 佈局原則**：
- 單欄、全寬 input
- Bottom Bar 固定，含主要操作按鈕
- 次要面板（Fat Mo 設定、QA Center、全域核對中心）預設**收進 Drawer**，向上滑出
- 密集數據表格 → 可摺疊 Accordion 卡片

**Desktop 佈局原則**：
- 主表單居中（max-width: 900px），側欄可展開
- Fat Mo 設定面板、QA Center 預設**可見**（side panel 或 top bar）
- 全域核對中心使用完整多欄表格 + 斑馬紋

---

## Section 二｜UX Heuristics Checklist（FHS 專屬）

### iPhone（POS 使用情境）

- [ ] 主要操作按鈕在拇指可及區域（螢幕底部 Bottom Bar）
- [ ] 所有 input 字號 ≥ 16px（防 iOS 縮放）
- [ ] 表單 input touch target ≥ 44px 高度
- [ ] Fat Mo 設定面板放入 Drawer（不佔主版面）
- [ ] 全域核對中心用 Accordion 卡片，預設收起
- [ ] 錯誤訊息 inline 顯示（不用 modal）
- [ ] Drawer 有手勢提示（swipe handle bar）

### Desktop（管理/分析情境）

- [ ] 數字使用等比字體（tabular-nums）確保對齊
- [ ] 財務數據（利潤/成本）顏色對比強化（success/danger）
- [ ] 報表表格斑馬紋（每兩行交替背景）
- [ ] Fat Mo 設定面板直接可見（無需 Drawer）
- [ ] 全域核對中心多欄表格，充分利用螢幕寬度
- [ ] 空態有說明文字，不只是空白

### 共用（iPhone + Desktop）

- [ ] 載入狀態：spinner 或 skeleton
- [ ] 操作成功/失敗：明確 toast 或 inline 提示
- [ ] 表單驗證：提交前即時標注錯誤欄位
- [ ] 過渡動畫：200-300ms ease-out

---

## Section 三｜設計品質閘門（供 code-reviewer 使用）

### CSS Variables 完整性

| 項目 | 標準 | 嚴重性 |
|------|------|--------|
| 顏色值硬編碼 | 不得直接寫 hex/rgb，必須使用 `--fhs-*` var | ⚠️ WARNING |
| 間距值硬編碼 | 重複使用的間距值應使用 `--space-*` | 💡 SUGGESTION |
| 舊有 `--ling-*` / `--fcat-*` token 殘留 | 嚴禁，必須全數移除 | ❌ FAIL |
| `.mode-ling` / `.mode-fcat` class 殘留 | 嚴禁，必須全數移除 | ❌ FAIL |
| `roleLingBtn` / `roleFatBtn` 功能性角色切換邏輯 | ID 保留（webhook contract），但樣式驅動邏輯必須移除 | ⚠️ WARNING |

### 響應式佈局完整性

| 項目 | 標準 | 嚴重性 |
|------|------|--------|
| iPhone 斷點（< 768px）有對應樣式 | 必須存在 | ❌ FAIL |
| Desktop 斷點（≥ 768px）有對應樣式 | 必須存在 | ❌ FAIL |
| iPhone 上 Fat Mo 面板進入 Drawer | 必須實作 | ⚠️ WARNING |
| iPhone 上 input 字號 ≥ 16px | 防 iOS 縮放 | ⚠️ WARNING |
| Desktop 上資訊密度提升 | 多欄並排 | 💡 SUGGESTION |

### 可及性（Accessibility）

| 項目 | 標準 | 嚴重性 |
|------|------|--------|
| 色彩對比度（正文）| WCAG AA：4.5:1 以上 | ⚠️ WARNING |
| 色彩對比度（大型文字/標題）| WCAG AA：3:1 以上 | ⚠️ WARNING |
| Touch target 尺寸 | 互動元素最小 44×44px | ⚠️ WARNING |
| Focus 樣式 | 鍵盤 focus 必須可見（不可 `outline: none` 無替代）| ⚠️ WARNING |

### 設計反模式清單（FHS 禁用）

| 反模式 | 原因 | 嚴重性 |
|--------|------|--------|
| 濫用 glassmorphism（backdrop-filter 裝飾性使用）| 效能差，視覺雜訊多 | ⚠️ WARNING |
| 大量 `!important` 疊加（>10 個）| 維護困難 | ⚠️ WARNING |
| 純黑（#000）/ 純白（#fff）| 生硬，不符合 FHS 暖色調 | 💡 SUGGESTION |
| 漸層文字（gradient text on headings）| 影響可讀性 | 💡 SUGGESTION |
| 角色驅動的樣式切換（setRole() 改變視覺主題）| 已廢除，只保留 responsive | ❌ FAIL |

---

## Section 四｜Impeccable 參考路徑索引

Claude Code 的 `ui-designer` agent 可直接 Read 以下路徑（已驗證可讀）：

| 主題 | 路徑 | 適用場景 |
|------|------|---------|
| 排版 | `.gemini/skills/frontend-design/reference/typography.md` | 字體選擇、scale、行高 |
| 色彩與對比 | `.gemini/skills/frontend-design/reference/color-and-contrast.md` | 色彩系統、OKLCH |
| 空間設計 | `.gemini/skills/frontend-design/reference/spatial-design.md` | grid、間距節奏、容器查詢 |
| 動畫設計 | `.gemini/skills/frontend-design/reference/motion-design.md` | timing、easing |
| 互動設計 | `.gemini/skills/frontend-design/reference/interaction-design.md` | 表單、focus、loading |
| 響應式設計 | `.gemini/skills/frontend-design/reference/responsive-design.md` | mobile-first、container queries |
| UX 文案 | `.gemini/skills/frontend-design/reference/ux-writing.md` | 標籤、錯誤訊息、空態文案 |

**使用時機**：ui-designer 在 Phase A Step 2（Refinement）期間，讀取相關 reference docs 作為評估依據。

---

*本文件 v2.0.0 由 Claude Opus 4.6 改寫，2026-04-21*
*廢除雙模式（令狐沖/肥貓），改為純 iPhone vs Desktop 響應式設計*
*授權來源：Fat Mo /execute*
