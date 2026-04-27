/**
 * deploy-order-confirm-date.js
 * 透過 n8n REST API 將 Order_Confirm_Date 欄位映射加入
 * "Create Main Order" Airtable 節點
 *
 * 執行：node scripts/deploy-order-confirm-date.js --dry-run
 *       node scripts/deploy-order-confirm-date.js
 */

require('dotenv').config();
const https = require('https');

const DRY_RUN = process.argv.includes('--dry-run');
const N8N_KEY = process.env.N8N_KEY;
const N8N_INSTANCE = process.env.N8N_INSTANCE;
const WORKFLOW_ID = '6Ljih0hSKr9RpYNm';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(N8N_INSTANCE + path);
    const opts = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'X-N8N-API-KEY': N8N_KEY,
        'Content-Type': 'application/json',
      },
      rejectUnauthorized: false, // NAS 自簽憑證
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('  Deploy: Order_Confirm_Date → n8n');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN' : '🚀 LIVE'}`);
  console.log('═══════════════════════════════════════════\n');

  // 1. 取得完整工作流
  console.log('📥 Fetching workflow...');
  const { status: getStatus, body: workflow } = await request('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  if (getStatus !== 200) {
    console.error('❌ GET failed:', getStatus, workflow);
    process.exit(1);
  }
  console.log(`   ✓ Workflow: "${workflow.name}" (${workflow.nodes.length} nodes)\n`);

  // 2. 找到 "Create Main Order" 節點
  const targetNode = workflow.nodes.find(n => n.name === 'Create Main Order');
  if (!targetNode) {
    console.error('❌ "Create Main Order" node not found');
    process.exit(1);
  }

  const currentFields = targetNode.parameters?.columns?.value || {};
  console.log('📋 Current field mappings in Create Main Order:');
  Object.keys(currentFields).forEach(k => console.log(`   - ${k}`));

  // 3. 檢查是否已有 Order_Confirm_Date
  if (currentFields['Order_Confirm_Date']) {
    console.log('\n✅ Order_Confirm_Date already present — nothing to do.');
    return;
  }

  // 4. 加入新欄位
  targetNode.parameters.columns.value['Order_Confirm_Date'] = '={{ $json.Order_Confirm_Date || null }}';
  console.log('\n➕ Added: Order_Confirm_Date = {{ $json.Order_Confirm_Date || null }}');

  if (DRY_RUN) {
    console.log('\n✓ [DRY] Would PUT workflow back to n8n');
    console.log('\n新 field mappings 預覽:');
    Object.keys(targetNode.parameters.columns.value).forEach(k =>
      console.log(`   - ${k}: ${targetNode.parameters.columns.value[k]}`)
    );
    console.log('\n═══════════════════════════════════════════');
    console.log('  Dry run 完成，無寫入。');
    console.log('═══════════════════════════════════════════');
    return;
  }

  // 5. PUT 回 n8n（需先 deactivate → PUT → reactivate）
  console.log('\n⏸  Deactivating workflow...');
  await request('PATCH', `/api/v1/workflows/${WORKFLOW_ID}`, { active: false });

  console.log('📤 Uploading updated workflow...');
  // n8n v1 API: PUT /workflows/{id} — only accepted fields
  // n8n PUT only accepts specific settings keys
  const { executionOrder, timezone, saveManualExecutions, saveExecutionProgress,
          saveDataSuccessExecution, saveDataErrorExecution, executionTimeout,
          errorWorkflow } = workflow.settings || {};
  const putBody = {
    name: workflow.name,
    nodes: workflow.nodes,
    connections: workflow.connections,
    settings: { executionOrder, timezone, saveManualExecutions, saveExecutionProgress,
                saveDataSuccessExecution, saveDataErrorExecution, executionTimeout, errorWorkflow },
    staticData: workflow.staticData || null,
  };
  const { status: putStatus, body: putResult } = await request('PUT', `/api/v1/workflows/${WORKFLOW_ID}`, putBody);

  if (putStatus !== 200) {
    console.error('❌ PUT failed:', putStatus, JSON.stringify(putResult).slice(0, 500));
    // 嘗試重新啟動
    await request('PATCH', `/api/v1/workflows/${WORKFLOW_ID}`, { active: true });
    process.exit(1);
  }
  console.log('   ✓ Workflow updated');

  console.log('▶  Reactivating workflow...');
  await request('PATCH', `/api/v1/workflows/${WORKFLOW_ID}`, { active: true });
  console.log('   ✓ Workflow active\n');

  // 6. 驗證
  const { body: verify } = await request('GET', `/api/v1/workflows/${WORKFLOW_ID}`);
  const verifyNode = verify.nodes.find(n => n.name === 'Create Main Order');
  const hasField = verifyNode?.parameters?.columns?.value?.['Order_Confirm_Date'];
  console.log(`✅ Verification: Order_Confirm_Date ${hasField ? 'PRESENT ✓' : 'MISSING ✗'}`);

  console.log('\n═══════════════════════════════════════════');
  console.log('  Deploy 完成！');
  console.log('═══════════════════════════════════════════');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
