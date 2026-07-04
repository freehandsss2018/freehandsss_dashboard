#!/usr/bin/env node
// scripts/hooks/post-tool-kgov.js
// FHS PostToolUse Hook — Knowledge Governance Auto-Capture
// Detects finance/RPC/migration edits → injects [G] reminder via additionalContext
// Detects FHS_System_Logic_Overview.md or lessons/INDEX.md update → clears pending flag
//
// Version: 1.0.0 | 2026-06-12
// Design: cl-final-plan.md 2026-06-12-1845 §6 D-10
//
// Exit codes:
//   0 = pass (allow), with optional additionalContext JSON on stdout
// Never exits non-zero — any failure must silently pass (Rule: hook must not block)

'use strict';

const fs = require('fs');
const path = require('path');

const FLAG_FILE = path.join(__dirname, '../../.fhs/.kgov-pending');

// ── Reminder text (verbatim from execute.md [G]) ────────────────────────────
const G_REMINDER = [
  '⚠️ [kgov-hook] [G] 運算邏輯變動稽核 已觸發',
  '   → 本次改動命中財務/RPC/Migration 範圍，session 結束前必須完成以下：',
  '   1. 同步更新 .fhs/notes/FHS_System_Logic_Overview.md 對應章節',
  '   2. 核查 .fhs/ai/skills/finance-gatekeeper/SKILL.md 路由表是否需加行',
  '   3. 在收尾宣告中附「G 觸發：已更新 §X」',
  '   → flag 已寫入 .fhs/.kgov-pending，Stop hook 將於 session 結束時提醒'
].join('\n');

// ── HIT PATTERNS ────────────────────────────────────────────────────────────
// Tools that write files
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit']);

// MCP tools that imply finance/RPC changes
const MCP_HIT_TOOLS = new Set([
  'mcp__supabase__apply_migration',
  'mcp__n8n-mcp-server__update_node_code'
]);

// File path patterns that indicate finance/RPC domain
const HIT_PATH_PATTERNS = [
  /supabase[/\\]migrations[/\\].+\.sql$/i,
  /FHS_Finance_Bible\.md$/i,
  /FHS_System_Logic_Overview\.md$/i,
  /calculatePricing/i
];

// Content patterns that indicate finance/RPC logic changes
const HIT_CONTENT_PATTERNS = [
  /CREATE\s+OR\s+REPLACE\s+FUNCTION/i,
  /get_financial_kpis|get_financial_charts/i,
  /handmodel_cost|keychain_cost|necklace_cost/i,
  /3.layer|3layer|three.layer/i,
  /final_sale_price|total_cost|net_profit/i,
  /cost_configurations/i
];

// Paths whose update CLEARS the flag (work is done)
const CLEAR_PATH_PATTERNS = [
  /FHS_System_Logic_Overview\.md$/i,
  /lessons[/\\]INDEX\.md$/i
];

// Paths that are documentation/memory only — never trigger the flag
const SAFE_PATH_PATTERNS = [
  /\.fhs[/\\]memory[/\\]/i,
  /\.fhs[/\\]notes[/\\]session-log\.md$/i,
  /docs[/\\]CHANGELOG\.md$/i,
  /\.fhs[/\\]notes[/\\]decisions\.md$/i
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
  // PostToolUse additionalContext: output JSON with additionalContext key
  process.stdout.write(JSON.stringify({ additionalContext: message }) + '\n');
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const tool = data.tool_name || '';
    const toolInput = data.tool_input || {};
    const toolResponse = data.tool_response || {};

    // ── Check if this edit CLEARS the flag (SSoT or INDEX updated) ────────
    const filePath = (toolInput.file_path || toolInput.path || '').replace(/\\/g, '/');
    if (WRITE_TOOLS.has(tool) && filePath) {
      const isClear = CLEAR_PATH_PATTERNS.some(p => p.test(filePath));
      if (isClear && flagExists()) {
        clearFlag();
        process.exit(0);
      }
    }

    // ── Fast-path: non-write, non-MCP-hit tools exit immediately ──────────
    const isMcpHit = MCP_HIT_TOOLS.has(tool);
    const isWriteTool = WRITE_TOOLS.has(tool);

    if (!isMcpHit && !isWriteTool) {
      process.exit(0);
    }

    // ── MCP tool direct hit ───────────────────────────────────────────────
    if (isMcpHit) {
      writeFlag();
      emitAdditionalContext(G_REMINDER);
      process.exit(0);
    }

    // ── Write/Edit tool: check file path + content ────────────────────────
    if (isWriteTool && filePath) {
      // Memory/docs files: never trigger even if content contains financial terms
      const isSafe = SAFE_PATH_PATTERNS.some(p => p.test(filePath));
      if (isSafe) { process.exit(0); }

      const pathHit = HIT_PATH_PATTERNS.some(p => p.test(filePath));
      const content = toolInput.content || toolInput.new_string || '';
      const contentHit = HIT_CONTENT_PATTERNS.some(p => p.test(content));

      if (pathHit || contentHit) {
        // Don't re-flag if this edit is itself the SSoT update
        const isSelf = CLEAR_PATH_PATTERNS.some(p => p.test(filePath));
        if (!isSelf) {
          writeFlag();
          emitAdditionalContext(G_REMINDER);
        }
      }
    }

    process.exit(0);
  } catch (_) {
    // Any parse/runtime error: silently pass
    process.exit(0);
  }
});
