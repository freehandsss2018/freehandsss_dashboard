# 完成記錄：Supabase Phase 1 — Schema 建立
**Task Slug**: supabase-phase-1
**Date**: 2026-05-10
**Executed by**: Claude (A3)
**Authorized by**: Fat Mo (/execute 2026-05-10)
**AGENTS.md 版本**: v1.4.4
**Flow ID**: 2026-05-09-2318

---

## 執行摘要

Phase 1「基礎建設與架構設計（本地 SQL 文件層）」完成。
本階段建立所有 Supabase Schema SQL 文件，Fat Mo 手動建立 Supabase 專案後即可執行。

---

## 完成項目

| 步驟 | 任務 | 結果 |
|------|------|------|
| 1.1 | supabase/ 目錄結構 + README | ✅ 完成 |
| 1.2 | 0001_initial_schema.sql（含 P0/P1 修正） | ✅ 完成 |
| 1.3 | rls_policies.sql | ✅ 完成 |
| 1.4a | get_order_summary.sql | ✅ 完成 |
| 1.4b | get_profit_audit.sql | ✅ 完成 |
| 1.4c | get_recent_orders.sql | ✅ 完成 |
| 1.4d | get_products_by_category.sql | ✅ 完成 |
| 1.5 | .env.supabase.example | ✅ 完成 |
| 1.6 | ANTI_IDLE_SETUP.md | ✅ 完成 |
| 1.7 | 本完成記錄 | ✅ 完成 |

---

## database-reviewer P0/P1 修正清單

| 優先級 | 問題 | 修正方式 | 已套用 |
|-------|------|---------|-------|
| P0 | order_items FK 用 UUID，n8n 寫 VARCHAR | 改用 `order_fhs_id VARCHAR(20)` FK | ✅ |
| P0 | final_sale_price 允許 NULL | `NOT NULL DEFAULT 0` + 程式碼注釋 | ✅ |
| P1 | process_status 無強制約束 | 改為 `order_status` / `item_status` ENUM | ✅ |
| P1 | 缺少 customer_name 索引 | `idx_orders_customer_name (text_pattern_ops)` | ✅ |
| P2 | cost_configurations 缺 ON DELETE SET NULL | `products.cost_config_id REFERENCES ... ON DELETE SET NULL` | ✅ |
| P2 | sales_pipeline 無 Upsert key | 新增 `pipeline_key VARCHAR UNIQUE` | ✅ |
| P3 | batch_number 在 order_items 冗餘 | 文件化為刻意 denormalization（有注釋） | ✅ |
| P3 | item_id GENERATED ALWAYS 矛盾 | DDL 不使用 GENERATED，注釋說明 | ✅ |

---

## AGENTS.md 硬規則合規確認

| 規則 | 合規狀態 |
|------|---------|
| raw_form_state JSONB NOT NULL | ✅ 已在 orders 表定義，含注釋 |
| final_sale_price 不可重算 | ✅ NOT NULL，明確禁止 trigger 注釋 |
| net_profit / *_cost 由 n8n 寫 | ✅ 無 generated column，明確注釋 |
| sku UNIQUE | ✅ products.sku UNIQUE NOT NULL |
| 無財務 trigger | ✅ 遷移腳本底部有明確禁止聲明 |

---

## 新增文件清單

| 文件 | 路徑 |
|------|------|
| Supabase 操作指南 | `supabase/README.md` |
| 初始 Schema Migration | `supabase/migrations/0001_initial_schema.sql` |
| RLS 政策 | `supabase/rls/rls_policies.sql` |
| RPC: 訂單摘要 | `supabase/rpc/get_order_summary.sql` |
| RPC: 利潤稽核 | `supabase/rpc/get_profit_audit.sql` |
| RPC: 最近訂單 | `supabase/rpc/get_recent_orders.sql` |
| RPC: 產品目錄 | `supabase/rpc/get_products_by_category.sql` |
| 環境變數範本 | `.env.supabase.example` |
| Anti-Idle 指南 | `supabase/ANTI_IDLE_SETUP.md` |
| 本完成記錄 | `.fhs/reports/completion/2026-05-10_supabase-phase-1_completion_report.md` |

---

## Fat Mo 待辦（手動操作）

1. 前往 supabase.com 建立 Free Tier 專案
2. 複製 `.env.supabase.example` → 填入實際 API keys
3. 在 Supabase SQL Editor 依序執行 migration + RLS + RPC SQL
4. 啟用 pg_cron + 設定 30 天 TTL
5. 在 n8n 建立 Anti-Idle Ping workflow（參考 `supabase/ANTI_IDLE_SETUP.md`）
6. 完成後回報 Supabase URL，Claude 繼續 Phase 2（n8n 雙寫機制）

---

## 下一步：Phase 2（等待 Fat Mo 建好 Supabase 專案後執行）

Phase 2 任務（n8n 雙寫機制）：
- 新增 n8n Mirror Write nodes（並行分支，不刪現有 Airtable 節點）
- Feature Flag via n8n Static Data
- 歷史資料遷移腳本 `scripts/migrate_airtable_to_supabase.js`
- 四端稽核腳本 `scripts/sync_audit_quadruple.js`

如需繼續，請先完成上述手動操作，再輸入：`/execute Phase 2`
