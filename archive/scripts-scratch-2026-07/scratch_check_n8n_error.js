require('dotenv').config();
const https = require('https');

const N8N_INSTANCE = process.env.N8N_INSTANCE;
const N8N_KEY = process.env.N8N_KEY;

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
  const id = '3665';
  console.log(`Fetching execution ${id} details...`);
  const { status, body } = await apiRequest('GET', `/api/v1/executions/${id}?includeData=true`);
  if (status === 200) {
    console.log("Top-level keys:", Object.keys(body));
    if (body.data) {
      console.log("data keys:", Object.keys(body.data));
      if (body.data.resultData) {
        console.log("resultData keys:", Object.keys(body.data.resultData));
        console.log("resultData.error:", body.data.resultData.error);
        if (body.data.resultData.runData) {
          console.log("runData keys count:", Object.keys(body.data.resultData.runData).length);
          // Find if any node has error
          for (const key of Object.keys(body.data.resultData.runData)) {
            const list = body.data.resultData.runData[key];
            for (const item of list) {
              if (item.error) {
                console.log(`Node ${key} failed:`, item.error);
              }
            }
          }
        }
      }
    }
  } else {
    console.log(`Failed to fetch ${id}`);
  }
}

main().catch(console.error);
