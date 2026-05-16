# FHS Supabase Setup
**目的**：FHS 四端永久雙系統共存（Airtable ↔ n8n ↔ Dashboard ↔ Supabase）
**方案**：Supabase Free Tier（$0/月）
**Phase**：Phase 1 ✅ Complete (Schema 建立 2026-05-10)、Phase 2 ✅ Complete (n8n 雙寫機制 2026-05-10)、Phase 3 ✅ Complete (Dashboard V41 2026-05-10)、Phase 4 ⏳ Pending (雙系統穩定共存確認)

---

## Fat Mo 手動操作清單

### Step 1 — 建立 Supabase 專案

1. 前往 https://supabase.com → 登入 / 建立帳號
2. 建立新 Project（Free Tier，選最近地區）
3. 記下 Project URL 和 API Keys
4. 複製 `.env.supabase.example` → `.env`，填入實際值

### Step 2 — 執行 Migration

在 Supabase SQL Editor（或用 psql）執行以下檔案，**依序**：

```
1. supabase/migrations/0001_initial_schema.sql   — 建立 6 張表 + 索引
2. supabase/rls/rls_policies.sql                  — 設定 RLS 存取控制
3. supabase/rpc/get_order_summary.sql             — 訂單摘要 RPC
4. supabase/rpc/get_profit_audit.sql              — 利潤稽核 RPC
5. supabase/rpc/get_recent_orders.sql             — 最近訂單 RPC
6. supabase/rpc/get_products_by_category.sql      — 產品分類 RPC
```

### Step 3 — 啟用 pg_cron（Error_Logs TTL）

1. Supabase Dashboard → Database → Extensions → 啟用 `pg_cron`
2. 在 SQL Editor 執行（見 `ANTI_IDLE_SETUP.md` 底部）

### Step 4 — 設定 Anti-Idle Ping

參考 `ANTI_IDLE_SETUP.md`，在 n8n 建立每 6 天 ping workflow。

### Step 5 — 設定 n8n 環境變數

在 n8n 加入環境變數：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`（n8n 用 service_role，不是 anon）

---

## 目錄結構

```
supabase/
├── README.md                    ← 本文件（Fat Mo 操作指南）
├── ANTI_IDLE_SETUP.md           ← 防閒置 ping 設定
├── migrations/
│   └── 0001_initial_schema.sql  ← 建表 DDL（含所有 P0/P1 修正）
├── rls/
│   └── rls_policies.sql         ← Row Level Security 政策
└── rpc/
    ├── get_order_summary.sql    ← 訂單摘要（Dashboard Financial Overview）
    ├── get_profit_audit.sql     ← 利潤稽核（finance-auditor subagent）
    ├── get_recent_orders.sql    ← 最近訂單列表（Dashboard）
    └── get_products_by_category.sql ← 產品目錄（Dashboard / n8n cache）
```

---

## AGENTS.md 硬規則（Supabase 操作必讀）

| 規則 | 內容 |
|------|------|
| 禁止 trigger 重算財務 | `final_sale_price` / `net_profit` / `*_cost` 由 n8n 寫入，Supabase 不可有 trigger 重算 |
| raw_form_state 不可刪 | `orders.raw_form_state JSONB NOT NULL` — 訂單還原生命線 |
| 雙系統架構 | V41起 Supabase 轉為主導核心，Airtable 轉為後備方案。待完全復核後 Supabase 成為正式 SSoT |
| Free Tier 警戒線 | 資料庫 400 MB / 月頻寬 1.5 GB 超出須提示 Fat Mo |
| 防閒置必須 | 每 6 天 ping，否則 Free Tier 暫停 |

---

## 當前狀態

- [x] Phase 0 — 盤點與對齊（2026-05-10 完成）
- [x] Phase 1 — Schema SQL 文件建立（2026-05-10 完成）
- [x] Phase 1 — Supabase 專案建立 + Migration 執行完成（2026-05-10，6 tables + 4 RPC functions）
- [x] Phase 2 — n8n 雙寫機制建立（2026-05-10）
  - [x] Mirror to Supabase 節點（CREATE path，並行於 Create Sub Items）
  - [x] Mirror Delete to Supabase 節點（DELETE path，並行於 Delete Record）
  - [x] 歷史資料遷移：23 orders / 62 items / 489 products
  - [ ] ⚠️ Fat Mo 待辦：n8n 設定 SUPABASE_URL + SUPABASE_SERVICE_KEY 環境變數
- [x] Phase 3 — Dashboard V41 建立（2026-05-10）
  - [x] `freehandsss_dashboardV41.html` 從 V40 複製，注入 Supabase Read Layer
  - [x] Feature Flag 切換按鈕（右下角固定按鈕，localStorage 持久化）
  - [x] `fetchGlobalReview` 攔截 → Supabase PostgREST 直查 orders 表
  - [x] `foFetchLive` 攔截 → `get_order_summary` RPC（月/年彙總）
  - [x] 失敗自動 fallback → n8n webhook（不中斷服務）
- [ ] Phase 4 — 雙系統穩定共存確認
