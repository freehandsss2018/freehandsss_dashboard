const { Client } = require('pg');

const DB_PASSWORD = 'Godlove@10513';
const CONNECTION_STRING = `postgresql://postgres.vpmwizzixnwilmzctdvu:${encodeURIComponent(DB_PASSWORD)}@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`;

async function main() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'item_status';
    `);
    console.log("item_status enum values:", res.rows.map(r => r.enumlabel));
  } finally {
    await client.end();
  }
}

main().catch(console.error);
