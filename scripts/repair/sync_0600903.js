const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

function supabasePatch(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const postData = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  const force = process.argv.includes('--force');
  console.log(`[FHS Repair] Modifying Order 0600903 to match screenshot. Force mode: ${force}`);
  
  // Define update payload
  const patchData = {
    deposit: 1690,
    balance: 5530,
    // We will merge raw_form_state update
  };
  
  // First fetch current record to get existing raw_form_state
  const fetchUrl = `/rest/v1/orders?order_id=eq.0600903&select=raw_form_state,full_order_text`;
  const fetchRes = await new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + fetchUrl);
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      rejectUnauthorized: false
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.end();
  });
  
  if (!Array.isArray(fetchRes) || fetchRes.length === 0) {
    console.error("Order 0600903 not found in Supabase.");
    process.exit(1);
  }
  
  const current = fetchRes[0];
  const rawForm = current.raw_form_state || {};
  
  // Update raw form state keys
  rawForm.deposit = "1690";
  rawForm.balance = "5530";
  rawForm.appTimeHour = "10:30";
  rawForm.__System_Final_Sale_Price = 7220; // 1690 + 5530
  
  patchData.raw_form_state = rawForm;
  
  console.log("Proposed patch fields for orders:");
  console.log(JSON.stringify(patchData, null, 2));
  
  if (!force) {
    console.log("Dry-run complete. Run with --force to write updates.");
    return;
  }
  
  console.log("Executing PATCH update...");
  const result = await supabasePatch(`/rest/v1/orders?order_id=eq.0600903`, patchData);
  console.log("PATCH Result:", result);
  console.log("Database update completed successfully. Please trigger n8n sync or rebuild text via modal UI.");
}

main().catch(console.error);
