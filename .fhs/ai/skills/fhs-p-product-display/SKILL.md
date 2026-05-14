---
name: fhs-p-product-display
description: 立體擺設（P款）在訂單總覽的顯示診斷與修復技能。當 Overview 的立體擺設 badge 顯示不正確（肢數空白/錯誤、款式不顯示、刻字缺失）時使用。
version: 1.0.0
created: 2026-05-14
applies_to: [build-error-resolver, general-purpose]
---

# FHS P 款產品顯示診斷 SKILL

## 適用場景
- 訂單總覽「立體擺設」badge 沒有顯示肢數（4肢/1手1腳等）
- 玻璃瓶款式肢數顯示錯誤（8肢/空白）
- 木框款式正常但玻璃瓶失效
- 刻字（pEngraving）在總覽不顯示
- 款式類型（木框/玻璃瓶）badge 不顯示

---

## 架構理解

### 資料流向
```
表單填寫
  └─ captureFormState() → raw_form_state (Supabase JSONB)
  └─ orderItemsArray → order_items.specification (plain text)

訂單總覽讀取
  └─ sbFetchGlobalReview() → mapOrder()
       ├─ it.specification → _spec（from Supabase order_items）
       ├─ _rfs.pSubCat → 款式類型（Fix 4）
       ├─ _rfs.pEngraving → 刻字（Fix 4）
       └─ _rfs.limb_sel_* → 肢數摘要（Fix 4D）
  └─ getProductDimensions(item)
       └─ combinedSearch = item_key + Product_Name + Specification
            ├─ 偵測 擺設/木框/玻璃 → category = 立體擺設
            ├─ 偵測 木框/玻璃瓶 → style badge
            └─ 偵測 4肢/1手1腳/... → count badge
```

### P 款 item_key
P 款在 Supabase `order_items` 中以 `TEMP_P_MAIN` 為 item_key（一整組只有一筆）。

---

## 關鍵 Key 格式

### raw_form_state 中的 limb_sel key
```
limb_sel_{who}_{中文部位}
```
- who：嬰兒 / 大寶 / 父母
- 中文部位：左手 / 右手 / 左腳 / 右腳
- 父母只有 左手/右手（無腳）

**❌ 常見錯誤**：用 lh/rh/lf/rf → 讀不到資料

### 值的語義
| 值 | 嬰兒語義 | 大寶/父母語義 |
|---|---|---|
| 具體顏色 | ✅ 已選取 | ✅ 已選取 |
| `待定` | ✅ 選取但色待定 | ❌ Section 預設空值 |
| `無` | ❌ 未選取 | ❌ 未選取 |

---

## 正確計數邏輯（mapOrder 中 Fix 4D）

```javascript
let _handCount = 0, _footCount = 0;
// 嬰兒：只排除 '無'（待定 = 選取但顏色TBD）
['左手','右手'].forEach(function(k) {
  var v = _rfs['limb_sel_嬰兒_' + k];
  if (v && v !== '無') _handCount++;
});
['左腳','右腳'].forEach(function(k) {
  var v = _rfs['limb_sel_嬰兒_' + k];
  if (v && v !== '無') _footCount++;
});
// 大寶/父母：同時排除 '無' 和 '待定'（只計明確選色）
['大寶','父母'].forEach(function(_who) {
  ['左手','右手'].forEach(function(k) {
    var v = _rfs['limb_sel_' + _who + '_' + k];
    if (v && v !== '無' && v !== '待定') _handCount++;
  });
  ['左腳','右腳'].forEach(function(k) {
    var v = _rfs['limb_sel_' + _who + '_' + k];
    if (v && v !== '無' && v !== '待定') _footCount++;
  });
});
const _totalLimbs = _handCount + _footCount;
let _limbSummary = '';
if      (_totalLimbs === 4) _limbSummary = '4肢';
else if (_totalLimbs === 2 && _handCount === 2) _limbSummary = '2手';
else if (_totalLimbs === 2 && _footCount === 2) _limbSummary = '2腳';
else if (_totalLimbs === 2) _limbSummary = '1手1腳';
else if (_totalLimbs === 1 && _handCount === 1) _limbSummary = '1手';
else if (_totalLimbs === 1) _limbSummary = '1腳';
else if (_totalLimbs > 0)   _limbSummary = _totalLimbs + '肢';
```

---

## getProductDimensions count 偵測 pattern

```javascript
if      (combinedSearch.search(/4肢|四肢/) > -1)           count = "✋🦶 4肢";
else if (combinedSearch.search(/2肢|兩肢|一對|手足/) > -1) count = "✋🦶 2肢";
else if (combinedSearch.includes('1手1腳'))                 count = "✋🦶 1手1腳";
else if (combinedSearch.includes('2手'))                    count = "✋✋ 2手";
else if (combinedSearch.includes('2腳'))                    count = "🦶🦶 2腳";
else if (combinedSearch.includes('1手'))                    count = "✋ 1手";
else if (combinedSearch.includes('1腳'))                    count = "🦶 1腳";
```

---

## Badge 顯示規則

```javascript
// part 和 count 不並排（避免重複✋）
if (dimensions.part && !dimensions.count) { /* show part */ }
// 立體擺設不顯示 x1
if (qty >= 1 && !dimensions.category.includes('立體擺設')) { /* show qty */ }
```

---

## 診斷 Console 腳本

```javascript
// 查指定訂單的 limb_sel 資料
fetch(window.SB_URL + '/rest/v1/orders?order_id=eq.ORDER_ID', {
  headers: { apikey: window.SB_ANON_KEY, Authorization: 'Bearer ' + window.SB_ANON_KEY }
}).then(r => r.json()).then(d => {
  var rfs = d[0]?.raw_form_state || {};
  var limbKeys = Object.keys(rfs).filter(k => k.startsWith('limb_sel'));
  console.log('limb_sel 數量:', limbKeys.length);
  limbKeys.forEach(k => console.log(k, '=', rfs[k]));
  console.log('pSubCat:', rfs.pSubCat, '| pEngraving:', rfs.pEngraving);
});
```

---

## 玻璃瓶 vs 木框 結構差異

| | 木框 | 玻璃瓶 |
|---|---|---|
| 嬰兒 section | ✅ | ✅ |
| 父母 section | ❌ | ✅（左手/右手只） |
| 大寶 section | ❌ | ✅（全4肢） |
| raw_form_state limb key 數量 | 4 | 10 |

**根因**：木框只有 4 個 limb_sel，計數不受「待定」干擾。  
玻璃瓶有 10 個，6 個大寶/父母預設為「待定」，若計入則得 8肢 → pattern 無匹配 → 空白。
