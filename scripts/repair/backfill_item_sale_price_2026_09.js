#!/usr/bin/env node
// scripts/repair/backfill_item_sale_price_2026_09.js
// 一次性repair：backfill 13張生產訂單（分類①7張+0107兩件+分類②5張）
// order_items.item_sale_price NULL缺口。
// 唔hardcode backfill數值——即場讀orders.raw_form_state，
// 重放同n8n Supabase Mirror Prep（V47.26）完全一致嘅_splitMap建構+
// _splitCoverageTarget驗證+頸鏈pair-group反查演算法，動態計算，
// 並同下方 EXPECTED（finance-auditor 獨立驗算表，flow 2026-09-24-0134）
// 交叉核對——唔相符即拒絕寫入該項並回報，防止兩套實作各自出錯而互相矇混。
// 預設dry-run，需 --apply 先實際UPDATE。
// K_FAM_COMBO（0600107一件）同0600704全單明確不在TARGET_ORDER_IDS內，另案人手處理。

require('../lib/env').loadEnv(require('path').join(__dirname, '..', '..'));
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const APPLY = process.argv.includes('--apply');

const TARGET_ORDER_IDS = [
  '0600710', '0600721', '0600727', '0600800', '0600803', '0600804', '0600903', // 分類①
  '0600107', // 分類①附加（K_FAM_COMBO一件由EXPECTED表冇對應key而自動跳過）
  '0600112', '0600303', '0600506', '0600904', '0601011', // 分類②
];

// finance-auditor 獨立驗算表（flow 2026-09-24-0134），純供交叉核對用，唔係直接寫入源
const EXPECTED = {
  '0600710_M_LF': 740, '0600710_M_LH': 740,
  '0600721_M_LF': 1490, '0600721_M_LH': 1490, '0600721_M_RF': 1490, '0600721_M_RH': 1490,
  '0600727_M_RH': 1980,
  '0600800_M_RF': 1445, '0600800_M_RH': 1445,
  '0600803_M_LF': 1235, '0600803_M_LH': 1235,
  '0600804_M_E_RH': 1490, '0600804_M_LH': 1490,
  '0600903_M_LH': 1490, '0600903_M_RF': 1490,
  '0600107_M_LH': 1490, '0600107_M_RF': 1490,
  '0600112_P_MAIN': 2380, '0600112_K_LH': 1200, '0600112_K_RF': 1200,
  '0600303_P_MAIN': 2380, '0600506_P_MAIN': 2380, '0600904_P_MAIN': 2380, '0601011_P_MAIN': 2080,
};
// K_FAM_COMBO／0600704 刻意不在 EXPECTED 內——即使意外出現亦會因EXPECTED冇對應key而被下方邏輯SKIP

function restRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL + path);
    const data = body ? JSON.stringify(body) : null;
    const req = https.request(url, {
      method,
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}: ${text}`));
        resolve(text ? JSON.parse(text) : null);
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// 同 n8n Supabase Mirror Prep（V47.26）_splitMap 建構邏輯完全一致
function buildSplitMap(rawFormState) {
  const splitMap = {};
  ['balanceSplitData', 'depositSplitData'].forEach(dataKey => {
    let splitData = rawFormState[dataKey];
    if (typeof splitData === 'string') { try { splitData = JSON.parse(splitData); } catch (e) { splitData = {}; } }
    if (splitData && typeof splitData === 'object' && !Array.isArray(splitData)) {
      Object.keys(splitData).forEach(key => {
        const suffix = key.replace('TEMP_', '').split('#')[0].toUpperCase();
        splitMap[suffix] = (splitMap[suffix] || 0) + (Number(splitData[key]) || 0);
      });
    }
  });
  return splitMap;
}

// 同 n8n V47.26 頸鏈pair-group反查邏輯完全一致
function computeNecklacePrices(items, splitMap) {
  const result = {};
  const necklaceItems = items.filter(it => it.item_category === '純銀頸鏈吊飾' && Number(it.quantity) > 0);
  let groupIdx = 0, groupItems = [], groupCharmCount = 0;
  const flush = () => {
    if (groupItems.length === 0) return;
    const boxKey = 'NECKLACE_' + (groupIdx + 1);
    const groupPrice = splitMap[boxKey];
    if (groupPrice != null && groupCharmCount > 0) {
      const cents = Math.round(groupPrice * 100);
      const base = Math.floor(cents / groupCharmCount);
      const remainder = cents - base * groupCharmCount;
      groupItems.forEach((g, i) => {
        let c = base * g.units;
        if (i === groupItems.length - 1) c += remainder;
        result[g.key] = (result[g.key] || 0) + c;
      });
    }
    groupIdx++; groupItems = []; groupCharmCount = 0;
  };
  necklaceItems.forEach(it => {
    let remaining = Number(it.quantity);
    while (remaining > 0) {
      const take = Math.min(2 - groupCharmCount, remaining);
      groupItems.push({ key: it.item_key, units: take });
      groupCharmCount += take;
      remaining -= take;
      if (groupCharmCount >= 2) flush();
    }
  });
  flush();
  Object.keys(result).forEach(k => { result[k] = result[k] / 100; });
  return result;
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY (real UPDATE)' : 'DRY-RUN (preview only)'}\n`);
  const report = { applied: [], skipped: [], mismatched: [], failed: [] };

  for (const orderId of TARGET_ORDER_IDS) {
    const orders = await restRequest('GET', `/rest/v1/orders?order_id=eq.${orderId}&select=order_id,deposit,balance,raw_form_state`);
    if (!orders || orders.length === 0) { console.log(`[SKIP] order ${orderId} not found`); continue; }
    const order = orders[0];
    const rawFormState = typeof order.raw_form_state === 'string' ? JSON.parse(order.raw_form_state || '{}') : (order.raw_form_state || {});
    const splitMap = buildSplitMap(rawFormState);
    const splitTotal = Object.values(splitMap).reduce((s, v) => s + v, 0);
    const hasSplitData = Object.keys(splitMap).length > 0;
    const coverageTarget = (Number(order.deposit) || 0) + (Number(order.balance) || 0);
    const splitValid = !hasSplitData || Math.abs(splitTotal - coverageTarget) <= 1;

    const items = await restRequest('GET', `/rest/v1/order_items?order_fhs_id=eq.${orderId}&select=item_key,item_category,quantity,item_sale_price`);
    const necklacePrices = computeNecklacePrices(items, splitMap);

    for (const item of items) {
      if (item.item_sale_price !== null) continue; // 只填NULL，硬性守衛
      const suffix = item.item_key.replace(orderId + '_', '').toUpperCase();
      let computed = null;
      if (splitValid && hasSplitData) {
        computed = (item.item_category === '純銀頸鏈吊飾' && necklacePrices[item.item_key] != null)
          ? necklacePrices[item.item_key]
          : (splitMap[suffix] != null ? splitMap[suffix] : null);
      }
      if (computed == null) { report.skipped.push(`${item.item_key} (algorithm produces null — not in scope, e.g. K_FAM_COMBO/0600704)`); continue; }

      const expected = EXPECTED[item.item_key];
      if (expected == null) { report.skipped.push(`${item.item_key} (not in EXPECTED table — refusing to write items outside verified scope)`); continue; }
      if (Math.abs(computed - expected) > 0.01) {
        report.mismatched.push(`${item.item_key}: 動態計算=${computed} vs finance-auditor驗算=${expected}，唔一致，拒絕寫入`);
        continue;
      }
      if (!Number.isFinite(computed) || computed < 0) {
        report.mismatched.push(`${item.item_key}: computed value ${computed} 未通過型態/範圍驗證`);
        continue;
      }

      console.log(`[${APPLY ? 'UPDATE' : 'WOULD UPDATE'}] ${item.item_key}: NULL → ${computed}`);
      if (APPLY) {
        try {
          await restRequest('PATCH', `/rest/v1/order_items?item_key=eq.${encodeURIComponent(item.item_key)}&item_sale_price=is.null`, { item_sale_price: computed });
          report.applied.push(item.item_key);
        } catch (e) {
          report.failed.push(`${item.item_key}: ${e.message}`);
        }
      } else {
        report.applied.push(item.item_key);
      }
    }
  }

  console.log('\n=== 總結 ===');
  console.log(`${APPLY ? '已寫入' : '會寫入'}: ${report.applied.length} 項`, report.applied);
  console.log(`跳過: ${report.skipped.length} 項`, report.skipped);
  if (report.mismatched.length) console.log(`⚠️ 動態計算同驗算表不符（已拒絕寫入）: ${report.mismatched.length} 項`, report.mismatched);
  if (report.failed.length) console.log(`❌ 寫入失敗: ${report.failed.length} 項`, report.failed);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
