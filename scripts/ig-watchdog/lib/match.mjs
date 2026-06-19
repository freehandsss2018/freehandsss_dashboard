// match.mjs — 比對引擎 (C2/C3/C4 + v2 W1 別名字典 + W2 訊號分層)
//
// 設計原則：
// - 名字只是「其中一個訊號」，非單一硬閘（C4：避免 CJK 短名漏報）。
// - DM 金額對 orders.deposit（C2），非 total。
// - orders ∪ sales_pipeline 任一命中 = 非漏單（C3）。
// - 別名字典命中 = 確定性 exact，繞過 fuzzy（v2 W1）。
// - 漏單分三級：🔴 付款證據+無單+不在pipeline / 🟡 有意圖無付款證據 / ⚪ 模糊（v2 W2）。

// ── 文字正規化 ──────────────────────────────────────────────
/** 去除 emoji/標點/空白，保留字母(含CJK)+數字，轉小寫。 */
export function normalizeName(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

// ── Levenshtein 距離（code point 級）──────────────────────────
export function levenshtein(a, b) {
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

/** 名字相似度 0..1：完全相等=1；包含關係給下限 0.6 並按長度比；否則 1-編輯距離比率。 */
export function nameSimilarity(a, b) {
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

// ── 金額抽取 ────────────────────────────────────────────────
/** 從文字抽出所有整數金額（處理千分逗號）。 */
export function extractAmounts(text) {
  if (typeof text !== 'string') return [];
  const out = [];
  for (const m of text.matchAll(/\d[\d,]*/g)) {
    const n = parseInt(m[0].replace(/,/g, ''), 10);
    if (Number.isFinite(n) && n > 0) out.push(n);
  }
  return out;
}

// ── 意圖 / 付款證據 偵測 ────────────────────────────────────
const INTENT_RE = /訂金|落單|下單|預訂|訂購|匯款|轉帳|轉數|過數|入數|留位|留俾|落訂|訂咗|想訂|要訂|deposit|order/i;
// 付款證據：已完成付款的語氣 + 後五碼/後5碼 等銀行確認
const PAYMENT_PROOF_RE = /已轉|已匯|已過數|過咗數|入咗|已入數|已付|已$|轉咗|付咗|後五碼|後5碼|尾五碼|轉左|過左數/i;

export function hasOrderIntent(text) {
  return typeof text === 'string' && INTENT_RE.test(text);
}
export function hasPaymentProof(text) {
  return typeof text === 'string' && PAYMENT_PROOF_RE.test(text);
}

// ── 時間窗 ──────────────────────────────────────────────────
function withinDays(tsMs, isoDate, days) {
  if (!tsMs || !isoDate) return false;
  const t2 = new Date(isoDate).getTime();
  if (!Number.isFinite(t2)) return false;
  return Math.abs(tsMs - t2) <= days * 86400000;
}

// ── 單筆來源（order 或 pipeline）的配對分數 ──────────────────
function scoreAgainst(candidate, rec, amountField, dateField, timeWindowDays) {
  const sim = nameSimilarity(candidate.name, rec.customer_name || '');
  const amts = candidate.amounts || [];
  const recAmt = Number(rec[amountField]);
  const amountHit = Number.isFinite(recAmt) && recAmt > 0 && amts.some((a) => a === recAmt);
  const timeHit = withinDays(candidate.ts, rec[dateField], timeWindowDays);
  return { sim, amountHit, timeHit, rec };
}

function best(arr, key) {
  return arr.reduce((b, x) => (x[key] > (b?.[key] ?? -1) ? x : b), null);
}

/**
 * 分類單一候選。
 * @param candidate {{name, ts, content, amounts}}
 * @param orders   [{customer_name, deposit, final_sale_price, created_at, confirmed_at, order_id, full_order_text}]
 * @param pipeline [{customer_name, estimated_amount, created_at, raw_message, query_details}]
 * @param opts {{threshold, aliasMap, timeWindowDays}}
 * @returns {{status, tier, reason, bestOrder, bestPipeline}}
 */
export function classify(candidate, orders = [], pipeline = [], opts = {}) {
  const { threshold = 0.6, aliasMap = {}, timeWindowDays = 3 } = opts;

  // v2 W1 — 別名字典：確定性命中（檢 raw + normalized 兩種 key）
  const aliasTarget = aliasMap[candidate.name] || aliasMap[normalizeName(candidate.name)];
  if (aliasTarget) {
    const tgt = normalizeName(aliasTarget);
    const inOrders = orders.some((o) => normalizeName(o.customer_name) === tgt);
    const inPipe = pipeline.some((p) => normalizeName(p.customer_name) === tgt);
    if (inOrders) return { status: 'matched_order', tier: null, reason: `別名字典→${aliasTarget}（已有訂單）` };
    if (inPipe) return { status: 'in_pipeline', tier: null, reason: `別名字典→${aliasTarget}（在 pipeline）` };
    // 別名指向的客人竟無單 → 仍視為漏單，但帶高信心名
  }

  const oScores = orders.map((o) => scoreAgainst(candidate, o, 'deposit', 'created_at', timeWindowDays));
  const pScores = pipeline.map((p) => scoreAgainst(candidate, p, 'estimated_amount', 'created_at', timeWindowDays));

  const bestO = best(oScores, 'sim');
  const bestP = best(pScores, 'sim');

  // 命中判定：名字達閾值，或（名字偏低但金額+時間雙中）也算配對
  const orderHit = bestO && (bestO.sim >= threshold || (bestO.amountHit && bestO.timeHit && bestO.sim >= 0.4));
  const pipeHit = bestP && (bestP.sim >= threshold || (bestP.amountHit && bestP.timeHit && bestP.sim >= 0.4));

  if (orderHit) {
    return { status: 'matched_order', tier: null,
      reason: `名字相似 ${bestO.sim.toFixed(2)}${bestO.amountHit ? '+金額符' : ''}${bestO.timeHit ? '+時間符' : ''} → ${bestO.rec.order_id || bestO.rec.customer_name}`,
      bestOrder: bestO };
  }
  if (pipeHit) {
    return { status: 'in_pipeline', tier: null,
      reason: `在 pipeline（相似 ${bestP.sim.toFixed(2)}）→ ${bestP.rec.customer_name}`,
      bestPipeline: bestP };
  }

  // ── 漏單分級（v2 W2）──
  let tier = '⚪';
  if (hasPaymentProof(candidate.content)) tier = '🔴';      // 有付款證據 + 無任何配對
  else if (hasOrderIntent(candidate.content)) tier = '🟡';   // 有意圖無付款證據
  return { status: 'leak', tier,
    reason: tier === '🔴' ? '有付款證據語且無訂單/不在 pipeline'
          : tier === '🟡' ? '有下單意圖但無付款證據' : '低信心（模糊）',
    bestOrder: bestO, bestPipeline: bestP };
}
