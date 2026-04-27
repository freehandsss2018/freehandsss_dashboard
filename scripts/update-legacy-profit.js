/**
 * update-legacy-profit.js
 * 從 Order_Items 的 Subtotal Cost 加總，計算並回填
 * Main_Orders 的 Total_Cost 和 Net_Profit
 * 僅針對本次匯入的 17 筆舊訂單
 *
 * 執行：node scripts/update-legacy-profit.js --dry-run
 *       node scripts/update-legacy-profit.js
 */

require('dotenv').config();
const Airtable = require('airtable');

const DRY_RUN = process.argv.includes('--dry-run');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

const TABLES = {
  MAIN_ORDERS: 'tbltCH0I9fknVCtmV',
  ORDER_ITEMS:  'tbljkptnNcUEyDRFH',
};

// 17 筆本次匯入的 Main_Order record IDs
const LEGACY_RECORD_IDS = [
  'reclWhPrMGkde5jil', // Jasmine
  'recxcSZK1f8ZCsJI1', // Akira
  'recHQdhh5Tiudf4QQ', // WingLee
  'reccKjrRXmqqwkgqr', // Kathleen
  'recYqkFJlDsmcfrLW', // Gaeac
  'recV4EaIJbzLKD0Kl', // SalinaLai
  'recWvdmf2Zx7xDh4o', // 森橋
  'rec0cp1ACBsACHIgp', // Micaela
  'rec6nMChaw1fYRxDO', // KateSo
  'recipL1tGVf1OgmDT', // Bu
  'recSCEHI5RJMWaNHj', // Ivy
  'recVNYzDJ4I41TRBD', // KaLeiChan
  'recjlxFydACSjxwvC', // DebbieHo
  'rec33jdyU3MhUItTs', // PrinceCheng
  'recBWcf9ktVTLuYFb', // Angel
  'recBqF5dcCW9IAsfr', // Kathy
  'rec4uwMaeDeis5qUN', // Wing430
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchMainOrders() {
  const records = await base(TABLES.MAIN_ORDERS).find
    ? await Promise.all(LEGACY_RECORD_IDS.map(id => base(TABLES.MAIN_ORDERS).find(id)))
    : [];
  return records;
}

async function fetchOrderItems() {
  // 讀取所有 Order_Items，只取需要的欄位
  const allItems = [];
  await new Promise((resolve, reject) => {
    base(TABLES.ORDER_ITEMS).select({
      fields: ['Order_Link', 'Item_BaseCost', 'Quantity', 'Subtotal Cost'],
      pageSize: 100,
    }).eachPage(
      (records, fetchNextPage) => {
        allItems.push(...records);
        fetchNextPage();
      },
      (err) => { if (err) reject(err); else resolve(); }
    );
  });
  return allItems;
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`  FHS Legacy Profit Calculator`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '🚀 LIVE'}`);
  console.log('═══════════════════════════════════════════');
  console.log('');

  // 1. 讀取所有 Order_Items
  console.log('📦 Loading Order_Items...');
  const allItems = await fetchOrderItems();
  console.log(`   ✓ ${allItems.length} items loaded`);

  // 2. 建立 orderRecId → items 的 Map
  const itemsByOrder = {};
  for (const item of allItems) {
    const links = item.fields['Order_Link'];
    if (!links || links.length === 0) continue;
    const orderRecId = links[0]; // 每個 item 只連一個訂單
    if (!LEGACY_RECORD_IDS.includes(orderRecId)) continue; // 只處理本次匯入的
    if (!itemsByOrder[orderRecId]) itemsByOrder[orderRecId] = [];
    itemsByOrder[orderRecId].push(item);
  }

  // 3. 讀取 Main_Orders
  console.log('📋 Loading Main_Orders...');
  const mainOrders = await Promise.all(
    LEGACY_RECORD_IDS.map(id => base(TABLES.MAIN_ORDERS).find(id))
  );
  console.log(`   ✓ ${mainOrders.length} orders loaded`);
  console.log('');

  // 4. 計算並更新
  let successCount = 0;
  let failCount = 0;

  for (const order of mainOrders) {
    const customerName   = order.fields['Customer_Name'] || '(unknown)';
    const finalSalePrice = order.fields['Final_Sale_Price'] || 0;
    const items          = itemsByOrder[order.id] || [];

    // 加總 Subtotal Cost
    let totalCost = 0;
    for (const item of items) {
      const subtotal = item.fields['Subtotal Cost'];
      if (typeof subtotal === 'number') {
        totalCost += subtotal;
      } else {
        // fallback: Item_BaseCost * Quantity
        const baseCostArr = item.fields['Item_BaseCost'];
        const baseCost    = Array.isArray(baseCostArr) ? (baseCostArr[0] || 0) : 0;
        const qty         = item.fields['Quantity'] || 1;
        totalCost += baseCost * qty;
      }
    }

    const netProfit = finalSalePrice - totalCost;

    console.log(`▶ ${customerName}`);
    console.log(`   Final_Sale_Price : $${finalSalePrice}`);
    console.log(`   Total_Cost       : $${totalCost.toFixed(0)} (${items.length} items)`);
    console.log(`   Net_Profit       : $${netProfit.toFixed(0)}`);

    if (items.length === 0) {
      console.warn(`   ⚠️  No Order_Items found — skipping update`);
      continue;
    }

    try {
      if (!DRY_RUN) {
        await sleep(220);
        await base(TABLES.MAIN_ORDERS).update(order.id, {
          Total_Cost: Math.round(totalCost),
          Net_Profit: Math.round(netProfit),
        });
        console.log(`   ✓ Updated`);
      } else {
        console.log(`   ✓ [DRY] Would update Total_Cost=$${Math.round(totalCost)}, Net_Profit=$${Math.round(netProfit)}`);
      }
      successCount++;
    } catch (err) {
      console.error(`   ✗ FAILED: ${err.message}`);
      failCount++;
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log(`  結果摘要`);
  console.log(`  ✅ 成功更新: ${successCount}`);
  console.log(`  ❌ 失敗: ${failCount}`);
  console.log('═══════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
