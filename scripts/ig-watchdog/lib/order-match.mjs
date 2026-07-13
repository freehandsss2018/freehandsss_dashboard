// order-match.mjs — IG 漏單看門狗 v3「訂號主鍵偵測」單一真源
//
// 設計原則（cl-final-plan 2026-06-23-0257 v2）：
// - 主鍵＝訂單編號 order_id，非模糊客名（後者為 Phase 2 付款證據層，本檔不處理）。
// - 訊號＝帶訂單特徵的訊息，含「商家發出的 V42 制式確認」（v1 曾刻意排除，v3 反轉納入）。
// - 比對 Supabase orders.order_id：命中＝已建立；查無＝未建立。
// - 三分類（Fat Mo 決策：情況 2 合併通知）：
//     情況1 created_full       V42 制式文本 + 訂號在 DB        → 靜默
//     情況2 created_incomplete 鬆散訊息   + 訂號在 DB（資訊不齊）→ 通知（請核對補全）
//     情況3 not_created        有可信訂號 + 訂號不在 DB        → 通知（請補單）
//     弱訊號 weak_no_id        有成交語意 + 抽不到訂號          → 不即時警報，匯總低優
//     忽略   ignore            無訂單訊號 / 報價草稿被抑制
// - 真實 order_id 格式（live 校準 2026-06-23，31 單）：全部 leading 0 的 7–8 位純數字
//   （06xxxxx ×29、05xxxxx ×2，8 位 06001xxx ×2）。HK 電話 8 位起 2/3/5/6/9 不以 0 開頭 → 天然防撞。
// - 唯讀：本檔不寫任何業務表，不觸 captureFormState/raw_form_state/確收三欄。
//
// ⚠️ 單一真源：build_n8n_workflow.cjs 於 build 時內嵌本檔原始碼（非手抄），diff-guard 測試保證一致。

// ── 文字正規化 ──────────────────────────────────────────────
/** 全形數字/英文/標點 → 半形。 */
export function toHalfWidth(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
          .replace(/　/g, ' ');
}

/** 訂號正規化：全形→半形、去頭尾空白與包夾標點、英數型轉大寫；**保留前導零**（0600101 ≠ 600101）。 */
export function normalizeOrderId(s) {
  if (s == null) return '';
  let t = toHalfWidth(String(s)).trim();
  // 去除包夾的標點/括號/井號，但保留內部英數與連字號（FHS- 型）
  t = t.replace(/^[^0-9A-Za-z]+/, '').replace(/[^0-9A-Za-z]+$/, '');
  return t.toUpperCase();
}

// ── 訂號抽取 ────────────────────────────────────────────────
// 數字型：leading 0 + 共 7–8 位（lookaround 防黏連更長數字串，如電話/金額/日期）
const NUM_ID_RE = /(?<!\d)0\d{6,7}(?!\d)/g;
// 英數型（防禦性，現行 live 無此型，但 V42 ${orderId} 理論可為英數）
const FHS_ID_RE = /\bFHS-[A-Z0-9]{4,}\b/gi;
// V42 制式確認：「Freehandsss 訂單確認」+「(訂單編號# XXX …)」
const V42_HEADER_RE = /Freehandsss\s*訂單確認/i;
const ORDER_LABEL_RE = /訂單編號\s*#?\s*([0-9A-Za-z\-]+)/;  // 抓「訂單編號#」後的 token

/** 是否 V42 制式商家確認文本。 */
export function isV42Confirm(text) {
  return typeof text === 'string' && V42_HEADER_RE.test(toHalfWidth(text)) && ORDER_LABEL_RE.test(toHalfWidth(text));
}

// ── 語意守衛（報價判定樹）──────────────────────────────────
// 正面成交語意（鬆散訊息採信裸號的必要條件）
const DEAL_RE = /已收訂金|已收訂|已落單|落咗單|已下單|已付訂|訂金已收|確認單|單號|訂單編號|成交|已確認|落單成功/i;
// 負面：報價/草稿/未成交
const QUOTE_RE = /報價|報下價|計下價|草稿|暫定|考慮緊|問下|睇下|諗下|未落單|未確認|查詢/i;

export function hasDealIntent(text) { return typeof text === 'string' && DEAL_RE.test(toHalfWidth(text)); }
export function hasQuoteDraft(text) { return typeof text === 'string' && QUOTE_RE.test(toHalfWidth(text)); }

/**
 * 抽訂號。回傳 { ids:[正規化訂號], fromV42:bool, rawHits:[原始命中] }。
 * V42 制式文本優先用「訂單編號#」後 token；否則全文掃數字型/英數型。
 */
export function extractOrderIds(text) {
  const out = new Set();
  const raw = [];
  if (typeof text !== 'string' || !text) return { ids: [], fromV42: false, rawHits: [] };
  const t = toHalfWidth(text);
  const fromV42 = isV42Confirm(text);

  if (fromV42) {
    const m = t.match(ORDER_LABEL_RE);
    if (m && m[1]) { const n = normalizeOrderId(m[1]); if (n) { out.add(n); raw.push(m[1]); } }
  }
  for (const m of t.matchAll(NUM_ID_RE)) { const n = normalizeOrderId(m[0]); if (n) { out.add(n); raw.push(m[0]); } }
  for (const m of t.matchAll(FHS_ID_RE)) { const n = normalizeOrderId(m[0]); if (n) { out.add(n); raw.push(m[0]); } }
  return { ids: [...out], fromV42, rawHits: raw };
}

// ── 主分類 ──────────────────────────────────────────────────
/**
 * 分類單則訊息。
 * @param msg {{text:string, hasReceipt?:boolean}}
 * @param orderIndex Set<string>|Map<string,object> 正規化訂號集合（來自 Supabase orders.order_id 正規化後）
 * @param opts {{}}
 * @returns {{category, notify, orderId, fromV42, reason, hasReceipt}}
 *   category ∈ created_full | created_incomplete | not_created | weak_no_id | ignore
 */
export function classifyMessage(msg, orderIndex, opts = {}) {
  const text = (msg && msg.text) || '';
  const hasReceipt = !!(msg && msg.hasReceipt);
  const has = (id) => orderIndex instanceof Map ? orderIndex.has(id) : orderIndex.has(id);

  const { ids, fromV42 } = extractOrderIds(text);

  // 無可抽訂號：看有無成交語意 → 弱訊號桶；否則忽略
  if (ids.length === 0) {
    if (hasDealIntent(text) && !hasQuoteDraft(text)) {
      return { category: 'weak_no_id', notify: false, orderId: null, fromV42, hasReceipt,
        reason: '有成交語意但抽不到訂號（弱訊號，匯總低優，不即時警報）' };
    }
    return { category: 'ignore', notify: false, orderId: null, fromV42, hasReceipt, reason: '無訂單訊號' };
  }

  // 報價判定樹：V42 制式＝成交豁免；鬆散裸號需正面成交語意且無報價/草稿詞，否則抑制
  if (!fromV42) {
    if (hasQuoteDraft(text) && !hasDealIntent(text)) {
      return { category: 'ignore', notify: false, orderId: ids[0], fromV42, hasReceipt,
        reason: '含訂號但語意為報價/草稿（抑制，避免假漏單 noise）' };
    }
    if (!hasDealIntent(text)) {
      // 裸號但無任何成交語意（可能是隨手數字/帳號）→ 弱訊號，不即時警報
      return { category: 'weak_no_id', notify: false, orderId: ids[0], fromV42, hasReceipt,
        reason: '抽到類訂號但無成交語意（弱訊號，待人工匯總）' };
    }
  }

  // 取第一個在 DB 命中的訂號；若皆不命中取第一個
  const matched = ids.find((id) => has(id));
  if (matched) {
    if (fromV42) {
      return { category: 'created_full', notify: false, orderId: matched, fromV42, hasReceipt,
        reason: 'V42 制式確認 + 訂號在 DB（已建立，齊）' };
    }
    return { category: 'created_incomplete', notify: true, orderId: matched, fromV42, hasReceipt,
      reason: '鬆散訊息 + 訂號在 DB（已建立但資訊不齊，請核對補全）' };
  }
  return { category: 'not_created', notify: true, orderId: ids[0], fromV42, hasReceipt,
    reason: '有可信訂號但 DB 查無此單（未建立，請補單）' };
}

/** 將 Supabase orders 陣列轉成正規化訂號 → 紀錄 的 Map（供雙側對照）。 */
export function buildOrderIndex(orders = []) {
  const m = new Map();
  for (const o of orders) {
    const id = normalizeOrderId(o && (o.order_id ?? o.Order_ID));
    if (id) m.set(id, o);
  }
  return m;
}

// ── PII 明文剝離（P2a，S150 §4.8 剝離範圍）──────────────────
// regex best-effort 遮罩，非 NER，僅覆蓋 FHS 已知常見洩漏型態（電話/IG handle/地址門牌/付款尾碼）。
// 刻意不動訂號（0 開頭 7-8 位，NUM_ID_RE 互斥）與金額（多為 1-6 位，非本組 pattern 長度），
// 確保 ig_messages.content 對 P2b 內容比對層仍保有可用的訂號/金額訊號。
// v2（fresh-context opus review 2026-07-13 抓出 v1 漏網）：先 toHalfWidth 防全形繞過；
// 電話容許 852 國碼/空白/連字號分隔與新版 7x-9x 開頭；地址同時吃「數字在前」（100號/5樓）
// 與「數字在後」兩種語序；付款尾碼詞彙放寬（碼/位/個字/號）且計數詞可省略。
const PHONE_RE = /(?<!\d)(?:\+?852[\s-]?)?[1-9]\d{3}[\s-]?\d{4}(?!\d)/g;
const IG_HANDLE_RE = /(?<![\w@])@[A-Za-z0-9_.]{2,30}\b/g;
const ADDR_MARK = '街道路邨苑樓座室廈號';
const ADDR_UNIT_RE = new RegExp(
  `[0-9A-Za-z\\-]{1,6}(?=[${ADDR_MARK}])|(?<=[${ADDR_MARK}])[0-9A-Za-z\\-]{1,6}`, 'g'
);
const PAYMENT_TAIL_RE = /(?:尾|後)\s*[0-9一二三四五六七八九十]*\s*(?:碼|位|個字|號)\s*[:：]?\s*\d{3,6}/g;

/** PII 明文剝離：先正規化全形再遮罩電話/IG handle/地址門牌/付款尾碼，回傳處理後文字。 */
export function redactPii(text) {
  if (typeof text !== 'string' || !text) return text || '';
  let out = toHalfWidth(text);
  out = out.replace(PAYMENT_TAIL_RE, '[付款尾碼]');
  out = out.replace(PHONE_RE, '[電話]');
  out = out.replace(IG_HANDLE_RE, '[IG帳號]');
  out = out.replace(ADDR_UNIT_RE, '[門牌]');
  return out;
}

/** 姓名遮罩：只留每個詞首字元，其餘轉星號。非 NER，僅供已知為姓名的欄位（如 customer_name）使用。 */
export function maskName(name) {
  if (typeof name !== 'string' || !name) return null;
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return words.map((word) => {
    const chars = [...word];
    return chars[0] + '*'.repeat(Math.max(chars.length - 1, 1));
  }).join(' ');
}

/** 非密碼學雜湊（cyrb53，純 JS 算術）：n8n Code 節點 require('crypto') 已知靜默失敗
 *  （見 learnings feedback_n8n_code_node_nas_limits），故用純算術雜湊產生 ig_messages
 *  冪等鍵，避免把 thread/sender 明文直接烤進 id 欄位。僅供去重用途，非安全用途。 */
export function hashId(str) {
  const s = String(str || '');
  let h1 = 0xdeadbeef ^ s.length, h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
