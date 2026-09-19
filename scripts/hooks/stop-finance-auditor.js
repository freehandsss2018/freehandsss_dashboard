#!/usr/bin/env node
// scripts/hooks/stop-finance-auditor.js
// FHS Stop Hook — 財務必派 finance-auditor 把關
//
// Version: 1.0.0 | 2026-09-19（0600804 事故方案C-C6，Fat Mo /execute 授權）
//
// 背景：AI 載入咗 finance-gatekeeper、讀到「Live 訂單成本/利潤驗證 → 啟動 finance-auditor」，
//       仍然全程自己查 SQL、自己推算，仲將查得到嘅財務問題丟俾 Fat Mo。根因之一係 harness
//       預設「用戶未要求唔派 subagent」蓋過項目規則；靠 AI 自覺唔夠，所以加機械把關。
//
// 規則：本輪（最後一個用戶 prompt 之後）出現財務訊號，而最近 LOOKBACK_TURNS 輪內從未派過
//       finance-auditor，亦冇寫【finance-auditor 豁免：理由】→ 攔截收尾一次，要求先派工。
//
// 財務訊號（任一）：
//   (a) 載入 finance-gatekeeper skill
//   (b) execute_sql / curl database/query 觸及財務欄位
//   (c) Read 財務權威文件（Finance Bible / Pricing Bible / Cost Schema）
//   (d) 本輪用戶 prompt 含財務字眼
//   (e) 本輪 AI 回覆含財務字眼＋向 Fat Mo 提問／求確認（0600804 事故「中文」嗰輪純文字重列4條財務問題，冇用工具，(a)-(d) 全部捉唔到）
//
// 防死鎖：stop_hook_active=true（即已經因 Stop hook 續行過一次）→ 一律放行。
// 任何解析錯誤 → 靜默放行（唔可以因 hook 壞咗而卡死 session）。

'use strict';

const fs = require('fs');

const LOOKBACK_TURNS = 5;
const WAIVER_MARK = '【finance-auditor 豁免';

const FIN_COLUMNS = /(net_profit|total_cost|final_sale_price|handmodel_cost|keychain_cost|necklace_cost|accessory_cost|total_base_cost|cost_configurations|item_base_cost|subtotal_cost)/i;
// finance-gatekeeper SKILL.md 都計：Rule 3.16 叫 AI 用 Read 讀，唔一定經 Skill 工具（2026-09-19 盲測揪出）
const FIN_DOCS = /(FHS_Finance_Bible|FHS_Pricing_Bible|FHS_Product_Cost_Schema|finance-gatekeeper[\\/]SKILL\.md)/i;
const FIN_PROMPT = /(財務|利潤|成本|定價|售價|毛利|對帳|net_profit|total_cost|final_sale_price|profit|pricing)/i;
const ASKS_USER = /(請你確認|需要你確認|等你確認|你先確認|請確認|想問你|問你|[？?]\s*$)/m;

function isPromptEntry(e) {
  if (!e || e.type !== 'user' || e.isMeta || e.isSidechain) return false;
  const c = e.message && e.message.content;
  if (typeof c === 'string') {
    return !c.startsWith('<local-command-');
  }
  if (Array.isArray(c)) {
    return c.length > 0 && !c.some(b => b && b.type === 'tool_result');
  }
  return false;
}

function promptText(e) {
  const c = e.message && e.message.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.filter(b => b && b.type === 'text').map(b => b.text || '').join('\n');
  return '';
}

function toolUses(e) {
  if (!e || e.type !== 'assistant' || e.isSidechain) return [];
  const c = e.message && e.message.content;
  return Array.isArray(c) ? c.filter(b => b && b.type === 'tool_use') : [];
}

function assistantText(e) {
  if (!e || e.type !== 'assistant' || e.isSidechain) return '';
  const c = e.message && e.message.content;
  return Array.isArray(c) ? c.filter(b => b && b.type === 'text').map(b => b.text || '').join('\n') : '';
}

function isFinanceAuditorDispatch(tu) {
  return (tu.name === 'Agent' || tu.name === 'Task') &&
    tu.input && String(tu.input.subagent_type || '').trim() === 'finance-auditor';
}

function financeSignal(tu) {
  const input = tu.input || {};
  if (tu.name === 'Skill' && /finance-gatekeeper/.test(String(input.skill || ''))) return 'skill finance-gatekeeper';
  if (/execute_sql$/.test(tu.name) && FIN_COLUMNS.test(String(input.query || ''))) return 'execute_sql 觸及財務欄位';
  if ((tu.name === 'Bash' || tu.name === 'PowerShell') &&
      /database\/query|rest\/v1\//.test(String(input.command || '')) &&
      FIN_COLUMNS.test(String(input.command || ''))) return 'curl 查詢財務欄位';
  if ((tu.name === 'Read' || tu.name === 'Grep') &&
      FIN_DOCS.test(String(input.file_path || input.path || ''))) return 'Read 財務權威文件';
  return null;
}

// 純函數，供 test/run-finance-stop-fixtures.js 直接測試
function evaluate(entries) {
  const boundaries = [];
  entries.forEach((e, i) => { if (isPromptEntry(e)) boundaries.push(i); });
  if (boundaries.length === 0) return { block: false, why: 'no-prompt' };

  const turnStart = boundaries[boundaries.length - 1];
  const turn = entries.slice(turnStart);
  const lookStart = boundaries[Math.max(0, boundaries.length - LOOKBACK_TURNS)];
  const lookback = entries.slice(lookStart);

  const signals = [];
  if (FIN_PROMPT.test(promptText(entries[turnStart]))) signals.push('用戶 prompt 含財務字眼');
  turn.forEach(e => toolUses(e).forEach(tu => {
    const s = financeSignal(tu);
    if (s && !signals.includes(s)) signals.push(s);
  }));
  const replyText = turn.map(assistantText).join('\n');
  if (FIN_PROMPT.test(replyText) && ASKS_USER.test(replyText)) signals.push('回覆向 Fat Mo 提財務問題');
  if (signals.length === 0) return { block: false, why: 'no-signal' };

  const dispatched = lookback.some(e => toolUses(e).some(isFinanceAuditorDispatch));
  if (dispatched) return { block: false, why: 'dispatched', signals };

  const waived = turn.some(e => assistantText(e).includes(WAIVER_MARK));
  if (waived) return { block: false, why: 'waived', signals };

  return { block: true, signals };
}

function readEntries(transcriptPath) {
  const raw = fs.readFileSync(transcriptPath, 'utf8');
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch (_) { /* skip bad line */ }
  }
  return out;
}

if (require.main === module) {
  let input = '';
  process.stdin.on('data', chunk => { input += chunk; });
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(input);
      if (data.stop_hook_active === true) process.exit(0);
      if (!data.transcript_path || !fs.existsSync(data.transcript_path)) process.exit(0);

      const result = evaluate(readEntries(data.transcript_path));
      if (!result.block) process.exit(0);

      const reason = [
        '🔴 [stop-finance-auditor] 本輪有財務訊號，但最近 ' + LOOKBACK_TURNS + ' 輪未派 finance-auditor。',
        '   → 訊號：' + result.signals.join('、'),
        '   → 規則：CLAUDE.md 第四紅線／AGENTS.md「財務派工補充條款」／finance-gatekeeper §〇＋死線6',
        '   → 請即派 Agent(subagent_type: "finance-auditor")（可 run_in_background）覆核本輪財務判斷／數字，',
        '     未有其結論前唔好向 Fat Mo 提財務問題，亦唔好以自己 SQL／推算宣告財務驗收。',
        '   → 若本輪唔涉及任何財務數字判斷（例如純改財務文件字眼，或財務字眼誤觸嘅非財務任務），',
        '     喺回覆寫明【finance-auditor 豁免：理由】，Fat Mo 事後審視。'
      ].join('\n');
      process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
      process.exit(0);
    } catch (_) {
      process.exit(0);
    }
  });
}

module.exports = { evaluate, isPromptEntry, financeSignal };
