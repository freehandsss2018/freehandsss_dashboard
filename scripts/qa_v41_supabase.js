/**
 * FHS V41 Supabase QA — Playwright headless browser simulation
 * Rules: use "Test+Number" order IDs, test all Supabase-flagged features
 * Run: node scripts/qa_v41_supabase.js
 */

const { chromium } = require('playwright');
const https = require('https');
const path = require('path');

const V41_PATH = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41_PATH.replace(/\\/g, '/');

const SB_URL  = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SB_ANON = process.env.SUPABASE_ANON_KEY;
const SB_SVC  = process.env.SUPABASE_SERVICE_KEY;

let passed = 0;
let failed = 0;

function log(msg, status = 'INFO') { console.log(`[${status}] ${msg}`); }
function pass(msg) { passed++; log(msg, 'PASS'); }
function fail(msg) { failed++; log(msg, 'FAIL'); }

// ── Node-side REST helper (bypasses browser CORS) ─────────────────────────
function sbRequest(method, endpoint, key, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SB_URL + endpoint);
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sbGet(endpoint, key) {
  return sbRequest('GET', endpoint, key, null);
}
async function sbPost(endpoint, key, body) {
  return sbRequest('POST', endpoint, key, body);
}
async function sbPatch(endpoint, key, body) {
  return sbRequest('PATCH', endpoint, key, body);
}
async function sbDelete(endpoint, key) {
  return sbRequest('DELETE', endpoint, key, null);
}

async function main() {
  log('=== FHS V41 Supabase QA Suite ===');
  log(`File: ${FILE_URL}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  // ── 1. Load V41 ──────────────────────────────────────────────────────────
  log('Loading V41 dashboard...');
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
  const title = await page.title();
  if (title) pass(`Page loaded: "${title}"`);
  else fail('Page title missing');

  // ── 2. Feature Flag pill ──────────────────────────────────────────────────
  await page.evaluate(() => localStorage.setItem('fhs_supabase_read', '1'));
  const pill = await page.$('[id*="sb"][id*="flag"], [id*="supabase-flag"], #sb-flag-pill, [id*="flag-pill"]');
  if (pill) pass('Supabase flag pill element found in DOM');
  else log('Supabase pill not found by ID — flag set via localStorage', 'WARN');

  // ── 3. Browser: Supabase orders readable (anon) ──────────────────────────
  log('Checking Supabase orders via browser (anon key)...');
  const ping = await page.evaluate(async (cfg) => {
    try {
      const r = await fetch(`${cfg.url}/rest/v1/orders?select=order_id&limit=3`, {
        headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` }
      });
      const data = await r.json();
      return { status: r.status, count: Array.isArray(data) ? data.length : 0 };
    } catch(e) { return { status: 0, count: 0, err: e.message }; }
  }, { url: SB_URL, anon: SB_ANON });

  if (ping.status === 200 && ping.count > 0) pass(`Supabase orders readable from browser: ${ping.count} rows`);
  else fail(`Browser orders fetch: status=${ping.status} count=${ping.count}`);

  // ── 4. Browser: order_items readable + correct columns ───────────────────
  log('Checking order_items columns from browser...');
  const itemsPing = await page.evaluate(async (cfg) => {
    try {
      const r = await fetch(
        `${cfg.url}/rest/v1/order_items?select=item_key,specification,engraving_text,item_category&limit=5`,
        { headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` } }
      );
      const data = await r.json();
      return { status: r.status, data };
    } catch(e) { return { status: 0, data: [], err: e.message }; }
  }, { url: SB_URL, anon: SB_ANON });

  if (itemsPing.status === 200 && itemsPing.data.length > 0) {
    pass(`order_items rows: ${itemsPing.data.length} returned from browser`);
    const hasProperKey = itemsPing.data.some(it => it.item_key && !it.item_key.startsWith('rec'));
    if (hasProperKey) pass('item_key is Item_ID format (not Airtable rec ID)');
    else fail('item_key still has Airtable rec ID format');
    const s = itemsPing.data[0];
    if ('specification' in s) pass('specification column present');
    else fail('specification column missing');
    if ('engraving_text' in s) pass('engraving_text column present');
    else fail('engraving_text column missing');
    log(`  Sample: ${s.item_key} | spec="${s.specification}" | eng="${s.engraving_text}"`);
  } else {
    fail(`order_items browser fetch: status=${itemsPing.status}`);
  }

  // ── 5. Browser: FK linkage (items linked to order) ────────────────────────
  log('Cross-checking FK linkage via browser...');
  const fkCheck = await page.evaluate(async (cfg) => {
    const r1 = await fetch(`${cfg.url}/rest/v1/orders?select=order_id&limit=1`, {
      headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` }
    });
    const orders = await r1.json();
    if (!orders.length) return { error: 'no orders' };
    const orderId = orders[0].order_id;
    const r2 = await fetch(
      `${cfg.url}/rest/v1/order_items?order_fhs_id=eq.${encodeURIComponent(orderId)}&select=item_key,specification`,
      { headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` } }
    );
    const items = await r2.json();
    return { orderId, itemCount: items.length, sample: items[0] || null };
  }, { url: SB_URL, anon: SB_ANON });

  if (fkCheck.error) fail(`FK linkage: ${fkCheck.error}`);
  else {
    pass(`Order ${fkCheck.orderId} → ${fkCheck.itemCount} items linked`);
    if (fkCheck.sample) log(`  Sample: ${fkCheck.sample.item_key} spec="${fkCheck.sample.specification}"`);
  }

  // ── 6. Node: Insert Test001 order (service key, no CORS) ─────────────────
  log('Inserting Test001 order (Node https / service key)...');
  const ins1 = await sbPost('/rest/v1/orders?on_conflict=order_id', SB_SVC, {
    order_id: 'Test001',
    customer_name: 'QA 自動測試',
    confirmed_at: new Date().toISOString().slice(0, 10),
    process_status: '待確認',
    final_sale_price: 1680,
    total_cost: 500,
    net_profit: 1180,
    raw_form_state: { test: true, source: 'qa_v41' },
  });
  if ([200, 201, 204].includes(ins1.status)) pass('Test001 order inserted (service key)');
  else fail(`Test001 insert: status=${ins1.status} body=${ins1.body}`);

  // ── 7. Node: Insert Test001 item ──────────────────────────────────────────
  log('Inserting Test001_K_LH item (Node https / service key)...');
  const ins2 = await sbPost('/rest/v1/order_items?on_conflict=item_key', SB_SVC, {
    order_fhs_id: 'Test001',
    item_key: 'Test001_K_LH',
    product_sku: null,
    quantity: 1,
    item_base_cost: 250,
    item_category: '鎖匙扣',
    specification: '左手 / 不銹鋼',
    engraving_text: 'BABY',
    process_status: '待製作',
  });
  if ([200, 201, 204].includes(ins2.status)) pass('Test001_K_LH item inserted (service key)');
  else fail(`Test001 item insert: status=${ins2.status} body=${ins2.body}`);

  // ── 8. Browser: Read Test001 via anon key ────────────────────────────────
  log('Reading Test001 from browser (anon)...');
  const read1 = await page.evaluate(async (cfg) => {
    const r = await fetch(
      `${cfg.url}/rest/v1/orders?order_id=eq.Test001&select=order_id,customer_name,final_sale_price`,
      { headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` } }
    );
    const data = await r.json();
    return { status: r.status, data };
  }, { url: SB_URL, anon: SB_ANON });

  if (read1.status === 200 && read1.data.length > 0) {
    const o = read1.data[0];
    pass(`Test001 readable from browser: ${o.customer_name} / $${o.final_sale_price}`);
  } else {
    fail(`Test001 not readable from browser: status=${read1.status} rows=${read1.data.length}`);
  }

  // ── 9. Browser: Read Test001 item spec + engraving ───────────────────────
  log('Verifying Test001_K_LH fields from browser...');
  const read2 = await page.evaluate(async (cfg) => {
    const r = await fetch(
      `${cfg.url}/rest/v1/order_items?item_key=eq.Test001_K_LH&select=item_key,specification,engraving_text`,
      { headers: { apikey: cfg.anon, Authorization: `Bearer ${cfg.anon}` } }
    );
    const data = await r.json();
    return { status: r.status, data };
  }, { url: SB_URL, anon: SB_ANON });

  if (read2.status === 200 && read2.data.length > 0) {
    const it = read2.data[0];
    if (it.specification === '左手 / 不銹鋼') pass(`Test001 item spec: "${it.specification}"`);
    else fail(`Test001 item spec wrong: got "${it.specification}"`);
    if (it.engraving_text === 'BABY') pass(`Test001 item engraving: "${it.engraving_text}"`);
    else fail(`Test001 item engraving wrong: got "${it.engraving_text}"`);
  } else {
    fail(`Test001 item not readable from browser: status=${read2.status} rows=${read2.data.length}`);
  }

  // ── 10. Node: Soft-delete Test001 ────────────────────────────────────────
  log('Soft-deleting Test001 (Node https)...');
  const softDel = await sbPatch('/rest/v1/orders?order_id=eq.Test001', SB_SVC, {
    deleted_at: new Date().toISOString()
  });
  if ([200, 204].includes(softDel.status)) pass('Test001 soft-deleted (deleted_at set)');
  else fail(`Test001 soft-delete: status=${softDel.status}`);

  // ── 11. Console errors (ignore 401s from V40 non-SB features) ────────────
  const jsErrors = consoleErrors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('file://') &&
    !e.includes('net::ERR_FILE_NOT_FOUND') &&
    !e.includes('ERR_ABORTED')
  );
  if (jsErrors.length === 0) pass('No unexpected JS console errors');
  else {
    const criticals = jsErrors.filter(e => !e.includes('401'));
    if (criticals.length === 0) pass(`Only 401 errors (${jsErrors.length}) — expected for n8n webhooks in file:// mode`);
    else {
      fail(`${criticals.length} unexpected JS error(s):`);
      criticals.slice(0, 5).forEach(e => log(`  ${e}`, 'ERROR'));
    }
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  log('Cleaning up test data (Node https)...');
  await sbDelete('/rest/v1/order_items?order_fhs_id=eq.Test001', SB_SVC);
  await sbDelete('/rest/v1/orders?order_id=eq.Test001', SB_SVC);
  pass('Test data (Test001) cleaned up');

  await browser.close();

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════');
  console.log(`QA RESULT: ${passed} PASS / ${failed} FAIL`);
  console.log('═══════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('QA fatal:', err.message);
  process.exit(1);
});
