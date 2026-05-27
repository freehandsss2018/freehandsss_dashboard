/**
 * sync_0600701.js — 利潤缺口修復腳本
 * 訂單 0600701: total_cost=NULL, net_profit=NULL (n8n 未計算)
 *
 * 執行前必須確認：
 *   1. Supabase order_items 的 product_sku 欄位已有值
 *   2. n8n 無進行中 execution（避免雙寫）
 *   3. .env 已設定 SUPABASE_URL, SUPABASE_SERVICE_KEY
 *
 * 用法：node scripts/repair/sync_0600701.js [--dry-run]
 */

const https = require('https');
require('dotenv').config();

const ORDER_ID = '0600701';
const WEBHOOK_URL = 'https://yanhei.synology.me:8443/webhook/1444800b-1397-4154-b2da-a4d328c6c51b';
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const DRY_RUN = process.argv.includes('--dry-run');

if (!SB_URL || !SB_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

function sbGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SB_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { resolve(data); } });
    });
    req.on('error', reject);
    req.end();
  });
}

function postWebhook(payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(WEBHOOK_URL);
    const body = JSON.stringify(payload);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log(`\n=== FHS Repair: sync_0600701 ===`);
  console.log(DRY_RUN ? '⚠️  DRY RUN mode — no webhook will be sent\n' : '🔥 LIVE mode — will POST to n8n webhook\n');

  // Step 1: 讀取訂單
  console.log('Step 1: Fetching order from Supabase...');
  const orders = await sbGet(`/rest/v1/orders?order_id=eq.${ORDER_ID}&select=*`);
  if (!orders || orders.length === 0) {
    console.error(`❌ Order ${ORDER_ID} not found in Supabase`);
    process.exit(1);
  }
  const order = orders[0];
  console.log(`  ✅ Found order: ${order.order_id} | customer: ${order.customer_name}`);
  console.log(`  total_cost: ${order.total_cost} | net_profit: ${order.net_profit} | final_sale_price: ${order.final_sale_price}`);

  if (order.total_cost !== null && order.net_profit !== null) {
    console.log('\n✅ total_cost and net_profit are already populated. No action needed.');
    console.log('   Run with --force to override.');
    if (!process.argv.includes('--force')) process.exit(0);
  }

  // Step 2: 讀取 order_items
  console.log('\nStep 2: Fetching order_items...');
  const items = await sbGet(`/rest/v1/order_items?order_fhs_id=eq.${ORDER_ID}&select=*`);
  if (!items || items.length === 0) {
    console.error(`❌ No order_items found for ${ORDER_ID}. Cannot compute cost without items.`);
    process.exit(1);
  }
  console.log(`  ✅ Found ${items.length} items:`);
  items.forEach(i => {
    console.log(`    - ${i.item_key} | product_sku: ${i.product_sku || 'NULL'} | qty: ${i.quantity}`);
  });

  const missingSkus = items.filter(i => !i.product_sku);
  if (missingSkus.length > 0) {
    console.warn(`\n⚠️  ${missingSkus.length} item(s) have NULL product_sku — n8n Smart Cache may return cost=0`);
    console.warn('   Proceed anyway? (use --force to skip this check)');
    if (!process.argv.includes('--force')) {
      console.error('❌ Aborting. Fix product_sku first or run with --force.');
      process.exit(1);
    }
  }

  // Step 3: 建構 payload
  console.log('\nStep 3: Building sync payload...');
  const orderItemsArray = items.map(i => ({
    Product_Name: i.product_name || '',
    Quantity: i.quantity || 1,
    Item_Key: i.item_key || '',
    Engraving: i.engraving_text || '',
    Process_Status: i.process_status || '',
    Batch_Number: i.batch_number || '',
    product_sku: i.product_sku || '',
  }));

  const payload = {
    Order_ID: ORDER_ID,
    Customer_Name: order.customer_name || '待定',
    Appointment_Date: order.appointment_date || null,
    Deposit: order.deposit || 0,
    Balance: order.balance || 0,
    Additional_Fee: order.additional_fee || 0,
    Adjustment_Amount: order.adjustment_amount || 0,
    System_Total_Cost: 0,
    System_Final_Sale_Price: order.final_sale_price || 0,
    System_Additional_Fee: order.additional_fee || 0,
    Full_Order_Text: order.full_order_text || '',
    Clean_Order_Text: order.clean_order_text || '',
    Raw_Form_State: order.raw_form_state || '{}',
    Update_Note: `[Repair] sync_0600701.js — re-triggering cost calculation for NULL total_cost`,
    Order_Items_List: orderItemsArray,
  };

  console.log(`  Payload Order_ID: ${payload.Order_ID}`);
  console.log(`  Items count: ${orderItemsArray.length}`);
  console.log(`  System_Final_Sale_Price: ${payload.System_Final_Sale_Price}`);

  // Step 4: POST to n8n
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN: Payload (not sent):');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n✅ Dry run complete. Re-run without --dry-run to send.');
    return;
  }

  console.log(`\nStep 4: POSTing to n8n webhook...`);
  const result = await postWebhook(payload);
  console.log(`  HTTP Status: ${result.status}`);
  if (result.status === 200) {
    console.log('  ✅ Webhook accepted. n8n is processing cost recalculation.');
    console.log('  → Wait 10–20s, then run finance-auditor to verify net_profit.');
    console.log(`  → Check Supabase: orders?order_id=eq.${ORDER_ID}&select=total_cost,net_profit`);
  } else {
    console.error(`  ❌ Webhook returned ${result.status}:`);
    console.error('  ', result.body);
  }
}

main().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
