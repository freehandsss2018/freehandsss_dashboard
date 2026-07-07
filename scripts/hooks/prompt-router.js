#!/usr/bin/env node
// scripts/hooks/prompt-router.js
// FHS UserPromptSubmit Hook — Intelligent Task Router
// Analyzes the user's prompt and injects subagent/skill/model routing suggestions
// Version: 1.0.0 | 2026-04-28
// Output: plain text injected into Claude's context (suggestion mode, not enforcement)

'use strict';

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    process.exit(0); // Not JSON stdin, pass through silently
  }

  const rawPrompt = data.prompt || '';
  const prompt = rawPrompt.toLowerCase();

  // Skip routing suggestions for slash commands (they're self-descriptive)
  const slashCommands = ['/read', '/commit', '/execute', '/cl-flow', '/cl-flow-fast',
    '/fhs-check', '/fhs-audit', '/guardian', '/error-eye', '/rg', '/rp',
    '/db-query', '/new-product', '/upload-web', '/fhs-cost-audit'];
  if (slashCommands.some(cmd => rawPrompt.trim().startsWith(cmd))) {
    process.exit(0);
  }

  // ─── Routing Rules ──────────────────────────────────────────────────────
  // Order matters: first match wins
  const routes = [
    // ── Large change warning (check before general categories) ──
    {
      patterns: ['大改', '重構', '翻新', '多個節點', '重寫', 'refactor', '全部改'],
      subagent: null,
      skill: null,
      model: 'opus',
      guardian: true,
      reason: '偵測到大範圍改動'
    },
    // ── UI / Design Sprint ──
    {
      patterns: ['ui改', 'ui設計', '設計稿', 'wireframe', '視覺設計', '設計系統',
        'phase a', '介面設計', '排版', '色彩系統', '設計語言', '設計風格', '響應式設計'],
      subagent: 'ui-designer',
      skill: null,
      reference: '.fhs/ai/skills/ui-ux-pro-max/（設計規格參考文件，非 Skill-tool，由 ui-designer 在 Phase A 讀取）',
      model: 'sonnet',
      reason: '偵測到 UI/設計任務'
    },
    // ── Prototype Build ──
    {
      patterns: ['原型', 'prototype', 'phase b', '寫html', '建html', 'html/css', '前端實作', '靜態mock'],
      subagent: 'frontend-developer',
      skill: null,
      model: 'sonnet',
      reason: '偵測到原型建立任務'
    },
    // ── Complex Architecture (Opus) — 移至 Quality Review 之前，避免「架構審查」類 prompt 被審查關鍵詞先攔截 ──
    {
      patterns: ['架構', '技術選型', '系統設計', '新系統', '引入外部', '新api', 'new architecture', 'harness'],
      subagent: null,
      skill: null,
      model: 'opus',
      reason: '偵測到複雜架構決策任務'
    },
    // ── Financial Audit（須排在 Quality Review 之前，避免「稽核」字樣被品質審查路由搶先攔截）──
    {
      patterns: ['財務稽核', '利潤核對', 'triple sync 稽核', '三端核對', 'finance audit',
        '對帳', '訂單利潤驗證'],
      subagent: 'finance-auditor',
      skill: null,
      model: 'sonnet',
      reason: '偵測到財務稽核任務（2026-07-07 S152-followup 補鏈）'
    },
    // ── Quality Review / Audit ──
    {
      patterns: ['稽核', '審查', '品質', 'code review', 'phase c', '守門', 'audit check', 'fhs audit'],
      subagent: 'code-reviewer',
      skill: null,
      model: 'haiku',
      reason: '偵測到品質審查任務'
    },
    // ── New Product / SKU Integration（須排在 Database 之前，避免「sku」字樣被資料庫路由搶先攔截）──
    {
      patterns: ['新產品', '新sku', 'new sku', 'item_status', '新款式', '新品項類型',
        '跨層融入', '新增下拉選項'],
      subagent: 'product-integration-validator',
      skill: null,
      model: 'sonnet',
      reason: '偵測到新產品跨層融入任務（2026-07-07 S152-followup 補鏈），另見 /new-product 指令'
    },
    // ── Database / Airtable / n8n Data ──
    {
      patterns: ['airtable', '欄位', 'schema', 'triple_sync', 'triple sync', '三端',
        'sku', '資料庫', '資料流', 'code node格式', 'n8n欄位', 'field mapping'],
      subagent: 'database-reviewer',
      skill: null,
      model: 'sonnet',
      reason: '偵測到 Airtable / n8n 資料流任務'
    },
    // ── TDD / Testing ──
    {
      patterns: ['測試', 'tdd', 'python test', 'run_all', 'maintenance_tools',
        '單元測試', '測試腳本', 'test case', 'red-green'],
      subagent: 'tdd-guide',
      skill: null,
      model: 'sonnet',
      reason: '偵測到測試驅動開發任務'
    },
    // ── Error / Debug (Haiku for speed) ──
    {
      patterns: ['錯誤', 'error', 'crash', '掛了', 'debug', '診斷', '失敗',
        'fail', 'exception', 'undefined', '崩潰', 'bug', 'stack trace', '報錯'],
      subagent: 'build-error-resolver',
      skill: null,
      model: 'haiku',
      reason: '偵測到錯誤診斷任務'
    },
    // ── Finance / Profit ──
    {
      patterns: ['利潤', 'profit', '毛利', 'gross margin', 'revenue', '收入', 'aov',
        '財務計算', 'financial', '售價', '成本計算'],
      subagent: null,
      skill: 'finance-gatekeeper',
      model: 'sonnet',
      reason: '偵測到財務計算相關任務'
    },
    // ── 3D Print / Blender ──
    {
      patterns: ['blender', '3d列印', '3d 列印', 'stl', 'fdm', '手模', '立體擺設建模', '網格修復'],
      subagent: 'blender-3d-modeler',
      skill: null,
      model: 'sonnet',
      reason: '偵測到 3D 建模/列印任務（2026-07-07 S152-followup 補鏈）'
    }
  ];

  // ─── Match ───────────────────────────────────────────────────────────────
  let matched = null;
  for (const route of routes) {
    if (route.patterns.some(p => prompt.includes(p))) {
      matched = route;
      break;
    }
  }

  if (!matched) {
    process.exit(0); // No match, pass through silently
  }

  // ─── Build Suggestion ────────────────────────────────────────────────────
  const parts = [];
  parts.push(`[FHS Router] ${matched.reason}`);
  if (matched.guardian) {
    parts.push('→ ⚠️  建議先執行 /guardian 稽核（大範圍改動四部曲）');
  }
  if (matched.subagent) {
    parts.push(`→ 建議 subagent: ${matched.subagent}`);
  }
  if (matched.skill) {
    parts.push(`→ 載入 skill: ${matched.skill}`);
  }
  if (matched.reference) {
    parts.push(`→ 參考文件: ${matched.reference}`);
  }
  if (matched.model) {
    parts.push(`→ 建議 model: ${matched.model}  (切換：/model ${matched.model})`);
  }

  console.log(parts.join('\n'));
  process.exit(0);
});
