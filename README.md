# Freehandsss Dashboard (FHS)

> 本專案已升級至 **Supabase-First 架構** (V41+)。所有 AI 必須優先遵循 `/.fhs/ai/AGENTS.md` v1.4.6 憲法層規則。

一套為 Freehandsss 手工嬰兒紀念品業務設計的全端同步管理系統。
主要架構：Dashboard UI ↔ n8n Workflow ↔ **Supabase (Primary Lead) + Airtable (Fallback)**

***

## 系統概覽

| 組件 | 說明 |
|***|***|
| **Dashboard UI** | 銷售前台（iPad/iPhone）及 管理後台（Desktop）；localStorage flag 控制 Supabase 讀取路徑 |
| **n8n Workflow** | 業務邏輯處理中樞，包含 SKU 正規化、成本計算、雙寫至 Supabase/Airtable |
| **Supabase** | **主資料庫** (Primary Lead)：orders, order_items, products, cost_configurations + Views/RPC |
| **Airtable** | **備援同步** (Fallback Backup)：舊訂單相容性維護、quota 限制時降級 |

***

## 給 AI 助理的話
>
> 如果你是 Claude Code 或 Antigravity，請立即執行：
>
> 1. 讀取 `docs/GLOBAL_AI_SOP.md`（v2.0 多代理協作協議）
> 2. 讀取 `/.fhs/ai/AGENTS.md`（憲法層，系統最高準則）
> 3. 讀取 `/.fhs/ai/commands/`（可用指令集）
> 4. 輸入 `/read` 完成記憶同步

***

## UI 檔案說明

| 檔案 | 用途 |
|***|***|
| Freehandsss_dashboard_current.html | **正式環境** = V41 (2026-05-16 Supabase-First 遷移完成) |
| freehandsss_dashboardV36.html | 舊版穩定基準 (Legacy Stable Baseline) |
| freehandsss_dashboardV37.html | 展示/試用版本 (Trial / Legacy) |
| freehandsss_dashboardV40.html | **當前穩定基準** (Latest Stable) |

**版本說明：**

- V36 = 舊版穩定基準（2026-04前）
- V40.7 = 當前生產版本（響應式設計 + 財務優化 + API 快取優化）
- 功能版本號 = 參閱 Changelog.md 最新記錄

## 備份與歸檔政策

- docs/archive/pre-v1.0-backup/ — v1.0 架構重組前的舊版備份
- archive/ — 專案層級舊版檔案備份
- 所有備份檔案只讀，不得修改，不得直接引用為執行來源

***

## 資料夾結構

| 資料夾 | 用途 |
|***|***|
| `.fhs/ai/` | AI 共用配置（憲法 + 指令）|
| `.fhs/memory/` | AI session 交接記憶 |
| `.fhs/notes/` | 決策記錄、待辦、工作日誌、AI 報告 |
| `docs/` | 技術文件、產品聖經、網頁地圖 |
| `Freehandsss_Dashboard/` | Dashboard UI 核心（HTML + 產品數據）|
| `n8n/` | n8n workflow 配置與欄位映射 |
| `Maintenance_Tools/` | 系統健康檢查腳本 |
| `scripts/` | 輔助維護腳本 |
| `archive/` | 舊版備份 |
| `n8n-mcp-server/` | n8n MCP Server — AI 控制層（Phase 1: FHS_Core_OrderProcessor）|
| `perplexity-mcp-server/` | Perplexity MCP 整合伺服器 |

> 詳細資料夾地圖請參閱 `docs/repo-map.md`
> *註：`node_modules/` 與 `tmp/` 為系統環境自動生成，禁止 AI 任意修改。*

***

## 版本

- **系統版本**：v1.4.6（見 `/.fhs/ai/AGENTS.md` — 憲法層，所有規則最高準則）
- **Dashboard UI 版本**：V41 (Active Production — Supabase-First)
  - 響應式設計（iPhone <768px / Desktop ≥768px）
  - Supabase 主導讀取層（localStorage flag `fhs_supabase_read` 控制）
  - Airtable 自動降級路徑（quota 超限時觸發）
  - Financial Overview 內嵌模式
  - Mirror to Supabase 雙寫機制（n8n 主導）
- **最後更新**：2026-05-17（Supabase-First 財務遷移完成，AGENTS.md v1.4.6 發佈）
