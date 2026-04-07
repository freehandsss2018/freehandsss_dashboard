/**
 * Tool: get_execution_log
 * 讀取 execution logs，標示失敗節點與錯誤摘要
 */

import { getExecutionLogs, getExecutionDetail } from '../n8n-client.js';

export const definition = {
  name: 'get_execution_log',
  description:
    'Retrieve recent execution logs for FHS_Core_OrderProcessor. ' +
    'Shows status, failed nodes, and error messages.',
  inputSchema: {
    type: 'object',
    properties: {
      workflowId: {
        type: 'string',
        default: '6Ljih0hSKr9RpYNm',
      },
      limit: {
        type: 'number',
        description: 'Number of recent executions to retrieve (default: 5)',
        default: 5,
      },
      executionId: {
        type: 'string',
        description: 'Specific execution ID to inspect in detail (optional)',
      },
    },
  },
};

function extractFailures(executionData) {
  const failures = [];
  const resultData = executionData.data?.resultData;
  if (!resultData) return failures;

  // 檢查 runData 中每個節點的執行結果
  const runData = resultData.runData || {};
  for (const [nodeName, runs] of Object.entries(runData)) {
    for (const run of runs) {
      if (run.error) {
        failures.push({
          nodeName,
          errorMessage: run.error.message || String(run.error),
          errorType: run.error.name || 'Error',
        });
      }
    }
  }

  // 檢查頂層 error
  if (resultData.error) {
    failures.push({
      nodeName: resultData.lastNodeExecuted || 'unknown',
      errorMessage: resultData.error.message || String(resultData.error),
      errorType: resultData.error.name || 'Error',
    });
  }

  return failures;
}

export async function handler({ workflowId = '6Ljih0hSKr9RpYNm', limit = 5, executionId }) {
  // 單一 execution 詳情
  if (executionId) {
    const detail = await getExecutionDetail(executionId);
    const failures = extractFailures(detail);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              executionId: detail.id,
              status: detail.finished ? (detail.data?.resultData?.error ? 'error' : 'success') : 'running',
              startedAt: detail.startedAt,
              stoppedAt: detail.stoppedAt,
              failures,
              lastNodeExecuted: detail.data?.resultData?.lastNodeExecuted,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // 列表模式
  const data = await getExecutionLogs(workflowId, limit);
  const executions = data.data || data.results || data;
  const summary = (Array.isArray(executions) ? executions : []).map((ex) => ({
    id: ex.id,
    status: ex.finished ? (ex.status === 'error' || ex.data?.resultData?.error ? 'error' : 'success') : 'running',
    startedAt: ex.startedAt,
    stoppedAt: ex.stoppedAt,
    mode: ex.mode,
  }));

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ workflowId, count: summary.length, executions: summary }, null, 2),
      },
    ],
  };
}
