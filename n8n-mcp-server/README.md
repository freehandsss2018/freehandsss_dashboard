# n8n-mcp-server

FHS n8n MCP Server — AI 與 n8n 之間的專屬控制層。

## Phase 1 範圍

僅支援 `FHS_Core_OrderProcessor`（Workflow ID: `6Ljih0hSKr9RpYNm`）。

## 工具清單

| Tool | 用途 | 模式 |
|------|------|------|
| `get_workflow` | 讀取完整 workflow 定義 | 唯讀 |
| `get_node` | 讀取指定節點與 jsCode | 唯讀 |
| `update_node_code` | 更新 Code Node 的 jsCode | 預設 dry-run |
| `rollback_node_code` | 從備份檔回復節點 | 寫入 |
| `trigger_test_execution` | 用 mock payload 觸發測試 | 唯讀 |
| `get_execution_log` | 讀取 execution log 與失敗節點 | 唯讀 |
| `verify_triple_sync` | 三端同步一致性檢查 | 唯讀 |

## 優先支援節點

- Profit Auditor
- Parse Items & Generate SKU
- Input Normalizer
- Calculate Profit & Pack Items

## 設定

環境變數讀取自根目錄 `.env`：

- `N8N_KEY` — n8n API key
- `N8N_INSTANCE` — n8n base URL（不加結尾斜線）

## 安全控制

- Workflow allowlist：僅 `6Ljih0hSKr9RpYNm`
- `update_node_code` 預設 dry-run，需 `/execute` 授權才寫入
- 寫入前自動備份至 `.fhs/notes/aireports/n8n-mcp-backups/`
- `rollback_node_code` 可從備份完整回復

## 啟動

```bash
cd n8n-mcp-server
npm install
npm start
```

## 測試資料

`test-payloads/` 包含三組 mock payload：
- `mock_create_order.json`
- `mock_edit_order.json`
- `mock_delete_order.json`
