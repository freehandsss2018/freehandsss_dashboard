#!/usr/bin/env node
// scripts/hooks/stop-finance-auditor.js
// FHS Stop Hook — 財務必派 finance-auditor 把關
//
// Version: 1.1.1 | 2026-09-24（僅註解：新增「已知不覆蓋」段，零邏輯改動；cl-flow-fast 2026-09-24-0534，D84）
// [前次] 1.1.0 | 2026-09-22（cl-flow-fast 2026-09-21-1536，Fat Mo /execute A 授權；
//                              修「lookback 5 輪內派過即無條件放行」缺口）
// [前次] 1.0.0 | 2026-09-19（0600804 事故方案C-C6，Fat Mo /execute 授權）
//
// 背景：AI 載入咗 finance-gatekeeper、讀到「Live 訂單成本/利潤驗證 → 啟動 finance-auditor」，
//       仍然全程自己查 SQL、自己推算，仲將查得到嘅財務問題丟俾 Fat Mo。根因之一係 harness
//       預設「用戶未要求唔派 subagent」蓋過項目規則；靠 AI 自覺唔夠，所以加機械把關。
//
// 規則（v1.1.0 舉證責任倒置）：本輪出現財務訊號時，放行條件改為以下三選一——
//   (1) 本輪本身有 finance-auditor dispatch；或
//   (2) 回覆含依據標記【依據：finance-auditor <flow_id 或日期>】，明確引用已有報告；或
//   (3) 回覆含既有豁免標記【finance-auditor 豁免：理由】
//   三者皆冇 → 攔截收尾一次。
//
// v1.1.0 改動理由：v1.0.0 用「lookback 5 輪內派過就無條件放行」，令 D80 驗收時派過一次後，
//       之後幾輪全新嘅財務結論（2026-09-20 前端成本估算評估 6 處錯、其後第二次更正）全部被
//       `why: 'dispatched'` 放行，從未再經 auditor 核對——即 lookback 本身係漏洞，唔係防線。
//       cl-flow-fast Verdict（2026-09-21-1536）BLOCKER：Hook 無狀態，無法靠純程式判斷自然語言
//       「呢個結論係咪新」，故改為要求 AI 自報依據（Hook 只做字串存在性檢查，零語義判斷）。
//       LOOKBACK_TURNS 保留但降級：唔再用嚟無條件放行，只用嚟喺條件(2)命中時標註
//       'cited-verified'／'cited-unverified'（合法性提示，唔影響是否放行——Hook 冇能力驗證
//       AI 引用嘅報告是否真實存在／內容是否對應，呢個仍然靠 AI 紀律同人手抽查，同 WAIVER_MARK
//       一直以來嘅信任基礎一致）。
//
// 財務訊號（任一，偵測邏輯本身 v1.1.0 不變）：
//   (a) 載入 finance-gatekeeper skill
//   (b) execute_sql / curl database/query 觸及財務欄位
//   (c) Read 財務權威文件（Finance Bible / Pricing Bible / Cost Schema）
//   (d) 本輪用戶 prompt 含財務字眼
//   (e) 本輪 AI 回覆含財務字眼＋向 Fat Mo 提問／求確認（0600804 事故「中文」嗰輪純文字重列4條財務問題，冇用工具，(a)-(d) 全部捉唔到）
//
// 刻意唔做（cl-flow-fast AG 評審否決，見 artifacts/2026-09-21-1536/ag-review.md 批評#3）：
//   唔新增「改動建議」語義偵測正則（例如比對「建議／應該」+「改／退役」）——AG 指出呢類正則
//   無法排除否定句（「建議唔改」一樣命中），會逼 AI 濫用豁免標記令 Hook 形同虛設。
//
// 已知不覆蓋（D84，cl-flow-fast 2026-09-24-0534 量度後決定不擴充，唔好當作漏咗冇人知）：
//   「陳述句（冇問號）財務結論＋只用 Edit/Write 寫入文件」嘅輪次，(a)-(e) 全部 no-signal。
//   實例：2026-09-20 session 275997f1 第二次 /commit 完成摘要轉述錯誤結論（該結論喺更早輪次已被覆蓋）。
//   量度（143 session／2,050 輪重播，「無覆蓋」基數 1,635 輪，數字係上限估算）：
//     寫入內容含財務欄位名 +66 輪(3.2%)、回覆含財務字眼＋金額 +40(2.0%)——兩者皆捉唔到該實例；
//     寫入內容含任何財務字眼 +229(11.2%)、回覆含任何財務字眼 +235(11.5%)——捉到但誤報過高，豁免標記會通脹。
//   根因係 Hook 無狀態，分辨唔到「轉述舊結論」同「作出新結論」（系統層面限制，唔係加正則可解；D83 已否決語義判斷）。
//   重啟條件：出現第 2 宗「錯結論經 Edit/Write 入庫且事後被 Fat Mo 發現」，或日後可度量豁免使用率。
//   重議方案 B（Edit/Write 內容含 FIN_COLUMNS）前置：派 fresh-context agent 抽樣覆核 66 輪內幾多輪係真財務結論。
//
// 防死鎖：stop_hook_active=true（即已經因 Stop hook 續行過一次）→ 一律放行。
// 任何解析錯誤 → 靜默放行（唔可以因 hook 壞咗而卡死 session）。

'use strict';

const fs = require('fs');

const LOOKBACK_TURNS = 5;
const WAIVER_MARK = '【finance-auditor 豁免';
const CITES_AUDITOR = /【依據：finance-auditor[^】]{0,120}】/;

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

  // 條件(1)：本輪本身有 dispatch（v1.1.0 收緊：由「lookback 5 輪內曾派過」改為「本輪必須有」，
  // 堵住「派過一次、之後幾輪全新財務結論全部免檢」嘅缺口——2026-09-20 事故正正係咁穿過去）
  const dispatchedThisTurn = turn.some(e => toolUses(e).some(isFinanceAuditorDispatch));
  if (dispatchedThisTurn) return { block: false, why: 'dispatched-this-turn', signals };

  // 條件(2)：回覆明確引用已有 finance-auditor 報告（舉證責任倒置，Hook 只做字串存在性檢查，
  // 唔判斷引用內容是否真實對應——同 WAIVER_MARK 一樣靠 AI 紀律 + 人手抽查，唔係新弱點）
  const cited = turn.some(e => CITES_AUDITOR.test(assistantText(e)));
  if (cited) {
    // LOOKBACK_TURNS 喺呢度降級做「合法性提示」：唔影響是否放行，淨係話俾人手抽查時
    // 睇 lookback 內有冇對應嘅 dispatch 紀錄（冇亦唔攔，因為報告可能來自更早／前一 session）
    const verifiedInLookback = lookback.some(e => toolUses(e).some(isFinanceAuditorDispatch));
    return { block: false, why: verifiedInLookback ? 'cited-verified' : 'cited-unverified', signals };
  }

  // 條件(3)：豁免標記
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
        '🔴 [stop-finance-auditor] 本輪有財務訊號，但冇喺本輪派 finance-auditor，亦冇引用既有報告或豁免。',
        '   → 訊號：' + result.signals.join('、'),
        '   → 規則：CLAUDE.md 第四紅線／AGENTS.md「財務派工補充條款」／finance-gatekeeper §〇＋死線6',
        '   → 請三選一：',
        '     (1) 派 Agent(subagent_type: "finance-auditor")（可 run_in_background）覆核本輪財務判斷／數字；',
        '     (2) 若本輪結論已由較早派過嘅 finance-auditor 報告覆蓋，喺回覆寫明',
        '         【依據：finance-auditor <flow_id 或日期>】明確引用該報告；',
        '     (3) 若本輪唔涉及任何財務數字判斷（例如純改財務文件字眼，或財務字眼誤觸嘅非財務任務），',
        '         喺回覆寫明【finance-auditor 豁免：理由】，Fat Mo 事後審視。',
        '   → 未有其結論／引用前，唔好向 Fat Mo 提財務問題，亦唔好以自己 SQL／推算宣告財務驗收。'
      ].join('\n');
      process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
      process.exit(0);
    } catch (_) {
      process.exit(0);
    }
  });
}

module.exports = { evaluate, isPromptEntry, financeSignal };
