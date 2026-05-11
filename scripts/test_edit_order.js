const { chromium } = require('playwright');
const path = require('path');
const V41_PATH = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41_PATH.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

  // 1. Load page with Supabase ON
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('fhs_supabase_read', '1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000); // let auto-loads complete

  const diagInfo = await page.evaluate(() => ({
    sbFlag: localStorage.getItem('fhs_supabase_read'),
    hasFetchGlobalReview: typeof window.fetchGlobalReview,
    globalOrdersLen: (window.globalOrders || []).length,
    sbStatusEl: document.getElementById('v41-sb-status')?.textContent || 'N/A',
    pillText: document.getElementById('v41-supabase-toggle')?.textContent?.trim() || 'N/A',
  }));
  console.log('Diag:', JSON.stringify(diagInfo, null, 2));

  const ordersCount = diagInfo.globalOrdersLen;
  console.log('globalOrders loaded:', ordersCount);

  const firstOrderId = await page.evaluate(() => {
    // Find first order with non-empty globalOrders (sorted desc = recent first for test)
    const orders = window.globalOrders || [];
    return orders[orders.length - 1]?.Order_ID || orders[0]?.Order_ID || null;
  });
  console.log('Testing edit for order:', firstOrderId);
  // Also test specifically 0600102 which has known form state
  const testOrderId = '0600102';
  console.log('Also testing known order:', testOrderId);

  if (!firstOrderId) {
    console.log('FAIL: No orders loaded');
    await browser.close();
    return;
  }

  // 2. Simulate switchMode('edit') first
  await page.evaluate(async () => {
    if (window.switchMode) await window.switchMode('edit');
  });
  await page.waitForTimeout(300);

  // 3. Set order ID in search input — use the known recent order
  await page.evaluate((oId) => {
    const el = document.getElementById('searchOrderId');
    if (el) el.value = oId;
  }, testOrderId);

  // 4. Call fetchOldOrder() and wait for result
  const result = await page.evaluate(async () => {
    try {
      if (window.fetchOldOrder) await window.fetchOldOrder();
    } catch(e) {
      return { threw: e.message };
    }
    await new Promise(r => setTimeout(r, 2500));
    return {
      editTargetOrderId: window.editTargetOrderId,
      orderID: window.orderID,
      isIdValid: window.isIdValid,
      fetchStatusText: document.getElementById('fetchStatus')?.innerText || 'N/A',
      orderIdDisplay: document.getElementById('orderIdDisplay')?.value || '',
      pSubCatValue: document.getElementById('pSubCat')?.value || 'N/A',
      enablePChecked: document.getElementById('enableP')?.checked,
      depositValue: document.getElementById('deposit')?.value || '',
    };
  });

  console.log('Edit result:', JSON.stringify(result, null, 2));
  if (errors.length) console.log('JS errors:', errors.slice(0, 5));

  await browser.close();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
