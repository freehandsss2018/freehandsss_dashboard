# Freehandsss_Dashboard — Dashboard UI 核心區

## 用途

本資料夾存放 FHS POS 系統的前端 Dashboard UI。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `Freehandsss_dashboard_current.html` | **正式生產環境** = V40.8（2026-05-05 同步） |
| `freehandsss_dashboardV36.html` | 舊版穩定基準 (Legacy Stable) |
| `freehandsss_dashboardV40.html` | **最新穩定基準**（V40.8 — 移除嬰兒月齡 + 報價明細 breakdown + 訂金自動預填 + IG 預覽對比優化）|
| `preview_plan_b.html` | 方案B UI 預覽（訂單類型確認區塊，靜態示意用）|
| `freehandsss_financial_overview.html` | **Financial Overview 頁面**（財務圖表中樞） |
| `products.json` | 產品資料快取（非 live 資料；NAS 真正運作快取在 `.n8n/data/products.json`） |

## 重要規則

- **禁止覆蓋 `Freehandsss_dashboard_current.html`**：未獲 Fat Mo 授權，絕不可覆蓋正式環境
- **禁止變更 HTML ID**：Input/Button ID 是 n8n Webhook 掛鉤，牽一髮動全身
- **禁止改動 `captureFormState()`**：這是整個 POS 系統的數據根基

## 當前版本

- UI 層：**V40.8** (Active Production)
  - 移除嬰兒月齡邏輯，版面精簡化
  - 報價明細 (#priceBreakdown) 動態顯示
  - 財務欄位 (訂金/尾數) 智能預填與視覺區分
  - IG 訊息預覽標題顏色優化 (High Contrast)
- 憲法層：v1.4.2（AGENTS.md）

## 相關文件

- 三端欄位映射：`/n8n/Triple_Sync_Field_Map.md`
- 架構說明：`/docs/FHS_Blueprint.md`
