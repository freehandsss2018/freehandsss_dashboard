#!/usr/bin/env node
// Supabase Migration Runner — executes all SQL files against cloud DB
// Run: node scripts/run_supabase_migration.js

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PASSWORD = 'Godlove@10513';
const CONNECTION_STRING = `postgresql://postgres.vpmwizzixnwilmzctdvu:${encodeURIComponent(DB_PASSWORD)}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`;

const SQL_FILES = [
  'supabase/migrations/0001_initial_schema.sql',
  'supabase/rls/rls_policies.sql',
  'supabase/rpc/get_order_summary.sql',
  'supabase/rpc/get_profit_audit.sql',
  'supabase/rpc/get_recent_orders.sql',
  'supabase/rpc/get_products_by_category.sql',
];

async function runMigration() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected.\n');

    for (const file of SQL_FILES) {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.error(`[SKIP] File not found: ${file}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`[RUN] ${file}`);
      try {
        await client.query(sql);
        console.log(`[OK]  ${file}\n`);
      } catch (err) {
        console.error(`[ERR] ${file}: ${err.message}\n`);
        // Continue with remaining files — some errors may be "already exists"
        if (!err.message.includes('already exists') && !err.message.includes('duplicate')) {
          throw err;
        }
        console.log(`      (already exists — skipping)\n`);
      }
    }

    console.log('Migration complete.');
  } finally {
    await client.end();
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
