#!/usr/bin/env node
// scripts/hooks/test/run-fixtures.js
// Characterization test harness for scripts/hooks/pre-tool-guard.js
// Feeds each fixture's {tool_name, tool_input} to the guard via stdin,
// asserts exit code + stderr substrings match fixture expectations.
//
// Fixtures marked known_gap:true document CURRENT (imperfect) behavior on purpose —
// they are expected to be green today and should flip to a stricter expectation
// once governance Stage D closes that gap (see fixture "note" field).
//
// A fixture with expected_exit:null is a documentation-only entry (e.g. the
// PowerShell matcher gap) that this runner skips executing — the gap lives at
// the settings.json hook-registration level, not inside guard.js itself.

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FIXTURES_PATH = path.join(__dirname, 'guard-fixtures.json');
const GUARD_PATH = path.join(__dirname, '..', 'pre-tool-guard.js');

const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf8'));

let pass = 0;
let fail = 0;
let skipped = 0;

for (const fx of fixtures) {
  if (fx.expected_exit === null) {
    skipped++;
    console.log(`SKIP  ${fx.name}  (文件記錄項，非可執行斷言)`);
    continue;
  }

  const input = JSON.stringify({ tool_name: fx.tool_name, tool_input: fx.tool_input });
  const result = spawnSync('node', [GUARD_PATH], { input, encoding: 'utf8', env: { ...process.env, FHS_GUARD_FIXTURE: '1' } });

  const exitOk = result.status === fx.expected_exit;
  let stderrOk = true;
  if (fx.expected_stderr_contains) {
    stderrOk = fx.expected_stderr_contains.every(s => result.stderr.includes(s));
  }

  const ok = exitOk && stderrOk;
  const tag = fx.known_gap ? '[known-gap]' : '';

  if (ok) {
    pass++;
    console.log(`PASS  ${tag} ${fx.name}`);
  } else {
    fail++;
    console.log(`FAIL  ${tag} ${fx.name}`);
    console.log(`      expected exit=${fx.expected_exit} got=${result.status}`);
    if (fx.expected_stderr_contains) {
      console.log(`      expected stderr to contain: ${JSON.stringify(fx.expected_stderr_contains)}`);
      console.log(`      actual stderr: ${JSON.stringify(result.stderr)}`);
    }
  }
}

console.log('');
console.log(`${pass} passed, ${fail} failed, ${skipped} skipped (of ${fixtures.length} fixtures)`);
process.exit(fail > 0 ? 1 : 0);
