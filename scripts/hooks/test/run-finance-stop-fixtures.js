#!/usr/bin/env node
// scripts/hooks/test/run-finance-stop-fixtures.js
// stop-finance-auditor.js 回歸測試（2026-09-19，0600804 事故方案C-C6）
// 用法：node scripts/hooks/test/run-finance-stop-fixtures.js [可選：真實 transcript.jsonl 路徑做重播]

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { evaluate } = require('../stop-finance-auditor.js');

const HOOK = path.join(__dirname, '../stop-finance-auditor.js');

const U = text => ({ type: 'user', message: { content: text } });
const TR = () => ({ type: 'user', message: { content: [{ type: 'tool_result', content: 'ok' }] } });
const A = (...tools) => ({ type: 'assistant', message: { content: tools } });
const T = text => ({ type: 'text', text });
const TU = (name, input) => ({ type: 'tool_use', name, input });
const SQL = q => TU('mcp__supabase__execute_sql', { project_id: 'x', query: q });
const DISPATCH = TU('Agent', { subagent_type: 'finance-auditor', prompt: 'audit' });

const cases = [
  { name: 'F1 財務 SQL、冇派 → 攔截', expect: true,
    entries: [U('check order 0600804'), A(SQL('SELECT net_profit, total_cost FROM orders')), TR(), A(T('done'))] },
  { name: 'F2 載 finance-gatekeeper 後自己答 → 攔截', expect: true,
    entries: [U('hello'), A(TU('Skill', { skill: 'finance-gatekeeper' })), TR(), A(T('answer'))] },
  { name: 'F3 prompt 有財務字眼、純文字作答 → 攔截', expect: true,
    entries: [U('大寶吊飾成本點計？'), A(T('我估係 $660'))] },
  { name: 'F4 本輪有派 finance-auditor → 放行', expect: false,
    entries: [U('check profit'), A(DISPATCH), TR(), A(SQL('SELECT total_cost FROM orders')), TR(), A(T('ok'))] },
  { name: 'F5 三輪前派過（lookback 內）→ 放行', expect: false,
    entries: [U('利潤？'), A(DISPATCH), TR(), U('a'), A(T('x')), U('b'), A(T('y')), U('成本再睇下'), A(T('z'))] },
  { name: 'F6 六輪前派過（超出 lookback）→ 攔截', expect: true,
    entries: [U('利潤？'), A(DISPATCH), TR(), U('1'), U('2'), U('3'), U('4'), U('5'), U('成本？'), A(T('z'))] },
  { name: 'F7 寫明豁免 → 放行', expect: false,
    entries: [U('改 Finance Bible 錯字「成本」'), A(T('已改。【finance-auditor 豁免：純文字 typo，無數字判斷】'))] },
  { name: 'F8 非財務任務 → 放行', expect: false,
    entries: [U('幫我改 V42 排版'), A(TU('Read', { file_path: 'x/freehandsss_dashboardV42.html' })), TR(), A(T('ok'))] },
  { name: 'F9 Read Finance Bible → 攔截', expect: true,
    entries: [U('睇下規則'), A(TU('Read', { file_path: 'D:/x/.fhs/ai/FHS_Finance_Bible.md' })), TR(), A(T('ok'))] },
  { name: 'F10 curl database/query 查財務欄位 → 攔截', expect: true,
    entries: [U('run it'), A(TU('Bash', { command: 'curl -X POST https://api.supabase.com/v1/projects/p/database/query --data \'{"query":"select net_profit from orders"}\'' })), TR(), A(T('ok'))] },
  { name: 'F11 isMeta / local-command 唔當 prompt 邊界', expect: false,
    entries: [U('利潤？'), A(DISPATCH), TR(), { type: 'user', isMeta: true, message: { content: [{ type: 'text', text: '成本' }] } }, U('<local-command-stdout>ok</local-command-stdout>'), A(T('ok'))] },
  { name: 'F13 純文字向 Fat Mo 提財務問題（無工具）→ 攔截', expect: true,
    entries: [U('中文'), A(T('方案 B 需要你先確認：大寶吊飾成本用邊個 tier？'))] },
  { name: 'F14 回覆有財務字眼但冇提問 → 放行', expect: false,
    entries: [U('總結下'), A(T('已完成，利潤數字已同步。'))] },
  { name: 'F15 Read finance-gatekeeper SKILL.md（Rule 3.16 路徑，Windows 反斜線）→ 攔截', expect: true,
    entries: [U('睇下'), A(TU('Read', { file_path: 'D:\\x\\.fhs\\ai\\skills\\finance-gatekeeper\\SKILL.md' })), TR(), A(T('ok'))] },
  { name: 'F16 Read 橋接版 .claude/skills/finance-gatekeeper/SKILL.md → 攔截', expect: true,
    entries: [U('睇下'), A(TU('Read', { file_path: 'D:/x/.claude/skills/finance-gatekeeper/SKILL.md' })), TR(), A(T('ok'))] },
  { name: 'F12 subagent 側鏈派工唔算主對話派工', expect: true,
    entries: [U('利潤？'), { type: 'assistant', isSidechain: true, message: { content: [DISPATCH] } }, A(T('x'))] }
];

let pass = 0, fail = 0;
for (const c of cases) {
  const r = evaluate(c.entries);
  const ok = r.block === c.expect;
  console.log(`${ok ? '✅' : '❌'} ${c.name} → block=${r.block}${r.why ? ' (' + r.why + ')' : ''}`);
  ok ? pass++ : fail++;
}

// 進程級測試：stop_hook_active 放行、壞 JSON 放行、block 輸出 JSON
function runHook(payload) {
  return spawnSync(process.execPath, [HOOK], { input: payload, encoding: 'utf8' });
}
const tmp = path.join(__dirname, '.tmp-finance-stop-transcript.jsonl');
fs.writeFileSync(tmp, cases[0].entries.map(e => JSON.stringify(e)).join('\n'), 'utf8');
const procCases = [
  { name: 'P1 block → stdout decision:block', payload: JSON.stringify({ transcript_path: tmp }), check: r => r.status === 0 && /"decision":"block"/.test(r.stdout) },
  { name: 'P2 stop_hook_active → 放行', payload: JSON.stringify({ transcript_path: tmp, stop_hook_active: true }), check: r => r.status === 0 && r.stdout === '' },
  { name: 'P3 壞 JSON → 靜默放行', payload: 'not json', check: r => r.status === 0 && r.stdout === '' },
  { name: 'P4 transcript 唔存在 → 放行', payload: JSON.stringify({ transcript_path: 'Z:/nope.jsonl' }), check: r => r.status === 0 && r.stdout === '' }
];
for (const c of procCases) {
  const ok = c.check(runHook(c.payload));
  console.log(`${ok ? '✅' : '❌'} ${c.name}`);
  ok ? pass++ : fail++;
}
fs.unlinkSync(tmp);

// 可選：真實 transcript 重播（逐個 prompt 邊界截斷，列出每輪判定）
const replay = process.argv[2];
if (replay && fs.existsSync(replay)) {
  const { isPromptEntry } = require('../stop-finance-auditor.js');
  const all = fs.readFileSync(replay, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch (_) { return null; } }).filter(Boolean);
  const bounds = [];
  all.forEach((e, i) => { if (isPromptEntry(e)) bounds.push(i); });
  console.log(`\n── 重播 ${path.basename(replay)}（${bounds.length} 個 prompt 邊界）──`);
  bounds.forEach((b, k) => {
    const end = k + 1 < bounds.length ? bounds[k + 1] : all.length;
    const r = evaluate(all.slice(0, end));
    const c = all[b].message.content;
    const head = (typeof c === 'string' ? c : (c.find(x => x.type === 'text') || {}).text || '[image]').replace(/\s+/g, ' ').slice(0, 40);
    console.log(`  turn ${k + 1}: block=${r.block} (${r.why || r.signals.join('、')}) | ${head}`);
  });
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
