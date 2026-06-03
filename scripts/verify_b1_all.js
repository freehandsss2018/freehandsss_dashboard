const { chromium } = require('playwright');
const path = require('path');

const V41 = path.resolve(__dirname, '../Freehandsss_Dashboard/freehandsss_dashboardV41.html');
const FILE_URL = 'file:///' + V41.replace(/\\/g, '/');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--disable-web-security'] });
  
  // Helper to run a test scenario
  async function runScenario(name, setupFn) {
    const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
    
    // Listen to console log messages
    const consoleLogs = [];
    page.on('console', msg => {
      const txt = msg.text();
      consoleLogs.push(txt);
      if (txt.includes('[FHS Cost Shadow]')) {
        console.log(`   [CONSOLE SHADOW]: ${txt}`);
      }
    });

    await page.goto(FILE_URL, { waitUntil: 'domcontentloaded' });
    
    // Manually trigger configuration loading
    await page.evaluate(() => {
      if (typeof window.loadCostConfigurations === 'function') {
        window.loadCostConfigurations();
      }
    });
    
    await page.waitForFunction(() => window._fhsCostReady === true, { timeout: 10000 });
    
    // Run custom setup
    await setupFn(page);
    
    // Wait for pricing to stabilize
    await page.waitForTimeout(1000);
    
    const cost = await page.textContent('#drawingCost');
    const details = await page.textContent('#pricingLogicDetails');
    const items = await page.evaluate(() => window.fhsCurrentPricingItems);
    
    await page.close();
    return { cost, details, consoleLogs, items };
  }

  // --- V1 ---
  console.log('\n--- Running V1 ---');
  const r1 = await runScenario('V1 (Baby Keychain Stainless 3pcs)', async (page) => {
    await page.evaluate(() => {
      document.getElementById('confirmOptYes').click();
      const enableK = document.getElementById('enableK');
      if (!enableK.checked) enableK.click();
      const kBaby = document.getElementById('k_baby_sec_en');
      if (!kBaby.checked) kBaby.click();
      ['k_lh_en', 'k_rh_en', 'k_lf_en'].forEach(id => {
        const el = document.getElementById(id);
        if (!el.checked) el.click();
      });
      // Set main set feet to "無"
      const setLf = document.querySelector('.limb-sel[data-who="嬰兒"][data-part="左腳"]');
      const setRf = document.querySelector('.limb-sel[data-who="嬰兒"][data-part="右腳"]');
      if (setLf) { setLf.value = "無"; setLf.dispatchEvent(new Event('change')); }
      if (setRf) { setRf.value = "無"; setRf.dispatchEvent(new Event('change')); }
    });
  });

  // --- V2 ---
  console.log('\n--- Running V2 ---');
  const r2 = await runScenario('V2 (Baby Silver Charm 4pcs)', async (page) => {
    await page.evaluate(() => {
      document.getElementById('confirmOptYes').click();
      const enableM = document.getElementById('enableM');
      if (!enableM.checked) enableM.click();
      const mBaby = document.getElementById('m_baby_sec_en');
      if (!mBaby.checked) mBaby.click();
      const mLh = document.getElementById('m_lh_en');
      if (!mLh.checked) mLh.click();
    });
    await page.fill('#m_lh_qty', '4');
    await page.dispatchEvent('#m_lh_qty', 'change');
  });

  // --- V3 ---
  console.log('\n--- Running V3 ---');
  const r3 = await runScenario('V3 (Adult Keychain S-mode)', async (page) => {
    await page.evaluate(() => {
      // 1. Set enableP checked directly to true
      document.getElementById('enableP').checked = true;
      // 2. Select glass bottle style
      const subCat = document.getElementById('pSubCat');
      if (subCat) subCat.value = "玻璃瓶款式";
      
      // Clear all main limbs to "無"
      const whoList = ["嬰兒", "父母", "大寶"];
      const partsList = ["左手", "右手", "左腳", "右腳"];
      whoList.forEach(who => {
        partsList.forEach(part => {
          const sel = document.querySelector(`.limb-sel[data-who="${who}"][data-part="${part}"]`);
          if (sel) {
            sel.value = "無";
            sel.dispatchEvent(new Event('change'));
          }
        });
      });

      // 3. Mock buildOrderItemsForPricing
      window.buildOrderItemsForPricing = () => [
        {
          "Order_Item_Key": "TEMP_K_lh",
          "Product_Name": "成人鎖匙扣 - 不銹鋼",
          "PartDesc": "🖐️ 左手",
          "Quantity": 1,
          "part_id": "lh",
          "target": "成人"
        },
        {
          "Order_Item_Key": "TEMP_ACC_baby",
          "Product_Name": "嬰兒配件",
          "Quantity": 1,
          "isAccessory": true
        }
      ];
      
      // 4. Force calculatePricing to run with mock
      window.calculatePricing();
    });
  });

  // --- V4 ---
  console.log('\n--- Running V4 ---');
  const r4 = await runScenario('V4 (Baby Gold Charm 1pc S-mode)', async (page) => {
    await page.evaluate(() => {
      // 1. Set enableP checked directly to true
      document.getElementById('enableP').checked = true;
      // 2. Select glass bottle style
      const subCat = document.getElementById('pSubCat');
      if (subCat) subCat.value = "玻璃瓶款式";
      
      // Clear all main limbs to "無"
      const whoList = ["嬰兒", "父母", "大寶"];
      const partsList = ["左手", "右手", "左腳", "右腳"];
      whoList.forEach(who => {
        partsList.forEach(part => {
          const sel = document.querySelector(`.limb-sel[data-who="${who}"][data-part="${part}"]`);
          if (sel) {
            sel.value = "無";
            sel.dispatchEvent(new Event('change'));
          }
        });
      });

      // 3. Mock buildOrderItemsForPricing
      window.buildOrderItemsForPricing = () => [
        {
          "Order_Item_Key": "TEMP_M_lh",
          "Product_Name": "嬰兒吊飾 - 925金",
          "PartDesc": "🖐️ 左手",
          "Quantity": 1,
          "part_id": "lh",
          "target": "嬰兒"
        }
      ];
      
      // 4. Force calculatePricing to run with mock
      window.calculatePricing();
    });
  });

  console.log('\n--- Final Verification Summary ---');
  console.log(`V1 Cost: ${r1.cost}`);
  console.log(`V2 Cost: ${r2.cost}`);
  console.log(`V3 Cost: ${r3.cost}`);
  console.log(`V4 Cost: ${r4.cost}`);
  
  const hasTransitionV1 = r1.details.includes('⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2');
  const hasTransitionV2 = r2.details.includes('⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2');
  const hasTransitionV3 = r3.details.includes('⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2');
  const hasTransitionV4 = r4.details.includes('⚠️ B1：成本顯示已校正（含打印/環扣/運費），後台回寫待 B2');
  console.log(`V-TRANSITION presence: V1=${hasTransitionV1}, V2=${hasTransitionV2}, V3=${hasTransitionV3}, V4=${hasTransitionV4}`);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
