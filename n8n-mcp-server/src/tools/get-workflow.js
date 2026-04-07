/**
 * Tool: get_workflow
 * 讀取 FHS_Core_OrderProcessor 完整 workflow 定義
 */

import { getWorkflow } from '../n8n-client.js';

export const definition = {
  name: 'get_workflow',
  description:
    'Retrieve the full workflow definition of FHS_Core_OrderProcessor. ' +
    'Returns all nodes, connections, and settings.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        description: 'Workflow ID (Phase 1: only 6Ljih0hSKr9RpYNm allowed)',
        default: '6Ljih0hSKr9RpYNm',
      },
    },
  },
};

export async function handler({ workflowId = '6Ljih0hSKr9RpYNm' }) {
  const wf = await getWorkflow(workflowId);
  const summary = {
    id: wf.id,
    name: wf.name,
    active: wf.active,
    nodeCount: wf.nodes.length,
    nodes: wf.nodes.map((n) => ({
      name: n.name,
      type: n.type,
      position: n.position,
    })),
    connections: wf.connections,
    versionId: wf.versionId,
  };
  return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
}
