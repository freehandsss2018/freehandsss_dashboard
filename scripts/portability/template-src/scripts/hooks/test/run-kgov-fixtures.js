#!/usr/bin/env node
// Isolated synthetic tests for the portable knowledge-governance hook.
'use strict';
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const fixtures = require('./kgov-fixtures.json');
const hook = path.join(__dirname, '..', 'post-tool-kgov.js');
const flag = path.join(os.tmpdir(), `kgov-fixture-${process.pid}.flag`);
let failed = 0;
for (const test of fixtures) {
  try { fs.unlinkSync(flag); } catch (_) { /* absent */ }
  if (test.initial_flag) fs.writeFileSync(flag, 'synthetic\n');
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ tool_name: test.tool_name, tool_input: test.tool_input }),
    encoding: 'utf8',
    env: { ...process.env, ['{{ENV_PREFIX}}_KGOV_FLAG_FILE']: flag }
  });
  let context = '';
  try { context = JSON.parse(result.stdout.trim()).hookSpecificOutput.additionalContext || ''; } catch (_) { /* silent case */ }
  const kind = context.includes('Knowledge rule changed') ? 'flag' : context.includes('mentions a tracked rule') ? 'warn' : 'none';
  const ok = result.status === 0 && fs.existsSync(flag) === test.expected_flag && kind === test.expected_kind;
  process.stdout.write(`${ok ? 'PASS' : 'FAIL'}  ${test.name}\n`);
  if (!ok) { failed++; process.stdout.write(`      status=${result.status} flag=${fs.existsSync(flag)} kind=${kind} stderr=${result.stderr.trim()}\n`); }
}
try { fs.unlinkSync(flag); } catch (_) { /* absent */ }
process.stdout.write(`\n${fixtures.length - failed} passed, ${failed} failed (of ${fixtures.length} fixtures)\n`);
process.exitCode = failed ? 1 : 0;
