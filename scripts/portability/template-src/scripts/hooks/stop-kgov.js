#!/usr/bin/env node
// Stop hook for a pending knowledge-governance update.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FLAG = process.env['{{ENV_PREFIX}}_KGOV_FLAG_FILE'] || path.join(ROOT, '.fhs/.kgov-pending');
const COUNT = process.env['{{ENV_PREFIX}}_KGOV_BLOCK_COUNT_FILE'] || path.join(ROOT, '.fhs/.kgov-block-count');
const MAX_BLOCKS = 8;
const remove = file => { try { fs.unlinkSync(file); } catch (_) { /* absent */ } };
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    if (data.stop_hook_active || !fs.existsSync(FLAG)) { remove(COUNT); return; }
    let prior = 0;
    try { prior = Number.parseInt(fs.readFileSync(COUNT, 'utf8'), 10) || 0; } catch (_) { /* first block */ }
    const count = prior + 1;
    if (count >= MAX_BLOCKS) {
      remove(COUNT);
      process.stderr.write('[kgov-stop-hook] Repeated stop blocks reached the safety limit; inspect the pending flag manually.\n');
      return;
    }
    fs.mkdirSync(path.dirname(COUNT), { recursive: true });
    fs.writeFileSync(COUNT, String(count));
    const reason = 'Knowledge-governance update is pending. Update .fhs/notes/system-logic.md or .fhs/memory/lessons/INDEX.md. If this flag was set in error, inspect and remove .fhs/.kgov-pending.';
    process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
    process.stderr.write('[kgov-stop-hook] ' + reason + '\n');
    process.exitCode = 2;
  } catch (_) { /* fail open */ }
});
