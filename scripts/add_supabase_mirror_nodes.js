#!/usr/bin/env node
// Phase 2: Add Supabase Mirror Write nodes to FHS_Core_OrderProcessor
// Adds 2 parallel Code nodes + updates connections. Non-destructive.

require('dotenv').config();
const https = require('https');

const N8N_INSTANCE = process.env.N8N_INSTANCE;
const N8N_KEY = process.env.N8N_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WORKFLOW_ID = '6Ljih0hSKr9RpYNm';

if (!N8N_INSTANCE || !N8N_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars. Check .env for N8N_INSTANCE, N8N_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY');
  process.exit(1);
}

function apiRequest(method, path, body) {
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
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Mirror node code uses env var placeholders replaced at script runtime
const MIRROR_CREATE_CODE = `// === FHS Supabase Mirror Write — CREATE path (Phase 2) ===
// Parallel branch after Create Sub Items. Airtable write already complete.
// Failure is ISOLATED — never throws to main flow.

const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Feature flag — default ON. Set supabase_mirror_enabled=false to pause.
const staticData = $getWorkflowStaticData('global');
if (staticData.supabase_mirror_enabled === false) {
  return [{ json: { skipped: true, reason: 'feature_flag_off' } }];
}

const hdrs = {
  'apikey': SUPABASE_KEY,
  'Authorization': \`Bearer \${SUPABASE_KEY}\`,
  'Content-Type': 'application/json',
  'Prefer': 'resolution=merge-duplicates,return=minimal'
};

async function upsert(table, payload) {
  const res = await fetch(\`\${SUPABASE_URL}/rest/v1/\${table}\`, {
    method: 'POST', headers: hdrs, body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(\`\${table}: \${res.status} \${await res.text()}\`);
}

try {
  const calc = $('Calculate Profit & Pack Items').first().json;
  const orderId = calc.Order_ID;
  if (!orderId) throw new Error('Order_ID missing from Calculate Profit node');

  // raw_form_state — AGENTS.md hard rule: must NOT be null
  let rawFormState = {};
  try {
    rawFormState = typeof calc.Raw_Form_State === 'string'
      ? JSON.parse(calc.Raw_Form_State || '{}')
      : (calc.Raw_Form_State || {});
  } catch(e) { rawFormState = { raw: String(calc.Raw_Form_State) }; }

  await upsert('orders', {
    order_id: orderId,
    customer_name: calc.Customer_Name || orderId,
    appointment_date: calc.Appointment_Date || null,
    order_confirm_date: calc.Order_Confirm_Date || null,
    process_status: '待確認',
    final_sale_price: calc.Total_Revenue || 0,
    total_cost: calc.Total_Cost || 0,
    net_profit: calc.Final_Profit || 0,
    raw_form_state: rawFormState
  });

  const subItems = calc.Sub_Items || [];
  for (const item of subItems) {
    const key = item.Order_Item_Key;
    if (!key) continue;
    const qty = item.Quantity || 1;
    await upsert('order_items', {
      order_fhs_id: orderId,
      item_key: key,
      product_sku: item.Product_Name || null,
      quantity: qty,
      unit_cost: qty > 0 ? Number((item.Total_Base_Cost / qty).toFixed(2)) : 0,
      final_sale_price: 0,
      net_profit: 0,
      process_status: '待製作',
      notes: item.Notes || null
    });
  }

  return [{ json: { mirrored: true, order_id: orderId, items: subItems.length } }];
} catch (err) {
  // Isolated — Airtable write already succeeded
  return [{ json: { mirrored: false, error: err.message } }];
}`;

const MIRROR_DELETE_CODE = `// === FHS Supabase Mirror Delete — DELETE path (Phase 2) ===
// Parallel branch after Delete Record. Soft-delete preserves audit trail.
// Failure is ISOLATED — never affects Telegram notification.

const SUPABASE_URL = '${SUPABASE_URL}';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const staticData = $getWorkflowStaticData('global');
if (staticData.supabase_mirror_enabled === false) {
  return [{ json: { skipped: true, reason: 'feature_flag_off' } }];
}

try {
  const body = $('Receive Dashboard Order').first().json.body
    || $('Receive Dashboard Order').first().json;
  const orderId = body.Order_ID;
  if (!orderId) throw new Error('Order_ID missing');

  const res = await fetch(
    \`\${SUPABASE_URL}/rest/v1/orders?order_id=eq.\${encodeURIComponent(orderId)}\`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': \`Bearer \${SUPABASE_KEY}\`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ deleted_at: new Date().toISOString() })
    }
  );
  if (!res.ok) throw new Error(\`soft delete failed: \${res.status} \${await res.text()}\`);

  return [{ json: { mirrored: true, soft_deleted: orderId } }];
} catch (err) {
  return [{ json: { mirrored: false, error: err.message } }];
}`;

async function main() {
  console.log('Fetching workflow...');
  const { status: s1, body: wf } = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (s1 !== 200) { console.error('GET failed:', s1, wf); process.exit(1); }
  console.log(`Got workflow: ${wf.name} (${wf.nodes.length} nodes)`);

  if (wf.nodes.find(n => n.name === 'Mirror to Supabase')) {
    console.log('Mirror nodes already present — skipping (idempotent).');
    return;
  }

  const newNodes = [
    {
      name: 'Mirror to Supabase',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [32000, 7800],
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: MIRROR_CREATE_CODE
      }
    },
    {
      name: 'Mirror Delete to Supabase',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [31920, 6950],
      parameters: {
        mode: 'runOnceForAllItems',
        language: 'javaScript',
        jsCode: MIRROR_DELETE_CODE
      }
    }
  ];

  const updatedConnections = {
    ...wf.connections,
    'Create Sub Items': {
      main: [[
        ...(wf.connections['Create Sub Items']?.main?.[0] || []),
        { node: 'Mirror to Supabase', type: 'main', index: 0 }
      ]]
    },
    'Delete Record': {
      main: [[
        ...(wf.connections['Delete Record']?.main?.[0] || []),
        { node: 'Mirror Delete to Supabase', type: 'main', index: 0 }
      ]]
    }
  };

  const updatedWorkflow = {
    name: wf.name,
    nodes: [...wf.nodes, ...newNodes],
    connections: updatedConnections,
    settings: {},
  };

  console.log('Pushing updated workflow...');
  const { status: s2, body: result } = await apiRequest(
    'PUT', `/api/v1/workflows/${WORKFLOW_ID}`, updatedWorkflow
  );

  if (s2 === 200) {
    const nodeCount = result.nodes?.length || '?';
    console.log(`[OK] Workflow updated. Total nodes: ${nodeCount}`);
    console.log('  + Mirror to Supabase            (after Create Sub Items)');
    console.log('  + Mirror Delete to Supabase     (after Delete Record)');
  } else {
    console.error(`[ERR] PUT failed (${s2}):`, JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
