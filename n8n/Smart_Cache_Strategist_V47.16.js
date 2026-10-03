// V47.16 (2026-10-03, D107) fail-closed：成本查詢「基礎設施失敗」不再靜默 fallback 令成本歸零。
//   事故：0600512 edit（exec 7605）Supabase GET 撞 5s timeout → catch 吞錯 → Total_Cost=0 寫入 DB。
//   改動：①timeout 5s→10s ②失敗即重試一次 ③仍失敗 / 無 key / 回應非陣列 → throw（觸發 errorWorkflow Telegram 警報）。
//   ④ 部分匹配（部分 SKU 查不到 / total_base_cost 為 NULL）→ throw（Fat Mo 2026-10-03 定案）。
//   不變：Supabase 回應正常但 0 個 SKU 匹配 → 仍 fallback（由 order_items_product_sku_fkey 外鍵大聲失敗，壓測案例依賴此行為）。
//   無有效品項（hasValidItems=false / skuList 空）→ 不需成本查詢，維持 fallback。
// V47.15 Smart Cache — Supabase REST 即時讀 (Prefix-Match Fallback)
// 2026-08-11 (D63 續) 修正 key 讀取路徑：上一版 (V47.14) 只讀 process.env，
//   但實測 n8n Code node 沙盒內 `typeof process === 'undefined'`（見 D62 診斷），
//   令 SUPABASE_KEY 恆為 null、每次都靜默 fallback 落 Airtable（supabaseFetched=false）。
//   改為優先讀 n8n 原生 $env（需容器設 N8N_BLOCK_ENV_ACCESS_IN_NODE=false，已設），
//   保留 process.env 作次要路徑以防未來 runtime 變更。
// 2026-08-10 (D62) ① require('axios') 移除 —— n8n 2.7.5 task runner 沙盒下會令 runner
//   進程崩潰 (InternalTaskRunnerDisconnectAnalyzer)，內部 try/catch 捉唔到（進程級崩潰
//   非 JS 例外）。改用 n8n 原生 helpers.httpRequest。同源教訓見 learnings/n8n.md #2（D55）。
//   ② 硬編碼 fallback secret 移除 —— 該 key 已喺公開 repo 洩漏並被 Supabase 自動撤銷。
// 前身 V47.13 / 2026-05-23: Replaced hardcoded COST_MAP with live Supabase query.
// 前身 2026-05-29: Added 成人(P)鎖匙扣 - 鋁合金 and 成人(P)吊飾 - 925金 to BASE_PREFIXES (G1/G2 fix).
const SUPABASE_URL = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SUPABASE_KEY = (() => {
  try { if (typeof $env !== 'undefined' && $env && $env.SUPABASE_SERVICE_KEY) return $env.SUPABASE_SERVICE_KEY; }
  catch (e) { /* env access blocked → 試下一條路 */ }
  try { if (typeof process !== 'undefined' && process.env && process.env.SUPABASE_SERVICE_KEY) return process.env.SUPABASE_SERVICE_KEY; }
  catch (e) { /* sandbox 無 process */ }
  return null;
})();

// n8n 原生 HTTP helper（task runner 下經 RPC 代理回主進程，唔會崩潰）
const _httpGet = async (url, headers) => {
  if (typeof this !== 'undefined' && this && this.helpers && this.helpers.httpRequest) {
    return await this.helpers.httpRequest({ method: 'GET', url, headers, json: true, timeout: 10000 });
  }
  if (typeof $helpers !== 'undefined' && $helpers && $helpers.httpRequest) {
    return await $helpers.httpRequest({ method: 'GET', url, headers, json: true, timeout: 10000 });
  }
  throw new Error('no http helper available');
};

const BASE_PREFIXES = [
  // 手模擺設
  "玻璃瓶套裝 (4肢)", "玻璃瓶套裝 (2肢)", "木框套裝 (4肢)", "木框套裝 (2肢)",
  // 嬰兒鎖匙扣
  "嬰兒鎖匙扣 - 不銹鋼", "嬰兒鎖匙扣 - 鋁合金", "嬰兒(P)鎖匙扣 - 不銹鋼", "嬰兒(P)鎖匙扣 - 鋁合金",
  // 嬰兒吊飾
  "嬰兒吊飾 - 925銀", "嬰兒吊飾 - 925金", "嬰兒(P)吊飾 - 925銀", "嬰兒(P)吊飾 - 925金",
  // 家庭 S 系列鎖匙扣
  "家庭(S1)鎖匙扣 - 不銹鋼", "家庭(S1)鎖匙扣 - 鋁合金", "家庭(S2)鎖匙扣 - 不銹鋼", "家庭(S2)鎖匙扣 - 鋁合金",
  // 家庭 P 系列鎖匙扣
  "家庭(P1)鎖匙扣 - 不銹鋼", "家庭(P1)鎖匙扣 - 鋁合金", "家庭(P2)鎖匙扣 - 不銹鋼", "家庭(P2)鎖匙扣 - 鋁合金",
  // 家庭吊飾
  "家庭(S1)吊飾 - 925銀", "家庭(S1)吊飾 - 925金", "家庭(S2)吊飾 - 925銀", "家庭(S2)吊飾 - 925金",
  "家庭(P1)吊飾 - 925銀", "家庭(P1)吊飾 - 925金", "家庭(P2)吊飾 - 925銀", "家庭(P2)吊飾 - 925金",
  // 成人
  "成人(P)鎖匙扣 - 不銹鋼", "成人(P)鎖匙扣 - 鋁合金", "成人(P)吊飾 - 925銀", "成人(P)吊飾 - 925金",
  // 配件加購 (V47.12)
  "羊毛氈公仔 - 加購"
];

function getBasePrefix(sku) {
  if (!sku) return null;
  for (const base of BASE_PREFIXES) {
    if (sku.startsWith(base)) return base;
  }
  return null;
}

const batchItems = $("Batch SKU Collector").all();
const hasValidItems = batchItems.some(item => item.json.hasItems === true);
const skuList = batchItems.length > 0 ? (batchItems[0].json.sku_list || []) : [];

if (hasValidItems && skuList.length > 0) {
  // D107 fail-closed：有品項需要查成本卻無 key → 直接報錯，唔再靜默 fallback 令成本歸零
  if (!SUPABASE_KEY) {
    throw new Error('Smart Cache: SUPABASE_SERVICE_KEY 讀取失敗（$env/process.env 皆無），中止以免成本歸零寫入');
  }

  const filters = skuList.map(sku => {
    const base = getBasePrefix(sku);
    if (base) {
      return `sku.like."${encodeURIComponent(base)}*"`;
    } else {
      return `sku.eq."${encodeURIComponent(sku)}"`;
    }
  });
  const url = `${SUPABASE_URL}/rest/v1/products?or=(${filters.join(',')})&select=sku,total_base_cost`;
  const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

  // 最多 2 次嘗試；任何錯誤（timeout / 401 / 5xx / 網絡）都重試一次，仍失敗即 throw
  let resp = null;
  let lastErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      resp = await _httpGet(url, headers);
      lastErr = null;
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (lastErr) {
    // 錯誤訊息不得帶出 key
    const msg = String((lastErr && lastErr.message) || lastErr).split(SUPABASE_KEY).join('***').slice(0, 300);
    throw new Error(`Smart Cache: Supabase 成本查詢失敗（已重試 1 次）：${msg}。中止以免成本歸零寫入`);
  }

  const rows = Array.isArray(resp) ? resp : ((resp && resp.data) || null);
  if (!Array.isArray(rows)) {
    throw new Error('Smart Cache: Supabase 回應格式異常（非陣列），中止以免成本歸零寫入');
  }

  const supabaseCosts = {};
  const unresolved = [];
  for (const sku of skuList) {
    if (sku === '無商品' || sku === '???') continue; // 佔位字串（Batch SKU Collector 過濾已損壞），不需成本
    const basePrefix = getBasePrefix(sku);
    const matchedRow = rows.find(r => r.sku === sku)
      || (basePrefix && rows.find(r => r.sku.startsWith(basePrefix)));

    if (matchedRow && matchedRow.total_base_cost !== null && matchedRow.total_base_cost !== undefined) {
      supabaseCosts[sku] = {
        Product_Name: sku,
        Total_Base_Cost: Number(matchedRow.total_base_cost) || 0
      };
    } else {
      unresolved.push(sku); // 查無此 SKU，或該列 total_base_cost 為 NULL
    }
  }

  // D107 續：部分匹配（有 SKU 查到、有 SKU 查不到/成本 NULL）→ throw，避免落空 SKU 在 Local Data Mapper 被補 0
  if (Object.keys(supabaseCosts).length > 0 && unresolved.length > 0) {
    throw new Error(`Smart Cache: ${unresolved.length} 個 SKU 成本無法解析（${unresolved.slice(0, 5).join(' ; ')}），中止以免成本歸零寫入`);
  }

  if (Object.keys(supabaseCosts).length > 0) {
    return batchItems.map(item => ({
      json: { ...item.json, useCache: false, supabaseFetched: true, supabaseCosts,
              batchFormula: "RECORD_ID()='SUPABASE_SKIP'" }
    }));
  }
  // 回應正常但 0 個 SKU 匹配：維持原行為 fallback，交由 order_items_product_sku_fkey 外鍵大聲失敗
}

// fallback（無有效品項，或 Supabase 正常回應但 0 匹配）
return batchItems.map(item => ({ json: { ...item.json, useCache: false, supabaseFetched: false } }));
