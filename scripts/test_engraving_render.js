/**
 * Verify engraving rendering in 訂單總覽 for different formats:
 *  - "[上排]xxx [下排]yyy"
 *  - "xxx | yyy"
 *  - Plain text "Yuna"
 *  - null/empty
 */
const { chromium } = require('playwright');
const path = require('path');
const V41 = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.setItem('fhs_supabase_read', '1'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);

  // Switch to review mode
  await page.evaluate(async () => { if (window.switchMode) await window.switchMode('review'); });
  await page.waitForTimeout(2000);

  // Extract engraving cells from the rendered review table for orders 0600100, 0600102, 0500703, 0600800
  const results = await page.evaluate(() => {
    const targets = ['0600100', '0600102', '0500703', '0600800', '0600101'];
    const out = [];
    targets.forEach(oId => {
      const rows = document.querySelectorAll(`tr.order-group-${oId}`);
      rows.forEach((row, idx) => {
        // First TD with engHtml is the one with review-eng-container or "—" span
        const engCell = row.querySelector('.review-eng-container, [style*="color:#ddd"]');
        const prodCell = row.querySelector('.review-item-card');
        if (engCell || prodCell) {
          out.push({
            order: oId,
            rowIdx: idx,
            engRendered: engCell ? engCell.innerText.replace(/\s+/g, ' ').trim() : '(empty —)',
            productBadges: prodCell ? Array.from(prodCell.querySelectorAll('.review-badge')).map(b => b.innerText.trim()).join(' ') : '',
          });
        }
      });
    });
    return out;
  });

  console.log('Engraving render results:');
  results.forEach(r => {
    console.log(`  ${r.order}[${r.rowIdx}]:`);
    console.log(`    eng: "${r.engRendered}"`);
    console.log(`    prod: ${r.productBadges}`);
  });

  await browser.close();
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
