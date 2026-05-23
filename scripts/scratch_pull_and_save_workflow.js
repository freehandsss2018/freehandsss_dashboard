require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const N8N_INSTANCE = process.env.N8N_INSTANCE;
const N8N_KEY = process.env.N8N_KEY;
const WORKFLOW_ID = '6Ljih0hSKr9RpYNm';

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
      res.setEncoding('utf8');
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
  console.log("Fetching active workflow from n8n...");
  const { status, body } = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (status !== 200) {
    console.error("Failed to fetch workflow:", status, body);
    process.exit(1);
  }

  const jsonPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
  fs.writeFileSync(jsonPath, JSON.stringify(body, null, 2), 'utf8');
  console.log(`Saved workflow JSON to ${jsonPath}`);
}

main().catch(console.error);
