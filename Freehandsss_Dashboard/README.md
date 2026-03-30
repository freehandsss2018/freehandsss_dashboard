# Freehandsss_Dashboard — Dashboard UI 核心區

## 用途
本資料夾存放 FHS POS 系統的前端 Dashboard UI。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `Freehandsss_dashboard_current.html` | **正式生產環境**（禁止未授權覆蓋） |
| `freehandsss_dashboardV36.html` | 當前開發版本（V36.2.2） |
| `products.js` | 產品快取 JS 模組 |
| `products.json` | 產品資料快取 |

## 重要規則

- **禁止覆蓋 `Freehandsss_dashboard_current.html`**：未獲 Fat Mo 授權，絕不可覆蓋正式環境
- **禁止變更 HTML ID**：Input/Button ID 是 n8n Webhook 掛鉤，牽一髮動全身
- **禁止改動 `captureFormState()`**：這是整個 POS 系統的數據根基

## 當前版本
- UI 層：V36.2.2
- 憲法層：v1.3.0（AGENTS.md）

## 相關文件
- 三端欄位映射：`/n8n/Triple_Sync_Field_Map.md`
- 架構說明：`/docs/FHS_Blueprint.md`
