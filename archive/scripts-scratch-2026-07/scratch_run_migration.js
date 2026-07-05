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
    console.log("Connected to Supabase Postgres.");

    console.log("Adding enum values to item_status...");
    const queries = [
      "ALTER TYPE item_status ADD VALUE IF NOT EXISTS '需進行補打';",
      "ALTER TYPE item_status ADD VALUE IF NOT EXISTS '已book日期';",
      "ALTER TYPE item_status ADD VALUE IF NOT EXISTS '已取模';",
      "ALTER TYPE item_status ADD VALUE IF NOT EXISTS '待交收';"
    ];

    for (const q of queries) {
      try {
        await client.query(q);
        console.log(`Success: ${q}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`Already exists: ${q}`);
        } else {
          console.error(`Error executing: ${q}`, err);
          throw err;
        }
      }
    }

    const res = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'item_status';
    `);
    console.log("New item_status enum values:", res.rows.map(r => r.enumlabel));

  } finally {
    await client.end();
  }
}

main().catch(console.error);
