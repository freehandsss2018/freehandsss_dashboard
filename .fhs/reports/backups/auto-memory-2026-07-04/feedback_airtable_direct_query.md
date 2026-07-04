---
name: Data query priority — Supabase first, Airtable as fallback only
description: Live data queries must go to Supabase first; Airtable MCP is fallback only. Never use screenshots as real data.
type: feedback
originSessionId: 9031bf2e-7b46-4c8c-ab2a-c7b2bff4313b
---
查詢任何 live 資料（訂單、財務、欄位值）時，必須先走 Supabase，Airtable 只是 fallback。截圖永遠不能作為資料來源。

**Why:** 兩個獨立事故：
1. (2026-05-02) 用截圖猜測財務數字寫入 mock data，導致金額嚴重錯誤（7筆 vs 21筆、$20,520 vs $86,809）。
2. (2026-05-20) debug 訂單 Batch 欄位時先呼叫 Airtable MCP（返回 429 月限滿），才改看代碼。應直接查 Supabase（主導核心），Airtable 只在 Supabase 不可用時才作 fallback。

**How to apply:**
- 需要 live 資料時：**優先** 呼叫 Supabase（n8n MCP trigger、sbFetch、Supabase REST API）
- Airtable MCP 只在 Supabase 不可用或數據不完整時才使用
- 若 Supabase 不可用：明確告知 Fat Mo，不得靜默轉 Airtable 查詢後假裝是 Supabase 資料
- 截圖只作 UI 視覺參考，絕不作資料來源
- 估算值必須明確標示為「估算」，不得寫入任何儲存層
