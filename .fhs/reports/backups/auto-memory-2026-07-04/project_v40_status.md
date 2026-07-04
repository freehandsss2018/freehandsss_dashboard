---
name: FHS Project Status
description: Current system state — Supabase-First architecture, V41 production, n8n V47.4 Supabase-First migration
type: project
originSessionId: 9b607bd7-59f1-4799-95df-9b6be7a7c607
---
## Current Status (2026-05-15)

**Active Production Version**: `Freehandsss_dashboard_current.html` (= V41, copied 2026-05-15)
**Dev version**: `freehandsss_dashboardV41.html` (released)
**Next Dev**: `freehandsss_dashboardV42.html` (planned, not started)
**AGENTS.md**: v1.4.6

## Architecture: Supabase-First

**Data Source**: Supabase (Primary SSOT) + Airtable (async backup only)

- All 2026 orders already migrated to Supabase
- Dashboard ↔ Supabase sync mostly complete
- n8n workflow V47.4: Smart Cache Strategist fetches costs from Supabase RPC directly

## Active n8n Workflows

- **Main Order Processor**: Workflow ID `6Ljih0hSKr9RpYNm`, n8n version V47.4
- **Financial Overview**: Workflow ID `uQKtGDupMBnSygr3`
- **Airtable Base**: `app9GuLsW9frN4xaT`
- **Supabase Project**: `vpmwizzixnwilmzctdvu.supabase.co`

## Key n8n V47.4 Changes (2026-05-15)

- `Smart Cache Strategist`: Calls `get_base_cost_by_skus` Supabase RPC via fetch()
- `Local Data Mapper`: Reads from `supabaseCosts` map (Supabase-First), fallback to Airtable node
- `Batch SKU Collector`: Now outputs `sku_list: skus` for Smart Cache Strategist
- **Prerequisite**: 0003_base_cost_view_and_rpc.sql must be applied in Supabase SQL Editor (manual by Fat Mo)

## Pending — Fat Mo Manual Actions

1. Apply `supabase/migrations/0003_base_cost_view_and_rpc.sql` in Supabase SQL Editor
2. Confirm products table has 488 SKUs with total_base_cost (run migrate_airtable_to_supabase.js if not)
3. Send test order to verify Telegram receives correct cost amounts
4. Update Telegram node text "Upsert 至 Airtable！" → "寫入 Supabase" (UI only, Claude cannot change)

## Pending — Claude Tasks (authorized separately)

- Anti-Idle Ping: Schedule Trigger every 6 days → Supabase (prevent Free Tier sleep)
- pg_cron TTL: error_logs 30-day auto-cleanup
- Mirror to Supabase: Add handmodel_cost/keychain_cost/necklace_cost fields
- test008–010 CRUD end-to-end tests

## What Changed Since 2026-04-25

- V41 promoted to production current.html (2026-05-15)
- n8n upgraded to V47.4 Supabase-First
- Supabase migration script fully fixed (parseMoney, parseDate, Base_Costs, mapProduct rewrite)
- 0003 SQL migration: v_products_with_costs VIEW + get_base_cost_by_skus RPC
- Airtable API quota exhausted (PUBLIC_API_BILLING_LIMIT_EXCEEDED) — accelerates Supabase-First priority

**Last Updated**: 2026-05-15
