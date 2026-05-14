---
name: P 款立體擺設 Overview Badge 除錯教訓
description: limb_sel key 中文命名、待定/無分層計算、玻璃瓶 vs 木框 結構差異
type: feedback
---

# 2026-05-14 — P 款立體擺設 Overview Badge 除錯

## 核心教訓

### 1. captureFormState 的 limb-sel key 格式
`captureFormState` 對 `class="limb-sel"` 元素使用 `data-part` attribute 作 key：
```
key = `limb_sel_${data-who}_${data-part}`
```
`data-part` 是**中文**：左手/右手/左腳/右腳（**不是** lh/rh/lf/rf）

❌ 錯誤：`_rfs['limb_sel_嬰兒_lh']`
✅ 正確：`_rfs['limb_sel_嬰兒_左手']`

### 2. 玻璃瓶 vs 木框 DOM 結構差異
- 木框：只有【嬰兒】section → raw_form_state 只有 `limb_sel_嬰兒_*`
- 玻璃瓶：有【嬰兒】+【父母】+【大寶】三個 section
  - 父母只有 左手/右手（沒有左腳/右腳）
  - 大寶有全部 4 肢

### 3. 待定 vs 無 的語義差異
| 值 | 來源 | 語義 |
|---|---|---|
| 具體顏色（香橙金等）| 用戶明確選取 | ✅ 包含此肢 |
| `待定` | 兩種情況（見下）| 視情況 |
| `無` | 用戶明確排除 | ❌ 不包含 |

**「待定」的兩種情況：**
- 嬰兒 `待定` = 用戶點了快速選色但顏色未定 → **計算為「已選取」**
- 大寶/父母 `待定` = section 預設空值（未啟用）→ **不計算**

### 4. 正確的計數邏輯
```javascript
// 嬰兒：只排除 '無'（'待定' = 選取了但顏色TBD）
['左手','右手'].forEach(k => { if (v !== '無') handCount++; });
['左腳','右腳'].forEach(k => { if (v !== '無') footCount++; });

// 大寶/父母：同時排除 '無' 和 '待定'（只計明確選色的）
['左手','右手'].forEach(k => { if (v && v !== '無' && v !== '待定') handCount++; });
['左腳','右腳'].forEach(k => { if (v && v !== '無' && v !== '待定') footCount++; });
```

### 5. getProductDimensions count pattern
新增肢數 pattern，必須同時在 `getProductDimensions` 中偵測：
```
4肢、四肢、2肢、兩肢、1手1腳、2手、2腳、1手、1腳
```

### 6. Badge 顯示規則
- 已有 `count`（立體擺設肢數）→ 不顯示 `part`（避免 ✋ 重複）
- 立體擺設不顯示 x1 qty badge（套裝概念，qty 無意義）

## Debug 流程
1. 懷疑 limb count bug → 先用 Console 查 raw_form_state：
   ```javascript
   fetch(SB_URL+'/rest/v1/orders?order_id=eq.ORDER_ID', {
     headers: {apikey: SB_ANON_KEY, Authorization: 'Bearer '+SB_ANON_KEY}
   }).then(r=>r.json()).then(d=>{
     var rfs = d[0]?.raw_form_state || {};
     Object.keys(rfs).filter(k=>k.startsWith('limb_sel')).forEach(k=>console.log(k,'=',rfs[k]));
   });
   ```
2. 確認值是顏色、待定、還是無 → 對應修復邏輯
3. 修復後確認 `_specFinal` 包含正確肢數字串（4肢/1手1腳等）
