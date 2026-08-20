#!/usr/bin/env node
// scripts/hooks/test/run-handoff-gate-tests.js
// Tests for pre-tool-guard.js Rule 13 (handoff sync gate, D68).
//
// Why a separate runner: run-fixtures.js spawns the guard with
// FHS_GUARD_FIXTURE=1, and R13 deliberately skips itself under that flag so the
// existing Bash fixtures don't all start getting blocked. These tests therefore
// run WITHOUT that flag, and instead point R13 at a temp handoff file via
// FHS_HANDOFF_GATE_FILE (which also disables R13's git probe).

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const GUARD_PATH = path.join(__dirname, '..', 'pre-tool-guard.js');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'fhs-r13-'));

function todayLocalISO() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function writeHandoff(name, stampLine) {
  const p = path.join(TMP_DIR, name);
  fs.writeFileSync(p, ['```handoff', stampLine, '🎯 目標: test', ''].join('\n'), 'utf8');
  return p;
}

const TODAY = todayLocalISO();
const FRESH = writeHandoff('fresh.md', `【FHS 交接摘要 — 更新: ${TODAY}（測試夾具）】`);
const STALE = writeHandoff('stale.md', '【FHS 交接摘要 — 更新: 2026-08-18（測試夾具）】');
const BROKEN = writeHandoff('broken.md', '【FHS 交接摘要 — 便攜塊格式已被改壞，冇日期戳】');

const CASES = [
  {
    name: 'R13 擋：日期戳過時 + git commit',
    command: 'git commit -m "chore: sync"',
    handoff: STALE,
    expected_exit: 2,
    expect_stderr: ['[R13]', '2026-08-18', TODAY]
  },
  {
    name: 'R13 放行：日期戳係今日',
    command: 'git commit -m "chore: sync"',
    handoff: FRESH,
    expected_exit: 0,
    expect_stderr_absent: ['[R13] handoff 便攜塊日期戳過時']
  },
  {
    name: 'R13 幂等：同日第二個 commit（Phase 2.5 部署 commit）照樣放行',
    command: 'git commit -m "deploy: current.html 升格"',
    handoff: FRESH,
    expected_exit: 0,
    expect_stderr_absent: ['[R13] handoff 便攜塊日期戳過時']
  },
  {
    name: 'R13 唔擋非 commit 指令（git log --grep 含 commit 字樣）',
    command: 'git log --grep="commit" --oneline -5',
    handoff: STALE,
    expected_exit: 0,
    expect_stderr_absent: ['[R13]']
  },
  {
    name: 'R13 唔擋 --dry-run',
    command: 'git commit --dry-run',
    handoff: STALE,
    expected_exit: 0,
    expect_stderr_absent: ['[R13] handoff 便攜塊日期戳過時']
  },
  {
    name: 'R13 逃生口：FHS_SKIP_HANDOFF_GATE=1 放行並警告',
    command: 'git commit -m "chore: sync"',
    handoff: STALE,
    env: { FHS_SKIP_HANDOFF_GATE: '1' },
    expected_exit: 0,
    expect_stderr: ['[R13]', 'FHS_SKIP_HANDOFF_GATE=1 繞過']
  },
  {
    name: 'R13 fail-open：便攜塊格式壞咗只警告唔擋',
    command: 'git commit -m "chore: sync"',
    handoff: BROKEN,
    expected_exit: 0,
    expect_stderr: ['[R13]', 'fail-open']
  },
  {
    name: 'R13 唔干擾既有規則：R7 force push 照擋',
    command: 'git push --force origin main',
    handoff: STALE,
    expected_exit: 2,
    expect_stderr: ['[R7]']
  }
];

let pass = 0;
let fail = 0;

for (const c of CASES) {
  const input = JSON.stringify({ tool_name: 'Bash', tool_input: { command: c.command } });
  const env = { ...process.env, FHS_HANDOFF_GATE_FILE: c.handoff, ...(c.env || {}) };
  delete env.FHS_GUARD_FIXTURE; // R13 skips itself under the fixture flag
  if (!c.env || !c.env.FHS_SKIP_HANDOFF_GATE) delete env.FHS_SKIP_HANDOFF_GATE;

  const r = spawnSync('node', [GUARD_PATH], { input, encoding: 'utf8', env });

  const exitOk = r.status === c.expected_exit;
  const hasOk = (c.expect_stderr || []).every(s => r.stderr.includes(s));
  const absentOk = (c.expect_stderr_absent || []).every(s => !r.stderr.includes(s));

  if (exitOk && hasOk && absentOk) {
    pass++;
    console.log(`PASS  ${c.name}`);
  } else {
    fail++;
    console.log(`FAIL  ${c.name}`);
    console.log(`      expected exit=${c.expected_exit} got=${r.status}`);
    console.log(`      stderr: ${JSON.stringify(r.stderr)}`);
  }
}

try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (_) { /* silent */ }

console.log('');
console.log(`${pass} passed, ${fail} failed (of ${CASES.length} R13 cases)`);
process.exit(fail > 0 ? 1 : 0);
