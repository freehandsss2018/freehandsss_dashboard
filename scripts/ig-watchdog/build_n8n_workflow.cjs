// build_n8n_workflow.cjs — 產生/更新 n8n workflow「FHS_IGWatchdog_DriveWatch」
// 方案 C v2（Session 110 收尾 cl-flow 重估，Flow ID 2026-06-20-0112，Phase 0 實測 F1-F7 驅動）
//
// v1（2026-06-19）假設 Meta 匯出到 Drive 是單一 ZIP + Drive Trigger 監測 root。兩者皆被
// Phase 0 實測證偽：(a) Drive 目的地直接鏡射解壓後的資料夾樹，無 ZIP；(b) Drive Trigger
// 「子資料夾內變動不觸發」，且每日新增的 instagram-* 子資料夾本身就是「新資料夾」事件，
// 不是 root 下的「新檔案」事件。v2 改為 Cron 主動輪詢 + Google Drive Search 節點逐層
// scoped 查詢（'parentId' in parents），不再依賴任何 Trigger 或 ZIP 解壓。
//
// Phase 0 實測關鍵（決定了以下節點的精確參數形狀，勿憑記憶改寫）：
//   F1 — Google Drive 節點要做「原始 Drive q 查詢」必須 searchMethod:'query' + queryString；
//        filter.query 會被靜默忽略（變成無過濾全列）；searchMethod:'name' 會把字串套進
//        `name contains '...'` 範本造成雙重引號 400。
//   F2 — mimeType='application/json' 可乾淨排除 photos/videos，媒體零下載。
//   F3 — options.fields 要傳陣列（如 ['id','name','parents','modifiedTime']），傳字串會
//        在 prepareQueryString 階段 throw `fields.join is not a function`。
//   F4 — 把「無 parent 限定的全域 flat query」接在多輸入節點下游會被 n8n「每輸入項執行
//        一次」造成 N 倍重複（曾誤判為 Drive API bug，後證實是執行拓樸問題）。本檔所有
//        Drive Search 節點都明確 scoped 到單一已知 parent id，不犯這個地雷。
//   F5 — scoped 查詢（'parentId' in parents）零重複、可直接拿到資料夾名稱。
//   F6 — 已確認同一容器資料夾下會累積多個 instagram-* 子資料夾（每日一個），thread 名稱
//        跨子資料夾重複，故已處理追蹤必須用「資料夾 id」而非名稱。
//   F7 — pairedItem 在 Drive Search 的 fan-out 後可正確透過 $('NodeName').item 取回，
//        因此可以安全用多層 scoped Drive Search 串接，逐層用 $('上一層節點').item.json.id
//        當下一層查詢的 parent，不需要額外的 Merge/Set 節點補救 context 遺失。
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
// ⚠️ PUT 會整個覆寫 workflow，包含 credentials 區塊。Google Drive 系列節點的 credential
// 沒有透過 API 拿到 ID（n8n Public API 不提供 credential 列表），套用後務必回 n8n 編輯器
// 手動重新指派這些節點的 Google Drive credential（Telegram credential 已知 ID 可保留）。
//
// ⚠️ 若採用「GET 現有 workflow → 修改 → PUT 回去」的外科手術方式，PUT body 只能包含
// { name, nodes, connections, settings } 四個核心欄位；GET 回傳的 active / versionId /
// isArchived / shared 等欄位會導致 HTTP 400 "must NOT have additional properties"。
//
// ⚠️ 容器資料夾 ID（CONTAINER_FOLDER_ID）目前是寫死常數。Meta 官方文件未保證此容器長期
// 穩定（PX 研究結論：folder structure 無穩定性保證），僅憑本帳號已觀察到 2 次匯出
// （6-18、6-19）皆落在同一容器佐證。heartbeat（4.1）會在容器真的輪替/改名時，因「連續
// 48h 找不到新 instagram-* 子資料夾」而告警，屆時需手動更新此常數並重新產生 workflow。
const CONTAINER_FOLDER_ID = '1eqlGpQuaTt23gLhjm5UBYYxE0QC8pdQ0'; // meta-2026-Jun-18-06-12-02

const fs = require('fs');
const nodePath = require('path');

// Load .env from repo root so SUPABASE_URL / SUPABASE_ANON_KEY are available
const envPath = nodePath.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
  });
}

// ── 單一真源：訂號偵測邏輯內嵌自 lib/order-match.mjs（v3，非手抄）──────────────
// build 時讀取 ESM 原始碼、strip `export ` 後嵌入 Classify Code 節點。diff-guard 測試
// （order-match.diffguard.test.mjs）斷言此嵌入與 lib 來源逐字一致，防雙處漂移。
const ORDER_MATCH_SRC = fs
  .readFileSync(nodePath.join(__dirname, 'lib', 'order-match.mjs'), 'utf8')
  .replace(/^export\s+/gm, '');

// ── Filter New + Quiet Window ──────────────────────────────────────────────
// 讀 staticData.processedFolderIds（已處理過的 instagram-* 資料夾 id 集合，F6：用 id 非名稱）。
// 排除 modifiedTime 在 90 分鐘內的資料夾（靜止窗，避免讀到 Meta 仍在寫入的匯出）。
// 永遠輸出至少 1 個 item：若無新資料夾合格，輸出 1 個 sentinel { __noNewFolders: true }，
// 否則輸出每個合格資料夾各 1 項，並立即把該資料夾 id 標記為已處理（best-effort 語意：
// 標記了「本次已嘗試處理」，不保證下游解析成功；避免下游失敗時無限重試同一資料夾）。
const filterNewCode = `
const staticData = $getWorkflowStaticData('global');
if (!staticData.igWatchdog) staticData.igWatchdog = {};
const sd = staticData.igWatchdog;
if (!Array.isArray(sd.processedFolderIds)) sd.processedFolderIds = [];
const processedSet = new Set(sd.processedFolderIds);

const QUIET_WINDOW_MS = 90 * 60 * 1000;
const now = Date.now();

const all = $input.all();
const qualifying = [];
for (const item of all) {
  const j = item.json;
  if (!j || !j.id) continue;
  if (processedSet.has(j.id)) continue;
  const mtime = new Date(j.modifiedTime).getTime();
  if (!Number.isFinite(mtime)) continue;
  if (now - mtime < QUIET_WINDOW_MS) continue; // 仍可能在寫入中
  qualifying.push(j);
}

if (qualifying.length === 0) {
  sd.lastScanAt = new Date(now).toISOString();
  return [{ json: { __noNewFolders: true } }];
}

for (const j of qualifying) processedSet.add(j.id);
sd.processedFolderIds = [...processedSet];
sd.lastScanAt = new Date(now).toISOString();
sd.lastNewFolderAt = new Date(now).toISOString();

return qualifying.map((j) => ({ json: { ...j, __noNewFolders: false } }));
`.trim();

// ── Tag Thread Context ─────────────────────────────────────────────────────
// 在「Find Message Files」之後、「Download File」之前，把 thread 資料夾名稱（F7：scoped
// 查詢直接拿到，不必再從檔名路徑反推）與匯出資料夾名稱一併標記進 item.json，供 Parse
// Inbox 使用。mode: runOnceForEachItem，用 $('NodeName').item 取回上層 paired 項目
// （已驗證 fan-out 後仍正確配對）。
const tagThreadContextCode = `
const threadFolder = $('List Thread Folders').item.json;
const exportFolder = $('Filter New + Quiet Window').item.json;
return {
  json: {
    ...$json,
    __threadName: threadFolder.name,
    __exportFolderName: exportFolder.name,
  },
};
`.trim();

// ── Parse Inbox ──────────────────────────────────────────────────────────
// v2：thread 名稱來自上游 __threadName（scoped 查詢直接給，F7），不再用檔名 regex 反推
// threadKey。新增 per-thread message timestamp cursor（staticData.threadCursors），只取
// 大於上次 cursor 的訊息——增量或全量匯出皆正確，不依賴「增量 vs 全量」結論。
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

const staticData = $getWorkflowStaticData('global');
if (!staticData.igWatchdog) staticData.igWatchdog = {};
const sd = staticData.igWatchdog;
if (!sd.threadCursors) sd.threadCursors = {};

// id 去重保險（防禦性；Phase 0 實測本查詢形狀未見檔案級重複，但保留此檢查零成本）
const seenFileIds = new Set();
const __items = $input.all();
const threads = new Map(); // threadKey(資料夾名) -> { participants, messages, title }
let scannedFiles = 0;

for (let __i = 0; __i < __items.length; __i++) {
  const item = __items[__i];
  const threadKey = item.json.__threadName || '(未知thread)';
  for (const [key, bin] of Object.entries(item.binary || {})) {
    const fileId = item.json.id;
    if (fileId && seenFileIds.has(fileId)) continue;
    if (fileId) seenFileIds.add(fileId);
    let data;
    try {
      const buf = await this.helpers.getBinaryDataBuffer(__i, key);
      data = decodeDeep(JSON.parse(buf.toString('utf8')));
    } catch (e) { continue; }
    scannedFiles++;
    if (!threads.has(threadKey)) threads.set(threadKey, { participants: new Set(), messages: [], title: '' });
    const t = threads.get(threadKey);
    if (data.title) t.title = data.title;
    for (const p of data.participants || []) if (p && p.name) t.participants.add(p.name);
    for (const m of data.messages || []) t.messages.push(m);
  }
}

const candidates = [];
const orderMsgs = [];
let minTs = Infinity, maxTs = -Infinity;
for (const [threadKey, t] of threads) {
  const cursor = sd.threadCursors[threadKey] || 0;
  const newMsgs = t.messages.filter((m) => Number.isFinite(m.timestamp_ms) && m.timestamp_ms > cursor);
  if (t.messages.length > 0) {
    const newMax = Math.max(cursor, ...t.messages.map((m) => m.timestamp_ms || 0));
    sd.threadCursors[threadKey] = newMax;
  }
  for (const m of newMsgs) {
    if (m.timestamp_ms < minTs) minTs = m.timestamp_ms;
    if (m.timestamp_ms > maxTs) maxTs = m.timestamp_ms;
  }
  const customer = [...t.participants].find((n) => !isBusiness(n)) || t.title || threadKey;
  // v3 訂號偵測：收集所有新訊息（含商家自發的 V42 確認，v1 曾排除，v3 反轉納入）。
  // hasReceipt = 訊息含 photos metadata（DYI JSON 內的 uri 參照，方案 A 零下載/零 OCR）。
  for (const m of newMsgs) {
    if (!m.content && !(m.photos && m.photos.length)) continue;
    orderMsgs.push({
      text: m.content || '',
      sender: m.sender_name || '',
      customer,
      thread: threadKey,
      ts: m.timestamp_ms || 0,
      hasReceipt: !!(m.photos && m.photos.length),
    });
  }
  const custMsgs = newMsgs.filter((m) => m.content && !isBusiness(m.sender_name));
  const intentMsgs = custMsgs.filter((m) => hasOrderIntent(m.content) || hasPaymentProof(m.content));
  if (intentMsgs.length === 0) continue;
  const content = intentMsgs.map((m) => m.content).join(' ┆ ');
  const amounts = [...new Set(intentMsgs.flatMap((m) => extractAmounts(m.content)))];
  const ts = Math.max(...intentMsgs.map((m) => m.timestamp_ms || 0));
  candidates.push({ name: customer, ts, content, amounts, thread: threadKey });
}

return [{ json: {
  candidates,
  orderMsgs,
  scannedThreads: threads.size,
  scannedFiles,
  minTs: minTs === Infinity ? null : minTs,
  maxTs: maxTs === -Infinity ? null : maxTs,
} }];
`.trim();

// ── Classify & Report（v3 訂號主鍵偵測）─────────────────────────────────────
// 內嵌 lib/order-match.mjs 原始碼（單一真源，strip export），再接 v3 編排：
// 以訂號比對 Supabase orders → 情況1靜默 / 情況2資訊不齊通知 / 情況3未建立通知 /
// 弱訊號(無號)不即時警報。付款證據 🔴🟡⚪ 降 Phase 2（本期不計，候選保留供日後）。
// 健全計數器（scannedThreads/scannedFiles/訊息數）讓 Telegram 摘要自我揭穿異常（F4 教訓）。
const classifyCode = `
${ORDER_MATCH_SRC}

// ── v3 編排 ──────────────────────────────────────────────────
const parsed = $('Parse Inbox').first().json;
const orderMsgs = parsed.orderMsgs || [];
function flattenItems(items) {
  const out = [];
  for (const it of items) {
    if (Array.isArray(it.json)) out.push(...it.json);
    else if (it.json && Object.keys(it.json).length) out.push(it.json);
  }
  return out;
}
const orders = flattenItems($('Fetch Orders').all());
const orderIndex = buildOrderIndex(orders);

const notifyItems = [];
let cFull = 0, cIncomplete = 0, cNotCreated = 0, cWeak = 0;
for (const om of orderMsgs) {
  const cls = classifyMessage({ text: om.text, hasReceipt: om.hasReceipt }, orderIndex);
  if (cls.category === 'created_full') cFull++;
  else if (cls.category === 'created_incomplete') { cIncomplete++; notifyItems.push({ om, cls, kind: '資訊不齊' }); }
  else if (cls.category === 'not_created') { cNotCreated++; notifyItems.push({ om, cls, kind: '未建立' }); }
  else if (cls.category === 'weak_no_id') cWeak++;
}

function sideBySide(it) {
  const om = it.om, cls = it.cls;
  const rec = orderIndex.get(cls.orderId);
  const dbSide = rec
    ? 'DB：✅有單 ' + (rec.customer_name || '') + (rec.deposit != null ? ' 訂金$' + rec.deposit : '')
    : 'DB：❌查無此單';
  const head = (it.kind === '未建立' ? '🆕 未建立' : '📝 資訊不齊') + '｜訂號 ' + (cls.orderId || '?');
  const snippet = (om.text || '').slice(0, 40).replace(/\\s+/g, ' ');
  const msgSide = '訊息：' + (om.customer || om.sender || '') + '「' + snippet + '」' + (cls.hasReceipt ? ' 📎收據' : '');
  return head + '\\n  ' + msgSide + '\\n  ' + dbSide + '\\n  thread:' + om.thread;
}

const coverage = (parsed.minTs && parsed.maxTs)
  ? new Date(parsed.minTs).toLocaleDateString() + ' ~ ' + new Date(parsed.maxTs).toLocaleDateString()
  : '（本次無新訊息）';

const detailLines = notifyItems.slice(0, 15).map(sideBySide);
const summary = '🐶 IG漏單看門狗 v3（訂號偵測）\\n覆蓋：' + coverage
  + '\\n掃描：' + (parsed.scannedThreads || 0) + ' threads / ' + (parsed.scannedFiles || 0) + ' 檔 / ' + orderMsgs.length + ' 則訊息'
  + '\\n✅已建立 ' + cFull + ' ｜📝資訊不齊 ' + cIncomplete + ' ｜🆕未建立 ' + cNotCreated + ' ｜⚠️弱訊號(無號) ' + cWeak
  + '\\n需核對：' + notifyItems.length + '\\n\\n'
  + (detailLines.join('\\n\\n') || '（本次無需核對項目）');

const alerts = notifyItems.map(it => ({
  alert_date: new Date().toISOString().slice(0, 10),
  order_id: it.cls.orderId || null,
  kind: it.cls.category,
  category: it.cls.category,
  customer_name: it.om.customer || it.om.sender || null,
  snippet: (it.om.text || '').slice(0, 40),
  thread: it.om.thread || null,
  has_receipt: it.om.hasReceipt || false,
  db_matched: it.cls.category === 'created_incomplete',
  raw: { om: it.om, cls: it.cls },
}));
return [{ json: { summary, createdFull: cFull, incomplete: cIncomplete, notCreated: cNotCreated, weak: cWeak, notify: notifyItems.length, total: orderMsgs.length, alerts } }];
`.trim();

// ── Build Empty Summary（無新匯出資料夾時的分支）──────────────────────────
const emptySummaryCode = `
const staticData = $getWorkflowStaticData('global');
const sd = (staticData.igWatchdog) || {};
const lastNewFolderAt = sd.lastNewFolderAt ? new Date(sd.lastNewFolderAt) : null;
const hoursSinceLastNewFolder = lastNewFolderAt ? Math.round((Date.now() - lastNewFolderAt.getTime()) / 3600000) : null;

let summary = '🐶 IG漏單看門狗\\n本次掃描：0 個新匯出資料夾（無需處理）';
if (hoursSinceLastNewFolder !== null && hoursSinceLastNewFolder >= 48) {
  summary += '\\n⚠️ 距上次新匯出已 ' + hoursSinceLastNewFolder + ' 小時——疑似排程到期或 OAuth 失效，請查 Meta Accounts Center';
}
return [{ json: { summary, red: 0, yellow: 0, gray: 0, matched: 0, inPipe: 0, total: 0 } }];
`.trim();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const workflow = {
  name: 'FHS_IGWatchdog_DriveWatch',
  nodes: [
    {
      parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 6 * * *' }] } },
      id: 'sched1', name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [200, 300],
    },
    {
      // F1+F6: scoped 到已知容器，只列 instagram-* 子資料夾；returnAll 安全（此層 fan-out 量小，每日新增僅 1 個）
      parameters: {
        authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
        queryString: `='${CONTAINER_FOLDER_ID}' in parents and name contains 'instagram-' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        returnAll: false, limit: 50, filter: {},
        options: { fields: ['id', 'name', 'modifiedTime'] },
      },
      id: 'find_export_folders', name: 'Find New Export Folders', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [420, 300],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: filterNewCode },
      id: 'filter_new', name: 'Filter New + Quiet Window', type: 'n8n-nodes-base.code', typeVersion: 2, position: [640, 300],
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
          conditions: [{ leftValue: '={{$json.__noNewFolders}}', rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
          combinator: 'and',
        },
        options: {},
      },
      id: 'if_empty', name: 'No New Folders?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [860, 300],
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: emptySummaryCode },
      id: 'empty_summary', name: 'Build Empty Summary', type: 'n8n-nodes-base.code', typeVersion: 2, position: [1080, 200],
    },
    // ── scoped 逐層下探：export folder -> your_instagram_activity -> messages -> inbox ──
    {
      parameters: {
        authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
        queryString: "='{{$json.id}}' in parents and name='your_instagram_activity' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        returnAll: false, limit: 5, filter: {}, options: { fields: ['id', 'name'] },
      },
      id: 'find_activity', name: 'Find your_instagram_activity', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [1080, 420],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      parameters: {
        authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
        queryString: "='{{$json.id}}' in parents and name='messages' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        returnAll: false, limit: 5, filter: {}, options: { fields: ['id', 'name'] },
      },
      id: 'find_messages_folder', name: 'Find messages', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [1300, 420],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      parameters: {
        authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
        queryString: "='{{$json.id}}' in parents and name='inbox' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        returnAll: false, limit: 5, filter: {}, options: { fields: ['id', 'name'] },
      },
      id: 'find_inbox', name: 'Find inbox', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [1520, 420],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      // F5: scoped 列 inbox 下所有 thread 資料夾，直接拿到名稱（取代 v1 的檔名路徑反推，F7）
      parameters: {
        authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
        queryString: "='{{$json.id}}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false",
        returnAll: true, filter: {}, options: { fields: ['id', 'name'] },
      },
      id: 'list_threads', name: 'List Thread Folders', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [1740, 420],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      // F2: mimeType=json 排除媒體；F3: options.fields 須陣列
      parameters: {
        authentication: 'oAuth2', resource: 'fileFolder', operation: 'search', searchMethod: 'query',
        queryString: "='{{$json.id}}' in parents and name contains 'message_' and mimeType='application/json' and trashed=false",
        returnAll: true, filter: {}, options: { fields: ['id', 'name', 'parents', 'modifiedTime'] },
      },
      id: 'find_message_files', name: 'Find Message Files', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [1960, 420],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      // F7: pairedItem 在 fan-out 後可靠，用 $('NodeName').item 把 thread 名稱/匯出資料夾名稱帶下去
      parameters: { mode: 'runOnceForEachItem', jsCode: tagThreadContextCode },
      id: 'tag_thread', name: 'Tag Thread Context', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2180, 420],
    },
    {
      parameters: { operation: 'download', fileId: { __rl: true, mode: 'id', value: '={{$json.id}}' }, options: { binaryPropertyName: 'data' } },
      id: 'download_msg', name: 'Download File', type: 'n8n-nodes-base.googleDrive', typeVersion: 3, position: [2400, 420],
      credentials: { googleDriveOAuth2Api: { id: 'zQHavrW0ElfaKGxG', name: 'Google Drive account' } },
    },
    {
      parameters: { mode: 'runOnceForAllItems', jsCode: parseInboxCode },
      id: 'pi1', name: 'Parse Inbox', type: 'n8n-nodes-base.code', typeVersion: 2, position: [2620, 420],
    },
    {
      parameters: {
        method: 'GET',
        url: SUPABASE_URL + '/rest/v1/orders?select=order_id,customer_name,deposit,final_sale_price,created_at,confirmed_at,full_order_text&order=created_at.desc&limit=500',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'apikey', value: SUPABASE_ANON_KEY },
          { name: 'Authorization', value: 'Bearer ' + SUPABASE_ANON_KEY },
        ] },
        options: {},
      },
      id: 'http1', name: 'Fetch Orders', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [2840, 420],
      alwaysOutputData: true,
    },
    {
      parameters: {
        method: 'GET',
        url: SUPABASE_URL + '/rest/v1/sales_pipeline?select=customer_name,estimated_amount,created_at,raw_message,query_details,stage&order=created_at.desc&limit=500',
        sendHeaders: true,
        headerParameters: { parameters: [
          { name: 'apikey', value: SUPABASE_ANON_KEY },
          { name: 'Authorization', value: 'Bearer ' + SUPABASE_ANON_KEY },
        ] },
        options: {},
      },
      id: 'http2', name: 'Fetch Pipeline', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [3060, 420],
      alwaysOutputData: true,
    },
    {
      parameters: { jsCode: classifyCode },
      id: 'cr1', name: 'Classify & Report', type: 'n8n-nodes-base.code', typeVersion: 2, position: [3280, 420],
    },
    {
      // 守衛：alerts 為空時跳過寫入，直接發 Telegram 摘要；防止 POST [] 到 Supabase（PostgREST 無法
      // 從空陣列讀取欄位名稱，報 "Could not find the '[]' column" 導致 workflow 中斷）
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
          conditions: [{ leftValue: '={{$json.alerts.length}}', rightValue: 0, operator: { type: 'number', operation: 'gt' } }],
          combinator: 'and',
        },
        options: {},
      },
      id: 'if_alerts', name: 'Has Alerts?', type: 'n8n-nodes-base.if', typeVersion: 2, position: [3500, 420],
    },
    {
      // Phase 1b: 批量寫入 ig_watchdog_alerts（service_role key，冪等 UPSERT ON CONFLICT DO NOTHING）
      // 只在 alerts.length > 0 時執行（Has Alerts? true 分支），防空陣列 POST
      parameters: {
        method: 'POST',
        url: SUPABASE_URL + '/rest/v1/ig_watchdog_alerts',
        authentication: 'none',
        sendHeaders: true,
        specifyHeaders: 'keypair',
        headerParameters: { parameters: [
          { name: 'apikey', value: SUPABASE_SERVICE_KEY },
          { name: 'Authorization', value: 'Bearer ' + SUPABASE_SERVICE_KEY },
          { name: 'Content-Type', value: 'application/json' },
          { name: 'Prefer', value: 'resolution=ignore-duplicates,return=minimal' },
        ] },
        sendBody: true,
        contentType: 'json',
        specifyBody: 'string',
        body: "={{ JSON.stringify($('Classify & Report').first().json.alerts) }}",
        options: {},
      },
      id: 'wa1', name: 'Write Alerts', type: 'n8n-nodes-base.httpRequest', typeVersion: 4, position: [3720, 420],
      alwaysOutputData: true,
    },
    {
      // 空資料夾路徑（Build Empty Summary）接的 Telegram
      parameters: { resource: 'message', operation: 'sendMessage', chatId: '7620524971', text: '={{$json.summary}}', replyMarkup: 'none', additionalFields: {} },
      id: 'tg1', name: 'Telegram Notify', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [3280, 300],
      credentials: { telegramApi: { id: 'tSbXz97PKmdPpDNq', name: 'Telegram account' } },
    },
    {
      // 資料路徑接的 Telegram，讀 cr1 的 summary + Phase 3 深連結（alerts > 0 時附 V42 igwatch 連結）
      parameters: { resource: 'message', operation: 'sendMessage', chatId: '7620524971', text: "={{ $('Classify & Report').first().json.summary + $('Classify & Report').first().json.alerts.filter(a => a.order_id && (a.kind === 'created_incomplete' || a.kind === 'not_created')).map(a => '\\n🔗 ' + a.order_id + ': https://yanhei.synology.me:5006/web/Freehandsss_dashboard_current.html?view=igwatch&orderId=' + a.order_id).join('') }}", replyMarkup: 'none', additionalFields: {} },
      id: 'tg2', name: 'Telegram Notify (Data)', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [3720, 300],
      credentials: { telegramApi: { id: 'tSbXz97PKmdPpDNq', name: 'Telegram account' } },
    },
  ],
  connections: {
    'Schedule Trigger': { main: [[{ node: 'Find New Export Folders', type: 'main', index: 0 }]] },
    'Find New Export Folders': { main: [[{ node: 'Filter New + Quiet Window', type: 'main', index: 0 }]] },
    'Filter New + Quiet Window': { main: [[{ node: 'No New Folders?', type: 'main', index: 0 }]] },
    'No New Folders?': {
      main: [
        [{ node: 'Build Empty Summary', type: 'main', index: 0 }],
        [{ node: 'Find your_instagram_activity', type: 'main', index: 0 }],
      ],
    },
    'Build Empty Summary': { main: [[{ node: 'Telegram Notify', type: 'main', index: 0 }]] },
    'Find your_instagram_activity': { main: [[{ node: 'Find messages', type: 'main', index: 0 }]] },
    'Find messages': { main: [[{ node: 'Find inbox', type: 'main', index: 0 }]] },
    'Find inbox': { main: [[{ node: 'List Thread Folders', type: 'main', index: 0 }]] },
    'List Thread Folders': { main: [[{ node: 'Find Message Files', type: 'main', index: 0 }]] },
    'Find Message Files': { main: [[{ node: 'Tag Thread Context', type: 'main', index: 0 }]] },
    'Tag Thread Context': { main: [[{ node: 'Download File', type: 'main', index: 0 }]] },
    'Download File': { main: [[{ node: 'Parse Inbox', type: 'main', index: 0 }]] },
    'Parse Inbox': { main: [[{ node: 'Fetch Orders', type: 'main', index: 0 }]] },
    'Fetch Orders': { main: [[{ node: 'Fetch Pipeline', type: 'main', index: 0 }]] },
    'Fetch Pipeline': { main: [[{ node: 'Classify & Report', type: 'main', index: 0 }]] },
    'Classify & Report': { main: [[{ node: 'Has Alerts?', type: 'main', index: 0 }]] },
    'Has Alerts?': {
      main: [
        [{ node: 'Write Alerts', type: 'main', index: 0 }],          // true: 有警報 → 寫入 + Telegram
        [{ node: 'Telegram Notify (Data)', type: 'main', index: 0 }], // false: 無警報 → 直接 Telegram
      ],
    },
    'Write Alerts': { main: [[{ node: 'Telegram Notify (Data)', type: 'main', index: 0 }]] },
  },
  settings: {},
};

const path = require('path');
const outDir = path.join(__dirname, '..', '..', '.fhs-local', 'ig-watchdog');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'n8n_workflow_built.json');
fs.writeFileSync(outFile, JSON.stringify(workflow, null, 2));
console.log('written:', outFile);
