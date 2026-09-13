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
// 2026-09-13（flow 2026-09-13-0857 #4）：<details> 展開後 summary 截斷文字同 <p> 全文同時顯示嘅重複 bug 統一修法
// summary 文字包一層 span，開啟時用 CSS 隱藏；IG/Canva/3D 三個學習記錄 zone 共用（原本各自重複同一段錯 pattern）
function cnoteBlock(escapedText, clampLen) {
  if (!escapedText) return '';
  return '<details class="cnote"><summary><span class="cnote-sum-text">' + clamp(escapedText, clampLen || 90) + '</span></summary><p>' + escapedText + '</p></details>';
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

// ---------- IG 看門狗學習記錄 zone：Supabase ig_thread_rules 即時查詢（同 probeN8n() 同一手法，
// 生成時 curl live DB，非本機 JSON 快照——資料源同 Canva/3D 學習記錄唔同，但顯示格式沿用同一套） ----------
const SB_URL = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SB_ANON = 'sb_publishable_ZDI9VLtyhgTBfyUWA65Unw_s-Zc1HwK'; // publishable key，V42.html 本身已公開內嵌，同一把

function probeIgWatchdog() {
  const res = { reachable: false, rules: [], alertStats: { pending: 0, resolved: 0, byKind: {} }, note: '' };
  const curlJson = (path) => JSON.parse(execSync(
    'curl -sk -m 8 -H "apikey: ' + SB_ANON + '" -H "Authorization: Bearer ' + SB_ANON + '" "' + SB_URL + path + '"',
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] }
  ));
  try {
    res.rules = curlJson('/rest/v1/ig_thread_rules?select=id,rule_type,from_kind,to_kind,note,active,created_at,applied_count,last_applied_at&order=created_at.desc&limit=200');
    res.reachable = true;
  } catch (e) {
    res.note = 'Supabase ig_thread_rules 查詢失敗——離線生成，學習記錄未知';
    return res;
  }
  try {
    const alerts = curlJson('/rest/v1/ig_watchdog_alerts?select=kind,resolved&limit=1000');
    for (const a of alerts) {
      if (a.resolved) res.alertStats.resolved++; else res.alertStats.pending++;
      res.alertStats.byKind[a.kind] = (res.alertStats.byKind[a.kind] || 0) + 1;
    }
  } catch (e) { res.note = '警報統計查詢失敗（規則清單正常）'; }
  return res;
}
const igwProbe = probeIgWatchdog();

function renderIgWatchRuleCard(r) {
  const typeLabel = r.rule_type === 'false_alarm' ? '假警報' : '分類修正';
  const detail = r.rule_type === 'kind_correction'
    ? esc(r.from_kind || '') + ' → ' + esc(r.to_kind || '')
    : ('全部抑制' + (r.from_kind ? '（限 ' + esc(r.from_kind) + '）' : ''));
  const dateStr = r.created_at ? String(r.created_at).slice(0, 10) : '—';
  const appliedStr = r.applied_count > 0 ? '生效 ' + r.applied_count + ' 次' : '未生效過';
  const note = cnoteBlock(esc(r.note), 60);
  return '<article class="ccard' + (r.active ? '' : ' ccard-pending') + '" data-rule-id="' + esc(r.id) + '">' +
    '<div class="chead"><span class="emo">' + (r.active ? '🟢' : '⏸️') + '</span>' +
    '<h3>' + typeLabel + '<span class="cord">' + dateStr + '</span></h3></div>' +
    '<div class="cmeta"><span class="tag ' + (r.active ? 'tg-cmd' : 'tg-summon') + '" data-role="status">' + (r.active ? '生效中' : '已停用') + '</span>' +
    '<span class="ver">' + appliedStr + '</span></div>' +
    '<p>' + detail + '</p>' + note +
    '<button class="igwtoggle" data-id="' + esc(r.id) + '" data-active="' + (r.active ? 'true' : 'false') + '">' + (r.active ? '停用' : '重啟') + '</button>' +
    '</article>';
}

function renderIgWatchLearningZone() {
  if (!igwProbe.reachable) return '';
  const activeN = igwProbe.rules.filter(r => r.active).length;
  const inactiveN = igwProbe.rules.length - activeN;
  const as = igwProbe.alertStats;
  const tiles =
    '<div class="stats">' +
    '<div class="stat"><div class="lb">🐕 規則總數</div><div class="nu teal">' + igwProbe.rules.length + '</div></div>' +
    '<div class="stat"><div class="lb">🟢 生效中</div><div class="nu ok">' + activeN + '</div></div>' +
    '<div class="stat"><div class="lb">⏸️ 已停用</div><div class="nu">' + inactiveN + '</div></div>' +
    '<div class="stat"><div class="lb">📋 待處理警報</div><div class="nu ' + (as.pending ? 'orange' : 'ok') + '">' + as.pending + '</div>' +
    '<div class="ssub">已處理 ' + as.resolved + '</div></div>' +
    '</div>';
  const rulesHtml = igwProbe.rules.length
    ? '<div class="grid ccgrid">' + igwProbe.rules.map(renderIgWatchRuleCard).join('') + '</div>'
    : '<div class="ssub" style="padding:8px 0;">暫時未有學習規則（Fat Mo 喺 V42 Dashboard IG 看門狗 thread 檢視標記假警報／分類判錯時會自動生成）</div>';
  return '<section class="grp" id="igwzone" data-grp="igwzone">' +
    '<div class="gh" style="font-size:15px;">🐕 IG看門狗學習記錄<span class="gn">' + igwProbe.rules.length + '</span>' +
    '<span class="ghnote">Supabase ig_thread_rules 即時查詢（非本機JSON快照）· 停用掣直call fhs_toggle_ig_thread_rule，唔使重新生成</span></div>' +
    tiles + rulesHtml +
    '</section>';
}

// ---------- Canva 學習記錄 zone：canva_auto/placement_memory.json diff-learning 案例庫 ----------
// Schema v2（flow 2026-09-13-0857，Verdict cl-final-plan.md）：款式分組置頂／逐 Page 列點／規則編號表跨單連繫
const { validateCanvaMemory } = require('./canva_memory_validate');

function loadCanvaLearning() {
  const p = path.join(ROOT, 'canva_auto', 'placement_memory.json');
  const raw = readIf(p);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { warnings.push('canva_auto/placement_memory.json 解析失敗：' + e.message); return null; }
}
const canvaData = loadCanvaLearning();
if (canvaData) {
  const { errors: cvErrors, infos: cvInfos } = validateCanvaMemory(canvaData);
  cvErrors.forEach(e => warnings.push('[Canva學習記錄] ' + e));
  cvInfos.forEach(i => warnings.push('[Canva學習記錄] ' + i));
}

const CV_TYPE_EMOJI = { ai_error: '🔴', fatmo_technique: '🟡', tool_bug: '🐞', manual_only: '✋', material: '📦' };
const CV_TYPE_LABEL = { ai_error: 'AI錯', fatmo_technique: 'Fat Mo手法', tool_bug: '工具bug', manual_only: '人手限制', material: '素材' };
const CV_FLOW_STAGE_ORDER = ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'tool'];
const CV_FLOW_STAGE_LABEL = { stage1: 'Stage① 開殼', stage2: 'Stage② 人手', stage3: 'Stage③ 換料', stage4: 'Stage④ 學習出貨', stage5: 'Stage⑤ 存檔頁', tool: '工具限制' };
const CV_CATEGORY_ORDER = ['純音樂', '全幅AI短片'];
const CV_KNOWN_CASE_KEYS = new Set(['order', 'customer', 'design_id', 'date', 'learned', 'family', 'note', 'text_notes',
  'slots', 'non_geometry_findings', 'category', 'page_count', 'parent_order', 'first_pass_total', 'first_pass_corrected', 'lessons']);

function cvPageKey(page) {
  if (page === 'flow') return 'flow';
  if (Array.isArray(page)) return 'p' + page.slice().sort((a, b) => a - b).join('_');
  return 'p' + page;
}
function cvPageLabel(page) {
  if (page === 'flow') return '流程';
  if (Array.isArray(page)) return 'Page ' + page.slice().sort((a, b) => a - b).join('＋');
  return 'Page ' + page;
}
function cvPageSortKey(page) {
  if (page === 'flow') return 999;
  const arr = Array.isArray(page) ? page : [page];
  return Math.min.apply(null, arr);
}

// 規則使用統計（rule id -> 引用單號集合），用嚟計 chip 顯示嘅「n單」同規則表嘅來源連結
function cvBuildRuleStats(cases) {
  const stats = {};
  for (const c of cases) {
    for (const l of (c.lessons || [])) {
      if (!l.rule) continue;
      if (!stats[l.rule]) stats[l.rule] = new Set();
      stats[l.rule].add(c.order);
    }
  }
  return stats;
}

function cvLessonLi(l, ruleStats, rulesById) {
  const emo = CV_TYPE_EMOJI[l.type] || '•';
  let chip = '';
  if (l.rule && rulesById[l.rule]) {
    const n = ruleStats[l.rule] ? ruleStats[l.rule].size : 0;
    const promoted = rulesById[l.rule].promoted_to;
    const statusTxt = promoted ? '✅已升格' : (n >= 3 ? '💡達門檻' : n + '單');
    chip = ' <a class="cv-rulechip" href="#rule-' + esc(l.rule) + '" data-cv-type="' + esc(l.type || '') + '">' + esc(l.rule) + ' · ' + statusTxt + '</a>';
  }
  return '<li class="cv-lesson" data-cv-type="' + esc(l.type || '') + '"><span class="cv-emo">' + emo + '</span> ' + esc(l.text) + chip + '</li>';
}

function cvGroupLessons(lessons) {
  const groups = {};
  for (const l of lessons) {
    const key = cvPageKey(l.page);
    if (!groups[key]) groups[key] = { page: l.page, items: [] };
    groups[key].items.push(l);
  }
  return Object.values(groups).sort((a, b) => cvPageSortKey(a.page) - cvPageSortKey(b.page));
}

function cvRenderFlowGroup(items, ruleStats, rulesById) {
  // flow 分組內部再按 stage 排序、加子標題
  const byStage = {};
  for (const l of items) {
    const st = l.flow_stage || 'tool';
    if (!byStage[st]) byStage[st] = [];
    byStage[st].push(l);
  }
  return CV_FLOW_STAGE_ORDER.filter(st => byStage[st]).map(st =>
    '<div class="cv-substage">' + esc(CV_FLOW_STAGE_LABEL[st] || st) + '</div><ul class="cv-lessons">' +
    byStage[st].map(l => cvLessonLi(l, ruleStats, rulesById)).join('') + '</ul>'
  ).join('');
}

function cvOrigNote(c, convergenceLog) {
  // 原文（舊欄位）：note/text_notes、slots[].note、non_geometry_findings、convergence_log、
  // 未知額外欄位（technique_lesson* 等 v1 遺留豐富欄位）—— 全部保留，零資訊損失
  const parts = [];
  if (c.note) parts.push('【note】' + c.note);
  if (Array.isArray(c.text_notes)) parts.push('【text_notes】' + c.text_notes.join(' ／ '));
  if (Array.isArray(c.slots)) {
    for (const s of c.slots) {
      if (s.note) parts.push('【' + (s.slot || 'slot') + '】' + s.note);
    }
  }
  if (Array.isArray(c.non_geometry_findings)) {
    c.non_geometry_findings.forEach((f, i) => parts.push('【ngf#' + i + '】' + f));
  }
  const logEntries = convergenceLog.filter(l => l.order === c.order);
  for (const l of logEntries) {
    if (l.note) parts.push('【convergence_log ' + (l.date || '') + '】' + l.note);
    if (Array.isArray(l.entries)) l.entries.forEach(e => parts.push('【convergence_log ' + (l.date || '') + '】' + e));
  }
  for (const k of Object.keys(c)) {
    if (CV_KNOWN_CASE_KEYS.has(k)) continue;
    const v = c[k];
    parts.push('【' + k + '】' + (typeof v === 'string' ? v : JSON.stringify(v, null, 1)));
  }
  return parts.map(stripMd).join('\n\n');
}

function renderCanvaCase(c, ctx) {
  const learned = c.learned === true;
  const orderById = ctx.orderById;
  // 舊格式安全網：冇 lessons[] 就退回顯示 note 全文（理論上 schema v2 下不應出現，防未來手誤寫入漏欄位）
  if (!Array.isArray(c.lessons)) {
    const noteSrc = c.note || (Array.isArray(c.text_notes) ? c.text_notes.join(' ／ ') : '');
    const note = esc(stripMd(noteSrc));
    return '<article class="ccard ccard-pending cv-case" id="case-' + esc(c.order) + '">' +
      '<div class="chead"><span class="emo">⚠️</span><h3>' + esc(c.customer || '未具名') + '<span class="cord">#' + esc(c.order || '') + '</span></h3></div>' +
      '<div class="cmeta"><span class="tag tg-summon">舊格式（未回填 lessons）</span></div>' +
      cnoteBlock(note, 90) + '</article>';
  }
  const groups = cvGroupLessons(c.lessons);
  const bodyHtml = groups.map(g => {
    if (g.page === 'flow') {
      return '<div class="cv-pagegrp" data-cv-grp="flow">' + cvRenderFlowGroup(g.items, ctx.ruleStats, ctx.rulesById) + '</div>';
    }
    return '<div class="cv-pagegrp" data-cv-grp="' + cvPageKey(g.page) + '"><div class="cv-pagehead">' + esc(cvPageLabel(g.page)) + '</div>' +
      '<ul class="cv-lessons">' + g.items.map(l => cvLessonLi(l, ctx.ruleStats, ctx.rulesById)).join('') + '</ul></div>';
  }).join('');
  // 收納摘要（2026-09-13，Fat Mo 截圖回饋）：卡片預設收埋，先睇 Page 分佈 chip + 一句最高優先學習重點；
  // 撳開先見逐 Page 完整列點——避免一開頁就成版全展開嘅資訊過載
  const chipsHtml = groups.map(g => {
    const label = g.page === 'flow' ? '流程' : cvPageLabel(g.page);
    return '<span class="cv-chip">' + esc(label) + ' ' + g.items.length + '</span>';
  }).join('');
  const TYPE_PRIORITY = ['ai_error', 'tool_bug', 'fatmo_technique', 'manual_only', 'material'];
  let headlineLesson = null;
  for (const t of TYPE_PRIORITY) { headlineLesson = c.lessons.find(l => l.type === t); if (headlineLesson) break; }
  if (!headlineLesson) headlineLesson = c.lessons[0];
  const headlineHtml = headlineLesson
    ? '<div class="cv-headline"><span class="cv-emo">' + (CV_TYPE_EMOJI[headlineLesson.type] || '•') + '</span> ' + esc(clamp(headlineLesson.text, 60)) + '</div>'
    : '';

  const canvaLink = c.design_id ? ' <a class="cv-canvalink" href="https://www.canva.com/design/' + esc(c.design_id) + '/edit" target="_blank" rel="noopener">↗Canva</a>' : '';
  // 母片連結：parent_order 必須精確等於本庫另一個 case.order 先自動連結；
  // 唔存在（跨案例編號巧合、或母片本身唔喺庫內）就淨顯示文字，唔會誤連錯單（見 orderById 精確 lookup，唔做模糊配對）
  let parentHtml = '';
  if (c.parent_order) {
    const target = orderById[c.parent_order];
    parentHtml = target
      ? ' <a class="cv-parentlink" href="#case-' + esc(c.parent_order) + '">母片 ← #' + esc(c.parent_order) + ' ' + esc(target.customer || '') + '</a>'
      : ' <span class="cv-parenttxt" title="母片非本庫獨立案例">母片：' + esc(c.parent_order) + '</span>';
  }
  const accBadge = (typeof c.first_pass_total === 'number' && c.first_pass_total > 0)
    ? '<span class="ver" title="AI 首次交付準確率">首次準 ' + (c.first_pass_total - (c.first_pass_corrected || 0)) + '/' + c.first_pass_total + ' 格</span>'
    : '';
  const orig = cvOrigNote(c, ctx.convergenceLog);

  return '<article class="ccard cv-case" id="case-' + esc(c.order) + '">' +
    '<div class="chead"><span class="emo">' + (learned ? '✅' : '⏳') + '</span>' +
    '<h3>' + esc(c.customer || '未具名') + '<span class="cord">#' + esc(c.order || '') + '</span></h3>' + canvaLink + '</div>' +
    '<div class="cmeta"><span class="tag ' + (learned ? 'tg-cmd' : 'tg-summon') + '">' + (learned ? '已學習' : '待覆核') + '</span>' +
    (c.date ? '<span class="ver">' + esc(c.date) + '</span>' : '') +
    (c.page_count ? '<span class="ver">' + c.page_count + ' 頁</span>' : '') +
    accBadge + parentHtml +
    '</div>' +
    '<details class="cv-body"><summary><div class="cv-chips">' + chipsHtml + '</div>' + headlineHtml + '</summary>' +
    bodyHtml +
    cnoteBlock(esc(orig), 40) +
    '</details>' +
    '</article>';
}

function cvRenderRuleRow(r, ruleStats) {
  const orders = ruleStats[r.id] ? [...ruleStats[r.id]] : [];
  const n = orders.length;
  const statusHtml = r.promoted_to
    ? '<span class="tag tg-cmd">✅已升格 → ' + esc(r.promoted_to) + '</span>'
    : (n >= 3 ? '<span class="tag tg-summon">💡達門檻未升格（' + n + '單）</span>' : '<span class="ver">' + n + '/3</span>');
  const orderChips = orders.map(o => '<a class="cv-caselink" href="#case-' + esc(o) + '">#' + esc(o) + '</a>').join(' ');
  return '<div class="cv-rulerow" id="rule-' + esc(r.id) + '" data-cv-type="' + esc(r.type) + '">' +
    '<span class="cv-emo">' + (CV_TYPE_EMOJI[r.type] || '•') + '</span> ' +
    '<b>' + esc(r.id) + '</b>　' + esc(r.text) +
    '<div class="cmeta" style="margin-top:4px;">' +
    '<span class="ver">' + esc(cvPageLabel(r.page)) + '</span>' +
    '<span class="ver">' + esc(r.applies_to || 'all') + '</span>' +
    statusHtml +
    (orderChips ? '<span class="ver">來源：' + orderChips + '</span>' : '') +
    '</div></div>';
}

function renderCanvaRulesTable(rules, ruleStats) {
  if (!rules.length) return '';
  const groups = {};
  for (const r of rules) {
    const key = cvPageKey(r.page);
    if (!groups[key]) groups[key] = { page: r.page, items: [] };
    groups[key].items.push(r);
  }
  const sorted = Object.values(groups).sort((a, b) => cvPageSortKey(a.page) - cvPageSortKey(b.page));
  const promotedN = rules.filter(r => r.promoted_to).length;
  return '<div class="cv-rulestable" id="cv-rules">' +
    '<div class="gh" style="font-size:14px;">📚 規則編號表<span class="gn">' + rules.length + '</span>' +
    '<span class="ghnote">已升格 ' + promotedN + ' ／ 待收斂 ' + (rules.length - promotedN) + '</span></div>' +
    sorted.map(g => '<div class="cv-pagehead">' + esc(cvPageLabel(g.page)) + '</div>' +
      g.items.map(r => cvRenderRuleRow(r, ruleStats)).join('')
    ).join('') +
    '</div>';
}

function renderCanvaLearningZone() {
  if (!canvaData) return '';
  const allCases = Array.isArray(canvaData.cases) ? canvaData.cases.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')) : [];
  const rules = Array.isArray(canvaData.rules) ? canvaData.rules : [];
  const rulesById = {};
  rules.forEach(r => { rulesById[r.id] = r; });
  const orderById = {};
  allCases.forEach(c => { orderById[c.order] = c; });
  const ruleStats = cvBuildRuleStats(allCases);
  const convergenceLog = Array.isArray(canvaData.convergence_log) ? canvaData.convergence_log : [];
  const ctx = { ruleStats, rulesById, orderById, convergenceLog };

  const learnedN = allCases.filter(c => c.learned === true).length;
  const pendingN = allCases.length - learnedN;
  const promotedN = rules.filter(r => r.promoted_to).length;
  const thresholdN = rules.filter(r => !r.promoted_to && ruleStats[r.id] && ruleStats[r.id].size >= 3).length;

  const tiles =
    '<div class="stats">' +
    '<div class="stat"><div class="lb">🎨 案例總數</div><div class="nu teal">' + allCases.length + '</div></div>' +
    '<div class="stat"><div class="lb">✅ 已學習</div><div class="nu ok">' + learnedN + '</div></div>' +
    '<div class="stat"><div class="lb">⏳ 待覆核</div><div class="nu ' + (pendingN ? 'orange' : 'ok') + '">' + pendingN + '</div></div>' +
    '<div class="stat"><div class="lb">📚 規則數</div><div class="nu teal">' + rules.length + '</div></div>' +
    '<div class="stat"><div class="lb">✅ 已升格</div><div class="nu ok">' + promotedN + '</div></div>' +
    (thresholdN ? '<div class="stat"><div class="lb">💡 達門檻未升格</div><div class="nu orange">' + thresholdN + '</div></div>' : '') +
    '</div>';

  // 款式分組（Q5：純音樂 → 全幅AI短片 上下並列；未分類舊格式殿後）
  const byCategory = {};
  for (const c of allCases) {
    const cat = CV_CATEGORY_ORDER.includes(c.category) ? c.category : '未分類（舊格式）';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(c);
  }
  const catOrder = CV_CATEGORY_ORDER.filter(cat => byCategory[cat]).concat(Object.keys(byCategory).filter(k => !CV_CATEGORY_ORDER.includes(k)));

  const jumpChips = catOrder.map(cat => '<a class="cv-jumpchip" href="#cv-cat-' + esc(cat) + '">' + (cat === '純音樂' ? '🎵' : cat === '全幅AI短片' ? '🎬' : '📁') + ' ' + esc(cat) + ' ' + byCategory[cat].length + '</a>')
    .concat(rules.length ? ['<a class="cv-jumpchip" href="#cv-rules">📚 規則編號表 ' + rules.length + '</a>'] : [])
    .join('');

  const typeFilterChips = '<span class="cv-filterlabel">篩選：</span>' +
    '<button type="button" class="cvtypechip on" data-cv-filter="all">全部</button>' +
    Object.keys(CV_TYPE_EMOJI).map(t => '<button type="button" class="cvtypechip" data-cv-filter="' + t + '">' + CV_TYPE_EMOJI[t] + esc(CV_TYPE_LABEL[t]) + '</button>').join('');

  const categorySections = catOrder.map(cat => {
    const cases = byCategory[cat];
    let totalFP = 0, totalCorr = 0;
    cases.forEach(c => { if (typeof c.first_pass_total === 'number') { totalFP += c.first_pass_total; totalCorr += (c.first_pass_corrected || 0); } });
    const accTxt = totalFP > 0 ? '（AI 首次準確率 ' + Math.round((totalFP - totalCorr) / totalFP * 100) + '%）' : '';
    return '<div class="cv-catsection" id="cv-cat-' + esc(cat) + '">' +
      '<div class="cv-cathead">' + (cat === '純音樂' ? '🎵' : cat === '全幅AI短片' ? '🎬' : '📁') + ' ' + esc(cat) + '　' + cases.length + ' 單' + accTxt + '</div>' +
      '<div class="grid ccgrid">' + cases.map(c => renderCanvaCase(c, ctx)).join('') + '</div>' +
      '</div>';
  }).join('');

  return '<section class="grp" id="canvazone" data-grp="canvazone">' +
    '<div class="gh" style="font-size:15px;">🎨 Canva 學習記錄<span class="gn">' + allCases.length + '</span>' +
    '<span class="ghnote">canva_auto/placement_memory.json · diff-learning 案例庫，同 3D pipeline 樣本庫同一原理</span></div>' +
    tiles +
    '<div class="cv-jumprow">' + jumpChips + '</div>' +
    '<div class="cv-filterrow">' + typeFilterChips + '</div>' +
    categorySections +
    renderCanvaRulesTable(rules, ruleStats) +
    '</section>';
}

// ---------- 3D 打印 學習記錄 zone：3d/param_memory.json diff-learning 案例庫 ----------
function load3dLearning() {
  const p = path.join(ROOT, '3d', 'param_memory.json');
  const raw = readIf(p);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (e) { warnings.push('3d/param_memory.json 解析失敗：' + e.message); return null; }
}
const threeDData = load3dLearning();

function render3dCase(c) {
  const learned = c.learned === true;
  const note = esc(stripMd(c.note || ''));
  const paramDiff = (c.params_ai && c.params_final) ?
    Object.keys(c.params_final).map(k => {
      const a = c.params_ai[k], f = c.params_final[k];
      return '<li><b>' + esc(k) + '</b>：' + esc(a) + ' → ' + esc(f) + (a === f ? '（一次過準）' : '（已修正）') + '</li>';
    }).join('') : '';
  return '<article class="ccard' + (learned ? '' : ' ccard-pending') + '">' +
    '<div class="chead"><span class="emo">' + (learned ? '✅' : '⏳') + '</span>' +
    '<h3>' + esc(c.order || '未具名') + (c.part ? '<span class="cord">' + esc(c.part) + '</span>' : '') + '</h3></div>' +
    '<div class="cmeta"><span class="tag ' + (learned ? 'tg-cmd' : 'tg-summon') + '">' + (learned ? '已學習' : '待覆核') + '</span>' +
    (c.date ? '<span class="ver">' + esc(c.date) + '</span>' : '') + '</div>' +
    (paramDiff ? '<ul class="cparams">' + paramDiff + '</ul>' : '') +
    cnoteBlock(note, 90) +
    '</article>';
}

function render3dLearningZone() {
  if (!threeDData) return '';
  const cases = Array.isArray(threeDData.cases) ? threeDData.cases.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')) : [];
  const learnedN = cases.filter(c => c.learned === true).length;
  const pendingN = cases.length - learnedN;
  const frozen = threeDData.rules_frozen || {};
  const frozenKeys = Object.keys(frozen).filter(k => k !== 'note');
  const tiles =
    '<div class="stats">' +
    '<div class="stat"><div class="lb">🖨️ 案例總數</div><div class="nu teal">' + cases.length + '</div></div>' +
    '<div class="stat"><div class="lb">✅ 已學習</div><div class="nu ok">' + learnedN + '</div></div>' +
    '<div class="stat"><div class="lb">⏳ 待覆核</div><div class="nu ' + (pendingN ? 'orange' : 'ok') + '">' + pendingN + '</div></div>' +
    '<div class="stat"><div class="lb">🔒 鐵律條目</div><div class="nu">' + frozenKeys.length + '</div></div>' +
    '</div>';
  const frozenHtml = frozenKeys.length ? '<div class="clog"><b>🔒 Fat Mo 拍板鐵律（禁學習覆寫）</b><ul>' +
    frozenKeys.map(k => '<li><b>' + esc(k) + '</b>：' + esc(String(frozen[k])) + '</li>').join('') +
    '</ul></div>' : '';
  const log = Array.isArray(threeDData.convergence_log) ? threeDData.convergence_log.slice().reverse() : [];
  const logHtml = log.length ? '<div class="clog"><b>收斂追蹤</b><ul>' +
    log.map(l => '<li>' + esc(l.date || '') + ' · #' + esc(l.order || '') + '　' + esc(l.corrected_params) + '/' + esc(l.total_params) + ' 參數被修正——' + esc(stripMd(l.note || '')) + '</li>').join('') +
    '</ul></div>' : '';
  return '<section class="grp" id="threedzone" data-grp="threedzone">' +
    '<div class="gh" style="font-size:15px;">🖨️ 3D 打印學習記錄<span class="gn">' + cases.length + '</span>' +
    '<span class="ghnote">3d/param_memory.json · diff-learning 案例庫，同 Canva pipeline 同一原理</span></div>' +
    tiles +
    '<div class="grid ccgrid">' + cases.map(render3dCase).join('') + '</div>' +
    frozenHtml + logHtml +
    '</section>';
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
  if (igwProbe.reachable) nav.push(['#igwzone', '🐕', 'IG看門狗學習記錄']);
  if (canvaData) nav.push(['#canvazone', '🎨', 'Canva 學習記錄']);
  if (threeDData) nav.push(['#threedzone', '🖨️', '3D 打印學習記錄']);
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
  "if(t){t.scrollIntoView({behavior:'smooth',block:'start'});}});}" +
  // IG看門狗學習記錄：停用/重啟掣直接 call fhs_toggle_ig_thread_rule（唯一喺呢個生成頁存在嘅
  // live 互動；沿用現有安全RPC，唔開新寫入通道，Fat Mo 明確指定）
  "var igwBtns=document.querySelectorAll('.igwtoggle');" +
  "for(var ib=0;ib<igwBtns.length;ib++){igwBtns[ib].addEventListener('click',function(){" +
  "var btn=this;var id=btn.getAttribute('data-id');var curActive=btn.getAttribute('data-active')==='true';" +
  "btn.disabled=true;btn.textContent='處理中…';" +
  "fetch('" + SB_URL + "/rest/v1/rpc/fhs_toggle_ig_thread_rule',{method:'POST',headers:{'apikey':'" + SB_ANON + "','Authorization':'Bearer " + SB_ANON + "','Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_active:!curActive})})" +
  ".then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);" +
  "var newActive=!curActive;var card=btn.closest('.ccard');var tag=card.querySelector('[data-role=status]');var emo=card.querySelector('.emo');" +
  "card.className=newActive?'ccard':'ccard ccard-pending';" +
  "emo.textContent=newActive?'🟢':'⏸️';" +
  "tag.className='tag '+(newActive?'tg-cmd':'tg-summon');tag.textContent=newActive?'生效中':'已停用';" +
  "btn.setAttribute('data-active',newActive?'true':'false');btn.textContent=newActive?'停用':'重啟';btn.disabled=false;" +
  "}).catch(function(e){btn.textContent='失敗，重試';btn.disabled=false;alert('操作失敗：'+e.message);});" +
  "});}" +
  // Canva 學習記錄 E4：類型篩選（🔴🟡🐞✋📦）。獨立於上面 apply()（後者只揀 .card，Canva 卡片係 .ccard，
  // 兩者 token 完全唔重疊，from未曾互相影響）——刻意唔併入 apply()，避免將搜尋框邏輯強行接上一個
  // 佢從來冇處理過嘅 zone（AG evidence 見 flow 2026-09-13-0857 cl-final-plan.md 批評#1 裁決）。
  "var cvChips=document.querySelectorAll('.cvtypechip');" +
  "function cvApplyFilter(t){" +
  "var lessons=document.querySelectorAll('#canvazone .cv-lesson,#canvazone .cv-rulerow');" +
  "for(var i=0;i<lessons.length;i++){var show=(t==='all')||(lessons[i].getAttribute('data-cv-type')===t);" +
  "lessons[i].toggleAttribute('data-cv-hidden',!show);}" +
  "var stages=document.querySelectorAll('#canvazone .cv-substage');" +
  "for(var s=0;s<stages.length;s++){var nxt=stages[s].nextElementSibling;var any=false;" +
  "if(nxt){var lis=nxt.querySelectorAll('.cv-lesson');for(var k=0;k<lis.length;k++){if(!lis[k].hasAttribute('data-cv-hidden')){any=true;break;}}}" +
  "stages[s].toggleAttribute('data-cv-hidden',!any);if(nxt)nxt.toggleAttribute('data-cv-hidden',!any);}" +
  "var grps=document.querySelectorAll('#canvazone .cv-pagegrp');" +
  "for(var g=0;g<grps.length;g++){var items=grps[g].querySelectorAll('.cv-lesson');var any2=items.length===0;" +
  "for(var m=0;m<items.length;m++){if(!items[m].hasAttribute('data-cv-hidden')){any2=true;break;}}" +
  "grps[g].toggleAttribute('data-cv-hidden',!any2);}" +
  "}" +
  "for(var cc=0;cc<cvChips.length;cc++){cvChips[cc].addEventListener('click',function(){" +
  "for(var z=0;z<cvChips.length;z++){cvChips[z].className='cvtypechip';}this.className='cvtypechip on';" +
  "cvApplyFilter(this.getAttribute('data-cv-filter'));});}";

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
'/* Canva 學習記錄 */\n' +
'.ccgrid{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));}\n' +
'.ccard{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;}\n' +
'.ccard-pending{background:#fdf3e4;border-color:#f0d9b0;}\n' +
'.ccard .cord{font-size:11px;font-weight:400;color:var(--faint);margin-left:6px;font-family:Consolas,Menlo,monospace;}\n' +
'.cnote{margin-top:8px;font-size:12px;}\n' +
'.cnote summary{cursor:pointer;color:var(--soft);list-style:none;}\n' +
'.cnote summary::-webkit-details-marker{display:none;}\n' +
'.cnote summary::before{content:"▸ ";color:var(--faint);}\n' +
'.cnote[open] summary::before{content:"▾ 收起";color:var(--faint);}\n' +
// 2026-09-13（flow 2026-09-13-0857 #4）：展開後隱藏截斷摘要文字，避免同下面 <p> 全文重複顯示（IG/Canva/3D 三 zone 共用此修）
'.cnote[open] summary .cnote-sum-text{display:none;}\n' +
'.cnote p{margin-top:6px;color:var(--soft);line-height:1.6;white-space:pre-wrap;}\n' +
'.cparams{margin-top:8px;font-size:11.5px;color:var(--soft);padding-left:18px;}\n' +
'.cparams li{margin:3px 0;}\n' +
'/* Canva 學習記錄 v2：款式分組/Page列點/規則編號表 */\n' +
'.cv-jumprow{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}\n' +
'.cv-jumpchip{font-size:11.5px;padding:4px 10px;border-radius:999px;background:var(--tile);border:1px solid var(--line);color:var(--soft);text-decoration:none;}\n' +
'.cv-jumpchip:hover{color:var(--ink);box-shadow:var(--shadow);}\n' +
'.cv-filterrow{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:8px 0 14px;}\n' +
'.cv-filterlabel{font-size:11px;color:var(--faint);margin-right:2px;}\n' +
'.cvtypechip{font-size:11px;padding:3px 9px;border-radius:999px;background:var(--tile);border:1px solid var(--line);color:var(--soft);cursor:pointer;font-family:inherit;}\n' +
'.cvtypechip.on{background:var(--ink);color:var(--card);border-color:var(--ink);}\n' +
'.cv-catsection{margin-top:14px;}\n' +
'.cv-cathead{font-size:13.5px;font-weight:600;color:var(--ink);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--line);}\n' +
'.cv-pagegrp{margin-top:8px;}\n' +
'.cv-pagehead{font-size:11.5px;font-weight:600;color:var(--faint);margin:8px 0 3px;text-transform:uppercase;letter-spacing:.02em;}\n' +
'.cv-substage{font-size:11px;font-weight:600;color:var(--faint);margin:6px 0 2px 4px;}\n' +
'.cv-lessons{list-style:none;padding:0;margin:0;}\n' +
'.cv-lessons li{font-size:12px;line-height:1.55;color:var(--soft);padding:2px 0;}\n' +
'.cv-emo{display:inline-block;width:1.3em;}\n' +
'.cv-rulechip{font-size:10.5px;padding:1px 7px;border-radius:999px;background:var(--tile);border:1px solid var(--line);color:var(--soft);text-decoration:none;margin-left:4px;white-space:nowrap;}\n' +
'.cv-rulechip:hover{color:var(--ink);}\n' +
'.cv-canvalink,.cv-parentlink{font-size:11px;color:var(--soft);text-decoration:none;margin-left:6px;}\n' +
'.cv-canvalink:hover,.cv-parentlink:hover{color:var(--ink);}\n' +
'.cv-parenttxt{font-size:11px;color:var(--faint);margin-left:6px;}\n' +
'.cv-body{margin-top:6px;}\n' +
'.cv-body summary{cursor:pointer;list-style:none;}\n' +
'.cv-body summary::-webkit-details-marker{display:none;}\n' +
'.cv-body summary::before{content:"▸ 展開學習列點";color:var(--faint);font-size:11px;display:block;margin-bottom:4px;}\n' +
'.cv-body[open] summary::before{content:"▾ 收起";}\n' +
'.cv-chips{display:flex;flex-wrap:wrap;gap:5px;}\n' +
'.cv-chip{font-size:10.5px;padding:2px 8px;border-radius:999px;background:var(--tile);border:1px solid var(--line);color:var(--soft);}\n' +
'.cv-headline{font-size:12px;color:var(--ink);margin-top:5px;line-height:1.5;}\n' +
'.cv-rulestable{margin-top:20px;padding-top:14px;border-top:1px solid var(--line);}\n' +
'.cv-rulerow{padding:8px 0;border-bottom:1px dashed var(--line);font-size:12px;color:var(--soft);}\n' +
'.cv-caselink{font-size:10.5px;color:var(--soft);text-decoration:none;margin-right:4px;}\n' +
'.cv-caselink:hover{color:var(--ink);}\n' +
'.ccard.cv-case:target,.cv-rulerow:target{outline:2px solid #d97706;outline-offset:2px;border-radius:10px;}\n' +
'[data-cv-hidden]{display:none!important;}\n' +
'@media (max-width:768px){.ccgrid{grid-template-columns:1fr;}.cv-pagehead{font-size:11px;}}\n' +
'.igwtoggle{margin-top:10px;width:100%;border:1px solid var(--line);background:var(--tile);color:var(--soft);font-size:11.5px;padding:6px 0;border-radius:8px;cursor:pointer;font-family:inherit;transition:all .12s ease-out;}\n' +
'.igwtoggle:hover{color:var(--ink);box-shadow:var(--shadow);}\n' +
'.igwtoggle:disabled{opacity:.6;cursor:not-allowed;}\n' +
'.clog{margin-top:16px;font-size:12px;color:var(--soft);border-top:1px dashed var(--line);padding-top:12px;}\n' +
'.clog b{font-size:12.5px;color:var(--ink);}\n' +
'.clog li{margin:6px 0 6px 20px;line-height:1.6;}\n' +
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

renderIgWatchLearningZone() + '\n' +

renderCanvaLearningZone() + '\n' +

render3dLearningZone() + '\n' +

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
