# n8n Node Interaction Map
**Workflow**: FHS_Core_OrderProcessor (`6Ljih0hSKr9RpYNm`)
**Captured**: 2026-05-10 (via n8n MCP, Phase 0 盤點)
**Node Count**: 24（確認）

---

## 執行路徑圖

```
[Receive Dashboard Order] (Webhook)
        ↓
[Input Normalizer] (Code) — normalize payload
        ↓
[Switch Action] (Switch)
    ├── Case 0: DELETE → [Search Record to Delete] → [Delete Record] → [Notify Telegram (Delete)]
    └── Case 1: CREATE/EDIT →
            ├── [Profit Auditor] → [Auditor Logic Switch] → [Auditor Alert] (Telegram)
            └── [Parse Items & Generate SKU] → [Batch SKU Collector]
                        ↓
                [Read Cache File] → [Smart Cache Strategist] → [Cache Hit?]
                    ├── HIT  → [Calculate Profit & Pack Items]
                    └── MISS → [Fetch Exact Base Cost] → [Local Data Mapper] → [Calculate Profit & Pack Items]
                                        ↓
                              [Create Main Order] (Airtable: Main_Orders)
                                        ↓
                              [Bind Main Order ID] (Code)
                                        ↓
                              [Create Sub Items] (Airtable: Order_Items)
                                        ↓
                              [Pack Telegram Data] (Code) → [Send Profit Report] (Telegram)

[Find Product ID] (SplitOut) — 獨立輔助節點
[Workflow Description] (StickyNote) — 文檔節點
```

---

## 節點詳細分類

### 🔴 Airtable 直連節點（Supabase 雙寫重點）

| 節點名稱 | 操作 | 目標表 | Supabase 雙寫動作 |
|---------|------|-------|-----------------|
| `Create Main Order` | CREATE / UPSERT | Main_Orders | 同步寫入 `orders` 表 |
| `Create Sub Items` | CREATE / UPSERT | Order_Items | 同步寫入 `order_items` 表（item_key Upsert） |
| `Fetch Exact Base Cost` | READ | Base_Costs / Product_Database | 讀取 `cost_configurations` + `products`（Supabase 優先） |
| `Search Record to Delete` | SEARCH | Main_Orders | 查詢 `orders` 表 |
| `Delete Record` | DELETE | Main_Orders | 同步刪除 `orders`（或軟刪 `deleted_at`） |

### 🟡 Code 節點（核心邏輯，需確保 `[{json:{}}]` 格式）

| 節點名稱 | 功能 | AGENTS.md 約束 |
|---------|------|--------------|
| `Input Normalizer` | Payload 正規化 | 輸出必須 `[{json:{...}}]` |
| `Parse Items & Generate SKU` | ⚠️ **SKU 正規化**（3肢→4肢 等同義轉換） | SKU 審計前置，不可跳過 |
| `Batch SKU Collector` | 批次收集 SKU | 輸出必須 `[{json:{...}}]` |
| `Bind Main Order ID` | 綁定 Order ID | 輸出必須 `[{json:{...}}]` |
| `Profit Auditor` | 利潤稽核 | 輸出必須 `[{json:{auditPassed:true,...}}]` |
| `Calculate Profit & Pack Items` | ⚠️ **核心財務計算** — 產生 Total_Cost / Net_Profit | 結果由 n8n 寫入，禁止 Supabase trigger 重算 |
| `Local Data Mapper` | 成本資料映射 | 輸出必須 `[{json:{...}}]` |
| `Smart Cache Strategist` | 快取策略 | 輸出必須 `[{json:{...}}]` |
| `Pack Telegram Data` | 打包 Telegram 通知 | 輸出必須 `[{json:{...}}]` |

### 🟢 其他節點（無 Airtable 直連）

| 節點名稱 | 類型 | 功能 |
|---------|------|------|
| `Receive Dashboard Order` | Webhook | 入口接收 Dashboard payload |
| `Switch Action` | Switch | 路由：DELETE / CREATE |
| `Auditor Logic Switch` | Switch | 路由：稽核告警 |
| `Auditor Alert` | Telegram | 利潤異常 Telegram 告警 |
| `Read Cache File` | ReadBinaryFile | 讀取本地成本快取 |
| `Cache Hit?` | Switch | 快取命中判斷 |
| `Notify Telegram (Delete)` | Telegram | 刪單通知 |
| `Send Profit Report` | Telegram | 利潤報告推送 |
| `Find Product ID` | SplitOut | 輔助節點 |
| `Workflow Description` | StickyNote | 文檔 |

---

## Supabase 雙寫改造計畫（Phase 2 參考）

### 策略：新增並行分支，不修改現有 Airtable 節點

```
現有流程：[Calculate Profit & Pack Items] → [Create Main Order (Airtable)] → ...

改造後：
[Calculate Profit & Pack Items]
    ├── [Create Main Order (Airtable)]   ← 保留現有
    └── [Mirror to Supabase (HTTP)]       ← 新增 HTTP Request 節點，呼叫 Supabase REST
```

**改造原則**：
1. **不刪除**任何現有 Airtable 節點（雙寫並行）
2. 新增 `Mirror to Supabase` HTTP Request 節點（使用 Supabase REST API）
3. 使用 Feature Flag（n8n Workflow Static Data `supabase_mirror_enabled`）控制雙寫開關
4. Supabase 寫入失敗**不影響** Airtable 主流程（try-catch 隔離）
5. 所有新增 Code Node 必須回傳 `[{json:{...}}]` 格式（AGENTS.md 硬規則）

### 涉及改造的節點（Phase 2 待辦）

| 節點 | 改造方式 | 新增節點 |
|------|---------|---------|
| `Create Main Order` 後 | 並行分支 | `Mirror Order to Supabase` (HTTP) |
| `Create Sub Items` 後 | 並行分支 | `Mirror Items to Supabase` (HTTP) |
| `Delete Record` 後 | 並行分支 | `Mirror Delete to Supabase` (HTTP) |
| `Fetch Exact Base Cost` | 可選改為 Supabase-first | Feature Flag 控制 |

---

## 關鍵發現 ⚠️

1. **SKU 正規化是 Gate**：`Parse Items & Generate SKU` 必須在所有 Supabase 寫入前執行（不可繞過）
2. **利潤計算在 n8n 側**：`Calculate Profit & Pack Items` 是財務真理的計算源頭，Supabase 只能接收結果，不可 trigger 重算
3. **刪單路徑**：建議 Supabase 使用軟刪除（`deleted_at TIMESTAMPTZ`）而非 hard delete，保留稽核軌跡
4. **快取機制**：本地 cache file 是成本加速機制，Supabase 穩定後可改為 Supabase `cost_configurations` 表快取
5. **Telegram 節點**：3 個 Telegram 通知節點不需雙寫（通知層，非數據層）
