/**
 * n8n REST API client
 * 封裝所有對 n8n 的 HTTP 請求
 */

import config, { assertAllowedWorkflow } from './config.js';

async function n8nFetch(path, options = {}) {
  if (!config.n8nBaseUrl) throw new Error('N8N_INSTANCE not configured');
  if (!config.n8nApiKey) throw new Error('N8N_KEY not configured');

  const url = `${config.n8nBaseUrl}/api/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'X-N8N-API-KEY': config.n8nApiKey,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`n8n API ${res.status}: ${res.statusText} — ${body}`);
  }

  return res.json();
}

/** 讀取 workflow 定義 */
export async function getWorkflow(workflowId) {
  assertAllowedWorkflow(workflowId);
  return n8nFetch(`/workflows/${workflowId}`);
}

/** 讀取指定節點 */
export async function getNode(workflowId, nodeName) {
  assertAllowedWorkflow(workflowId);
  const wf = await n8nFetch(`/workflows/${workflowId}`);
  const node = wf.nodes.find((n) => n.name === nodeName);
  if (!node) {
    throw new Error(
      `Node "${nodeName}" not found. Available: ${wf.nodes.map((n) => n.name).join(', ')}`
    );
  }
  return { node, workflowName: wf.name };
}

/** 更新節點的 jsCode（真正寫入） */
export async function updateNodeCode(workflowId, nodeName, newCode) {
  assertAllowedWorkflow(workflowId);
  const wf = await n8nFetch(`/workflows/${workflowId}`);
  const nodeIdx = wf.nodes.findIndex((n) => n.name === nodeName);
  if (nodeIdx === -1) {
    throw new Error(`Node "${nodeName}" not found`);
  }

  // 更新 jsCode
  wf.nodes[nodeIdx].parameters.jsCode = newCode;

  // 清理 GET 回傳的額外欄位，避免 n8n PUT additionalProperties 驗證失敗
  const cleanedWf = {
    name: wf.name,
    nodes: wf.nodes.map(({ issues, ...cleanNode }) => cleanNode),
    connections: wf.connections,
    settings: Object.fromEntries(
      Object.entries(wf.settings || {}).filter(
        ([key]) => !['availableInMCP', 'binaryMode'].includes(key)
      )
    ),
    ...(wf.staticData != null && { staticData: wf.staticData }),
    ...(wf.pinData && Object.keys(wf.pinData).length > 0 && { pinData: wf.pinData }),
  };

  // PUT 回 n8n
  const result = await n8nFetch(`/workflows/${workflowId}`, {
    method: 'PUT',
    body: JSON.stringify(cleanedWf),
  });

  return { updated: true, nodeName, workflowId, versionId: result.versionId };
}

/** 觸發 workflow 測試執行 */
export async function triggerTestExecution(workflowId, payload) {
  assertAllowedWorkflow(workflowId);
  return n8nFetch(`/workflows/${workflowId}/run`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });
}

/** 讀取 execution logs */
export async function getExecutionLogs(workflowId, limit = 10) {
  assertAllowedWorkflow(workflowId);
  const data = await n8nFetch(`/executions?workflowId=${workflowId}&limit=${limit}`);
  return data;
}

/** 讀取單一 execution 詳情 */
export async function getExecutionDetail(executionId) {
  return n8nFetch(`/executions/${executionId}`);
}
