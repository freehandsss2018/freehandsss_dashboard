#!/usr/bin/env node
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const guard = path.join(__dirname, '..', 'pre-tool-guard.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'handoff-gate-'));
const handoff = path.join(dir, 'handoff.md');
const today = new Date();
const stamp = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
const tests = [
  ['current handoff permits commit', `更新: ${stamp}\n`, {}, 0],
  ['stale handoff blocks commit', '更新: 2000-01-01\n', {}, 2],
  ['explicit bypass warns', '更新: 2000-01-01\n', {'{{ENV_PREFIX}}_SKIP_HANDOFF_GATE':'1'}, 0]
];
let failed = 0;
try {
  for (const [name, content, extraEnv, expected] of tests) {
    fs.writeFileSync(handoff, content);
    const env = {...process.env, ...extraEnv, '{{ENV_PREFIX}}_HANDOFF_GATE_FILE':handoff};
    delete env['{{ENV_PREFIX}}_GUARD_FIXTURE'];
    const result = spawnSync(process.execPath, [guard], {
      input: JSON.stringify({tool_name:'Bash',tool_input:{command:'git commit -m example'}}),
      encoding:'utf8', env
    });
    const ok = result.status === expected;
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
    if (!ok) { failed++; console.error(result.stderr); }
  }
} finally {
  fs.rmSync(dir, {recursive:true, force:true});
}
process.exitCode = failed ? 1 : 0;
