const https = require('https');
const { randomUUID } = require('crypto');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YmQ0NWY3Ni0zMDdkLTQ2ZmItYmU0Ny1kNzExZTMxMjAzZmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDdjOTQ2NjItMjI5Mi00NTQ3LTkwN2MtMmEwMjQ0OTkxYjVhIiwiaWF0IjoxNzc0Njc1MDcyfQ.kEDQ_sk2wWKU9bwWbN3yXJOLK1PNr1EjJwl2qUXOqIQ';
const CRED_ID = 'lON99lpYk558mFdA';
const CRED_NAME = 'Airtable Personal Access Token account';

// Aggregator reads from $input (merged data passed via context)
// We use a different approach: sequential execution, not parallel
// Main Orders -> Order Items (pass main orders data via context) -> Aggregator

const aggregatorCode = `
// Both datasets passed via Set node as JSON strings
const allData = $input.first().json;
const orders = allData.mainOrders || [];
const orderItems = allData.orderItems || [];

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}
function sum(arr, field) {
  return arr.reduce((s, o) => s + (Number(o[field]) || 0), 0);
}
function pct(cur, prev) {
  if (!prev) return 0;
  return Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;
}

const MONTH_ZH = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];

function ordersInMonth(y, m) {
  return orders.filter(o => {
    const d = parseDate(o.Appointment_Date);
    if (!d) return false;
    return d.getFullYear() === y && d.getMonth() === m;
  });
}
function ordersInYear(y) {
  return orders.filter(o => {
    const d = parseDate(o.Appointment_Date);
    if (!d) return false;
    return d.getFullYear() === y;
  });
}

const curOrders = ordersInMonth(currentYear, currentMonth);
const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
const prevMY = currentMonth === 0 ? currentYear - 1 : currentYear;
const prevMOrders = ordersInMonth(prevMY, prevM);

const curRevenue = sum(curOrders, 'Final_Sale_Price');
const curCost = sum(curOrders, 'Total_Cost');
const curProfit = sum(curOrders, 'Net_Profit');

const monthLabelsZH = [];
const monthRevenues = [];
const monthProfits = [];
for (let i = 7; i >= 0; i--) {
  let m = currentMonth - i;
  let y = currentYear;
  while (m < 0) { m += 12; y--; }
  const mo = ordersInMonth(y, m);
  monthLabelsZH.push(MONTH_ZH[m]);
  monthRevenues.push(sum(mo, 'Final_Sale_Price'));
  monthProfits.push(sum(mo, 'Net_Profit'));
}

const yearLabels = [];
const yearRevenues = [];
const yearProfits = [];
for (let y = currentYear - 7; y <= currentYear; y++) {
  const yo = ordersInYear(y);
  yearLabels.push(String(y));
  yearRevenues.push(sum(yo, 'Final_Sale_Price'));
  yearProfits.push(sum(yo, 'Net_Profit'));
}

const yearOrders = ordersInYear(currentYear);
const prevYearOrders = ordersInYear(currentYear - 1);
const allYearRevenue = sum(yearOrders, 'Final_Sale_Price');
const allYearCost = sum(yearOrders, 'Total_Cost');
const allYearProfit = sum(yearOrders, 'Net_Profit');

const CATEGORIES = ['木框套裝','玻璃瓶套裝','鎖匙扣','吊飾','配件'];
const catQty = {'木框套裝':0,'玻璃瓶套裝':0,'鎖匙扣':0,'吊飾':0,'配件':0};
orderItems.forEach(item => {
  const links = item.Product_Link || [];
  const name = (Array.isArray(links) ? links[0] : links) || '';
  const qty = Number(item.Quantity) || 1;
  if (name.includes('木框')) catQty['木框套裝'] += qty;
  else if (name.includes('玻璃')) catQty['玻璃瓶套裝'] += qty;
  else if (name.includes('鎖匙')) catQty['鎖匙扣'] += qty;
  else if (name.includes('吊飾')) catQty['吊飾'] += qty;
  else catQty['配件'] += qty;
});
const totalQty = Object.values(catQty).reduce((s,v) => s+v, 0) || 1;
function catValues(base) { return CATEGORIES.map(c => Math.round((catQty[c]/totalQty)*base)); }

const PIE_LABELS = ['原材料','包裝','人工','運費','雜項'];
const PIE_RATIOS = [0.50,0.17,0.23,0.07,0.03];
const PIE_COLORS = ['#C9714A','#D4956E','#7A6A55','#2E7D32','#B0A090'];
function pieValues(tc) { return PIE_RATIOS.map(r => Math.round(tc*r)); }

const result = {
  current: {
    revenue: curRevenue, cost: curCost, profit: curProfit, orders: curOrders.length,
    revenueChange: pct(curRevenue, sum(prevMOrders,'Final_Sale_Price')),
    costChange: pct(curCost, sum(prevMOrders,'Total_Cost')),
    profitChange: pct(curProfit, sum(prevMOrders,'Net_Profit')),
    ordersChange: curOrders.length - prevMOrders.length,
    lineChart: {labels:monthLabelsZH, revenue:monthRevenues, profit:monthProfits},
    barChart: {labels:CATEGORIES, values:catValues(curRevenue)},
    pieChart: {labels:PIE_LABELS, values:pieValues(curCost), colors:PIE_COLORS}
  },
  monthly: {
    revenue: allYearRevenue, cost: allYearCost, profit: allYearProfit, orders: yearOrders.length,
    revenueChange: pct(allYearRevenue, sum(prevYearOrders,'Final_Sale_Price')),
    costChange: pct(allYearCost, sum(prevYearOrders,'Total_Cost')),
    profitChange: pct(allYearProfit, sum(prevYearOrders,'Net_Profit')),
    ordersChange: yearOrders.length - prevYearOrders.length,
    lineChart: {labels:monthLabelsZH, revenue:monthRevenues, profit:monthProfits},
    barChart: {labels:CATEGORIES, values:catValues(allYearRevenue)},
    pieChart: {labels:PIE_LABELS, values:pieValues(allYearCost), colors:PIE_COLORS}
  },
  yearly: {
    revenue: sum(orders,'Final_Sale_Price'), cost: sum(orders,'Total_Cost'), profit: sum(orders,'Net_Profit'), orders: orders.length,
    revenueChange: pct(allYearRevenue, sum(prevYearOrders,'Final_Sale_Price')),
    costChange: pct(allYearCost, sum(prevYearOrders,'Total_Cost')),
    profitChange: pct(allYearProfit, sum(prevYearOrders,'Net_Profit')),
    ordersChange: yearOrders.length - prevYearOrders.length,
    lineChart: {labels:yearLabels, revenue:yearRevenues, profit:yearProfits},
    barChart: {labels:CATEGORIES, values:catValues(sum(orders,'Final_Sale_Price'))},
    pieChart: {labels:PIE_LABELS, values:pieValues(sum(orders,'Total_Cost')), colors:PIE_COLORS}
  }
};
return [{json: result}];
`.trim();

// Collect Main Orders into array
const collectMainOrdersCode = `
const items = $input.all();
const mainOrders = items.map(i => i.json.fields || i.json);
return [{json: {mainOrders}}];
`.trim();

// Collect Order Items and merge with main orders from context
const collectOrderItemsCode = `
const items = $input.all();
const orderItems = items.map(i => i.json.fields || i.json);
const mainOrders = $('Collect Main Orders').first().json.mainOrders || [];
return [{json: {mainOrders, orderItems}}];
`.trim();

const workflow = {
  name: 'FHS_Financial_Overview',
  nodes: [
    {
      id: randomUUID(),
      parameters: {
        httpMethod: 'GET',
        path: 'financial-overview-fhs',
        responseMode: 'responseNode',
        options: {}
      },
      name: 'FO Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [240, 300],
      webhookId: randomUUID()
    },
    {
      id: randomUUID(),
      parameters: {
        operation: 'search',
        base: { value: 'app9GuLsW9frN4xaT', mode: 'id' },
        table: { value: 'tbltCH0I9fknVCtmV', mode: 'id' },
        returnAll: true,
        options: {}
      },
      name: 'Fetch All Main Orders',
      type: 'n8n-nodes-base.airtable',
      typeVersion: 2,
      position: [460, 300],
      credentials: {
        airtableTokenApi: { id: CRED_ID, name: CRED_NAME }
      }
    },
    {
      id: randomUUID(),
      parameters: { jsCode: collectMainOrdersCode },
      name: 'Collect Main Orders',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [680, 300]
    },
    {
      id: randomUUID(),
      parameters: {
        operation: 'search',
        base: { value: 'app9GuLsW9frN4xaT', mode: 'id' },
        table: { value: 'tbljkptnNcUEyDRFH', mode: 'id' },
        returnAll: true,
        options: {}
      },
      name: 'Fetch All Order Items',
      type: 'n8n-nodes-base.airtable',
      typeVersion: 2,
      position: [900, 300],
      credentials: {
        airtableTokenApi: { id: CRED_ID, name: CRED_NAME }
      }
    },
    {
      id: randomUUID(),
      parameters: { jsCode: collectOrderItemsCode },
      name: 'Merge Datasets',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1120, 300]
    },
    {
      id: randomUUID(),
      parameters: { jsCode: aggregatorCode },
      name: 'Financial Aggregator',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [1340, 300]
    },
    {
      id: randomUUID(),
      parameters: {
        respondWith: 'json',
        responseBody: '={{ JSON.stringify($json) }}',
        options: {
          responseHeaders: {
            entries: [
              { name: 'Access-Control-Allow-Origin', value: '*' },
              { name: 'Content-Type', value: 'application/json' }
            ]
          }
        }
      },
      name: 'Respond with JSON',
      type: 'n8n-nodes-base.respondToWebhook',
      typeVersion: 1,
      position: [1560, 300]
    }
  ],
  connections: {
    'FO Webhook': {
      main: [[{ node: 'Fetch All Main Orders', type: 'main', index: 0 }]]
    },
    'Fetch All Main Orders': {
      main: [[{ node: 'Collect Main Orders', type: 'main', index: 0 }]]
    },
    'Collect Main Orders': {
      main: [[{ node: 'Fetch All Order Items', type: 'main', index: 0 }]]
    },
    'Fetch All Order Items': {
      main: [[{ node: 'Merge Datasets', type: 'main', index: 0 }]]
    },
    'Merge Datasets': {
      main: [[{ node: 'Financial Aggregator', type: 'main', index: 0 }]]
    },
    'Financial Aggregator': {
      main: [[{ node: 'Respond with JSON', type: 'main', index: 0 }]]
    }
  },
  settings: { executionOrder: 'v1' }
};

function callApi(path, method, body) {
  return new Promise(resolve => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: 'yanhei.synology.me', port: 8443, path, method,
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr || '')
      },
      rejectUnauthorized: false
    };
    const req = https.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, raw: data.substring(0, 500) }); }
      });
    });
    req.on('error', e => resolve({ error: e.message }));
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log('Creating workflow (sequential pipeline)...');
  const create = await callApi('/api/v1/workflows', 'POST', workflow);
  console.log('Create status:', create.status);

  if (!create.body || !create.body.id) {
    console.log('Failed:', JSON.stringify(create).substring(0, 800));
    return;
  }

  const wfId = create.body.id;
  const wh = (create.body.nodes || []).find(n => n.type === 'n8n-nodes-base.webhook');
  const webhookPath = wh ? wh.parameters.path : 'financial-overview-fhs';

  console.log('Workflow ID:', wfId);
  console.log('Webhook path:', webhookPath);

  await new Promise(r => setTimeout(r, 1000));

  console.log('Activating...');
  const activate = await callApi('/api/v1/workflows/' + wfId + '/activate', 'POST', null);
  console.log('Active:', activate.body.active);

  await new Promise(r => setTimeout(r, 2000));

  console.log('Testing webhook...');
  const test = await callApi('/webhook/' + webhookPath, 'GET', null);
  console.log('Test status:', test.status);

  if (test.body && test.body.current) {
    console.log('\n=== SUCCESS ===');
    console.log('Revenue:', test.body.current.revenue);
    console.log('Profit:', test.body.current.profit);
    console.log('Orders:', test.body.current.orders);
  } else {
    console.log('Response:', JSON.stringify(test.body || test.raw).substring(0, 400));

    // Check execution log
    await new Promise(r => setTimeout(r, 2000));
    const execs = await callApi('/api/v1/executions?workflowId=' + wfId + '&limit=1', 'GET', null);
    const exec = (execs.body.data || [])[0];
    if (exec) {
      console.log('\nExecution status:', exec.status);
      const detail = await callApi('/api/v1/executions/' + exec.id + '?includeData=true', 'GET', null);
      const rd = detail.body.data && detail.body.data.resultData;
      if (rd && rd.error) console.log('Error:', rd.error.message);
      if (rd && rd.runData) {
        Object.entries(rd.runData).forEach(([name, runs]) => {
          const last = runs[runs.length - 1];
          if (last && last.error) console.log('Node error in', name, ':', last.error.message);
        });
      }
    }
  }

  console.log('\n=== FINAL ===');
  console.log('Workflow ID:', wfId);
  console.log('Webhook URL: https://yanhei.synology.me:8443/webhook/' + webhookPath);
}

run().catch(console.error);
