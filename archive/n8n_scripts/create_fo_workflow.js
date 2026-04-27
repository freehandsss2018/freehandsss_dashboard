const https = require('https');

const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YmQ0NWY3Ni0zMDdkLTQ2ZmItYmU0Ny1kNzExZTMxMjAzZmIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNDdjOTQ2NjItMjI5Mi00NTQ3LTkwN2MtMmEwMjQ0OTkxYjVhIiwiaWF0IjoxNzc0Njc1MDcyfQ.kEDQ_sk2wWKU9bwWbN3yXJOLK1PNr1EjJwl2qUXOqIQ';
const CRED_ID = 'lON99lpYk558mFdA';
const CRED_NAME = 'Airtable Personal Access Token account';

const aggregatorCode = `
const orders = $('Fetch All Main Orders').all().map(i => i.json.fields || i.json);
const orderItems = $('Fetch All Order Items').all().map(i => i.json.fields || i.json);
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

const workflow = {
  name: 'FHS_Financial_Overview',
  nodes: [
    {
      parameters: {
        httpMethod: 'GET',
        path: 'financial-overview',
        responseMode: 'responseNode',
        options: {}
      },
      name: 'FO Webhook',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 1,
      position: [240, 300]
    },
    {
      parameters: {
        operation: 'list',
        base: { value: 'app9GuLsW9frN4xaT', mode: 'id' },
        table: { value: 'tbltCH0I9fknVCtmV', mode: 'id' },
        returnAll: true,
        options: {
          fields: ['Order_ID', 'Appointment_Date', 'Final_Sale_Price', 'Total_Cost', 'Net_Profit']
        }
      },
      name: 'Fetch All Main Orders',
      type: 'n8n-nodes-base.airtable',
      typeVersion: 2,
      position: [460, 180],
      credentials: {
        airtableTokenApi: { id: CRED_ID, name: CRED_NAME }
      }
    },
    {
      parameters: {
        operation: 'list',
        base: { value: 'app9GuLsW9frN4xaT', mode: 'id' },
        table: { value: 'tbljkptnNcUEyDRFH', mode: 'id' },
        returnAll: true,
        options: {
          fields: ['Order_Item_Key', 'Product_Link', 'Quantity', 'Order_Link']
        }
      },
      name: 'Fetch All Order Items',
      type: 'n8n-nodes-base.airtable',
      typeVersion: 2,
      position: [460, 420],
      credentials: {
        airtableTokenApi: { id: CRED_ID, name: CRED_NAME }
      }
    },
    {
      parameters: {
        jsCode: aggregatorCode
      },
      name: 'Financial Aggregator',
      type: 'n8n-nodes-base.code',
      typeVersion: 2,
      position: [700, 300]
    },
    {
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
      position: [940, 300]
    }
  ],
  connections: {
    'FO Webhook': {
      main: [[
        { node: 'Fetch All Main Orders', type: 'main', index: 0 },
        { node: 'Fetch All Order Items', type: 'main', index: 0 }
      ]]
    },
    'Fetch All Main Orders': {
      main: [[{ node: 'Financial Aggregator', type: 'main', index: 0 }]]
    },
    'Fetch All Order Items': {
      main: [[{ node: 'Financial Aggregator', type: 'main', index: 0 }]]
    },
    'Financial Aggregator': {
      main: [[{ node: 'Respond with JSON', type: 'main', index: 0 }]]
    }
  },
  settings: { executionOrder: 'v1' }
};

const body = JSON.stringify(workflow);

const options = {
  hostname: 'yanhei.synology.me',
  port: 8443,
  path: '/api/v1/workflows',
  method: 'POST',
  headers: {
    'X-N8N-API-KEY': API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  },
  rejectUnauthorized: false
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const j = JSON.parse(data);
      if (j.id) {
        console.log('SUCCESS! Workflow ID:', j.id);
        console.log('Name:', j.name);
      } else {
        console.log('Response:', JSON.stringify(j, null, 2).substring(0, 1000));
      }
    } catch(e) {
      console.log('Raw:', data.substring(0, 500));
    }
  });
});
req.on('error', e => console.log('Error:', e.message));
req.write(body);
req.end();
