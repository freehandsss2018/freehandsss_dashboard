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
  if (tool === 'Write' || tool === 'Edit') {
    const filePath = (toolInput.file_path || '').replace(/\\/g, '/');
    const content = toolInput.content || toolInput.new_string || '';

    // ── Rule 1: Protect production file ────────────────────────
    if (filePath.includes('Freehandsss_dashboard_current.html')) {
      blocking.push(
        '🚫 [R1] 禁止覆蓋正式環境 Freehandsss_dashboard_current.html',
        '   → AGENTS.md §全域硬規則：未獲授權絕不可覆蓋 current.html',
        '   → 如需更新，請明確告知 Fat Mo 並獲授權'
      );
    }

    // ── Rule 2: No hardcoded API keys ───────────────────────────
    const apiKeyPatterns = [
      { re: /sk-[a-zA-Z0-9]{32,}/, label: 'OpenAI-style key (sk-...)' },
      { re: /pplx-[a-zA-Z0-9]{32,}/, label: 'Perplexity key (pplx-...)' },
      { re: /pat[a-zA-Z0-9]{20,}\.[a-zA-Z0-9]{40,}/, label: 'Airtable PAT' },
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
  if (tool === 'Bash') {
    const command = toolInput.command || '';

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

    // ── Rule 8: Warn on rm -rf targeting project subdirs ────────
    if (/rm\s+-rf\s+(?!tmp\/|artifacts\/)/.test(command)) {
      const safeExceptions = ['node_modules', '/tmp/', 'artifacts/'];
      const isSafe = safeExceptions.some(s => command.includes(s));
      if (!isSafe) {
        warnings.push(
          '⚠️  [R8] 偵測到 rm -rf，請確認目標目錄安全',
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
