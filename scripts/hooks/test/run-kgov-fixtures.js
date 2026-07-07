#!/usr/bin/env node
// scripts/hooks/test/run-kgov-fixtures.js
// Test harness for scripts/hooks/post-tool-kgov.js
// Feeds each fixture to kgov hook, asserts:
//   1. expected_flag: does .fhs/.kgov-pending (test temp) exist after run?
//   2. expected_warn: does stdout additionalContext contain '[kgov-hook] 文件/代碼層' (warn text)?
//
// Uses FHS_KGOV_FLAG_FILE env var to redirect flag writes to a temp file,
// preventing test runs from polluting the real .fhs/.kgov-pending flag.
//
// S148 Phase 2 — 2026-07-08

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const FIXTURES_PATH = path.join(__dirname, 'kgov-fixtures.json');
const KGOV_PATH = path.join(__dirname, '..', 'post-tool-kgov.js');

// Use a temp file for flag isolation — each fixture cleans up after itself
const TEMP_FLAG_FILE = path.join(os.tmpdir(), `fhs-kgov-test-flag-${process.pid}.tmp`);

const fixtures = JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf8'));

let pass = 0;
let fail = 0;

for (const fx of fixtures) {
  // Clean up temp flag before each fixture
  try { if (fs.existsSync(TEMP_FLAG_FILE)) fs.unlinkSync(TEMP_FLAG_FILE); } catch (_) { /* silent */ }

  const input = JSON.stringify({ tool_name: fx.tool_name, tool_input: fx.tool_input });
  const result = spawnSync('node', [KGOV_PATH], {
    input,
    encoding: 'utf8',
    env: {
      ...process.env,
      FHS_KGOV_FLAG_FILE: TEMP_FLAG_FILE,  // redirect flag to temp file
      FHS_GUARD_FIXTURE: '1'               // prevent observe log pollution
    }
  });

  // Parse stdout for additionalContext
  let additionalContext = '';
  try {
    const parsed = JSON.parse(result.stdout.trim());
    additionalContext = parsed.additionalContext || '';
  } catch (_) { /* no JSON output = no additionalContext */ }

  // Check assertions
  const flagExists = fs.existsSync(TEMP_FLAG_FILE);
  const flagOk = flagExists === fx.expected_flag;

  const hasWarn = additionalContext.includes('[kgov-hook] 文件/代碼層');
  const hasFlag = additionalContext.includes('[G] 運算邏輯變動稽核 已觸發');
  const warnOk = (fx.expected_warn ? hasWarn : !hasWarn);

  const ok = flagOk && warnOk;

  if (ok) {
    pass++;
    console.log(`PASS  ${fx.name}`);
  } else {
    fail++;
    console.log(`FAIL  ${fx.name}`);
    if (!flagOk) {
      console.log(`      flag: expected=${fx.expected_flag} got=${flagExists}`);
    }
    if (!warnOk) {
      console.log(`      warn: expected=${fx.expected_warn} gotWarnText=${hasWarn} gotFlagText=${hasFlag}`);
      console.log(`      stdout: ${JSON.stringify(result.stdout.slice(0, 200))}`);
    }
    if (result.stderr) {
      console.log(`      stderr: ${result.stderr.slice(0, 100)}`);
    }
  }

  // Clean up temp flag after each fixture
  try { if (fs.existsSync(TEMP_FLAG_FILE)) fs.unlinkSync(TEMP_FLAG_FILE); } catch (_) { /* silent */ }
}

console.log('');
console.log(`${pass} passed, ${fail} failed (of ${fixtures.length} fixtures)`);
process.exit(fail > 0 ? 1 : 0);
