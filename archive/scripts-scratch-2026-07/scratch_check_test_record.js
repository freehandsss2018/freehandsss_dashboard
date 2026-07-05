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
    
    // Check orders table
    const orderRes = await client.query(`
      SELECT order_id, customer_name, final_sale_price, deposit, balance, deleted_at 
      FROM orders 
      WHERE order_id = 'test9999003';
    `);
    console.log("=== Test Order Record ===");
    console.log(orderRes.rows);

    // Check order_items table
    const itemsRes = await client.query(`
      SELECT order_fhs_id, item_key, product_sku, item_category, quantity, specification, process_status, batch_number 
      FROM order_items 
      WHERE order_fhs_id = 'test9999003';
    `);
    console.log("\n=== Test Order Items ===");
    console.log(itemsRes.rows);

  } finally {
    await client.end();
  }
}

main().catch(console.error);
