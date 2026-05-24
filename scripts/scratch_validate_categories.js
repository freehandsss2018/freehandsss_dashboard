// Gate 1.5 — getItemCategory truth table validation
// Must pass before deploying Calculate Profit V47.11 to n8n.
const https = require('https');
require('dotenv').config();
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function get(p) {
  return new Promise((res, rej) => {
    const u = new URL(SB + p);
    https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'GET',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      rejectUnauthorized: false
    }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej).end();
  });
}

function getItemCategory(sku) {
  if (!sku) return '其他';
  if (sku.includes('羊毛氈')) return '配件';
  if (sku.includes('木框') || sku.includes('玻璃瓶') || sku.includes('立體擺設')) return '立體擺設';
  if (sku.includes('鎖匙扣') || sku.includes('鎖匙') || sku.includes('鑰匙') || sku.includes('匙') || sku.includes('扣') || sku.includes('不銹鋼') || sku.includes('鋁合金')) return '金屬鎖匙扣';
  if (sku.includes('吊飾') || sku.includes('頸鏈') || sku.includes('純銀')) return '純銀頸鏈吊飾';
  return '其他';
}

(async () => {
  const r = await get('/rest/v1/products?select=sku,main_category&order=sku.asc');
  const rows = JSON.parse(r);
  if (!Array.isArray(rows)) { console.error('FAIL: API error', rows); process.exit(1); }

  const table = rows.map(p => ({ sku: p.sku, computed: getItemCategory(p.sku), db_cat: p.main_category }));

  const other   = table.filter(t => t.computed === '其他');
  const addon   = table.filter(t => t.computed === '配件');
  const collide = table.filter(t => {
    // 鎖匙扣 should not be 配件, 立體擺設 should not be 鎖匙扣, etc.
    if (t.db_cat === '立體擺設'    && t.computed !== '立體擺設')    return true;
    if (t.db_cat === '金屬鎖匙扣'  && t.computed !== '金屬鎖匙扣')  return true;
    if (t.db_cat === '純銀頸鏈吊飾' && t.computed !== '純銀頸鏈吊飾') return true;
    if (t.db_cat === '配件'        && t.computed !== '配件')        return true;
    return false;
  });

  console.log(`Total SKUs tested: ${rows.length}`);
  console.log(`\n--- 配件 (should be exactly 1) ---`);
  console.table(addon);
  console.log(`\n--- 其他 (should be 0) ---`);
  if (other.length === 0) { console.log('✅ Zero SKUs fell to 其他'); }
  else { console.table(other); }
  console.log(`\n--- Category collision (should be 0) ---`);
  if (collide.length === 0) { console.log('✅ Zero collisions'); }
  else { console.table(collide); }

  const pass = other.length === 0 && addon.length === 1 && collide.length === 0;
  console.log(`\n=== Gate 1.5: ${pass ? '✅ PASS' : '❌ FAIL'} ===`);
  if (!pass) process.exit(1);
})();
