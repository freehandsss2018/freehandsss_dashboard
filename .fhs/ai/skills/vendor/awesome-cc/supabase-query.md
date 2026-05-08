---
name: supabase-query
source: https://github.com/jawwadfirdousi/agent-skills/tree/main/skills/supabase
vendor_date: 2026-05-09
description: Supabase CLI skill for SQL queries and schema management via Management API. Supports DDL, RLS, views, functions.
---

# Supabase Query Skill

## Overview

Enables interaction with Supabase projects through SQL queries and schema management via the Supabase Management API. Supports full DDL operations, RLS policy management, and storage bucket operations.

## Key Commands

```bash
# SQL Query
scripts/supabase.sh sql "SELECT * FROM orders LIMIT 5"

# With specific project/environment
scripts/supabase.sh sql --project fhs --env dev "SELECT COUNT(*) FROM orders"

# SQL File Execution
scripts/supabase.sh sql-file ./migrations/001_init.sql
```

## Configuration

Three approaches (in priority order):
1. **Auto-detect** — single `.env` file in `skills/supabase/env/`
2. **Named** — `--project <name> --env <name>` flags
3. **Direct** — `--env-file <path>` parameter

Required `.env` variables:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ACCESS_TOKEN=your-service-role-key
```

## Supported Operations

- **DDL**: schema changes, CREATE TABLE, ALTER TABLE
- **Views, Functions, Triggers**
- **Row Level Security (RLS)** — inspect and modify policies
- **Storage bucket** management
- **Introspection queries** for debugging structure and policies

## FHS Use Cases

| Use Case | Command |
|---------|---------|
| 遷移前 schema 檢查 | `sql "SELECT * FROM information_schema.tables"` |
| 驗證 n8n 寫入 | `sql "SELECT * FROM orders ORDER BY created_at DESC LIMIT 10"` |
| RLS 政策審查 | `sql "SELECT * FROM pg_policies"` |

> ⚠️ **Warning**: `sql` and `sql-file` commands run with Management API privileges — admin access. Do NOT use for reads that read-only-postgres can handle.

> ⚠️ **FHS Note**: `SUPABASE_ACCESS_TOKEN` must be in `.env`, never committed to git.
