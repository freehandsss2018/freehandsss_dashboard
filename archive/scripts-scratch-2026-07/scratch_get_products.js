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
    const res = await client.query("SELECT sku FROM products WHERE sku LIKE '%鎖匙扣%' AND sku NOT LIKE '%(P)%' LIMIT 20;");
    console.log(res.rows.map(r => r.sku));
  } finally {
    await client.end();
  }
}

main().catch(console.error);
