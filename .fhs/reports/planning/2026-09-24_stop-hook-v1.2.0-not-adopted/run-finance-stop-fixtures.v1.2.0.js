#!/usr/bin/env node
// scripts/hooks/test/run-finance-stop-fixtures.js
// stop-finance-auditor.js 回歸測試（2026-09-19，0600804 事故方案C-C6）
// v1.1.0（2026-09-22，cl-flow-fast 2026-09-21-1536）：F5 由「放行」改「攔截」——lookback
// 由「無條件放行」降級為「合法性提示」，呢個係刻意行為改變（正正係修緊嘅缺口），唔算改壞。
// v1.2.0（2026-09-24，cl-flow-fast 2026-09-24-0651）：新增 H1-H7（Edit/Write/MultiEdit 同義變體）、J1-J9（邊界）、
//   K1-K3（標記作用域）、P5（進程級）；既有 35 夾具不變。
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
    entries: [U('查 0600804 成本'), A(DISPATCH), TR(), A(T('成本 $1425')), U('咁利潤呢'), A(T('利潤 $4215，仲有另一個成本組件都啱'))] },

  // ── v1.2.0 新增（cl-flow-fast 2026-09-24-0651）：Edit/Write/MultiEdit 偵測 ──────────
  // 共通：用戶 prompt 刻意用非財務字眼，回覆純陳述句（無問號），確保訊號只來自寫入工具
  // H：同義變體（全部期望攔截）
  { name: 'H1 Edit FHS_Cost_System_Overview.md（財務權威文件路徑，內容無財務欄位亦算）→ 攔截', expect: true,
    entries: [U('更新總覽文件'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/FHS_Cost_System_Overview.md', old_string: 'a', new_string: '組件現行立場已更新' })), TR(), A(T('已更新。'))] },
  { name: 'H2 Write FHS_Finance_Bible.md → 攔截', expect: true,
    entries: [U('寫文件'), A(TU('Write', { file_path: 'D:/x/.fhs/ai/FHS_Finance_Bible.md', content: '# x' })), TR(), A(T('已寫入。'))] },
  { name: 'H3 Edit decisions.md new_string 含 net_profit（純陳述句）→ 攔截', expect: true,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: '結論：net_profit 不受影響。' })), TR(), A(T('已記錄。'))] },
  { name: 'H4 MultiEdit handoff.md 其中一條 edit 含 total_cost → 攔截', expect: true,
    entries: [U('交接'), A(TU('MultiEdit', { file_path: 'D:/x/.fhs/memory/handoff.md', edits: [{ old_string: 'a', new_string: '無關' }, { old_string: 'b', new_string: 'total_cost 已核對' }] })), TR(), A(T('已交接。'))] },
  { name: 'H5 Edit Windows 反斜線 FHS_Pricing_Bible.md → 攔截', expect: true,
    entries: [U('改文件'), A(TU('Edit', { file_path: 'D:\\x\\.fhs\\ai\\FHS_Pricing_Bible.md', old_string: 'a', new_string: 'b' })), TR(), A(T('已改。'))] },
  { name: 'H6 Write 根目錄 Changelog.md content 含 final_sale_price → 攔截', expect: true,
    entries: [U('記 changelog'), A(TU('Write', { file_path: 'D:/x/Changelog.md', content: 'final_sale_price 未受影響' })), TR(), A(T('已記。'))] },
  { name: 'H7 Edit 根目錄 CHANGELOG.md（大寫）new_string 含 handmodel_cost → 攔截', expect: true,
    entries: [U('記 changelog'), A(TU('Edit', { file_path: 'D:/x/CHANGELOG.md', old_string: 'a', new_string: 'handmodel_cost 已修' })), TR(), A(T('已記。'))] },

  // J：邊界（全部期望放行）
  { name: 'J1 Edit decisions.md new_string 無財務欄位 → 放行', expect: false,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: '純 UI 決策記錄' })), TR(), A(T('已記錄。'))] },
  { name: 'J2 Edit decisions.md 只有 old_string 含財務欄位、new_string 無 → 放行（驗 old_string 排除，見 A2 批評#5 拒絕理由）', expect: false,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: 'net_profit 錯誤舊段', new_string: '' })), TR(), A(T('已刪。'))] },
  { name: 'J3 Edit README.md 含 net_profit（非紀錄非財務檔）→ 放行', expect: false,
    entries: [U('改 readme'), A(TU('Edit', { file_path: 'D:/x/README.md', old_string: 'a', new_string: 'net_profit 說明' })), TR(), A(T('已改。'))] },
  { name: 'J4 H3 情境＋本輪有 finance-auditor dispatch → 放行', expect: false,
    entries: [U('記錄一下'), A(DISPATCH), TR(), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: '結論：net_profit 不受影響。' })), TR(), A(T('已記錄。'))] },
  { name: 'J5 Edit 內容 new_string=null（型態防禦，不崩）→ 放行', expect: false,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: null })), TR(), A(T('已記錄。'))] },
  { name: 'J6 MultiEdit edits 非陣列（型態防禦，不崩）→ 放行', expect: false,
    entries: [U('交接'), A(TU('MultiEdit', { file_path: 'D:/x/.fhs/memory/handoff.md', edits: 'oops' })), TR(), A(T('已交接。'))] },
  { name: 'J7 node_modules 內同名 decisions.md 含財務欄位 → 放行（A2 批評#3 路徑限定）', expect: false,
    entries: [U('改'), A(TU('Edit', { file_path: 'D:/x/node_modules/pkg/decisions.md', old_string: 'a', new_string: 'net_profit' })), TR(), A(T('已改。'))] },
  { name: 'J8 health-fixtures 內同名 handoff.md 含財務欄位 → 放行（repo 內真實存在嘅同名檔，誤殺實例）', expect: false,
    entries: [U('改夾具'), A(TU('Edit', { file_path: 'D:/x/scripts/hooks/test/health-fixtures/01-healthy-silent/.fhs/memory/handoff.md', old_string: 'a', new_string: 'total_cost' })), TR(), A(T('已改。'))] },
  { name: 'J9 decisions.md.tmp 後綴 → 放行（$ 錨定，非目標檔）', expect: false,
    entries: [U('改'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md.tmp', old_string: 'a', new_string: 'net_profit' })), TR(), A(T('已改。'))] },

  // K：標記作用域（A2 批評#4）——標記只認回覆文字
  { name: 'K1 豁免標記只寫喺 new_string 內、回覆文字無標記 → 仍攔截（防自我放行）', expect: true,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: '結論：net_profit 不變。【finance-auditor 豁免：自填】' })), TR(), A(T('已記錄。'))] },
  { name: 'K2 同一寫入，回覆文字帶豁免標記 → 放行', expect: false,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: '結論：net_profit 不變。' })), TR(), A(T('已記錄。【finance-auditor 豁免：純文字記錄，無數字判斷】'))] },
  { name: 'K3 同一寫入，回覆文字帶依據標記 → 放行', expect: false,
    entries: [U('記錄一下'), A(TU('Edit', { file_path: 'D:/x/.fhs/notes/decisions.md', old_string: '---', new_string: '結論：net_profit 不變。' })), TR(), A(T('已記錄。【依據：finance-auditor 2026-09-21】'))] }
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
  { name: 'P4 transcript 唔存在 → 放行', payload: JSON.stringify({ transcript_path: 'Z:/nope.jsonl' }), check: r => r.status === 0 && r.stdout === '' },
  // P5（v1.2.0）：純陳述句＋純 Edit 寫 decisions.md 嘅 transcript，走完整 stdin→readEntries→evaluate 路徑
  { name: 'P5 進程級：純 Edit 寫財務紀錄、無問號 → decision:block', payload: null, setup: () => {
      fs.writeFileSync(tmp5, cases.find(c => c.name.startsWith('H3 ')).entries.map(e => JSON.stringify(e)).join('\n'), 'utf8');
      return JSON.stringify({ transcript_path: tmp5 });
    }, check: r => r.status === 0 && /"decision":"block"/.test(r.stdout) && /寫入紀錄檔含財務欄位/.test(r.stdout) }
];
const tmp5 = path.join(__dirname, '.tmp-finance-stop-transcript-p5.jsonl');
for (const c of procCases) {
  const ok = c.check(runHook(c.setup ? c.setup() : c.payload));
  console.log(`${ok ? '✅' : '❌'} ${c.name}`);
  ok ? pass++ : fail++;
}
fs.unlinkSync(tmp);
if (fs.existsSync(tmp5)) fs.unlinkSync(tmp5);

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
