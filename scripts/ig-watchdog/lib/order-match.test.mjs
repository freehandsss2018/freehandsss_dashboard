// order-match.test.mjs — node --test
// IG 漏單看門狗 v3 訂號主鍵偵測單元測試（cl-final-plan 2026-06-23-0257 v2）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toHalfWidth, normalizeOrderId, isV42Confirm,
  hasDealIntent, hasQuoteDraft, extractOrderIds,
  classifyMessage, buildOrderIndex,
} from './order-match.mjs';

// ── 正規化 ──────────────────────────────────────────────
test('normalizeOrderId：全形→半形、去包夾標點、保留前導零', () => {
  assert.equal(normalizeOrderId('０６００１０１'), '0600101'); // 全形
  assert.equal(normalizeOrderId(' #0600101 '), '0600101');     // 包夾井號/空白
  assert.equal(normalizeOrderId('(0600101)'), '0600101');      // 括號
  assert.equal(normalizeOrderId('0600101'), '0600101');        // 前導零不可丟
  assert.equal(normalizeOrderId('fhs-ab123'), 'FHS-AB123');    // 英數轉大寫
});

test('toHalfWidth 全形數字', () => {
  assert.equal(toHalfWidth('１２３４'), '1234');
});

// ── V42 制式辨識 ──────────────────────────────────────────
test('isV42Confirm：制式確認文本', () => {
  assert.ok(isV42Confirm('Freehandsss 訂單確認\n(訂單編號# 0600101 手模擺設)'));
  assert.ok(!isV42Confirm('訂咗 0600101 喇'));            // 鬆散，無 header
  assert.ok(!isV42Confirm('Freehandsss 報價'));           // 非確認
});

// ── 語意守衛 ──────────────────────────────────────────────
test('成交語意 vs 報價/草稿', () => {
  assert.ok(hasDealIntent('訂金已收，單號 0600101'));
  assert.ok(hasDealIntent('已落單'));
  assert.ok(!hasDealIntent('幾錢呀'));
  assert.ok(hasQuoteDraft('呢個係報價，未落單'));
  assert.ok(hasQuoteDraft('我想問下價錢'));
});

// ── 訂號抽取（含防撞）──────────────────────────────────────
test('extractOrderIds：V42 用標籤後 token', () => {
  const r = extractOrderIds('Freehandsss 訂單確認\n(訂單編號# 0600101 手模擺設)');
  assert.deepEqual(r.ids, ['0600101']);
  assert.equal(r.fromV42, true);
});

test('extractOrderIds：leading-0 7–8 位數字抽得到', () => {
  assert.deepEqual(extractOrderIds('訂咗 0600101').ids, ['0600101']);
  assert.deepEqual(extractOrderIds('單號06001008').ids, ['06001008']);
  assert.deepEqual(extractOrderIds('0500703 已落單').ids, ['0500703']);
});

test('extractOrderIds：防撞電話/金額/日期', () => {
  assert.deepEqual(extractOrderIds('我電話 92345678').ids, []);   // HK 手機 8 位起 9，非 0
  assert.deepEqual(extractOrderIds('訂金 $1080').ids, []);         // 金額 4 位
  assert.deepEqual(extractOrderIds('日期 20260623').ids, []);      // 起 2，非 0
  assert.deepEqual(extractOrderIds('帳號 060010188 轉數').ids, []); // 9 位，超出 7–8 範圍
});

// ── 分類（三情況 + 弱訊號 + 報價抑制）────────────────────────
const orders = [
  { order_id: '0600101', customer_name: 'Katkat', deposit: 500 },
  { order_id: '0600804', customer_name: 'Katrina Sui', deposit: 800 },
  { order_id: '06001008', customer_name: 'Mandy Ho', deposit: 1000 },
];
const idx = buildOrderIndex(orders);

test('情況1 created_full：V42 制式 + DB 命中 → 靜默', () => {
  const r = classifyMessage({ text: 'Freehandsss 訂單確認\n(訂單編號# 0600101 手模擺設)' }, idx);
  assert.equal(r.category, 'created_full');
  assert.equal(r.notify, false);
});

test('情況2 created_incomplete：鬆散 + DB 命中 → 通知（Fat Mo 決策合併）', () => {
  const r = classifyMessage({ text: 'Katrina 你個單號 0600804，訂金已收' }, idx);
  assert.equal(r.category, 'created_incomplete');
  assert.equal(r.notify, true);
});

test('情況3 not_created：有可信訂號 + DB 查無 → 通知補單', () => {
  const r = classifyMessage({ text: '已收訂金，單號 0600999' }, idx);
  assert.equal(r.category, 'not_created');
  assert.equal(r.notify, true);
  assert.equal(r.orderId, '0600999');
});

test('報價抑制：含訂號但語意報價/草稿 → ignore（不假漏單）', () => {
  const r = classifyMessage({ text: '呢個報價單 0600999，未落單，考慮緊' }, idx);
  assert.equal(r.category, 'ignore');
  assert.equal(r.notify, false);
});

test('弱訊號 weak_no_id：成交語意但無訂號 → 不即時警報', () => {
  const r = classifyMessage({ text: '訂金已收，遲啲補單號俾你' }, idx);
  assert.equal(r.category, 'weak_no_id');
  assert.equal(r.notify, false);
});

test('裸號無成交語意 → 弱訊號（不誤判為漏單）', () => {
  const r = classifyMessage({ text: '0600999' }, idx);
  assert.equal(r.category, 'weak_no_id');
  assert.equal(r.notify, false);
});

test('忽略：無任何訂單訊號', () => {
  const r = classifyMessage({ text: '今日天氣好好' }, idx);
  assert.equal(r.category, 'ignore');
  assert.equal(r.notify, false);
});

test('收據存在性透傳（方案 A，零下載）', () => {
  const r = classifyMessage({ text: '已收訂金，單號 0600999', hasReceipt: true }, idx);
  assert.equal(r.hasReceipt, true);
  assert.equal(r.notify, true);
});
