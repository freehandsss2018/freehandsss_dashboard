# n8n/ — Workflow 配置

| 檔案 | 用途 |
|---|---|
| `Triple_Sync_Field_Map.md` | Dashboard ↔ n8n ↔ Airtable 三端欄位映射（修改前必讀）|
| `FHS_Core_OrderProcessor.json` | **核心訂單處理機**：處理訂單新增修改、SKU 生成 |
| `FHS_Financial_Overview_workflow.json` | **財務聚合機**：處理收入/成本/利潤預估統計 |
| `FHS_System_ErrorMonitor.json` | 系統錯誤監控與診斷工作流 |

> ⚠️ 硬規則：所有 n8n Code Node 必須回傳 `[{json: {...}}]` 陣列格式。
> 修改任何 n8n 配置前，必須先完成三端同步稽核（見 .fhs/ai/AGENTS.md 第 4 條）。
