# 加購配件產品新增 SOP

> 適用：build-error-resolver、frontend-developer subagent
> 建立：2026-05-21（源自 W_WOOL 羊毛氈公仔 debug session）
> 版本：v1.0

---

## Pattern 定義：什麼是「加購型配件」

加購型配件（Add-on Product）是指：

- 依附於主產品（通常是立體擺設 `_P_`）的選購附加品
- 使用者在表單中以獨立 checkbox 勾選
- 提交後以獨立 `Order_Item_Key`（如 `{orderId}_W_WOOL`）寫入訂單
- **UI 呈現**：不獨立成行，應合併至父產品同列顯示為 inline badge

**現有範例：**
- `🧸 羊毛氈公仔`（Order_Item_Key 後綴：`_W_WOOL`，form field：`w_wool_en`）

---

## Supabase FK 保護原則（最重要）

> ⚠️ 違反此原則會觸發 23503 FK violation，導致**整批 INSERT rollback**

`order_items.product_sku` 有 FOREIGN KEY → `products(sku)` 約束。

**規則：`sbSyncOrder` 的 item mapper 絕對不能寫入 `product_sku`。**

加購配件的 `Product_Name`（如「羊毛氈公仔 - 加購」）通常不存在於
`products` 表，強行寫入會讓整批訂單子項目消失（所有 item 全部失敗）。

```javascript
// ✅ 正確：不寫 product_sku
return {
    order_fhs_id:  orderId,
    item_key:      item.Order_Item_Key,
    item_category: _deriveCat(item.Order_Item_Key),
    quantity:      item.Quantity || 1,
    engraving_text: item.Notes || '',
    specification: _spec,
    process_status: '待製作'
    // product_sku intentionally omitted — FK constraint
};

// ❌ 錯誤：會觸發 23503
return {
    ...
    product_sku: item.Product_Name || ''  // 若名稱不在 products 表 → 整批失敗
};
```

---

## 四個必改位置

### A. Webhook Builder（提交時建立 orderItemsArray）

檔案：`freehandsss_dashboardV41.html`，函式：webhook builder（行 ~5300 區）

加購配件需在主產品（P_MAIN）push 之後，額外 push 一個 item。
Guard 條件：`enableP`（主產品已啟用）AND 加購配件本身的 enable flag。

```javascript
// 範例：W_WOOL（羊毛氈公仔）
const _diagEnP   = getValSafe('enableP', false);
const _diagWool  = getValSafe('w_wool_en', false);   // ← 新配件換此 flag
if (_diagEnP && _diagWool) {
    orderItemsArray.push({
        "Order_Item_Key": `${currentOrderId}_W_WOOL`,  // ← 換後綴
        "Product_Name":   "羊毛氈公仔 - 加購",          // ← 換名稱
        "Quantity":       1
    });
}
```

**新配件替換項目：**
- `w_wool_en` → 新配件的 form field id
- `_W_WOOL` → 新配件的 Order_Item_Key 後綴（全大寫，下劃線開頭）
- `"羊毛氈公仔 - 加購"` → 新配件的 Product_Name

---

### B. `_deriveCat`（sbSyncOrder category mapping）

檔案：`freehandsss_dashboardV41.html`，函式：`_deriveCat`（行 ~8323）

加購配件需有對應的 category 字串，否則 `item_category` 欄位為空。

```javascript
function _deriveCat(key) {
    const k = (key || '').toUpperCase();
    if (k.match(/_P_/))       return '立體擺設';
    if (k.match(/_K_/))       return '金屬鎖匙扣';
    if (k.match(/_M_/))       return '銀飾';
    if (k.includes('_W_WOOL')) return '配件';   // ← 羊毛氈公仔
    // 新配件：在此添加 if (k.includes('_新後綴')) return '類別名稱';
    return '';
}
```

---

### C. `getProductDimensions`（badge 渲染識別）

檔案：`freehandsss_dashboardV41.html`，函式：`getProductDimensions`（行 ~5650）

加購配件需在 category 解析區段加入識別規則，否則 badge 顯示「📦 其他」。

```javascript
// Category 解析區（行 ~5653）
if      (rawID.includes('_K_') || ...)                    { category = "🔑 鎖匙扣"; emoji = "🔑"; }
else if (rawID.includes('_M_') || ...)                    { category = "💍 純銀吊飾"; emoji = "💍"; }
else if (rawID.includes('_P_') || ...)                    { category = "🎨 立體擺設"; emoji = "🎨"; }
else if (rawID.includes('_W_WOOL') || combinedSearch.includes('羊毛氈')) {
                                                            category = "🧸 羊毛氈公仔"; emoji = "🧸"; }
// 新配件：else if (rawID.includes('_新後綴') || ...) { category = "emoji 名稱"; emoji = "emoji"; }
```

---

### D. Review Mode 渲染（Desktop + iPhone 同步）

加購配件不獨立成行，需從 `items` 陣列移除後，以 inline badge 注入父產品。

**兩個函式都必須修改（缺一不可）：**
- `renderReviewTable`（Desktop table，行 ~6200）
- `renderReviewAccordion`（iPhone accordion，行 ~5996）

**模式（兩函式結構相同，變數名稱有前綴區別）：**

```javascript
// 1. 在 sort 之後，cDate 之前加入分離邏輯
const _woolKey = (it) => (it.Order_Item_Key || it.Item_ID || '').toUpperCase().includes('_W_WOOL');
const _hasWool = (o.items || []).some(_woolKey);
const _renderItems = _hasWool
    ? (o.items || []).filter(it => !_woolKey(it))
    : (o.items || []);
const _renderItemsFinal = _renderItems.length > 0 ? _renderItems : (o.items || []);

// 2. itemsCount / itemCount 改用 _renderItemsFinal
const itemsCount = _renderItemsFinal.length > 0 ? _renderItemsFinal.length : 1;

// 3. forEach 改用 _renderItemsFinal
_renderItemsFinal.forEach((item, index) => {
    // ...badge 建構...

    // 4. qty badge 之後，注入加購 badge（只加在立體擺設的 index === 0）
    if (_hasWool && dimensions.category.includes('立體擺設') && index === 0) {
        badgeHtml += `<span class="review-badge"
            style="background:#FFF3E0; border:1px solid #FF9800; color:#E65100; font-weight:600;">
            🧸 羊毛氈公仔</span>`;
    }
});
```

**新配件擴展：**
若新增第二種加購配件（如 `_NEW_ADDON`），需將分離邏輯從單一 `_woolKey` 擴展為通用 addon 偵測：

```javascript
// 通用 addon 偵測（當有多種加購配件時）
const ADDON_SUFFIXES = ['_W_WOOL', '_NEW_ADDON'];  // ← 新增後綴加入此陣列
const _isAddon = (it) => ADDON_SUFFIXES.some(s =>
    (it.Order_Item_Key || it.Item_ID || '').toUpperCase().includes(s));
```

---

## 新增加購配件 Checklist（4 項）

在新增任何加購配件前，subagent 必須逐項確認：

- [ ] **A. Webhook Builder** — 已在主產品 push 後加入加購 item push（含雙重 guard）
- [ ] **B. `_deriveCat`** — 已加入新 Order_Item_Key 後綴的 category mapping
- [ ] **C. `getProductDimensions`** — 已加入 category/emoji 識別規則
- [ ] **D. 兩個渲染函式** — `renderReviewTable` 和 `renderReviewAccordion` 都已更新，
       加購 badge 注入至父產品行（`index === 0` + 父類別條件）

> `sbSyncOrder` item mapper **不需要**修改，保持不寫 `product_sku` 即可。

---

## 延伸：若需讓加購配件出現在 Supabase products 表

目前加購配件（如「羊毛氈公仔 - 加購」）**不在** `products` 表中。
若日後需要 `product_sku` linkage（成本追蹤、報表等），需先：

1. 在 Supabase `products` 表新增對應 SKU row
2. 在 Smart Cache Strategist V47.9 的 hardcoded cost 表加入成本
3. 才可在 `sbSyncOrder` 恢復寫入 `product_sku`

未完成以上步驟前，**絕對不能**在 `sbSyncOrder` 加入 `product_sku`。

---

## 五. n8n 端三層必改（V47.11 教訓）

### E. n8n `Smart Cache Strategist` COST_MAP

位置：workflow 節點 `Smart Cache Strategist`（V47.11 後）
必改：在 `COST_MAP` 常數中新增一行：
  "新產品 SKU": <cost值>,

若新產品為服務型（無材料成本），填 0。
若新產品未在此表 → lookupCost 返回 null → 整批訂單落 Airtable fallback（Airtable 429 月限時直接 workflow Error）。

### F. n8n `Parse Items & Generate SKU` normalization

若 Dashboard 送出的 `Product_Name` 有多種可能變體（例如短名稱），
在節點 Section 4 加防禦性 normalize：
  `if (sku.includes("關鍵詞")) { sku = "標準 SKU 字串"; }`

### G. n8n `Calculate Profit & Pack Items` getItemCategory

在 `getItemCategory()` 中新增分支（在 `return '其他'` 之前）：
  `if (sku.includes("新產品關鍵詞")) return '類別名稱';`

類別名稱必須與 Supabase `order_items.item_category` 實際值一致：
  `立體擺設` / `金屬鎖匙扣` / `純銀頸鏈吊飾` / `配件` / `其他`

⚠️ 注意：此節點歷史上曾有 CJK 亂碼（V47.5 儲存時 UTF-8 損毀），
若 `includes` 比對失效，需先確認節點原始碼是否含 `?` 亂碼字元。
