#!/usr/bin/env node
// scripts/hooks/test/run-deploy-flag-tests.js
// Tests for pre-tool-guard.js R1/R9/R10 `.deploy-ok` worktree-aware 旗標（D109）。
//
// 做法：喺臨時目錄建一個「假主倉」（複製 guard + rules，git init + 一個 commit），再用真正嘅
// `git worktree add` 開一個 worktree，令 guard 以「主倉為根」跑、但 commit/寫入發生喺 worktree
// ——同真實 Claude Code worktree session 完全一致。呢啲案例唔設 FHS_GUARD_FIXTURE（該旗標會令
// R10 日誌跳過，亦係既有 run-fixtures.js 專用）。

'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SRC_HOOKS = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fhs-deployflag-'));
const MAIN = path.join(TMP, 'main');
const WT = path.join(TMP, 'wt');
const WT2 = path.join(TMP, 'wt2'); // 第二個 worktree：驗證 worktree 旗標只授權自己
const G = path.join(MAIN, 'scripts', 'hooks', 'pre-tool-guard.js');
const CURRENT_REL = 'Freehandsss_Dashboard/Freehandsss_dashboard_current.html';

function git(cwd, ...args) {
  return spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.autocrlf=false', ...args],
    { cwd, encoding: 'utf8' });
}

// ── 建場 ──
fs.mkdirSync(path.join(MAIN, 'scripts', 'hooks'), { recursive: true });
fs.copyFileSync(path.join(SRC_HOOKS, 'pre-tool-guard.js'), G);
fs.copyFileSync(path.join(SRC_HOOKS, 'guard-rules.fhs.json'), path.join(MAIN, 'scripts', 'hooks', 'guard-rules.fhs.json'));
fs.mkdirSync(path.join(MAIN, '.fhs', 'notes'), { recursive: true });
fs.mkdirSync(path.join(MAIN, 'Freehandsss_Dashboard'), { recursive: true });
fs.writeFileSync(path.join(MAIN, CURRENT_REL), '<html>main</html>\n');
fs.writeFileSync(path.join(MAIN, '.fhs', 'notes', 'deploy-log.md'), '# log\n');
git(MAIN, 'init', '-q', '-b', 'main');
git(MAIN, 'add', '.');
git(MAIN, 'commit', '-q', '-m', 'init');
git(MAIN, 'worktree', 'add', '-q', '-b', 't1', WT);
git(MAIN, 'worktree', 'add', '-q', '-b', 't2', WT2);

const iso = (offsetMs = 0) => new Date(Date.now() + offsetMs).toISOString();
const flagOf = root => path.join(root, '.fhs', '.deploy-ok');
const logOf = root => path.join(root, '.fhs', 'notes', 'deploy-log.md');
const readLog = root => { try { return fs.readFileSync(logOf(root), 'utf8'); } catch (_) { return ''; } };
const clearFlags = () => [MAIN, WT, WT2].forEach(r => { try { fs.unlinkSync(flagOf(r)); } catch (_) { /* none */ } });

function run(payload) {
  const env = { ...process.env };
  delete env.FHS_GUARD_FIXTURE;
  delete env.FHS_HANDOFF_GATE_FILE;
  return spawnSync('node', [G], { input: JSON.stringify(payload), encoding: 'utf8', env });
}
const writeCurrent = (root, cwd) => run({
  tool_name: 'Write', cwd: cwd || root,
  tool_input: { file_path: path.join(root, CURRENT_REL), content: '<html>x</html>' }
});
const bashCurrent = cwd => run({
  tool_name: 'Bash', cwd, tool_input: { command: 'cp new.html Freehandsss_dashboard_current.html' }
});

let pass = 0;
let fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`PASS  ${name}`); }
  else { fail++; console.log(`FAIL  ${name}${detail ? '\n      ' + detail : ''}`); }
}

// 1. 無旗標 → 擋
clearFlags();
let r = writeCurrent(WT);
check('無旗標：寫 worktree 內 current.html → 擋 [R1]', r.status === 2 && r.stderr.includes('[R1]'), `exit=${r.status} ${r.stderr}`);

// 2. worktree 旗標有效 → 放行、消耗、日誌落 worktree
clearFlags();
fs.writeFileSync(flagOf(WT), iso());
r = writeCurrent(WT);
check('worktree 旗標有效 → 放行', r.status === 0, `exit=${r.status} ${r.stderr}`);
check('worktree 旗標用後即刪（一次性）', !fs.existsSync(flagOf(WT)));
check('日誌落 worktree 的 deploy-log.md（可 git add）', readLog(WT).includes('R1/R9 bypass'), readLog(WT));
check('主倉 deploy-log.md 冇被污染', !readLog(MAIN).includes('R1/R9 bypass'), readLog(MAIN));

// 3. 一次性：第二次寫入 → 擋
r = writeCurrent(WT);
check('一次性：旗標已消耗，第二次寫入 → 擋', r.status === 2, `exit=${r.status}`);

// 4. 主倉舊位置旗標（Fat Mo 在主倉手動 touch）→ 仍可授權 worktree 寫入，並消耗主倉旗標
clearFlags();
fs.writeFileSync(flagOf(MAIN), iso());
r = writeCurrent(WT);
check('向後相容：主倉旗標授權 worktree 寫入', r.status === 0, `exit=${r.status} ${r.stderr}`);
check('主倉旗標用後即刪', !fs.existsSync(flagOf(MAIN)));

// 5. 過期旗標 → 擋並刪除
clearFlags();
fs.writeFileSync(flagOf(WT), iso(-20 * 60 * 1000));
r = writeCurrent(WT);
check('過期旗標（20 分鐘前）→ 擋', r.status === 2, `exit=${r.status}`);
check('過期旗標被清除', !fs.existsSync(flagOf(WT)));

// 6. 格式壞旗標（空檔）→ 擋並刪除
clearFlags();
fs.writeFileSync(flagOf(WT), '');
r = writeCurrent(WT);
check('空旗標（純 touch）→ 擋', r.status === 2, `exit=${r.status}`);
check('壞旗標被清除', !fs.existsSync(flagOf(WT)));

// 7. worktree 旗標只授權自己：wt 旗標 + 寫 wt2 內 current.html → 擋，wt 旗標保留
clearFlags();
fs.writeFileSync(flagOf(WT), iso());
r = writeCurrent(WT2);
check('worktree 旗標不授權另一個 worktree', r.status === 2, `exit=${r.status}`);
check('他處旗標未被誤消耗', fs.existsSync(flagOf(WT)));

// 8. Bash R9：cwd 在 worktree + worktree 旗標 → 放行
clearFlags();
fs.writeFileSync(flagOf(WT), iso());
r = bashCurrent(WT);
check('Bash R9：cwd=worktree + worktree 旗標 → 放行', r.status === 0, `exit=${r.status} ${r.stderr}`);
check('Bash R9：旗標用後即刪', !fs.existsSync(flagOf(WT)));
r = bashCurrent(WT);
check('Bash R9：無旗標 → 擋 [R9]', r.status === 2 && r.stderr.includes('[R9]'), `exit=${r.status}`);

// 9. R10 日誌：AI 於 worktree 建立旗標 → 日誌落 worktree
clearFlags();
r = run({ tool_name: 'Write', cwd: WT, tool_input: { file_path: flagOf(WT), content: iso() } });
check('R10：Write 建旗標放行', r.status === 0, `exit=${r.status} ${r.stderr}`);
check('R10：日誌落 worktree', readLog(WT).includes('R10 AI self-created'), readLog(WT));
const mainLogBefore = readLog(MAIN);
r = run({ tool_name: 'Bash', cwd: WT2, tool_input: { command: 'touch .fhs/.deploy-ok' } });
check('R10：Bash touch 放行', r.status === 0, `exit=${r.status} ${r.stderr}`);
check('R10：Bash 日誌落 wt2、主倉日誌不變', readLog(WT2).includes('R10 AI self-created') && readLog(MAIN) === mainLogBefore);

// 10. cwd 缺失／在 repo 外 → 回退主倉旗標（舊行為）
clearFlags();
fs.writeFileSync(flagOf(MAIN), iso());
r = run({ tool_name: 'Write', tool_input: { file_path: path.join(MAIN, CURRENT_REL), content: 'x' } });
check('回退：無 cwd、目標在主倉 + 主倉旗標 → 放行', r.status === 0, `exit=${r.status} ${r.stderr}`);

// 清場
try { git(MAIN, 'worktree', 'remove', '--force', WT); git(MAIN, 'worktree', 'remove', '--force', WT2); } catch (_) { /* silent */ }
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (_) { /* silent */ }

console.log('');
console.log(`${pass} passed, ${fail} failed (deploy-flag worktree tests)`);
process.exit(fail > 0 ? 1 : 0);
