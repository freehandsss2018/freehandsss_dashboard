# FHS Dashboard Local Implementation Plan — 新增「燈飾」加購配件

> **日期**：2026-05-27
> **負責代理**：Antigravity (A2)
> **狀態**：✅ Session 33 執行完成（2026-05-27）— migration 0019 待 Fat Mo 部署 Supabase
> **關聯 SOP**：`.fhs/notes/addon_product_sop.md`

---

## 1. 目標與範圍 (Goal & Scope)

在 Freehandsss (FHS) 系統中全面加入「燈飾」作為立體擺設主產品的選購配件：
- **產品名稱**：`燈飾 - 加購`
- **定價**：$80
- **數據識別鍵值**：`_L_LIGHTS` (前瞻 SKU 後綴)
- **表單元件 ID**：`l_light_en`
- **整合範圍**：
  - 前端 UI 表單增加開關與計價連動。
  - Webhook payload 新增對應子項目。
  - Review 渲染（Desktop + Mobile）不獨立成行，合併顯示為黃色 badge `💡 燈飾`。
  - 數據庫層（Supabase）新增 SKU 外鍵行以防止下單 FK Rollback 錯誤。
  - 成本與利潤對帳（n8n）新增對應規則。

---

## 2. 分析發現與風險 (Findings & Risks)

1. **外鍵關聯風險 (23503 FK Violation)**：
   - 歷史上新增「羊毛氈公仔」時曾因 Supabase 中不存在該 SKU，導致 order_items 寫入時觸發外鍵約束 rollback 整批訂單。
   - **防禦對策**：必須同時提供並套用 Supabase migration (`0019_add_light_addon_product.sql`)，在 `products` 表中預先註冊 `燈飾 - 加購` 商品。
2. **Review 表單渲染干涉 (Multi-Addon Concurrency)**：
   - 舊版 `renderReviewTable` 和 `renderReviewAccordion` 是針對單一 `_woolKey` (羊毛氈) 做分離與過濾。
   - **優化設計**：重構為通用 `_isAddon` 篩選，支援 `_W_WOOL` 與 `_L_LIGHTS` 同時過濾。防止新增燈飾後，羊毛氈獨立成行或彼此干擾的 Bug。
3. **n8n 成本對帳 (Smart Cache Missing)**：
   - 若 n8n COST_MAP 缺少 `燈飾 - 加購`，會返回成本 null 並導致訂單存入 Airtable 失敗。
   - **防禦對策**：需更新 n8n 相關常數。燈飾目前無材料成本，預計設為 $0。

---

## 3. 擬議修改檔案清單 (Proposed Files changes)

### 📂 [MODIFY] `Freehandsss_Dashboard/freehandsss_dashboardV41.html`

1. **HTML 結構**（約 L2535）：在羊毛氈公仔下方插入燈飾 checkbox。
   ```html
   <div class="part-item">
       <div style="display:flex; justify-content:space-between; align-items:center;">
           <span style="font-weight: bold; color: #444;">💡 燈飾 ($80)</span>
           <label class="switch"><input type="checkbox" id="l_light_en" onchange="generate()"><span class="slider"></span></label>
       </div>
   </div>
   ```
2. **計價引擎 `buildOrderItemsForPricing()`**（約 L4635）：追加 isAccessory 項目。
   ```javascript
   if (getValSafe('enableP', false) && getValSafe('l_light_en', false)) {
       orderItemsArray.push({
           "Order_Item_Key": "TEMP_L_LIGHTS",
           "Product_Name": "燈飾 - 加購",
           "Quantity": 1,
           "isAccessory": true
       });
   }
   ```
3. **計價 logs `calculatePricing()`**（約 L4765）：加入價格匹配。
   ```javascript
   if (item.isAccessory) {
       let price = 0;
       if (name.includes("羊毛氈")) price = 680;
       else if (name.includes("燈飾")) price = 80;
       price *= qty;
       totalSuggestedPrice += price;
       breakdownParts.push(price);
       item.CalculatedPrice = price;
       logs.push(`${name.includes("燈飾") ? "💡" : "🧸"} <b>${name}</b> x${qty}: $${price}`);
       totalDrawingCost += item.FatMoCost;
   }
   ```
4. **IG 預覽 `generate()`**（約 L4930）：
   ```javascript
   if (document.getElementById('l_light_en')?.checked) html += ` ▪️ 💡 燈飾 x1 $80<br>`;
   ```
5. **Webhook Builder `createOrder()`**（約 L5705）：
   ```javascript
   const _diagLight = getValSafe('l_light_en', false);
   if (_diagEnP && _diagLight) {
       orderItemsArray.push({
           "Order_Item_Key": `${currentOrderId}_L_LIGHTS`,
           "Product_Name": "燈飾 - 加購",
           "Quantity": 1
       });
   }
   ```
6. **品項屬性解析 `getProductDimensions()`**（約 L5965）：
   ```javascript
   else if (rawID.includes('_L_LIGHTS') || combinedSearch.includes('燈飾')) { category = "💡 燈飾"; emoji = "💡"; }
   ```
7. **`_deriveCat()` 映射**（約 L9900）：
   ```javascript
   if (k.includes('_L_LIGHTS')) return '配件';
   ```
8. **Accordion (Mobile) 渲染過濾與 Badge 注入**（約 L6392 與 L6480）：
   - 過濾器：
     ```javascript
     const _accAddonKey = (it) => {
         const _k = it.Order_Item_Key || it.Item_ID || '';
         return _k.toUpperCase().includes('_W_WOOL') || _k.toUpperCase().includes('_L_LIGHTS') ||
                _k.includes('羊毛氈') || _k.includes('燈飾') || it.Category === '配件';
     };
     ```
   - Badge 注入（合併至立體擺設）：
     ```javascript
     const _hasLight = (o.items || []).some(it => (it.Order_Item_Key || it.Item_ID || '').toUpperCase().includes('_L_LIGHTS') || (it.Product_Name || '').includes('燈飾'));
     if (_hasLight && !_accLightBadgeShown && dimensions.category.includes('立體擺設')) {
         _accLightBadgeShown = true;
         badgeHtml += `<span class="review-badge" style="background:#FFFDE7; border:1px solid #FBC02D; color:#F57F17; font-weight:600;">💡 燈飾</span>`;
     }
     ```
9. **Table (Desktop) 渲染過濾與 Badge 注入**（約 L6726 與 L6895）：
   - 比照 Accordion 機制重構過濾器，並在 table 行渲染時若 `_hasLight` 且屬於立體擺設時，注入 `💡 燈飾` badge。

---

### 📂 [NEW] `supabase/migrations/0019_add_light_addon_product.sql`

```sql
-- 0019_add_light_addon_product.sql
-- 註冊「燈飾 - 加購」加購型商品以滿足外鍵約束
INSERT INTO products (sku, name, category, price, is_active)
VALUES (
  '燈飾 - 加購',
  '燈飾 - 加購',
  '配件',
  80,
  true
)
ON CONFLICT (sku) DO UPDATE 
SET price = EXCLUDED.price, is_active = EXCLUDED.is_active;
```

---

### 🌐 [n8n Workflows]

1. **`Smart Cache Strategist` COST_MAP**：
   - 新增一行：`"燈飾 - 加購": 0,` (無材料成本)
2. **`Parse Items & Generate SKU` normalization**：
   - 確保若傳入名稱包含 "燈飾"，轉為標準 SKU `燈飾 - 加購`。
3. **`Calculate Profit & Pack Items` getItemCategory**：
   - 分支中加入：`if (sku.includes("燈飾")) return '配件';`

---

## 4. NO-TOUCH 護欄聲明

> ⚠️ **重要**：此階段為本地分析與實施計畫產出。根據憲法架構規定，本代理人在此步驟**不得**對專案程式碼執行任何實體修改。計畫將直接呈報給 Fat Mo 與 A3 (Claude Code) 審查，獲得明確執行授權後方可實施。
