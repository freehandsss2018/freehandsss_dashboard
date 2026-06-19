// build_n8n_workflow.cjs — 產生/更新 n8n workflow「FHS_IGWatchdog_DriveWatch」（方案C：全 NAS 跑）
//
// 為何需要這個腳本而非直接在 n8n 編輯器改：Parse Inbox / Classify & Report 兩個 Code 節點內含
// decoder.mjs + match.mjs 的完整移植邏輯（mojibake 解碼 + CJK 模糊比對 + 訊號分層），手動在
// n8n UI 編輯長 JS 字串容易出錯且難版本控管。改規則時改這個檔案，重新產生 JSON 再 PUT 上去。
//
// 用法：
//   node scripts/ig-watchdog/build_n8n_workflow.cjs
//   （需要環境變數 SUPABASE_URL / SUPABASE_ANON_KEY，從 repo 根 .env 讀取即可）
// 輸出：.fhs-local/ig-watchdog/n8n_workflow_built.json（gitignore，不落 repo）
//
// 套用到 n8n：
//   curl -X PUT "$N8N_INSTANCE/api/v1/workflows/<workflowId>" -H "X-N8N-API-KEY: $N8N_KEY" \
//        -H "Content-Type: application/json" --data @.fhs-local/ig-watchdog/n8n_workflow_built.json
//
// ⚠️ PUT 會整個覆寫 workflow，包含 credentials 區塊。Google Drive Trigger / Download File
// 兩個節點的 credential 沒有透過 API 拿到 ID（n8n Public API 不提供 credential 列表），
// 套用後務必回 n8n 編輯器手動重新指派這兩個節點的 Google Drive credential。
const fs = require('fs');

const parseInboxCode = `
function decodeMetaMojibake(input) {
  if (typeof input !== 'string' || input.length === 0) return input;
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) > 0xFF) return input;
  }
  try {
    const decoded = Buffer.from(input, 'latin1').toString('utf8');
    const before = (input.match(/\\uFFFD/g) || []).length;
    const after = (decoded.match(/\\uFFFD/g) || []).length;
    if (after > before) return input;
    return decoded;
  } catch (e) { return input; }
}
function decodeDeep(value) {
  if (typeof value === 'string') return decodeMetaMojibake(value);
  if (Array.isArray(value)) return value.map(decodeDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = decodeDeep(value[k]);
    return out;
  }
  return value;
}
function normalizeName(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[^\\p{L}\\p{N}]/gu, '').toLowerCase();
}
const INTENT_RE = /訂金|落單|下單|預訂|訂購|匯款|轉帳|轉數|過數|入數|留位|留俾|落訂|訂咗|想訂|要訂|deposit|order/i;
const PAYMENT_PROOF_RE = /已轉|已匯|已過數|過咗數|入咗|已入數|已付|已$|轉咗|付咗|後五碼|後5碼|尾五碼|轉左|過左數/i;
function hasOrderIntent(text) { return typeof text === 'string' && INTENT_RE.test(text); }
function hasPaymentProof(text) { return typeof text === 'string' && PAYMENT_PROOF_RE.test(text); }
function extractAmounts(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  for (const m of text.matchAll(/\\d[\\d,]*/g)) {
    const n = parseInt(m[0].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}
const BUSINESS_NAMES = ['free_handsss', 'freehandsss'].map(normalizeName);
function isBusiness(name) {
  const n = normalizeName(name);
  return BUSINESS_NAMES.some((b) => b && (n === b || n.includes(b) || b.includes(n)));
}

const threads = new Map();
let minTs = Infinity, maxTs = -Infinity;

const __items = $input.all();
for (let __i = 0; __i < __items.length; __i++) {
  const item = __items[__i];
  for (const [key, bin] of Object.entries(item.binary || {})) {
    const fname = bin.fileName || key;
    if (!/message_\\d+\\.json$/i.test(fname)) continue;
    let data;
    try {
      const buf = await this.helpers.getBinaryDataBuffer(__i, key);
      data = decodeDeep(JSON.parse(buf.toString('utf8')));
    } catch (e) { continue; }
    const threadKey = fname.replace(/[\\\\/]message_\\d+\\.json$/i, '');
    if (!threads.has(threadKey)) threads.set(threadKey, { participants: new Set(), messages: [], title: '' });
    const t = threads.get(threadKey);
    if (data.title) t.title = data.title;
    for (const p of data.participants || []) if (p && p.name) t.participants.add(p.name);
    for (const m of data.messages || []) {
      t.messages.push(m);
      if (Number.isFinite(m.timestamp_ms)) {
        if (m.timestamp_ms < minTs) minTs = m.timestamp_ms;
        if (m.timestamp_ms > maxTs) maxTs = m.timestamp_ms;
      }
    }
  }
}

const candidates = [];
for (const [key, t] of threads) {
  const customer = [...t.participants].find((n) => !isBusiness(n)) || t.title || '(未知)';
  const custMsgs = t.messages.filter((m) => m.content && !isBusiness(m.sender_name));
  const intentMsgs = custMsgs.filter((m) => hasOrderIntent(m.content) || hasPaymentProof(m.content));
  if (intentMsgs.length === 0) continue;
  const content = intentMsgs.map((m) => m.content).join(' ┆ ');
  const amounts = [...new Set(intentMsgs.flatMap((m) => extractAmounts(m.content)))];
  const ts = Math.max(...intentMsgs.map((m) => m.timestamp_ms || 0));
  candidates.push({ name: customer, ts, content, amounts, thread: key });
}

return [{ json: {
  candidates,
  minTs: minTs === Infinity ? null : minTs,
  maxTs: maxTs === -Infinity ? null : maxTs,
} }];
`.trim();

const classifyCode = `
function normalizeName(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[^\\p{L}\\p{N}]/gu, '').toLowerCase();
}
function levenshtein(a, b) {
  const s = [...a], t = [...b];
  const m = s.length, n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let cur = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}
function nameSimilarity(a, b) {
  const na = normalizeName(a), nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    const ratio = Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
    return Math.max(ratio, 0.6);
  }
  const dist = levenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length);
}
const INTENT_RE = /訂金|落單|下單|預訂|訂購|匯款|轉帳|轉數|過數|入數|留位|留俾|落訂|訂咗|想訂|要訂|deposit|order/i;
const PAYMENT_PROOF_RE = /已轉|已匯|已過數|過咗數|入咗|已入數|已付|已$|轉咗|付咗|後五碼|後5碼|尾五碼|轉左|過左數/i;
function hasOrderIntent(text) { return typeof text === 'string' && INTENT_RE.test(text); }
function hasPaymentProof(text) { return typeof text === 'string' && PAYMENT_PROOF_RE.test(text); }
function withinDays(tsMs, isoDate, days) {
  if (!tsMs || !isoDate) return false;
  const t2 = new Date(isoDate).getTime();
  if (!Number.isFinite(t2)) return false;
  return Math.abs(tsMs - t2) <= days * 86400000;
}
function scoreAgainst(candidate, rec, amountField, dateField, timeWindowDays) {
  const sim = nameSimilarity(candidate.name, rec.customer_name || '');
  const amts = candidate.amounts || [];
  const recAmt = Number(rec[amountField]);
  const amountHit = Number.isFinite(recAmt) && recAmt > 0 && amts.some((a) => a === recAmt);
  const timeHit = withinDays(candidate.ts, rec[dateField], timeWindowDays);
  return { sim, amountHit, timeHit, rec };
}
function best(arr, key) {
  return arr.reduce((b, x) => (x[key] > (b ? b[key] : -1) ? x : b), null);
}
function classify(candidate, orders, pipeline, opts) {
  const threshold = opts.threshold, timeWindowDays = opts.timeWindowDays;
  const oScores = orders.map((o) => scoreAgainst(candidate, o, 'deposit', 'created_at', timeWindowDays));
  const pScores = pipeline.map((p) => scoreAgainst(candidate, p, 'estimated_amount', 'created_at', timeWindowDays));
  const bestO = best(oScores, 'sim');
  const bestP = best(pScores, 'sim');
  const orderHit = bestO && (bestO.sim >= threshold || (bestO.amountHit && bestO.timeHit && bestO.sim >= 0.4));
  const pipeHit = bestP && (bestP.sim >= threshold || (bestP.amountHit && bestP.timeHit && bestP.sim >= 0.4));
  if (orderHit) return { status: 'matched_order', tier: null, reason: '名字相似 ' + bestO.sim.toFixed(2) + ' → ' + (bestO.rec.order_id || bestO.rec.customer_name) };
  if (pipeHit) return { status: 'in_pipeline', tier: null, reason: '在 pipeline → ' + bestP.rec.customer_name };
  let tier = '⚪';
  if (hasPaymentProof(candidate.content)) tier = '🔴';
  else if (hasOrderIntent(candidate.content)) tier = '🟡';
  return { status: 'leak', tier, reason: tier === '🔴' ? '有付款證據語且無訂單/不在 pipeline' : tier === '🟡' ? '有下單意圖但無付款證據' : '低信心（模糊）' };
}

const parsed = $('Parse Inbox').first().json;
const candidates = parsed.candidates || [];
function flattenItems(items) {
  const out = [];
  for (const it of items) {
    if (Array.isArray(it.json)) out.push(...it.json);
    else if (it.json && Object.keys(it.json).length) out.push(it.json);
  }
  return out;
}
const orders = flattenItems($('Fetch Orders').all());
const pipeline = flattenItems($input.all());

const results = [];
for (const c of candidates) {
  const cls = classify(c, orders, pipeline, { threshold: 0.6, timeWindowDays: 3 });
  results.push({ cand: c, cls });
}

const byTier = { '🔴': [], '🟡': [], '⚪': [] };
let matched = 0, inPipe = 0;
for (const r of results) {
  if (r.cls.status === 'matched_order') matched++;
  else if (r.cls.status === 'in_pipeline') inPipe++;
  else byTier[r.cls.tier].push(r);
}

const lines = [];
for (const tier of ['🔴', '🟡']) {
  for (const r of byTier[tier]) {
    lines.push(tier + ' ' + r.cand.name + '｜' + r.cls.reason + '｜thread:' + r.cand.thread);
  }
}

const coverage = (parsed.minTs && parsed.maxTs)
  ? new Date(parsed.minTs).toLocaleDateString() + ' ~ ' + new Date(parsed.maxTs).toLocaleDateString()
  : '（本次無可解析訊息）';

const summary = '🐶 IG漏單看門狗\\n覆蓋：' + coverage + '\\n🔴' + byTier['🔴'].length + ' 🟡' + byTier['🟡'].length + ' ⚪' + byTier['⚪'].length + ' ｜✅已對齊' + matched + ' 📋pipeline' + inPipe + '\\n候選總數：' + candidates.length + '\\n\\n' + (lines.slice(0, 15).join('\\n') || '（本次無待跟進項目）');

return [{ json: { summary, red: byTier['🔴'].length, yellow: byTier['🟡'].length, gray: byTier['⚪'].length, matched, inPipe, total: candidates.length } }];
`.trim();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const workflow = {
  name: "FHS_IGWatchdog_DriveWatch",
  nodes: [
    {
      parameters: { pollTimes: { item: [{ mode: "everyHour" }] }, triggerOn: "specificFolder", folderToWatch: { __rl: true, mode: "id", value: "root" }, event: "fileCreated" },
      id: "gdt1", name: "Google Drive Trigger", type: "n8n-nodes-base.googleDriveTrigger", typeVersion: 1, position: [220, 300],
      credentials: {}
    },
    {
      parameters: {
        conditions: { options: { caseSensitive: false, leftValue: "", typeValidation: "loose" },
          conditions: [{ leftValue: "={{$json.name}}", rightValue: ".zip", operator: { type: "string", operation: "contains" } }],
          combinator: "and" },
        options: {}
      },
      id: "if1", name: "Is ZIP", type: "n8n-nodes-base.if", typeVersion: 2, position: [440, 300]
    },
    {
      parameters: { operation: "download", fileId: { __rl: true, mode: "id", value: "={{$json.id}}" }, options: {} },
      id: "gd1", name: "Download File", type: "n8n-nodes-base.googleDrive", typeVersion: 3, position: [660, 220],
      credentials: {}
    },
    {
      parameters: { operation: "decompress", binaryPropertyName: "data", outputPrefix: "out_", options: {} },
      id: "comp1", name: "Decompress", type: "n8n-nodes-base.compression", typeVersion: 1, position: [880, 220]
    },
    {
      parameters: { mode: "runOnceForAllItems", jsCode: parseInboxCode },
      id: "pi1", name: "Parse Inbox", type: "n8n-nodes-base.code", typeVersion: 2, position: [1100, 220]
    },
    {
      parameters: {
        method: "GET",
        url: SUPABASE_URL + "/rest/v1/orders?select=order_id,customer_name,deposit,final_sale_price,created_at,confirmed_at,full_order_text&order=created_at.desc&limit=500",
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: "apikey", value: SUPABASE_ANON_KEY },
          { name: "Authorization", value: "Bearer " + SUPABASE_ANON_KEY }
        ] },
        options: {}
      },
      id: "http1", name: "Fetch Orders", type: "n8n-nodes-base.httpRequest", typeVersion: 4, position: [1320, 220],
      alwaysOutputData: true
    },
    {
      parameters: {
        method: "GET",
        url: SUPABASE_URL + "/rest/v1/sales_pipeline?select=customer_name,estimated_amount,created_at,raw_message,query_details,stage&order=created_at.desc&limit=500",
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: "apikey", value: SUPABASE_ANON_KEY },
          { name: "Authorization", value: "Bearer " + SUPABASE_ANON_KEY }
        ] },
        options: {}
      },
      id: "http2", name: "Fetch Pipeline", type: "n8n-nodes-base.httpRequest", typeVersion: 4, position: [1540, 220],
      alwaysOutputData: true
    },
    {
      parameters: { jsCode: classifyCode },
      id: "cr1", name: "Classify & Report", type: "n8n-nodes-base.code", typeVersion: 2, position: [1760, 220]
    },
    {
      parameters: { resource: "message", operation: "sendMessage", chatId: "7620524971", text: "={{$json.summary}}", replyMarkup: "none", additionalFields: {} },
      id: "tg1", name: "Telegram Notify", type: "n8n-nodes-base.telegram", typeVersion: 1.2, position: [1980, 220],
      credentials: { telegramApi: { id: "tSbXz97PKmdPpDNq", name: "Telegram account" } }
    }
  ],
  connections: {
    "Google Drive Trigger": { main: [[{ node: "Is ZIP", type: "main", index: 0 }]] },
    "Is ZIP": { main: [[{ node: "Download File", type: "main", index: 0 }], []] },
    "Download File": { main: [[{ node: "Decompress", type: "main", index: 0 }]] },
    "Decompress": { main: [[{ node: "Parse Inbox", type: "main", index: 0 }]] },
    "Parse Inbox": { main: [[{ node: "Fetch Orders", type: "main", index: 0 }]] },
    "Fetch Orders": { main: [[{ node: "Fetch Pipeline", type: "main", index: 0 }]] },
    "Fetch Pipeline": { main: [[{ node: "Classify & Report", type: "main", index: 0 }]] },
    "Classify & Report": { main: [[{ node: "Telegram Notify", type: "main", index: 0 }]] }
  },
  settings: {}
};

const path = require('path');
const outDir = path.join(__dirname, '..', '..', '.fhs-local', 'ig-watchdog');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'n8n_workflow_built.json');
fs.writeFileSync(outFile, JSON.stringify(workflow, null, 2));
console.log('written:', outFile);