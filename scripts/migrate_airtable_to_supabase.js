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

// Fix P0-A: Airtable exports financial fields with "$" prefix (e.g. "$2160")
// Number("$2160") returns NaN → fallback to 0/null silently corrupts all historical data
function parseMoney(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

// Fix P1-A: Airtable exports dates in Chinese format "2026年1月20日"
// PostgreSQL DATE cannot parse this — converts to ISO "2026-01-20"
function parseDate(val) {
  if (!val) return null;
  const zh = String(val).match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (zh) return `${zh[1]}-${zh[2].padStart(2,'0')}-${zh[3].padStart(2,'0')}`;
  return val; // already "YYYY-MM-DD", pass through
}

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
    appointment_at: parseDate(f.Appointment_Date),   // Fix P1-A: Chinese date format
    confirmed_at: parseDate(f.Order_Confirm_Date),
    process_status: mapOrderStatus(f.Process_Status),
    final_sale_price: parseMoney(f.Final_Sale_Price) ?? 0, // Fix P0-A: strip "$" prefix
    total_cost: parseMoney(f.Total_Cost),
    net_profit: parseMoney(f.Net_Profit),
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

function mapOrderItem(rec, orderIdMap, orderBatchMap, productSkuMap) {
  const f = rec.fields;
  // Airtable field: Order_Link (array of record IDs)
  const orderRecordId = (f.Order_Link || [])[0];
  const orderFhsId = orderIdMap[orderRecordId] || null;
  // Item_BaseCost is a rollup array in Airtable
  const baseCost = Array.isArray(f.Item_BaseCost) ? f.Item_BaseCost[0] : f.Item_BaseCost;
  const baseCostNum = Number(baseCost) || 0;
  // Item_Category is an array
  const category = Array.isArray(f.Item_Category) ? f.Item_Category[0] : (f.Item_Category || null);
  // Item_ID is the human-readable key; Order_Item_Key may be empty for older records
  const itemKey = f.Item_ID || rec.id;
  const qty = Number(f.Quantity) || 1;
  // Resolve product_sku from Product_Link → productSkuMap (Step 1.5 pre-fetch)
  const productRecordId = Array.isArray(f.Product_Link) ? f.Product_Link[0] : (f.Product_Link || null);
  const productSku = (productSkuMap && productRecordId) ? (productSkuMap[productRecordId] || null) : null;

  // Fix P2-A: Reference_Image is an attachment array in Airtable API
  // CSV export uses URL strings; API response uses {url, filename} objects
  let refImages = null;
  if (Array.isArray(f.Reference_Image) && f.Reference_Image.length > 0) {
    refImages = f.Reference_Image.map(a => (typeof a === 'string' ? a : a.url));
  }

  return {
    order_fhs_id: orderFhsId,
    item_key: itemKey,
    product_sku: productSku,                     // Resolved from Product_Link → productSkuMap
    quantity: qty,
    item_base_cost: baseCostNum,
    subtotal_cost: baseCostNum * qty,            // Fix P2-C: compute subtotal (no Airtable field)
    item_category: category,
    handmodel_cost: f.Handmodel_Cost != null ? Number(f.Handmodel_Cost) : null,
    keychain_cost: f.Keychain_Cost != null ? Number(f.Keychain_Cost) : null,
    necklace_cost: f.Necklace_Cost != null ? Number(f.Necklace_Cost) : null,
    specification: f.Specification || null,
    engraving_text: f.Engraving_Text || null,
    process_status: mapItemStatus(f.Process_Status || '待製作'),
    reference_image_url: refImages,              // Fix P2-A: was never mapped
    ai_suggestion: f.AI_Engraving_Suggestion || null, // Fix P2-A: was never mapped
    batch_number: orderBatchMap[orderRecordId] || null, // Fix P2-B: inherit from parent order
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
    // P0-C note: sku must exactly match n8n Search_SKU output for get_base_cost_by_skus to work
    sku: f.Product_Name || f.SKU || rec.id,
    // Fix P1-C: Airtable field is "Main_Category", not "Category" or "Type"
    main_category: f.Main_Category || null,
    // Fix P1-D: previously missing fields
    target_object: f.Target_Object || null,
    material: f.Material || null,
    mode: f.Mode || null,
    item_per_set: f.Item_Per_Set ? Number(f.Item_Per_Set) : 1,
    // Fix P0-A: Total_Base_Cost may have "$" prefix if exported from certain views
    total_base_cost: parseMoney(f.Total_Base_Cost) ?? parseMoney(f.Base_Cost),
    suggested_price: parseMoney(f.Suggested_Price_Manual) ?? parseMoney(f.Suggested_Price),
    markup_factor: f.Markup_Factor ? Number(f.Markup_Factor) : null,
    // cost_config_id: not mapped — Linked_Base_Cost is a record link, requires 2-pass migration
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FHS Airtable → Supabase Historical Migration ===\n');

  // 0. Migrate Base_Costs → cost_configurations (Fix P1-B: was completely missing)
  // Must run before Product_Database so cost_config_id FK can be resolved
  console.log('[0/4] Fetching Base_Costs from Airtable...');
  const costRecs = await airtableAll('Base_Costs');
  console.log(`  Found ${costRecs.length} cost configs`);

  const costRows = costRecs
    .filter(r => r.fields['Linked_Base_Cost'] || r.fields['Config_Name'])
    .map(r => {
      const f = r.fields;
      return {
        // Airtable primary key field is the linked record label "Linked_Base_Cost"
        config_name: f['Linked_Base_Cost'] || f['Config_Name'] || r.id,
        drawing_cost: parseMoney(f.Drawing_Cost),
        printing_cost: parseMoney(f.Printing_Cost),
        clasp_cost: parseMoney(f.Clasp_Cost),
        shipping_cost: parseMoney(f.Shipping_Cost),
      };
    });

  // Build config_name → Supabase UUID map (for products.cost_config_id)
  const configNameMap = {};
  if (costRows.length > 0) {
    await batchUpsert('cost_configurations', costRows);
    // Fetch back to get UUIDs
    const { body: configs } = await httpsRequest({
      hostname: new URL(SUPABASE_URL).hostname,
      path: '/rest/v1/cost_configurations?select=id,config_name',
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      }
    });
    if (Array.isArray(configs)) {
      configs.forEach(c => { configNameMap[c.config_name] = c.id; });
    }
  }
  console.log('  [OK] Base_Costs migrated\n');

  // 1. Migrate Main_Orders
  console.log('[1/4] Fetching Main_Orders from Airtable...');
  const orderRecs = await airtableAll('Main_Orders');
  console.log(`  Found ${orderRecs.length} orders`);

  // Build Airtable record ID → order_id map (for order_items FK)
  // Build Airtable record ID → batch_number map (Fix P2-B: pass to order_items)
  const orderIdMap = {};
  const orderBatchMap = {};
  const orderRows = orderRecs
    .filter(r => r.fields.Order_ID)
    .map(r => {
      orderIdMap[r.id] = r.fields.Order_ID;
      orderBatchMap[r.id] = r.fields.Batch_Number || null;
      return mapOrder(r);
    });

  console.log(`  Upserting ${orderRows.length} orders to Supabase...`);
  await batchUpsert('orders', orderRows);
  console.log('  [OK] Orders migrated\n');

  // 1.5. Pre-fetch Product_Database to build SKU map (before Order_Items, for product_sku resolution)
  console.log('[1.5/4] Pre-fetching Product_Database for SKU map...');
  const productRecs = await airtableAll('Product_Database');
  const productSkuMap = {};
  productRecs.forEach(r => {
    if (r.fields.Product_Name || r.fields.SKU) {
      productSkuMap[r.id] = r.fields.Product_Name || r.fields.SKU;
    }
  });
  console.log(`  Built SKU map: ${Object.keys(productSkuMap).length} products`);

  // 2. Migrate Order_Items
  console.log('[2/4] Fetching Order_Items from Airtable...');
  const itemRecs = await airtableAll('Order_Items');
  console.log(`  Found ${itemRecs.length} items`);

  const itemRows = itemRecs
    .filter(r => (r.fields.Order_Link || []).length > 0)
    .map(r => mapOrderItem(r, orderIdMap, orderBatchMap, productSkuMap))
    .filter(r => r.order_fhs_id); // skip orphaned items

  console.log(`  Upserting ${itemRows.length} items to Supabase...`);
  await batchUpsert('order_items', itemRows);
  console.log('  [OK] Items migrated\n');

  // 3. Migrate Product_Database (upsert using already-fetched productRecs from Step 1.5)
  console.log('[3/4] Upserting Product_Database to Supabase...');
  console.log(`  Found ${productRecs.length} products`);

  const productRows = productRecs
    .filter(r => r.fields.Product_Name || r.fields.SKU)
    .map(r => {
      const row = mapProduct(r);
      // Resolve cost_config_id from Linked_Base_Cost label (Fix P2-D)
      const linkedName = Array.isArray(r.fields.Linked_Base_Cost)
        ? r.fields.Linked_Base_Cost[0]
        : r.fields.Linked_Base_Cost;
      if (linkedName && configNameMap[linkedName]) {
        row.cost_config_id = configNameMap[linkedName];
      }
      return row;
    });

  console.log(`  Upserting ${productRows.length} products to Supabase...`);
  await batchUpsert('products', productRows);
  console.log('  [OK] Products migrated\n');

  console.log('=== Migration complete ===');
  console.log(`  Cost configs: ${costRows.length}`);
  console.log(`  Orders:       ${orderRows.length}`);
  console.log(`  SKU map:      ${Object.keys(productSkuMap).length} entries`);
  console.log(`  Items:        ${itemRows.length}`);
  console.log(`  Products:     ${productRows.length}`);
  console.log('\n⚠️  Note: item_key format for historical records uses Airtable Item_ID format.');
  console.log('   n8n new orders use a different format — they will NOT conflict (different keys).');
  console.log("   Run: SELECT COUNT(*) FROM order_items WHERE item_key LIKE '%|%' to audit.");

}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
