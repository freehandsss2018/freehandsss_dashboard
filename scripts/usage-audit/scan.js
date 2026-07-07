#!/usr/bin/env node
// scripts/usage-audit/scan.js
// FHS 使用行為審計（/fhs-usage-audit）— L1 掃描器，零 LLM token。
// 掃 Claude Code transcript（.jsonl），輸出聚合統計到 .fhs/.usage-report.json。
// 增量：per-file 快取（mtime+size 未變則沿用快取），避免每次全掃全部歷史。
// 脫敏：任何進入輸出的文字先過 redact()，杜絕 JWT/PAT/KEY 明文落盤（S153 W2 修正）。
//
// Usage: node scripts/usage-audit/scan.js [--full]
//
// Version: 1.0.0 | 2026-07-07 | S153

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = process.env.FHS_USAGE_ROOT || path.resolve(__dirname, '../..');
const CONFIG_FILE = process.env.FHS_USAGE_CONFIG || path.join(REPO_ROOT, '.fhs/tools/usage-audit-config.json');
const REPORT_FILE = process.env.FHS_USAGE_REPORT_OUT || path.join(REPO_ROOT, '.fhs/.usage-report.json');
const FULL_RESCAN = process.argv.includes('--full');

// ── SECRET REDACTION ──────────────────────────────────────────────────────────
// 任何字串進入計數器 key / 樣本文字前必經此函式。寧可過度遮蔽，不可漏一個明文 token。

const REDACT_PATTERNS = [
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]'],
  [/pat[A-Za-z0-9]{14}\.[A-Za-z0-9]{20,}/g, '[REDACTED_AIRTABLE_PAT]'],
  [/sk-[A-Za-z0-9]{20,}/g, '[REDACTED_KEY]'],
  [/Bearer\s+[A-Za-z0-9._-]{10,}/gi, 'Bearer [REDACTED]'],
  [/([A-Z_]{2,}(?:KEY|TOKEN|SECRET|PAT))\s*=\s*["']?[\w.\-]{16,}["']?/g, '$1=[REDACTED]'],
];

function redact(s) {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const [re, repl] of REDACT_PATTERNS) out = out.replace(re, repl);
  return out;
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return fallback; }
}

function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 1), 'utf8');
}

function hash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16);
}

function addCount(obj, key, n) {
  obj[key] = (obj[key] || 0) + (n || 1);
}

const CMD_RE = /<command-name>(\/[\w-]+)<\/command-name>/;

const THEMES = {
  'deploy_upload_nas': /upload|部署|NAS|nas/,
  'mobile_375_iphone': /手機|mobile|375|iphone|iPhone/,
  'screenshot_look': /截圖|screenshot|睇下|看看/,
  'fix_bug': /修復|fix|bug|BUG|壞|錯/,
  'test_verify': /測試|驗證|test|驗收/,
  'finance_cost': /成本|價|財務|profit|利潤/,
  'n8n': /n8n/,
  'supabase_sql': /[Ss]upabase|SQL|sql/,
  'ig': /\bIG\b|Instagram|ig_/,
  'continue': /^繼續|^continue|^Continue/,
  'paste_error_log': /Traceback|Error:|error|錯誤|失敗/,
};

// ── PER-FILE SCAN ──────────────────────────────────────────────────────────────
// 回傳該檔案的聚合貢獻（全部 key 已脫敏），不含任何原文長文本。

function scanFile(filePath) {
  const agg = {
    commands: {}, tools: {}, models: {}, subagents: {},
    bash_prefix: {}, read_targets: {}, grep_paths: {},
    prompt_prefix_dup: {}, short_prompts: {}, themes: {},
    session: { file: path.basename(filePath), user_msgs: 0, tool_calls: 0, lines: 0, start: null, end: null },
  };

  let raw;
  try { raw = fs.readFileSync(filePath, 'utf8'); } catch (_) { return agg; }
  const lines = raw.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    agg.session.lines++;
    let rec;
    try { rec = JSON.parse(line); } catch (_) { continue; }

    const ts = rec.timestamp;
    if (ts) {
      if (!agg.session.start) agg.session.start = ts;
      agg.session.end = ts;
    }

    const t = rec.type;
    const msg = rec.message || {};

    if (t === 'assistant') {
      addCount(agg.models, redact(msg.model || '?'), 1);
      for (const c of (msg.content || [])) {
        if (c && c.type === 'tool_use') {
          agg.session.tool_calls++;
          const name = c.name || '?';
          addCount(agg.tools, name, 1);
          const inp = c.input || {};
          if (name === 'Read') {
            addCount(agg.read_targets, redact((inp.file_path || '').replace(/\\/g, '/')), 1);
          } else if (name === 'Grep') {
            addCount(agg.grep_paths, redact((inp.path || '.').replace(/\\/g, '/')), 1);
          } else if (name === 'Bash' || name === 'PowerShell') {
            const cmd = redact((inp.command || '').trim());
            const tok = (cmd.split(/\s+/)[0] || '?').slice(0, 40);
            addCount(agg.bash_prefix, tok, 1);
          } else if (name === 'Task' || name === 'Agent') {
            addCount(agg.subagents, inp.subagent_type || 'general', 1);
          }
        }
      }
    } else if (t === 'user') {
      if (rec.isSidechain) continue;
      let text = null;
      const content = msg.content;
      if (typeof content === 'string') text = content;
      else if (Array.isArray(content)) {
        text = content.filter(c => c && c.type === 'text').map(c => c.text || '').join('\n');
      }
      if (!text) continue;
      const m = CMD_RE.exec(text);
      if (m) { addCount(agg.commands, m[1], 1); continue; }
      if (text.startsWith('<local-command') || text.startsWith('<system-reminder')) continue;

      const clean = redact(text.trim());
      agg.session.user_msgs++;
      addCount(agg.prompt_prefix_dup, hash(clean.slice(0, 200)) + '::' + clean.slice(0, 80).replace(/\n/g, ' / '), 1);
      if (clean.length <= 30) addCount(agg.short_prompts, clean.replace(/\n/g, ' '), 1);
      for (const [name, re] of Object.entries(THEMES)) {
        if (re.test(clean)) addCount(agg.themes, name, 1);
      }
    }
  }
  return agg;
}

// ── CACHE / INCREMENTAL ───────────────────────────────────────────────────────

function loadCursor(cursorFile) {
  return readJson(cursorFile, { files: {} });
}

function main() {
  const config = readJson(CONFIG_FILE, null);
  if (!config) {
    process.stdout.write(`[usage-audit] 找不到設定檔 ${CONFIG_FILE}，中止。\n`);
    process.exit(0);
  }

  const cursor = FULL_RESCAN ? { files: {} } : loadCursor(config.cursor_file);
  const newCursorFiles = {};

  const merged = {
    commands: {}, tools: {}, models: {}, subagents: {},
    bash_prefix: {}, read_targets: {}, grep_paths: {}, themes: {},
    prompt_prefix_dup: {}, short_prompts: {},
  };
  const sessions = [];
  let filesScanned = 0, filesCached = 0, filesMissing = 0;

  for (const dir of config.claude_projects_dirs || []) {
    if (!fs.existsSync(dir)) { filesMissing++; continue; }
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl'));
    for (const f of files) {
      const full = path.join(dir, f);
      let stat;
      try { stat = fs.statSync(full); } catch (_) { continue; }
      const key = full.replace(/\\/g, '/');
      const prev = cursor.files[key];
      let agg;

      if (prev && prev.mtimeMs === stat.mtimeMs && prev.size === stat.size && prev.agg) {
        agg = prev.agg;
        filesCached++;
      } else {
        agg = scanFile(full);
        filesScanned++;
      }
      newCursorFiles[key] = { mtimeMs: stat.mtimeMs, size: stat.size, agg };

      for (const bucket of ['commands', 'tools', 'models', 'subagents', 'bash_prefix', 'read_targets', 'grep_paths', 'themes', 'prompt_prefix_dup', 'short_prompts']) {
        for (const [k, v] of Object.entries(agg[bucket] || {})) addCount(merged[bucket], k, v);
      }
      sessions.push(Object.assign({ size_mb: Math.round(stat.size / 1e5) / 10 }, agg.session));
    }
  }

  function topN(obj, n) {
    return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  }

  const dupClusters = topN(merged.prompt_prefix_dup, 40)
    .filter(([, c]) => c >= 3)
    .map(([k, c]) => ({ count: c, sample: k.split('::').slice(1).join('::') }));

  const report = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    scan_mode: FULL_RESCAN ? 'full' : 'incremental',
    files_scanned: filesScanned,
    files_cached: filesCached,
    dirs_missing: filesMissing,
    sessions_total: sessions.length,
    commands: topN(merged.commands, 30),
    tools: topN(merged.tools, 40),
    models: topN(merged.models, 10),
    subagents: topN(merged.subagents, 20),
    bash_prefix_top: topN(merged.bash_prefix, 40),
    read_targets_top: topN(merged.read_targets, 40),
    grep_paths_top: topN(merged.grep_paths, 20),
    themes: topN(merged.themes, 20),
    repeated_prompts: dupClusters,
    short_prompts_top: topN(merged.short_prompts, 40),
    sessions: sessions.sort((a, b) => (b.start || '').localeCompare(a.start || '')).slice(0, 200),
  };

  try {
    writeJson(REPORT_FILE, report);
  } catch (err) {
    process.stdout.write(`[usage-audit] 寫入報告失敗: ${err.message}\n`);
    process.exit(0);
  }

  try {
    writeJson(config.cursor_file, { updated_at: new Date().toISOString(), files: newCursorFiles });
  } catch (err) {
    process.stdout.write(`[usage-audit] 寫入 cursor 快取失敗（不影響本次報告）: ${err.message}\n`);
  }

  process.stdout.write(`[usage-audit] 掃描完成：${filesScanned} 檔新掃 / ${filesCached} 檔沿用快取 / 共 ${sessions.length} sessions → ${path.relative(REPO_ROOT, REPORT_FILE)}\n`);
}

try {
  main();
} catch (err) {
  process.stdout.write(`[usage-audit] 未預期錯誤: ${err.message}\n`);
  process.exit(1);
}
