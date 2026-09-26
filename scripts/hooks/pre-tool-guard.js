#!/usr/bin/env node
// scripts/hooks/pre-tool-guard.js
// FHS PreToolUse Hook — AGENTS.md Hard Rule Enforcer
// Intercepts Write/Edit/Bash tool calls that violate FHS constitutional rules
// Version: 2.0.0 | 2026-09-26 (S149 Phase 2: engine/rules split)
//
// Exit codes:
//   0 = pass (allow execution)
//   2 = block (deny execution, show stderr to Claude)
// Warnings use stderr + exit 0 (non-blocking alert)
//
// ── S149 Phase 2 split ──────────────────────────────────────────────────────
// This file is now a generic interpreter: it knows how to execute each rule
// "kind" (deploy_protect, regex_block, handoff_gate, …) but carries no
// project-specific patterns, messages, or thresholds. All of that content
// lives in scripts/hooks/guard-rules.fhs.json (R1–R14), which a portable
// template ships as an empty/example file for each new project to fill in.
// Rule content changes → edit the JSON. Engine behavior changes (a new kind,
// or how a kind is evaluated) → edit this file, and it affects every project
// that reuses the engine.

'use strict';

const fs = require('fs');
const path = require('path');

// 規則檔路徑寫死，唔提供 env override——一個外部可控嘅 env var 指向任意規則檔
// 等同可以整個 swap 走全部規則（例如指向 {"rules":[]}），呢個攻擊面原本個
// monolithic 檔案唔存在，拆分後絕對唔可以引入（opus 對抗審查揪出，2026-09-26）。
const RULES_FILE = path.join(__dirname, 'guard-rules.fhs.json');

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
// D94（2026-09-25）：觀察數據固定寫入主倉 .fhs/（worktree 刪除即失、且各 worktree 各寫各嘅日誌，
// 累積唔到有意義嘅命中率）；被 *.log 忽略、不入 git。
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

// ── Handoff sync gate (R13, D68, 2026-08-21) ────────────────────────────────
// 為何存在：`/commit` P0.7 一直只係散文指示「便攜塊『更新:』必須改成今日日期」，
// 冇任何機械強制。實測 D67(08-19)/D66-follow(08-20) 兩次 `/commit` 都改咗內容
// 但個日期戳三日冇郁 —— AI 記得改內容記唔住改標籤，因為冇嘢會攔。
// D66 已判定歷來三次修復（S118/S144/D60）全部落喺「內容·紀律層」故零效果；
// SessionStart hook 只做**事後偵測**（下一個 session 先警告）。呢條係補返
// 「寫入時點」嗰個真空 —— commit 前擋，唔係 commit 後嘈。
//
// 兩個條件（任一不過即 exit 2）：
//   (1) 便攜塊頂部 `更新: YYYY-MM-DD` ≠ 今日本地日期
//   (2) handoff.md 有未 staged 嘅改動（改咗但冇入今次 commit）
// 條件(1)幂等：同一日第二個 commit（例如 Phase 2.5 部署 commit）自動過關，
// 唔使開後門 flag，亦即冇「AI 自我授權」漏洞——檢查本身就係驗證。
//
// 已知邊界（刻意 fail-open，寧鬆莫死鎖）：
//   • `git -C <path> commit` 形式唔會命中 regex（放行，非誤擋）
//   • 指令字串內夾住 "git commit" 字樣（如 echo）會誤擋——用下方逃生口
//   • git 不可用／唔係 repo／讀唔到 handoff → 一律放行
//   • 擋唔到「日期戳啱但內容根本冇更新」——機械層無法驗證內容新鮮度
// 逃生口：FHS_SKIP_HANDOFF_GATE=1（每次繞過記入 deploy-log.md 供稽核）
// 測試用：FHS_HANDOFF_GATE_FILE 覆寫檔案路徑（同時跳過條件(2)嘅 git 探測）
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
  // 夾具測試唔可以污染真實稽核檔（同 logKgovObserve 嘅 S148 B1 防污染同源）。
  // 註：呢度用 gateFileEnv（FHS_HANDOFF_GATE_FILE）而非 FHS_GUARD_FIXTURE，因為 R13 喺
  // FHS_GUARD_FIXTURE=1 之下根本唔會行到，R13 專屬 runner 用嘅係前者。
  if (process.env[gateFileEnv]) return;
  try {
    const dir = path.dirname(DEPLOY_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(DEPLOY_LOG_FILE, `${new Date().toISOString()} | R13 handoff-gate bypass (${reason}) | ${String(commandHead).slice(0, 80)}\n`, 'utf8');
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

// ── R14 輔助（D92）：分析 Bash 開頭 cd 前綴 ──────────────────────────────────
// 觀察數據要跨 worktree 累積（worktree 刪除即失）→ 固定寫入主倉 .fhs/（檔案被 *.log 忽略，不入 git）
const BASH_CD_ROOT = MAIN_REPO_ROOT;
const BASH_CD_OBSERVE_LOG = path.join(BASH_CD_ROOT, '.fhs/.bash-cd-observe.log');

function normPath(p) {
  return String(p).split('\\').join('/')
    .replace(/^\/([a-zA-Z])\//, (m, d) => d.toUpperCase() + ':/')
    .replace(/\/+$/, '').toLowerCase();
}

// 回傳 null（無 cd 前綴／唔屬需警告類型）或 { kind: 'same'|'sub'|'main', target }
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
  if (process.env.FHS_GUARD_FIXTURE === '1') return; // 夾具測試不污染觀察數據
  try {
    const dir = path.dirname(BASH_CD_OBSERVE_LOG);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(BASH_CD_OBSERVE_LOG, `${new Date().toISOString()} | ${kind} | cwd=${String(cwd).slice(-50)} | target=${String(target).slice(-50)}\n`, 'utf8');
  } catch (_) { /* silent */ }
}

// ── Generic rule-content helpers ─────────────────────────────────────────────
// 全部模板替換一律用 function 做 replacement（而非字串），因為 String.replace
// 嘅字串 replacement 參數會將 command/檔名入面嘅 $&、$`、$'、$$ 當特殊 pattern
// 解讀，令稽核日誌被使用者可控輸入污染（opus 對抗審查揪出，2026-09-26）。
function toRegex(p) { return new RegExp(p.source, p.flags || ''); }
function hasKey(obj, k) { return Object.prototype.hasOwnProperty.call(obj, k); }
function fmt1(line, vars) {
  return line.replace(/\{(\w+)\}/g, (m, k) => (hasKey(vars, k) ? vars[k] : m));
}
function fmt(lines, vars) {
  return lines.map(line => fmt1(line, vars));
}

// ── Per-kind rule handlers ───────────────────────────────────────────────────
// Each handler receives (rule, ctx, blocking, warnings) and pushes messages.
// ctx carries whatever the current tool call needs: { tool, filePath, content,
// command, cwd, data }.

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
    if (process.env.FHS_GUARD_FIXTURE === '1') return;
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
    if (process.env.FHS_GUARD_FIXTURE === '1') return;
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
    // R13 是全域關閉（唔止跳過側寫），因為佢有自己專屬 runner（run-handoff-gate-tests.js，
    // 用 FHS_HANDOFF_GATE_FILE 覆寫），跑普通 guard fixtures（FHS_GUARD_FIXTURE=1）時
    // 必須完全唔行到，否則會讀真實 handoff.md 令普通夾具結果取決於當日真實檔案狀態。
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

// Execution order matters for message ordering (behavioral equivalence with
// the pre-split file): write-scope rules run in R1,R10,R2,R3,R4,R12 order;
// bash-scope rules run in R9,R10,R11,R14,R13,R5,R6,R7,R8 order. This is the
// literal order the rules appear in guard-rules.fhs.json — do not reorder the
// JSON without re-verifying fixture output byte-for-byte.

// ── Fail-closed rule loading ─────────────────────────────────────────────────
// 原本個 monolithic 檔案冇「規則檔損壞」呢個故障模式可言——規則同引擎係同一份
// 代碼。拆分之後,規則檔可以獨立損壞(JSON 語法錯/漏 kind/未知 kind),如果冇檢查
// 就直接用,任何一種損壞都會令 node 拋錯 exit 1——Claude Code 對 PreToolUse
// 非 0/2 嘅 exit code 視為非阻擋性錯誤,即係話個工具呼叫會照做,等於規則檔一壞
// 就靜默放晒全部規則(fail-open)。呢個係拆分本身帶嚟嘅新故障模式,必須喺入口
// 驗證，壞咗就 exit 2 全面攔截(fail-closed)，唔可以擲 exception 收場
// （opus 對抗審查揪出，2026-09-26）。
function failClosed(reason) {
  process.stderr.write('═══ FHS 安全守護：guard 規則設定損壞，安全起見全面攔截 ═══\n');
  process.stderr.write(`🚫 ${reason}\n`);
  process.stderr.write('   → 呢個係 guard 引擎本身嘅設定錯誤，唔係你嘅工具呼叫有問題\n');
  process.stderr.write(`   → 請檢查 ${RULES_FILE} 是否損壞\n`);
  process.stderr.write('═══════════════════════════════\n');
  process.exit(2);
}

// 第二輪 opus 對抗審查揪出：第一版 loadRules() 只驗 id/kind/scope 存在，冇驗
// 每個 kind 實際會用到嘅欄位（pattern 能否編譯、message 是否陣列）——呢啲錯
// 一樣要等到 dispatch 期間先爆，一樣係 fail-open。依家逐個 kind 驗齊佢會
// dereference 嘅欄位，喺 stdin 都未讀之前就攔截。
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
      // hasKey 而非 typeof HANDLERS[x]==='function'：HANDLERS 係 plain object，
      // typeof 檢查會俾 "constructor"/"toString" 呢類繼承自 Object.prototype
      // 嘅名撞中，令冇對應行為嘅規則靜默通過驗證（opus 對抗審查第二輪揪出）。
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

  // ═══════════════════════════════════════════════════════════════
  // Guard: Write / Edit
  // ═══════════════════════════════════════════════════════════════
  if (tool === 'Write' || tool === 'Edit' || tool === 'MultiEdit' || tool === 'NotebookEdit') {
    const filePath = (toolInput.file_path || toolInput.notebook_path || '').replace(/\\/g, '/');
    // MultiEdit carries an `edits` array instead of a single new_string; NotebookEdit
    // carries `new_source`. Flatten whichever shape is present into one string to scan.
    const content = toolInput.content || toolInput.new_string || toolInput.new_source ||
      (Array.isArray(toolInput.edits) ? toolInput.edits.map(e => e.new_string || '').join('\n') : '') || '';

    const ctx = { tool, filePath, content };
    // try/catch 係 loadRules() 驗證之外嘅第二道防線（opus 對抗審查第二輪建議）：
    // 驗證再仔細都可能有漏網（例如某個 kind 未來加咗新欄位冇同步更新 validator），
    // 呢度確保即使真係漏網爆錯，都係 fail-closed（exit 2）而唔係 fail-open（exit 0）。
    try {
      for (const rule of RULES.filter(r => r.scope === 'write')) {
        HANDLERS[rule.kind](rule, ctx, blocking, warnings);
      }
    } catch (e) {
      return failClosed(`規則執行期間發生未預期錯誤（write scope）：${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // Guard: Bash
  // ═══════════════════════════════════════════════════════════════
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

  // D92/D93：exit 0 時 stderr 只進 transcript、模型睇唔到——本檔所有「只警告」規則
  // （R3/R4/R6/R8/R11-observe/R12/R13/R14）自建立以來一直係隱形嘅（2026-09-25 實測）。
  // 改用 hook JSON hookSpecificOutput.additionalContext 直接畀模型；stderr 照舊保留（transcript／人睇）。
  // 只加資訊，唔改權限決定（冇 permissionDecision），exit code 不變。
  if (warnings.length > 0) {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: warnings.join('\n') }
    }) + '\n');
  }

  process.exit(0); // Warnings only, allow with caution
});
