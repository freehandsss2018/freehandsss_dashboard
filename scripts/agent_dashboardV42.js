#!/usr/bin/env node
/**
 * agent_dashboardV42.js — FHS AI 助理團隊名冊生成器
 *
 * 用法：node scripts/agent_dashboardV42.js
 * 輸出：artifacts/agent_dashboardV42.html（人睇）+ artifacts/agent_dashboardV42.json（AI 讀）
 *
 * 原則（制度本體見 .fhs/notes/ai-team-registry.md）：
 *   - 名冊係「生成物」，嚴禁手改輸出 HTML——真源係各資產自身嘅 frontmatter/檔頭
 *   - 掃唔到嘅非檔案資產（MCP/召喚詞/內建 agent）唯一登記點：.fhs/ai/team-manifest.json
 *   - n8n workflows 由 API live 實掃（.env N8N_INSTANCE+N8N_KEY），manifest 只補描述
 *   - 生成同時做健康檢查（bridge 孤兒/缺描述/MANIFEST 漂移），輸出「勘誤表」
 *   - 服務狀態＝生成時快照，非實時；n8n 離線時狀態顯示「未知」，生成不失敗
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.fhs', 'ai', 'team-manifest.json');
const OUT_HTML = path.join(ROOT, 'artifacts', 'agent_dashboardV42.html');
const OUT_JSON = path.join(ROOT, 'artifacts', 'agent_dashboardV42.json');

const M = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const warnings = [];

// ---------- helpers ----------
function readIf(p) {
  // 剝 BOM——governance/02 §7 教訓：Windows 工具寫入嘅檔案帶 BOM 會令行首錨點解析失效
  try { let t = fs.readFileSync(p, 'utf8'); if (t.charCodeAt(0) === 0xFEFF) t = t.slice(1); return t; } catch (e) { return null; }
}
function listIf(p) {
  try { return fs.readdirSync(p); } catch (e) { return []; }
}
function resolveRoot(rel) {
  // manifest 路徑可以係絕對（C:/...）或 repo 相對
  if (/^[A-Za-z]:[\\/]/.test(rel) || rel.startsWith('/')) return path.normalize(rel);
  return path.join(ROOT, rel);
}
function stripMd(s) {
  return String(s || '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .trim();
}
function clamp(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function parseFrontmatter(text) {
  const out = {};
  if (!text || !text.startsWith('---')) return out;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return out;
  const block = text.slice(3, end);
  for (const raw of block.split(/\r?\n/)) {
    // CRLF 檔嘅 block 末行會殘留 \r（indexOf('\n---') 切喺 \n 前）——唔剝就會令最後一個 key 靜默消失
    const line = raw.replace(/\r+$/, '');
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

// ---------- git 出生日期（成長史真源之一） ----------
function gitBirthMap() {
  const map = new Map();
  try {
    const raw = execSync('git log --diff-filter=A --name-only --format=@%as', {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    });
    let date = null;
    for (const line of raw.split(/\r?\n/)) {
      if (line.startsWith('@')) { date = line.slice(1).trim(); continue; }
      const f = line.trim();
      if (f && date) map.set(f.replace(/\\/g, '/'), date); // log 由新到舊，越後覆寫＝越早＝出生日
    }
  } catch (e) {
    warnings.push('git 出生日期查詢失敗（' + e.message.split('\n')[0] + '）——timeline 只用 manifest 日期');
  }
  return map;
}
const births = gitBirthMap();
function birthOf(absPath) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');
  if (!rel.startsWith('..')) return births.get(rel) || null;
  try { // repo 外檔案（如 user-level agents）退而求其次用檔案建立時間
    const bt = fs.statSync(absPath).birthtime;
    return bt && bt.getFullYear() > 2000 ? bt.toISOString().slice(0, 10) : null;
  } catch (e) { return null; }
}

// ---------- 1. Subagents（frontmatter 真源 + MANIFEST.md 交叉核對） ----------
function parseSubagentManifest() {
  const text = readIf(resolveRoot(M.scan_roots.subagent_manifest));
  const installed = new Map(); // agent -> {version}
  const firstDate = new Map(); // agent -> earliest date
  if (!text) return { installed, firstDate };
  for (const line of text.split(/\r?\n/)) {
    const cells = line.split('|').map(c => c.trim());
    if (cells.length >= 6 && cells[1] && !/^-+$/.test(cells[2]) && cells[1] !== 'agent') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(cells[3])) { // 版本歷史表：| agent | version | date | changes |
        const prev = firstDate.get(cells[1]);
        if (!prev || cells[3] < prev) firstDate.set(cells[1], cells[3]);
      } else if (cells[4] && /active|retired/.test(cells[4])) { // 已安裝表
        installed.set(cells[1], { version: cells[2].replace(/^v/, '') });
      }
    }
  }
  return { installed, firstDate };
}

function collectSubagents() {
  const dir = resolveRoot(M.scan_roots.subagents);
  const { installed, firstDate } = parseSubagentManifest();
  const items = [];
  for (const f of listIf(dir).filter(f => f.endsWith('.md'))) {
    const abs = path.join(dir, f);
    const fm = parseFrontmatter(readIf(abs) || '');
    const name = fm.name || f.replace(/\.md$/, '');
    if (!fm.description) warnings.push('subagent「' + name + '」frontmatter 缺 description');
    const reg = installed.get(name);
    const fmVer = (fm.version || '').replace(/^v/, '');
    if (!reg) {
      warnings.push('subagent「' + name + '」未登記於 .fhs/ai/subagents/MANIFEST.md 已安裝表（雙寫規則漂移）');
    } else if (fmVer && reg.version && fmVer !== reg.version) {
      warnings.push('subagent「' + name + '」版本漂移：frontmatter v' + fmVer + ' ≠ MANIFEST v' + reg.version);
    }
    items.push({
      name,
      desc: clamp(stripMd(fm.description), 200),
      model: fm.model || '繼承主對話',
      version: fm.version || '',
      tools: fm.tools ? fm.tools.split(',').length : 0,
      updated: fm.last_updated || '',
      birth: firstDate.get(name) || birthOf(abs),
      home: '~/.claude/agents/freehandsss/' + f,
      source: 'scan',
    });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- 2. 斜線指令（master 檔頭真源 + bridge 孤兒偵測） ----------
function collectCommands() {
  const masterDir = resolveRoot(M.scan_roots.commands_master);
  const bridgeDir = resolveRoot(M.scan_roots.commands_bridge);
  const masters = listIf(masterDir).filter(f => f.endsWith('.md') && f.toLowerCase() !== 'readme.md');
  const bridges = new Set(listIf(bridgeDir).filter(f => f.endsWith('.md')));
  const items = [];
  for (const f of masters) {
    const abs = path.join(masterDir, f);
    const text = readIf(abs) || '';
    const lines = text.split(/\r?\n/);
    const titleLine = lines.find(l => /^#\s/.test(l)) || '';
    const tm = titleLine.match(/^#\s+(\/?\S+)\s*[—–-]?\s*(.*)$/) || [];
    const use = (text.match(/\*\*用途\*\*[:：]\s*(.+)/) || [])[1];
    const trig = (text.match(/\*\*觸發(?:指令|詞)?\*\*[:：]\s*(.+)/) || [])[1];
    const ver = (text.match(/\*\*版本\*\*[:：]\s*(v?[\d.]+)/) || [])[1];
    let fallback = '';
    for (const l of lines.slice(lines.indexOf(titleLine) + 1)) {
      const t = l.trim();
      if (t && !t.startsWith('>') && !t.startsWith('|') && !t.startsWith('#') && !t.startsWith('---')) { fallback = t; break; }
    }
    const name = '/' + f.replace(/\.md$/, '');
    if (!bridges.has(f)) warnings.push('指令 ' + name + ' 有 master 冇 bridge（.claude/commands/ 缺檔，斜線觸發會失效）');
    items.push({
      name,
      title: clamp(stripMd(tm[2] || ''), 60),
      desc: clamp(stripMd(use || fallback), 170),
      trigger: clamp(stripMd(trig || ''), 60),
      version: ver || '',
      birth: birthOf(abs),
      home: '.fhs/ai/commands/' + f,
      source: 'scan',
    });
  }
  const masterSet = new Set(masters);
  for (const b of bridges) {
    if (!masterSet.has(b)) warnings.push('bridge .claude/commands/' + b + ' 冇對應 master（孤兒 bridge）');
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- 3. Skills（SKILL.md frontmatter 真源，分三組） ----------
function collectSkills() {
  const dir = resolveRoot(M.scan_roots.skills);
  const cats = M.skill_categories || {};
  const items = [];
  for (const d of listIf(dir)) {
    const abs = path.join(dir, d, 'SKILL.md');
    const text = readIf(abs);
    if (!text) continue;
    const fm = parseFrontmatter(text);
    const name = fm.name || d;
    if (!fm.description) warnings.push('skill「' + name + '」SKILL.md 缺 description');
    let group = cats._default || 'design_pack';
    for (const key of Object.keys(cats)) {
      if (Array.isArray(cats[key]) && cats[key].includes(name)) { group = key; break; }
    }
    items.push({
      name,
      desc: clamp(stripMd(fm.description), 170),
      group,
      birth: birthOf(abs),
      home: '.claude/skills/' + d + '/',
      source: 'scan',
    });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- 4. Hooks（settings.json 接線真源 + manifest 描述 + 佈防狀態） ----------
function hookSyntaxOk(abs) {
  if (!abs.endsWith('.js')) return true; // .sh 唔喺呢度驗（bash 未必在場）
  try { execSync('node --check "' + abs + '"', { stdio: 'ignore' }); return true; } catch (e) { return false; }
}

function collectHooks() {
  const text = readIf(resolveRoot(M.scan_roots.settings));
  const wired = new Map(); // file -> [events]
  if (text) {
    try {
      const hooks = (JSON.parse(text).hooks) || {};
      for (const ev of Object.keys(hooks)) {
        for (const rule of hooks[ev] || []) {
          for (const h of rule.hooks || []) {
            const m = String(h.command || '').match(/hooks[\\/]([\w.-]+\.(?:js|sh))/);
            if (m) {
              if (!wired.has(m[1])) wired.set(m[1], []);
              wired.get(m[1]).push(ev);
            }
          }
        }
      }
    } catch (e) { warnings.push('settings.json 解析失敗：' + e.message.split('\n')[0]); }
  }
  const descs = M.hook_descriptions || {};
  const files = new Set([...Object.keys(descs), ...wired.keys()]);
  const items = [];
  for (const f of files) {
    const abs = path.join(ROOT, 'scripts', 'hooks', f);
    if (!fs.existsSync(abs)) { warnings.push('hook 檔 scripts/hooks/' + f + ' 唔存在但仍被引用'); continue; }
    if (!descs[f]) warnings.push('hook ' + f + ' 未有 team-manifest.json 描述');
    const syntaxOk = hookSyntaxOk(abs);
    if (!syntaxOk) warnings.push('hook ' + f + ' node --check 語法失敗（守護鏈斷咗）');
    items.push({
      name: f,
      desc: clamp(stripMd(descs[f] || ''), 170),
      events: wired.get(f) || [],
      syntaxOk,
      birth: birthOf(abs),
      home: 'scripts/hooks/' + f,
      source: 'scan',
    });
  }
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- 5. MCP（.mcp.json 真源 交叉 manifest 描述） ----------
function collectMcp() {
  const items = (M.mcp_connectors || []).map(c => Object.assign({ source: 'manifest' }, c));
  const text = readIf(resolveRoot(M.scan_roots.mcp_project));
  if (text) {
    try {
      const live = Object.keys(JSON.parse(text).mcpServers || {});
      for (const name of live) {
        if (!items.some(i => i.name === name)) {
          warnings.push('.mcp.json 有「' + name + '」但 team-manifest.json 未登記描述');
          items.push({ name, desc: '（.mcp.json 偵測到，未有描述——請補 manifest）', source: '.mcp.json' });
        }
      }
      for (const i of items) {
        if (i.source === '.mcp.json' && !live.includes(i.name)) {
          warnings.push('manifest 聲稱「' + i.name + '」在 .mcp.json，實際已唔存在');
        }
      }
    } catch (e) { warnings.push('.mcp.json 解析失敗：' + e.message.split('\n')[0]); }
  }
  return items;
}

// ---------- 5b. 服務狀態 live 探測（n8n API + 守護旗標；生成時快照，非實時） ----------
function loadEnv() {
  const out = {};
  const text = readIf(path.join(ROOT, '.env')) || '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\r+$/, '');
    const m = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function probeN8n() {
  const env = loadEnv();
  const base = (env.N8N_INSTANCE || '').replace(/\/+$/, '');
  const key = env.N8N_KEY || env.N8N_API_KEY || '';
  const res = { reachable: false, workflows: [], execs: { total: 0, success: 0, error: 0 }, lastByWf: new Map(), note: '' };
  if (!base || !key) { res.note = '.env 冇 N8N_INSTANCE／N8N_KEY——跳過 n8n live 探測'; return res; }
  const curlJson = (url) => JSON.parse(execSync(
    'curl -sk -m 8 -H "X-N8N-API-KEY: ' + key + '" "' + url + '"',
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
  ));
  try {
    const wf = curlJson(base + '/api/v1/workflows?limit=100');
    res.workflows = (wf.data || []).map(w => ({ id: w.id, name: w.name, active: !!w.active }));
    res.reachable = true;
  } catch (e) {
    res.note = 'n8n API 未能連線——離線生成，n8n 狀態未知';
    return res;
  }
  try {
    const ex = curlJson(base + '/api/v1/executions?limit=50&includeData=false');
    for (const e2 of (ex.data || [])) {
      const st = e2.status || (e2.finished ? 'success' : (e2.stoppedAt ? 'error' : 'running'));
      res.execs.total++;
      if (st === 'success') res.execs.success++;
      else if (st === 'error' || st === 'crashed' || st === 'failed') res.execs.error++;
      if (!res.lastByWf.has(e2.workflowId)) res.lastByWf.set(e2.workflowId, st); // API 由新到舊，首見＝最近一次
    }
  } catch (e) { res.note = '執行紀錄查詢失敗（workflows 正常）'; }
  return res;
}
const n8nProbe = probeN8n();

function guardStatus() {
  const issues = [];
  let healthIssues = 0; let healthList = [];
  const hr = readIf(resolveRoot(M.scan_roots.health_report));
  if (hr) {
    try { const j = JSON.parse(hr); healthIssues = j.issue_count || 0; healthList = j.issues || []; } catch (e) {}
  }
  if (healthIssues) issues.push('fhs-health 偵測 ' + healthIssues + ' 項：' + healthList.join('；'));
  if (fs.existsSync(resolveRoot(M.scan_roots.kgov_flag))) issues.push('.kgov-pending 旗標存在（財務治理待覆核）');
  return { issues, healthIssues, healthList };
}
const guardInfo = guardStatus();

// ---------- 6. 組裝 ----------
const _now = new Date();
const _pad = n => String(n).padStart(2, '0');
const data = {
  generated: _now.getFullYear() + '-' + _pad(_now.getMonth() + 1) + '-' + _pad(_now.getDate()) +
    ' ' + _pad(_now.getHours()) + ':' + _pad(_now.getMinutes()), // 本地時間——toISOString 係 UTC 會差成日
  manifest_updated: M.updated,
  subagents: collectSubagents(),
  builtins: (M.builtin_agents || []).map(a => Object.assign({ source: 'manifest' }, a)),
  commands: collectCommands(),
  skills: collectSkills(),
  hooks: collectHooks(),
  automations: (M.automations || []).map(a => Object.assign({ source: 'manifest' }, a)),
  mcp: collectMcp(),
  triggers: M.trigger_words || [],
  warnings,
};

// timeline：所有有出生日期嘅資產按月分桶（連續月份，空月補零）
function buildTimeline() {
  const all = [...data.subagents, ...data.commands, ...data.skills, ...data.hooks];
  const buckets = new Map();
  for (const it of all) {
    if (it.birth) {
      const mth = it.birth.slice(0, 7);
      buckets.set(mth, (buckets.get(mth) || 0) + 1);
    }
  }
  const keys = [...buckets.keys()].sort();
  if (!keys.length) return [];
  const out = [];
  let cur = keys[0];
  const last = keys[keys.length - 1];
  while (cur <= last) {
    out.push({ month: cur, count: buckets.get(cur) || 0 });
    const [y, m] = cur.split('-').map(Number);
    cur = m === 12 ? (y + 1) + '-01' : y + '-' + String(m + 1).padStart(2, '0');
  }
  return out;
}
data.timeline = buildTimeline();

// ---------- 7. HTML 渲染（白底卡片牆風格，參考 raymond0917 技能樹＋服務狀態 dashboard；2026-07-14 Fat Mo 指定） ----------

const GROUPS = [
  { key: 'summon',      label: '召喚詞',            tag: '召喚詞',  cls: 'summon' },
  { key: 'agent',       label: '派工隊 Subagents',  tag: '派工隊',  cls: 'agent' },
  { key: 'builtin',     label: 'Harness 內建 Agents', tag: '內建',  cls: 'builtin' },
  { key: 'cmd',         label: '斜線指令',          tag: '指令',    cls: 'cmd' },
  { key: 'fhs_core',    label: 'FHS 自研技能',      tag: 'FHS 技能', cls: 'fhs' },
  { key: 'grilling',    label: '拷問系列',          tag: '拷問',    cls: 'grill' },
  { key: 'design_pack', label: '設計技能包',        tag: '視覺設計', cls: 'design' },
  { key: 'hook',        label: 'Hooks',             tag: 'Hook',   cls: 'hook',  zone: true },
  { key: 'auto',        label: '自動化',            tag: '自動化',  cls: 'auto',  zone: true },
  { key: 'mcp',         label: 'MCP 連接器',        tag: 'MCP',    cls: 'mcp' },
];
const GROUP_BY_KEY = Object.fromEntries(GROUPS.map(g => [g.key, g]));

// 每卡 emoji：具名優先，冇就用類別 fallback（純顯示層，唔入 JSON 真源）
const EMOJI = {
  // subagents
  'blender-3d-modeler': '🗿', 'build-error-resolver': '🔧', 'code-reviewer': '🕵️',
  'database-reviewer': '🗄️', 'finance-auditor': '💰', 'frontend-developer': '🧱',
  'product-integration-validator': '🧩', 'tdd-guide': '🧪', 'ui-designer': '🎨',
  // builtins
  'Explore': '🧭', 'Plan': '🗺️', 'general-purpose': '🛠️', 'claude': '✳️', 'claude-code-guide': '📚',
  // commands
  '/3d-print': '🖨️', '/8d': '🧠', '/ag-flow': '🔗', '/ag-plan': '📐', '/ag-stitch-sync': '🧵',
  '/ag-ui-import': '🖼️', '/canva-auto': '🎬', '/cl-flow': '🌊', '/cl-flow-fast': '⚡',
  '/commit': '📦', '/db-query': '🗃️', '/error-eye': '👁️', '/execute': '🚀', '/fhs-audit': '🧾',
  '/fhs-check': '🩺', '/fhs-cost-audit': '💹', '/fhs-slim': '🧹', '/guardian': '🛡️',
  '/new-product': '🆕', '/px': '🔎', '/read': '📖', '/rg': '🧲', '/rp': '✍️', '/team': '📇',
  '/upload-web': '☁️', '/usage-audit': '📊',
  // skills（FHS 自研＋拷問）
  'finance-gatekeeper': '🏦', 'fhs-bug-triage': '🐛', 'fhs-p-product-display': '🗿',
  'fhs-overview-badge-layout': '🏷️', 'px': '🔎',
  'grilling': '🔥', 'grill-me': '♨️', 'grill-with-docs': '📝', 'domain-modeling': '🧬',
  // 設計技能包
  'adapt': '📱', 'animate': '🎞️', 'arrange': '📐', 'audit': '🧾', 'bolder': '💥',
  'clarify': '💬', 'colorize': '🌈', 'critique': '🧐', 'delight': '✨', 'distill': '⚗️',
  'extract': '🧰', 'frontend-design': '🖌️', 'harden': '🧱', 'normalize': '📏',
  'onboard': '🚪', 'optimize': '⚡', 'overdrive': '🏎️', 'polish': '💎', 'quieter': '🤫',
  'teach-impeccable': '🎓', 'typeset': '🔤',
  // hooks
  'session-start-sop.sh': '🌅', 'prompt-router.js': '🧭', 'pre-tool-guard.js': '🚧',
  'post-tool-kgov.js': '🏛️', 'stop-kgov.js': '🛑', 'fhs-health-check.js': '🩺',
  // 自動化
  'FHS_Core_OrderProcessor': '⚙️', 'FHS_IGWatchdog_DriveWatch': '🐕', '3brain（規劃管道）': '🧠',
  // MCP
  'supabase': '🐘', 'n8n-mcp-server': '🔩', 'blender': '🧊', 'Canva': '🎨',
  'airtable-user-mcp': '📋', 'Notion': '🗒️', 'Google Calendar / Drive': '📅',
  'claude-in-chrome / Claude Browser': '🌐', 'computer-use': '🖱️', 'figma': '🧷',
};
const EMOJI_FALLBACK = {
  summon: '🗣️', agent: '🤖', builtin: '🧰', cmd: '⚡', fhs_core: '🎯',
  grilling: '🔥', design_pack: '🎨', hook: '🪝', auto: '🔁', mcp: '🔌',
};
const SVC_EMOJI = {
  '業務流水線（n8n）': '⚙️', '財務（n8n）': '💰', '查詢／讀取（n8n）': '🔎',
  '系統維運／監控（n8n）': '🛠️', '其他／實驗（n8n）': '🧪', '規劃管道': '🧠',
};
function emojiFor(name, cat) { return EMOJI[name] || EMOJI_FALLBACK[cat] || '✨'; }

// 服務狀態詞彙：run 運行 / warn 異常 / stop 停止 / idle 待命 / unknown 未知
const ST_LABEL = { run: '運行', warn: '異常', stop: '停止', idle: '待命', unknown: '未知' };

function n8nCategory(name) {
  for (const rule of (M.n8n_categories || [])) {
    try { if (new RegExp(rule.pattern, 'i').test(name)) return rule.label; } catch (e) {}
  }
  return M.n8n_default_category || '其他／實驗（n8n）';
}

// 統一成員模型（顯示層）
const members = [];
for (const t of data.triggers) members.push({ cat: 'summon', name: t.phrase, desc: t.effect, sub: '→ ' + t.target, version: '', source: 'manifest', home: '.fhs/ai/team-manifest.json' });
for (const a of data.subagents) members.push({ cat: 'agent', name: a.name, desc: a.desc, sub: 'model ' + a.model + (a.tools ? ' · ' + a.tools + ' 工具' : '') + (a.birth ? ' · 入伍 ' + a.birth : ''), version: a.version, source: a.source, home: a.home });
for (const b of data.builtins) members.push({ cat: 'builtin', name: b.name, desc: b.desc, sub: '', version: '', source: b.source, home: 'harness 內建' });
for (const c of data.commands) members.push({ cat: 'cmd', name: c.name, desc: c.desc, sub: c.trigger ? '召喚：' + c.trigger : '', version: c.version, source: c.source, home: c.home });
for (const s of data.skills) members.push({ cat: s.group, name: s.name, desc: s.desc, sub: s.birth ? '入伍 ' + s.birth : '', version: '', source: s.source, home: s.home });

// hooks → 服務狀態 zone（佈防＝settings.json 接線；語法斷＝異常）
const hookCats = M.hook_categories || {};
for (const h of data.hooks) {
  let status = 'idle';
  if (!h.syntaxOk) status = 'warn';
  else if (h.events.length) status = 'run';
  let sub = h.events.length ? h.events.join(' + ') : '內嵌呼叫';
  if (h.name === 'fhs-health-check.js' && guardInfo.healthIssues > 0) {
    status = 'warn';
    sub += ' · 偵測到 ' + guardInfo.healthIssues + ' 項（跑 /fhs-slim）';
  }
  members.push({ cat: 'hook', name: h.name, desc: h.desc, sub, version: '', source: h.source, home: h.home, status, svc: hookCats[h.name] || '治理守護' });
}

// n8n workflows → live 實掃成員（manifest 只補描述）；離線時退回 manifest 條目
const autoByN8nId = new Map((data.automations || []).filter(a => a.n8n_id).map(a => [a.n8n_id, a]));
if (n8nProbe.reachable) {
  for (const w of n8nProbe.workflows) {
    const meta = autoByN8nId.get(w.id);
    const lastExec = n8nProbe.lastByWf.get(w.id);
    let status = w.active ? 'run' : 'stop';
    if (w.active && (lastExec === 'error' || lastExec === 'crashed' || lastExec === 'failed')) status = 'warn';
    const svc = (meta && meta.svc_cat) || n8nCategory(w.name);
    members.push({
      cat: 'auto', name: w.name,
      desc: meta ? meta.desc : 'n8n workflow（未有描述——長期成員請補 team-manifest.json automations）',
      sub: 'n8n id ' + w.id + (lastExec ? ' · 最近執行 ' + lastExec : ''),
      version: '', source: meta ? 'manifest' : 'scan', home: 'NAS n8n',
      status, svc, emoji: EMOJI[w.name] || SVC_EMOJI[svc] || '⚙️',
    });
  }
} else {
  for (const a of (data.automations || []).filter(a => a.n8n_id)) {
    members.push({ cat: 'auto', name: a.name, desc: a.desc, sub: (a.kind || '') + ' · 狀態未知（n8n 離線）', version: '', source: 'manifest', home: a.home || '', status: 'unknown', svc: a.svc_cat || n8nCategory(a.name) });
  }
}
// 非 n8n 自動化（待命腳本）
for (const a of (data.automations || []).filter(a => !a.n8n_id)) {
  const scriptAbs = a.home && !a.home.startsWith('NAS') ? resolveRoot(a.home) : null;
  const ok = scriptAbs ? fs.existsSync(scriptAbs) : true;
  if (!ok) warnings.push('自動化「' + a.name + '」腳本 ' + a.home + ' 唔存在');
  members.push({ cat: 'auto', name: a.name, desc: a.desc, sub: a.kind || '', version: '', source: 'manifest', home: a.home || '', status: ok ? 'idle' : 'warn', svc: a.svc_cat || '規劃管道' });
}

for (const c of data.mcp) members.push({ cat: 'mcp', name: c.name, desc: c.desc, sub: '來源：' + c.source, version: '', source: c.source, home: '' });

// 服務統計
const svcMembers = members.filter(m => m.cat === 'hook' || m.cat === 'auto');
const svcCounts = { run: 0, warn: 0, stop: 0, idle: 0, unknown: 0 };
for (const m of svcMembers) svcCounts[m.status] = (svcCounts[m.status] || 0) + 1;

data.services = {
  probed_at: data.generated,
  n8n_reachable: n8nProbe.reachable,
  note: n8nProbe.note,
  counts: svcCounts,
  executions: n8nProbe.execs,
  guard_issues: guardInfo.issues,
};
data.stats = {
  subagents: data.subagents.length,
  builtins: data.builtins.length,
  commands: data.commands.length,
  skills: data.skills.length,
  hooks: data.hooks.length,
  automations: svcMembers.length - data.hooks.length,
  mcp: data.mcp.length,
  triggers: data.triggers.length,
  total: members.length - data.triggers.length, // 召喚詞係入口唔係成員，總數唔重複計
};

function renderCard(m) {
  const g = GROUP_BY_KEY[m.cat] || GROUPS[0];
  const search = m.name + ' ' + m.desc + ' ' + (m.sub || '') + ' ' + g.tag + ' ' + (m.svc || '') + ' ' + (m.status ? ST_LABEL[m.status] : '');
  return '<article class="card' + (m.status === 'warn' ? ' warncard' : '') + '" data-cat="' + esc(m.cat) + '" data-search="' + esc(search) + '"' +
    (m.home ? ' title="' + esc(m.home) + '"' : '') + '>' +
    '<div class="chead"><span class="emo">' + (m.emoji || emojiFor(m.name, m.cat)) + '</span><h3>' + esc(m.name) + '</h3></div>' +
    '<div class="cmeta"><span class="tag tg-' + g.cls + '">' + esc(g.tag) + '</span>' +
    (m.status ? '<span class="st s-' + m.status + '">● ' + ST_LABEL[m.status] + '</span>' : '') +
    (m.version ? '<span class="ver">' + esc(m.version) + '</span>' : '') +
    (m.source === 'manifest' ? '<span class="ver src" title="team-manifest.json 人工登記；其餘皆實掃">手記</span>' : '') +
    '</div>' +
    '<p>' + esc(m.desc) + '</p>' +
    (m.sub ? '<div class="csub">' + esc(m.sub) + '</div>' : '') +
    '</article>';
}

function renderGroups() {
  return GROUPS.filter(g => !g.zone).map(g => {
    const items = members.filter(m => m.cat === g.key);
    if (!items.length) return '';
    return '<section class="grp" id="grp-' + g.key + '" data-grp="' + g.key + '">' +
      '<div class="gh">' + esc(g.label) + '<span class="gn">' + items.length + '</span></div>' +
      '<div class="grid">' + items.map(renderCard).join('') + '</div></section>';
  }).join('\n');
}

// 服務狀態 zone：第二排指標 tiles + 分類 collapsible 狀態燈
function svcDots(counts) {
  const bits = [];
  if (counts.run) bits.push('<span class="dot d-run">● ' + counts.run + ' 運行</span>');
  if (counts.warn) bits.push('<span class="dot d-warn">● ' + counts.warn + ' 異常</span>');
  if (counts.stop) bits.push('<span class="dot d-stop">● ' + counts.stop + ' 停止</span>');
  if (counts.idle) bits.push('<span class="dot d-idle">● ' + counts.idle + ' 待命</span>');
  if (counts.unknown) bits.push('<span class="dot d-idle">● ' + counts.unknown + ' 未知</span>');
  return bits.join('');
}

function renderServiceZone() {
  const catOrder = [];
  for (const f of Object.values(M.hook_categories || {})) if (!catOrder.includes(f)) catOrder.push(f);
  for (const r of (M.n8n_categories || [])) if (!catOrder.includes(r.label)) catOrder.push(r.label);
  const defCat = M.n8n_default_category || '其他／實驗（n8n）';
  if (!catOrder.includes(defCat)) catOrder.push(defCat);
  for (const m of svcMembers) if (m.svc && !catOrder.includes(m.svc)) catOrder.push(m.svc);

  const guardN = guardInfo.issues.length;
  const tiles =
    '<div class="stats">' +
    '<div class="stat"><div class="lb">⚡ 自動化總數</div><div class="nu teal">' + svcMembers.length + '</div></div>' +
    '<div class="stat"><div class="lb">🖥️ 常駐服務</div><div class="nu">' + svcCounts.run + '</div></div>' +
    '<div class="stat"' + (guardN ? ' title="' + esc(guardInfo.issues.join('；')) + '"' : '') + '><div class="lb">🛡️ 守護狀態</div><div class="nu ' + (guardN ? 'orange' : 'ok') + '">' + (guardN ? guardN + ' 項' : 'OK') + '</div></div>' +
    '<div class="stat"><div class="lb">🧾 執行紀錄</div><div class="nu">' + n8nProbe.execs.total + '</div>' +
    (n8nProbe.execs.total ? '<div class="ssub">最近 ' + n8nProbe.execs.total + ' 次：成功 ' + n8nProbe.execs.success + ' · 失敗 ' + n8nProbe.execs.error + '</div>' : '<div class="ssub">' + (n8nProbe.reachable ? '未有紀錄' : 'n8n 離線') + '</div>') +
    '</div></div>';

  const catsHtml = catOrder.map(cat => {
    const items = svcMembers.filter(m => m.svc === cat);
    if (!items.length) return '';
    const c = { run: 0, warn: 0, stop: 0, idle: 0, unknown: 0 };
    for (const m of items) c[m.status]++;
    const open = c.warn > 0 || c.run > 0 ? ' open' : '';
    return '<details class="grp svcgrp"' + open + ' data-grp="svc">' +
      '<summary class="gh">' + esc(cat) + '<span class="gn">' + items.length + '</span><span class="ghdots">' + svcDots(c) + '</span></summary>' +
      '<div class="grid">' + items.map(renderCard).join('') + '</div></details>';
  }).join('\n');

  return '<section class="grp" id="svczone" data-grp="svczone"><div class="gh" style="font-size:15px;">〽️ 服務狀態' +
    '<span class="ghdots">' + svcDots(svcCounts) + '</span>' +
    '<span class="ghnote">' + esc(n8nProbe.note || ('生成時檢測（' + data.generated + '）＝快照，非實時')) + '</span></div>' +
    tiles + catsHtml + '</section>';
}

// 左側功能欄：上半＝頁內導航（自動生成），下半＝外部工具入口（manifest sidebar_links 登記，含 V42 生產 Dashboard）
function renderSidebar() {
  const nav = [
    ['#top', '📇', '總覽'],
    ['#grp-summon', '🗣️', '召喚詞速查'],
    ['#grp-agent', '🤖', '派工隊 Subagents'],
    ['#grp-cmd', '⚡', '斜線指令'],
    ['#grp-fhs_core', '🎯', '技能'],
    ['#svczone', '〽️', '服務狀態'],
    ['#grp-mcp', '🔌', 'MCP 連接器'],
  ];
  if (warnings.length) nav.push(['#errata', '⚠️', '勘誤表']);
  const links = M.sidebar_links || [];
  return '<aside class="side">' +
    nav.map((n, i) => '<a class="sicon snav' + (i === 0 ? ' on' : '') + '" href="' + n[0] + '" title="' + esc(n[2]) + '">' + n[1] + '</a>').join('') +
    (links.length ? '<div class="sdiv"></div>' +
      links.map(l => '<a class="sicon" href="' + esc(l.url) + '" target="_blank" rel="noopener" title="' + esc(l.label) + '（新視窗）">' + l.icon + '</a>').join('') : '') +
    '</aside>';
}

function renderTimeline(tl) {
  if (!tl.length) return '';
  const max = Math.max(...tl.map(t => t.count), 1);
  return '<div class="panel tlpanel"><div class="ph">📈 成長史<small>每月入伍成員數（git 首次提交／安裝紀錄）</small></div><div class="tl">' +
    tl.map(t =>
      '<div class="tl-col"><span class="n">' + (t.count || '') + '</span>' +
      '<div class="bar" style="height:' + Math.round(4 + (t.count / max) * 64) + 'px"></div>' +
      '<span class="m">' + esc(t.month.replace('-', '.')) + '</span></div>').join('') +
    '</div></div>';
}

const groupCount = GROUPS.filter(g => !g.zone && members.some(m => m.cat === g.key)).length + 1; // +1 = 服務狀態 zone

const clientJS =
  "var q=document.getElementById('q');var active='all';" +
  "var FMAP={all:null,summon:['summon'],team:['agent','builtin'],cmd:['cmd'],skill:['fhs_core','grilling','design_pack'],auto:['hook','auto'],mcp:['mcp']};" +
  "function apply(){var v=(q.value||'').trim().toLowerCase();var allow=FMAP[active];" +
  "var cards=document.querySelectorAll('.card');var shown=0;" +
  "for(var i=0;i<cards.length;i++){var c=cards[i];" +
  "var okCat=!allow||allow.indexOf(c.getAttribute('data-cat'))>-1;" +
  "var okTxt=!v||c.getAttribute('data-search').toLowerCase().indexOf(v)>-1;" +
  "var ok=okCat&&okTxt;c.style.display=ok?'':'none';if(ok)shown++;}" +
  "var grps=document.querySelectorAll('.grp');" +
  "for(var j=0;j<grps.length;j++){var vis=grps[j].querySelectorAll('.card');if(!vis.length)continue;var any=false;" +
  "for(var k=0;k<vis.length;k++){if(vis[k].style.display!=='none'){any=true;break;}}" +
  "grps[j].style.display=any?'':'none';if(any&&v&&grps[j].tagName==='DETAILS'){grps[j].open=true;}}" +
  "document.getElementById('hits').textContent=(v||allow)?('顯示 '+shown+' 個成員'):'';}" +
  "if(q){q.addEventListener('input',apply);}" +
  "var chips=document.querySelectorAll('.fchip');" +
  "for(var c2=0;c2<chips.length;c2++){chips[c2].addEventListener('click',function(){" +
  "active=this.getAttribute('data-f');" +
  "for(var z=0;z<chips.length;z++){chips[z].className=chips[z]===this?'fchip on':'fchip';}apply();});}" +
  "var rb=document.getElementById('regen');if(rb){rb.addEventListener('click',function(){" +
  "var cmd='node scripts/agent_dashboardV42.js';" +
  "function done(){rb.textContent='已複製指令 ✓';setTimeout(function(){rb.textContent='⟳ 重新生成';},1600);}" +
  "if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(cmd).then(done,done);}else{done();}});}" +
  "var sn=document.querySelectorAll('.snav');" +
  "for(var s2=0;s2<sn.length;s2++){sn[s2].addEventListener('click',function(){" +
  "for(var y=0;y<sn.length;y++){sn[y].className=sn[y]===this?'sicon snav on':'sicon snav';}" +
  "var t=document.querySelector(this.getAttribute('href'));" +
  "if(t){t.scrollIntoView({behavior:'smooth',block:'start'});}});}";

const errataN = warnings.length;

const html = '<!DOCTYPE html>\n<html lang="zh-Hant">\n<head>\n<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>FHS AI 助理團隊名冊</title>\n' +
'<style>\n' +
':root{--bg:#f7f6f2;--card:#ffffff;--ink:#1c1a17;--soft:#6b675f;--faint:#a09a8e;--line:#e9e5dc;' +
'--tile:#f4f0e6;--teal:#0e8074;--orange:#e07b26;--red:#c0392b;--green:#2e8b57;--shadow:0 6px 20px rgba(40,32,16,.07);}\n' +
'*{margin:0;padding:0;box-sizing:border-box;}\n' +
'html{scroll-behavior:smooth;}\n' +
'body{background:var(--bg);color:var(--ink);font-family:-apple-system,"Segoe UI","Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;line-height:1.6;}\n' +
'.wrap{max-width:1240px;margin:0 auto;padding:clamp(14px,3vw,36px);}\n' +
'/* 頁頭 */\n' +
'.top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:20px;}\n' +
'.top .ttl{display:flex;align-items:center;gap:12px;}\n' +
'.top .ico{width:44px;height:44px;border-radius:12px;background:var(--tile);display:flex;align-items:center;justify-content:center;font-size:22px;}\n' +
'.top h1{font-size:24px;font-weight:800;letter-spacing:.01em;}\n' +
'.top .subt{color:var(--faint);font-size:12.5px;margin-top:2px;}\n' +
'#regen{border:1px solid var(--line);background:var(--card);color:var(--soft);font-size:13px;padding:8px 14px;border-radius:10px;cursor:pointer;font-family:inherit;transition:all .15s ease-out;white-space:nowrap;}\n' +
'#regen:hover{box-shadow:var(--shadow);color:var(--ink);}\n' +
'/* 統計 tiles */\n' +
'.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:16px;}\n' +
'.stat{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 18px;}\n' +
'.stat .lb{display:flex;align-items:center;gap:7px;color:var(--soft);font-size:12.5px;}\n' +
'.stat .nu{font-size:26px;font-weight:800;margin-top:4px;letter-spacing:.01em;}\n' +
'.stat .nu.teal{color:var(--teal);}\n.stat .nu.orange{color:var(--orange);}\n.stat .nu.ok{color:var(--green);}\n' +
'.stat .ssub{color:var(--faint);font-size:11px;margin-top:2px;}\n' +
'/* 搜尋＋filter chips */\n' +
'.searchrow{background:var(--card);border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;gap:10px;padding:0 16px;margin-bottom:12px;}\n' +
'.searchrow .mg{color:var(--faint);font-size:15px;}\n' +
'#q{flex:1;border:0;background:transparent;padding:13px 0;font-size:14.5px;color:var(--ink);outline:none;font-family:inherit;}\n' +
'#hits{font-size:12px;color:var(--faint);white-space:nowrap;}\n' +
'.fbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}\n' +
'.fchip{border:1px solid var(--line);background:var(--card);color:var(--soft);font-size:12.5px;padding:5px 13px;border-radius:20px;cursor:pointer;font-family:inherit;transition:all .12s ease-out;}\n' +
'.fchip:hover{color:var(--ink);}\n' +
'.fchip.on{background:var(--ink);border-color:var(--ink);color:#fff;}\n' +
'/* 勘誤 alert */\n' +
'.errata{background:#fdf3e4;border:1px solid #f0d9b0;border-radius:12px;padding:13px 18px;margin:12px 0 4px;}\n' +
'.errata b{color:#9a6a1c;font-size:13.5px;}\n' +
'.errata li{color:#9a6a1c;font-size:12.5px;margin:3px 0 3px 20px;}\n' +
'/* panel（timeline） */\n' +
'.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px 20px;margin-top:14px;}\n' +
'.ph{font-size:14px;font-weight:700;display:flex;align-items:baseline;gap:10px;margin-bottom:8px;}\n' +
'.ph small{color:var(--faint);font-weight:400;font-size:11.5px;}\n' +
'.tl{display:flex;align-items:flex-end;gap:clamp(10px,2.4vw,28px);padding-top:6px;overflow-x:auto;}\n' +
'.tl-col{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:44px;}\n' +
'.tl-col .bar{width:26px;background:linear-gradient(180deg,#f2b36b,var(--orange));border-radius:5px 5px 2px 2px;}\n' +
'.tl-col .n{font-size:12.5px;font-weight:700;color:var(--orange);}\n' +
'.tl-col .m{font-size:10.5px;color:var(--faint);}\n' +
'/* 分組＋卡片牆 */\n' +
'.grp{margin-top:26px;}\n' +
'.gh{font-size:13.5px;font-weight:700;color:var(--soft);letter-spacing:.05em;margin-bottom:10px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}\n' +
'.gh .gn{background:var(--tile);color:var(--soft);font-size:11px;font-weight:600;border-radius:10px;padding:1px 8px;}\n' +
'.ghdots{display:flex;gap:10px;margin-left:auto;}\n' +
'.ghnote{flex-basis:100%;color:var(--faint);font-size:11px;font-weight:400;}\n' +
'.dot{font-size:11.5px;font-weight:600;}\n' +
'.d-run{color:var(--green);}\n.d-warn{color:var(--orange);}\n.d-stop{color:var(--red);}\n.d-idle{color:var(--faint);}\n' +
'/* 服務狀態 collapsible 分類列 */\n' +
'details.svcgrp{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:11px 16px;margin-top:10px;}\n' +
'details.svcgrp summary{cursor:pointer;list-style:none;margin-bottom:0;}\n' +
'details.svcgrp summary::-webkit-details-marker{display:none;}\n' +
'details.svcgrp summary::before{content:"▸";color:var(--faint);margin-right:6px;transition:transform .12s ease-out;display:inline-block;}\n' +
'details.svcgrp[open] summary::before{transform:rotate(90deg);}\n' +
'details.svcgrp[open] summary{margin-bottom:12px;}\n' +
'details.svcgrp .grid{padding-bottom:4px;}\n' +
'.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(226px,1fr));gap:14px;}\n' +
'.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:15px 16px 13px;transition:transform .15s ease-out,box-shadow .15s ease-out;}\n' +
'.card:hover{transform:translateY(-2px);box-shadow:var(--shadow);}\n' +
'.card.warncard{background:#fdf0ec;border-color:#f0cdbc;}\n' +
'.chead{display:flex;align-items:center;gap:10px;margin-bottom:8px;}\n' +
'.emo{width:38px;height:38px;flex:none;border-radius:10px;background:var(--tile);display:flex;align-items:center;justify-content:center;font-size:19px;}\n' +
'.card h3{font-size:14.5px;font-weight:750;line-height:1.3;word-break:break-word;}\n' +
'.cmeta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:7px;}\n' +
'.tag{font-size:10.5px;font-weight:600;padding:2px 9px;border-radius:6px;letter-spacing:.03em;}\n' +
'.tg-summon{background:#fdecec;color:#c0392b;}\n.tg-agent{background:#e8f0fe;color:#2b5db9;}\n' +
'.tg-builtin{background:#eceff1;color:#546e7a;}\n.tg-cmd{background:#e6f4ea;color:#2e7d46;}\n' +
'.tg-fhs{background:#fdf3d7;color:#96741d;}\n.tg-grill{background:#f3e8fd;color:#7d3cbe;}\n' +
'.tg-design{background:#fde8f2;color:#c2367e;}\n.tg-hook{background:#e0f2f1;color:#00796b;}\n' +
'.tg-auto{background:#fff0e0;color:#d76b1f;}\n.tg-mcp{background:#e8eaf6;color:#4a54b0;}\n' +
'.st{font-size:10.5px;font-weight:700;}\n' +
'.s-run{color:var(--green);}\n.s-warn{color:var(--orange);}\n.s-stop{color:var(--red);}\n.s-idle{color:var(--faint);}\n.s-unknown{color:var(--faint);}\n' +
'.ver{font-size:11px;color:var(--faint);font-family:Consolas,Menlo,monospace;}\n' +
'.ver.src{border:1px solid var(--line);border-radius:5px;padding:0 5px;font-family:inherit;}\n' +
'.card p{font-size:12.5px;color:var(--soft);line-height:1.55;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}\n' +
'.csub{font-size:11px;color:var(--faint);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}\n' +
'/* 左側功能欄 */\n' +
'.side{position:fixed;left:14px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:3px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:8px 6px;box-shadow:var(--shadow);z-index:50;}\n' +
'.sicon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:17px;text-decoration:none;transition:background .12s ease-out;}\n' +
'.sicon:hover{background:var(--tile);}\n' +
'.sicon.on{background:#dcefec;box-shadow:inset 0 0 0 2px var(--teal);}\n' +
'.sdiv{height:1px;background:var(--line);margin:6px 5px;}\n' +
'@media(max-width:1120px){.side{display:none;}}\n' +
'@media(min-width:1121px){.wrap{padding-left:92px;}}\n' +
'/* footer */\n' +
'footer.end{margin-top:40px;border-top:1px solid var(--line);padding-top:16px;color:var(--faint);font-size:12px;line-height:1.9;}\n' +
'footer.end code{color:var(--soft);background:var(--tile);border-radius:5px;padding:1px 6px;font-size:11px;}\n' +
'@media(max-width:640px){.top{flex-direction:column;}.stats{grid-template-columns:repeat(2,1fr);}.ghdots{margin-left:0;flex-basis:100%;}}\n' +
'@media print{.searchrow,.fbar,#regen{display:none;}body{background:#fff;}.card{break-inside:avoid;}}\n' +
'</style>\n</head>\n<body>\n' + renderSidebar() + '\n<div class="wrap" id="top">\n' +

'<div class="top">\n' +
'<div class="ttl"><div class="ico">📇</div><div><h1>AI 助理團隊名冊</h1>' +
'<div class="subt">Freehandsss 能力盤點 · 生成於 ' + esc(data.generated) + ' · 手改必被覆蓋，真源＝frontmatter＋n8n API＋team-manifest.json</div></div></div>\n' +
'<button id="regen" title="複製重新生成指令">⟳ 重新生成</button>\n' +
'</div>\n' +

'<div class="stats">\n' +
'<div class="stat"><div class="lb">👥 成員總數</div><div class="nu teal">' + data.stats.total + '</div></div>\n' +
'<div class="stat"><div class="lb">🗂️ 成員分類</div><div class="nu">' + groupCount + '</div></div>\n' +
'<div class="stat"><div class="lb">🗣️ 召喚詞</div><div class="nu">' + data.stats.triggers + '</div></div>\n' +
'<div class="stat"><div class="lb">🧾 勘誤</div><div class="nu ' + (errataN ? 'orange' : 'ok') + '">' + errataN + '</div></div>\n' +
'</div>\n' +

'<div class="searchrow"><span class="mg">🔍</span><input id="q" type="search" placeholder="搜尋成員、召喚詞或功能…" autocomplete="off"><span id="hits"></span></div>\n' +

'<div class="fbar">' +
'<button class="fchip on" data-f="all">全部</button>' +
'<button class="fchip" data-f="summon">召喚詞</button>' +
'<button class="fchip" data-f="team">派工隊</button>' +
'<button class="fchip" data-f="cmd">指令</button>' +
'<button class="fchip" data-f="skill">技能</button>' +
'<button class="fchip" data-f="auto">自動化</button>' +
'<button class="fchip" data-f="mcp">MCP</button>' +
'</div>\n' +

(errataN ? '<div class="errata" id="errata"><b>⚠️ 勘誤表 ' + errataN + ' 項</b>（漂移／孤兒——同 session 修或落待辦）<ul>' +
  warnings.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul></div>\n' : '') +

renderTimeline(data.timeline) + '\n' +

renderGroups() + '\n' +

renderServiceZone() + '\n' +

'<footer class="end">\n' +
'<div>本名冊由 <code>node scripts/agent_dashboardV42.js</code> 生成（召喚詞：<code>/team</code>／「團隊名冊」）。新增檔案型資產寫齊 frontmatter 會自動出現；n8n workflow 由 API 自動發現（長期成員請喺 manifest 補描述）；MCP／召喚詞請登記 <code>.fhs/ai/team-manifest.json</code>（更新於 ' + esc(data.manifest_updated) + '）。</div>\n' +
'<div>制度規範：<code>.fhs/notes/ai-team-registry.md</code>　·　機讀版：<code>artifacts/agent_dashboardV42.json</code>　·　服務狀態＝生成時快照非實時　·　卡片 hover 可見所在路徑；「手記」＝manifest 人工登記。</div>\n' +
'</footer>\n' +
'</div>\n<script>' + clientJS + '</script>\n</body>\n</html>\n';

// ---------- 8. 落盤 + console 報告 ----------
fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
fs.writeFileSync(OUT_HTML, html, 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify(data, (k, v) => v instanceof Map ? undefined : v, 2), 'utf8');

console.log('✅ FHS AI 助理團隊名冊生成完成');
console.log('   成員總數: ' + data.stats.total +
  '（subagents ' + data.stats.subagents + ' + 內建 ' + data.stats.builtins +
  ' | 指令 ' + data.stats.commands + ' | 技能 ' + data.stats.skills +
  ' | hooks ' + data.stats.hooks + ' + 自動化 ' + data.stats.automations +
  ' | MCP ' + data.stats.mcp + '）');
console.log('   服務狀態: 運行 ' + svcCounts.run + ' · 異常 ' + svcCounts.warn + ' · 停止 ' + svcCounts.stop +
  ' · 待命 ' + svcCounts.idle + (svcCounts.unknown ? ' · 未知 ' + svcCounts.unknown : '') +
  (n8nProbe.reachable ? '（n8n live 實掃 ' + n8nProbe.workflows.length + ' 條）' : '（n8n 離線）'));
console.log('   守護狀態: ' + (guardInfo.issues.length ? guardInfo.issues.length + ' 項 — ' + guardInfo.issues.join('；') : 'OK'));
console.log('   執行紀錄: 最近 ' + n8nProbe.execs.total + ' 次（成功 ' + n8nProbe.execs.success + ' · 失敗 ' + n8nProbe.execs.error + '）');
console.log('   HTML: ' + path.relative(ROOT, OUT_HTML));
console.log('   JSON: ' + path.relative(ROOT, OUT_JSON));
if (warnings.length) {
  console.log('⚠️  勘誤表 ' + warnings.length + ' 項:');
  for (const w of warnings) console.log('   - ' + w);
} else {
  console.log('✨ 零勘誤');
}
