// deploy_batch_recalc_workflow.js
// Creates and activates "💰 Financial Batch Recalculate" n8n workflow.
// Run once after deploying migration 0021 to Supabase.
//
// Usage:  node scripts/deploy_batch_recalc_workflow.js
// Output: Prints the production webhook URL to fill into V41 HTML _FS_N8N_WEBHOOK.

require('dotenv').config();
const https = require('https');

const N8N_INSTANCE       = process.env.N8N_INSTANCE;        // https://yanhei.synology.me:8443
const N8N_KEY            = process.env.N8N_KEY;
const SUPABASE_URL       = process.env.SUPABASE_URL;        // https://vpmwizzixnwilmzctdvu.supabase.co
const SUPABASE_SVC_KEY   = process.env.SUPABASE_SERVICE_KEY;

if (!N8N_INSTANCE || !N8N_KEY || !SUPABASE_URL || !SUPABASE_SVC_KEY) {
    console.error('Missing required env vars. Check .env file.');
    process.exit(1);
}

const WEBHOOK_PATH = 'fhs-financial-batch-recalc';
const WEBHOOK_URL  = `${N8N_INSTANCE}/webhook/${WEBHOOK_PATH}`;

function apiRequest(method, urlPath, body) {
    return new Promise((resolve, reject) => {
        const url     = new URL(N8N_INSTANCE + urlPath);
        const payload = body ? JSON.stringify(body) : '';
        const options = {
            hostname:           url.hostname,
            port:               url.port || 443,
            path:               url.pathname + url.search,
            method,
            headers: {
                'X-N8N-API-KEY':  N8N_KEY,
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
            rejectUnauthorized: false,
        };
        const req = https.request(options, (res) => {
            res.setEncoding('utf8');
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

const WORKFLOW_DEF = {
    name: '💰 Financial Batch Recalculate',
    nodes: [
        {
            name:        'Webhook',
            type:        'n8n-nodes-base.webhook',
            position:    [250, 300],
            parameters: {
                path:         WEBHOOK_PATH,
                responseMode: 'responseNode',
                httpMethod:   'POST',
                options:      {}
            }
        },
        {
            name:     'Call Supabase RPC',
            type:     'n8n-nodes-base.httpRequest',
            position: [500, 300],
            parameters: {
                method:      'POST',
                url:         `${SUPABASE_URL}/rest/v1/rpc/fhs_batch_recalc_execute`,
                sendHeaders: true,
                headerParameters: {
                    parameters: [
                        { name: 'apikey',        value: SUPABASE_SVC_KEY },
                        { name: 'Authorization', value: `Bearer ${SUPABASE_SVC_KEY}` },
                        { name: 'Content-Type',  value: 'application/json' }
                    ]
                },
                sendBody:    true,
                specifyBody: 'json',
                jsonBody:    '={{ JSON.stringify({p_batch_id: $json.body.batch_id}) }}',
                options:     {}
            }
        },
        {
            name:     'Respond to Webhook',
            type:     'n8n-nodes-base.respondToWebhook',
            position: [750, 300],
            parameters: {
                respondWith:  'json',
                responseBody: '={{ $json }}',
                options:      { responseCode: 200 }
            }
        }
    ],
    connections: {
        'Webhook': {
            main: [[{ node: 'Call Supabase RPC', type: 'main', index: 0 }]]
        },
        'Call Supabase RPC': {
            main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]]
        }
    },
    settings:    { executionOrder: 'v1' },
    staticData:  null
};

async function main() {
    console.log('──────────────────────────────────────────────');
    console.log('FHS — Deploy: 💰 Financial Batch Recalculate');
    console.log('──────────────────────────────────────────────');

    // Check if workflow already exists
    const listRes = await apiRequest('GET', '/api/v1/workflows?limit=100');
    if (listRes.status === 200) {
        const existing = (listRes.body.data || []).find(w => w.name === WORKFLOW_DEF.name);
        if (existing) {
            console.log(`⚠️  Workflow already exists (ID: ${existing.id})`);
            console.log(`   Active: ${existing.active}`);
            if (!existing.active) {
                const act = await apiRequest('POST', `/api/v1/workflows/${existing.id}/activate`);
                console.log(`✅ Activated (status ${act.status})`);
            }
            printResult(existing.id);
            return;
        }
    }

    // Create workflow
    const createRes = await apiRequest('POST', '/api/v1/workflows', WORKFLOW_DEF);
    if (createRes.status !== 200 && createRes.status !== 201) {
        console.error('❌ Create failed:', createRes.status, JSON.stringify(createRes.body, null, 2));
        process.exit(1);
    }
    const workflowId = createRes.body.id;
    console.log(`✅ Created workflow ID: ${workflowId}`);

    // Activate
    const actRes = await apiRequest('POST', `/api/v1/workflows/${workflowId}/activate`);
    if (actRes.status !== 200) {
        console.error('❌ Activate failed:', actRes.status, JSON.stringify(actRes.body, null, 2));
        process.exit(1);
    }
    console.log('✅ Workflow activated');

    printResult(workflowId);
}

function printResult(workflowId) {
    console.log('\n══════════════════════════════════════════════');
    console.log('📌 Webhook URL (production):');
    console.log(`   ${WEBHOOK_URL}`);
    console.log('\n📋 Next steps:');
    console.log('   1. This URL is already filled in V41 HTML _FS_N8N_WEBHOOK');
    console.log('   2. Verify migration 0021 is deployed to Supabase');
    console.log('   3. Sync V41 → current.html via /execute');
    console.log('══════════════════════════════════════════════\n');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
