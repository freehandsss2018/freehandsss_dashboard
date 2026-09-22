#!/usr/bin/env node
// scripts/hooks/test/run-finance-stop-fixtures.js
// stop-finance-auditor.js 回歸測試（2026-09-19，0600804 事故方案C-C6）
// v1.1.0（2026-09-22，cl-flow-fast 2026-09-21-1536）：F5 由「放行」改「攔截」——lookback
// 由「無條件放行」降級為「合法性提示」，呢個係刻意行為改變（正正係修緊嘅缺口），唔算改壞。
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
  { name: 'F5 三輪前派過、本輪冇 dispatch 亦冇引用 → 攔截（v1.1.0：修「lookback 內無條件放行」缺口，此為刻意行為改變）', expect: true,
    entries: [U('利潤？'), A(DISPATCH), TR(), U('a'), A(T('x')), U('b'), A(T('y')), U('成本再睇下'), A(T('z'))] },
  { name: 'F6 六輪前派過（超出 lookback，都冇 dispatch/引用/豁免）→ 攔截', expect: true,
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
    entries: [U('利潤？'), { type: 'assistant', isSidechain: true, message: { content: [DISPATCH] } }, A(T('x'))] },

  // ── v1.1.0 新增：條件(2) 依據標記 ──────────────────────────────────────
  { name: 'F17 本輪冇 dispatch，但引用既有報告且 lookback 內有對應 dispatch → 放行 (cited-verified)', expect: false,
    entries: [U('利潤？'), A(DISPATCH), TR(), U('前端成本估算點計？'), A(T('【依據：finance-auditor 2026-09-21】前端只係參考預算。'))] },
  { name: 'F18 引用既有報告但 lookback 內完全冇 dispatch → 仍放行 (cited-unverified，合法性提示唔封鎖，報告可能嚟自更早 session)', expect: false,
    entries: [U('成本點計？'), A(T('【依據：finance-auditor 2026-09-20】前端估算唔入帳。'))] },
  { name: 'F19 依據標記格式：含 flow_id → 放行', expect: false,
    entries: [U('賠本守衛有冇用？'), A(T('【依據：finance-auditor flow 2026-09-21-1536】65 張單 0 張觸發。'))] },
  { name: 'F20 假引用（漏方括號，非法格式）→ 唔算引用，攔截', expect: true,
    entries: [U('成本點計？'), A(T('依據 finance-auditor 2026-09-20，前端估算唔入帳。'))] },

  // ── v1.1.0 新增：同義變體（≥5，測 CITES_AUDITOR / 既有偵測嘅泛化穩健度） ──
  { name: 'G1 用戶問「要唔要退役」，AI答「建議唔改」→ 仍攔截（用戶 prompt 本身含「成本」已觸發訊號，同AG否決嘅PROPOSES_CHANGE正則無關；證明我哋冇加嗰條正則都唔會漏放呢類提問）', expect: true,
    entries: [U('前端成本估算要唔要退役？'), A(T('建議唔改，帳簿冇因佢出錯。'))] },
  { name: 'G2 同義：財務提問用「唔知道 X 啱唔啱」措辭 → 攔截（FIN_PROMPT 命中「成本」+ 句尾問號）', expect: true,
    entries: [U('查下 0600804'), A(T('唔知道呢張單嘅成本啱唔啱？'))] },
  { name: 'G3 同義：中英夾雜 profit/cost 財務字眼 → 攔截', expect: true,
    entries: [U('check this order'), A(T('the profit looks off，需要你確認先繼續？'))] },
  { name: 'G4 同義：依據標記夾雜於長回覆中間（非開首）→ 放行', expect: false,
    entries: [U('成本點計？'), A(T('先講返背景……然後結論：【依據：finance-auditor 2026-09-21】前端估算唔入帳，故此毋須修改。'))] },
  { name: 'G5 同義：豁免標記措辭變體（理由用英文）→ 放行', expect: false,
    entries: [U('改 Pricing Bible 錯字'), A(T('已改。【finance-auditor 豁免：pure typo fix, no numeric judgment】'))] },
  { name: 'G6 同義：Grep（非 Read）財務權威文件 → 攔截', expect: true,
    entries: [U('搵下'), A(TU('Grep', { path: 'D:/x/.fhs/ai/FHS_Finance_Bible.md', pattern: '成本' })), TR(), A(T('ok'))] },

  // ── v1.1.0 新增：邊界案例（≥5，覆蓋 Verdict 指定嘅五類） ──────────────
  { name: 'B1 純文件改字（同 F7，另立一條標明「邊界案例①」）→ 放行', expect: false,
    entries: [U('改 Finance Bible 錯字「成本」'), A(T('已改。【finance-auditor 豁免：純文字 typo，無數字判斷】'))] },
  { name: 'B2 非財務任務誤觸（同 F8，另立一條標明「邊界案例②」）→ 放行', expect: false,
    entries: [U('幫我改 V42 排版'), A(TU('Read', { file_path: 'x/freehandsss_dashboardV42.html' })), TR(), A(T('ok'))] },
  { name: 'B3 已帶依據標記（邊界案例③，見 F17）→ 放行', expect: false,
    entries: [U('利潤？'), A(DISPATCH), TR(), U('再問下成本'), A(T('【依據：finance-auditor 2026-09-21】不變。'))] },
  { name: 'B4 已帶豁免（同 F7，邊界案例④）→ 放行', expect: false,
    entries: [U('改成本文件註解'), A(T('已改。【finance-auditor 豁免：純註解更新】'))] },
  { name: 'B5 連續多輪同一議題、每輪都有新財務結論但只喺第一輪派過 → 第二輪起攔截（刻意收緊，見 F5）', expect: true,
    entries: [U('查 0600804 成本'), A(DISPATCH), TR(), A(T('成本 $1425')), U('咁利潤呢'), A(T('利潤 $4215，仲有另一個成本組件都啱'))] }
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
