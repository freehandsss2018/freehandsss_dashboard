---
name: read-only-postgres
source: https://github.com/jawwadfirdousi/agent-skills/tree/main/skills/read-only-postgres
vendor_date: 2026-05-09
description: Safe read-only SQL queries against PostgreSQL/Supabase. Strict write-block, 10K row limit, PII masking. Ideal for FHS Supabase migration validation.
---

# Read-Only PostgreSQL Query Skill

## Overview

Enables safe, read-only SQL queries against PostgreSQL databases (including Supabase). Designed for data validation, schema exploration, and migration prep without risk of data modification.

## Security Protections

- **Read-only session mode** — database connection set to read-only at connection level
- **Write operation blocking** — blocks INSERT, UPDATE, DELETE, DROP, CREATE, ALTER, TRUNCATE
- **Single-statement enforcement** — one query per call, no chained statements
- **30-second query timeout** — prevents runaway queries
- **10,000 row maximum** — prevents accidental full-table dumps
- **Column width cap** — 100 characters per column for readable output

## FHS Use Cases

| Use Case | How |
|---------|-----|
| **Supabase 遷移前數據驗證** | 驗證 schema、row counts、data integrity 在遷移前 |
| **Airtable vs Supabase 對帳** | 對比兩端數據，找出差異 |
| **財務數據審計** | 查詢財務記錄，不修改任何數據 |
| **n8n Debug** | 查詢 Supabase 驗證 workflow 寫入是否正確 |

## Setup Requirements

1. Install Python dependencies:
   ```bash
   pip install psycopg2-binary tabulate
   ```

2. Create `skills/read-only-postgres/connections.json` (set permissions to `600`):
   ```json
   {
     "databases": [
       {
         "name": "fhs-supabase-dev",
         "description": "FHS Supabase development database",
         "host": "your-project.supabase.co",
         "port": 5432,
         "database": "postgres",
         "user": "postgres",
         "password": "your-password"
       }
     ]
   }
   ```

3. Test connection:
   ```bash
   python skills/read-only-postgres/scripts/query.py "SELECT version()"
   ```

## Usage Pattern

```
1. List available databases
2. Explore schema: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
3. Check row counts: SELECT COUNT(*) FROM orders
4. Validate data: SELECT * FROM orders WHERE created_at > '2026-01-01' LIMIT 100
```

## PII Masking

Automatically masks sensitive columns — email `john@example.com` becomes `j************m`. Configure in `connections.json` under `pii_columns`.

## Source Scripts

Full Python implementation at: https://github.com/jawwadfirdousi/agent-skills/tree/main/skills/read-only-postgres/scripts

> ⚠️ **FHS Note**: This skill is for Supabase migration validation (P-HIGH handoff item #2). Connection credentials must be in `.env`, never committed. `.gitignore` must include `connections.json`.
