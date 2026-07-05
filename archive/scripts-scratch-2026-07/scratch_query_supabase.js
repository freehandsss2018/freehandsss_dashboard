const https = require('https');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

function supabaseGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
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
    req.end();
  });
}

async function main() {
  console.log("Querying orders in Supabase using HTTPS...");
  try {
    const data1 = await supabaseGet(`/rest/v1/orders?order_id=eq.0600802`);
    console.log("Order 0600802:", data1);
  } catch (err) {
    console.error("Order query failed:", err.message);
  }

  try {
    const data3 = await supabaseGet(`/rest/v1/order_items?order_fhs_id=eq.0600802`);
    console.log("Order items for 0600802:", JSON.stringify(data3, null, 2));
  } catch (err) {
    console.error("Items query failed:", err.message);
  }
}

main().catch(console.error);
