/**
 * Tool: get_node
 * 讀取指定節點的內容與 jsCode
 */

import { getNode } from '../n8n-client.js';

export const definition = {
  name: 'get_node',
  description:
    'Retrieve a specific node from FHS_Core_OrderProcessor by exact name. ' +
    'Priority nodes: Profit Auditor, Parse Items & Generate SKU, ' +
    'Input Normalizer, Calculate Profit & Pack Items.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        default: '6Ljih0hSKr9RpYNm',
      },
      nodeName: {
        type: 'string',
        description: 'Exact node name (case-sensitive)',
      },
    },
    required: ['nodeName'],
  },
};

export async function handler({ workflowId = '6Ljih0hSKr9RpYNm', nodeName }) {
  const { node, workflowName } = await getNode(workflowId, nodeName);
  const result = {
    workflowName,
    nodeName: node.name,
    nodeType: node.type,
    parameters: node.parameters,
    position: node.position,
  };

  // 如果有 jsCode，單獨提取方便閱讀
  if (node.parameters?.jsCode) {
    result.jsCode = node.parameters.jsCode;
  }

  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}
