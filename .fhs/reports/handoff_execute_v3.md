# 執行交接 v3 — 羊毛氈 Bug 修復 + 新產品 SOP
> **日期**：2026-05-23  
> **來源**：A3 (Claude Code) v2 自我批評 → A2 (Antigravity) 審閱三盲點修正  
> **交接對象**：A2 (Antigravity) 執行 AG 域工作  
> **授權**：Fat Mo 口頭授權「你修改後，交由 ag 執行」

---

## 已完成（A3 執行，無需 AG 重做）

| # | 內容 | 狀態 |
|---|------|------|
| A1 | Supabase `products` INSERT「羊毛氈公仔 - 加購」（cost=$0, price=$680） | ✅ Live |
| A2-dry | n8n `Smart Cache Strategist` V47.11 補丁（+羊毛氈條目）| ⏸ dry-run 就緒 |
| A3-dry | n8n `Parse Items & Generate SKU` V47.11 補丁（+防禦性 normalize）| ⏸ dry-run 就緒 |
| A4-dry | n8n `Calculate Profit & Pack Items` V47.11 補丁（CJK 重建 + 配件分支）| ⏸ dry-run 就緒 |

> **A2-A4 n8n 部署**：需 A3 `update_node_code dryRun=false`，AG 無此 MCP 工具，須回 A3 執行。

---

## Phase 0 — 根因確認（AG 修正 v2 盲點 2）

> v2 錯誤：提議 curl n8n REST API，可能被 NAS 防火牆封鎖。  
> v3 修正：直接請 Fat Mo 在**瀏覽器**確認。

**請 Fat Mo 操作（1 分鐘）**：
1. 開 `https://yanhei.synology.me:8443/workflow/6Ljih0hSKr9RpYNm/executions/3685`
2. 點開失敗節點（截圖右側 Mirror Delete / HTTP Supabase Sync RPC 紅色節點）
3. 複製 error message 回報給 A3 或 A2

**Gate 0 PASS 條件**：拿到真實 error message 字面值。  
→ 若確認為 product_sku FK 23503：A3 立刻翻 dryRun=false 部署 A2-A4  
→ 若為其他原因：A3 另訂修復方案

---

## AG 執行域（本次交接核心）

### 任務 1 — 階段 1 SOP 補完

#### 1a. `addon_product_sop.md` → 擴展為全端必改清單

在現有「四個必改位置（Dashboard）」之後，新增第五節：

**「五. n8n 端三層必改（V47.11 教訓）」**

```markdown
### E. n8n `Smart Cache Strategist` COST_MAP

位置：workflow 節點 `Smart Cache Strategist`（V47.11 後）
必改：在 `COST_MAP` 常數中新增一行：
  "新產品 SKU": <cost值>,

若新產品為服務型（無材料成本），填 0。
若新產品未在此表 → lookupCost 返回 null → 整批訂單落 Airtable fallback（Airtable 429 月限時直接 workflow Error）。

### F. n8n `Parse Items & Generate SKU` normalization

若 Dashboard 送出的 Product_Name 有多種可能變體（例如短名稱），
在節點 Section 4 加防禦性 normalize：
  if (sku.includes("關鍵詞")) { sku = "標準 SKU 字串"; }

### G. n8n `Calculate Profit & Pack Items` getItemCategory

在 getItemCategory() 中新增分支（在 return '其他' 之前）：
  if (sku.includes("新產品關鍵詞")) return '類別名稱';

類別名稱必須與 Supabase order_items.item_category 實際值一致：
  立體擺設 / 金屬鎖匙扣 / 純銀頸鏈吊飾 / 配件 / 其他

⚠️ 注意：此節點歷史上曾有 CJK 亂碼（V47.5 儲存時 UTF-8 損毀），
若 includes 比對失效，需先確認節點原始碼是否含 `?` 亂碼字元。
```

#### 1b. `pitfalls.yaml` — 新增 P7

```yaml
  - id: P7
    name: n8n-mirror-prep-product-sku-fk
    layer: n8n + Supabase
    symptom: >
      n8n workflow Error in ~20s（timeout 特徵，非毫秒級快速拒絕）。
      order_items 未寫入 Supabase，或 Mirror Prep 路徑卡住。
    root_cause: >
      新加購配件的 Product_Name（如「羊毛氈公仔 - 加購」）不在 Supabase products 表，
      但 Supabase Mirror Prep 節點把 item.Product_Name 寫入 product_sku 欄位，
      觸發 FK 23503（order_items.product_sku → products.sku），整個 RPC 交易 rollback。
      同時，Smart Cache COST_MAP 缺此 SKU → lookupCost null → supabaseFetched=false
      → 落 Airtable fallback → Airtable 429 月限 → 20s timeout → workflow Error。
    fix_applied: >
      1. Migration 0014：INSERT 羊毛氈公仔入 products 表（cost=0, price=680）
      2. Smart Cache V47.11：COST_MAP 加「羊毛氈公仔 - 加購」: 0
      3. Parse Items V47.11：加防禦性 normalize（includes('羊毛氈') → 標準 SKU）
      4. Calculate Profit V47.11：重建 getItemCategory（CJK 修復 + 配件分支）
    detection_rule: >
      grep -n '"product_sku"' n8n/*.json
      — 若節點直接 assign item.Product_Name → product_sku，需確認該 SKU 已在 products 表
    prevention: >
      新增任何加購配件時，必須先執行 /new-product SOP Step 1（products 表 INSERT）
      和 Step 2（Smart Cache COST_MAP 更新），再部署 Dashboard 或 n8n 節點改動。
      順序：Supabase products → Smart Cache → Parse Items → Calculate Profit → 測試。
```

#### 1c. `new-product.md` Step 2 補充

在 Step 2「n8n SKU 表更新」的 2c 後新增：

```markdown
2d. 確認 Supabase Mirror Prep product_sku 寫入安全性
    檢查 Mirror Prep 節點：`product_sku: item.Product_Name || null`
    若新產品 SKU **已在 products 表**（Step 1 已建）→ FK 安全，無需改動
    若新產品 SKU **不在 products 表**（刻意不入表的加購品）→ 
      必須在 Mirror Prep 加 guard：
      `product_sku: isAddonItem(item.Order_Item_Key) ? null : (item.Product_Name || null)`
```

---

### 任務 2 — 階段 2 執行方向確認（AG 修正 v2 盲點 1）

> v2 錯誤：A3 誤判動態配件 UI 違反 captureFormState 憲法規則。  
> AG 實際分析：captureFormState 使用 `querySelectorAll('input, select')` 動態遍歷，
> 新 checkbox 只需放 `#formContainer` 內且有唯一 id，**不需修改 captureFormState 一行代碼**。

**AG 建議 Option A（Fat Mo 已隱性確認）**：
- Smart Cache Strategist 從 hardcoded COST_MAP → **改為 Supabase REST 即時讀取**
- Dashboard 配件 checkbox 維持 hardcoded HTML（不做動態管理頁）
- 理由：加購配件目前極少，SOP 靜態維護 5 分鐘完成，避免動態渲染 Restore Timing 潛在 Bug

**AG 在此任務中的角色**：
1. 確認此方向是否符合 Fat Mo 意圖（若 Fat Mo 要動態 UI，AG 紅旗通知 A3 可行但不建議）
2. 若確認 Option A：**起草 Smart Cache Supabase 即時讀版本設計**（AG 設計，A3 執行 n8n 部署）

Smart Cache 即時讀架構草案（給 AG 審閱）：
```javascript
// V47.12 Smart Cache — Supabase REST 即時讀（替代 hardcoded COST_MAP）
// NAS Code 節點限制：fetch() 禁用，必須用 axios
const axios = require('axios');
const SUPABASE_URL = 'https://vpmwizzixnwilmzctdvu.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY 
  || 'sb_secret_EXq938yU-MinIxdpOc0nZg_qL-N3BCq';

const batchItems = $("Batch SKU Collector").all();
const hasValidItems = batchItems.some(item => item.json.hasItems === true);
const skuList = batchItems.length > 0 ? (batchItems[0].json.sku_list || []) : [];

if (hasValidItems && skuList.length > 0) {
  try {
    const skuFilter = skuList.map(s => `sku.eq.${encodeURIComponent(s)}`).join(',');
    const resp = await axios.get(
      `${SUPABASE_URL}/rest/v1/products?or=(${skuFilter})&select=sku,total_base_cost`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        timeout: 5000 }
    );
    const supabaseCosts = {};
    (resp.data || []).forEach(row => {
      supabaseCosts[row.sku] = { Product_Name: row.sku, Total_Base_Cost: Number(row.total_base_cost) || 0 };
    });
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

**AG 任務**：審閱此草案，確認 prefix-match 邏輯（現 COST_MAP 有 prefix 功能）需補回，並確認 OR filter URL encoding 對中文 SKU 是否正確。

---

## AG 不執行域（需回 A3）

| 項目 | 原因 |
|------|------|
| n8n 節點 dryRun=false 部署 | 需 `update_node_code` MCP，A3 專用 |
| Supabase REST 寫入 | 需 service key HTTP 工具，A3 執行 |
| Phase 0 根因確認 | 等 Fat Mo 瀏覽器截圖後，A3 判斷 |

---

## 完成後 AG 回報給 A3

AG 完成任務 1（SOP 補完）後，請更新 `handoff.md` 告知 A3：
- 已更新哪些文件
- Smart Cache 即時讀草案是否通過審閱（需 A3 部署）
- Phase 0 根因是否已確認

---
*本文件由 A3 撰寫，整合 A2 三盲點修正，授權 A2 執行 AG 域工作。*
