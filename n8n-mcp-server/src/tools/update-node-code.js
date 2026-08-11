/**
 * Tool: update_node_code
 * 更新指定 code node 的 jsCode
 * 預設 dry-run，未經 /execute 授權不得真正寫入
 */

import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { getNode, updateNodeCode } from '../n8n-client.js';
import config from '../config.js';

// 2026-08-11 security fix (D62 事故教訓)：backupNode() 曾經逐字備份節點原始碼落
// repo（.fhs/notes/aireports/n8n-mcp-backups/），若節點內嵌硬編碼密鑰（反模式，
// 但當時真實存在），密鑰會一併被寫入 git-tracked 檔案並隨後續 commit 洩漏到公開
// GitHub repo（3個月未察覺，觸發 Supabase 自動撤銷憑證，見 decisions.md D62）。
// Pattern 清單同 scripts/hooks/pre-tool-guard.js Rule 2 保持一致（同一份威脅模型，
// 兩處各自獨立攔截：Rule 2 擋 Claude Code 自己嘅 Write/Edit，呢度擋 MCP server
// 內部繞過 hook 嘅 fs.writeFileSync）——改任一邊時應同步檢查另一邊。
const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9]{32,}/g,
  /pplx-[a-zA-Z0-9]{32,}/g,
  /pat[a-zA-Z0-9]{20,}\.[a-zA-Z0-9]{40,}/g,
  /sbp_[a-zA-Z0-9]{20,}/g,
  /sb_secret_[a-zA-Z0-9_-]{15,}/g,
  /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
];

function redactSecrets(jsonText) {
  let out = jsonText;
  let hits = 0;
  for (const re of SECRET_PATTERNS) {
    out = out.replace(re, (m) => {
      hits++;
      return `[REDACTED-SECRET-${m.slice(0, 8)}...]`;
    });
  }
  return { text: out, hits };
}

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
  const { text, hits } = redactSecrets(JSON.stringify(nodeData, null, 2));
  writeFileSync(filePath, text, 'utf-8');
  if (hits > 0) {
    // eslint-disable-next-line no-console
    console.error(`[update-node-code] WARNING: redacted ${hits} secret-pattern match(es) from backup before writing to disk: ${filePath}`);
  }
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
