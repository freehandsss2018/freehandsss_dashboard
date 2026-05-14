---
name: Overview Badge 佈局重構與材質偵測教訓
description: 兩行 badge 佈局、個別人物肢數 badge、鎖匙扣材質消失、木框舊格式 bug 根因與修復
type: feedback
---

# 2026-05-15 — Overview Badge 佈局重構

## 核心教訓

### 1. Flex 兩行佈局技術
使用零高度 100% 寬度 span 強制換行：
```html
<span style="flex-basis:100%;height:0;"></span>
```
插入位置規則：
- 非立體擺設：category+material 之後
- 立體擺設 + 有 style：style badge 之後
- 立體擺設 + 無 style：category 之後（fallback）

條件判斷：
```javascript
if (!dimensions.category.includes('立體擺設') || !dimensions.style) badgeHtml += linebreak;
// style badge 後：
if (dimensions.style && dimensions.category.includes('立體擺設')) badgeHtml += linebreak;
```

### 2. 個別人物肢數 Badge 架構
`mapOrder` 在 Fix 4D block 建立 `_limbPartsArr`（object array），存入 `LimbParts` JSON：
```javascript
var _limbPartsArr = _babySum ? [{who:'嬰兒', sum:_babySum}] : [];
// 加入父母/大寶...
LimbParts: _limbPartsArr.length > 0 ? JSON.stringify(_limbPartsArr) : ''
```

在 badge renderer 中 parse 並顯示：
```javascript
var _tblLimbParsed = null;
try { if (item.LimbParts) _tblLimbParsed = JSON.parse(item.LimbParts); } catch(e){}
var _icons = {嬰兒:'👶', 父母:'👫', 大寶:'🧒'};
var _classes = {嬰兒:'badge-target-嬰兒', 父母:'badge-target-父母', 大寶:'badge-target-大寶'};
_tblLimbParsed.forEach(lp => badgeHtml += `<span class="review-badge ${_classes[lp.who]}">${_icons[lp.who]} ${lp.who} ${lp.sum}</span>`);
```

CSS 顏色（需加入）：
```css
.badge-target-父母 { background: #FCE4EC; color: #C2185B; border-color: #F48FB1; }
.badge-target-大寶 { background: #E8F5E9; color: #388E3C; border-color: #A5D6A7; }
```

### 3. 鎖匙扣材質消失 — Supabase 不存 product_name
**根因**：`sbSyncOrder` 只存 item_key（`TEMP_K_lh`）到 Supabase，沒有 product_name 欄位。
`getProductDimensions` 的 `combinedSearch` = `"TEMP_K_lh  左手"` → 無 `不銹鋼` → material 空。

**修復**：在 material 偵測失敗時，從 category 推斷：
```javascript
if (!material) {
    if (category.includes('鎖匙扣')) material = "⚙️ 不銹鋼";
    else if (category.includes('吊飾') || category.includes('頸鏈')) material = "✨ 925銀";
}
```

**Why category fallback 安全**：FHS 系統鎖匙扣只有不銹鋼，純銀吊飾只有925銀，category 與材質一一對應。

### 4. 木框顯示舊格式 — target badge + 黃色 count badge 回退
**根因**：舊訂單 raw_form_state 無 limb_sel 資料 → `LimbParts = ''` → `_tblLimbParsed = null` → 原本邏輯只在 `_tblLimbParsed` 存在時隱藏 target badge。

**修復**：立體擺設一律隱藏 target badge（不依賴 LimbParts 是否存在）：
```javascript
if (dimensions.target && !_tblIs立體) { ... target badge ... }
// 無 LimbParts fallback：
} else if (_tblIs立體 && dimensions.count) {
    badgeHtml += `<span class="review-badge badge-target-嬰兒">👶 嬰兒 ${dimensions.count.split(' ').pop()}</span>`;
}
```

`dimensions.count.split(' ').pop()` 可從 `"✋🦶 4肢"` 提取 `"4肢"`。

## 通用原則
- badge renderer 中立體擺設的 target/count 邏輯必須統一，不能依賴 `LimbParts` 存在與否
- `getProductDimensions` 的 category fallback 可補救 Supabase 不存 product_name 的問題
- 新增 CSS class 時要同步更新 accordion + table 兩個 renderer
