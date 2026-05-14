---
name: fhs-overview-badge-layout
description: 訂單總覽 badge 佈局診斷與修復技能。當 Overview 的產品 badge 排版混亂（全在一行、材質消失、立體擺設顯示舊格式）時使用。
version: 1.0.0
created: 2026-05-15
applies_to: [build-error-resolver, frontend-developer]
---

# FHS Overview Badge 佈局診斷 SKILL

## 適用場景
- 訂單總覽 badge 全部擠在一行（無兩行格式）
- 鎖匙扣沒有 `⚙️ 不銹鋼` badge
- 純銀吊飾沒有 `✨ 925銀` badge
- 立體擺設仍顯示舊格式：`👶 嬰兒` target badge + `✋🦶 4肢` 黃色 count badge
- 玻璃瓶只顯示嬰兒 badge，沒有父母/大寶 badges

---

## 目標顯示格式

### 鎖匙扣
```
Row 1: 🔑 鎖匙扣  ⚙️ 不銹鋼
Row 2: 👶 嬰兒  🦶 左腳  x1
```

### 純銀吊飾
```
Row 1: 💍 純銀吊飾  ✨ 925銀
Row 2: 👶 嬰兒  🦶 左腳  x1
```

### 立體擺設（木框）
```
Row 1: 🎨 立體擺設  🖼️ 木框
Row 2: 👶 嬰兒 4肢
```

### 立體擺設（玻璃瓶，多人）
```
Row 1: 🎨 立體擺設  🧴 玻璃瓶
Row 2: 👶 嬰兒 1手1腳  👫 父母 2手  🧒 大寶 4肢
```

---

## 架構理解

### 兩行 Flex 換行技術
```javascript
// 在 category+material 之後（非立體擺設）
// 或 style badge 之後（立體擺設有 style）
// 或 category 之後（立體擺設無 style）
badgeHtml += `<span style="flex-basis:100%;height:0;"></span>`;

// 條件判斷：
if (!dimensions.category.includes('立體擺設') || !dimensions.style) badgeHtml += linebreak;
// style badge 後：
if (dimensions.style && dimensions.category.includes('立體擺設')) badgeHtml += linebreak;
```

### 個別人物肢數 Badge 資料流
```
mapOrder() Fix 4D block
  → _limbPartsArr = [{who:'嬰兒',sum:'1手1腳'}, {who:'父母',sum:'2手'}]
  → return { LimbParts: JSON.stringify(_limbPartsArr) }

badge renderer
  → _tblLimbParsed = JSON.parse(item.LimbParts)
  → forEach lp → render badge-target-嬰兒 / 父母 / 大寶
```

### CSS Badge Classes
```css
.badge-target-嬰兒 { background: #E1F5FE; color: #0288D1; border-color: #B3E5FC; }
.badge-target-父母 { background: #FCE4EC; color: #C2185B; border-color: #F48FB1; }
.badge-target-大寶 { background: #E8F5E9; color: #388E3C; border-color: #A5D6A7; }
```

---

## 診斷流程

### 材質 badge 消失（鎖匙扣/吊飾）
1. 查 `getProductDimensions` 的 material 偵測邏輯（關鍵字：`combinedSearch.search(/不[銹鏽]鋼/)`）
2. 確認 `combinedSearch = item.Item_ID + item.Product_Name + item.Specification`
3. 若 product_name 為空（Supabase 未存）→ 加 category fallback：
```javascript
if (!material) {
    if (category.includes('鎖匙扣')) material = "⚙️ 不銹鋼";
    else if (category.includes('吊飾') || category.includes('頸鏈')) material = "✨ 925銀";
}
```

### 立體擺設顯示舊格式（target badge + 黃色 count）
1. 查 badge renderer 中 target badge 條件：應為 `if (dimensions.target && !_tblIs立體)`
2. 查 count badge 條件：應分三路：
   - `_tblLimbParsed` → per-person badges
   - `_tblIs立體 && dimensions.count` → 藍色嬰兒 badge（fallback）
   - 其他 → 黃色 badge
3. 確認 `var _tblIs立體 = dimensions.category.includes('立體擺設')` 已定義

### 玻璃瓶父母/大寶 badge 消失
1. 查 mapOrder Fix 4D block：確認 `['父母','大寶']` 的 limb_sel 計算邏輯
2. 確認父母/大寶 limb_sel 排除「待定」（預設空值）但嬰兒不排除
3. 用 Console 確認 raw_form_state：
```javascript
fetch(SB_URL+'/rest/v1/orders?order_id=eq.ORDER_ID', {
  headers:{apikey:SB_ANON_KEY, Authorization:'Bearer '+SB_ANON_KEY}
}).then(r=>r.json()).then(d=>{
  var rfs=d[0]?.raw_form_state||{};
  Object.keys(rfs).filter(k=>k.startsWith('limb_sel')).forEach(k=>console.log(k,'=',rfs[k]));
});
```

### 兩行換行消失
1. 查 `flex-basis:100%;height:0` span 是否在 badge HTML 中
2. 確認外層容器有 `display:flex; flex-wrap:wrap`
3. 確認換行位置邏輯（見上方條件判斷）

---

## 兩個 Badge Renderer 位置

| Renderer | 位置 | 關鍵變數 |
|----------|------|---------|
| Accordion | `~line 5662` | `_accLimbParsed`, `_accIs立體` |
| Table | `~line 5870` | `_tblLimbParsed`, `_tblIs立體` |

修改任一 renderer 的邏輯，**必須同步更新另一個**。
