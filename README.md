# Freehandsss Dashboard (FHS)

> 本專案已升級並遵循 `docs/GLOBAL_AI_SOP.md` v2.0 架構。新進代理請優先閱讀。

一套為 Freehandsss 手工嬰兒紀念品業務設計的全端同步管理系統。
主要架構：Dashboard UI ↔ n8n Workflow ↔ Airtable Database

***

## 系統概覽

| 組件 | 說明 |
|---|---|
| **Dashboard UI** | 銷售前台（iPad/iPhone）及 管理後台（Desktop）|
| **n8n Workflow** | 業務邏輯處理中樞，包含訂單回傳、統計 |
| **Airtable** | 主資料庫，存儲產品、成本、客戶紀錄 |

***

## 給 AI 助理的話
> 如果你是 Claude Code 或 Antigravity，請立即執行：
> 1. 讀取 `docs/GLOBAL_AI_SOP.md`（v2.0 多代理協作協議）
> 2. 讀取 `/.fhs/ai/AGENTS.md`（憲法層，系統最高準則）
> 3. 讀取 `/.fhs/ai/commands/`（可用指令集）
> 4. 輸入 `/read` 完成記憶同步
>
> `/a3go` 是最終技術把關觸發器（非自動覆寫令），需雙重授權後才執行寫入。

---

## UI 檔案說明
| 檔案 | 用途 |
|---|---|
| Freehandsss_dashboard_current.html | 正式環境（禁止未授權覆寫） |
| freehandsss_dashboardV36.html | 當前開發版（所有新功能在此測試）|

V36 = 開發檔案實體檔名（固定）
功能版本號 = 參閱 Changelog.md 最新記錄

## 備份與歸檔政策
- docs/archive/pre-v1.0-backup/ — v1.0 架構重組前的舊版備份
- archive/ — 專案層級舊版檔案備份
- 所有備份檔案只讀，不得修改，不得直接引用為執行來源

---

## 資料夾結構
| 資料夾 | 用途 |
|---|---|
| `.fhs/ai/` | AI 共用配置（憲法 + 指令）|
| `.fhs/memory/` | AI session 交接記憶 |
| `.fhs/notes/` | 決策記錄、待辦、工作日誌、AI 報告 |
| `docs/` | 技術文件、產品聖經、網頁地圖 |
| `Freehandsss_Dashboard/` | Dashboard UI 核心（HTML + 產品數據）|
| `n8n/` | n8n workflow 配置與欄位映射 |
| `Maintenance_Tools/` | 系統健康檢查腳本 |
| `scripts/` | 輔助維護腳本 |
| `archive/` | 舊版備份 |
| `perplexity-mcp-server/` | Perplexity MCP 整合伺服器 |

> 詳細資料夾地圖請參閱 `docs/repo-map.md`
> *註：`node_modules/` 與 `tmp/` 為系統環境自動生成，禁止 AI 任意修改。*

***

## 版本
- **系統版本**：v1.3.1（見 `.fhs/ai/AGENTS.md`）
- **SOP 版本**：v2.0（見 `docs/GLOBAL_AI_SOP.md`）
- **最後更新**：2026-03-31
