const { chromium } = require('playwright');
const path = require('path');
const V41_PATH = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41_PATH.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('fhs_supabase_read', '1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  await page.evaluate(async () => { if (window.switchMode) await window.switchMode('edit'); });
  await page.evaluate(id => { const el = document.getElementById('searchOrderId'); if (el) el.value = id; }, '0600100');

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
      pEngraving: document.getElementById('pEngraving')?.value || '',
    };
  });

  console.log('Old order (0600100 - reconstructed from Supabase):');
  console.log(JSON.stringify(result, null, 2));

  const pass = result.orderIdDisplay === '0600100' && result.momName === 'Jasmine' && result.fetchStatusText.includes('舊單已重建');
  console.log(pass ? 'PASS: old order reconstructed correctly' : 'FAIL: reconstruction failed');
  if (errors.length) console.log('JS errors:', errors.slice(0, 3));

  await browser.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
