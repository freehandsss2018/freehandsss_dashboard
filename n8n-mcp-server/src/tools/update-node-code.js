/**
 * Tool: update_node_code
 * 更新指定 code node 的 jsCode
 * 預設 dry-run，未經 /execute 授權不得真正寫入
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getNode, updateNodeCode } from '../n8n-client.js';
import config from '../config.js';

export const definition = {
  name: 'update_node_code',
  description:
    'Update jsCode of a Code node. DEFAULT: dry-run mode (preview only). ' +
    'Set dryRun=false ONLY after explicit /execute authorization from Fat Mo. ' +
    'Automatically backs up the original node before any real write.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        default: '6Ljih0hSKr9RpYNm',
      },
      nodeName: {
        type: 'string',
        description: 'Exact node name',
      },
      newCode: {
        type: 'string',
        description: 'New jsCode content',
      },
      dryRun: {
        type: 'boolean',
        description: 'Preview mode (default: true). Set false only with /execute authorization.',
        default: true,
      },
    },
    required: ['nodeName', 'newCode'],
  },
};

function backupNode(workflowId, nodeName, nodeData) {
  const date = new Date().toISOString().slice(0, 10);
  const safeName = nodeName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = resolve(config.backupBasePath, date, workflowId);
  mkdirSync(dir, { recursive: true });
  const filePath = resolve(dir, `${safeName}.json`);
  writeFileSync(filePath, JSON.stringify(nodeData, null, 2), 'utf-8');
  return filePath;
}

export async function handler({
  workflowId = '6Ljih0hSKr9RpYNm',
  nodeName,
  newCode,
  dryRun = true,
}) {
  // 讀取當前節點
  const { node } = await getNode(workflowId, nodeName);
  const oldCode = node.parameters?.jsCode || '';

  if (dryRun) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              mode: 'DRY-RUN (preview only)',
              nodeName,
              workflowId,
              oldCodeLength: oldCode.length,
              newCodeLength: newCode.length,
              oldCodePreview: oldCode.slice(0, 500),
              newCodePreview: newCode.slice(0, 500),
              message:
                'No changes written. To apply, call again with dryRun=false after /execute authorization.',
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // 真正寫入前：備份
  const backupPath = backupNode(workflowId, nodeName, node);

  // 執行更新
  const result = await updateNodeCode(workflowId, nodeName, newCode);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            mode: 'LIVE — changes applied',
            ...result,
            backupPath,
            rollbackHint: `Use rollback_node_code with backup file: ${backupPath}`,
          },
          null,
          2
        ),
      },
    ],
  };
}
