require('dotenv').config();
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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
      res.setEncoding('utf8');
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

function generateUuid() {
  return crypto.randomUUID();
}

const PREP_JS_CODE = `const input = $input.first().json;
const action = (() => {
  try { return ($('Input Normalizer').first().json.action || 'create').toLowerCase(); } catch(e) { return 'create'; }
})();
const oldOrderId = input.Order_ID;
const newOrderId = (() => {
  try { return $('Input Normalizer').first().json.New_Order_ID || null; } catch(e) { return null; }
})();

const staticData = $getWorkflowStaticData('global');
const supabaseActive = staticData.supabase_mirror_enabled !== false;

const SUPABASE_KEY = (() => { try { return process.env.SUPABASE_SERVICE_KEY; } catch(e) { return null; } })()
  || 'sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq';

// Build lookup from original webhook items to preserve UI-edited process_status & batch_number
let uiItemMap = {};
try {
  const triggerBody = $('Receive Dashboard Order').first().json.body || $('Receive Dashboard Order').first().json;
  (triggerBody.Order_Items_List || []).forEach(function(it) {
    if (it.Order_Item_Key) {
      uiItemMap[it.Order_Item_Key] = {
        process_status: it._ui_process_status || null,
        batch_number: it._ui_batch_number || null
      };
    }
  });
} catch(e) { /* Receive Dashboard Order not in scope */ }

let rawFormState = {};
try {
  rawFormState = typeof input.Raw_Form_State === 'string'
    ? JSON.parse(input.Raw_Form_State || '{}')
    : (input.Raw_Form_State || {});
} catch(e) { rawFormState = { raw: String(input.Raw_Form_State) }; }

const order = {
  customer_name: input.Customer_Name || oldOrderId,
  appointment_at: input.Appointment_Date || null,
  final_sale_price: input.Total_Revenue || 0,
  total_cost: input.Total_Cost || 0,
  net_profit: input.Final_Profit || 0,
  deposit: input.Deposit || 0,
  balance: input.Balance || 0,
  additional_fee: input.Additional_Fee || 0,
  full_order_text: input.Order_Text || '',
  handmodel_cost: input.Handmodel_Cost_Total || 0,
  keychain_cost: input.Keychain_Cost_Total || 0,
  necklace_cost: input.Necklace_Cost_Total || 0,
  n8n_cost_adjustments: Number(input.N8n_Cost_Adjustments) || 0,
  n8n_adjustment_notes: input.N8n_Adjustment_Notes || [],
  raw_form_state: rawFormState
};

if (action === 'create') {
  order.process_status = '待確認';
  if (input.Order_Confirm_Date) {
    order.confirmed_at = input.Order_Confirm_Date;
  }
}

const items = (input.Sub_Items || []).map((item, index) => {
  const ui = uiItemMap[item.Order_Item_Key] || {};
  return {
    item_key: item.Order_Item_Key || (oldOrderId + '_' + index + '_AUTO'),
    product_sku: item.Product_Name || null,
    item_category: item.Item_Category || null,
    quantity: item.Quantity || 1,
    item_base_cost: item.Total_Base_Cost || 0,
    subtotal_cost: item.Total_Base_Cost || 0,
    handmodel_cost: item.Handmodel_Cost || 0,
    keychain_cost: item.Keychain_Cost || 0,
    necklace_cost: item.Necklace_Cost || 0,
    specification: item.Notes || '',
    process_status: ui.process_status || null,
    batch_number: ui.batch_number || null
  };
});

return [{
  json: {
    supabaseActive,
    supabaseKey: SUPABASE_KEY,
    rpcPayload: {
      p_action: action,
      p_old_order_id: oldOrderId,
      p_new_order_id: newOrderId,
      p_order: order,
      p_items: items
    }
  }
}];`;

async function main() {
  console.log('Reading local clean workflow...');
  const localWfPath = path.resolve(__dirname, '../n8n/FHS_Core_OrderProcessor_live.json');
  const wf = JSON.parse(fs.readFileSync(localWfPath, 'utf8'));

  console.log('Original nodes count:', wf.nodes.length);

  // 1. Clean up existing nodes (including previously added ones)
  const nodesToClean = [
    'Mirror to Supabase',
    'Supabase Mirror Prep',
    'Supabase Active Switch',
    'HTTP: Supabase Sync RPC',
    'Mirror Delete to Supabase'
  ];
  wf.nodes = wf.nodes.filter(n => !nodesToClean.includes(n.name));

  // 2. Add "Supabase Mirror Prep"
  const prepNode = {
    id: generateUuid(),
    name: 'Supabase Mirror Prep',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [32000, 7800],
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: PREP_JS_CODE
    }
  };
  wf.nodes.push(prepNode);

  // 3. Add "Supabase Active Switch"
  const switchNode = {
    id: generateUuid(),
    name: 'Supabase Active Switch',
    type: 'n8n-nodes-base.switch',
    typeVersion: 1,
    position: [32250, 7800],
    parameters: {
      mode: 'rules',
      dataType: 'boolean',
      value1: '={{ $json.supabaseActive }}',
      rules: {
        rules: [
          {
            operation: 'equal',
            value2: true,
            output: 0
          }
        ]
      },
      fallbackOutput: 1
    }
  };
  wf.nodes.push(switchNode);

  // 4. Add "HTTP: Supabase Sync RPC"
  const rpcNode = {
    id: generateUuid(),
    name: 'HTTP: Supabase Sync RPC',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.1,
    position: [32500, 7920],
    parameters: {
      method: 'POST',
      url: 'https://vpmwizzixnwilmzctdvu.supabase.co/rest/v1/rpc/sync_order_to_mirror',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.rpcPayload) }}',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'apikey',
            value: '={{ $json.supabaseKey }}'
          },
          {
            name: 'Authorization',
            value: '={{ \'Bearer \' + $json.supabaseKey }}'
          },
          {
            name: 'Content-Type',
            value: 'application/json'
          }
        ]
      },
      options: {}
    }
  };
  wf.nodes.push(rpcNode);

  // 5. Remove "Mirror Delete to Supabase" and add new HTTP Request version
  wf.nodes = wf.nodes.filter(n => n.name !== 'Mirror Delete to Supabase');
  const deleteNode = {
    id: generateUuid(),
    name: 'Mirror Delete to Supabase',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.1,
    position: [31920, 6950],
    parameters: {
      method: 'PATCH',
      url: 'https://vpmwizzixnwilmzctdvu.supabase.co/rest/v1/orders?order_id=eq.{{ encodeURIComponent($(\'Receive Dashboard Order\').first().json.body?.Order_ID || $(\'Receive Dashboard Order\').first().json.Order_ID) }}',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify({ deleted_at: new Date().toISOString() }) }}',
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'apikey',
            value: 'sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq'
          },
          {
            name: 'Authorization',
            value: 'Bearer sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq'
          },
          {
            name: 'Content-Type',
            value: 'application/json'
          },
          {
            name: 'Prefer',
            value: 'return=minimal'
          }
        ]
      },
      options: {}
    }
  };
  wf.nodes.push(deleteNode);

  // --- Adjust Connections ---
  if (wf.connections['Calculate Profit & Pack Items'] && wf.connections['Calculate Profit & Pack Items'].main) {
    wf.connections['Calculate Profit & Pack Items'].main[0] = wf.connections['Calculate Profit & Pack Items'].main[0].map(conn => {
      if (conn.node === 'Mirror to Supabase') {
        return { node: 'Supabase Mirror Prep', type: 'main', index: 0 };
      }
      return conn;
    });
  }

  delete wf.connections['Mirror to Supabase'];

  wf.connections['Supabase Mirror Prep'] = {
    main: [
      [
        {
          node: 'Supabase Active Switch',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  wf.connections['Supabase Active Switch'] = {
    main: [
      [
        {
          node: 'HTTP: Supabase Sync RPC',
          type: 'main',
          index: 0
        }
      ],
      [
        {
          node: 'Pack Telegram Data',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  wf.connections['HTTP: Supabase Sync RPC'] = {
    main: [
      [
        {
          node: 'Pack Telegram Data',
          type: 'main',
          index: 0
        }
      ]
    ]
  };

  console.log('Updated nodes count:', wf.nodes.length);

  wf.nodes.forEach(node => {
    delete node.issues;
  });

  const updatedWf = {
    name: wf.name,
    nodes: wf.nodes,
    connections: wf.connections,
    settings: {}
  };

  console.log('Pushing updated workflow to n8n...');
  const { status: s2, body: result } = await apiRequest('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, updatedWf);
  if (s2 !== 200) { console.error('PUT failed:', s2, result); process.exit(1); }
  console.log('Successfully refactored n8n workflow to native HTTP nodes!');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
