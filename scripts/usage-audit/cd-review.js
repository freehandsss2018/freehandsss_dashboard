#!/usr/bin/env node
// scripts/usage-audit/cd-review.js
// D92 R14-observe 觀察期覆核工具（唯讀，零 LLM token）。
//
// 回答兩條覆核判準：
//   ① Bash 帶 `cd <路徑> &&` 前綴嘅比例，R14 上線前後有冇明顯下降？
//   ② worktree → 主倉 嘅 cd（有改錯倉風險）上線後有冇再出現？有嘅話係咪寫入類？
//
// 資料源：~/.claude/projects/*freehandsss*/*.jsonl（transcript）＋主倉 .fhs/.bash-cd-observe.log（hook 日誌）
// 只輸出聚合數字與命令前 90 字元；transcript 內容不寫盤。
//
// Usage: node scripts/usage-audit/cd-review.js [--since=2026-09-25T08:16:51Z]
// 預設 --since＝R14 上線 commit 5dff0e3 嘅時間（2026-09-25T16:16:51+08:00）。
// 注意：只有「含 R14 嘅 guard 版本」嘅 session 先受影響——建於 R14 合入 main 之前嘅舊 worktree 不含此規則，
// 故「上線後」比例混有舊 worktree 數據；判讀時以日誌（只有含 R14 嘅 session 才會記）為準。

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const arg = (process.argv.find(a => a.startsWith('--since=')) || '').slice(8);
const SINCE = Date.parse(arg || '2026-09-25T16:16:51+08:00');
const PROJECTS = path.join(os.homedir(), '.claude', 'projects');
const REPO_ROOT = path.resolve(__dirname, '../..');
const MAIN_ROOT = (() => {
  const norm = REPO_ROOT.split('\\').join('/');
  const i = norm.indexOf('/.claude/worktrees/');
  return i >= 0 ? norm.slice(0, i) : REPO_ROOT;
})();
const LOG = path.join(MAIN_ROOT, '.fhs/.bash-cd-observe.log');

const norm = p => String(p).split('\\').join('/').replace(/^\/([a-zA-Z])\//, (m, d) => d.toUpperCase() + ':/').replace(/\/+$/, '').toLowerCase();
const CD_RE = /^cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*(?:&&|;)\s*([\s\S]*)/;
const WRITE_RE = /^(?:git\s+(?:-C\s+\S+\s+)?(?:add|commit|push|checkout|reset|clean|merge|rebase|stash|restore|rm|mv)\b|cp\b|mv\b|rm\b|sed\s+-i|tee\b)|(?:^|[^0-9&<>-])>{1,2}\s*[^\s&|>]/;

const before = { n: 0, cd: 0 }, after = { n: 0, cd: 0 };
const mainCd = [];
let files = 0;

for (const d of fs.readdirSync(PROJECTS)) {
  if (!/freehandsss/i.test(d)) continue;
  for (const f of fs.readdirSync(path.join(PROJECTS, d))) {
    if (!f.endsWith('.jsonl')) continue;
    let txt;
    try { txt = fs.readFileSync(path.join(PROJECTS, d, f), 'utf8'); } catch (e) { continue; }
    files++;
    for (const line of txt.split('\n')) {
      if (!line) continue;
      let o;
      try { o = JSON.parse(line); } catch (e) { continue; }
      const c = o.message && o.message.content;
      if (!Array.isArray(c)) continue;
      for (const b of c) {
        if (!(b.type === 'tool_use' && b.name === 'Bash' && b.input && typeof b.input.command === 'string')) continue;
        const t = Date.parse(o.timestamp || '');
        if (isNaN(t)) continue;
        const bucket = t >= SINCE ? after : before;
        bucket.n++;
        const m = b.input.command.trim().match(CD_RE);
        if (!m) continue;
        bucket.cd++;
        if (t >= SINCE && o.cwd) {
          const T = norm(m[2] || m[3] || m[4]), C = norm(o.cwd), WT = '/.claude/worktrees/';
          if (C.includes(WT) && !T.includes(WT)) {
            const mainRoot = C.slice(0, C.indexOf(WT));
            if (T === mainRoot || T.startsWith(mainRoot + '/')) {
              mainCd.push({ ts: (o.timestamp || '').slice(0, 16), write: WRITE_RE.test(m[5].trim()), rest: m[5].replace(/\s+/g, ' ').slice(0, 90) });
            }
          }
        }
      }
    }
  }
}

const pct = x => (x.n ? Math.round((x.cd / x.n) * 100) : 0);
console.log(`R14 覆核（自 ${new Date(SINCE).toISOString()} 起；掃 ${files} 個 transcript）`);
console.log(`① cd 前綴比例：上線前 ${before.cd}/${before.n} (${pct(before)}%) → 上線後 ${after.cd}/${after.n} (${pct(after)}%)`);
console.log(`   （上線後樣本 <100 次時只作參考；含未帶 R14 嘅舊 worktree）`);
console.log(`② worktree→主倉 cd（上線後）：${mainCd.length} 次，其中寫入類 ${mainCd.filter(r => r.write).length} 次`);
mainCd.filter(r => r.write).slice(0, 8).forEach(r => console.log(`   寫入 ${r.ts} | ${r.rest}`));

if (fs.existsSync(LOG)) {
  const lines = fs.readFileSync(LOG, 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  const kinds = {};
  const sessionsDays = new Set();
  for (const l of lines) {
    const k = (l.split(' | ')[1] || '?').trim();
    kinds[k] = (kinds[k] || 0) + 1;
    sessionsDays.add(l.slice(0, 10));
  }
  console.log(`③ hook 日誌 ${LOG.split('/').slice(-2).join('/')}：${lines.length} 筆 ${JSON.stringify(kinds)}，涵蓋 ${sessionsDays.size} 日`);
} else {
  console.log('③ hook 日誌：尚未產生（上線後冇任何 session 觸發 R14＝好現象，或含 R14 嘅 session 未開）');
}

console.log('判讀：①比例明顯下降＋②主倉寫入類持續為 0 → R14 維持警告即可；②仍有寫入類 → 考慮該類轉硬攔（exit 2），只攔寫入類、放行唯讀檢查。');
