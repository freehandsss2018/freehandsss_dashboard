require('dotenv').config();
const https = require('https');

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
  console.log("Fetching active workflow code from n8n...");
  const { status, body } = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (status !== 200) {
    console.error("Failed to fetch workflow:", status, body);
    process.exit(1);
  }

  const mNode = body.nodes.find(n => n.name === 'Mirror to Supabase');
  if (mNode) {
    console.log("=== Active Mirror to Supabase Code ===");
    console.log(mNode.parameters.jsCode);
  }
  const dNode = body.nodes.find(n => n.name === 'Mirror Delete to Supabase');
  if (dNode) {
    console.log("\n=== Active Mirror Delete to Supabase Code ===");
    console.log(dNode.parameters.jsCode);
  }
}

main().catch(console.error);
