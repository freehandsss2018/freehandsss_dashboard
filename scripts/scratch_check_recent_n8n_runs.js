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
  console.log("Fetching recent executions...");
  const { status, body } = await apiRequest('GET', `/api/v1/executions?workflowId=${WORKFLOW_ID}&limit=5`);
  if (status !== 200) {
    console.error("Failed to fetch executions:", status, body);
    process.exit(1);
  }

  const executions = body.data || [];
  console.log(`Found ${executions.length} recent executions.`);
  for (const exec of executions) {
    console.log(`Execution ID: ${exec.id}, Status: ${exec.status}, Started: ${exec.startedAt}, Finished: ${exec.stoppedAt}`);
    
    // Fetch details
    const { status: s2, body: b2 } = await apiRequest('GET', `/api/v1/executions/${exec.id}?includeData=true`);
    if (s2 === 200) {
      const runData = b2.data?.resultData?.runData || {};
      const prepNode = runData["Supabase Mirror Prep"];
      const switchNode = runData["Supabase Active Switch"];
      const rpcNode = runData["HTTP: Supabase Sync RPC"];
      const deleteNode = runData["Mirror Delete to Supabase"];

      console.log(`  Supabase Mirror Prep: ${prepNode ? 'Executed' : 'Not executed'}`);
      if (prepNode && prepNode[0]?.error) {
        console.log(`    ERROR:`, prepNode[0].error);
      }
      console.log(`  Supabase Active Switch: ${switchNode ? 'Executed' : 'Not executed'}`);
      console.log(`  HTTP: Supabase Sync RPC: ${rpcNode ? 'Executed' : 'Not executed'}`);
      if (rpcNode) {
        console.log(`    Response status:`, rpcNode[0]?.data?.main?.[0]?.[0]?.json);
        if (rpcNode[0]?.error) {
          console.log(`    ERROR:`, rpcNode[0].error);
        }
      }
      console.log(`  Mirror Delete to Supabase: ${deleteNode ? 'Executed' : 'Not executed'}`);
      if (deleteNode) {
        console.log(`    Response status:`, deleteNode[0]?.data?.main?.[0]?.[0]?.json);
        if (deleteNode[0]?.error) {
          console.log(`    ERROR:`, deleteNode[0].error);
        }
      }
    }
    console.log("-----------------------------------------");
  }
}

main().catch(console.error);
