# FHS Claude Code 協作規範 (V45.7.4)

> 單一真理入口。Claude Code 啟動時只需讀此文件，按需引用下方 Reference 連結。

## 系統快照
- **版本**: V45.7.4 / Dashboard V36
- **Workflow ID**: `6Ljih0hSKr9RpYNm` (FHS_Core_OrderProcessor, 24 nodes)
- **Airtable Base**: `app9GuLsW9frN4xaT`
- **核心 UI 檔案**: `freehandsss_dashboardV36.html`

## 強制約束 (Hard Rules)

### 代碼修改
- **禁止變更 HTML Element IDs** — 表單 Input/Button/Table Body ID 是 n8n Webhook 掛鉤
- **禁止覆蓋 `Freehandsss_dashboard_current.html`** — 未獲 Fat Mo 授權前不得覆蓋生產環境
- **禁止硬編碼 API Key / Token** — 一律使用 `.env` + `process.env`
- **修改前必讀 `.fhs/memory/handoff.md`** — 確認無人正在作業，完成後更新進度

### n8n 部署
- **禁止 Import From File** — 必須使用 API PUT：
  `curl -X PUT -H "X-N8N-API-KEY: $N8N_API_KEY" -d @file.json http://host:5678/api/v1/workflows/$ID`
- **修改前必讀 `n8n/Triple_Sync_Field_Map.md`** — 確保 Dashboard→n8n→Airtable 三端對齊
- **Code Node 格式**: 回傳 `[{json: {...}}]` 陣列，禁止裸物件

### 安全
- 提交前確認 `.gitignore` 包含 `.env`、`*.xlsx`、`logs/`
- 發現硬編碼 Secret 須立即警告並引導遷移

### 語言 & 自癒
- **輸出語言**：繁體中文，夾雜必要英文術語（Payload、Upsert、Mapping）
- **亂碼自癒**：發現編碼問題（NEL / U+0085）→ 立即參考 `docs/FHS_Blueprint.md` 字元潔淨度規範修復

## 快捷指令

| 指令 | 實際動作 |
|------|----------|
| `/fhs-check` | `python Maintenance_Tools/run_all.py` — 依序執行 LOCAL_AUDIT → LIFECYCLE → STRESS → ACCEPTANCE，輸出 Health Report，標記 Red Flags |

## A3 GO 執行流程

1. `ls -lt C:/Users/Edwin/.gemini/antigravity/brain/` → 取第一行為最新 session
2. 讀取 `{latest_session}/audit_report.md.resolved`（A1）
3. 讀取 `{latest_session}/implementation_plan.md.resolved`（A2）
4. 回報：「已讀取 A1：[路徑] ✅  已讀取 A2：[路徑] ✅」
5. 執行技術可行性評估，聚焦：Maintenance、Simplicity、Zero Conflict
6. **宣告 task success 前必須通過 `/fhs-check`**（Health Report 無 Red Flags 才可結案）

## 三端同步稽核（任何修改前）

1. [Dashboard] Payload 結構是否變動？
2. [n8n] 節點 Mapping 是否中斷？
3. [Airtable] 欄位讀寫一致性是否受影響？

## Reference（按需引用，勿預先全讀）

| 文件 | 用途 |
|------|------|
| `docs/FHS_Blueprint.md` | 架構 ID 命名、數據流 |
| `docs/FHS_Product_Bible_V3.7.md` | SKU、售價、業務規則 |
| `n8n/Triple_Sync_Field_Map.md` | 三端欄位映射 |
| `docs/GLOBAL_AI_SOP.md` | 3-Step 多 AI 協作協議 |
| `docs/FHS_System_Health_Check_SOP.md` | 系統健康檢查標準 |
| `n8n/V45.7.4_Incident_Report.md` | n8n 事故複盤 + API 部署腳本 |
| `.fhs/memory/handoff.md` | 當前任務狀態 |
