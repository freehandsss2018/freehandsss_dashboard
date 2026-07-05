# n8n/ — Workflow 配置

| 檔案 | 用途 |
|---|---|
| `Quadruple_Sync_Field_Map.md` | Dashboard ↔ n8n ↔ Airtable ↔ Supabase 四端欄位映射 v1.1（修改前必讀，取代 Triple_Sync）|
| `FHS_Core_OrderProcessor.json` | **核心訂單處理機**：處理訂單新增修改、SKU 生成 |
| `FHS_Financial_Overview_workflow.json` | **財務聚合機**：處理收入/成本/利潤預估統計 |
| `FHS_System_ErrorMonitor.json` | 系統錯誤監控與診斷工作流 |
| `FHS_IGWatchdog_DriveWatch`（workflow ID `D4LK6VrQbiXlju0V`） | IG 看門狗：偵測 Google Drive 新檔案，比對訂單 ID，寫入 `ig_watchdog_alerts`（見 `supabase/migrations/0043_ig_watchdog_alerts.sql`）；規格見 `scripts/ig-watchdog/SOP.md` |

> ⚠️ 硬規則：所有 n8n Code Node 必須回傳 `[{json: {...}}]` 陣列格式。
> 修改任何 n8n 配置前，必須先完成三端同步稽核（見 .fhs/ai/AGENTS.md 第 4 條）。
