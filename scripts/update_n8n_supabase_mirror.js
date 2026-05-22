require('dotenv').config();
const https = require('https');
const fs = require('fs');

const N8N_INSTANCE = process.env.N8N_INSTANCE;
const N8N_KEY = process.env.N8N_KEY;
const WORKFLOW_ID = '6Ljih0hSKr9RpYNm';

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

const MIRROR_CREATE_CODE = `// === FHS Supabase Mirror Write — CREATE/EDIT path (V47.10) ===
// Parallel branch after Create Sub Items. Airtable write already complete.
// Uses axios for sandbox reliability (since global fetch is undefined in n8n VM).
// Failure is ISOLATED — never throws to main flow.

const axios = require('axios');

const SUPABASE_URL = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SUPABASE_KEY = (() => { try { return process.env.SUPABASE_SERVICE_KEY; } catch(e) { return null; } })()
  || 'sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq';

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

async function upsert(table, conflictCol, payload) {
  const url = \`\${SUPABASE_URL}/rest/v1/\${table}?on_conflict=\${conflictCol}\`;
  try {
    await axios.post(url, payload, { headers: hdrs });
  } catch (err) {
    const status = err.response ? err.response.status : 'NO_RESPONSE';
    const data = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(\`\${table} upsert failed: \${status} \${data}\`);
  }
}

try {
  const calc = $('Calculate Profit & Pack Items').first().json;
  let orderId = calc.Order_ID;
  if (!orderId) throw new Error('Order_ID missing from Calculate Profit node');

  const action = (() => {
    try { return ($('Input Normalizer').first().json.action || 'create').toLowerCase(); } catch(e) { return 'create'; }
  })();

  // Read New_Order_ID from Input Normalizer
  const newOrderId = (() => {
    try { return $('Input Normalizer').first().json.New_Order_ID || null; } catch(e) { return null; }
  })();

  // Capture diagnostics
  const diag = {
    action_received: action,
    order_id_received: orderId,
    new_order_id_received: newOrderId,
    rename_condition_met: (action === 'edit' && !!newOrderId && newOrderId !== orderId),
    rpc_called: false,
    rpc_status: null,
    rpc_error: null
  };

  let rawFormState = {};
  try {
    rawFormState = typeof calc.Raw_Form_State === 'string'
      ? JSON.parse(calc.Raw_Form_State || '{}')
      : (calc.Raw_Form_State || {});
  } catch(e) { rawFormState = { raw: String(calc.Raw_Form_State) }; }

  // Atomic Order_ID rename via Supabase RPC (using axios)
  let orderRenamed = null;
  if (action === 'edit' && newOrderId && newOrderId !== orderId) {
    diag.rpc_called = true;
    try {
      const rpcRes = await axios.post(
        \`\${SUPABASE_URL}/rest/v1/rpc/rename_order_id\`,
        { old_id: orderId, new_id: newOrderId },
        { headers: hdrs }
      );
      diag.rpc_status = rpcRes.status;
    } catch (err) {
      const status = err.response ? err.response.status : 'NO_RESPONSE';
      const data = err.response ? JSON.stringify(err.response.data) : err.message;
      diag.rpc_status = status;
      diag.rpc_error = data;
      throw new Error(\`rename_order_id RPC failed: \${status} \${data}\`);
    }
    orderRenamed = \`\${orderId} -> \${newOrderId}\`;
    orderId = newOrderId;
  }

  const orderPayload = {
    order_id:               orderId,
    customer_name:          calc.Customer_Name || orderId,
    appointment_at:         calc.Appointment_Date || null,
    final_sale_price:       calc.Total_Revenue         || 0,
    total_cost:             calc.Total_Cost            || 0,
    net_profit:             calc.Final_Profit          || 0,
    deposit:                calc.Deposit               || 0,
    balance:                calc.Balance               || 0,
    additional_fee:         calc.Additional_Fee        || 0,
    full_order_text:        calc.Order_Text            || '',
    handmodel_cost:         calc.Handmodel_Cost_Total  || 0,
    keychain_cost:          calc.Keychain_Cost_Total   || 0,
    necklace_cost:          calc.Necklace_Cost_Total   || 0,
    n8n_cost_adjustments:   Number(calc.N8n_Cost_Adjustments) || 0,
    n8n_adjustment_notes:   calc.N8n_Adjustment_Notes  || [],
    raw_form_state:         rawFormState
  };

  if (action === 'create' && calc.Order_Confirm_Date) {
    orderPayload.confirmed_at = calc.Order_Confirm_Date;
  }
  if (action === 'create') {
    orderPayload.process_status = '待確認';
  }

  await upsert('orders', 'order_id', orderPayload);

  const subItems = calc.Sub_Items || [];
  for (const item of subItems) {
    const key = item.Order_Item_Key;
    if (!key) continue;
    await upsert('order_items', 'item_key', {
      order_fhs_id:   orderId,
      item_key:       key,
      product_sku:    item.Product_Name   || null,
      item_category:  item.Item_Category  || null,
      quantity:       item.Quantity       || 1,
      item_base_cost: item.Total_Base_Cost || 0,
      subtotal_cost:  item.Total_Base_Cost || 0,
      handmodel_cost: item.Handmodel_Cost  || 0,
      keychain_cost:  item.Keychain_Cost   || 0,
      necklace_cost:  item.Necklace_Cost   || 0,
      specification:  item.Notes          || '',
      process_status: '待製作'
    });
  }

  return [{ json: {
    mirrored:              true,
    action:                action,
    order_id:              orderId,
    order_renamed:         orderRenamed,
    items:                 subItems.length,
    diag:                  diag,
    handmodel_cost:        calc.Handmodel_Cost_Total,
    keychain_cost:         calc.Keychain_Cost_Total,
    necklace_cost:         calc.Necklace_Cost_Total
  }}];
} catch (err) {
  return [{ json: { mirrored: false, error: err.message } }];
}
`;

const MIRROR_DELETE_CODE = `// === FHS Supabase Mirror Delete — DELETE path (V47.10) ===
// Parallel branch after Delete Record. Soft-delete preserves audit trail.
// Uses axios for sandbox reliability.
// Failure is ISOLATED — never affects Telegram notification.

const axios = require('axios');

const SUPABASE_URL = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SUPABASE_KEY = (() => { try { return process.env.SUPABASE_SERVICE_KEY; } catch(e) { return null; } })()
  || 'sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq';

const staticData = $getWorkflowStaticData('global');
if (staticData.supabase_mirror_enabled === false) {
  return [{ json: { skipped: true, reason: 'feature_flag_off' } }];
}

try {
  const body = $('Receive Dashboard Order').first().json.body
    || $('Receive Dashboard Order').first().json;
  const orderId = body.Order_ID;
  if (!orderId) throw new Error('Order_ID missing');

  const url = \`\${SUPABASE_URL}/rest/v1/orders?order_id=eq.\${encodeURIComponent(orderId)}\`;
  try {
    await axios.patch(
      url,
      { deleted_at: new Date().toISOString() },
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': \`Bearer \${SUPABASE_KEY}\`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        }
      }
    );
  } catch (err) {
    const status = err.response ? err.response.status : 'NO_RESPONSE';
    const data = err.response ? JSON.stringify(err.response.data) : err.message;
    throw new Error(\`soft delete failed: \${status} \${data}\`);
  }

  return [{ json: { mirrored: true, soft_deleted: orderId } }];
} catch (err) {
  return [{ json: { mirrored: false, error: err.message } }];
}
`;

async function main() {
  console.log('Fetching workflow...');
  const { status: s1, body: wf } = await apiRequest('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (s1 !== 200) { console.error('GET failed:', s1, wf); process.exit(1); }

  // Modify "Mirror to Supabase"
  const mNode = wf.nodes.find(n => n.name === 'Mirror to Supabase');
  if (mNode) {
    mNode.parameters.jsCode = MIRROR_CREATE_CODE;
    console.log('Updated jsCode for Mirror to Supabase.');
  }

  // Modify "Mirror Delete to Supabase"
  const dNode = wf.nodes.find(n => n.name === 'Mirror Delete to Supabase');
  if (dNode) {
    dNode.parameters.jsCode = MIRROR_DELETE_CODE;
    console.log('Updated jsCode for Mirror Delete to Supabase.');
  }

  const updatedWf = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: {}
  };

  console.log('Pushing updated workflow to n8n...');
  const { status: s2, body: result } = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, updatedWf);
  if (s2 !== 200) { console.error('PUT failed:', s2, result); process.exit(1); }
  console.log('Successfully updated n8n workflow with Axios implementation.');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
