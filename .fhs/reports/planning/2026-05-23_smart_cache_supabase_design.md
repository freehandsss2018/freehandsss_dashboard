# Smart Cache Supabase REST 即時讀設計案

**狀態**：A2 審閱通過，就緒供 A3 部署  
**設計日期**：2026-05-23  
**依據**：`handoff_execute_v3.md` 任務 2  

---

## 1. 審閱結論

1. **Prefix-match 邏輯補回**：我們分析了 Supabase `products` 表中的 489 筆資料，發現表中僅包含常見的 SKU 組合（如飾品數 1-9），並未包含任意位數（例如 10 飾以上）的極端組合。同時，基礎 SKU（例如不帶後綴飾品數的 `嬰兒鎖匙扣 - 不銹鋼`）並不在表中。為了防禦未來可能發生的 SKU 溢出，**必須補回 Prefix-match fallback**。
2. **OR Filter URL Encoding 驗證**：已於 local 環境撰寫測試腳本對 Supabase 進行實際 PostgREST 查詢測試。證實以下語意在 PostgREST 下完全成立且正確支援中文編碼：
   * 單一 `sku=like.嬰兒鎖匙扣 - 不銹鋼*`
   * 多重 `or=(sku.like.嬰兒鎖匙扣 - 不銹鋼*,sku.like.木框套裝 (4肢)*)`

---

## 2. 推薦之 n8n `Smart Cache Strategist` Code 節點源碼

請 A3 (Claude Code) 部署時直接使用以下代碼取代現有的 `Smart Cache Strategist`：

```javascript
// V47.12 Smart Cache — Supabase REST 即時讀 (Prefix-Match Fallback)
// NAS Code 節點限制：fetch() 禁用，必須用 axios
const axios = require('axios');
const SUPABASE_URL = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SUPABASE_KEY = (typeof process !== 'undefined' && process.env && process.env.SUPABASE_SERVICE_KEY)
  || 'sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq';

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
  "成人(P)鎖匙扣 - 不銹鋼", "成人(P)吊飾 - 925銀",
  // 羊毛氈
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
  try {
    const filters = skuList.map(sku => {
      const base = getBasePrefix(sku);
      if (base) {
        return `sku.like.${encodeURIComponent(base)}*`;
      } else {
        return `sku.eq.${encodeURIComponent(sku)}`;
      }
    });
    
    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/products?or=(${filters.join(',')})&select=sku,total_base_cost`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        timeout: 5000 }
    );
    
    const rows = resp.data || [];
    const supabaseCosts = {};
    
    for (const sku of skuList) {
      const basePrefix = getBasePrefix(sku);
      const matchedRow = rows.find(r => r.sku === sku) 
        || (basePrefix && rows.find(r => r.sku.startsWith(basePrefix)));
        
      if (matchedRow) {
        supabaseCosts[sku] = { 
          Product_Name: sku, 
          Total_Base_Cost: Number(matchedRow.total_base_cost) || 0 
        };
      }
    }
    
    if (Object.keys(supabaseCosts).length > 0) {
      return batchItems.map(item => ({
        json: { ...item.json, useCache: false, supabaseFetched: true, supabaseCosts,
                batchFormula: "RECORD_ID()='SUPABASE_SKIP'" }
      }));
    }
  } catch (err) {
    // Supabase unreachable → fall through to Airtable
  }
}

// fallback
return batchItems.map(item => ({ json: { ...item.json, useCache: false, supabaseFetched: false } }));
```

---

## 3. 測試指引 (For A3)

部署後請以實際訂單測試，並在 n8n 執行日誌中確認：
1. `Smart Cache Strategist` 是否成功輸出 `supabaseFetched: true` 及完整的 `supabaseCosts` 對照表。
2. `Fetch Exact Base Cost` 節點是否成功被 skip。
3. `Local Data Mapper` 能否在 `supabaseFetched: true` 時成功將 `supabaseCosts` 映射回 item。
