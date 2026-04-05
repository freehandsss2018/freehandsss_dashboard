# FHS-Curated UI/UX Intelligence Layer — FHS Integration Guide

> FHS 原生建立的設計 intelligence 參考層，靈感來源於 UI/UX Pro Max 原則。
> 憲法層：AGENTS.md（最高優先級，凌駕本文件）

---

## Section 一｜FHS Style Library

### 雙模式色彩 Token 規範

**令狐沖模式（`ling`）— 黑底命令行風**
```css
/* 背景層 */
--ling-bg-base: #0d0d0d;         /* 最底層背景 */
--ling-bg-surface: #1a1a1a;      /* 卡片/面板背景 */
--ling-bg-elevated: #242424;     /* hover/active 狀態 */

/* 文字層 */
--ling-text-primary: #e8e8e8;    /* 主文字 */
--ling-text-secondary: #999999;  /* 次要文字 */
--ling-text-accent: #00ff88;     /* 強調色（命令行綠）*/

/* 邊界與分隔 */
--ling-border: #333333;
--ling-border-active: #00ff88;

/* 狀態色 */
--ling-success: #00ff88;
--ling-warning: #ffaa00;
--ling-danger: #ff4444;
```

**肥貓模式（`fcat`）— 暖白數據工作室風**
```css
/* 背景層 */
--fcat-bg-base: #faf8f5;         /* 最底層背景（暖白）*/
--fcat-bg-surface: #ffffff;      /* 卡片/面板背景 */
--fcat-bg-elevated: #f0ece6;     /* hover/active 狀態 */

/* 文字層 */
--fcat-text-primary: #2c2416;    /* 主文字（暖棕）*/
--fcat-text-secondary: #7a6a55;  /* 次要文字 */
--fcat-text-accent: #c4732a;     /* 強調色（暖橙）*/

/* 邊界與分隔 */
--fcat-border: #e0d8cc;
--fcat-border-active: #c4732a;

/* 狀態色 */
--fcat-success: #2e7d32;
--fcat-warning: #f57f17;
--fcat-danger: #c62828;
```

---

### 字體配對推薦

**令狐沖模式（操作導向，高密度）**
- 主字體：`'JetBrains Mono', 'Courier New', monospace`（命令行感）
- 備用（無等寬偏好）：`'IBM Plex Mono', monospace`
- 字重：400/600
- 行高：1.4（緊湊）

**肥貓模式（數據可視化，可讀性優先）**
- 標題字體：`'Georgia', 'Times New Roman', serif`（溫潤感）
- 正文字體：`system-ui, -apple-system, sans-serif`
- 字重：400/700
- 行高：1.65（舒展）

**共用規則**：
- 最小字號：`14px`（桌面）/ `16px`（觸控場景）
- 不使用 Inter、Roboto、Arial（過於通用，缺乏個性）

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

/* Touch target 最小尺寸（iPad/iPhone 場景）*/
--touch-target-min: 44px;

/* 桌面密度（肥貓模式數據表格）*/
--table-row-height: 36px;
--table-cell-padding: 8px 12px;
```

---

## Section 二｜UX Heuristics Checklist（FHS 專屬）

### 令狐沖模式（操作密度優先）

- [ ] 主要操作按鈕是否在拇指可及區域（行動裝置右下象限）
- [ ] 是否支援熱鍵提示（Alt+A/R/X 等，明顯標注）
- [ ] 資訊層次是否清晰：訂單狀態 → 金額 → 操作按鈕（由上至下）
- [ ] 輸入欄位是否有足夠 touch target（最小 44px 高度）
- [ ] 錯誤訊息是否就近顯示（不使用 modal，改用 inline feedback）

### 肥貓模式（數據可視化優先）

- [ ] 數字是否使用等比字體（tabular-nums）確保對齊
- [ ] 圖表是否有清楚的座標軸標注與圖例
- [ ] 財務數據（利潤/成本）是否有顏色對比強化（紅/綠）
- [ ] 報表表格是否有斑馬紋（每兩行交替背景）提高可讀性
- [ ] 空態（無數據）是否有說明文字，不只是空白

### 共用（兩模式皆適用）

- [ ] 載入狀態：是否有視覺反饋（spinner 或 skeleton）
- [ ] 操作成功/失敗：是否有明確 toast 或 inline 提示
- [ ] 表單驗證：是否在提交前即時標注錯誤欄位
- [ ] 模式切換動畫：是否流暢（建議 200-300ms ease-out）

---

## Section 三｜設計品質閘門（供 code-reviewer 使用）

### CSS Variables 完整性

| 項目 | 標準 | 嚴重性 |
|------|------|--------|
| 顏色值硬編碼 | 不得直接寫 hex/rgb，必須使用 `--var` | ⚠️ WARNING |
| 間距值硬編碼 | 重複使用的間距值應使用 `--space-*` | 💡 SUGGESTION |
| 雙模式切換完整性 | `.mode-ling` / `.mode-fcat` class 切換後，所有樣式均應更新 | ⚠️ WARNING |

### 可及性（Accessibility）

| 項目 | 標準 | 嚴重性 |
|------|------|--------|
| 色彩對比度（正文）| WCAG AA：4.5:1 以上 | ⚠️ WARNING |
| 色彩對比度（大型文字/標題）| WCAG AA：3:1 以上 | ⚠️ WARNING |
| Touch target 尺寸 | 互動元素最小 44×44px（iPad/iPhone）| ⚠️ WARNING |
| Focus 樣式 | 鍵盤 focus 必須可見（不可 `outline: none` 無替代）| ⚠️ WARNING |

### 設計反模式清單（FHS 禁用）

| 反模式 | 原因 | 嚴重性 |
|--------|------|--------|
| 濫用 glassmorphism（backdrop-filter 裝飾性使用）| 效能差，視覺雜訊多 | ⚠️ WARNING |
| 大量 `!important` 疊加（>10 個）| 維護困難，破壞 CSS 層疊關係 | ⚠️ WARNING |
| 純黑（#000）/ 純白（#fff）| 生硬，不符合 FHS 暖色調 | 💡 SUGGESTION |
| 漸層文字（gradient text on headings）| 裝飾性強，影響可讀性 | 💡 SUGGESTION |
| 全版 dark mode + 螢光 accent | 缺乏設計決策，AI slop 特徵 | ⚠️ WARNING |
| 所有元素統一 border-radius（圓角濫用）| 令狐沖模式應保持銳角終端感 | 💡 SUGGESTION |

---

## Section 四｜Impeccable 參考路徑索引

Claude Code 的 `ui-designer` agent 可直接 Read 以下路徑（已驗證可讀）：

| 主題 | 路徑 | 適用場景 |
|------|------|---------|
| 排版 | `.gemini/skills/frontend-design/reference/typography.md` | 字體選擇、scale、行高 |
| 色彩與對比 | `.gemini/skills/frontend-design/reference/color-and-contrast.md` | 色彩系統、OKLCH、暗色模式 |
| 空間設計 | `.gemini/skills/frontend-design/reference/spatial-design.md` | grid、間距節奏、容器查詢 |
| 動畫設計 | `.gemini/skills/frontend-design/reference/motion-design.md` | timing、easing、減少動畫 |
| 互動設計 | `.gemini/skills/frontend-design/reference/interaction-design.md` | 表單、focus、loading pattern |
| 響應式設計 | `.gemini/skills/frontend-design/reference/responsive-design.md` | mobile-first、container queries |
| UX 文案 | `.gemini/skills/frontend-design/reference/ux-writing.md` | 標籤、錯誤訊息、空態文案 |

**使用時機**：ui-designer 在 Phase A Step 2（Refinement）期間，
對照 Stitch 候選方向讀取相關 reference docs 作為評估依據。

---

*本文件由 Claude Code A3 產出，2026-04-05*
*FHS 原生建立，靈感來源於 UI/UX Pro Max 原則，非第三方 repo mirror*
*授權來源：Fat Mo /execute*
