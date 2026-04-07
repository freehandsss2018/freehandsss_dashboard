/**
 * Tool: verify_triple_sync
 * 驗證 Dashboard Payload、n8n Mapping、Airtable Schema 三端一致性
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getWorkflow } from '../n8n-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..', '..');

export const definition = {
  name: 'verify_triple_sync',
  description:
    'Check Dashboard Payload ↔ n8n Mapping ↔ Airtable Schema alignment. ' +
    'Reads Triple_Sync_Field_Map.md and compares against live workflow nodes.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        default: '6Ljih0hSKr9RpYNm',
      },
    },
  },
};

export async function handler({ workflowId = '6Ljih0hSKr9RpYNm' }) {
  const checks = [];
  let fieldMapContent = '';

  // 1. 讀取 Triple_Sync_Field_Map.md
  try {
    const mapPath = resolve(PROJECT_ROOT, 'n8n', 'Triple_Sync_Field_Map.md');
    fieldMapContent = readFileSync(mapPath, 'utf-8');
    checks.push({ check: 'Triple_Sync_Field_Map.md readable', status: 'PASS' });
  } catch (err) {
    checks.push({
      check: 'Triple_Sync_Field_Map.md readable',
      status: 'FAIL',
      detail: err.message,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify({ checks, overall: 'FAIL' }, null, 2) }],
    };
  }

  // 2. 讀取 live workflow
  let wf;
  try {
    wf = await getWorkflow(workflowId);
    checks.push({
      check: 'Live workflow reachable',
      status: 'PASS',
      detail: `${wf.nodes.length} nodes`,
    });
  } catch (err) {
    checks.push({
      check: 'Live workflow reachable',
      status: 'FAIL',
      detail: err.message,
    });
    return {
      content: [{ type: 'text', text: JSON.stringify({ checks, overall: 'FAIL' }, null, 2) }],
    };
  }

  // 3. 比對 Field Map 提到的節點是否都存在於 live workflow
  const liveNodeNames = new Set(wf.nodes.map((n) => n.name));
  const mapMentionedNodes = [
    'Receive Dashboard Order',
    'Input Normalizer',
    'Switch Action',
    'Profit Auditor',
    'Parse Items & Generate SKU',
    'Batch SKU Collector',
    'Fetch Exact Base Cost',
    'Local Data Mapper',
    'Calculate Profit & Pack Items',
    'Create Main Order',
    'Bind Main Order ID',
    'Create Sub Items',
    'Pack Telegram Data',
    'Send Profit Report',
  ];

  const missingNodes = mapMentionedNodes.filter((n) => !liveNodeNames.has(n));
  checks.push({
    check: 'Node alignment (FieldMap vs Live)',
    status: missingNodes.length === 0 ? 'PASS' : 'WARN',
    detail:
      missingNodes.length === 0
        ? `All ${mapMentionedNodes.length} mapped nodes exist in live workflow`
        : `Missing: ${missingNodes.join(', ')}`,
  });

  // 4. 檢查 Workflow ID 一致
  const mapIdMatch = fieldMapContent.includes(workflowId);
  checks.push({
    check: 'Workflow ID matches FieldMap',
    status: mapIdMatch ? 'PASS' : 'FAIL',
    detail: mapIdMatch ? workflowId : 'ID not found in Triple_Sync_Field_Map.md',
  });

  // 5. 檢查 Airtable Base ID 一致
  const airtableBaseId = 'app9GuLsW9frN4xaT';
  const baseIdInMap = fieldMapContent.includes(airtableBaseId);
  checks.push({
    check: 'Airtable Base ID in FieldMap',
    status: baseIdInMap ? 'PASS' : 'WARN',
    detail: baseIdInMap ? airtableBaseId : 'Base ID not found',
  });

  // 6. 額外節點（live 有但 map 沒提）
  const extraNodes = [...liveNodeNames].filter(
    (n) => !mapMentionedNodes.includes(n) && n !== 'Workflow Description'
  );
  checks.push({
    check: 'Extra nodes in live (not in core map)',
    status: 'INFO',
    detail: extraNodes.join(', ') || 'none',
  });

  const overall = checks.some((c) => c.status === 'FAIL') ? 'FAIL' : 'PASS';

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ workflowId, overall, checks }, null, 2),
      },
    ],
  };
}
