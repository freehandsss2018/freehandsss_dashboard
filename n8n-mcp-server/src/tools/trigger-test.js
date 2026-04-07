/**
 * Tool: trigger_test_execution
 * 觸發 workflow 測試執行，僅接受 mock payload
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { triggerTestExecution } from '../n8n-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PAYLOADS_DIR = resolve(__dirname, '..', '..', 'test-payloads');

const ALLOWED_PAYLOADS = ['mock_create_order', 'mock_edit_order', 'mock_delete_order'];

export const definition = {
  name: 'trigger_test_execution',
  description:
    'Trigger a test execution of FHS_Core_OrderProcessor using a predefined mock payload. ' +
    'Only accepts: mock_create_order, mock_edit_order, mock_delete_order.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        default: '6Ljih0hSKr9RpYNm',
      },
      payloadName: {
        type: 'string',
        description: 'Name of mock payload (without .json extension)',
        enum: ALLOWED_PAYLOADS,
      },
    },
    required: ['payloadName'],
  },
};

export async function handler({ workflowId = '6Ljih0hSKr9RpYNm', payloadName }) {
  if (!ALLOWED_PAYLOADS.includes(payloadName)) {
    throw new Error(
      `Payload "${payloadName}" not allowed. Use one of: ${ALLOWED_PAYLOADS.join(', ')}`
    );
  }

  const filePath = resolve(PAYLOADS_DIR, `${payloadName}.json`);
  const raw = readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(raw);

  const result = await triggerTestExecution(workflowId, payload);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            payloadName,
            workflowId,
            executionId: result.id || result.executionId,
            status: result.status || 'triggered',
            result,
          },
          null,
          2
        ),
      },
    ],
  };
}
