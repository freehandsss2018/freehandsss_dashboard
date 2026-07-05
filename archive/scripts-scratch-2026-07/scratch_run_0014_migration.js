// Run Migration 0014 — register 羊毛氈公仔 - 加購 in products table
// Direct REST POST since pg connection is not available.
const https = require('https');
require('dotenv').config();
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;

function req(method, path, body) {
  return new Promise((res, rej) => {
    const u = new URL(SB + path);
    const data = body ? JSON.stringify(body) : null;
    const r = https.request({
      hostname: u.hostname,
      path: u.pathname + u.search,
      method,
      headers: {
        apikey: KEY,
        Authorization: 'Bearer ' + KEY,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      },
      rejectUnauthorized: false
    }, resp => {
      let d = '';
      resp.on('data', c => d += c);
      resp.on('end', () => res({ status: resp.statusCode, body: d }));
    });
    r.on('error', rej);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // 1. Pre-check: is it already present?
  const pre = await req('GET', '/rest/v1/products?sku=eq.' + encodeURIComponent('羊毛氈公仔 - 加購') + '&select=*');
  console.log('Pre-check status:', pre.status);
  console.log('Pre-check body:', pre.body);

  // 2. UPSERT
  const upsert = await req('POST', '/rest/v1/products?on_conflict=sku', {
    sku: '羊毛氈公仔 - 加購',
    main_category: '配件',
    target_object: '羊毛氈公仔',
    material: null,
    mode: '加購',
    item_per_set: 1,
    total_base_cost: 0,
    suggested_price: 680,
    markup_factor: null
  });
  console.log('UPSERT status:', upsert.status);
  console.log('UPSERT body:', upsert.body);

  // 3. Verify
  const post = await req('GET', '/rest/v1/products?sku=eq.' + encodeURIComponent('羊毛氈公仔 - 加購') + '&select=*');
  console.log('Verify status:', post.status);
  console.log('Verify body:', post.body);
})().catch(e => { console.error('ERR:', e); process.exit(1); });
