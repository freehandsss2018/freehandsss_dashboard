#!/usr/bin/env node
// scripts/hooks/prompt-router.js
// FHS UserPromptSubmit Hook — Intelligent Task Router
// Analyzes the user's prompt and injects subagent/skill/model routing suggestions
// Version: 2.0.0 | 2026-08-03 (flow 2026-08-03-2003, learnings 分桶重構 P3)
// Change: 新增獨立 learnings 領域路由（P3.1-P3.5）——按任務內容自動注入命中
//         桶檔全文至工作記憶，同 session 內去重，slash command 白名單放行。
//         舊有 12 條 subagent/model 路由（first-match-wins）完全不變、不受影響。
// Output: plain text injected into Claude's context (suggestion mode, not enforcement)

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');
const LEARNINGS_DIR = path.join(REPO_ROOT, '.fhs/memory/learnings');
const INJECTED_STATE_DIR = path.join(REPO_ROOT, '.fhs'); // gitignored 暫態檔慣例，見 .gitignore

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
  const trimmedPrompt = rawPrompt.trim();

  // ─── Slash command classification ──────────────────────────────────────
  // 全部 slash command 一律不做 subagent/model 建議（自我描述已足夠）。
  // 但 5 個「重活」指令仍放行 learnings 注入（P3.3，A2 對抗評審 #4 採納：
  // 避免 /commit、/fhs-slim 等輕量維護指令被無關全文塞爆 context）。
  const ALL_SLASH_COMMANDS = ['/read', '/commit', '/execute', '/cl-flow', '/cl-flow-fast',
    '/fhs-check', '/fhs-audit', '/guardian', '/error-eye', '/rg', '/rp',
    '/db-query', '/new-product', '/upload-web', '/fhs-cost-audit'];
  const LEARNINGS_WHITELISTED_COMMANDS = ['/cl-flow', '/cl-flow-fast', '/execute', '/error-eye', '/guardian'];

  const isSlashCommand = ALL_SLASH_COMMANDS.some(cmd => trimmedPrompt.startsWith(cmd));
  const isLearningsWhitelisted = LEARNINGS_WHITELISTED_COMMANDS.some(cmd => trimmedPrompt.startsWith(cmd));

  const outputParts = [];

  // ─── Learnings 領域路由（P3，2026-08-03 flow 2026-08-03-2003）───────────
  if (!isSlashCommand || isLearningsWhitelisted) {
    const learningsOutput = buildLearningsInjection(prompt, data.session_id, data.transcript_path);
    if (learningsOutput) outputParts.push(learningsOutput);
  }

  if (isSlashCommand) {
    if (outputParts.length) console.log(outputParts.join('\n\n'));
    process.exit(0); // subagent/model 建議一律跳過（slash command 已自我描述）
  }

  // ─── Routing Rules（既有 12 條，完全不變）──────────────────────────────
  // Order matters: first match wins
  const routes = [
    // ── Large change warning (check before general categories) ──
    {
      patterns: ['大改', '重構', '翻新', '多個節點', '重寫', 'refactor', '全部改'],
      excludes: ['不要改', '先不改', '唯讀', '只分析', '只盤點', '只規劃', '製作計畫', '實施計畫', 'implementation plan', '先讀取', '稽核報告'],
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
      // T7: if route has excludes and any exclude word is in prompt, skip this route (S148 Phase 3)
      if (route.excludes && route.excludes.some(e => prompt.includes(e))) {
        continue; // skip — user indicated read-only/plan-only intent
      }
      matched = route;
      break;
    }
  }

  if (matched) {
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
    outputParts.push(parts.join('\n'));
  }

  if (outputParts.length) console.log(outputParts.join('\n\n'));
  process.exit(0);
});

// ── Learnings 領域路由實作（P3.1-P3.5）──────────────────────────────────────

const LEARNINGS_ROUTES = [
  {
    bucket: 'supabase',
    patterns: ['supabase', 'postgres', 'postgrest', 'rls', 'migration', '遷移',
      'rpc', 'schema', '欄位', 'grant', 'revoke', 'sql']
  },
  {
    bucket: 'frontend',
    patterns: ['dashboard', 'html', '前端', '表單', 'modal', '手機版', 'dom',
      'calculatepricing', '渲染', 'v42', 'current.html']
  },
  {
    bucket: 'finance',
    patterns: ['財務', '成本', '利潤', '定價', 'sku', '售價', 'cost', 'profit',
      'pricing', '毛利', '報價', '折扣']
  },
  {
    bucket: 'n8n',
    patterns: ['n8n', 'workflow', 'webhook', '節點', 'node', 'workflow id']
  },
  {
    bucket: 'governance',
    patterns: ['治理', 'governance', 'subagent', '多代理', 'skill', '文件生命週期',
      '退役', '派工', '調度']
  },
  {
    bucket: 'tooling',
    patterns: ['python', 'canva', '第三方', 'harness', 'blender', '腳本', 'script']
  }
];

// 掃全部 6 桶，收集所有命中（不 break，與舊有 12 條 subagent 路由的
// first-match-wins 邏輯完全獨立，互不干擾）。
function matchLearningsBuckets(promptLower) {
  const hit = [];
  for (const route of LEARNINGS_ROUTES) {
    if (route.patterns.some(p => promptLower.includes(p))) {
      hit.push(route.bucket);
    }
  }
  return hit;
}

// Session 去重鍵解析：優先 session_id（P3.0 探針已實測確認真實存在且穩定），
// 缺席時 fallback transcript_path 的 hash，兩者皆缺則退化為全域單檔（無 session
// 區隔，但仍不會同一輪內重複注入同一桶——見 state 檔本身即以 bucket 為 key）。
function resolveSessionKey(sessionId, transcriptPath) {
  if (sessionId) return String(sessionId);
  if (transcriptPath) {
    try {
      const crypto = require('crypto');
      return 'tp-' + crypto.createHash('sha1').update(String(transcriptPath)).digest('hex').slice(0, 12);
    } catch (_) { /* fall through */ }
  }
  return 'global';
}

function loadInjectedState(stateFile) {
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (_) { /* corrupted state → treat as empty */ }
  return {};
}

function saveInjectedState(stateFile, state) {
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state), 'utf8');
  } catch (_) { /* fail-open: injection still happened this turn, just dedup may retry next time */ }
}

// 抽取桶檔全文（去除 POINTERS 區塊的生成器 marker 註解，保留內容本身）
function readBucketContent(bucket) {
  try {
    const p = path.join(LEARNINGS_DIR, `${bucket}.md`);
    if (!fs.existsSync(p)) return null;
    return fs.readFileSync(p, 'utf8').trim();
  } catch (_) {
    return null;
  }
}

function buildLearningsInjection(promptLower, sessionId, transcriptPath) {
  const buckets = matchLearningsBuckets(promptLower);
  if (!buckets.length) return null;

  const sessionKey = resolveSessionKey(sessionId, transcriptPath);
  const stateFile = path.join(INJECTED_STATE_DIR, `.learnings-injected-${sessionKey}.json`);
  const state = loadInjectedState(stateFile);

  const toInject = buckets.filter(b => !state[b]);
  if (!toInject.length) return null; // 全部命中桶本 session 已注入過

  const sections = [];
  for (const bucket of toInject) {
    const content = readBucketContent(bucket);
    if (!content) continue;
    sections.push(`--- learnings/${bucket}.md（自動注入，本 session 首次命中此桶）---\n${content}`);
    state[bucket] = true;
  }
  if (!sections.length) return null;

  saveInjectedState(stateFile, state);
  return sections.join('\n\n');
}
