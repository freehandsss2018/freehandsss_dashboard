#!/usr/bin/env node
// FHS Phase 2: Historical Airtable → Supabase Migration
// Migrates Main_Orders + Order_Items + Product_Database from Airtable to Supabase.
// Safe to run multiple times (upsert on unique keys).
// Run: node scripts/migrate_airtable_to_supabase.js

require('dotenv').config();
const https = require('https');

const AIRTABLE_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE = process.env.AIRTABLE_BASE_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!AIRTABLE_KEY || !AIRTABLE_BASE || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars. Check .env');
  process.exit(1);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function airtableFetch(table, offset) {
  const params = new URLSearchParams({ pageSize: '100' });
  if (offset) params.set('offset', offset);
  const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}?${params}`);
  const { status, body } = await httpsRequest({
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${AIRTABLE_KEY}` }
  });
  if (status !== 200) throw new Error(`Airtable ${table} fetch failed: ${status} ${JSON.stringify(body)}`);
  return body;
}

async function airtableAll(table) {
  const records = [];
  let offset;
  do {
    const page = await airtableFetch(table, offset);
    records.push(...(page.records || []));
    offset = page.offset;
  } while (offset);
  return records;
}

const CONFLICT_COLS = {
  orders: 'order_id',
  order_items: 'item_key',
  products: 'sku',
};

async function supabaseUpsert(table, rows) {
  if (rows.length === 0) return;
  const conflict = CONFLICT_COLS[table] || 'id';
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`);
  const { status, body } = await httpsRequest({
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal'
    }
  }, rows);
  if (status >= 300) throw new Error(`Supabase ${table} upsert failed: ${status} ${JSON.stringify(body)}`);
}

// ── Batch upsert helper (100 rows at a time) ─────────────────────────────────

async function batchUpsert(table, rows, batchSize = 50) {
  const conflictCol = CONFLICT_COLS[table] || 'id';
  // Deduplicate: keep last occurrence of each conflict key within the full set
  const seen = new Map();
  for (const row of rows) seen.set(row[conflictCol], row);
  const deduped = [...seen.values()];

  let done = 0;
  for (let i = 0; i < deduped.length; i += batchSize) {
    await supabaseUpsert(table, deduped.slice(i, i + batchSize));
    done += Math.min(batchSize, deduped.length - i);
    process.stdout.write(`\r  ${table}: ${done}/${deduped.length}`);
  }
  console.log();
}

// ── Field mappers ─────────────────────────────────────────────────────────────

function mapOrder(rec) {
  const f = rec.fields;
  let rawFormState = {};
  try {
    rawFormState = f.Raw_Form_State
      ? JSON.parse(f.Raw_Form_State)
      : {};
  } catch(e) {
    rawFormState = { raw: f.Raw_Form_State || '' };
  }

  return {
    order_id: f.Order_ID || rec.id,
    customer_name: f.Customer_Name || null,
    appointment_at: f.Appointment_Date || null,       // Supabase column: appointment_at
    confirmed_at: f.Order_Confirm_Date || null,       // Supabase column: confirmed_at
    process_status: mapOrderStatus(f.Process_Status),
    final_sale_price: Number(f.Final_Sale_Price) || 0,
    total_cost: Number(f.Total_Cost) || null,
    net_profit: Number(f.Net_Profit) || null,
    raw_form_state: rawFormState,
    full_order_text: f.Full_Order_Text || null,
    batch_number: f.Batch_Number || null,
    admin_notes: f.Admin_Notes || null,
  };
}

function mapOrderStatus(status) {
  const MAP = {
    '待確認': '待確認', '製作中': '製作中', '完成': '完成',
    '已取件': '已取件', '已取消': '已取消'
  };
  return MAP[status] || '待確認';
}

function mapOrderItem(rec, orderIdMap) {
  const f = rec.fields;
  // Airtable field: Order_Link (array of record IDs)
  const orderRecordId = (f.Order_Link || [])[0];
  const orderFhsId = orderIdMap[orderRecordId] || null;
  // Item_BaseCost is a rollup array in Airtable
  const baseCost = Array.isArray(f.Item_BaseCost) ? f.Item_BaseCost[0] : f.Item_BaseCost;
  // Item_Category is an array
  const category = Array.isArray(f.Item_Category) ? f.Item_Category[0] : (f.Item_Category || null);
  // Item_ID is the human-readable key (e.g. FHS-00123_K_LH); used by getProductDimensions
  const itemKey = f.Item_ID || rec.id;

  return {
    order_fhs_id: orderFhsId,
    item_key: itemKey,
    product_sku: null,                           // Item_ID ≠ SKU format; skip FK to avoid constraint
    quantity: Number(f.Quantity) || 1,
    item_base_cost: Number(baseCost) || 0,
    item_category: category,
    handmodel_cost: f.Handmodel_Cost != null ? Number(f.Handmodel_Cost) : null,
    keychain_cost: f.Keychain_Cost != null ? Number(f.Keychain_Cost) : null,
    necklace_cost: f.Necklace_Cost != null ? Number(f.Necklace_Cost) : null,
    specification: f.Specification || null,
    engraving_text: f.Engraving_Text || null,
    process_status: mapItemStatus(f.Process_Status || '待製作'),
    batch_number: null,
  };
}

function mapItemStatus(status) {
  const MAP = {
    '待製作': '待製作', '製作中': '製作中', '完成': '完成', '已取件': '已取件'
  };
  return MAP[status] || '待製作';
}

function mapProduct(rec) {
  const f = rec.fields;
  return {
    sku: f.SKU || f.Product_Name || rec.id,
    main_category: f.Category || f.Type || null, // Supabase column: main_category
    total_base_cost: Number(f.Base_Cost || f.Total_Base_Cost) || null,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FHS Airtable → Supabase Historical Migration ===\n');

  // 1. Migrate Main_Orders
  console.log('[1/3] Fetching Main_Orders from Airtable...');
  const orderRecs = await airtableAll('Main_Orders');
  console.log(`  Found ${orderRecs.length} orders`);

  // Build Airtable record ID → order_id map (for order_items FK)
  const orderIdMap = {};
  const orderRows = orderRecs
    .filter(r => r.fields.Order_ID)
    .map(r => {
      orderIdMap[r.id] = r.fields.Order_ID;
      return mapOrder(r);
    });

  console.log(`  Upserting ${orderRows.length} orders to Supabase...`);
  await batchUpsert('orders', orderRows);
  console.log('  [OK] Orders migrated\n');

  // 2. Migrate Order_Items
  console.log('[2/3] Fetching Order_Items from Airtable...');
  const itemRecs = await airtableAll('Order_Items');
  console.log(`  Found ${itemRecs.length} items`);

  const itemRows = itemRecs
    .filter(r => (r.fields.Order_Link || []).length > 0)
    .map(r => mapOrderItem(r, orderIdMap))
    .filter(r => r.order_fhs_id); // skip orphaned items

  console.log(`  Upserting ${itemRows.length} items to Supabase...`);
  await batchUpsert('order_items', itemRows);
  console.log('  [OK] Items migrated\n');

  // 3. Migrate Product_Database
  console.log('[3/3] Fetching Product_Database from Airtable...');
  const productRecs = await airtableAll('Product_Database');
  console.log(`  Found ${productRecs.length} products`);

  const productRows = productRecs
    .filter(r => r.fields.SKU || r.fields.Product_Name)
    .map(r => mapProduct(r));

  console.log(`  Upserting ${productRows.length} products to Supabase...`);
  await batchUpsert('products', productRows);
  console.log('  [OK] Products migrated\n');

  console.log('=== Migration complete ===');
  console.log(`  Orders:   ${orderRows.length}`);
  console.log(`  Items:    ${itemRows.length}`);
  console.log(`  Products: ${productRows.length}`);
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
