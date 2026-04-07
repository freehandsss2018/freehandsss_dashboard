/**
 * Tool: rollback_node_code
 * 從備份檔完整回復節點
 */

import { readFileSync } from 'fs';
import { updateNodeCode } from '../n8n-client.js';

export const definition = {
  name: 'rollback_node_code',
  description:
    'Restore a Code node to a previous version using a backup file. ' +
    'The backup file is a JSON snapshot created by update_node_code.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        default: '6Ljih0hSKr9RpYNm',
      },
      nodeName: {
        type: 'string',
        description: 'Exact node name to restore',
      },
      backupFile: {
        type: 'string',
        description: 'Absolute path to the backup JSON file',
      },
    },
    required: ['nodeName', 'backupFile'],
  },
};

export async function handler({ workflowId = '6Ljih0hSKr9RpYNm', nodeName, backupFile }) {
  const raw = readFileSync(backupFile, 'utf-8');
  const backup = JSON.parse(raw);

  const oldCode = backup.parameters?.jsCode;
  if (!oldCode) {
    throw new Error(`Backup file does not contain jsCode for node "${nodeName}"`);
  }

  const result = await updateNodeCode(workflowId, nodeName, oldCode);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            mode: 'ROLLBACK — restored from backup',
            ...result,
            backupFile,
            restoredCodeLength: oldCode.length,
          },
          null,
          2
        ),
      },
    ],
  };
}
