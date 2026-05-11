/**
 * Final verification: V41 fresh-load should auto-enable Supabase, and 訂單總覽
 * should display engraving + limb correctly.
 */
const { chromium } = require('playwright');
const path = require('path');
const V41 = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  // Simulate fresh user — no localStorage
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Verify flag auto-set
  const flag = await page.evaluate(() => localStorage.getItem('fhs_supabase_read'));
  console.log('Auto-set Supabase flag (should be "1"):', flag);

  // Verify globalOrders loaded via Supabase
  await page.evaluate(async () => { if (window.switchMode) await window.switchMode('review'); });
  await page.waitForTimeout(2000);

  const reviewState = await page.evaluate(() => {
    const orders = window.globalOrders || [];
    const sample = orders.slice(0, 3).map(o => ({
      id: o.Order_ID,
      cust: o.Customer,
      itemCount: (o.items || []).length,
      firstItemEng: o.items?.[0]?.Engraving || '(none)',
      firstItemSpec: o.items?.[0]?.Specification || '(none)',
      source: o._source,
    }));
    return { totalOrders: orders.length, sample };
  });
  console.log('\nglobalOrders:', JSON.stringify(reviewState, null, 2));

  // Check rendered 訂單總覽 — pick 3 specific orders and verify engraving + limb badges
  const targets = ['0600100', '0500703', '0600801'];
  const rendered = await page.evaluate((targetIds) => {
    const out = [];
    targetIds.forEach(oId => {
      const rows = document.querySelectorAll(`tr.order-group-${oId}`);
      rows.forEach((row, idx) => {
        const engCell = row.querySelector('.review-eng-container');
        const engText = engCell ? engCell.innerText.replace(/\s+/g, ' ').trim() : '(empty cell)';
        const badges = Array.from(row.querySelectorAll('.review-badge')).map(b => b.innerText.trim());
        out.push({ order: oId, rowIdx: idx, engraving: engText, badges: badges.join(' | ') });
      });
    });
    return out;
  }, targets);

  console.log('\nRendered 訂單總覽:');
  rendered.forEach(r => {
    console.log(`  ${r.order}[${r.rowIdx}]`);
    console.log(`    eng    : ${r.engraving}`);
    console.log(`    badges : ${r.badges}`);
  });

  await browser.close();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
