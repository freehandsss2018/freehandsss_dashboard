# n8n/ — Workflow 配置

| 檔案 | 用途 |
|---|---|
| `Triple_Sync_Field_Map.md` | Dashboard ↔ n8n ↔ Airtable 三端欄位映射（修改前必讀）|

> ⚠️ 硬規則：所有 n8n Code Node 必須回傳 `[{json: {...}}]` 陣列格式。
> 修改任何 n8n 配置前，必須先完成三端同步稽核（見 .fhs/ai/AGENTS.md 第 4 條）。
