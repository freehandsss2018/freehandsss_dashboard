#!/usr/bin/env node
// scripts/hooks/post-tool-kgov.js
// FHS PostToolUse Hook — Knowledge Governance Auto-Capture
// Detects finance/RPC/migration edits → injects [G] reminder via additionalContext
// Detects FHS_System_Logic_Overview.md or lessons/INDEX.md update → clears pending flag
//
// Version: 2.0.0 | 2026-07-08 S148 Phase 2
// Change: [G] 判準對齊 execute.md diff 物理特徵真值表（舊版：任何 .md 含財務詞即落 flag → 大量誤觸）
//         新判準：migrations .sql / MCP apply_migration|update_node_code / execute_sql+write+finance
//                 / Dashboard HTML + 財務 → flag；.md / hooks.js 含財務 → warn（不落 flag）
//
// Exit codes:
//   0 = pass (allow), with optional additionalContext JSON on stdout
// Never exits non-zero — any failure must silently pass (Rule: hook must not block)

'use strict';

const fs = require('fs');
const path = require('path');

// FLAG_FILE: supports env var override for testability (kgov fixture isolation)
const FLAG_FILE = process.env.FHS_KGOV_FLAG_FILE ||
  path.join(__dirname, '../../.fhs/.kgov-pending');

// auto-memory lives outside the repo (path varies per user/machine) — read the
// same explicit path fhs-health-check.js uses, rather than guessing via regex.
// (S141 lesson: external paths must be configured, not pattern-matched.)
const RULES_FILE = path.join(__dirname, '../../.fhs/tools/fhs-health-rules.json');
let AUTO_MEMORY_DIR = null;
let LEARNINGS_BUDGET = 50;        // default if rules file unreadable
let PORTABLE_BLOCK_BUDGET = 4000; // default from commit.md P0.7.1
try {
  const rules = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  const p = rules.auto_memory_dir && rules.auto_memory_dir.path;
  if (p) AUTO_MEMORY_DIR = p.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();
  // Read budgets from rules file (avoid hard-coding — S148 T6 principle)
  const vb = rules.volume_budgets || [];
  for (const item of vb) {
    if (item.id === 'learnings_entries' && item.budget) LEARNINGS_BUDGET = item.budget;
    if (item.id === 'handoff_portable_block' && item.budget) PORTABLE_BLOCK_BUDGET = item.budget;
  }
} catch (_) { /* fail-open: use defaults */ }


// ── Reminder text (verbatim from execute.md [G]) ────────────────────────────
const G_REMINDER = [
  '⚠️ [kgov-hook] [G] 運算邏輯變動稽核 已觸發',
  '   → 本次改動命中財務/RPC/Migration 範圍，session 結束前必須完成以下：',
  '   1. 同步更新 .fhs/notes/FHS_System_Logic_Overview.md 對應章節',
  '   2. 核查 .fhs/ai/skills/finance-gatekeeper/SKILL.md 路由表是否需加行',
  '   3. 在收尾宣告中附「G 觸發：已更新 §X」',
  '   → flag 已寫入 .fhs/.kgov-pending，Stop hook 將於 session 結束時提醒'
].join('\n');

// ── Warn text (non-flagging, for .md / code file edits with finance keywords) ─
const G_WARN = [
  '⚠️ [kgov-hook] 文件/代碼層財務內容編輯（未落 flag）',
  '   → 若本次為財務規則「語義」變更（非錯字/排版/註解），請照 execute.md [G] 手動更新',
  '     FHS_System_Logic_Overview.md 對應章節；純文字修正可忽略本提示'
].join('\n');

// ── PATTERNS ─────────────────────────────────────────────────────────────────
// Tools that write files
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

// MCP tool suffixes that directly trigger flag (finance/RPC/migration)
// Suffix match (not exact Set) so this survives connector renames
const MCP_FLAG_SUFFIXES = [
  '__apply_migration',
  '__update_node_code'
];

// execute_sql: only flag when BOTH write verb AND finance content present
const MCP_EXECUTE_SQL_SUFFIX = '__execute_sql';
const SQL_WRITE_VERB_PATTERN = /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i;

// Finance content keywords (used for execute_sql check AND warn on .md/code)
const FINANCE_CONTENT_PATTERNS = [
  /CREATE\s+OR\s+REPLACE\s+FUNCTION/i,
  /get_financial_kpis|get_financial_charts/i,
  /handmodel_cost|keychain_cost|necklace_cost/i,
  /3.layer|3layer|three.layer/i,
  /final_sale_price|total_cost|net_profit/i,
  /cost_configurations/i
];

// ── TRUE VALUE TABLE (S148 §4.2) ─────────────────────────────────────────────
// #1: Write/Edit → supabase/migrations/*.sql (any content) → FLAG
const SQL_MIGRATION_PATTERN = /supabase[/\\]migrations[/\\].+\.sql$/i;

// #4: Write/Edit → Freehandsss_Dashboard/*.html WITH finance content → FLAG
const DASHBOARD_HTML_PATTERN = /Freehandsss_Dashboard[/\\][^/\\]+\.html$/i;

// #8: Safe paths — never trigger even if content contains finance terms
const SAFE_PATH_PATTERNS = [
  /\.fhs[/\\]memory[/\\]/i,
  /\.fhs[/\\]notes[/\\]session-log\.md$/i,
  /docs[/\\]CHANGELOG\.md$/i,
  /\.fhs[/\\]notes[/\\]decisions\.md$/i
];

// #9: Paths whose update CLEARS the flag (work is done)
const CLEAR_PATH_PATTERNS = [
  /FHS_System_Logic_Overview\.md$/i,
  /lessons[/\\]INDEX\.md$/i
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
function writeFlag() {
  try {
    const dir = path.dirname(FLAG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(FLAG_FILE, new Date().toISOString() + '\n', 'utf8');
  } catch (_) { /* silent */ }
}

function clearFlag() {
  try {
    if (fs.existsSync(FLAG_FILE)) fs.unlinkSync(FLAG_FILE);
  } catch (_) { /* silent */ }
}

function flagExists() {
  try { return fs.existsSync(FLAG_FILE); } catch (_) { return false; }
}

function emitAdditionalContext(message) {
  process.stdout.write(JSON.stringify({ additionalContext: message }) + '\n');
}

function hasFinanceContent(text) {
  return FINANCE_CONTENT_PATTERNS.some(p => p.test(text));
}

// ── MCP HIT LOGIC ─────────────────────────────────────────────────────────────
function isMcpFlag(tool, toolInput) {
  // #2: MCP apply_migration / update_node_code → always flag
  if (MCP_FLAG_SUFFIXES.some(s => tool.endsWith(s))) return true;
  // #3: execute_sql with write verb + finance content → flag; SELECT only → silent (#10)
  if (tool.endsWith(MCP_EXECUTE_SQL_SUFFIX)) {
    const query = (toolInput && (toolInput.query || toolInput.sql)) || '';
    return SQL_WRITE_VERB_PATTERN.test(query) && hasFinanceContent(query);
  }
  return false;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const tool = data.tool_name || '';
    const toolInput = data.tool_input || {};

    // ── Check if this edit CLEARS the flag (#9) ───────────────────────────
    const filePath = (toolInput.file_path || toolInput.path || '').replace(/\\/g, '/');
    if (WRITE_TOOLS.has(tool) && filePath) {
      const isClear = CLEAR_PATH_PATTERNS.some(p => p.test(filePath));
      if (isClear && flagExists()) {
        clearFlag();
        process.exit(0);
      }
    }

    // ── Fast-path: non-write, non-MCP-hit tools exit immediately ──────────
    const mcpFlag = isMcpFlag(tool, toolInput);
    const isWriteTool = WRITE_TOOLS.has(tool);

    if (!mcpFlag && !isWriteTool) {
      process.exit(0);
    }

    // ── MCP tool direct flag (#2, #3) ─────────────────────────────────────
    if (mcpFlag) {
      writeFlag();
      emitAdditionalContext(G_REMINDER);
      process.exit(0);
    }

    // ── Write/Edit tool: check file path + content ────────────────────────
    if (isWriteTool && filePath) {
      // #8: Safe paths → silent
      const isSafe = SAFE_PATH_PATTERNS.some(p => p.test(filePath)) ||
        (AUTO_MEMORY_DIR && filePath.toLowerCase().startsWith(AUTO_MEMORY_DIR));
      if (isSafe) { process.exit(0); }

      const content = toolInput.content || toolInput.new_string ||
        (Array.isArray(toolInput.edits) ? toolInput.edits.map(e => e.new_string || '').join('\n') : '') || '';

      // #1: migrations .sql → always flag (regardless of content)
      if (SQL_MIGRATION_PATTERN.test(filePath)) {
        const isSelf = CLEAR_PATH_PATTERNS.some(p => p.test(filePath));
        if (!isSelf) {
          writeFlag();
          emitAdditionalContext(G_REMINDER);
        }
        process.exit(0);
      }

      // #4: Dashboard HTML + finance content → flag; without finance → silent (#5)
      if (DASHBOARD_HTML_PATTERN.test(filePath)) {
        if (hasFinanceContent(content)) {
          const isSelf = CLEAR_PATH_PATTERNS.some(p => p.test(filePath));
          if (!isSelf) {
            writeFlag();
            emitAdditionalContext(G_REMINDER);
          }
        }
        // #5: Dashboard HTML without finance content → silent (no warn)
        process.exit(0);
      }

      // #6 & #7: .md files / code files (hooks.js etc.) with finance content → warn only (not flag)
      if (hasFinanceContent(content)) {
        emitAdditionalContext(G_WARN);
      }
      // No flag written for .md / code files

      // T6: budget gate — check after any Write/Edit (S148 Phase 3)
      checkBudgetGate(filePath);
    }

    process.exit(0);
  } catch (_) {
    // Any parse/runtime error: silently pass
    process.exit(0);
  }
});

// ── T6: Budget Gate (S148 Phase 3) ───────────────────────────────────────────
// Called after each Write/Edit. Only activates when writing learnings.md or handoff.md.
// Reads budgets from fhs-health-rules.json (same source as fhs-health-check.js).
function checkBudgetGate(filePath) {
  if (!filePath) return;
  const normalPath = filePath.replace(/\\/g, '/');

  try {
    // learnings.md: count numbered entries (^d+. pattern)
    if (normalPath.endsWith('learnings.md')) {
      const learnPath = path.join(__dirname, '../../.fhs/memory/learnings.md');
      if (!fs.existsSync(learnPath)) return;
      const lines = fs.readFileSync(learnPath, 'utf8').split('\n');
      const count = lines.filter(l => /^\d+\.\s/.test(l)).length;
      if (count > LEARNINGS_BUDGET) {
        emitAdditionalContext(
          `⚠️ [kgov-hook T6] learnings.md 本次寫入後 ${count} 條 > 預算 ${LEARNINGS_BUDGET} 條\n` +
          `   → 請當場對等替換（合併/退役一條），勿留給 /fhs-slim（見 commit.md 防回胖機制）`
        );
      }
      return;
    }

    // handoff.md: measure portable block bytes (```handoff ... ─── 便攜邊界)
    if (normalPath.endsWith('handoff.md')) {
      const handoffPath = path.join(__dirname, '../../.fhs/memory/handoff.md');
      if (!fs.existsSync(handoffPath)) return;
      const raw = fs.readFileSync(handoffPath, 'utf8');
      // Extract content between ```handoff and ─── 便攜邊界 (or closing ```)
      const m = raw.match(/```handoff[\r\n]([\s\S]*?)(?:─── 便攜邊界|```)/);
      if (!m) return;
      const blockBytes = Buffer.byteLength(m[1], 'utf8');
      if (blockBytes > PORTABLE_BLOCK_BUDGET) {
        emitAdditionalContext(
          `⚠️ [kgov-hook T6] handoff.md 便攜塊本次寫入後 ${blockBytes} bytes > 預算 ${PORTABLE_BLOCK_BUDGET} bytes\n` +
          `   → 請依 commit.md P0.7.1 壓縮（決策 >20 條強制輪轉，壓縮至 ≤4000 bytes）`
        );
      }
    }
  } catch (_) { /* fail-open: budget gate never blocks */ }
}

