const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_PASSWORD = 'Godlove@10513';
const CONNECTION_STRING = `postgresql://postgres.vpmwizzixnwilmzctdvu:${encodeURIComponent(DB_PASSWORD)}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`;

async function main() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected.\n');

    const filePath = path.join(__dirname, '../supabase/migrations/0013_sync_order_rpc_orphan_cleanup.sql');
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log('Running migration: 0013_sync_order_rpc_orphan_cleanup.sql...');
    await client.query(sql);
    console.log('Migration successfully completed!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
