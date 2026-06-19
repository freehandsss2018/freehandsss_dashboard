// match.test.mjs — node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeName, levenshtein, nameSimilarity, extractAmounts,
  hasOrderIntent, hasPaymentProof, classify,
} from './match.mjs';

test('normalizeName 去 emoji/標點/空白', () => {
  assert.equal(normalizeName('Mandy Chan ✨🎀'), 'mandychan');
  assert.equal(normalizeName('陳　美玲！！'), '陳美玲');
});

test('levenshtein 基本', () => {
  assert.equal(levenshtein('abc', 'abc'), 0);
  assert.equal(levenshtein('abc', 'abd'), 1);
  assert.equal(levenshtein('陳美玲', '陳美'), 1);
});

test('nameSimilarity：相等=1，包含給下限，差異按編輯距離', () => {
  assert.equal(nameSimilarity('陳美玲', '陳美玲'), 1);
  assert.ok(nameSimilarity('陳美玲', '陳美玲BB') >= 0.6); // 包含
  assert.ok(nameSimilarity('Mandy Chan', '陳大文') < 0.4); // 不相干
});

test('extractAmounts 處理逗號', () => {
  assert.deepEqual(extractAmounts('訂金 1,000 元，後五碼 99999'), [1000, 99999]);
  assert.deepEqual(extractAmounts('冇數字'), []);
});

test('意圖 vs 付款證據', () => {
  assert.ok(hasOrderIntent('我想訂一個手模'));
  assert.ok(!hasOrderIntent('幾錢呀'));
  assert.ok(hasPaymentProof('我已轉訂金 500，後五碼 12345'));
  assert.ok(!hasPaymentProof('我想問下價錢'));
});

const orders = [
  { order_id: 'FHS-00123', customer_name: '陳美玲', deposit: 500, created_at: '2026-06-10T00:00:00Z' },
  { order_id: 'FHS-00124', customer_name: '黃大仙', deposit: 800, created_at: '2026-06-12T00:00:00Z' },
];
const pipeline = [
  { customer_name: '李詢問', estimated_amount: 0, created_at: '2026-06-09T00:00:00Z', raw_message: '想問價' },
];

test('S3：已有訂單 → matched，不報漏單', () => {
  const c = { name: '陳美玲', ts: new Date('2026-06-10T01:00:00Z').getTime(),
    content: '我已轉訂金 500', amounts: extractAmounts('我已轉訂金 500') };
  const r = classify(c, orders, pipeline, { threshold: 0.6 });
  assert.equal(r.status, 'matched_order');
  assert.equal(r.tier, null);
});

test('在 pipeline → 不報漏單（C3）', () => {
  const c = { name: '李詢問', ts: Date.now(), content: '想問價錢', amounts: [] };
  const r = classify(c, orders, pipeline, { threshold: 0.6 });
  assert.equal(r.status, 'in_pipeline');
});

test('🔴 漏單：付款證據 + 無單 + 不在 pipeline', () => {
  const txt = '我已過數訂金 1200，後五碼 88888';
  const c = { name: '新客陌生人', ts: Date.now(), content: txt, amounts: extractAmounts(txt) };
  const r = classify(c, orders, pipeline, { threshold: 0.6 });
  assert.equal(r.status, 'leak');
  assert.equal(r.tier, '🔴');
});

test('🟡 漏單：有意圖無付款證據', () => {
  const c = { name: '另一陌生客', ts: Date.now(), content: '我想訂一個嬰兒手模', amounts: [] };
  const r = classify(c, orders, pipeline, { threshold: 0.6 });
  assert.equal(r.status, 'leak');
  assert.equal(r.tier, '🟡');
});

test('v2 別名字典：IG 暱稱 → 確認客名（已有訂單）', () => {
  const c = { name: 'Mandy Chan ✨', ts: Date.now(), content: '已轉數', amounts: [] };
  const r = classify(c, orders, pipeline, { threshold: 0.6, aliasMap: { 'Mandy Chan ✨': '陳美玲' } });
  assert.equal(r.status, 'matched_order');
  assert.match(r.reason, /別名字典/);
});

test('名字部分相似(sub-threshold)+金額+時間雙中 → 升為配對（C4 防漏報）', () => {
  // 名字 sim≈0.67（黃大文 vs 黃大仙，1 字差）低於 threshold 0.7，
  // 但訂金 800 與時間吻合 → 升為配對，避免把真客人誤報漏單。
  const c = { name: '黃大文', ts: new Date('2026-06-12T05:00:00Z').getTime(),
    content: '已轉 800', amounts: [800] };
  const r = classify(c, orders, pipeline, { threshold: 0.7, timeWindowDays: 3 });
  assert.equal(r.status, 'matched_order');
});

test('純金額+時間但名字完全不相干 → 仍報漏單（防低基數金額誤配）', () => {
  // 'xyz' 與所有客名 sim=0：deposit 800 雖撞，但不可單憑金額配對。
  const c = { name: 'xyz', ts: new Date('2026-06-12T05:00:00Z').getTime(),
    content: '已過數 800，後五碼 11111', amounts: [800] };
  const r = classify(c, orders, pipeline, { threshold: 0.6, timeWindowDays: 3 });
  assert.equal(r.status, 'leak');
  assert.equal(r.tier, '🔴');
});
