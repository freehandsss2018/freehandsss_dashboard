#!/usr/bin/env node
// UserPromptSubmit suggestion router. Project-specific routes belong in project policy.
'use strict';

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try { data = JSON.parse(input); } catch (_) { return; }
  const prompt = String(data.prompt || '').trim();
  if (!prompt || prompt.startsWith('/')) return;
  const lower = prompt.toLowerCase();
  const hints = [];
  if (/(architecture|架構|design decision|設計決策)/i.test(lower)) {
    hints.push('先讀治理判準與現有決策，再提出可驗證方案。');
  }
  if (/(review|審查|audit|稽核)/i.test(lower)) {
    hints.push('審查要附檔案行號、可重現反例及影響。');
  }
  if (/(large file|批次|跨檔|repository|儲存庫)/i.test(lower)) {
    hints.push('先有界搜尋，再讀相關窗口；大量輸出使用有回報合約的子任務。');
  }
  if (hints.length) process.stdout.write(`[Task Router] ${hints.join(' ')}\n`);
});
