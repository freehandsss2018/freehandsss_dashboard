/**
 * Test full order reconstruction for problem orders: 0500703, 0600809, 0600100, 0600800.
 * Tests BOTH V40 and V41 to verify n8n-path Supabase fallback works in both files.
 */
const { chromium } = require('playwright');
const path = require('path');

async function testOrder(page, oId, label) {
  await page.evaluate(async () => { if (window.switchMode) await window.switchMode('edit'); });
  await page.evaluate(id => { const el = document.getElementById('searchOrderId'); if (el) el.value = id; }, oId);

  const result = await page.evaluate(async () => {
    try { if (window.fetchOldOrder) await window.fetchOldOrder(); } catch(e) { return { threw: e.message }; }
    await new Promise(r => setTimeout(r, 3000));
    return {
      fetchStatusText: document.getElementById('fetchStatus')?.innerText || 'N/A',
      orderIdDisplay: document.getElementById('orderIdDisplay')?.value || '',
      momName: document.getElementById('momName')?.value || '',
      appDate: document.getElementById('appDate')?.value || '',
      depositValue: document.getElementById('deposit')?.value || '',
      enableP: document.getElementById('enableP')?.checked || false,
      enableK: document.getElementById('enableK')?.checked || false,
      enableM: document.getElementById('enableM')?.checked || false,
      pEngraving: document.getElementById('pEngraving')?.value || '',
      k_lh_en: document.getElementById('k_lh_en')?.checked || false,
      k_rh_en: document.getElementById('k_rh_en')?.checked || false,
      k_lf_en: document.getElementById('k_lf_en')?.checked || false,
      k_rf_en: document.getElementById('k_rf_en')?.checked || false,
    };
  });

  console.log(`\n=== ${label} order ${oId} ===`);
  console.log('  status :', result.fetchStatusText);
  console.log('  oId    :', result.orderIdDisplay, '| name:', result.momName, '| date:', result.appDate);
  console.log('  finance: deposit=' + result.depositValue);
  console.log('  enabled: P=' + result.enableP, 'K=' + result.enableK, 'M=' + result.enableM);
  console.log('  K-limbs: LH=' + result.k_lh_en, 'RH=' + result.k_rh_en, 'LF=' + result.k_lf_en, 'RF=' + result.k_rf_en);
  console.log('  pEng   :', result.pEngraving);
  return result;
}

async function runFile(file, label) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${label}`);
  console.log('='.repeat(60));
  const FILE_URL = 'file:///' + path.resolve(__dirname, '..', file).replace(/\\/g, '/');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.removeItem('fhs_supabase_read'));  // simulate fresh user
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Initial flag state:', await page.evaluate(() => localStorage.getItem('fhs_supabase_read')));

  await testOrder(page, '0500703', label);  // no Raw_Form_State; spec="腳"
  await testOrder(page, '0600809', label);  // no Raw_Form_State; spec="手 / 左手"
  await testOrder(page, '0600100', label);  // no Raw_Form_State; spec="腳 / 已掉手"
  await testOrder(page, '0600800', label);  // HAS Raw_Form_State

  await browser.close();
}

(async () => {
  await runFile('Freehandsss_Dashboard/freehandsss_dashboardV41.html', 'V41');
  await runFile('Freehandsss_Dashboard/freehandsss_dashboardV40.html', 'V40');
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
