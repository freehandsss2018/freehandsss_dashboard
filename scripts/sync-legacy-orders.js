/**
 * sync-legacy-orders.js
 * 一次性匯入 Free_Handsss_2026 Excel 舊訂單到 Airtable
 * 用途：歷史資料補入（2026-01 ~ 2026-04）
 * 執行：node scripts/sync-legacy-orders.js --dry-run  （試跑）
 *       node scripts/sync-legacy-orders.js            （正式）
 */

require('dotenv').config();
const Airtable = require('airtable');

const DRY_RUN = process.argv.includes('--dry-run');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const TABLES = {
  MAIN_ORDERS:   'tbltCH0I9fknVCtmV',
  ORDER_ITEMS:   'tbljkptnNcUEyDRFH',
  PRODUCT_DB:    'tblC3HDJAz9W0OF6R',
};

// ─── 規則 ───────────────────────────────────────────────
// 非P系列：主商品 = 木框套裝 (4肢)（單購），Excel 商品 = 加購
// P系列：第一件 = 單購，其餘 = 加購，不加木框
// ────────────────────────────────────────────────────────

const LEGACY_ORDERS = [
  {
    customer_name: 'Jasmine',
    appointment_date: '2026-01-07',
    final_sale_price: 2000,
    batch_number: '第31批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',             engraving: 'Yuna' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)',       qty: 1, spec: '腳 / 已掉手',  engraving: 'Yuna' },
    ],
  },
  {
    customer_name: 'Akira',
    appointment_date: '2026-01-19',
    final_sale_price: 3340,
    batch_number: '第31批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',    engraving: 'LUCA' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)',       qty: 1, spec: '手',  engraving: 'LUCA' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)',       qty: 1, spec: '手',  engraving: 'LUCA' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)',       qty: 1, spec: '腳',  engraving: 'LUCA' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)',       qty: 1, spec: '腳',  engraving: 'LUCA' },
    ],
  },
  {
    customer_name: 'WingLee',
    appointment_date: '2026-01-20',
    final_sale_price: 2160,
    batch_number: '第33批',
    items: [
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (單購)',    qty: 1, spec: '右手', engraving: 'LY' },
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (加購)',    qty: 1, spec: '右腳', engraving: 'LY' },
    ],
  },
  {
    customer_name: 'Kathleen',
    appointment_date: '2026-01-24',
    final_sale_price: 3980,
    batch_number: '第31批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',              engraving: 'ALI' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購)',       qty: 1, spec: '手',            engraving: 'ALI' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購)',       qty: 1, spec: '腳',            engraving: 'ALI' },
      { sku: '嬰兒吊飾 - 925銀 - 1飾 (加購)',          qty: 1, spec: '腳 / 當爸父',   engraving: 'A'   },
    ],
  },
  {
    customer_name: 'Gaeac',
    appointment_date: '2026-01-27',
    final_sale_price: 2400,
    batch_number: '第33批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',   engraving: '' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購)',       qty: 1, spec: '手', engraving: '' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購)',       qty: 1, spec: '腳', engraving: '' },
    ],
  },
  {
    customer_name: 'SalinaLai',
    appointment_date: '2026-01-25',
    final_sale_price: 4940,
    batch_number: '第33批',
    items: [
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (單購)',    qty: 1, spec: '左手',       engraving: 'Lucia' },
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (加購)',    qty: 1, spec: '左腳',       engraving: 'Lucia' },
      { sku: '嬰兒(P)吊飾 - 925銀 - 1飾 (加購)',       qty: 1, spec: '腳 / 紅框',  engraving: 'Lucia' },
      { sku: '嬰兒(P)吊飾 - 925銀 - 1飾 (加購)',       qty: 1, spec: '腳 / 紅框',  engraving: 'L'    },
    ],
  },
  {
    customer_name: '森橋',
    appointment_date: '2026-01-29',
    final_sale_price: 2500,
    batch_number: '第33批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',           engraving: 'Lok' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 5飾 (加購)',       qty: 1, spec: '手 / 左腳',  engraving: 'Lok' },
    ],
  },
  {
    customer_name: 'Micaela',
    appointment_date: '2026-02-01',
    final_sale_price: 2000,
    batch_number: '第32批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',   engraving: 'E.P.' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)',       qty: 1, spec: '腳', engraving: 'E.P.' },
    ],
  },
  {
    customer_name: 'KateSo',
    appointment_date: '2026-02-05',
    final_sale_price: 3000,
    batch_number: '第33批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',            engraving: 'RAI' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 6飾 (加購)',       qty: 1, spec: '手 / 客客',   engraving: 'RAI' },
    ],
  },
  {
    customer_name: 'Bu',
    appointment_date: '2026-02-06',
    final_sale_price: 500,
    batch_number: '第32批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',           engraving: 'BU' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 1飾 (加購)',       qty: 1, spec: '手 / 客客',  engraving: 'BU' },
    ],
  },
  {
    customer_name: 'Ivy',
    appointment_date: '2026-02-14',
    final_sale_price: 2160,
    batch_number: '第33批',
    items: [
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (單購)',    qty: 1, spec: '左腳', engraving: 'C.W.'  },
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (加購)',    qty: 1, spec: '右腳', engraving: 'SHEK'  },
    ],
  },
  {
    customer_name: 'KaLeiChan',
    appointment_date: '2026-02-26',
    final_sale_price: 2160,
    batch_number: '第33批',
    items: [
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (單購)',    qty: 1, spec: '右手', engraving: 'CHIN' },
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 1飾 (加購)',    qty: 1, spec: '左腳', engraving: 'MeMe' },
    ],
  },
  {
    customer_name: 'DebbieHo',
    appointment_date: '2026-02-28',
    final_sale_price: 1989,
    batch_number: '第33批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',           engraving: '' },
      { sku: '嬰兒吊飾 - 925銀 - 1飾 (加購)',          qty: 1, spec: '手 / 當爸父', engraving: '' },
    ],
  },
  {
    customer_name: 'PrinceCheng',
    appointment_date: '2026-03-04',
    final_sale_price: 4000,
    batch_number: '第33批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',   engraving: 'YL' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)',       qty: 1, spec: '手', engraving: 'YL' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)',       qty: 1, spec: '腳', engraving: 'YL' },
    ],
  },
  {
    customer_name: 'Angel',
    appointment_date: '2026-03-05',
    final_sale_price: 2400,
    batch_number: '第33批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',   engraving: 'Sum' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購)',       qty: 1, spec: '手', engraving: 'Sum' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 2飾 (加購)',       qty: 1, spec: '腳', engraving: 'LSY' },
    ],
  },
  {
    customer_name: 'Kathy',
    appointment_date: '2026-04-07',
    final_sale_price: 3200,
    batch_number: '第33批',
    items: [
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 4飾 (單購)',    qty: 1, spec: '手', engraving: 'Yun' },
      { sku: '嬰兒(P)鎖匙扣 - 不銹鋼 - 2飾 (加購)',    qty: 1, spec: '腳', engraving: 'Yun' },
    ],
  },
  {
    customer_name: 'Wing430',
    appointment_date: '2026-04-10',
    final_sale_price: 2000,
    batch_number: '第34批',
    items: [
      { sku: '木框套裝 (4肢)',                         qty: 1, spec: '',          engraving: '' },
      { sku: '嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)',       qty: 1, spec: '手 / 左手', engraving: '' },
    ],
  },
];

// ─── Helper ──────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function loadProductCache() {
  console.log('📦 Loading Product_Database...');
  const cache = {};
  await new Promise((resolve, reject) => {
    base(TABLES.PRODUCT_DB).select({ fields: ['Product_Name'], pageSize: 100 })
      .eachPage(
        (records, fetchNextPage) => {
          for (const rec of records) {
            cache[rec.fields['Product_Name']] = rec.id;
          }
          fetchNextPage();
        },
        (err) => { if (err) reject(err); else resolve(); }
      );
  });
  console.log(`   ✓ Loaded ${Object.keys(cache).length} SKUs`);
  return cache;
}

async function createMainOrder(order) {
  const fields = {
    Customer_Name:     order.customer_name,
    Appointment_Date:  order.appointment_date,
    Final_Sale_Price:  order.final_sale_price,
    Deposit:           0,
    Balance:           0,
    Batch_Number:      order.batch_number,
  };
  if (DRY_RUN) return `DRY_RUN_${order.customer_name}`;
  await sleep(220);
  const rec = await base(TABLES.MAIN_ORDERS).create(fields);
  return rec.id;
}

async function createOrderItem(mainOrderRecId, item, productCache) {
  const productRecId = productCache[item.sku];
  if (!productRecId) {
    console.warn(`   ⚠️  SKU not found: "${item.sku}" — item skipped`);
    return null;
  }
  const fields = {
    Order_Link:      [mainOrderRecId],
    Product_Link:    [productRecId],
    Quantity:        item.qty,
    Specification:   item.spec   || undefined,
    Engraving_Text:  item.engraving || undefined,
  };
  // Remove undefined fields
  Object.keys(fields).forEach(k => fields[k] === undefined && delete fields[k]);

  if (DRY_RUN) return 'DRY_RUN_ITEM';
  await sleep(220);
  const rec = await base(TABLES.ORDER_ITEMS).create(fields);
  return rec.id;
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`  FHS Legacy Orders Sync`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🚀 LIVE'}`);
  console.log(`  Orders: ${LEGACY_ORDERS.length}`);
  console.log('═══════════════════════════════════════════');
  console.log('');

  const productCache = await loadProductCache();
  const results = { success: 0, failed: 0, itemsCreated: 0, skuMissing: [] };

  for (const order of LEGACY_ORDERS) {
    console.log(`\n▶ ${order.customer_name} (${order.appointment_date}) — $${order.final_sale_price}`);
    try {
      // 1. Create Main_Order
      const mainRecId = await createMainOrder(order);
      console.log(`   ✓ Main_Order ${DRY_RUN ? '[DRY]' : mainRecId}`);

      // 2. Create Order_Items
      for (const item of order.items) {
        const productRecId = productCache[item.sku];
        if (!productRecId) {
          console.warn(`   ⚠️  SKU not found: "${item.sku}"`);
          results.skuMissing.push({ order: order.customer_name, sku: item.sku });
          continue;
        }
        const itemRecId = await createOrderItem(mainRecId, item, productCache);
        console.log(`   ✓ Item: ${item.sku} x${item.qty} [${item.spec || '—'}]`);
        if (itemRecId) results.itemsCreated++;
      }
      results.success++;
    } catch (err) {
      console.error(`   ✗ FAILED: ${err.message}`);
      results.failed++;
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`  結果摘要`);
  console.log(`  ✅ 訂單成功: ${results.success} / ${LEGACY_ORDERS.length}`);
  console.log(`  📦 Order_Items 建立: ${results.itemsCreated}`);
  console.log(`  ❌ 訂單失敗: ${results.failed}`);
  if (results.skuMissing.length > 0) {
    console.log(`  ⚠️  SKU 找不到 (${results.skuMissing.length} 件):`);
    results.skuMissing.forEach(s => console.log(`     - [${s.order}] ${s.sku}`));
  }
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
