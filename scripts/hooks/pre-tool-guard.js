#!/usr/bin/env node
// scripts/hooks/pre-tool-guard.js
// FHS PreToolUse Hook — AGENTS.md Hard Rule Enforcer
// Intercepts Write/Edit/Bash tool calls that violate FHS constitutional rules
// Version: 1.0.0 | 2026-04-28
//
// Exit codes:
//   0 = pass (allow execution)
//   2 = block (deny execution, show stderr to Claude)
// Warnings use stderr + exit 0 (non-blocking alert)

'use strict';

const fs = require('fs');
const path = require('path');

// ── Deploy authorization flag (S140, F8) ────────────────────────────────────
// Fat Mo manually `touch`es this file in his own terminal (never via an AI
// tool call — R10 below blocks the AI from creating it) to grant ONE current.html
// promote. 10-minute TTL: stale flags left over from an earlier approval must
// not silently authorize an unrelated later write.
const DEPLOY_FLAG_FILE = path.join(__dirname, '../../.fhs/.deploy-ok');
const DEPLOY_LOG_FILE = path.join(__dirname, '../../.fhs/notes/deploy-log.md');
const DEPLOY_TTL_MS = 10 * 60 * 1000;

// ── kgov shell-write observation log (S140, F12) ────────────────────────────
// Warn-only for now: log shell writes that touch finance content so we can
// measure real hit rate before promoting this to a hard PostToolUse flag.
const KGOV_OBSERVE_LOG = path.join(__dirname, '../../.fhs/.kgov-observe.log');

function checkDeployAuthorization() {
  try {
    if (!fs.existsSync(DEPLOY_FLAG_FILE)) return false;
    const ts = fs.readFileSync(DEPLOY_FLAG_FILE, 'utf8').trim();
    const flagTime = new Date(ts).getTime();
    if (isNaN(flagTime) || Date.now() - flagTime > DEPLOY_TTL_MS) {
      try { fs.unlinkSync(DEPLOY_FLAG_FILE); } catch (_) { /* silent */ }
      return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}

function consumeDeployAuthorization(target) {
  try { fs.unlinkSync(DEPLOY_FLAG_FILE); } catch (_) { /* silent */ }
  try {
    const dir = path.dirname(DEPLOY_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R1/R9 bypass | ${String(target).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

function logKgovObserve(commandHead) {
  if (process.env.FHS_GUARD_FIXTURE === '1') return; // 夾具測試不污染觀察數據（S148 B1）
  try {
    const dir = path.dirname(KGOV_OBSERVE_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(KGOV_OBSERVE_LOG, `${new Date().toISOString()} | ${String(commandHead).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    process.exit(0);
  }

  const tool = data.tool_name || '';
  const toolInput = data.tool_input || {};

  const blocking = [];
  const warnings = [];

  // ═══════════════════════════════════════════════════════════════
  // Guard: Write / Edit
  // ═══════════════════════════════════════════════════════════════
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const filePath = (toolInput.file_path || toolInput.notebook_path || '').replace(/\\/g, '/');
    // MultiEdit carries an `edits` array instead of a single new_string; NotebookEdit
    // carries `new_source`. Flatten whichever shape is present into one string to scan.
    const content = toolInput.content || toolInput.new_string || toolInput.new_source ||
      (Array.isArray(toolInput.edits) ? toolInput.edits.map(e => e.new_string || '').join('\n') : '') || '';

    // ── Rule 1: Protect production file ────────────────────────
    if (filePath.includes('Freehandsss_dashboard_current.html')) {
      if (checkDeployAuthorization()) {
        consumeDeployAuthorization(filePath);
      } else {
        blocking.push(
          '🚫 [R1] 禁止覆蓋正式環境 Freehandsss_dashboard_current.html',
          '   → AGENTS.md §全域硬規則：未獲授權絕不可覆蓋 current.html',
          '   → 如需更新，請明確告知 Fat Mo 並獲授權（Fat Mo 可在自己 terminal touch .fhs/.deploy-ok 授權一次，10 分鐘內有效）'
        );
      }
    }

    // ── Rule 10: Block AI from self-creating the deploy-ok flag ──
    if ((tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') &&
        filePath.includes('.deploy-ok')) {
      blocking.push(
        '🚫 [R10] 禁止 AI 自行建立/寫入 .deploy-ok 授權旗標',
        '   → 此旗標只能由 Fat Mo 在自己的 terminal 手動 touch 建立（防 AI 自我授權）'
      );
    }

    // ── Rule 2: No hardcoded API keys ───────────────────────────
    const apiKeyPatterns = [
      { re: /sk-[a-zA-Z0-9]{32,}/, label: 'OpenAI-style key (sk-...)' },
      { re: /pplx-[a-zA-Z0-9]{32,}/, label: 'Perplexity key (pplx-...)' },
      { re: /pat[a-zA-Z0-9]{20,}\.[a-zA-Z0-9]{40,}/, label: 'Airtable PAT' },
      { re: /sbp_[a-zA-Z0-9]{20,}/, label: 'Supabase access token (sbp_...)' },
      { re: /sb_secret_[a-zA-Z0-9_-]{15,}/, label: 'Supabase secret key (sb_secret_...)' },
      { re: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, label: 'JWT (eyJ...)' },
      { re: /(?:api_key|apikey|api-key)\s*[:=]\s*["'][a-zA-Z0-9\-_]{20,}["']/i, label: 'API key assignment' },
      { re: /(?:GEMINI_API_KEY|PERPLEXITY_API_KEY|N8N_KEY)\s*=\s*["'][a-zA-Z0-9\-_.]{20,}["']/, label: 'FHS env key' }
    ];
    for (const { re, label } of apiKeyPatterns) {
      if (re.test(content)) {
        blocking.push(
          `🚫 [R2] 偵測到硬編碼 API Key：${label}`,
          '   → AGENTS.md §全域硬規則：一律使用 .env + process.env'
        );
        break;
      }
    }

    // ── Rule 3: Protect captureFormState & Raw_Form_State ───────
    const protectedSymbols = ['captureFormState', 'Raw_Form_State', 'rawFormState'];
    for (const sym of protectedSymbols) {
      // Check if content appears to modify (not just reference) these symbols
      const modPatterns = [
        new RegExp(`function\\s+${sym}\\s*\\(`, ''),       // redefining the function
        new RegExp(`${sym}\\s*=\\s*function`, ''),          // reassigning
        new RegExp(`delete\\s+.*${sym}`, '')               // deleting
      ];
      if (modPatterns.some(p => p.test(content))) {
        warnings.push(
          `⚠️  [R3] 偵測到可能修改受保護符號：${sym}`,
          '   → AGENTS.md §資料結構守護：captureFormState 禁止改動'
        );
      }
    }

    // ── Rule 4: .env file write alert ───────────────────────────
    if (filePath.endsWith('.env') && !filePath.endsWith('.env.example')) {
      warnings.push(
        '⚠️  [R4] 正在寫入 .env 檔案',
        '   → 請確認 .env 已在 .gitignore，禁止 commit 真實 key'
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Guard: Bash
  // ═══════════════════════════════════════════════════════════════
  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = toolInput.command || '';

    // ── Rule 9: Block Bash/PowerShell commands targeting current.html ──
    // R1 above only checks Write/Edit file_path; commands like `cp`, `sed -i`,
    // shell redirection, or PowerShell Set-Content/Copy-Item can overwrite
    // current.html without ever going through Write/Edit. Catch the filename
    // appearing alongside a write-shaped command/cmdlet.
    if (/current\.html/i.test(command) &&
        /(?:^|\s)(?:cp|mv|sed\s+-i|cat\s+.*>|>{1,2}|tee|Set-Content|Copy-Item|Move-Item|Out-File)\b/i.test(command)) {
      if (checkDeployAuthorization()) {
        consumeDeployAuthorization(command);
      } else {
        blocking.push(
          '🚫 [R9] 偵測到 Bash 指令疑似寫入 current.html',
          '   → AGENTS.md §全域硬規則：未獲授權絕不可覆蓋 current.html',
          '   → 如需更新，請明確告知 Fat Mo 並獲授權（Fat Mo 可在自己 terminal touch .fhs/.deploy-ok 授權一次，10 分鐘內有效，或改用 Write/Edit 走 R1 守衛）'
        );
      }
    }

    // ── Rule 10 (shell variant): block AI from self-creating deploy-ok ──
    if (/\.deploy-ok\b/i.test(command) &&
        /(?:^|\s)(?:touch|echo\s.*>|Set-Content|New-Item|Out-File)\b/i.test(command)) {
      blocking.push(
        '🚫 [R10] 禁止 AI 自行建立/寫入 .deploy-ok 授權旗標',
        '   → 此旗標只能由 Fat Mo 在自己的 terminal 手動建立（防 AI 自我授權）'
      );
    }

    // ── Rule 11 (observe-only, S140 F12): shell write touching finance content ──
    // Not blocking yet — logs to .fhs/.kgov-observe.log for a ~2-week hit-rate
    // review before this graduates to a hard flag (see governance/05 §4).
    if ((/(?:^|\s)(?:Set-Content|Out-File|tee|sed\s+-i)\b/i.test(command) || />>?/.test(command)) &&
        /handmodel_cost|keychain_cost|necklace_cost|cost_configurations|final_sale_price|total_cost|net_profit|calculatePricing|CREATE\s+OR\s+REPLACE\s+FUNCTION/i.test(command)) {
      logKgovObserve(command);
      warnings.push(
        '⚠️  [R11-observe] 偵測到 Shell 寫入指令疑似涉及財務欄位（觀察期，未攔截）',
        '   → 已記錄至 .fhs/.kgov-observe.log，觀察期後複查決定是否轉正為攔截'
      );
    }

    // ── Rule 5: Block git add .env ──────────────────────────────
    if (/git\s+add\s+[^-]*\.env(?!\.example)/.test(command)) {
      blocking.push(
        '🚫 [R5] 禁止 git add .env',
        '   → AGENTS.md §全域硬規則：.env 禁止 commit'
      );
    }

    // ── Rule 6: Warn on git add . or -A ─────────────────────────
    if (/git\s+add\s+(-A|--all|\.)(\s|$)/.test(command)) {
      warnings.push(
        '⚠️  [R6] git add . / -A 可能意外包含 .env',
        '   → 建議改用 git add <specific files>，或確認 .gitignore 正確'
      );
    }

    // ── Rule 7: Block force push ─────────────────────────────────
    if (/git\s+push\s+.*(--force|-f)\b/.test(command)) {
      blocking.push(
        '🚫 [R7] 禁止 git push --force（需 Fat Mo 明確授權）',
        '   → 如確認需要，請明確說明理由並獲授權後再執行'
      );
    }

    // ── Rule 8: Warn on rm -rf / Remove-Item -Recurse -Force targeting project subdirs ──
    const isRmRf = /rm\s+-rf\s+(?!tmp\/|artifacts\/)/.test(command);
    const isRemoveItemForce = /Remove-Item\b/i.test(command) && /-Recurse\b/i.test(command) && /-Force\b/i.test(command);
    if (isRmRf || isRemoveItemForce) {
      const safeExceptions = ['node_modules', '/tmp/', 'artifacts/'];
      const isSafe = safeExceptions.some(s => command.includes(s));
      if (!isSafe) {
        warnings.push(
          '⚠️  [R8] 偵測到 rm -rf / Remove-Item -Recurse -Force，請確認目標目錄安全',
          '   → 安全目標：node_modules/、tmp/、artifacts/ 以外需謹慎'
        );
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Output
  // ═══════════════════════════════════════════════════════════════
  if (blocking.length === 0 && warnings.length === 0) {
    process.exit(0); // All clear, allow
  }

  if (warnings.length > 0) {
    process.stderr.write('─── FHS 安全警告 ───\n');
    warnings.forEach(w => process.stderr.write(w + '\n'));
    process.stderr.write('──────────────────\n');
  }

  if (blocking.length > 0) {
    process.stderr.write('═══ FHS 安全守護：攔截操作 ═══\n');
    blocking.forEach(b => process.stderr.write(b + '\n'));
    process.stderr.write('═══════════════════════════════\n');
    process.exit(2); // BLOCK
  }

  process.exit(0); // Warnings only, allow with caution
});
