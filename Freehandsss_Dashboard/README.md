# Freehandsss_Dashboard — Dashboard UI 核心區

## 用途

本資料夾存放 FHS POS 系統的前端 Dashboard UI。

## 檔案說明

| 檔案 | 用途 |
|---|---|
| `Freehandsss_dashboard_current.html` | **正式生產環境** = V42（2026-06-16 Session 107：split 還原修復 + 成本設定 A 區摺疊） |
| `freehandsss_dashboardV36.html` | 舊版穩定基準 (Legacy Stable) |
| `freehandsss_dashboardV40.html` | 前一版穩定基準（V40.8 — 移除嬰兒月齡 + 報價明細 breakdown）|
| `freehandsss_dashboardV41.html` | V41 穩定基準（Supabase-First 遷移；2026-05-16）|
| `freehandsss_dashboardV42.html` | **✅ Production**（Session 115 升格；Audit Ledger + split 還原快照隔離 + 成本設定摺疊；Session 119 加入 igwatch 模式）|
| `freehandsss_financial_overview.html` | **Financial Overview 頁面**（財務圖表中樞） |
| `products.json` | 產品資料快取（非 live 資料；NAS 真正運作快取在 `.n8n/data/products.json`） |

## 重要規則

- **禁止覆蓋 `Freehandsss_dashboard_current.html`**：未獲 Fat Mo 授權，絕不可覆蓋正式環境
- **禁止變更 HTML ID**：Input/Button ID 是 n8n Webhook 掛鉤，牽一髮動全身
- **禁止改動 `captureFormState()`**：這是整個 POS 系統的數據根基

## 當前版本

- UI 層：**V42** (Active Production，2026-06-16 Session 107)
  - **split 還原快照隔離**：修復全付重載後 deposit/balance 顯示錯誤（P36）
  - **成本設定中心 A 區摺疊**：繪圖成本與 B/C/D/E/MISC 行為一致，預設摺疊
  - 繼承 Session 102：Audit Ledger 財務對賬四區塊
  - 繼承 Session 101：restoreSplits 容器清空修復
- 憲法層：v1.4.13（AGENTS.md，2026-06-09）

## 相關文件

- 四端欄位映射：`/n8n/Quadruple_Sync_Field_Map.md`（v1.1，2026-05-13，取代 Triple_Sync）
- 架構定位與數據主導權：`.fhs/ai/AGENTS.md` §1；運作細節：`.fhs/notes/FHS_System_Logic_Overview.md`（原 `/docs/FHS_Blueprint.md` 已於 2026-07-08 S158 刪除，見 decisions.md D20）
