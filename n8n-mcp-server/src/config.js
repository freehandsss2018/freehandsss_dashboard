/**
 * n8n-mcp-server 設定
 * 讀取根目錄 .env，並實作 workflow allowlist
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 讀取根目錄 .env
function loadRootEnv() {
  const envPath = resolve(__dirname, '..', '..', '.env');
  try {
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env 不存在時不中斷，依賴已有的環境變數
  }
}

loadRootEnv();

// Phase 1 allowlist — 僅允許 FHS_Core_OrderProcessor
const WORKFLOW_ALLOWLIST = ['6Ljih0hSKr9RpYNm'];

// Phase 1 優先支援節點
const PRIORITY_NODES = [
  'Profit Auditor',
  'Parse Items & Generate SKU',
  'Input Normalizer',
  'Calculate Profit & Pack Items',
];

const config = {
  n8nBaseUrl: (process.env.N8N_INSTANCE || '').replace(/\/+$/, ''),
  n8nApiKey: process.env.N8N_KEY || '',
  workflowAllowlist: WORKFLOW_ALLOWLIST,
  priorityNodes: PRIORITY_NODES,
  backupBasePath: resolve(__dirname, '..', '..', '.fhs', 'notes', 'aireports', 'n8n-mcp-backups'),
};

export function assertAllowedWorkflow(workflowId) {
  if (!config.workflowAllowlist.includes(workflowId)) {
    throw new Error(
      `Workflow ${workflowId} is not in the allowlist. ` +
      `Phase 1 only allows: ${config.workflowAllowlist.join(', ')}`
    );
  }
}

export default config;
