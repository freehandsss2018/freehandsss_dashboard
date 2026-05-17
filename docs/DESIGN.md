# Freehandsss Earthy Warm (大地溫潤) V41 Design System

> [!IMPORTANT]
> **本文件為 Freehandsss 智能中樞 (AI Smart Hub) 及 Google Stitch (StitchMCP) 的視覺與 UI 設計唯一真理標準 (Single Source of Truth)。**
> 任何涉及 Dashboard UI 翻新、Stitch 元件導入、或跨端介面重組之變更，均必須 100% 遵守本文件定義之色彩、排版、與雙端分流 (Dual-Experience) 互動準則。

---

## 1. 核心視覺概念：數字珠寶坊 (The Digital Atelier)

Freehandsss 定位為「嬰兒手足立體石膏倒模紀念品工作室」，將傳統手工溫度與現代 3D 鑄造技術完美結合。因此，系統視覺不應採用冷冰冰的科技藍白，而是採用溫潤的大地沙土與暖橘色系，營造「數字珠寶坊 (Digital Atelier)」的高奢手作質感，讓使用者（Ling Au 及 Fat Mo）在操作時感受到品牌的工匠精神。

### 核心設計哲學
1. **溫潤感 (Earthy Warmth)**：以暖沙色、原木巧克力色與陶土橘為基調，避免高對比的純黑純白。
2. **呼吸感 (Spacious & Airy)**：藉由 8px 網格系統 (8px Grid) 控制間距，維持充裕的留白。
3. **無縫結構 (No-Line Rule)**：嚴禁使用 1px 實線邊框分割佈局，改用色塊與柔和陰影進行區域區分。
4. **玻璃擬態 (Glassmorphism)**：使用半透明卡片與毛玻璃模糊濾鏡，展現高級層次感。

---

## 2. 基礎設計標記 (Foundational Design Tokens)

### 2.1 品牌色與階梯調色盤 (Color Palette)

| Token Key | 顏色值 (Hex) | 適用場景 / 視覺語意 |
| :--- | :--- | :--- |
| `--fhs-accent` | `#C9714A` | **品牌主色 (Terracotta Orange)**：按鈕、強提醒、選中狀態 |
| `--fhs-accent-hover` | `#B5603B` | **主色懸停 (Hover)**：按鈕 Hover 與 Active 狀態 |
| `--fhs-accent-light` | `#F5E8E0` | **主色極輕背景**：選中區域底色、提示框背景 |
| `--fhs-bg-base` | `#FAF7F4` | **頁面基底背景 (Warm Sand / Ivory)**：全域背景色 |
| `--fhs-bg-surface` | `#FFFFFF` | **容器表面色 (Pure White)**：主卡片、對話框背景 |
| `--fhs-bg-elevated` | `#F0EBE4` | **抬升層背景 (Warm Clay)**：次要區域、表格標頭背景 |
| `--fhs-border` | `#E0D8CC` | **一般邊界 (Normal Border)**：半透明卡片邊界線 |
| `--fhs-border-strong` | `#C4B8A8` | **強調邊界 (Strong Border)**：需要明確劃分的區塊 |
| `--fhs-border-focus` | `#C9714A` | **聚焦邊界 (Focus Highlight)**：輸入框選中高亮線 |

#### 文字層級顏色 (Text Scale)
*   **主要文字 (`--fhs-text-primary`: `#2C2416`)**：深木巧克力色。**嚴格禁止使用純黑 (`#000000`)**。
*   **次要文字 (`--fhs-text-secondary`: `#7A6A55`)**：中調灰褐沙色。用於標籤、說明。
*   **暗淡文字 (`--fhs-text-muted`: `#B0A090`)**：輕沙土色。用於 placeholder、停用狀態。
*   **反白文字 (`--fhs-text-on-accent`: `#FFFFFF`)**：用於品牌主色按鈕上的白色文字。

---

### 2.2 狀態色彩系統 (Semantic Colors)

| 狀態 | Token Key | 顏色 (Hex) | 背景色 (Hex) | 用途 |
| :--- | :--- | :--- | :--- | :--- |
| **成功 (Success)** | `--fhs-success` | `#2E7D32` | `#E8F5E9` | 訂單已完成、同步成功、對齊一致 |
| **警告 (Warning)** | `--fhs-warning` | `#F57F17` | `#FFF8E1` | 資料未儲存、訂單處理中、金額微幅偏離 |
| **危險 (Danger)** | `--fhs-danger` | `#C62828` | `#FFEBEE` | 刪除操作、同步失敗、財務嚴重不一致 |
| **資訊 (Info)** | `--fhs-info` | `#1565C0` | `#E3F2FD` | 系統提示、歷史紀錄連結、背景日誌 |

---

### 2.3 字型與排版系統 (Typography)

*   **字型家族 (Font Family)**：`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang HK', 'Helvetica Neue', sans-serif`
*   **字號比例 (Font Size Scale)**：
    *   `--fhs-text-xs` (12px) — 財務輔助資訊、小標籤、表格標頭
    *   `--fhs-text-sm` (14px) — 次要段落、表單說明、按鈕文字
    *   `--fhs-text-base` (16px) — **標準正文、輸入框文字**。*（iOS 端輸入框強制高於 16px，以防止 Viewport 自動縮放）*
    *   `--fhs-text-lg` (18px) — 卡片副標題、表單分組標題
    *   `--fhs-text-xl` (22px) — 模組大標題、KPI 數值
    *   `--fhs-text-2xl` (28px) — 頁面主要大標題

---

### 2.4 空間與網格系統 (Spacing & Grids)

遵循精準的 **8px 物理網格步進**，確保 UI 節奏的和諧與呼吸感：
*   `--space-1` (4px) — 超微調、Badge 內距
*   `--space-2` (8px) — 元素內邊距、小標籤間距
*   `--space-3` (12px) — 按鈕水平內距、表格儲存格間距
*   `--space-4` (16px) — 卡片內部標準 Padding、表單群組間距
*   `--space-5` (24px) — 大卡片 Padding、區塊間距
*   `--space-6` (32px) — 模組級大間距
*   `--space-8` (48px) — 頁面邊緣安全間距

---

### 2.5 圓角與陰影 (Radiuses & Shadows)

*   **圓角系統 (Corner Roundness)**：
    *   `--radius-sm` (4px) — 小 Badge、核對標籤
    *   `--radius-md` (8px) — 輸入框、小按鈕
    *   `--radius-lg` (12px) — **標準卡片圓角 (Standard Card)**、主要功能按鈕
    *   `--radius-xl` (16px) — 彈出視窗、側邊欄、對話框
    *   `--radius-pill` (999px) — 橢圓按鈕、狀態藥丸標籤 (Quick-Jump Pill)
*   **陰影系統 (Earthy Ambient Shadows)**：
    *   `--shadow-sm`：`0 1px 3px rgba(44, 36, 22, 0.08)`（微小物件懸浮，如 Input 聚焦）
    *   `--shadow-md`：`0 4px 12px rgba(44, 36, 22, 0.12)`（常規卡片，極具質感的暖深色投影）
    *   `--shadow-lg`：`0 8px 24px rgba(44, 36, 22, 0.16)`（彈出視窗、懸浮選單，高抬升質感）

---

## 3. UI/UX 最高設計法則

### 3.1 嚴格執行「無邊框設計定律 (No-Line Rule)」
結構的分割必須透過**色塊深淺對比**與**卡片毛玻璃層次**來完成，禁止使用大面積 1px 實線邊框分離網格。
*   *正確做法*：將主卡片背景設為半透明白 `rgba(255, 255, 255, 0.9)`，加上模糊濾鏡 `backdrop-filter: blur(10px)`，投影使用帶暖色的 `rgba(44, 36, 22, 0.05)`。卡片間距自然呼吸。
*   *錯誤做法*：在多欄位佈局中加入 `border-right: 1px solid #ccc;`。

### 3.2 雙端分流架構 (Dual-Experience UI Rules)
系統不採用單一瀑布流，而是因應兩位核心成員的操作場景進行「雙端體驗特化」：

#### 👧 Ling Au 行動端模式 (< 768px, iPhone 特化)
*   **核心定位**：極速引導式「點餐 POS 機」。
*   **核心規範**：
    1.  **卡片式步進引導 (Wizard flow)**：每次僅展示一個大步驟（如：客戶資料 → 選擇產品 → 生成報價）。
    2.  **固定底部導覽列 (Bottom Navigation)**：高度固定為 `64px`，按鈕高度大於 `44px` 方便單手盲按。
    3.  **隱藏財務看板**：強制隱藏利潤、毛利等複雜數據網格，維持最精簡直觀的視覺。
    4.  **觸控防呆**：所有互動熱區 minimum `44px * 44px`。

#### 👦 Fat Mo 桌面端模式 (> 1200px, 決策座艙)
*   **核心定位**：全功能「財務與運作座艙 (Data Cockpit)」。
*   **核心規範**：
    1.  **側邊導覽列 (Sidebar)**：整合全模組入口（訂單、產品 Bible、財務圖表、n8n 監控）。
    2.  **全域核對中心**：表格必須嚴格遵守 `td rowspan` 合併對齊定律，文字內容統一 `13px`，主屬性 `vertical-align: top;`。
    3.  **動態財務看板 (Finance Cockpit)**：頂部展示 KPI 資訊區，包含收入、成本、利潤、利潤率等動態指標。
    4.  **一鍵跳轉 (Quick-Jump)**：支援 `.review-jump-pill` 快捷藥丸標籤，提供無縫切換單號與編輯模式。

---

## 4. 財務圖表與數據視覺化調色盤

為了在 Earthy Warm 風格中保持極佳的財務資訊閱讀對比度，特意配製了高對比的財務專屬調色盤：

| 數據指標 | Token Key | 顏色值 (Hex) | 適用場景 |
| :--- | :--- | :--- | :--- |
| **總收入 (Revenue)** | `--fhs-kpi-revenue` | `#0288D1` | 收入 KPI、收入折線圖 |
| **總成本 (Cost)** | `--fhs-kpi-cost` | `#E64A19` | 成本 KPI、支出分配圖 |
| **總利潤 (Profit)** | `--fhs-kpi-profit` | `#2E7D32` | 利潤 KPI、獲利圓餅圖 |
| **總訂單數 (Orders)** | `--fhs-kpi-orders` | `#7B1FA2` | 訂單總量指標、訂單柱狀圖 |
| **平均客單價 (AOV)** | `--fhs-kpi-aov` | `#00838F` | 客單價變化指標 |
| **毛利率 (Margin)** | `--fhs-kpi-margin` | `#F9A825` | 獲利率黃金曲線 |

---

## 5. 微互動與動畫規範 (Micro-Animations)

為了給用戶帶來流暢、頂級的精品店操作體驗，必須在所有按鈕、卡片與狀態切換時加入輕微的物理動畫：

```css
/* 卡片懸浮與微縮放效果 */
.card {
    transition: transform var(--transition-base), box-shadow var(--transition-base);
}
.card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

/* 按鈕按壓物理彈動 */
.btn {
    transition: background-color var(--transition-fast), transform var(--transition-fast);
}
.btn:active {
    transform: scale(0.97);
}

/* 全域加載指示器彈出動畫 */
#globalLoader {
    transition: opacity var(--transition-base) ease-in-out;
}
```
