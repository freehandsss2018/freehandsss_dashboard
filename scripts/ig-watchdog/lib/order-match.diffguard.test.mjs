// order-match.diffguard.test.mjs — node --test
// 單一真源守衛：斷言 build_n8n_workflow.cjs 生成的 Classify 節點，內含 lib/order-match.mjs
// 的逐字原始碼（strip export 後）。任何人改了 lib 不重生、或手抄改 n8n 端造成漂移 → 測試 fail。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IGWD = path.join(__dirname, '..');                       // scripts/ig-watchdog
const ROOT = path.join(IGWD, '..', '..');                      // repo root
const BUILT = path.join(ROOT, '.fhs-local', 'ig-watchdog', 'n8n_workflow_built.json');

test('diff-guard：n8n Classify 節點內嵌 lib/order-match.mjs 逐字一致', () => {
  // 1) 期望來源 = lib 原始碼 strip export
  const libSrc = readFileSync(path.join(IGWD, 'lib', 'order-match.mjs'), 'utf8')
    .replace(/^export\s+/gm, '');

  // 2) 重新生成 workflow（保證測的是當前 lib + build 的最新組合）
  execSync('node ' + JSON.stringify(path.join(IGWD, 'build_n8n_workflow.cjs')), {
    cwd: ROOT, stdio: 'ignore',
  });

  // 3) 取 Classify 節點 jsCode，斷言內含整段 lib 來源
  const wf = JSON.parse(readFileSync(BUILT, 'utf8'));
  const node = wf.nodes.find((n) => n.name === 'Classify & Report');
  assert.ok(node, 'Classify & Report 節點存在');
  const code = node.parameters.jsCode;

  assert.ok(code.includes(libSrc),
    '漂移偵測：Classify 節點未逐字內含 lib/order-match.mjs（strip export）來源——改了 lib 要重生 workflow，勿手抄');

  // 4) 防 export 殘留（n8n Code 節點非 module，export 會 SyntaxError）
  assert.ok(!/\bexport\s+(function|const|let|var)\b/.test(code), 'jsCode 不得殘留 export 關鍵字');
});
