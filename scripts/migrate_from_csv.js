#!/usr/bin/env node
// FHS Plan 0004: Airtable CSV → Supabase Migration
// Reads from airtable-database/*.csv (exported when API rate-limited)
// Safe to run multiple times (upsert on unique keys).
// Run: node scripts/migrate_from_csv.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const CSV_DIR = path.join(__dirname, '..', 'airtable-database');

// ── CSV Parser (handles quoted fields with embedded commas AND newlines) ───────

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, ''); // strip BOM
  const records = splitCSVRecords(raw);
  if (records.length === 0) return [];
  const headers = records[0];
  const rows = [];
  for (let i = 1; i < records.length; i++) {
    const values = records[i];
    if (values.every(v => !v.trim())) continue; // skip blank rows
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = values[idx] ?? ''; });
    rows.push(obj);
  }
  return rows;
}

// Parses entire CSV content into array-of-arrays, handling multiline quoted fields
function splitCSVRecords(text) {
  const records = [];
  let cur = [];
  let field = '';
  let inQuote = false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (inQuote) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; } // escaped ""
        inQuote = false; i++; continue;
      }
      field += ch; i++;
    } else {
      if (ch === '"') { inQuote = true; i++; continue; }
      if (ch === ',') { cur.push(field); field = ''; i++; continue; }
      if (ch === '\r' && text[i + 1] === '\n') { cur.push(field); field = ''; records.push(cur); cur = []; i += 2; continue; }
      if (ch === '\n') { cur.push(field); field = ''; records.push(cur); cur = []; i++; continue; }
      field += ch; i++;
    }
  }
  if (field || cur.length) { cur.push(field); records.push(cur); }
  return records;
}

// ── Field helpers (same as original script) ───────────────────────────────────

function parseMoney(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/[$,]/g, ''));
  return isNaN(n) ? null : n;
}

function parseDate(val) {
  if (!val) return null;
  const zh = String(val).match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (zh) return `${zh[1]}-${zh[2].padStart(2,'0')}-${zh[3].padStart(2,'0')}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) return val;
  return null;
}

function mapOrderStatus(s) {
  const MAP = { '待確認':'待確認','製作中':'製作中','完成':'完成','已取件':'已取件','已取消':'已取消' };
  return MAP[s] || '待確認';
}

function mapItemStatus(s) {
  const MAP = { '待製作':'待製作','製作中':'製作中','完成':'完成','已取件':'已取件' };
  return MAP[s] || '待製作';
}

// ── Supabase HTTP helpers ─────────────────────────────────────────────────────

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

async function supabaseUpsert(table, rows, conflictCol) {
  if (rows.length === 0) return;
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictCol}`);
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

async function batchUpsert(table, rows, conflictCol, batchSize = 50) {
  const seen = new Map();
  for (const row of rows) seen.set(row[conflictCol], row);
  const deduped = [...seen.values()];
  let done = 0;
  for (let i = 0; i < deduped.length; i += batchSize) {
    await supabaseUpsert(table, deduped.slice(i, i + batchSize), conflictCol);
    done += Math.min(batchSize, deduped.length - i);
    process.stdout.write(`\r  ${table}: ${done}/${deduped.length}`);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== FHS CSV → Supabase Migration (Plan 0004) ===\n');

  // [0/4] Base_Costs → cost_configurations
  console.log('[0/4] Reading Base_Costs CSV...');
  const baseCostsRows = parseCSV(path.join(CSV_DIR, 'Base_Costs-Grid view.csv'));
  console.log(`  Found ${baseCostsRows.length} cost configs`);

  const costRows = baseCostsRows
    .filter(r => r['🔗 Linked_Base_Cost'])
    .map(r => ({
      config_name:   r['🔗 Linked_Base_Cost'].trim(),
      drawing_cost:  parseMoney(r['🔍 Drawing_Cost']),
      printing_cost: parseMoney(r['🔍 Printing_Cost']),
      clasp_cost:    parseMoney(r['🔍 Clasp_Cost']),
      shipping_cost: parseMoney(r['🔍 Shipping_Cost']),
    }));

  await batchUpsert('cost_configurations', costRows, 'config_name');

  // Fetch back UUIDs for FK resolution
  const configNameMap = {};
  {
    const url = new URL(`${SUPABASE_URL}/rest/v1/cost_configurations?select=id,config_name`);
    const { body: configs } = await httpsRequest({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (Array.isArray(configs)) configs.forEach(c => { configNameMap[c.config_name] = c.id; });
  }
  console.log(`  [OK] ${costRows.length} cost configs upserted, ${Object.keys(configNameMap).length} UUIDs loaded\n`);

  // [1/4] Main_Orders → orders
  console.log('[1/4] Reading Main_Orders CSV...');
  const orderCSV = parseCSV(path.join(CSV_DIR, 'Main_Orders-Grid view.csv'));
  console.log(`  Found ${orderCSV.length} orders`);

  const orderRows = orderCSV
    .filter(r => r.Order_ID)
    .map(r => {
      let rawFormState = {};
      try { rawFormState = r.Raw_Form_State ? JSON.parse(r.Raw_Form_State) : {}; }
      catch(e) { rawFormState = { raw: r.Raw_Form_State || '' }; }
      return {
        order_id:        r.Order_ID.trim(),
        customer_name:   r.Customer_Name || null,
        appointment_at:  parseDate(r.Appointment_Date),
        confirmed_at:    parseDate(r.Order_Confirm_Date),
        process_status:  mapOrderStatus(r.Process_Status),
        final_sale_price: parseMoney(r.Final_Sale_Price) ?? 0,
        total_cost:      parseMoney(r.Total_Cost),
        net_profit:      parseMoney(r.Net_Profit),
        raw_form_state:  rawFormState,
        full_order_text: r.Full_Order_Text || null,
        batch_number:    r.Batch_Number || null,
        admin_notes:     r.Admin_Notes || null,
      };
    });

  await batchUpsert('orders', orderRows, 'order_id');
  console.log(`  [OK] ${orderRows.length} orders upserted\n`);

  // Build order_id set for orphan detection in order_items
  const validOrderIds = new Set(orderRows.map(r => r.order_id));

  // [1.5/4] Product_Database → SKU map (for order_items product_sku)
  console.log('[1.5/4] Reading Product_Database CSV for SKU map...');
  const productCSV = parseCSV(path.join(CSV_DIR, 'Product_Database-Grid view.csv'));
  // In CSV, Product_Link in order_items = Product_Name = SKU
  // Just need to know which SKUs exist
  const validSkus = new Set(productCSV.map(r => r.Product_Name).filter(Boolean));
  console.log(`  Built SKU set: ${validSkus.size} products\n`);

  // [2/4] Order_Items → order_items
  console.log('[2/4] Reading Order_Items CSV...');
  const itemCSV = parseCSV(path.join(CSV_DIR, 'Order_Items-Grid view.csv'));
  console.log(`  Found ${itemCSV.length} items`);

  const itemRows = itemCSV
    .filter(r => r.Order_Link && validOrderIds.has(r.Order_Link.trim()))
    .map(r => {
      const baseCost = parseMoney(r.Item_BaseCost) ?? 0;
      const qty      = Number(r.Quantity) || 1;
      const sku      = r.Product_Link?.trim() || null;
      return {
        order_fhs_id:      r.Order_Link.trim(),
        item_key:          r.Item_ID?.trim() || r.Order_Item_Key?.trim() || r.Order_Item_ID,
        product_sku:       (sku && validSkus.has(sku)) ? sku : null,
        quantity:          qty,
        item_base_cost:    baseCost,
        subtotal_cost:     baseCost * qty,
        item_category:     r.Item_Category || null,
        handmodel_cost:    parseMoney(r.Handmodel_Cost),
        keychain_cost:     parseMoney(r.Keychain_Cost),
        necklace_cost:     parseMoney(r.Necklace_Cost),
        specification:     r.Specification || null,
        engraving_text:    r.Engraving_Text || null,
        process_status:    mapItemStatus(r.Process_Status || '待製作'),
        reference_image_url: null, // CSV export has URLs not JSON arrays; skip for now
        ai_suggestion:     r.AI_Engraving_Suggestion || null,
      };
    })
    .filter(r => r.item_key); // must have a key

  const orphanCount = itemCSV.length - itemRows.length;
  if (orphanCount > 0) console.log(`  Skipped ${orphanCount} orphaned/invalid items`);

  await batchUpsert('order_items', itemRows, 'item_key');
  console.log(`  [OK] ${itemRows.length} items upserted\n`);

  // [3/4] Product_Database → products
  console.log('[3/4] Upserting Product_Database...');
  console.log(`  Found ${productCSV.length} products`);

  const productRows = productCSV
    .filter(r => r.Product_Name)
    .map(r => {
      const linkedName = r['🔗 Linked_Base_Cost']?.trim();
      const row = {
        sku:             r.Product_Name.trim(),
        main_category:   r.Main_Category || null,
        target_object:   r.Target_Object || null,
        material:        r.Material || null,
        mode:            r.Mode || null,
        item_per_set:    r.Item_Per_Set ? Number(r.Item_Per_Set) : 1,
        total_base_cost: parseMoney(r.Total_Base_Cost),
        suggested_price: parseMoney(r.Suggested_Price_Manual),
        markup_factor:   r.Markup_Factor ? Number(r.Markup_Factor) : null,
      };
      if (linkedName && configNameMap[linkedName]) {
        row.cost_config_id = configNameMap[linkedName];
      }
      return row;
    });

  await batchUpsert('products', productRows, 'sku');
  console.log(`  [OK] ${productRows.length} products upserted\n`);

  // Summary
  const linkedCount = productRows.filter(r => r.cost_config_id).length;
  console.log('=== Migration Complete ===');
  console.log(`  Cost configs:      ${costRows.length}`);
  console.log(`  Orders:            ${orderRows.length}`);
  console.log(`  Items:             ${itemRows.length}`);
  console.log(`  Products:          ${productRows.length}`);
  console.log(`  Products w/ config_id: ${linkedCount} / ${productRows.length}`);
  if (linkedCount < productRows.length) {
    const unlinked = productRows.filter(r => !r.cost_config_id).map(r => r.sku).slice(0, 5);
    console.log(`  Sample unlinked: ${unlinked.join(', ')}...`);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err.message);
  process.exit(1);
});
