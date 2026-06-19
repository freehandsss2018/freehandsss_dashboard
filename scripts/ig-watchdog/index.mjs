#!/usr/bin/env node
// index.mjs — FHS IG 漏單看門狗 主控
//
// 用法（詳見 SOP.md）：
//   npm run watchdog                 正式跑：讀 .fhs-local/ig-watchdog/raw 比對 Supabase
//   npm run calibrate                校準模式：列 sender×order 相似度帶供定閾值
//   npm run selftest                 離線自測：用 fixtures 合成資料跑全鏈
//
// 設計約束：100% 唯讀（零 insert/update/upsert），客人 DM 不出本地，不觸業務代碼。

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decodeDeep } from './lib/decoder.mjs';
import {
  classify, normalizeName, nameSimilarity, extractAmounts,
  hasOrderIntent, hasPaymentProof,
} from './lib/match.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../');
const LOCAL_DIR = path.join(REPO_ROOT, '.fhs-local', 'ig-watchdog');

// ── 參數 ────────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) a[key] = true;
      else { a[key] = next; i++; }
    } else a._.push(t);
  }
  return a;
}
const args = parseArgs(process.argv.slice(2));

// ── 設定載入（config.json + env + CLI 覆蓋）────────────────
function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; }
}
const cfg = loadJson(path.join(LOCAL_DIR, 'config.json'), {});
const CONFIG = {
  supabaseUrl: process.env.SUPABASE_URL || cfg.supabaseUrl || 'https://vpmwizzixnwilmzctdvu.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || cfg.supabaseAnonKey || '',
  businessNames: (cfg.businessNames || ['free_handsss', 'FREE HANDSSS', 'Free Handsss']).map(normalizeName),
  threshold: Number(args.threshold ?? cfg.threshold ?? 0.6),
  lookbackDays: Number(args.days ?? cfg.lookbackDays ?? 30),
  timeWindowDays: Number(args.window ?? cfg.timeWindowDays ?? 3),
};

const SELFTEST = !!args.selftest;
const CALIBRATE = !!args.calibrate;
const RAW_DIR = SELFTEST ? path.join(__dirname, 'fixtures', 'mock_inbox')
  : args.raw ? path.resolve(process.cwd(), args.raw) : path.join(LOCAL_DIR, 'raw');
const OUT_DIR = SELFTEST ? path.join(LOCAL_DIR, 'selftest-out')
  : args.out ? path.resolve(process.cwd(), args.out) : path.join(LOCAL_DIR, 'output');
const ORDERS_FIXTURE = SELFTEST ? path.join(__dirname, 'fixtures', 'mock_orders.json')
  : args['orders-fixture'] ? path.resolve(process.cwd(), args['orders-fixture']) : null;
const PIPELINE_FIXTURE = SELFTEST ? path.join(__dirname, 'fixtures', 'mock_pipeline.json')
  : args['pipeline-fixture'] ? path.resolve(process.cwd(), args['pipeline-fixture']) : null;

// ── 工具 ────────────────────────────────────────────────────
function isBusiness(name) {
  const n = normalizeName(name);
  return CONFIG.businessNames.some((b) => b && (n === b || n.includes(b) || b.includes(n)));
}
function walkJson(dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walkJson(full));
    else if (/message_\d+\.json$/i.test(e.name)) out.push(full);
  }
  return out;
}
function hashOf(...parts) {
  return crypto.createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16);
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function esc(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ── 解析 inbox → 候選（按 thread 資料夾聚合）────────────────
function parseInbox(rawDir) {
  const files = walkJson(rawDir);
  const threads = new Map(); // threadDir → { participants:Set, messages:[] }
  let minTs = Infinity, maxTs = -Infinity;

  for (const f of files) {
    let data;
    try { data = decodeDeep(JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { continue; }
    const key = path.dirname(f);
    if (!threads.has(key)) threads.set(key, { participants: new Set(), messages: [], title: '' });
    const t = threads.get(key);
    if (data.title) t.title = data.title;
    for (const p of data.participants || []) if (p?.name) t.participants.add(p.name);
    for (const m of data.messages || []) {
      t.messages.push(m);
      if (Number.isFinite(m.timestamp_ms)) {
        if (m.timestamp_ms < minTs) minTs = m.timestamp_ms;
        if (m.timestamp_ms > maxTs) maxTs = m.timestamp_ms;
      }
    }
  }

  const candidates = [];
  for (const [key, t] of threads) {
    // 客名：非本店的參與者，否則用 title
    const customer = [...t.participants].find((n) => !isBusiness(n)) || t.title || '(未知)';
    const custMsgs = t.messages.filter((m) => m.content && !isBusiness(m.sender_name));
    const intentMsgs = custMsgs.filter((m) => hasOrderIntent(m.content) || hasPaymentProof(m.content));
    if (intentMsgs.length === 0) continue; // 無交易意圖 → 跳過
    const content = intentMsgs.map((m) => m.content).join(' ┆ ');
    const amounts = [...new Set(intentMsgs.flatMap((m) => extractAmounts(m.content)))];
    const ts = Math.max(...intentMsgs.map((m) => m.timestamp_ms || 0));
    candidates.push({ name: customer, ts, content, amounts, thread: path.basename(key),
      allNames: [...t.participants] });
  }
  return { candidates, minTs: minTs === Infinity ? null : minTs, maxTs: maxTs === -Infinity ? null : maxTs };
}

// ── Supabase 唯讀拉取（或 fixture）──────────────────────────
async function fetchTable(table, select, fixturePath) {
  if (fixturePath) return loadJson(fixturePath, []);
  if (!CONFIG.supabaseAnonKey) {
    console.error(`\n❌ 缺 SUPABASE_ANON_KEY。請在 ${path.join(LOCAL_DIR, 'config.json')} 填入，或設環境變數。`);
    console.error('   （正式比對需要；離線測試請用 --selftest 或 --orders-fixture）\n');
    process.exit(1);
  }
  const since = new Date(Date.now() - CONFIG.lookbackDays * 86400000).toISOString();
  const url = `${CONFIG.supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}`
    + `&created_at=gte.${since}&order=created_at.desc`;
  const res = await fetch(url, { headers: {
    apikey: CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${CONFIG.supabaseAnonKey}`,
  } });
  if (!res.ok) { console.error(`❌ Supabase ${table} 查詢失敗 ${res.status}: ${await res.text()}`); process.exit(1); }
  return res.json();
}

// ── 校準模式 ────────────────────────────────────────────────
function runCalibrate(candidates, orders) {
  const rows = candidates.map((c) => {
    let bestSim = 0, bestName = '';
    for (const o of orders) {
      const s = nameSimilarity(c.name, o.customer_name || '');
      if (s > bestSim) { bestSim = s; bestName = o.customer_name; }
    }
    return { ig: c.name, sim: bestSim, order: bestName };
  }).sort((a, b) => b.sim - a.sim);
  console.log('\n=== 校準：每個 IG 候選對最近訂單的最高名字相似度 ===');
  console.log('（觀察真實配對落喺邊個分數帶 → 反推 threshold）\n');
  for (const r of rows) {
    console.log(`  ${r.sim.toFixed(2)}  ${r.ig}  →  ${r.order || '(無)'}`);
  }
  console.log(`\n候選總數：${rows.length}。建議 threshold 設喺「真配對最低分」與「誤配最高分」之間。\n`);
}

// ── 報告 ────────────────────────────────────────────────────
function buildReport(results, meta) {
  const byTier = { '🔴': [], '🟡': [], '⚪': [] };
  let matched = 0, inPipe = 0;
  for (const r of results) {
    if (r.cls.status === 'matched_order') matched++;
    else if (r.cls.status === 'in_pipeline') inPipe++;
    else byTier[r.cls.tier]?.push(r);
  }
  const card = (r) => `
    <div class="row">
      <div class="rh"><b>${esc(r.cand.name)}</b> <span class="t">${r.cls.tier}</span>
        <span class="ts">${r.cand.ts ? new Date(r.cand.ts).toLocaleString() : ''}</span></div>
      <div class="reason">${esc(r.cls.reason)}${r.cand.amounts?.length ? ' ｜金額：' + r.cand.amounts.join(', ') : ''}</div>
      <div class="snip">${esc(r.cand.content).slice(0, 300)}</div>
      <div class="hint">thread: ${esc(r.cand.thread)} ｜ 若屬同一客人，可加入 ig_name_map.json：<code>"${esc(r.cand.name)}": "客名"</code></div>
    </div>`;
  const section = (tier, label, open) => {
    const items = byTier[tier];
    if (!items.length) return '';
    return `<details ${open ? 'open' : ''}><summary>${label}（${items.length}）</summary>${items.map(card).join('')}</details>`;
  };
  const gaps = meta.gapWarnings.length
    ? `<div class="warn">⚠️ 覆蓋缺口：${meta.gapWarnings.map(esc).join('；')}</div>` : '';
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8">
<title>IG 漏單看門狗報告 ${meta.date}</title>
<style>
 body{font-family:-apple-system,"PingFang HK",sans-serif;max-width:820px;margin:24px auto;padding:0 16px;color:#1a1a1a}
 h1{font-size:20px} .meta{color:#666;font-size:13px;margin-bottom:12px}
 .cov{background:#f0f7ff;border:1px solid #cfe3ff;padding:8px 12px;border-radius:8px;font-size:13px}
 .warn{background:#fff4e5;border:1px solid #ffd599;padding:8px 12px;border-radius:8px;margin-top:8px;font-size:13px}
 .counts{display:flex;gap:8px;margin:14px 0;flex-wrap:wrap}
 .chip{padding:4px 10px;border-radius:999px;font-size:13px;background:#eee}
 .chip.red{background:#ffe0e0} .chip.ok{background:#e3f6e3}
 details{border:1px solid #e3e3e3;border-radius:8px;margin:10px 0;padding:4px 12px}
 summary{cursor:pointer;font-weight:600;padding:6px 0}
 .row{border-top:1px solid #eee;padding:10px 0} .rh{font-size:15px} .t{font-size:16px}
 .ts{color:#999;font-size:12px;margin-left:6px} .reason{color:#444;font-size:13px;margin:3px 0}
 .snip{background:#fafafa;border-radius:6px;padding:6px 8px;font-size:13px;white-space:pre-wrap;margin:4px 0}
 .hint{color:#888;font-size:12px} code{background:#f0f0f0;padding:1px 4px;border-radius:4px}
</style></head><body>
<h1>🐶 IG 漏單看門狗報告</h1>
<div class="meta">生成：${meta.date} ｜ 候選：${results.length} ｜ threshold：${meta.threshold}</div>
<div class="cov">📅 本次資料覆蓋：${meta.coverageText}</div>
${gaps}
<div class="counts">
 <span class="chip red">🔴 疑似漏單 ${byTier['🔴'].length}</span>
 <span class="chip">🟡 待查 ${byTier['🟡'].length}</span>
 <span class="chip">⚪ 低信心 ${byTier['⚪'].length}</span>
 <span class="chip ok">✅ 已對齊訂單 ${matched}</span>
 <span class="chip ok">📋 在 pipeline ${inPipe}</span>
</div>
${section('🔴', '🔴 疑似漏單（有付款證據，優先處理）', true)}
${section('🟡', '🟡 待查（有意圖無付款證據）', false)}
${section('⚪', '⚪ 低信心（模糊）', false)}
<p class="meta">本報告唯讀產生，未對 Supabase 作任何寫入。客人 DM 內容僅存於本地。</p>
</body></html>`;
}

// ── 主流程 ──────────────────────────────────────────────────
async function main() {
  ensureDir(LOCAL_DIR); ensureDir(OUT_DIR);
  console.log(`[watchdog] raw: ${RAW_DIR}`);
  const { candidates, minTs, maxTs } = parseInbox(RAW_DIR);
  console.log(`[watchdog] 解析出 ${candidates.length} 個有交易意圖的候選對話`);

  const orders = await fetchTable('orders',
    'order_id,customer_name,deposit,final_sale_price,created_at,confirmed_at,full_order_text', ORDERS_FIXTURE);

  // 校準模式只需 orders（名字相似度帶），提前返回，免去 pipeline 拉取
  if (CALIBRATE) { console.log(`[watchdog] Supabase：orders ${orders.length}`); runCalibrate(candidates, orders); return; }

  const pipeline = await fetchTable('sales_pipeline',
    'customer_name,estimated_amount,created_at,raw_message,query_details,stage', PIPELINE_FIXTURE);
  console.log(`[watchdog] Supabase：orders ${orders.length}、pipeline ${pipeline.length}`);

  const aliasMap = loadJson(path.join(LOCAL_DIR, 'ig_name_map.json'), {});
  const history = loadJson(path.join(LOCAL_DIR, 'history.json'), { seen: {}, resolved: {} });

  const results = [];
  let skipped = 0;
  for (const c of candidates) {
    const h = hashOf(normalizeName(c.name), String(c.ts));
    if (history.resolved[h]) { skipped++; continue; }       // 已標非漏單 → 不再現
    const cls = classify(c, orders, pipeline, {
      threshold: CONFIG.threshold, aliasMap, timeWindowDays: CONFIG.timeWindowDays });
    history.seen[h] = { name: c.name, ts: c.ts, status: cls.status, tier: cls.tier, at: Date.now() };
    results.push({ cand: c, cls, hash: h });
  }
  if (skipped) console.log(`[watchdog] 跳過 ${skipped} 個已標記「非漏單」的候選`);

  // 覆蓋帳本 + 缺口偵測
  const coverage = loadJson(path.join(LOCAL_DIR, 'coverage.json'), { runs: [] });
  const gapWarnings = [];
  if (minTs && maxTs) {
    const prev = coverage.runs[coverage.runs.length - 1];
    if (prev?.maxTs && minTs > prev.maxTs + 86400000) {
      gapWarnings.push(`上次覆蓋至 ${new Date(prev.maxTs).toLocaleDateString()}，本次由 ${new Date(minTs).toLocaleDateString()} 起 → 中間時段未檢查`);
    }
    coverage.runs.push({ at: Date.now(), minTs, maxTs, candidates: candidates.length });
  }

  const coverageText = (minTs && maxTs)
    ? `${new Date(minTs).toLocaleDateString()} ～ ${new Date(maxTs).toLocaleDateString()}`
    : '（raw 內無可解析訊息）';
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const html = buildReport(results, { date, threshold: CONFIG.threshold, coverageText, gapWarnings });

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const outFile = path.join(OUT_DIR, `report_${stamp}.html`);
  fs.writeFileSync(outFile, html, 'utf8');

  // 持久化（全本地，gitignored）
  fs.writeFileSync(path.join(LOCAL_DIR, 'history.json'), JSON.stringify(history, null, 2), 'utf8');
  fs.writeFileSync(path.join(LOCAL_DIR, 'coverage.json'), JSON.stringify(coverage, null, 2), 'utf8');

  const tiers = results.reduce((m, r) => { if (r.cls.tier) m[r.cls.tier] = (m[r.cls.tier] || 0) + 1; return m; }, {});
  console.log(`[watchdog] 🔴${tiers['🔴'] || 0} 🟡${tiers['🟡'] || 0} ⚪${tiers['⚪'] || 0}`);
  console.log(`[watchdog] ✅ 報告：${outFile}`);
  if (gapWarnings.length) console.log(`[watchdog] ⚠️ ${gapWarnings.join('；')}`);
}

main().catch((e) => { console.error('[watchdog] 未預期錯誤：', e); process.exit(1); });
