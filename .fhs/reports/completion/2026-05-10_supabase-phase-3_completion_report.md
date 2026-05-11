# 完成記錄：Supabase Phase 3 — Dashboard V41 讀取層
**Task Slug**: supabase-phase-3
**Date**: 2026-05-10
**Executed by**: Claude (A3)
**Authorized by**: Fat Mo (/execute 2026-05-10)
**AGENTS.md 版本**: v1.4.4
**Flow ID**: 2026-05-09-2318

---

## 執行摘要

Phase 3「Dashboard 讀取切換（V41）」完成。
建立 `freehandsss_dashboardV41.html`，在 V40 基礎注入 Supabase Read Layer。
**寫入路徑完全不變**（n8n webhook → Airtable + Supabase 雙寫）。

---

## 完成項目

| 步驟 | 任務 | 結果 |
|------|------|------|
| 3.1 | 複製 V40 → V41 基底 | ✅ 完成 |
| 3.2 | Supabase Read Layer 注入（258 行） | ✅ 完成 |
| 3.3 | fetchGlobalReview 攔截（PostgREST orders 查詢） | ✅ 完成 |
| 3.4 | foFetchLive 攔截（get_order_summary RPC） | ✅ 完成 |
| 3.5 | Feature Flag 切換 pill UI | ✅ 完成 |
| 3.6 | Fallback → n8n webhook（Supabase 失敗時） | ✅ 完成 |
| 3.7 | CHANGELOG + supabase/README 更新 | ✅ 完成 |
| 3.8 | 本完成記錄 | ✅ 完成 |

---

## V41 架構說明

### 讀取切換設計
```
Flag OFF（預設）：  Dashboard → n8n webhook fetch-global-review → Airtable
Flag ON：           Dashboard → Supabase PostgREST / RPC → orders / get_order_summary
                       ↓ 失敗
                    Dashboard → n8n webhook（自動 fallback）
```

### Feature Flag
- 位置：右下角固定 pill 按鈕
- 儲存：`localStorage['fhs_supabase_read']` = '1' / '0'
- 預設：OFF（保守切換，不影響現有生產流程）
- 點擊即時切換 + 重新抓取資料

### 攔截函數對照

| V40 原函數 | V41 攔截行為（Flag ON） | 資料來源 |
|-----------|----------------------|---------|
| `fetchGlobalReview()` | PostgREST `orders` 表直查 | Supabase REST |
| `foFetchLive()` | `get_order_summary` RPC x2（月/年） | Supabase RPC |

### 欄位映射（Supabase → V40 格式）

| Supabase 欄位 | V40 期望欄位 |
|--------------|-------------|
| `order_id` | `Order_ID` |
| `customer_name` | `Customer_Name` |
| `confirmed_at` | `Date` |
| `final_sale_price` | `Final_Sale_Price` |
| `net_profit` | `Net_Profit` |
| `process_status` | `Process_Status` |
| `batch_number` | `Batch_Number` |

---

## AGENTS.md 硬規則合規確認

| 規則 | 合規狀態 |
|------|---------|
| 禁止覆蓋 current.html | ✅ V41 是新文件，current.html 未動 |
| 寫入路徑不改動 | ✅ n8n webhook 寫入完全不變 |
| captureFormState() 禁改 | ✅ 未觸碰前端表單序列化邏輯 |
| raw_form_state 不可侵犯 | ✅ 讀取層不涉及寫入 |
| 前端利潤最高真理 | ✅ Final_Sale_Price 只讀，不重算 |

---

## Supabase 整體進度（2026-05-10）

| Phase | 狀態 |
|-------|------|
| Phase 0 — 盤點與對齊 | ✅ 完成 |
| Phase 1 — Schema + Cloud Migration | ✅ 完成 |
| Phase 2 — n8n 雙寫 + 歷史遷移 | ✅ 完成 |
| Phase 3 — Dashboard V41 讀取層 | ✅ 完成 |
| Phase 4 — 雙系統穩定共存確認 | 待執行 |

---

## 新增文件

| 文件 | 說明 |
|------|------|
| `Freehandsss_Dashboard/freehandsss_dashboardV41.html` | V40 + Supabase Read Layer（6997 行） |

---

## Phase 4 準備事項

Phase 4（雙系統穩定共存確認）需要：
1. Fat Mo 在 V41 開啟 Supabase 讀取 Flag，實際使用一段時間
2. 對比 Supabase 讀取結果 vs Airtable 結果，確認資料一致性
3. 設定 Anti-Idle Ping（n8n Schedule Trigger 每 6 天 ping Supabase）
4. 啟用 pg_cron 30 天 error_logs TTL

如需繼續，輸入：`/execute Phase 4`
