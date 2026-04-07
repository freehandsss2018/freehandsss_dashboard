/**
 * n8n-mcp-server — MCP Server 入口
 * FHS AI 控制層，Phase 1 僅支援 FHS_Core_OrderProcessor
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import * as getWorkflow from './tools/get-workflow.js';
import * as getNode from './tools/get-node.js';
import * as updateNodeCode from './tools/update-node-code.js';
import * as rollbackNodeCode from './tools/rollback-node-code.js';
import * as triggerTest from './tools/trigger-test.js';
import * as getExecutionLog from './tools/get-execution-log.js';
import * as verifyTripleSync from './tools/verify-triple-sync.js';

const server = new McpServer({
  name: 'n8n-mcp-server',
  version: '1.0.0',
  description:
    'FHS n8n control layer — Phase 1: FHS_Core_OrderProcessor only. ' +
    'Provides workflow/node reading, dry-run code updates, test execution, ' +
    'execution log inspection, and triple-sync verification.',
});

/**
 * 簡易 JSON Schema to Zod 轉換器
 * 僅支援 Phase 1 工具使用的基礎型別
 */
function convertToZod(inputSchema) {
  const { properties = {}, required = [] } = inputSchema;
  const zodSchema = {};

  for (const [key, details] of Object.entries(properties)) {
    let type;
    switch (details.type) {
      case 'string':
        type = z.string();
        break;
      case 'boolean':
        type = z.boolean();
        break;
      case 'number':
        type = z.number();
        break;
      case 'array':
        type = z.array(z.any());
        break;
      case 'object':
        type = z.record(z.any());
        break;
      default:
        type = z.any();
    }

    if (details.description) {
      type = type.describe(details.description);
    }

    if (details.default !== undefined) {
      type = type.default(details.default);
    } else if (!required.includes(key)) {
      type = type.optional();
    }

    zodSchema[key] = type;
  }

  return zodSchema;
}

// 註冊所有 tools
const tools = [
  getWorkflow,
  getNode,
  updateNodeCode,
  rollbackNodeCode,
  triggerTest,
  getExecutionLog,
  verifyTripleSync,
];

for (const tool of tools) {
  const zodSchema = convertToZod(tool.definition.inputSchema);
  server.tool(
    tool.definition.name,
    tool.definition.description,
    zodSchema,
    tool.handler
  );
}

// 啟動 stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
