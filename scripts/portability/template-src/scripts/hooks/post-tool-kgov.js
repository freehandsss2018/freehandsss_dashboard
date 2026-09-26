#!/usr/bin/env node
// Domain-neutral PostToolUse knowledge-governance hook.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const FLAG = process.env['{{ENV_PREFIX}}_KGOV_FLAG_FILE'] || path.join(ROOT, '.fhs/.kgov-pending');
const CONFIG = path.join(ROOT, '.fhs/tools/kgov-rules.json');
const defaults = {
  migrationPaths: ['(?:^|/)migrations/[^/]+\\.sql$'],
  sourcePaths: ['(?:^|/)(?:src|app|scripts)/.+\\.(?:js|ts|tsx|py)$'],
  domainTerms: ['(?:total|net)_(?:amount|cost)', 'calculate[A-Z]\\w*'],
  safePaths: ['(?:^|/)\\.fhs/memory/', '(?:^|/)\\.fhs/notes/'],
  clearPaths: ['(?:^|/)\\.fhs/notes/system-logic\\.md$', '(?:^|/)\\.fhs/memory/lessons/INDEX\\.md$'],
  flagToolSuffixes: ['__apply_migration', '__update_node_code'],
  sqlToolSuffix: '__execute_sql',
  learningEntryBudget: 20,
  handoffBlockByteBudget: 4000
};
let config = defaults;
try { config = { ...defaults, ...JSON.parse(fs.readFileSync(CONFIG, 'utf8')) }; } catch (_) { /* optional */ }
const match = (key, value) => (config[key] || []).some(s => new RegExp(s, 'i').test(value));
const reminder = '[kgov-hook] Knowledge rule changed. Update .fhs/notes/system-logic.md or .fhs/memory/lessons/INDEX.md before ending this session.';
const warning = '[kgov-hook] Source or document mentions a tracked rule. Check whether its meaning changed; documentation-only edits do not set a pending flag.';
function emit(message) { process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message } }) + '\n'); }
function setFlag() { fs.mkdirSync(path.dirname(FLAG), { recursive: true }); fs.writeFileSync(FLAG, new Date().toISOString() + '\n'); }
function clearFlag() { if (fs.existsSync(FLAG)) fs.unlinkSync(FLAG); }
function checkBudget(filePath) {
  try {
    const learning = filePath.match(/(?:^|\/)\.fhs\/memory\/learnings\/([a-z0-9_-]+\.md)$/i);
    if (learning) {
      const target = path.join(ROOT, '.fhs/memory/learnings', learning[1]);
      const count = fs.readFileSync(target, 'utf8').split(/\r?\n/).filter(line => /^\d+\.\s/.test(line)).length;
      if (count > config.learningEntryBudget) emit(`[kgov-hook] Learning entries ${count} exceed budget ${config.learningEntryBudget}; consolidate before adding more.`);
    }
    if (/(?:^|\/)\.fhs\/memory\/handoff\.md$/i.test(filePath)) {
      const raw = fs.readFileSync(path.join(ROOT, '.fhs/memory/handoff.md'), 'utf8');
      const block = raw.match(/```handoff\r?\n([\s\S]*?)```/);
      if (block && Buffer.byteLength(block[1]) > config.handoffBlockByteBudget) emit('[kgov-hook] Handoff portable block exceeds configured byte budget.');
    }
  } catch (_) { /* fail open */ }
}
let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    const tool = String(data.tool_name || '');
    const arg = data.tool_input || {};
    const filePath = String(arg.file_path || arg.path || '').replace(/\\/g, '/');
    const isWrite = ['Write', 'Edit', 'MultiEdit'].includes(tool);
    if (isWrite && filePath) {
      if (match('clearPaths', filePath)) { clearFlag(); return; }
      checkBudget(filePath);
      if (match('safePaths', filePath)) return;
    }
    const sql = String(arg.query || arg.sql || '');
    const direct = (config.flagToolSuffixes || []).some(s => tool.endsWith(s)) ||
      (tool.endsWith(config.sqlToolSuffix) && /\b(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)\b/i.test(sql) && match('domainTerms', sql));
    if (direct) { setFlag(); emit(reminder); return; }
    if (!isWrite || !filePath) return;
    const content = String(arg.content || arg.new_string || (Array.isArray(arg.edits) ? arg.edits.map(e => e.new_string || '').join('\n') : ''));
    if (match('migrationPaths', filePath) || (match('sourcePaths', filePath) && match('domainTerms', content))) {
      setFlag(); emit(reminder); return;
    }
    if (match('domainTerms', content)) emit(warning);
  } catch (_) { /* malformed input or file failure never blocks a tool */ }
});
