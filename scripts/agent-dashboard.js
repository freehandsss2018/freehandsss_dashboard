#!/usr/bin/env node
/**
 * agent-dashboard.js — FHS AI 助理團隊名冊生成器
 *
 * 用法：node scripts/agent-dashboard.js
 * 輸出：artifacts/agent-dashboard.html（人睇）+ artifacts/agent-dashboard.json（AI 讀）
 *
 * 原則（制度本體見 .fhs/notes/ai-team-registry.md）：
 *   - 名冊係「生成物」，嚴禁手改輸出 HTML——真源係各資產自身嘅 frontmatter/檔頭
 *   - 掃唔到嘅非檔案資產（MCP/n8n/cron/召喚詞）唯一登記點：.fhs/ai/team-manifest.json
 *   - 生成同時做健康檢查（bridge 孤兒/缺描述/MANIFEST 漂移），輸出「勘誤表」
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(ROOT, '.fhs', 'ai', 'team-manifest.json');
const OUT_HTML = path.join(ROOT, 'artifacts', 'agent-dashboard.html');
const OUT_JSON = path.join(ROOT, 'artifacts', 'agent-dashboard.json');

const M = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const warnings = [];

// ---------- helpers ----------
function readIf(p) {
  // 剝 BOM——governance/02 §7 教訓：Windows 工具寫入嘅檔案帶 ﻿ 會令行首錨點解析失效
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
      version: fm.version || '—',
      tools: fm.tools ? fm.tools.split(',').length : 0,
      updated: fm.last_updated || '—',
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
      version: ver || '—',
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

// ---------- 4. Hooks（settings.json 接線真源 + manifest 描述） ----------
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
    items.push({
      name: f,
      desc: clamp(stripMd(descs[f] || ''), 170),
      events: wired.get(f) || ['（未接線／由其他腳本內嵌呼叫）'],
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
      const declared = new Set(items.filter(i => i.source === 'manifest' && i.source_field !== undefined ? false : (i.sourceTag = i.source, true)).map(i => i.name));
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
data.stats = {
  subagents: data.subagents.length,
  builtins: data.builtins.length,
  commands: data.commands.length,
  skills: data.skills.length,
  hooks: data.hooks.length,
  automations: data.automations.length,
  mcp: data.mcp.length,
  total: data.subagents.length + data.builtins.length + data.commands.length +
         data.skills.length + data.hooks.length + data.automations.length + data.mcp.length,
};

// ---------- 7. HTML 渲染 ----------
const GROUP_LABEL = { fhs_core: 'FHS 自研', grilling: '拷問系列', design_pack: '設計技能包' };

function metaChips(pairs) {
  return pairs.filter(p => p[1] && p[1] !== '—')
    .map(p => '<span class="chip"><i>' + esc(p[0]) + '</i>' + esc(p[1]) + '</span>').join('');
}
function srcTag(s) {
  return s === 'manifest' ? '<span class="src manual" title="來自 team-manifest.json 人工登記">手記</span>'
                          : '<span class="src" title="由檔案 frontmatter 自動掃描">實掃</span>';
}

function renderSubagent(a) {
  return '<article class="roster" data-search="' + esc(a.name + ' ' + a.desc) + '">' +
    '<header><h3>' + esc(a.name) + '</h3>' + srcTag(a.source) + '</header>' +
    '<p>' + esc(a.desc) + '</p>' +
    '<footer>' + metaChips([['model', a.model], ['版本', a.version], ['工具', a.tools ? a.tools + ' 件' : ''], ['入伍', a.birth]]) +
    '<code>' + esc(a.home) + '</code></footer></article>';
}
function renderCommand(c) {
  return '<article class="cmd" data-search="' + esc(c.name + ' ' + c.title + ' ' + c.desc + ' ' + c.trigger) + '">' +
    '<header><h3>' + esc(c.name) + '</h3><span class="t">' + esc(c.title) + '</span>' + srcTag(c.source) + '</header>' +
    '<p>' + esc(c.desc) + '</p>' +
    '<footer>' + (c.trigger ? '<span class="chip trig"><i>召喚</i>' + esc(c.trigger) + '</span>' : '') +
    metaChips([['版本', c.version], ['入伍', c.birth]]) + '</footer></article>';
}
function renderSkillCard(s) {
  return '<article class="skillcard" data-search="' + esc(s.name + ' ' + s.desc) + '">' +
    '<h3>' + esc(s.name) + '</h3><p>' + esc(s.desc) + '</p>' +
    '<footer>' + metaChips([['入伍', s.birth]]) + '</footer></article>';
}
function renderSkillLine(s) {
  return '<li data-search="' + esc(s.name + ' ' + s.desc) + '"><b>' + esc(s.name) + '</b><span>' + esc(clamp(s.desc, 90)) + '</span></li>';
}
function renderHook(h) {
  return '<article class="cmd" data-search="' + esc(h.name + ' ' + h.desc) + '">' +
    '<header><h3>' + esc(h.name) + '</h3><span class="t">' + esc(h.events.join(' + ')) + '</span>' + srcTag(h.source) + '</header>' +
    '<p>' + esc(h.desc) + '</p>' +
    '<footer>' + metaChips([['入伍', h.birth]]) + '<code>' + esc(h.home) + '</code></footer></article>';
}
function renderAuto(a) {
  return '<article class="cmd" data-search="' + esc(a.name + ' ' + a.desc) + '">' +
    '<header><h3>' + esc(a.name) + '</h3><span class="t">' + esc(a.kind || '') + '</span>' + srcTag(a.source) + '</header>' +
    '<p>' + esc(a.desc) + '</p><footer><code>' + esc(a.home || '') + '</code></footer></article>';
}
function renderBuiltin(b) {
  return '<li data-search="' + esc(b.name + ' ' + b.desc) + '"><b>' + esc(b.name) + '</b><span>' + esc(b.desc) + '</span></li>';
}
function renderMcpRow(c) {
  return '<tr data-search="' + esc(c.name + ' ' + c.desc) + '"><td>' + esc(c.name) + '</td><td>' + esc(c.desc) + '</td><td>' + esc(c.source) + '</td></tr>';
}
function renderTrigger(t) {
  return '<li data-search="' + esc(t.phrase + ' ' + t.target + ' ' + t.effect) + '">' +
    '<span class="phrase">' + esc(t.phrase) + '</span><span class="leader"></span>' +
    '<span class="target">' + esc(t.target) + '</span><small>' + esc(t.effect) + '</small></li>';
}
function renderTimeline(tl) {
  if (!tl.length) return '';
  const max = Math.max(...tl.map(t => t.count), 1);
  return '<div class="tl">' + tl.map(t =>
    '<div class="tl-col"><span class="n">' + (t.count || '') + '</span>' +
    '<div class="bar" style="height:' + Math.round(6 + (t.count / max) * 72) + 'px"></div>' +
    '<span class="m">' + esc(t.month.replace('-', '.')) + '</span></div>').join('') + '</div>';
}

const skillsByGroup = {};
for (const s of data.skills) (skillsByGroup[s.group] = skillsByGroup[s.group] || []).push(s);

const clientJS =
  "var q=document.getElementById('q');" +
  "function apply(){var v=(q.value||'').trim().toLowerCase();" +
  "var nodes=document.querySelectorAll('[data-search]');var shown=0;" +
  "for(var i=0;i<nodes.length;i++){var hit=!v||nodes[i].getAttribute('data-search').toLowerCase().indexOf(v)>-1;" +
  "nodes[i].style.display=hit?'':'none';if(hit)shown++;}" +
  "var secs=document.querySelectorAll('section.blk');" +
  "for(var j=0;j<secs.length;j++){var vis=secs[j].querySelectorAll('[data-search]');var any=false;" +
  "for(var k=0;k<vis.length;k++){if(vis[k].style.display!=='none'){any=true;break;}}" +
  "secs[j].style.display=any?'':'none';}" +
  "document.getElementById('hits').textContent=v?('命中 '+shown+' 項'):'';}" +
  "if(q){q.addEventListener('input',apply);}";

const html = '<!DOCTYPE html>\n<html lang="zh-Hant">\n<head>\n<meta charset="UTF-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'<title>FHS AI 助理團隊名冊</title>\n' +
'<style>\n' +
':root{--paper:#f7f1e8;--card:#fcf9f3;--ink:#2a2118;--soft:#6f604c;--faint:#9a8a72;--line:#ddd0ba;--gold:#9a7b3f;--tan:#b08d57;--warn-bg:#f6e7de;--warn:#8a3b2e;}\n' +
'*{margin:0;padding:0;box-sizing:border-box;}\n' +
'body{background:var(--paper);color:var(--ink);font-family:"Microsoft JhengHei","PingFang TC","Noto Sans TC",sans-serif;line-height:1.65;}\n' +
'.wrap{max-width:1060px;margin:0 auto;padding:clamp(16px,4vw,48px);}\n' +
'.serif{font-family:Georgia,"Times New Roman",serif;}\n' +
'header.mast{border-bottom:3px double var(--gold);padding-bottom:22px;margin-bottom:8px;}\n' +
'header.mast .over{letter-spacing:.35em;font-size:11px;color:var(--gold);text-transform:uppercase;}\n' +
'header.mast h1{font-family:Georgia,serif;font-weight:600;font-size:clamp(30px,5.4vw,52px);letter-spacing:.02em;margin:6px 0 2px;}\n' +
'header.mast .colophon{display:flex;flex-wrap:wrap;gap:6px 22px;color:var(--soft);font-size:13px;margin-top:10px;}\n' +
'header.mast .colophon b{color:var(--ink);font-family:Georgia,serif;}\n' +
'.searchbar{display:flex;align-items:baseline;gap:14px;margin:18px 0 6px;}\n' +
'#q{flex:1;max-width:420px;background:transparent;border:0;border-bottom:1px solid var(--line);padding:8px 2px;font-size:15px;color:var(--ink);outline:none;font-family:inherit;}\n' +
'#q:focus{border-bottom-color:var(--gold);}\n' +
'#hits{font-size:12px;color:var(--faint);}\n' +
'section.blk{margin-top:clamp(30px,6vw,58px);display:grid;grid-template-columns:170px 1fr;gap:8px 34px;}\n' +
'section.blk>.sechead{position:sticky;top:14px;align-self:start;}\n' +
'.sechead .no{font-family:Georgia,serif;font-size:38px;color:var(--tan);line-height:1;}\n' +
'.sechead h2{font-size:19px;margin-top:4px;letter-spacing:.06em;}\n' +
'.sechead small{color:var(--faint);font-size:12px;display:block;margin-top:4px;line-height:1.5;}\n' +
'@media(max-width:760px){section.blk{grid-template-columns:1fr;}section.blk>.sechead{position:static;display:flex;align-items:baseline;gap:12px;}.sechead .no{font-size:26px;}}\n' +
'/* 召喚詞 index：書本索引 dotted leaders */\n' +
'.idx{list-style:none;columns:2;column-gap:44px;}\n' +
'@media(max-width:760px){.idx{columns:1;}}\n' +
'.idx li{break-inside:avoid;margin-bottom:13px;display:block;}\n' +
'.idx .phrase{font-weight:700;}\n' +
'.idx .leader{display:inline-block;min-width:24px;border-bottom:1px dotted var(--faint);margin:0 6px;vertical-align:4px;width:calc(100% - 0px);max-width:60px;}\n' +
'.idx .target{color:var(--gold);font-size:13.5px;}\n' +
'.idx small{display:block;color:var(--soft);font-size:12px;line-height:1.55;}\n' +
'/* timeline */\n' +
'.tl{display:flex;align-items:flex-end;gap:clamp(8px,2vw,22px);padding:14px 2px 4px;border-bottom:1px solid var(--line);overflow-x:auto;}\n' +
'.tl-col{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:44px;}\n' +
'.tl-col .bar{width:26px;background:linear-gradient(180deg,var(--tan),var(--gold));border-radius:2px 2px 0 0;}\n' +
'.tl-col .n{font-family:Georgia,serif;font-size:14px;color:var(--gold);}\n' +
'.tl-col .m{font-size:11px;color:var(--faint);}\n' +
'.tlnote{font-size:12px;color:var(--faint);margin-top:8px;}\n' +
'/* 卡片 */\n' +
'.rostergrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}\n' +
'article.roster,article.cmd,article.skillcard{background:var(--card);border:1px solid var(--line);padding:16px 18px 13px;}\n' +
'article.roster header,article.cmd header{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;}\n' +
'article h3{font-family:Georgia,"Microsoft JhengHei",serif;font-size:16.5px;font-weight:700;}\n' +
'article .t{color:var(--soft);font-size:12.5px;}\n' +
'article p{font-size:13px;color:var(--soft);margin:7px 0 10px;line-height:1.6;}\n' +
'article footer{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}\n' +
'article footer code{font-size:10.5px;color:var(--faint);margin-left:auto;word-break:break-all;}\n' +
'.chip{font-size:11px;border:1px solid var(--line);padding:1px 8px;border-radius:20px;color:var(--soft);}\n' +
'.chip i{font-style:normal;color:var(--faint);margin-right:5px;}\n' +
'.chip.trig{border-color:var(--gold);color:var(--gold);}\n' +
'.src{font-size:10px;letter-spacing:.15em;color:var(--faint);border:1px solid var(--line);padding:0 5px;margin-left:auto;}\n' +
'.src.manual{color:var(--warn);border-color:var(--warn);opacity:.75;}\n' +
'.cmdlist{display:grid;grid-template-columns:1fr 1fr;gap:12px;}\n' +
'@media(max-width:820px){.cmdlist{grid-template-columns:1fr;}}\n' +
'/* 精簡列表（設計技能包/內建 agent） */\n' +
'.thin{list-style:none;columns:2;column-gap:40px;margin-top:6px;}\n' +
'@media(max-width:760px){.thin{columns:1;}}\n' +
'.thin li{break-inside:avoid;padding:7px 0;border-bottom:1px dotted var(--line);font-size:13px;}\n' +
'.thin b{display:block;font-size:13.5px;}\n' +
'.thin span{color:var(--soft);font-size:12px;}\n' +
'.subhead{margin:26px 0 10px;font-size:13px;letter-spacing:.2em;color:var(--gold);}\n' +
'.subhead:first-child{margin-top:0;}\n' +
'.tblwrap{overflow-x:auto;}\n' +
'table.mcp{width:100%;border-collapse:collapse;font-size:13px;}\n' +
'table.mcp td{border-bottom:1px solid var(--line);padding:9px 10px 9px 0;vertical-align:top;}\n' +
'table.mcp td:first-child{font-weight:700;white-space:nowrap;padding-right:18px;}\n' +
'table.mcp td:last-child{color:var(--faint);font-size:11px;white-space:nowrap;}\n' +
'table.mcp td:nth-child(2){color:var(--soft);}\n' +
'/* 勘誤表 */\n' +
'.errata{background:var(--warn-bg);border:1px solid #e0c4b4;padding:18px 22px;}\n' +
'.errata h2{color:var(--warn);font-size:16px;letter-spacing:.1em;margin-bottom:8px;}\n' +
'.errata li{color:var(--warn);font-size:13px;margin:5px 0 5px 18px;}\n' +
'footer.end{margin-top:60px;border-top:3px double var(--gold);padding-top:16px;color:var(--faint);font-size:12px;line-height:1.9;}\n' +
'footer.end code{color:var(--soft);}\n' +
'@media print{.searchbar{display:none;}body{background:#fff;}article{break-inside:avoid;}}\n' +
'</style>\n</head>\n<body>\n<div class="wrap">\n' +

'<header class="mast">\n' +
'<div class="over">Freehandsss · Internal Registry</div>\n' +
'<h1>AI 助理團隊名冊</h1>\n' +
'<div class="colophon">' +
'<span>生成於 <b>' + esc(data.generated) + '</b></span>' +
'<span>成員 <b>' + data.stats.total + '</b></span>' +
'<span>派工隊 <b>' + (data.stats.subagents + data.stats.builtins) + '</b></span>' +
'<span>指令 <b>' + data.stats.commands + '</b></span>' +
'<span>技能 <b>' + data.stats.skills + '</b></span>' +
'<span>自動化 <b>' + (data.stats.hooks + data.stats.automations) + '</b></span>' +
'<span>MCP <b>' + data.stats.mcp + '</b></span>' +
'</div>\n</header>\n' +

'<div class="searchbar"><input id="q" type="search" placeholder="搜尋成員／召喚詞／功能……" autocomplete="off"><span id="hits"></span></div>\n' +

'<section class="blk" id="triggers">\n<div class="sechead"><div class="no serif">壹</div><h2>召喚詞速查</h2><small>唔記得指令唔緊要，記得呢頁就得——講咗就會發生。</small></div>\n' +
'<ul class="idx">' + data.triggers.map(renderTrigger).join('') + '</ul>\n</section>\n' +

'<section class="blk" id="history">\n<div class="sechead"><div class="no serif">貳</div><h2>成長史</h2><small>每月入伍成員數（出生日期來自 git 首次提交／安裝紀錄）。</small></div>\n' +
'<div>' + renderTimeline(data.timeline) + '<div class="tlnote">涵蓋 subagents、指令、技能、hooks 共 ' + (data.subagents.length + data.commands.length + data.skills.length + data.hooks.length) + ' 名檔案型成員。</div></div>\n</section>\n' +

'<section class="blk" id="subagents">\n<div class="sechead"><div class="no serif">參</div><h2>派工隊 Subagents</h2><small>可獨立領任務嘅隊員。派工前先套 governance/04 模板。</small></div>\n' +
'<div><div class="rostergrid">' + data.subagents.map(renderSubagent).join('') + '</div>' +
'<div class="subhead">HARNESS 內建</div><ul class="thin">' + data.builtins.map(renderBuiltin).join('') + '</ul></div>\n</section>\n' +

'<section class="blk" id="commands">\n<div class="sechead"><div class="no serif">肆</div><h2>斜線指令</h2><small>master 喺 .fhs/ai/commands/，.claude/commands/ 只係橋。</small></div>\n' +
'<div class="cmdlist">' + data.commands.map(renderCommand).join('') + '</div>\n</section>\n' +

'<section class="blk" id="skills">\n<div class="sechead"><div class="no serif">伍</div><h2>技能書 Skills</h2><small>對話中按情境召喚嘅專門知識。</small></div>\n<div>' +
['fhs_core', 'grilling'].map(g => (skillsByGroup[g] || []).length ?
  '<div class="subhead">' + esc(GROUP_LABEL[g] || g) + '</div><div class="rostergrid">' + skillsByGroup[g].map(renderSkillCard).join('') + '</div>' : '').join('') +
((skillsByGroup.design_pack || []).length ?
  '<div class="subhead">' + esc(GROUP_LABEL.design_pack) + '（' + skillsByGroup.design_pack.length + ' 支）</div><ul class="thin">' +
  skillsByGroup.design_pack.map(renderSkillLine).join('') + '</ul>' : '') +
'</div>\n</section>\n' +

'<section class="blk" id="autos">\n<div class="sechead"><div class="no serif">陸</div><h2>自動化長工</h2><small>唔使召喚、自己會做嘢嘅隊員：hooks 每個 session 站崗，n8n 喺 NAS 長跑。</small></div>\n' +
'<div class="cmdlist">' + data.hooks.map(renderHook).join('') + data.automations.map(renderAuto).join('') + '</div>\n</section>\n' +

'<section class="blk" id="mcp">\n<div class="sechead"><div class="no serif">柒</div><h2>MCP 連接器</h2><small>隊員嘅對外手腳。以 session 實際載入為準。</small></div>\n' +
'<div class="tblwrap"><table class="mcp">' + data.mcp.map(renderMcpRow).join('') + '</table></div>\n</section>\n' +

(warnings.length ?
'<section class="blk" id="errata">\n<div class="sechead"><div class="no serif">勘</div><h2>勘誤表</h2><small>生成時偵測到嘅漂移／孤兒，同 session 修或落待辦。</small></div>\n' +
'<div class="errata"><ul>' + warnings.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul></div>\n</section>\n' : '') +

'<footer class="end">\n' +
'<div>本名冊由 <code>node scripts/agent-dashboard.js</code> 生成——<b>手改本檔必被覆蓋</b>。新增檔案型資產會自動出現；MCP／n8n／召喚詞等非檔案資產請登記 <code>.fhs/ai/team-manifest.json</code>（更新於 ' + esc(data.manifest_updated) + '）。</div>\n' +
'<div>制度規範：<code>.fhs/notes/ai-team-registry.md</code>　·　機讀版：<code>artifacts/agent-dashboard.json</code>　·　標記說明：實掃＝frontmatter 自動掃描／手記＝manifest 人工登記</div>\n' +
'</footer>\n' +
'</div>\n<script>' + clientJS + '</script>\n</body>\n</html>\n';

// ---------- 8. 落盤 + console 報告 ----------
fs.mkdirSync(path.join(ROOT, 'artifacts'), { recursive: true });
fs.writeFileSync(OUT_HTML, html, 'utf8');
fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2), 'utf8');

console.log('✅ FHS AI 助理團隊名冊生成完成');
console.log('   成員總數: ' + data.stats.total +
  '（subagents ' + data.stats.subagents + ' + 內建 ' + data.stats.builtins +
  ' | 指令 ' + data.stats.commands + ' | 技能 ' + data.stats.skills +
  ' | hooks ' + data.stats.hooks + ' + 自動化 ' + data.stats.automations +
  ' | MCP ' + data.stats.mcp + '）');
console.log('   HTML: ' + path.relative(ROOT, OUT_HTML));
console.log('   JSON: ' + path.relative(ROOT, OUT_JSON));
if (warnings.length) {
  console.log('⚠️  勘誤表 ' + warnings.length + ' 項:');
  for (const w of warnings) console.log('   - ' + w);
} else {
  console.log('✨ 零勘誤');
}
