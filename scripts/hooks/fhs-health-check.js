#!/usr/bin/env node
// scripts/hooks/fhs-health-check.js
// FHS 文件健康快檢（L1）— SessionStart hook 呼叫，零 LLM token，零外部依賴。
// 偵測文件病：過肥 / 沉積孤兒 / 過時漂移 / 同名重複 / 歸檔斷鏈 / 未註冊桶 /
// 複驗逾期 / 週期稽核到期 / 時限待辦漏帶入便攜塊（2026-08-05 新增第7類）/
// P0.6歸檔洩漏（2026-08-26 新增第8類）。
// 規則資料在 .fhs/tools/fhs-health-rules.json，改規則不必改此檔。
//
// Fail-open 三原則：全包 try-catch、無論如何 exit 0、內部錯誤只落
// .fhs/.health-check-error.log，絕不干擾 stdout / session 啟動。
//
// Version: 1.0.0 | 2026-07-05 | S142

'use strict';

const fs = require('fs');
const path = require('path');

// 測試沙盒覆寫（fixtures 用，正常執行不設定這些環境變數）
const REPO_ROOT = process.env.FHS_HEALTH_ROOT || path.resolve(__dirname, '../..');
const RULES_FILE = process.env.FHS_HEALTH_RULES || path.join(REPO_ROOT, '.fhs/tools/fhs-health-rules.json');
const CANONICAL_KEYS_FILE = path.join(REPO_ROOT, '.fhs/tools/canonical_keys.yml');
const REPORT_FILE = process.env.FHS_HEALTH_REPORT_OUT || path.join(REPO_ROOT, '.fhs/.health-report.json');
const ERROR_LOG = process.env.FHS_HEALTH_ERROR_LOG || path.join(REPO_ROOT, '.fhs/.health-check-error.log');

// ── HELPERS ──────────────────────────────────────────────────────────────────

function rel(p) {
  return path.relative(REPO_ROOT, p).replace(/\\/g, '/');
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function logError(context, err) {
  try {
    const line = `[${new Date().toISOString()}] ${context}: ${err && err.message || err}\n`;
    fs.appendFileSync(ERROR_LOG, line, 'utf8');
  } catch (_) { /* truly nothing we can do */ }
}

// Minimal glob: supports a single '*' wildcard within the filename part only.
// e.g. ".fhs/ai/governance/0*.md" or "*.md" (dir-relative).
function globFiles(globPattern, baseDir) {
  const full = path.isAbsolute(globPattern) ? globPattern : path.join(baseDir || REPO_ROOT, globPattern);
  const dir = path.dirname(full);
  const filePattern = path.basename(full);
  if (!fs.existsSync(dir)) return [];
  const regex = new RegExp('^' + filePattern.split('*').map(escapeRegex).join('.*') + '$');
  return fs.readdirSync(dir)
    .filter(f => regex.test(f) && fs.statSync(path.join(dir, f)).isFile())
    .map(f => path.join(dir, f));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walkFiles(dir, extGlob, results, depth, excludeDirNames) {
  if (depth > 6) return results;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return results; }
  const extRegex = new RegExp('^' + extGlob.split('*').map(escapeRegex).join('.*') + '$');
  const excluded = new Set(['node_modules', '.git', ...(excludeDirNames || [])]);
  for (const entry of entries) {
    if (excluded.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, extGlob, results, depth + 1, excludeDirNames);
    } else if (extRegex.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── CANONICAL_KEYS.YML MINI-PARSER ────────────────────────────────────────────
// Handles the specific 2-level structure used in .fhs/tools/canonical_keys.yml:
//   key_name:
//     source_of_truth: <path>
//     pattern: '<regex>'
//     allowed_references:
//       - <path>
//     note: "..."

function parseCanonicalKeys(content) {
  const lines = content.split(/\r?\n/);
  const keys = {};
  let currentKey = null;
  let currentField = null;

  for (let raw of lines) {
    if (/^\s*#/.test(raw) || raw.trim() === '') continue;
    const topMatch = raw.match(/^(\w+):\s*$/);
    if (topMatch) {
      currentKey = topMatch[1];
      keys[currentKey] = { source_of_truth: null, pattern: null, allowed_references: [], note: null };
      currentField = null;
      continue;
    }
    if (!currentKey) continue;

    const indentMatch = raw.match(/^  (\w+):\s*(.*)$/);
    if (indentMatch) {
      const [, field, value] = indentMatch;
      currentField = field;
      if (field === 'allowed_references') {
        keys[currentKey].allowed_references = [];
      } else {
        keys[currentKey][field] = stripQuotes(value.trim());
      }
      continue;
    }

    const listMatch = raw.match(/^\s{4,}-\s*(.+)$/);
    if (listMatch && currentField === 'allowed_references') {
      keys[currentKey].allowed_references.push(stripQuotes(listMatch[1].trim()));
    }
  }
  return keys;
}

function stripQuotes(s) {
  if (!s) return s;
  const m = s.match(/^(['"])(.*)\1$/);
  return m ? m[2] : s;
}

// ── CHECK 1: 過肥 volume_budgets ───────────────────────────────────────────────

function checkVolumeBudgets(rules) {
  const issues = [];
  for (const rule of rules.volume_budgets || []) {
    try {
      const files = rule.path_glob ? globFiles(rule.path_glob) : [path.join(REPO_ROOT, rule.path)];
      for (const f of files) {
        if (!fs.existsSync(f)) continue;
        const content = readText(f);
        let measured;

        if (rule.scope === 'portable_block') {
          const lines = content.split(/\r?\n/);
          const fenceIdx = lines.findIndex(l => l.includes('```handoff'));
          const boundaryIdx = lines.findIndex(l => l.includes('便攜邊界'));
          if (fenceIdx === -1 || boundaryIdx === -1) continue;
          const segment = lines.slice(fenceIdx, boundaryIdx + 1).join('\n');
          measured = Buffer.byteLength(segment, 'utf8');
        } else if (rule.unit === 'bytes') {
          measured = Buffer.byteLength(content, 'utf8');
        } else if (rule.unit === 'lines') {
          measured = content.split(/\r?\n/).length;
        } else if (rule.unit === 'entries' && rule.count_method === 'line_regex_count') {
          const re = new RegExp(rule.count_pattern);
          measured = content.split(/\r?\n/).filter(l => re.test(l)).length;
        } else {
          continue;
        }

        if (measured > rule.budget) {
          issues.push(`過肥: ${rel(f)} [${rule.id}] ${measured}${rule.unit} > 預算${rule.budget}${rule.unit}（${rule.source}）`);
        }
      }
    } catch (err) {
      logError(`volume_budget[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 2: 沉積孤兒 index_orphan_checks ──────────────────────────────────────

function checkIndexOrphans(rules, autoMemoryDir) {
  const issues = [];
  for (const rule of rules.index_orphan_checks || []) {
    try {
      let indexPath, contentDir;
      if (rule.index_source === 'auto_memory_dir') {
        indexPath = path.join(autoMemoryDir, rule.index_file);
        contentDir = autoMemoryDir;
      } else {
        indexPath = path.join(REPO_ROOT, rule.index_file);
        contentDir = path.join(REPO_ROOT, rule.content_dir);
      }
      if (!fs.existsSync(indexPath) || !fs.existsSync(contentDir)) continue;

      const indexContent = readText(indexPath);
      const referenced = new Set();
      if (rule.index_type === 'markdown_link_list') {
        const re = new RegExp(rule.index_link_pattern, 'g');
        let m;
        while ((m = re.exec(indexContent)) !== null) referenced.add(m[2] || m[1]);
      } else if (rule.index_type === 'markdown_table_column') {
        const re = new RegExp(rule.table_column_regex, 'gm');
        let m;
        while ((m = re.exec(indexContent)) !== null) referenced.add(m[1]);
      }

      const actualFiles = fs.readdirSync(contentDir)
        .filter(f => f.endsWith('.md') && !(rule.exclude_files || []).includes(f));

      for (const ref of referenced) {
        if (!actualFiles.includes(ref)) {
          issues.push(`斷鏈: ${rel(indexPath)} 索引提到「${ref}」但實檔不存在`);
        }
      }
      for (const f of actualFiles) {
        if (!referenced.has(f)) {
          issues.push(`孤兒: ${rel(path.join(contentDir, f))} 存在但未被 ${rel(indexPath)} 索引`);
        }
      }
    } catch (err) {
      logError(`index_orphan[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 3: 過時漂移 canonical_key_drift_check ────────────────────────────────

function checkCanonicalDrift() {
  const issues = [];
  try {
    if (!fs.existsSync(CANONICAL_KEYS_FILE)) return issues;
    const keys = parseCanonicalKeys(readText(CANONICAL_KEYS_FILE));

    for (const [keyName, def] of Object.entries(keys)) {
      if (!def.source_of_truth || !def.pattern) continue;
      const sourcePath = path.join(REPO_ROOT, def.source_of_truth);
      if (!fs.existsSync(sourcePath)) continue;

      let truthRe;
      try { truthRe = new RegExp(def.pattern, 'm'); } catch (err) { logError(`canonical[${keyName}].pattern`, err); continue; }
      const truthMatch = readText(sourcePath).match(truthRe);
      if (!truthMatch) continue;
      const truthValue = truthMatch[1] || truthMatch[0];

      for (const refPattern of def.allowed_references || []) {
        const refFiles = refPattern.includes('*') ? globFiles(refPattern) : [path.join(REPO_ROOT, refPattern)];
        for (const rf of refFiles) {
          if (!fs.existsSync(rf) || fs.statSync(rf).isDirectory()) continue;
          const refMatch = readText(rf).match(truthRe);
          if (refMatch) {
            const refValue = refMatch[1] || refMatch[0];
            if (refValue !== truthValue) {
              issues.push(`過時: ${rel(rf)} 的 ${keyName}=「${refValue}」與真理來源 ${def.source_of_truth}=「${truthValue}」不符`);
            }
          }
        }
      }
    }
  } catch (err) {
    logError('canonical_key_drift', err);
  }
  return issues;
}

// ── CHECK 4: 同名重複 duplicate_basename_checks ────────────────────────────────

function checkDuplicateBasenames(rules, autoMemoryDir) {
  const issues = [];
  for (const rule of rules.duplicate_basename_checks || []) {
    try {
      if (rule.scan_dirs) {
        const byBasename = {};
        for (const d of rule.scan_dirs) {
          const files = walkFiles(path.join(REPO_ROOT, d), rule.scan_glob, [], 0, rule.exclude_dir_names);
          for (const f of files) {
            const base = path.basename(f);
            if ((rule.allowlist_basenames || []).includes(base)) continue;
            (byBasename[base] = byBasename[base] || []).push(f);
          }
        }
        for (const [base, files] of Object.entries(byBasename)) {
          if (files.length > 1) {
            issues.push(`重複: "${base}" 出現於 ${files.length} 處 — ${files.map(rel).join(', ')}`);
          }
        }
      } else if (rule.compare_a_source === 'auto_memory_dir') {
        const aFiles = fs.existsSync(autoMemoryDir)
          ? fs.readdirSync(autoMemoryDir).filter(f => f.endsWith('.md'))
          : [];
        const bDir = path.join(REPO_ROOT, rule.compare_b_dir);
        const bFiles = fs.existsSync(bDir)
          ? fs.readdirSync(bDir).filter(f => f.endsWith('.md'))
          : [];
        const common = aFiles.filter(f => bFiles.includes(f));
        for (const f of common) {
          issues.push(`重複: "${f}" 同時存在於 auto-memory 目錄與 ${rel(bDir)}（S141 已知病灶型）`);
        }
      }
    } catch (err) {
      logError(`duplicate_basename[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 5: 歸檔斷鏈 archive_link_checks ──────────────────────────────────────

function checkArchiveLinks(rules) {
  const issues = [];
  for (const rule of rules.archive_link_checks || []) {
    try {
      const scanPath = path.join(REPO_ROOT, rule.scan_file);
      if (!fs.existsSync(scanPath)) continue;
      const content = readText(scanPath);
      const re = new RegExp(rule.link_pattern, 'g');
      const seen = new Set();
      let m;
      while ((m = re.exec(content)) !== null) {
        const linkRel = m[0];
        if (seen.has(linkRel)) continue;
        seen.add(linkRel);
        const target = path.join(REPO_ROOT, rule.resolve_base, linkRel);
        if (!fs.existsSync(target)) {
          issues.push(`斷鏈: ${rel(scanPath)} 提到 ${linkRel} 但目標不存在`);
        }
      }
    } catch (err) {
      logError(`archive_link[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 5b: 未註冊桶 unregistered_file_checks（2026-08-03 learnings 分桶重構）───
// 偵測目錄下 .md 檔是否有任何一個未被 volume_budgets 任何 rule 的 path 覆蓋——
// 防止未來新增領域桶時，配額與語法守護因 rule 未跟上而靜默失效（A2 對抗評審 #5）。

function checkUnregisteredFiles(rules) {
  const issues = [];
  for (const rule of rules.unregistered_file_checks || []) {
    try {
      const dir = path.join(REPO_ROOT, rule.dir);
      if (!fs.existsSync(dir)) continue;
      const registeredPaths = new Set(
        (rules[rule.registered_in] || [])
          .filter(r => r.path)
          .map(r => path.normalize(path.join(REPO_ROOT, r.path)))
      );
      const regex = new RegExp('^' + rule.glob.split('*').map(escapeRegex).join('.*') + '$');
      const files = fs.readdirSync(dir)
        .filter(f => regex.test(f) && !(rule.exclude_files || []).includes(f))
        .map(f => path.join(dir, f));
      for (const f of files) {
        if (!registeredPaths.has(path.normalize(f))) {
          issues.push(`未註冊: ${rel(f)} 存在於 ${rule.dir} 但未被任何 ${rule.registered_in} rule 覆蓋（${rule.note || ''}）`);
        }
      }
    } catch (err) {
      logError(`unregistered_file[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 5c: 複驗逾期 last_verified_checks（2026-08-03 learnings 分桶重構）──────
// 掃 <!-- v:YYYY-MM-DD --> 標記，超過 max_age_days 天未複驗則報異常（本系統健檢
// 全域皆為 fail-open 非阻擋性質，故無需另設 INFO/ERROR 分級）。v:unknown 略過。

function checkLastVerified(rules) {
  const issues = [];
  for (const rule of rules.last_verified_checks || []) {
    try {
      const dir = path.join(REPO_ROOT, rule.dir);
      if (!fs.existsSync(dir)) continue;
      const regex = new RegExp('^' + rule.glob.split('*').map(escapeRegex).join('.*') + '$');
      const tagRe = new RegExp(rule.tag_pattern, 'g');
      const files = fs.readdirSync(dir)
        .filter(f => regex.test(f) && !(rule.exclude_files || []).includes(f))
        .map(f => path.join(dir, f));
      for (const f of files) {
        const content = readText(f);
        let m;
        while ((m = tagRe.exec(content)) !== null) {
          const val = m[1];
          if (!val || val === rule.skip_value) continue;
          const d = new Date(val);
          if (isNaN(d)) continue;
          const ageDays = Math.floor((Date.now() - d.getTime()) / 86400000);
          if (ageDays > rule.max_age_days) {
            issues.push(`複驗逾期: ${rel(f)} 有教訓標記 v:${val} 已 ${ageDays} 天未複驗（規定上限 ${rule.max_age_days} 天）`);
          }
        }
      }
    } catch (err) {
      logError(`last_verified[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 5d: P0.6 歸檔洩漏 pending_table_leak_checks（2026-08-26）───────────────
// P0.6（/commit 完成項目搬去歸檔區）冇機械閘就會靜默停擺（2026-08-26 實測 7 週無人
// 執行，MASTER 表膨脹至 87%）。偵測「MASTER 持續待辦」表（第一個「已確認完成」
// 標題之前）內任何一行優先欄仍寫 ✅ 完成——代表應歸檔但未歸檔，零容忍。

function checkPendingTableLeaks(rules) {
  const issues = [];
  for (const rule of rules.pending_table_leak_checks || []) {
    try {
      const scanPath = path.join(REPO_ROOT, rule.scan_file);
      if (!fs.existsSync(scanPath)) continue;
      const lines = readText(scanPath).split(/\r?\n/);
      const startIdx = lines.findIndex(l => l.includes(rule.region_start_marker));
      if (startIdx === -1) continue;
      const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(rule.region_end_marker));
      const region = endIdx === -1 ? lines.slice(startIdx) : lines.slice(startIdx, endIdx);

      const leakRe = new RegExp(rule.leak_row_pattern);
      const leaked = region.filter(l => leakRe.test(l));
      if (leaked.length > (rule.budget || 0)) {
        issues.push(`P0.6歸檔洩漏: ${rel(scanPath)} MASTER待辦表內有 ${leaked.length} 項標記已完成但未搬去歸檔區（規定上限 ${rule.budget || 0} 項，${rule.source}）`);
      }
    } catch (err) {
      logError(`pending_table_leak[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 6: 週期稽核到期 cadence_checks ────────────────────────────────────────
// 記憶負擔歸零：不要求 Fat Mo 記得多久沒跑 /fhs-audit 這類週期指令，改由既有
// 報告產物（檔名含日期）推斷「上次執行時間」，不建新 marker 機制。

function checkCadenceOverdue(rules) {
  const issues = [];
  for (const rule of rules.cadence_checks || []) {
    try {
      const dir = path.join(REPO_ROOT, rule.evidence_dir);
      const dateRe = new RegExp(rule.date_regex);
      let latestDate = null;

      if (fs.existsSync(dir)) {
        const files = globFiles(rule.evidence_glob, dir);
        for (const f of files) {
          const m = path.basename(f).match(dateRe);
          if (!m) continue;
          const d = new Date(m[1]);
          if (!isNaN(d) && (!latestDate || d > latestDate)) latestDate = d;
        }
      }

      if (!latestDate) {
        issues.push(`週期: ${rule.command} ${rule.no_evidence_message || '從未執行過'}（規定上限 ${rule.max_age_days} 天，${rule.source}）`);
        continue;
      }

      const ageDays = Math.floor((Date.now() - latestDate.getTime()) / 86400000);
      if (ageDays > rule.max_age_days) {
        issues.push(`週期: ${rule.command} 已 ${ageDays} 天未執行（規定上限 ${rule.max_age_days} 天，${rule.source}）`);
      }
    } catch (err) {
      logError(`cadence[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── CHECK 7: 時限待辦漏帶 deadline_surfacing_checks（2026-08-05）──────────────
// MASTER 表非全✅完成列內嵌的未來日期，若便攜塊動態段（session 實際帶入 context
// 的範圍）未提及，代表下個 session 開場看不到——過3條上限篩選機制的結構性盲區。

function checkDeadlineSurfacing(rules) {
  const issues = [];
  for (const rule of rules.deadline_surfacing_checks || []) {
    try {
      const scanPath = path.join(REPO_ROOT, rule.scan_file);
      if (!fs.existsSync(scanPath)) continue;
      const lines = readText(scanPath).split(/\r?\n/);
      const startIdx = lines.findIndex(l => l.includes(rule.dynamic_segment_start_marker));
      const endIdx = lines.findIndex(l => l.includes(rule.dynamic_segment_end_marker));
      if (startIdx === -1 || endIdx === -1) continue;
      const dynamicSegment = lines.slice(startIdx, endIdx + 1).join('\n');

      const pendingMarkers = rule.pending_markers || [];
      const dateRe = new RegExp(rule.date_pattern, 'g');
      const foundDates = new Set();
      for (const line of lines.slice(endIdx + 1)) {
        if (!line.startsWith('|')) continue;
        if (!pendingMarkers.some(m => line.includes(m))) continue;
        let m;
        dateRe.lastIndex = 0;
        while ((m = dateRe.exec(line)) !== null) foundDates.add(m[0]);
      }

      const now = Date.now();
      for (const dateStr of foundDates) {
        if (rule.max_days_ahead != null) {
          const d = new Date(dateStr);
          if (isNaN(d)) continue;
          const daysAhead = (d.getTime() - now) / 86400000;
          if (daysAhead < 0 || daysAhead > rule.max_days_ahead) continue;
        }
        if (!dynamicSegment.includes(dateStr)) {
          issues.push(`時限待辦漏帶: ${rel(scanPath)} MASTER表待辦項含日期 ${dateStr}，便攜塊動態段未反映（${rule.note || ''}）`);
        }
      }
    } catch (err) {
      logError(`deadline_surfacing[${rule.id}]`, err);
    }
  }
  return issues;
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  const startedAt = Date.now();
  let issues = [];
  let rules = null;

  try {
    if (!fs.existsSync(RULES_FILE)) {
      process.exit(0);
    }
    rules = JSON.parse(readText(RULES_FILE));
  } catch (err) {
    logError('load_rules', err);
    process.exit(0);
  }

  const autoMemoryDir = rules.auto_memory_dir && rules.auto_memory_dir.path;

  try { issues = issues.concat(checkVolumeBudgets(rules)); } catch (err) { logError('checkVolumeBudgets', err); }
  try { issues = issues.concat(checkIndexOrphans(rules, autoMemoryDir)); } catch (err) { logError('checkIndexOrphans', err); }
  try { issues = issues.concat(checkCanonicalDrift()); } catch (err) { logError('checkCanonicalDrift', err); }
  try { issues = issues.concat(checkDuplicateBasenames(rules, autoMemoryDir)); } catch (err) { logError('checkDuplicateBasenames', err); }
  try { issues = issues.concat(checkArchiveLinks(rules)); } catch (err) { logError('checkArchiveLinks', err); }
  try { issues = issues.concat(checkUnregisteredFiles(rules)); } catch (err) { logError('checkUnregisteredFiles', err); }
  try { issues = issues.concat(checkLastVerified(rules)); } catch (err) { logError('checkLastVerified', err); }
  try { issues = issues.concat(checkPendingTableLeaks(rules)); } catch (err) { logError('checkPendingTableLeaks', err); }
  try { issues = issues.concat(checkCadenceOverdue(rules)); } catch (err) { logError('checkCadenceOverdue', err); }
  try { issues = issues.concat(checkDeadlineSurfacing(rules)); } catch (err) { logError('checkDeadlineSurfacing', err); }

  const durationMs = Date.now() - startedAt;

  try {
    fs.writeFileSync(REPORT_FILE, JSON.stringify({
      generated_at: new Date().toISOString(),
      duration_ms: durationMs,
      issue_count: issues.length,
      issues
    }, null, 2), 'utf8');
  } catch (err) {
    logError('write_report', err);
  }

  if (issues.length > 0) {
    process.stdout.write(`⚠️  健康檢查：${issues.length} 項異常（過肥/孤兒/過時/重複/斷鏈/未註冊/複驗逾期/週期/時限待辦漏帶/P0.6歸檔洩漏）\n`);
    process.stdout.write(`   → 詳情見 .fhs/.health-report.json，跑 /fhs-slim 看清理方案\n`);
  }

  process.exit(0);
}

try {
  main();
} catch (err) {
  logError('main_uncaught', err);
  process.exit(0);
}
