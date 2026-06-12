#!/usr/bin/env node
// scripts/hooks/stop-kgov.js
// FHS Stop Hook — Knowledge Governance Session-End Guard
// Checks for pending kgov flag and reminds (or blocks) before session ends
//
// Version: 1.0.0 | 2026-06-12
// Design: cl-final-plan.md 2026-06-12-1845 §6 D-11
//
// PHASE 1: HARD_BLOCK = false (reminder only)
//   Set HARD_BLOCK = true (after 1-2 weeks calibration, Fat Mo authorises)
//   to upgrade from reminder to hard block (exit 2)
//
// Exit codes:
//   0 = allow session to end
//   2 = block session end (only when HARD_BLOCK = true AND flag exists)

'use strict';

const fs = require('fs');
const path = require('path');

// ── CONFIGURATION ────────────────────────────────────────────────────────────
// Phase 1: reminder only. Change to true after Fat Mo authorises.
const HARD_BLOCK = false;

// Auto-release after this many consecutive blocks (prevents infinite loop)
// Only relevant when HARD_BLOCK = true
const MAX_CONSECUTIVE_BLOCKS = 8;

const FLAG_FILE = path.join(__dirname, '../../.fhs/.kgov-pending');
const BLOCK_COUNT_FILE = path.join(__dirname, '../../.fhs/.kgov-block-count');

// ── HELPERS ──────────────────────────────────────────────────────────────────
function flagExists() {
  try { return fs.existsSync(FLAG_FILE); } catch (_) { return false; }
}

function readBlockCount() {
  try {
    const raw = fs.readFileSync(BLOCK_COUNT_FILE, 'utf8').trim();
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  } catch (_) { return 0; }
}

function writeBlockCount(n) {
  try { fs.writeFileSync(BLOCK_COUNT_FILE, String(n), 'utf8'); } catch (_) { /* silent */ }
}

function clearBlockCount() {
  try { if (fs.existsSync(BLOCK_COUNT_FILE)) fs.unlinkSync(BLOCK_COUNT_FILE); } catch (_) { /* silent */ }
}

function readFlagTimestamp() {
  try {
    return fs.readFileSync(FLAG_FILE, 'utf8').trim();
  } catch (_) { return 'unknown'; }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // stop_hook_active guard — prevent infinite loop
    if (data.stop_hook_active === true) {
      clearBlockCount();
      process.exit(0);
    }

    // No flag: all clear
    if (!flagExists()) {
      clearBlockCount();
      process.exit(0);
    }

    // Flag exists — compose reminder message
    const since = readFlagTimestamp();
    const reason = [
      '⚠️ [kgov-stop-hook] 本 session 有未完結的知識治理待辦事項（[G] 觸發未結案）',
      `   → flag 建立時間：${since}`,
      '   → 請在結束前完成以下其中一項（完成後 flag 自動清除）：',
      '     1. 更新 .fhs/notes/FHS_System_Logic_Overview.md 對應章節',
      '     2. 更新 .fhs/memory/lessons/INDEX.md（新增 lesson 時）',
      '   → 若此提醒為誤觸（非財務/RPC 任務），可手動刪除：',
      '        del .fhs\\.kgov-pending  (Windows)',
      '        rm .fhs/.kgov-pending   (Bash/Git Bash)'
    ].join('\n');

    if (!HARD_BLOCK) {
      // Phase 1: reminder only, write to stderr, allow session to end
      process.stderr.write(reason + '\n');
      clearBlockCount();
      process.exit(0);
    }

    // Phase 2 (HARD_BLOCK = true): check consecutive block count
    const count = readBlockCount() + 1;
    if (count >= MAX_CONSECUTIVE_BLOCKS) {
      // Auto-release to prevent infinite loop
      process.stderr.write(
        `[kgov-stop-hook] 已連續攔截 ${count} 次，自動釋放以防死鎖。請手動清除 flag。\n`
      );
      clearBlockCount();
      process.exit(0);
    }

    writeBlockCount(count);
    process.stderr.write(reason + '\n');
    // Output decision:block JSON on stdout
    process.stdout.write(JSON.stringify({ decision: 'block', reason }) + '\n');
    process.exit(2);

  } catch (_) {
    // Any parse/runtime error: silently allow
    process.exit(0);
  }
});
