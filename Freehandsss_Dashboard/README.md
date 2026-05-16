# Freehandsss_Dashboard — Dashboard UI 核心區

## 用途

本資料夾存放 FHS POS 系統的前端 Dashboard UI。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `Freehandsss_dashboard_current.html` | **正式生產環境** = V41（2026-05-16 Supabase-First 遷移完成） |
| `freehandsss_dashboardV36.html` | 舊版穩定基準 (Legacy Stable) |
| `freehandsss_dashboardV40.html` | 前一版穩定基準（V40.8 — 移除嬰兒月齡 + 報價明細 breakdown）|
| `freehandsss_dashboardV41.html` | **最新穩定基準**（V41 — 優化 Supabase 切換按鈕佈局，移除遮擋）|
| `preview_plan_b.html` | 方案B UI 預覽（訂單類型確認區塊，靜態示意用）|
| `freehandsss_financial_overview.html` | **Financial Overview 頁面**（財務圖表中樞） |
| `products.json` | 產品資料快取（非 live 資料；NAS 真正運作快取在 `.n8n/data/products.json`） |

## 重要規則

- **禁止覆蓋 `Freehandsss_dashboard_current.html`**：未獲 Fat Mo 授權，絕不可覆蓋正式環境
- **禁止變更 HTML ID**：Input/Button ID 是 n8n Webhook 掛鉤，牽一髮動全身
- **禁止改動 `captureFormState()`**：這是整個 POS 系統的數據根基

## 當前版本

- UI 層：**V41** (Active Production)
  - **Supabase 狀態列整合**：移除右下角浮動按鈕，改為頂部狀態晶片，避免遮擋手機版操作。
  - **響應式優化**：手機端自動隱藏狀態文字，僅顯示圖示。
  - 繼承 V40.8：移除嬰兒月齡邏輯，版面精簡化。
  - 繼承 V40.8：報價明細 (#priceBreakdown) 動態顯示。
- 憲法層：v1.4.5（AGENTS.md，2026-05-13）

## 相關文件

- 四端欄位映射：`/n8n/Quadruple_Sync_Field_Map.md`（v1.1，2026-05-13，取代 Triple_Sync）
- 架構說明：`/docs/FHS_Blueprint.md`
