const https = require('https');
require('dotenv').config();
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
function get(p){
  return new Promise((res,rej)=>{
    const u = new URL(SB + p);
    https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type':'application/json' },
      rejectUnauthorized: false
    }, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => res(d));
    }).on('error', rej).end();
  });
}
(async()=>{
  const r = await get('/rest/v1/products?select=*&order=sku.asc');
  console.log('Raw response:', r.slice(0, 500));
  const rows = JSON.parse(r);
  if (!Array.isArray(rows)) { console.log('Not array — got:', rows); return; }
  console.log('Total products:', rows.length);
  console.log('--- distinct main_category:');
  console.log([...new Set(rows.map(x=>x.main_category))]);
  console.log('--- sample 5:');
  console.log(rows.slice(0,5));
  console.log('--- existing 羊毛氈 matches:');
  console.log(rows.filter(x => (x.sku||'').includes('羊毛氈') || (x.product_name||'').includes('羊毛氈')));
  console.log('--- main_category=配件:');
  console.log(rows.filter(x => x.main_category === '配件'));
})();
