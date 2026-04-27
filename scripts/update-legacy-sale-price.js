/**
 * update-legacy-sale-price.js
 * 非P系列訂單：Final_Sale_Price += 木框套裝(4肢) $2,380
 * 同步重算 Net_Profit = 新Final_Sale_Price - Total_Cost
 *
 * 執行：node scripts/update-legacy-sale-price.js --dry-run
 *       node scripts/update-legacy-sale-price.js
 */

require('dotenv').config();
const Airtable = require('airtable');

const DRY_RUN = process.argv.includes('--dry-run');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const MAIN_ORDERS = 'tbltCH0I9fknVCtmV';
const WOOD_FRAME_PRICE = 2380;

// 12 筆非P系列：加入木框售價
const NON_P_ORDERS = [
  { id: 'reclWhPrMGkde5jil', name: 'Jasmine' },
  { id: 'recxcSZK1f8ZCsJI1', name: 'Akira' },
  { id: 'reccKjrRXmqqwkgqr', name: 'Kathleen' },
  { id: 'recYqkFJlDsmcfrLW', name: 'Gaeac' },
  { id: 'recWvdmf2Zx7xDh4o', name: '森橋' },
  { id: 'rec0cp1ACBsACHIgp', name: 'Micaela' },
  { id: 'rec6nMChaw1fYRxDO', name: 'KateSo' },
  { id: 'recipL1tGVf1OgmDT', name: 'Bu' },
  { id: 'recjlxFydACSjxwvC', name: 'DebbieHo' },
  { id: 'rec33jdyU3MhUItTs', name: 'PrinceCheng' },
  { id: 'recBWcf9ktVTLuYFb', name: 'Angel' },
  { id: 'rec4uwMaeDeis5qUN', name: 'Wing430' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(`  FHS Sale Price Update (+木框 $${WOOD_FRAME_PRICE})`);
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log(`  Updating: ${NON_P_ORDERS.length} non-P orders`);
  console.log('═══════════════════════════════════════════\n');

  let success = 0, failed = 0;

  for (const order of NON_P_ORDERS) {
    try {
      const rec = await base(MAIN_ORDERS).find(order.id);
      const oldPrice  = rec.fields['Final_Sale_Price'] || 0;
      const totalCost = rec.fields['Total_Cost']       || 0;
      const newPrice  = oldPrice + WOOD_FRAME_PRICE;
      const newProfit = newPrice - totalCost;

      console.log(`▶ ${order.name}`);
      console.log(`   Final_Sale_Price : $${oldPrice} → $${newPrice}`);
      console.log(`   Total_Cost       : $${totalCost}`);
      console.log(`   Net_Profit       : $${newProfit}`);

      if (!DRY_RUN) {
        await sleep(220);
        await base(MAIN_ORDERS).update(order.id, {
          Final_Sale_Price: newPrice,
          Net_Profit:       newProfit,
        });
        console.log(`   ✓ Updated`);
      } else {
        console.log(`   ✓ [DRY] Would update`);
      }
      success++;
    } catch (err) {
      console.error(`   ✗ FAILED (${order.name}): ${err.message}`);
      failed++;
    }
    console.log('');
  }

  console.log('═══════════════════════════════════════════');
  console.log(`  ✅ 成功: ${success} / ${NON_P_ORDERS.length}`);
  console.log(`  ❌ 失敗: ${failed}`);
  console.log('═══════════════════════════════════════════');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
