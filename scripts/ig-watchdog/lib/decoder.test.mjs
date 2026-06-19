// decoder.test.mjs — node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeMetaMojibake, decodeDeep } from './decoder.mjs';

// 用 Buffer 產生確定性 mojibake：把 UTF-8 位元組逐個當 latin1 字元，
// 正是 Meta DYI JSON.parse 後得到的形狀。
const moji = (s) => Buffer.from(s, 'utf8').toString('latin1');

test('還原中文客名', () => {
  assert.equal(decodeMetaMojibake(moji('李小明')), '李小明');
  assert.equal(decodeMetaMojibake(moji('陳美玲')), '陳美玲');
});

test('還原含金額的混合訊息', () => {
  assert.equal(decodeMetaMojibake(moji('我已轉訂金 1000 元，後五碼 99999')),
    '我已轉訂金 1000 元，後五碼 99999');
});

test('純 ASCII 不變', () => {
  assert.equal(decodeMetaMojibake('Mandy Chan'), 'Mandy Chan');
  assert.equal(decodeMetaMojibake('deposit 500'), 'deposit 500');
});

test('已正確的中文（含 >0xFF 字元）不被二次破壞', () => {
  assert.equal(decodeMetaMojibake('李小明'), '李小明');
});

test('emoji（surrogate pair）保留', () => {
  assert.equal(decodeMetaMojibake('Mandy ✨🎀'), 'Mandy ✨🎀');
});

test('空值/非字串原樣返回', () => {
  assert.equal(decodeMetaMojibake(''), '');
  assert.equal(decodeMetaMojibake(null), null);
  assert.equal(decodeMetaMojibake(123), 123);
});

test('decodeDeep 遞迴解碼物件不改 key', () => {
  const input = {
    sender_name: moji('李小明'),
    content: moji('訂金 800'),
    nested: { title: moji('陳太') },
    list: [moji('過數'), 'ascii'],
    timestamp_ms: 1710000000000,
  };
  const out = decodeDeep(input);
  assert.equal(out.sender_name, '李小明');
  assert.equal(out.content, '訂金 800');
  assert.equal(out.nested.title, '陳太');
  assert.deepEqual(out.list, ['過數', 'ascii']);
  assert.equal(out.timestamp_ms, 1710000000000); // 數字不動
});
