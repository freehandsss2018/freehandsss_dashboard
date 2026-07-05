require('dotenv').config();
const https = require('https');

const N8N_INSTANCE = process.env.N8N_INSTANCE;
const N8N_KEY = process.env.N8N_KEY;
const WORKFLOW_ID = '6Ljih0hSKr9RpYNm';

if (!N8N_INSTANCE || !N8N_KEY) {
  console.error("Missing N8N_INSTANCE or N8N_KEY in environment");
  process.exit(1);
}

function apiRequest(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(N8N_INSTANCE + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'X-N8N-API-KEY': N8N_KEY,
        'Content-Type': 'application/json',
      },
      rejectUnauthorized: false,
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const ids = ['3635', '3636'];
  for (const id of ids) {
    console.log(`Fetching details for execution ${id}...`);
    const { status, body } = await apiRequest('GET', `/api/v1/executions/${id}?includeData=true`);
    if (status === 200) {
      const resultData = body.data?.resultData;
      if (resultData) {
        const runData = resultData.runData || {};
        const calcOutput = runData["Calculate Profit & Pack Items"]?.[0]?.data?.main?.[0];
        console.log(`  Calculate Profit output (${id}):`, calcOutput ? JSON.stringify(calcOutput).slice(0, 1500) : 'none');
      } else {
        console.log(`  No resultData found for ${id}`);
      }
    } else {
      console.error(`  Failed to fetch ${id}: status ${status}`);
    }
  }
}

main().catch(err => {
  console.error(err);
});
