---
name: FHS Product Cost UI Spec
version: v2.1.0
created: 2026-05-28
parent: .fhs/ai/FHS_Product_Cost_Schema_v2.md
authority: Desktop + Mobile 響應式視覺規範
status: v2.1 draft — pending ui-designer audit
---

# 🎨 FHS 產品成本設定 UI 規範

> **本文件用途**：定義財務設定面板在 Desktop (1280px+) 與 iPhone (375–414px) 的視覺與互動規範。
> **執行對象**：frontend-developer 修 `Freehandsss_dashboardV41.html` 必須依此規範。
> **前置依賴**：必須通過 `ui-designer` subagent 審計。

---

## §UI-1. Desktop wireframe（≥1280px）

### 1.1 整體佈局

```
┌──────────────────────────────────────────────────────────────┐
│  💰 財務設定                              [批量重算] [全部儲存] │
├──────────────────────────────────────────────────────────────┤
│  ┌─ A. 繪圖成本 (4) ▼ ─────────────────────────────────┐    │
│  │  ...                                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌─ B. 立體擺設物料 (2) ▼ ─────────────────────────────┐    │
│  │  ...                                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌─ C. 飾品物料 (8) ▼  ────────────────────────────────┐    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌─ D. 運費 (3) ▼ ──────────────────────────────────────┐    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌─ E. 加購配件 (2) ▼ ─────────────────────────────────┐    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌─ MISC. 其他 (4) ▼ ──────────────────────────────────┐    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 行為規範

| 元素 | 規範 |
|------|------|
| 分組面板 | **全部 GROUP 預設收合**（S107 決策：A 與 B-MISC 行為一致，已移除 A 展開特殊化，見 `current.html` L14553 註記）；accordion 樣式；**Desktop 允許多組同時展開**（螢幕空間足夠）；單組限制僅適用 Mobile |
| 輸入欄位 | type="number" min="0" step="0.01"；右側顯示「HKD」 |
| 即時驗證 | onblur 觸發；空值 / 負數 / 非數字 → 紅框 + 錯誤提示 |
| 儲存按鈕 | 兩種：① 單列右側即時儲存 ② 頁頂「全部儲存」 |
| 衝突警示 | 若 batch recalc 進行中，欄位 disabled + 顯示「⚠️ 批量重算中，請稍候」banner |
| 變更高亮 | 已修改未儲存的欄位背景黃色 (#FFF3CD)；儲存成功變綠 (#D4EDDA) 0.8s 後恢復 |

### 1.3 視覺 Token（對齊 V41 既有 CSS）

```css
/* 既有 V41 token 直接複用 */
--fhs-primary: #2A9D8F  (current.html 現行 fallback 實測值，:root 無獨立定義，見 L13345)
--fhs-spacing-md: 16px
--fhs-border-radius: 8px
--fhs-font-mono: SFMono-Regular, ... (用於數字)
```

---

## §UI-2. Mobile wireframe（375–414px）

### 2.1 整體佈局

```
┌─────────────────────────┐
│ ☰  💰 財務設定          │  ← 頂部 sticky header
├─────────────────────────┤
│ [批量重算] [全部儲存]    │  ← sticky action bar
├─────────────────────────┤
│ ▼ A. 繪圖成本 (4)        │  ← 預設展開
│ ┌─────────────────────┐ │
│ │ 嬰兒/大寶 (S)        │ │
│ │ ┌─────────────┐ HKD │ │
│ │ │     60      │     │ │
│ │ └─────────────┘     │ │
│ │              [儲存] │ │
│ └─────────────────────┘ │
│ ...                      │
│ ▶ B. 立體擺設物料 (2)    │  ← 收合
│ ▶ C. 飾品物料 (4)        │
│ ▶ D. 運費 (2)            │
│ ▶ E. 加購配件 (2)        │
│ ▶ MISC. 其他 (3)         │
└─────────────────────────┘
```

### 2.2 行為規範（手機特有）

| 元素 | 規範 |
|------|------|
| 數字鍵盤 | `<input type="number" inputmode="decimal">` 兩屬性並用（覆蓋 Android MIUI/One UI 老機型） |
| Sticky bar | 頂部 header + action bar 永遠 visible；scroll 時 group header 黏在頂部；sticky 層需指定 `z-index: 500`（低於 V41 既有 sticky 2000/1999/1998，避免 stacking context 互遮） |
| 觸控目標 | 最小高度 44px（Apple HIG）；按鈕間距 ≥8px |
| Accordion | 同時只允許 1 個 GROUP 展開（節省垂直空間） |
| 儲存回饋 | Toast bottom：「✓ 已儲存 嬰兒/大寶 (S) = $60」3 秒自動消失 |
| 衝突警示 | 全螢幕 modal：「批量重算進行中（已處理 X / Y 筆），請稍候」+ 進度條 |

---

## §UI-3. 互動規範（共通）

### 3.1 儲存流程

```
User 改值 (60 → 65)
  ↓
Field blur → 黃色背景 (待儲存)
  ↓
Click [儲存] → 灰色 spinner
  ↓
RPC fhs_upsert_cost_config 回傳
  ├── success → 綠色閃 0.8s → Toast「✓ 已儲存」
  └── failure → 紅色閃 → Modal 顯示錯誤訊息 + Retry 按鈕
```

### 3.2 最後修改提示（Desktop）

> **修正說明**：`cost_configurations` 表只有單筆 `updated_at` + `updated_by`，無歷史 log 表。
> 此功能降級為「最後修改」單行提示，v3 升級前不呈現多筆 list。

點擊欄位旁 🕐 icon → 顯示 tooltip（非 popover）：

```
最後修改：2026-05-28 14:30  by Fat Mo
```

資料來源：`cost_configurations.updated_at` + `updated_by`（v3 升級前僅單筆）

### 3.3 衝突警告 Modal

觸發條件：`financial_batch_logs` 有 `n8n_status IN ('pending', 'submitted', 'processing')` 記錄。

| 場景 | UI 行為 |
|------|---------|
| 載入頁面時偵測到正在重算 | 全欄位 disabled + 頂部 warning banner |
| 儲存時遇到 version conflict（樂觀鎖失敗） | Modal（見下方） |

**衝突 Modal 規格**（解決同裝置雙分頁死鎖問題）：

```
┌─────────────────────────────────────────┐
│  ⚠️ 版本衝突                             │
│                                         │
│  此欄位在你編輯期間已被其他視窗更新。     │
│  請選擇處理方式：                        │
│                                         │
│  [重新載入（放棄我的修改）]               │
│  [強制儲存（以我的值覆寫）]               │
└─────────────────────────────────────────┘
```

- `[重新載入]` → `window.location.reload()`
- `[強制儲存]` → 呼叫 RPC 時傳 `p_expected_version = NULL`（跳過版本檢查）

---

## §UI-4. V42 落地紀錄（歷史，非待辦）

> ⚠️ **2026-07-05 ui-designer 審計確認**：以下改動已於 V42（`current.html`）實作完成（`loadCostConfigurations`/`cost-group`/`cost-field-row` class、樂觀鎖 `p_expected_version` 均已存在，見 L14483-14593）。本節僅供追溯，**不得**當作 Stage 3 待辦清單重寫已存在的函式。若需定義「V42→未來版本尚未做的差異」，需另開新章節並附具體 gap 分析，本次審計未產出該分析。

### 4.1 受影響的 V41 既有區塊（已完成，歷史記錄）

| 區塊 | 行號預估 | 改動 |
|------|---------|------|
| 財務設定 panel HTML | V41 既有 7-key 區段 | 改為 23-key 分組顯示；複用既有 input class |
| 財務設定 JS 載入邏輯 | `loadCostConfigurations()` 函式 | 改為 SELECT * 並依 display_group 動態渲染 |
| 財務設定 JS 儲存邏輯 | `saveCostConfiguration()` 函式 | 加樂觀鎖檢查（送 expected_version） |
| 批量重算按鈕 | 既有按鈕 | 加進行中狀態 polling（每 2 秒查 financial_batch_logs） |

### 4.2 不影響的 V41 區塊（明確聲明）

- 訂單列表
- 訂單編輯 modal
- Telegram 推送
- Mode 2 item card
- 統計儀表板

→ frontend-developer 不得碰以上區塊。

### 4.3 CSS 新增

僅新增：`.cost-group`、`.cost-group-header`、`.cost-field-row`、`.cost-field-saving`、`.cost-field-saved`、`.cost-field-error`、`.cost-conflict-banner`

→ 全部以 `cost-` prefix 隔離，避免污染既有命名空間。

---

**UI Spec 結束 — 等候 ui-designer 審計。**
