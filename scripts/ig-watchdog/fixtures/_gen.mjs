// _gen.mjs — 產生離線自測用的合成 fixtures（全虛構，無真實客人資料）
// 用法：node fixtures/_gen.mjs
// mojibake 重現：把 UTF-8 位元組逐個當 latin1 字元（= Meta DYI JSON.parse 後形狀）
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const moji = (s) => Buffer.from(s, 'utf8').toString('latin1');
const DAY = 86400000;
const now = Date.now();

const thread = (title, msgs) => ({
  participants: [{ name: moji(title) }, { name: 'free_handsss' }],
  title: moji(title),
  thread_path: `inbox/${title}`,
  messages: msgs.map((m) => ({
    sender_name: moji(m.from), timestamp_ms: m.ts, content: moji(m.text), type: 'Generic',
  })),
});

const threads = {
  // A：已有訂單客人（應 matched_order，不報警）
  thread_a: thread('陳美玲', [
    { from: 'free_handsss', ts: now - 5 * DAY, text: '你好，請問想整邊款？' },
    { from: '陳美玲', ts: now - 4 * DAY, text: '我已轉訂金 500，麻煩你' },
  ]),
  // B：陌生客 + 付款證據（應 🔴）
  thread_b: thread('神秘新客', [
    { from: '神秘新客', ts: now - 2 * DAY, text: '我已過數訂金 1200，後五碼 88888，想整嬰兒手腳模' },
  ]),
  // C：陌生客有意圖無付款（應 🟡）
  thread_c: thread('問問手模', [
    { from: '問問手模', ts: now - 1 * DAY, text: '我想訂一個滿月手模擺設，仲有冇位？' },
  ]),
  // D：在 pipeline 的查詢（應 in_pipeline，不報警）
  thread_d: thread('李詢問', [
    { from: '李詢問', ts: now - 3 * DAY, text: '想問下情侶手模幾錢，可以落單嗎' },
  ]),
  // E：純閒聊無意圖（應 skip，不入報告）
  thread_e: thread('路人甲', [
    { from: '路人甲', ts: now - 6 * DAY, text: '你哋啲作品好靚呀' },
  ]),
};

for (const [name, data] of Object.entries(threads)) {
  const dir = path.join(__dirname, 'mock_inbox', name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'message_1.json'), JSON.stringify(data, null, 2), 'utf8');
}

const iso = (d) => new Date(now - d * DAY).toISOString();
fs.writeFileSync(path.join(__dirname, 'mock_orders.json'), JSON.stringify([
  { order_id: 'FHS-90001', customer_name: '陳美玲', deposit: 500, final_sale_price: 1000, created_at: iso(4), confirmed_at: iso(4), full_order_text: '嬰兒手腳模' },
  { order_id: 'FHS-90002', customer_name: '王小強', deposit: 800, final_sale_price: 1600, created_at: iso(10), confirmed_at: iso(10), full_order_text: '情侶手模' },
], null, 2), 'utf8');

fs.writeFileSync(path.join(__dirname, 'mock_pipeline.json'), JSON.stringify([
  { customer_name: '李詢問', estimated_amount: 0, created_at: iso(3), raw_message: '想問情侶手模價', query_details: '情侶手模查詢', stage: '新查詢' },
], null, 2), 'utf8');

console.log('✅ fixtures 已產生：mock_inbox/(5 threads) + mock_orders.json + mock_pipeline.json');