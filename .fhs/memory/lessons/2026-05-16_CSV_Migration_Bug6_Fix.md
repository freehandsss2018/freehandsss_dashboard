# Lesson: CSV Migration Fallback + Bug 6 根治
**日期**: 2026-05-16
**關聯任務**: Plan 0004 Supabase 成本架構遷移

---

## 教訓 1：Airtable API Quota 耗盡時的 CSV 備援遷移

**問題**: `migrate_airtable_to_supabase.js` 在 [0/4] 第一步就被 Airtable 429 阻擋（月度 quota 耗盡）。

**解法**: 從 `airtable-database/*.csv` 讀取資料替代 API。

**關鍵技術細節**:
- CSV 的 `Full_Order_Text` 欄位含換行，導致簡單的 `split('\n')` 解析失敗
- 必須用 character-by-character parser 處理 multiline quoted fields
- CSV linked fields 是直接值（如 Order_Link = Order_ID 字串），不是 Airtable record ID
- `🔗 Linked_Base_Cost` 欄名含 emoji，需原樣作為 key 讀取

**預防**: CSV export 應定期備份，作為 API 限流時的遷移備援。

---

## 教訓 2：n8n `continueOnFail` 解決 Airtable 節點 429 中斷問題

**問題**: `Smart Cache Strategist` 成功從 Supabase 取得成本（supabaseFetched: true），但 `Fetch Exact Base Cost`（Airtable 節點）仍執行，因月度 quota 耗盡而 429，導致整個 workflow 中斷，Telegram 未執行。

**根因**: `SUPABASE_SKIP` batchFormula 只讓 Airtable 返回 0 筆，但 API 請求仍然發出並消耗 quota。

**解法**: 透過 n8n REST API PUT 更新節點設定：
```json
{ "onError": "continueRegularOutput", "continueOnFail": true }
```

**n8n API PUT 注意事項**:
- `settings` 物件只能包含 n8n 允許的欄位，多餘欄位會返回 400
- 允許的 settings key：executionOrder, saveDataErrorExecution, saveDataSuccessExecution, saveManualExecutions, saveExecutionProgress, timezone, errorWorkflow, callerPolicy
- `availableInMCP` 等自訂欄位需過濾掉

---

## 教訓 3：Supabase DB 連線（port 5432）被網絡封鎖

**問題**: 嘗試用 pg 模組直連 `db.[ref].supabase.co:5432` 執行 DDL SQL，收到 ENOTFOUND。

**結論**: 在此環境（Windows/本地開發）port 5432 被封鎖。執行 DDL 需使用 Supabase SQL Editor（瀏覽器），REST API 只能執行 RPC 函數和 CRUD，不能執行 DDL。

---

## 教訓 4：Supabase schema 設計 — products 表的成本連結

**設計**: `products.cost_config_id` FK → `cost_configurations.id`，多個 SKU 共用一套成本配置。

**遷移技巧**: migration script 先 upsert cost_configurations → 取回 UUID map（config_name → UUID）→ 再 upsert products 時查找 UUID 寫入 cost_config_id。

**結果**: 489/489 products 全部連結，100% 覆蓋。
