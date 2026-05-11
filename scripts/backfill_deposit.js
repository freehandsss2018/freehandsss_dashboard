/**
 * Backfill Supabase orders.deposit + orders.balance from raw_form_state
 * Runs once. Safe to re-run (only patches rows where deposit=0 but raw_form_state has values).
 */
const https = require('https');
const SB_URL  = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SB_SVC  = process.env.SUPABASE_SERVICE_KEY;
const SB_ANON = process.env.SUPABASE_ANON_KEY;

function sbGet(path, key) {
  return new Promise((resolve, reject) => {
    const url = new URL(SB_URL + path);
    const req = https.request({ hostname: url.hostname, path: url.pathname + url.search, method: 'GET',
      headers: { apikey: key, Authorization: 'Bearer ' + key }
    }, res => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>resolve(JSON.parse(d))); });
    req.on('error', reject); req.end();
  });
}

function sbPatch(path, key, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SB_URL + path);
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search, method: 'PATCH',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }
    }, res => { let d=''; res.on('data', c=>d+=c); res.on('end', ()=>resolve({ status: res.statusCode, body: d })); });
    req.on('error', reject); req.write(payload); req.end();
  });
}

async function main() {
  console.log('Fetching all orders from Supabase...');
  const orders = await sbGet('/rest/v1/orders?select=order_id,deposit,balance,raw_form_state&deleted_at=is.null&limit=200', SB_ANON);
  console.log(`Total orders: ${orders.length}`);

  let patched = 0;
  let skipped = 0;

  for (const o of orders) {
    const fs = o.raw_form_state || {};
    const fsDeposit = fs.deposit !== undefined ? Number(fs.deposit) || 0 : null;
    const fsBalance = fs.balance !== undefined ? Number(fs.balance) || 0 : null;

    if (fsDeposit === null && fsBalance === null) { skipped++; continue; } // no data in raw_form_state
    if (o.deposit === fsDeposit && o.balance === fsBalance) { skipped++; continue; } // already correct

    const patch = {};
    if (fsDeposit !== null && o.deposit !== fsDeposit) patch.deposit = fsDeposit;
    if (fsBalance !== null && o.balance !== fsBalance) patch.balance = fsBalance;
    if (Object.keys(patch).length === 0) { skipped++; continue; }

    const res = await sbPatch(`/rest/v1/orders?order_id=eq.${encodeURIComponent(o.order_id)}`, SB_SVC, patch);
    if (res.status === 204) {
      console.log(`PATCHED ${o.order_id}: deposit ${o.deposit}→${patch.deposit ?? o.deposit} balance ${o.balance}→${patch.balance ?? o.balance}`);
      patched++;
    } else {
      console.log(`FAIL ${o.order_id}: ${res.status} ${res.body}`);
    }
  }

  console.log(`\nDone. Patched: ${patched}, Skipped: ${skipped}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
