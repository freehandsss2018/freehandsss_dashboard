#!/usr/bin/env node
// Generic pre-tool guard. Rule content is loaded from guard-rules.fhs.json.

'use strict';

const fs = require('fs');
const path = require('path');

const RULES_FILE = path.join(__dirname, 'guard-rules.fhs.json');

const DEPLOY_FLAG_FILE = path.join(__dirname, '../../.fhs/.deploy-ok');
const DEPLOY_LOG_FILE = path.join(__dirname, '../../.fhs/notes/deploy-log.md');
const DEPLOY_TTL_MS = 10 * 60 * 1000;

const MAIN_REPO_ROOT = (() => {
  const base = path.join(__dirname, '../..');
  const norm = base.split('\\').join('/');
  const i = norm.indexOf('/.claude/worktrees/');
  return i >= 0 ? norm.slice(0, i) : base;
})();
const KGOV_OBSERVE_LOG = path.join(MAIN_REPO_ROOT, '.fhs/.kgov-observe.log');

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

function consumeDeployAuthorization(target, tag) {
  try { fs.unlinkSync(DEPLOY_FLAG_FILE); } catch (_) { /* silent */ }
  try {
    const dir = path.dirname(DEPLOY_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | ${tag} | ${String(target).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

const REPO_ROOT = path.join(__dirname, '../..');

function todayLocalISO() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function readHandoffStamp(handoffFile) {
  try {
    const head = fs.readFileSync(handoffFile, 'utf8').split(/\r?\n/).slice(0, 6).join('\n');
    const m = head.match(/更新:\s*(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  } catch (_) { return null; }
}

function handoffHasUnstagedEdits(handoffRel, gateFileEnv) {
  if (process.env[gateFileEnv]) return false; // 測試覆寫模式：跳過 git 探測
  try {
    const { execFileSync } = require('child_process');
    const out = execFileSync('git', ['diff', '--name-only', '--', handoffRel], {
      cwd: REPO_ROOT, encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore']
    });
    return out.trim().length > 0;
  } catch (_) {
    return false; // git 不可用 → fail open，絕不死鎖 repo
  }
}

function logGateBypass(reason, commandHead, gateFileEnv) {
  if (process.env[gateFileEnv]) return;
  try {
    const dir = path.dirname(DEPLOY_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R13 handoff-gate bypass (${reason}) | ${String(commandHead).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

function logKgovObserve(commandHead) {
  if (process.env['{{ENV_PREFIX}}_GUARD_FIXTURE'] === '1') return; // Keep fixture runs from writing observation logs.
  try {
    const dir = path.dirname(KGOV_OBSERVE_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(KGOV_OBSERVE_LOG, `${new Date().toISOString()} | ${String(commandHead).slice(0, 80)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

const BASH_CD_ROOT = MAIN_REPO_ROOT;
const BASH_CD_OBSERVE_LOG = path.join(BASH_CD_ROOT, '.fhs/.bash-cd-observe.log');

function normPath(p) {
  return String(p).split('\\').join('/')
    .replace(/^\/([a-zA-Z])\//, (m, d) => d.toUpperCase() + ':/')
    .replace(/\/+$/, '').toLowerCase();
}

function analyzeBashCd(command, cwd) {
  const m = String(command).trim().match(/^cd\s+("([^"]+)"|'([^']+)'|(\S+))\s*(?:&&|;)/);
  if (!m) return null;
  const target = m[2] || m[3] || m[4];
  const T = normPath(target), C = normPath(cwd);
  if (T === C) return { kind: 'same', target };
  const WT = '/.claude/worktrees/';
  if (C.includes(WT)) {
    const mainRoot = C.slice(0, C.indexOf(WT));
    if (!T.includes(WT) && (T === mainRoot || T.startsWith(mainRoot + '/'))) return { kind: 'main', target };
  }
  if (T.startsWith(C + '/')) return { kind: 'sub', target };
  return null;
}

function logBashCdObserve(kind, cwd, target) {
  if (process.env['{{ENV_PREFIX}}_GUARD_FIXTURE'] === '1') return; // 夾具測試不污染觀察數據
  try {
    const dir = path.dirname(BASH_CD_OBSERVE_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(BASH_CD_OBSERVE_LOG, `${new Date().toISOString()} | ${kind} | cwd=${String(cwd).slice(-50)} | target=${String(target).slice(-50)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

function toRegex(p) { return new RegExp(p.source, p.flags || ''); }
function hasKey(obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); }
function fmt1(line, vars) {
  return line.replace(/\{(\w+)\}/g, (m, k) => (hasKey(vars, k) ? vars[k] : m));
}
function fmt(lines, vars) {
  return lines.map(line => fmt1(line, vars));
}


const HANDLERS = {
  deploy_protect(rule, ctx, blocking) {
    const target = ctx.tool === 'Bash' || ctx.tool === 'PowerShell' ? ctx.command : ctx.filePath;
    let hit = false;
    if (rule.match.type === 'path_includes') {
      hit = target.includes(rule.match.value);
    } else if (rule.match.type === 'regex_all') {
      hit = rule.match.patterns.every(p => toRegex(p).test(target));
    }
    if (!hit) return;
    if (checkDeployAuthorization()) {
      consumeDeployAuthorization(target, rule.consume_log_tag);
    } else {
      blocking.push(...rule.block_message);
    }
  },

  deploy_flag_log(rule, ctx) {
    if (!ctx.filePath.includes(rule.match.value)) return;
    if (process.env['{{ENV_PREFIX}}_GUARD_FIXTURE'] === '1') return;
    try {
      const dir = path.dirname(DEPLOY_LOG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const line = fmt1(rule.log_template, { ts: new Date().toISOString(), tool: ctx.tool }) + '\n';
      fs.appendFileSync(DEPLOY_LOG_FILE, line, 'utf8');
    } catch (_) { /* silent */ }
  },

  deploy_flag_log_shell(rule, ctx) {
    const hit = rule.match.patterns.every(p => toRegex(p).test(ctx.command));
    if (!hit) return;
    if (process.env['{{ENV_PREFIX}}_GUARD_FIXTURE'] === '1') return;
    try {
      const dir = path.dirname(DEPLOY_LOG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const line = fmt1(rule.log_template, { ts: new Date().toISOString(), cmd80: String(ctx.command).slice(0, 80) }) + '\n';
      fs.appendFileSync(DEPLOY_LOG_FILE, line, 'utf8');
    } catch (_) { /* silent */ }
  },

  regex_list_block_first(rule, ctx, blocking) {
    for (const p of rule.patterns) {
      if (toRegex(p).test(ctx.content)) {
        blocking.push(...fmt(rule.block_message_template, { label: p.label }));
        break;
      }
    }
  },

  symbol_modify_warn(rule, ctx, blocking, warnings) {
    for (const sym of rule.symbols) {
      const modPatterns = [
        new RegExp(`function\\s+${sym}\\s*\\(`, ''),
        new RegExp(`${sym}\\s*=\\s*function`, ''),
        new RegExp(`delete\\s+.*${sym}`, '')
      ];
      if (modPatterns.some(p => p.test(ctx.content))) {
        warnings.push(...fmt(rule.warn_message_template, { sym }));
      }
    }
  },

  env_write_warn(rule, ctx, blocking, warnings) {
    if (ctx.filePath.endsWith(rule.suffix) && !ctx.filePath.endsWith(rule.exclude_suffix)) {
      warnings.push(...rule.warn_message);
    }
  },

  learnings_write_warn(rule, ctx, blocking, warnings) {
    const m = rule.match;
    if (!(ctx.filePath.endsWith(m.endswith) || ctx.filePath.includes(m.includes))) return;
    warnings.push(...rule.warn_message);
    if (ctx.filePath.endsWith(rule.finance_bucket_endswith)) {
      warnings.push(...rule.finance_bucket_extra_message);
    }
  },

  finance_shell_observe(rule, ctx) {
    const writeShaped = toRegex(rule.write_cmd_pattern).test(ctx.command) || toRegex(rule.redirect_pattern).test(ctx.command);
    if (!writeShaped) return;
    if (!toRegex(rule.finance_keyword_pattern).test(ctx.command)) return;
    if (toRegex(rule.exclude_pattern).test(ctx.command)) return;
    logKgovObserve(ctx.command);
  },

  cd_observe(rule, ctx, blocking, warnings) {
    if (!ctx.cwd) return;
    const cdInfo = analyzeBashCd(ctx.command, ctx.cwd);
    if (!cdInfo) return;
    logBashCdObserve(cdInfo.kind, ctx.cwd, cdInfo.target);
    const msg = rule.messages[cdInfo.kind];
    if (msg) warnings.push(...msg);
  },

  handoff_gate(rule, ctx, blocking, warnings) {
    if (rule.disabled_under_env && process.env[rule.disabled_under_env] === '1') return;
    if (!toRegex(rule.command_pattern).test(ctx.command)) return;
    if (toRegex(rule.dry_run_exclude_pattern).test(ctx.command)) return;
    const handoffFile = process.env[rule.gate_file_env] || path.join(REPO_ROOT, rule.handoff_rel);

    if (process.env[rule.skip_env] === '1') {
      logGateBypass(`${rule.skip_env}=1`, ctx.command, rule.gate_file_env);
      warnings.push(...rule.skip_warn_message);
      return;
    }

    const stamp = readHandoffStamp(handoffFile);
    const today = todayLocalISO();
    if (stamp === null) {
      warnings.push(...rule.stamp_missing_warn_message);
    } else if (stamp !== today) {
      blocking.push(...fmt(rule.stamp_stale_block_message_template, { stamp, today, handoff_rel: rule.handoff_rel }));
    } else if (handoffHasUnstagedEdits(rule.handoff_rel, rule.gate_file_env)) {
      blocking.push(...fmt(rule.unstaged_block_message_template, { handoff_rel: rule.handoff_rel }));
    }
  },

  regex_block(rule, ctx, blocking) {
    if (toRegex(rule.pattern).test(ctx.command)) blocking.push(...rule.block_message);
  },

  regex_warn(rule, ctx, blocking, warnings) {
    if (toRegex(rule.pattern).test(ctx.command)) warnings.push(...rule.warn_message);
  },

  rm_rf_warn(rule, ctx, blocking, warnings) {
    const isRmRf = toRegex(rule.rm_rf_pattern).test(ctx.command);
    const isRemoveItemForce = toRegex(rule.remove_item_pattern).test(ctx.command) &&
      toRegex(rule.recurse_pattern).test(ctx.command) &&
      toRegex(rule.force_pattern).test(ctx.command);
    if (!isRmRf && !isRemoveItemForce) return;
    const isSafe = rule.safe_exceptions.some(s => ctx.command.includes(s));
    if (!isSafe) warnings.push(...rule.warn_message);
  }
};


function failClosed(reason) {
  process.stderr.write('═══ Governance guard：guard 規則設定損壞，安全起見全面攔截 ═══\n');
  process.stderr.write(`🚫 ${reason}\n`);
  process.stderr.write('   → 呢個係 guard 引擎本身嘅設定錯誤，唔係你嘅工具呼叫有問題\n');
  process.stderr.write(`   → 請檢查 ${RULES_FILE} 是否損壞\n`);
  process.stderr.write('═══════════════════════════════\n');
  process.exit(2);
}

function assertRule(cond, ruleId, msg) {
  if (!cond) throw new Error(`規則 ${ruleId}：${msg}`);
}
function assertPattern(p, ruleId, label) {
  assertRule(p && typeof p.source === 'string', ruleId, `${label} 唔係合法 pattern 物件（缺 source）`);
  try { new RegExp(p.source, p.flags || ''); } catch (e) {
    assertRule(false, ruleId, `${label} regex 編譯失敗：${e.message}`);
  }
}
function assertPatternList(list, ruleId, label) {
  assertRule(Array.isArray(list), ruleId, `${label} 必須係陣列`);
  list.forEach((p, i) => assertPattern(p, ruleId, `${label}[${i}]`));
}
function assertStringArray(v, ruleId, label) {
  assertRule(Array.isArray(v) && v.every(x => typeof x === 'string'), ruleId, `${label} 必須係字串陣列`);
}
function assertStringList(v, ruleId, label) {
  assertRule(Array.isArray(v) && v.every(x => typeof x === 'string'), ruleId, `${label} 必須係字串陣列`);
}

const KIND_VALIDATORS = {
  deploy_protect(rule) {
    const m = rule.match;
    assertRule(m && (m.type === 'path_includes' || m.type === 'regex_all'), rule.id, 'match.type 必須係 path_includes 或 regex_all');
    if (m.type === 'path_includes') assertRule(typeof m.value === 'string', rule.id, 'match.value 必須係字串');
    if (m.type === 'regex_all') assertPatternList(m.patterns, rule.id, 'match.patterns');
    assertRule(typeof rule.consume_log_tag === 'string', rule.id, 'consume_log_tag 必須係字串');
    assertStringArray(rule.block_message, rule.id, 'block_message');
  },
  deploy_flag_log(rule) {
    assertRule(rule.match && typeof rule.match.value === 'string', rule.id, 'match.value 必須係字串');
    assertRule(typeof rule.log_template === 'string', rule.id, 'log_template 必須係字串');
  },
  deploy_flag_log_shell(rule) {
    assertPatternList(rule.match && rule.match.patterns, rule.id, 'match.patterns');
    assertRule(typeof rule.log_template === 'string', rule.id, 'log_template 必須係字串');
  },
  regex_list_block_first(rule) {
    assertRule(Array.isArray(rule.patterns), rule.id, 'patterns 必須係陣列');
    rule.patterns.forEach((p, i) => {
      assertPattern(p, rule.id, `patterns[${i}]`);
      assertRule(typeof p.label === 'string', rule.id, `patterns[${i}].label 必須係字串`);
    });
    assertStringArray(rule.block_message_template, rule.id, 'block_message_template');
  },
  symbol_modify_warn(rule) {
    assertStringList(rule.symbols, rule.id, 'symbols');
    assertStringArray(rule.warn_message_template, rule.id, 'warn_message_template');
  },
  env_write_warn(rule) {
    assertRule(typeof rule.suffix === 'string' && typeof rule.exclude_suffix === 'string', rule.id, 'suffix/exclude_suffix 必須係字串');
    assertStringArray(rule.warn_message, rule.id, 'warn_message');
  },
  learnings_write_warn(rule) {
    assertRule(rule.match && typeof rule.match.endswith === 'string' && typeof rule.match.includes === 'string', rule.id, 'match.endswith/includes 必須係字串');
    assertStringArray(rule.warn_message, rule.id, 'warn_message');
    assertRule(typeof rule.finance_bucket_endswith === 'string', rule.id, 'finance_bucket_endswith 必須係字串');
    assertStringArray(rule.finance_bucket_extra_message, rule.id, 'finance_bucket_extra_message');
  },
  finance_shell_observe(rule) {
    assertPattern(rule.write_cmd_pattern, rule.id, 'write_cmd_pattern');
    assertPattern(rule.redirect_pattern, rule.id, 'redirect_pattern');
    assertPattern(rule.finance_keyword_pattern, rule.id, 'finance_keyword_pattern');
    assertPattern(rule.exclude_pattern, rule.id, 'exclude_pattern');
  },
  cd_observe(rule) {
    assertRule(rule.messages && typeof rule.messages === 'object', rule.id, 'messages 必須係物件');
    for (const k of ['same', 'main', 'sub']) {
      if (rule.messages[k] !== undefined) assertStringArray(rule.messages[k], rule.id, `messages.${k}`);
    }
  },
  handoff_gate(rule) {
    assertPattern(rule.command_pattern, rule.id, 'command_pattern');
    assertPattern(rule.dry_run_exclude_pattern, rule.id, 'dry_run_exclude_pattern');
    assertRule(typeof rule.skip_env === 'string', rule.id, 'skip_env 必須係字串');
    assertRule(typeof rule.gate_file_env === 'string', rule.id, 'gate_file_env 必須係字串');
    assertRule(typeof rule.handoff_rel === 'string', rule.id, 'handoff_rel 必須係字串');
    assertStringArray(rule.skip_warn_message, rule.id, 'skip_warn_message');
    assertStringArray(rule.stamp_missing_warn_message, rule.id, 'stamp_missing_warn_message');
    assertStringArray(rule.stamp_stale_block_message_template, rule.id, 'stamp_stale_block_message_template');
    assertStringArray(rule.unstaged_block_message_template, rule.id, 'unstaged_block_message_template');
  },
  regex_block(rule) {
    assertPattern(rule.pattern, rule.id, 'pattern');
    assertStringArray(rule.block_message, rule.id, 'block_message');
  },
  regex_warn(rule) {
    assertPattern(rule.pattern, rule.id, 'pattern');
    assertStringArray(rule.warn_message, rule.id, 'warn_message');
  },
  rm_rf_warn(rule) {
    assertPattern(rule.rm_rf_pattern, rule.id, 'rm_rf_pattern');
    assertPattern(rule.remove_item_pattern, rule.id, 'remove_item_pattern');
    assertPattern(rule.recurse_pattern, rule.id, 'recurse_pattern');
    assertPattern(rule.force_pattern, rule.id, 'force_pattern');
    assertStringList(rule.safe_exceptions, rule.id, 'safe_exceptions');
    assertStringArray(rule.warn_message, rule.id, 'warn_message');
  }
};

function loadRules() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(RULES_FILE, 'utf8'));
  } catch (e) {
    return failClosed(`無法讀取或解析規則檔：${e.message}`);
  }
  const rules = parsed && parsed.rules;
  if (!Array.isArray(rules)) {
    return failClosed('規則檔格式錯誤：缺少 rules 陣列');
  }
  try {
    for (const rule of rules) {
      assertRule(rule && typeof rule.id === 'string' && typeof rule.kind === 'string' &&
        (rule.scope === 'write' || rule.scope === 'bash'), rule && rule.id || '(unknown)', '缺 id/kind/scope，或 scope 唔係 write/bash');
      assertRule(hasKey(HANDLERS, rule.kind), rule.id, `kind "${rule.kind}" 冇對應嘅 handler`);
      const validate = KIND_VALIDATORS[rule.kind];
      if (validate) validate(rule);
    }
  } catch (e) {
    return failClosed(e.message);
  }
  return rules;
}

const RULES = loadRules();

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

  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const filePath = (toolInput.file_path || toolInput.notebook_path || '').replace(/\\/g, '/');
    const content = toolInput.content || toolInput.new_string || toolInput.new_source ||
      (Array.isArray(toolInput.edits) ? toolInput.edits.map(e => e.new_string || '').join('\n') : '') || '';

    const ctx = { tool, filePath, content };
    try {
      for (const rule of RULES.filter(r => r.scope === 'write')) {
        HANDLERS[rule.kind](rule, ctx, blocking, warnings);
      }
    } catch (e) {
      return failClosed(`規則執行期間發生未預期錯誤（write scope）：${e.message}`);
    }
  }

  if (tool === 'Bash' || tool === 'PowerShell') {
    const command = toolInput.command || '';
    const ctx = { tool, command, cwd: data.cwd, data };
    try {
      for (const rule of RULES.filter(r => r.scope === 'bash')) {
        HANDLERS[rule.kind](rule, ctx, blocking, warnings);
      }
    } catch (e) {
      return failClosed(`規則執行期間發生未預期錯誤（bash scope）：${e.message}`);
    }
  }

  if (blocking.length === 0 && warnings.length === 0) {
    process.exit(0); // All clear, allow
  }

  if (warnings.length > 0) {
    process.stderr.write('─── Governance warning ───\n');
    warnings.forEach(w => process.stderr.write(w + '\n'));
    process.stderr.write('──────────────────\n');
  }

  if (blocking.length > 0) {
    process.stderr.write('═══ Governance guard：攔截操作 ═══\n');
    blocking.forEach(b => process.stderr.write(b + '\n'));
    process.stderr.write('═══════════════════════════════\n');
    process.exit(2); // BLOCK
  }

  if (warnings.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: warnings.join('\n') }
    }) + '\n');
  }

  process.exit(0); // Warnings only, allow with caution
});
