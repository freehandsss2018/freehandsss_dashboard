// order-match.test.mjs — node --test
// IG 漏單看門狗 v3 訂號主鍵偵測單元測試（cl-final-plan 2026-06-23-0257 v2）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  toHalfWidth, normalizeOrderId, isV42Confirm,
  hasDealIntent, hasQuoteDraft, extractOrderIds,
  classifyMessage, buildOrderIndex, redactPii, maskName, hashId,
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

// ── PII 明文剝離（P2a）────────────────────────────────────
test('redactPii：電話遮罩', () => {
  const out = redactPii('我電話係92345678，得閒打俾我');
  assert.ok(out.includes('[電話]'));
  assert.ok(!out.includes('92345678'));
});

test('redactPii：IG handle 遮罩', () => {
  const out = redactPii('可以睇下我個IG @free_test_acc 有相');
  assert.ok(out.includes('[IG帳號]'));
  assert.ok(!out.includes('@free_test_acc'));
});

test('redactPii：地址門牌遮罩', () => {
  const out = redactPii('旺角西洋菜街123號 3樓A室');
  assert.ok(out.includes('[門牌]'));
  assert.ok(!out.includes('123'));
});

test('redactPii：付款尾碼遮罩', () => {
  const out = redactPii('已轉數，尾五碼12345，麻煩核對');
  assert.ok(out.includes('[付款尾碼]'));
  assert.ok(!out.includes('12345'));
});

test('redactPii：訂號與金額不受影響（P2b 比對層仍需要這些訊號）', () => {
  const out = redactPii('Freehandsss 訂單確認\n(訂單編號# 0600101 手模擺設)，訂金$800');
  assert.ok(out.includes('0600101'));
  assert.ok(out.includes('800'));
});

test('redactPii：非字串輸入安全回傳', () => {
  assert.equal(redactPii(null), '');
  assert.equal(redactPii(undefined), '');
  assert.equal(redactPii(''), '');
});

// v2 補強（fresh-context opus review 2026-07-13 F2 抓出的漏網樣本，逐一補測）
test('redactPii v2：電話含分隔符/新版開頭/852國碼/全形數字', () => {
  assert.ok(!redactPii('9234 5678').includes('9234'), '空白分隔');
  assert.ok(!redactPii('9234-5678').includes('9234'), '連字號分隔');
  assert.ok(!redactPii('71234567').includes('71234567'), '7x新版開頭');
  assert.ok(!redactPii('81234567').includes('81234567'), '8x新版開頭');
  assert.ok(!redactPii('85292345678').includes('92345678'), '852國碼無分隔');
  assert.ok(!redactPii('+852 9234 5678').includes('9234'), '+852國碼有分隔');
  assert.ok(!redactPii('９２３４５６７８').includes('9234'), '全形數字先轉半形再遮罩');
});

test('redactPii v2：地址「數字在前」語序（原版只吃數字在後）', () => {
  const out = redactPii('西環德輔道西100號 5樓B室');
  assert.ok(!out.includes('100'), '門牌號在前');
  assert.ok(!out.includes('5樓') || !out.includes('5'), '樓層在前');
});

test('redactPii v2：付款尾碼詞彙放寬（無計數詞/號代替碼）', () => {
  assert.ok(!redactPii('尾號1234').includes('1234'), '「尾號」無計數詞');
  assert.ok(!redactPii('尾5個字 12345').includes('12345'), '「個字」詞彙');
});

test('redactPii v2：訂號/金額在新版規則下仍不受影響', () => {
  const out = redactPii('Freehandsss 訂單確認\n(訂單編號# 0600101 手模擺設)，訂金$800');
  assert.ok(out.includes('0600101'));
  assert.ok(out.includes('800'));
});

// ── 姓名遮罩（P2a，F1 修復：customer_name 欄位不可存明文）───────
test('maskName：只留首字，其餘轉星號', () => {
  assert.equal(maskName('Katkat'), 'K*****');
  assert.equal(maskName('Katrina Sui'), 'K****** S**');
  assert.equal(maskName('陳大文'), '陳**');
  assert.equal(maskName(null), null);
  assert.equal(maskName(''), null);
});

// ── 冪等鍵雜湊（P2a，F1 修復：ig_message_id 不可烤入明文姓名）───
test('hashId：確定性 + 不同輸入不同輸出', () => {
  const a = hashId('thread1|1000|Katrina');
  const b = hashId('thread1|1000|Katrina');
  const c = hashId('thread1|1000|Katkat');
  assert.equal(a, b, '同輸入同輸出（確定性，供冪等鍵使用）');
  assert.notEqual(a, c, '不同輸入應給不同雜湊（碰撞機率低）');
  assert.ok(!a.includes('Katrina'), '雜湊輸出不含原始明文');
});
