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

// ── worktree-aware 案例（D108）：用臨時 git repo 扮「commit 所在 repo」，經 data.cwd 傳入；
//    這些案例不設 FHS_HANDOFF_GATE_FILE，驗證 R13 真係讀 cwd 所屬 repo 嘅 handoff（而非 guard
//    所在主倉）。舊版 R13 讀 __dirname 推出嘅主倉 → 下面「STALE repo 要擋」案例會失敗，係真回歸測試。
function makeRepo(name, stampLine, { unstagedEdit = false } = {}) {
  const dir = path.join(TMP_DIR, name);
  fs.mkdirSync(path.join(dir, '.fhs', 'memory'), { recursive: true });
  const f = path.join(dir, '.fhs', 'memory', 'handoff.md');
  fs.writeFileSync(f, ['```handoff', stampLine, '🎯 目標: test', ''].join('\n'), 'utf8');
  const git = (...a) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...a], { cwd: dir, encoding: 'utf8' });
  git('init', '-q');
  git('add', '.');
  git('commit', '-q', '-m', 'init');
  if (unstagedEdit) fs.appendFileSync(f, '未 staged 改動\n', 'utf8');
  return dir;
}
const REPO_STALE = makeRepo('repo-stale', '【FHS 交接摘要 — 更新: 2026-08-18（測試 repo）】');
const REPO_FRESH = makeRepo('repo-fresh', `【FHS 交接摘要 — 更新: ${TODAY}（測試 repo）】`);
const REPO_FRESH_DIRTY = makeRepo('repo-fresh-dirty', `【FHS 交接摘要 — 更新: ${TODAY}（測試 repo）】`, { unstagedEdit: true });

const CASES = [
  {
    name: 'R13 worktree-aware：cwd repo 日期戳過時 → 擋（讀 cwd 而非主倉）',
    command: 'git commit -m "chore: sync"',
    cwd: REPO_STALE,
    expected_exit: 2,
    expect_stderr: ['[R13]', '2026-08-18', TODAY]
  },
  {
    name: 'R13 worktree-aware：cwd repo 日期戳係今日 → 放行',
    command: 'git commit -m "chore: sync"',
    cwd: REPO_FRESH,
    expected_exit: 0,
    expect_stderr_absent: ['[R13]']
  },
  {
    name: 'R13 worktree-aware：cwd repo 日期戳今日但 handoff 有未 staged 改動 → 擋',
    command: 'git commit -m "chore: sync"',
    cwd: REPO_FRESH_DIRTY,
    expected_exit: 2,
    expect_stderr: ['[R13]', '未 staged']
  },
  {
    name: 'R13 回退：cwd 不存在 → 回退 REPO_ROOT（此處以覆寫檔驗證不崩潰）',
    command: 'git commit -m "chore: sync"',
    cwd: path.join(TMP_DIR, 'no-such-dir'),
    handoff: FRESH,
    expected_exit: 0,
    expect_stderr_absent: ['[R13] handoff 便攜塊日期戳過時', 'TypeError']
  },
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
  const payload = { tool_name: 'Bash', tool_input: { command: c.command } };
  if (c.cwd) payload.cwd = c.cwd;
  const input = JSON.stringify(payload);
  const env = { ...process.env, ...(c.env || {}) };
  if (c.handoff) env.FHS_HANDOFF_GATE_FILE = c.handoff;
  else delete env.FHS_HANDOFF_GATE_FILE; // worktree-aware 案例：唔覆寫，真係讀 cwd repo
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
