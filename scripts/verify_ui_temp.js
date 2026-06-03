const { chromium } = require('playwright');
const path = require('path');

const V41 = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41.replace(/\\/g, '/');

(async () => {
  console.log('Loading file URL:', FILE_URL);
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--disable-web-security']
  });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });


  // Listen to console log messages
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.text());
  });

  page.on('pageerror', exception => {
    console.log('BROWSER EXCEPTION:', exception.message);
  });

  // Listen to unhandled promise rejections inside the browser
  await page.addInitScript(() => {
    window.addEventListener('unhandledrejection', event => {
      console.log('BROWSER UNHANDLED REJECTION:', event.reason ? (event.reason.stack || event.reason.message || event.reason) : event);
    });
  });


  // Navigate to page
  await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });

  // Explicitly call loadCostConfigurations to start fetching the config
  console.log('Triggering loadCostConfigurations manually...');
  await page.evaluate(() => {
    if (typeof window.loadCostConfigurations === 'function') {
      window.loadCostConfigurations();
    } else {
      console.log('WARNING: window.loadCostConfigurations is not a function');
    }
  });

  // Wait until cost config is ready
  console.log('Waiting for _fhsCostReady to be true...');
  await page.waitForFunction(() => window._fhsCostReady === true, { timeout: 10000 });
  console.log('Cost configuration loaded successfully.');

  // --- V1 Test Case ---
  console.log('\n--- Running V1 Test Case ---');
  
  // Perform inputs programmatically in browser context
  await page.evaluate(() => {
    // 1. Order type: "yes" (confirmOptYes clicked)
    document.getElementById('confirmOptYes').click();
    
    // 2. Check enableK (keychains)
    const enableK = document.getElementById('enableK');
    if (!enableK.checked) {
      enableK.click();
    }
    
    // 3. Check k_baby_sec_en
    const kBaby = document.getElementById('k_baby_sec_en');
    if (!kBaby.checked) {
      kBaby.click();
    }

    // 4. Check 3 different limbs: Left Hand (lh), Right Hand (rh), Left Foot (lf)
    ['k_lh_en', 'k_rh_en', 'k_lf_en'].forEach(id => {
      const el = document.getElementById(id);
      if (!el.checked) {
        el.click();
      }
    });

    // 5. Select "無" for Left Foot and Right Foot in the main set (making it a 2-limb set: LH and RH only)
    const setLf = document.querySelector('.limb-sel[data-who="嬰兒"][data-part="左腳"]');
    const setRf = document.querySelector('.limb-sel[data-who="嬰兒"][data-part="右腳"]');
    if (setLf) { setLf.value = "無"; setLf.dispatchEvent(new Event('change')); }
    if (setRf) { setRf.value = "無"; setRf.dispatchEvent(new Event('change')); }
  });


  // Allow some time for pricing recalculation
  await page.waitForTimeout(1000);

  // Read System_Total_Cost (drawingCost UI element)
  const v1Cost = await page.textContent('#drawingCost');
  const v1Price = await page.textContent('#suggestedPrice');
  const v1Details = await page.textContent('#pricingLogicDetails');
  console.log(`V1 Results: Cost = ${v1Cost}, Suggested Price = ${v1Price}`);

  // Retrieve and print detailed items array from window
  const v1Items = await page.evaluate(() => window.fhsCurrentPricingItems);
  console.log('V1 Pricing Items detail:', JSON.stringify(v1Items, null, 2));

  
  // --- V2 Test Case ---
  console.log('\n--- Running V2 Test Case ---');
  
  // Reload page to start fresh
  await page.reload({ waitUntil: 'domcontentloaded' });
  
  // Explicitly call loadCostConfigurations to start fetching the config again
  console.log('Triggering loadCostConfigurations manually after reload...');
  await page.evaluate(() => {
    if (typeof window.loadCostConfigurations === 'function') {
      window.loadCostConfigurations();
    }
  });

  await page.waitForFunction(() => window._fhsCostReady === true, { timeout: 10000 });
  
  // Perform inputs programmatically in browser context
  await page.evaluate(() => {
    // 1. Order type: "yes" (confirmOptYes clicked)
    document.getElementById('confirmOptYes').click();
    
    // 2. Check enableM (charms)
    const enableM = document.getElementById('enableM');
    if (!enableM.checked) {
      enableM.click();
    }
    
    // 3. Check m_baby_sec_en
    const mBaby = document.getElementById('m_baby_sec_en');
    if (!mBaby.checked) {
      mBaby.click();
    }

    // 4. Check Left Hand (lh)
    const mLh = document.getElementById('m_lh_en');
    if (!mLh.checked) {
      mLh.click();
    }
  });

  // 5. Set quantity to 4
  await page.fill('#m_lh_qty', '4');
  // Trigger change event to ensure pricing calculation is fired
  await page.dispatchEvent('#m_lh_qty', 'change');
  await page.dispatchEvent('#m_lh_qty', 'input');

  // Allow some time for pricing recalculation
  await page.waitForTimeout(1000);

  // Read System_Total_Cost (drawingCost UI element)
  const v2Cost = await page.textContent('#drawingCost');
  const v2Price = await page.textContent('#suggestedPrice');
  const v2Details = await page.textContent('#pricingLogicDetails');
  console.log(`V2 Results: Cost = ${v2Cost}, Suggested Price = ${v2Price}`);

  // Retrieve and print detailed items array from window
  const v2Items = await page.evaluate(() => window.fhsCurrentPricingItems);
  console.log('V2 Pricing Items detail:', JSON.stringify(v2Items, null, 2));


  // --- V-TRANSITION Verification ---
  console.log('\n--- Running V-TRANSITION Check ---');
  const hasTransitionLabel = v2Details.includes('⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2');
  console.log('Transition label detected in V2 uiDetails:', hasTransitionLabel);

  const hasTransitionLabelV1 = v1Details.includes('⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2');
  console.log('Transition label detected in V1 uiDetails:', hasTransitionLabelV1);

  await browser.close();
})().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
