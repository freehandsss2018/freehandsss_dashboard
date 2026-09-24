# 訂單總覽批次色方案 C — 執行方案（交 Sonnet 執行）

- 日期：2026-09-14｜決策編號（完成後落 decisions.md）：D79
- 對象檔：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（行號以 commit `fefd439` 為準，**落手前一律用 grep 錨點重新定位，唔可以盲信行號**）
- 方案預覽：https://claude.ai/code/artifact/92378db6-d6ab-48f2-8f04-46b12324618c
- 起草：主 session（Opus 5）＋ ui-designer subagent 定稿規格＋3 路 Explore 盤點；色值同對比度已由主 session 用程式獨立重算核對（0 差異）

---

## 一、已裁決事項（接手者不得重開）

1. **Fat Mo 揀方案 C**：底色表達「訂單」，顏色表達「批次」，品項行加一層極淡批次底色。
2. **訂單層格**（勾選格、單號、日期、客人、備註）＝只用訂單斑馬底色，**唔再跟任何批次**。今朝 commit `e54a0fa` 為單號/日期/客人加嘅 `class="batch-cell"` 同 `background-color:${batchCol}` 要撤回。
3. **斑馬底色**按「渲染次序」單雙交替：單張 `#FFFFFF`、雙張 `#FAF7F4`（＝`--fhs-bg-base`）。已查證外層迴圈冇提早 `return`，每張單都一定渲染，可直接用迴圈 index。
4. **品項格淡底**＝批次深色 **9%** 疊喺該張單嘅斑馬底色（**唔係 35%**：35% 淡色實際只得約 5.6% 批次色，會被斑馬紋蓋過）。用 JS 預先計好 hex，**唔用 `color-mix()`**（全檔零使用，避免舊 Safari 相容風險）。
5. **產品明細卡**：卡底透明（直接用外層格淡底，只得一層顏色），左邊 **4px** 批次深色色條；冇批次＝4px 透明（保持內容對齊）。
6. **批次輸入框**：有批次＝底色「深色 16% 疊白」、1px 實線深色邊框、字色 `var(--fhs-text-primary)`（#2C2416）；冇批次＝白底 `var(--fhs-bg-surface)`、`1px dashed #9A8A76`（新 token `--fhs-batch-empty-border`）；focus 一律改 `outline:2px solid var(--fhs-text-primary); outline-offset:1px`，**移除橙色 `#d35400` focus 框**（同 0 號、4 號深色太近）。
7. **類別視圖**（手模／鎖匙扣／頸鏈，冇產品明細欄）：色條落**第一個類別格**，用 `box-shadow: inset 4px 0 0 <accent>`，**唔用 border-left**（避免 border-collapse 走位）。
8. **750-1129px 合併財務欄**：同其他品項格一樣用淡底。
9. **無子項目 fallback 列**：用 `o.Batch` 當一件貨處理；有數字＝淡底，冇數字＝斑馬底；**冇色條**。
10. **手機 accordion（<750px）**：唔使斑馬紋（每張單本身係獨立卡）；卡片 4px 色條＋卡底「深色 9% 疊白」（實測卡片祖先第一層不透明底色係白色 `.card`）；批次框用同第 6 點一樣樣式；**即時變色要擴展到手機**（而家手機改批次唔會即時變色，見三-4）。
11. **取色規則**：批次字串抽數字部分 `parseInt` 後 `% 10`；冇數字（空、「待定」、「批次」）一律當冇批次。即 26/36/46 同色（可接受：相隔 10 批嘅貨極少同時喺畫面）。
12. **舊 `BATCH_COLORS` + `getBatchColor()` 整個換走**，7 個呼叫點全部改寫（佢哋全部當字串用，改回傳 object 會爆，所以唔好保留同名 function 改語意）。
13. **每批換色**：Fat Mo 2026-09-14 已接受。新色板取代舊色（例：第36批由三文魚紅變玫瑰粉、第34批由薄荷綠變琥珀）。

## 二、色值表（已獨立重算，0 差異）

| 尾數 | accent（色條/邊框） | pill（批次框底，16%疊白） | rowW（白單淡底，9%） | rowZ（斑馬單淡底，9%疊#FAF7F4） | accent 對白 |
|---|---|---|---|---|---|
| 0 | #C0583E | #F5E4E0 | #F9F0EE | #F5E9E4 | 4.46 |
| 1 | #4A7FB5 | #E2EBF3 | #EFF3F8 | #EAECEE | 4.20 |
| 2 | #7A8A2F | #EAECDE | #F3F4EC | #EEEDE2 | 3.82 |
| 3 | #8E6BB0 | #EDE7F2 | #F5F2F8 | #F0EAEE | 4.30 |
| 4 | #B87A1F | #F4EADB | #F9F3EB | #F4ECE1 | 3.59 |
| 5 | #3E9A8C | #E0EFED | #EEF6F5 | #E9EFEB | 3.38 |
| 6 | #C25B84 | #F5E5EB | #FAF0F4 | #F5E9EA | 4.10 |
| 7 | #607D8B | #E6EAEC | #F1F3F5 | #ECECEB | 4.37 |
| 8 | #A0673F | #F0E7E0 | #F6F1EE | #F2EAE4 | 4.66 |
| 9 | #5A9E5A | #E5EFE5 | #F0F6F0 | #ECEFE6 | 3.24 |

- 批次框文字 `#2C2416` 對 pill ≥12.4:1；虛線框 `#9A8A76` 對白 3.35、對斑馬 3.14；focus `#2C2416` 對白 15.3。
- 例：第36批→6（玫瑰粉）、第34批→4（琥珀）、第31批→1（藍）。

## 三、已驗證事實（不必重查）

1. **CSS 層**：`.batch-cell` 零 CSS 規則（純 JS 標記 class）；`tr:hover`（~L1072）只改 box-shadow 唔改背景；表格冇斑馬紋、冇 dark mode、冇 `@media print`、冇 `color-mix()`。
2. **`.review-item-card`** 只喺桌面產品卡（~L13801）用，CSS 規則 ~L1312（白底＋淡陰影），~L3412-3413 只改字級。改 CSS 規則安全。
3. **`.review-batch-input`** ~L1500-1508：白底、`#ddd` 邊、`#B07D4C` 字、focus 橙框。
4. **手機即時變色失效**（既有問題）：`applyBatchColorLive` regex 只認 `batch-input-`，手機框 id 係 `acc-batch-`；`saveInlineEdit` 搵 `row-..-item-..` 亦只存在桌面。手機要等全量重畫先變色。
5. **`--fhs-bg` 同 `--fhs-bg-card` 全檔冇定義**（既有潛在問題，`var()` 失效＝透明）。手機卡片實測祖先第一層不透明底色＝白色 `.card`。**本次唔修呢兩個 token**，只係新樣式唔依賴佢哋。
6. 類別橫幅「批次分佈」pills（~L13161-13166）冇用批次色，**不受影響**。
7. 批量改批次（~L14316）改完靠全量重畫，**自動跟新樣式**，唔使改。
8. 已完成分頁同進行中共用同一 render function。
9. `window.getBatchColor` 從未被賦值，~L15901 嘅 `window.getBatchColor ||` 係死代碼。
10. 受影響訂單（實測 62 張已載入）：0600914（∅,36,36）、0600107（34 同 36 混）、0696216（31,31,31,∅），共 5 張多件單有混批／未入批。

## 四、實作步驟（機械可執行）

> 巨檔紀律：每處替換前 `grep -c` 確認錨點＝1，替換後覆核計數（CLAUDE.md 紅線）。

### S1 — 色板同輔助函式（取代 ~L11577-11609 `BATCH_COLORS` + `getBatchColor`）

```js
const FHS_BATCH_TONES = [
  { accent:'#C0583E', pill:'#F5E4E0', rowW:'#F9F0EE', rowZ:'#F5E9E4' },
  { accent:'#4A7FB5', pill:'#E2EBF3', rowW:'#EFF3F8', rowZ:'#EAECEE' },
  { accent:'#7A8A2F', pill:'#EAECDE', rowW:'#F3F4EC', rowZ:'#EEEDE2' },
  { accent:'#8E6BB0', pill:'#EDE7F2', rowW:'#F5F2F8', rowZ:'#F0EAEE' },
  { accent:'#B87A1F', pill:'#F4EADB', rowW:'#F9F3EB', rowZ:'#F4ECE1' },
  { accent:'#3E9A8C', pill:'#E0EFED', rowW:'#EEF6F5', rowZ:'#E9EFEB' },
  { accent:'#C25B84', pill:'#F5E5EB', rowW:'#FAF0F4', rowZ:'#F5E9EA' },
  { accent:'#607D8B', pill:'#E6EAEC', rowW:'#F1F3F5', rowZ:'#ECECEB' },
  { accent:'#A0673F', pill:'#F0E7E0', rowW:'#F6F1EE', rowZ:'#F2EAE4' },
  { accent:'#5A9E5A', pill:'#E5EFE5', rowW:'#F0F6F0', rowZ:'#ECEFE6' }
];
const FHS_ZEBRA = ['#FFFFFF', '#FAF7F4'];

function getBatchTone(batch) {
  if (batch == null) return null;
  const d = String(batch).replace(/\D/g, '');
  if (!d) return null;
  return FHS_BATCH_TONES[parseInt(d, 10) % 10];
}
function fhsBatchCellBg(tone, zb) {
  return tone ? (zb ? tone.rowZ : tone.rowW) : FHS_ZEBRA[zb ? 1 : 0];
}
// scope = 桌面 <tr data-zebra> 或手機 .acc-item-card
function fhsBatchPaint(scope, batch) {
  if (!scope) return;
  const tone = getBatchTone(batch);
  const zb = (scope.dataset && scope.dataset.zebra === '1') ? 1 : 0;
  scope.querySelectorAll('.batch-cell').forEach(function (c) { c.style.backgroundColor = fhsBatchCellBg(tone, zb); });
  const stripes = Array.prototype.slice.call(scope.querySelectorAll('.fhs-bt-stripe'));
  if (scope.classList.contains('fhs-bt-stripe')) stripes.push(scope);
  stripes.forEach(function (s) { s.style.setProperty('--bt-accent', tone ? tone.accent : 'transparent'); });
  if (scope.classList.contains('acc-item-card')) scope.style.setProperty('--bt-row', tone ? tone.rowW : 'transparent');
  scope.querySelectorAll('input.review-batch-input, input[id^="acc-batch-"]').forEach(function (i) {
    i.classList.toggle('fhs-bt-on', !!tone);
    i.classList.toggle('fhs-bt-off', !tone);
    i.style.setProperty('--bt-accent', tone ? tone.accent : 'transparent');
    i.style.setProperty('--bt-pill', tone ? tone.pill : '#FFFFFF');
  });
}
```

S1 補充（/8d v2）：`FHS_ZEBRA` 兩隻底色係 `--fhs-bg-surface`（~L46）同 `--fhs-bg-base`（~L45）嘅複本，而色值表嘅淡底係以佢哋預先計好。喺 `FHS_ZEBRA` 上面加一行註解寫明呢個對應，並喺 S1 函式後面加載入時自檢：

```js
(function () {
  const _rootCs = getComputedStyle(document.documentElement);
  if (_rootCs.getPropertyValue('--fhs-bg-base').trim().toUpperCase() !== FHS_ZEBRA[1]
   || _rootCs.getPropertyValue('--fhs-bg-surface').trim().toUpperCase() !== FHS_ZEBRA[0]) {
    console.warn('[FHS batch tone] --fhs-bg-base／--fhs-bg-surface 已變，FHS_BATCH_TONES 淡底需重算');
  }
})();
```

### S2 — CSS

> /8d v2：新 CSS 規則一律用 token，唔寫死 hex——字色用 `var(--fhs-text-primary)`（~L51，#2C2416），白底用 `var(--fhs-bg-surface)`（~L46，#FFFFFF），符合 `FHS_INTEGRATION.md` L159「顏色值不得硬編碼」。

1. 主 `:root`（~L43）加：`--fhs-batch-empty-border: #9A8A76;`
2. `.review-item-card`（~L1312）：`background:#ffffff` → `background:transparent`；陰影改 `box-shadow:none`。
3. 喺 `.review-item-card` 規則後加：
   ```css
   .review-item-card.fhs-bt-stripe { border-left: 4px solid var(--bt-accent, transparent); }
   td.fhs-bt-stripe { box-shadow: inset 4px 0 0 var(--bt-accent, transparent); }
   ```
4. `.review-batch-input:focus`（~L1508）改成：`outline:2px solid var(--fhs-text-primary); outline-offset:1px; box-shadow:none;`（刪走 `border-color:#d35400`）。
5. 加喺 ~L1508 `.review-batch-input:focus` 規則**之後**（兩者同特異度 0,2,0，排後面先會令 focus 時保留批次邊框色）：
   ```css
   .review-batch-input.fhs-bt-on { background: var(--bt-pill); border: 1px solid var(--bt-accent); color: var(--fhs-text-primary); }
   .review-batch-input.fhs-bt-off { background: var(--fhs-bg-surface); border: 1px dashed var(--fhs-batch-empty-border); }
   ```
6. 喺 `.acc-item-controls .acc-ctrl-batch input { text-align: center; }`（~L1896）之後加（specificity 要 ≥0,3,1，先蓋得過 ~L1884 共用規則）：
   ```css
   .acc-item-controls .acc-ctrl-batch input.fhs-bt-on { background: var(--bt-pill); border: 1px solid var(--bt-accent); color: var(--fhs-text-primary); }
   .acc-item-controls .acc-ctrl-batch input.fhs-bt-off { background: var(--fhs-bg-surface); border: 1px dashed var(--fhs-batch-empty-border); }
   .acc-item-controls .acc-ctrl-batch input:focus { outline: 2px solid var(--fhs-text-primary); outline-offset: 1px; box-shadow: none; }
   .acc-item-card.fhs-bt-stripe { border-left: 4px solid var(--bt-accent, transparent); background: var(--bt-row, transparent); }
   ```
   落手前 grep 有冇既有 `.acc-ctrl-batch input:focus` 規則；有就改佢，唔好疊多一條。
   背景：全域 `input:focus, select:focus, textarea:focus`（~L249-252，特異度 0,1,1）設咗 `border-color`、`box-shadow:0 0 0 3px rgba(212,163,115,.2)`、`outline:none`。上面兩條新 focus 規則特異度較高，會蓋過佢，但**一定要明寫 `box-shadow:none`**，否則手機批次框 focus 時深色 outline 外面仲有一圈啡色光暈。

### S3 — 桌面 render：斑馬 index（~L13516、~L13602）

1. `orders.forEach((o) => {`（renderReviewTable 入面嗰個，~L13516；**唔好改 ~L12105 accordion 嗰個**）→ `orders.forEach((o, _oIdx) => {`
   ⚠️ 呢句全檔有 2 處（`grep -c`＝2）。錨點要用兩行組合：`} catch(e) {}` + 換行 + `orders.forEach((o) => {`（已實測只命中 L13515-13516）。
2. ~L13602 `const batchCol = getBatchColor(...)` 換成：
   ```js
   const _zb = _oIdx % 2;
   const _zbBg = FHS_ZEBRA[_zb];
   ```

### S4 — 訂單層格（orderLeftColsHtml ~L13632-13658、備註 ~L14052）

- 勾選格 `review-cb-td`：style 加 `background-color:${_zbBg};`
- 單號／日期／客人三格：**移除 `class="batch-cell"`**，`background-color:${batchCol}` → `background-color:${_zbBg}`
- 備註 rowspan 格（~L14052，`index === 0 ?` 分支）：`background-color:${batchCol}` → `${_zbBg}`
- 提示：`${batchCol};"` 改動前正好 4 處（~L13636／13653／13658／14052），全部換成 `${_zbBg};"`。
- 完成後 `grep -n 'batchCol}'` 唔可以再有淨 `batchCol`（`rowBatchCol`／`orderBatchCol` 除外）。

### S5 — 品項行（~L13795、~L13875-13876、~L13801、~L13986、~L13993）

1. 將 ~L13875-13876 嘅 `rowBatch`/`rowBatchCol` 計算**搬上去 ~L13795 位置**，同時刪走 `itemBatchCol`：
   ```js
   const rowBatch = item.Batch || o.Batch || '';
   const _tone = getBatchTone(rowBatch);
   // 凡品項層 <td> 必帶 class="batch-cell" + background-color:${rowBatchCol}，漏帶＝淡色帶斷開兼即時變色漏更新（驗收 #13）
   const rowBatchCol = fhsBatchCellBg(_tone, _zb);
   ```
   原 ~L13875-13876 兩行刪走（避免重複 `const` 宣告爆 SyntaxError）。**保留變數名 `rowBatchCol`**，咁 13 處 `background-color:${rowBatchCol}` 全部唔使改。
   ⚠️ **錨點陷阱**：`const rowBatch = item.Batch || o.Batch || '';` 同 `const rowBatchCol = getBatchColor(rowBatch);` 呢兩行喺手機 ~L12215-12216 有一字不差、縮排一樣嘅一對（`grep -c`＝2）。刪桌面嗰對時，錨點要連埋上一行註解 `// 為單一項目定義批次顏色 — fall back to order-level batch`（已實測 count＝1）一齊做三行替換。**手機嗰對唔好喺呢步郁**（由 S8 處理），刪錯會令 L12342 手機批次框 `rowBatch` 未定義、手機列表渲染唔出。
   已實測：L13666-13795 之間冇引用 `rowBatch`／`_tone`，搬上去唔會 TDZ。
2. 產品卡 ~L13801：`<div class="review-item-card" style="border-left:3px solid ${itemBatchCol}; background:${itemBatchCol}15; height:100%; ...">` → `<div class="review-item-card fhs-bt-stripe" style="--bt-accent:${_tone ? _tone.accent : 'transparent'}; height:100%; ...">`（保留 height/margin/min-height 原值）。
3. 每條品項 `<tr>`（~L13986 `id="row-...-item-${_iIdx}"`）加 `data-zebra="${_zb}"`。
4. 批次輸入框 ~L13994：加 class `${_tone ? 'fhs-bt-on' : 'fhs-bt-off'}`，喺現有 inline style 開頭加 `--bt-accent:${_tone ? _tone.accent : 'transparent'};--bt-pill:${_tone ? _tone.pill : '#FFFFFF'};`，**id 同 oninput/onblur 一字不改**。

### S6 — 類別視圖第一格色條（~L13892-13943）

背景：而家 `_tdOpen`（~L13894）係一條**預先計好嘅 const 字串**，唔係函式；`_cell`（~L13896）係 `(inner) => _tdOpen + …`；`_cellC`（~L13927）喺鎖匙扣／頸鏈分支入面另外定義。所以唔可以喺 `_tdOpen` 字串度加條件（只會計一次，會令成行全部有或全部冇色條）。

1. 將 ~L13894-13896 三行：
   ```js
   const _tdOpen = `<td class="batch-cell" style="vertical-align:top; border-bottom:${_rowBorderB}; border-right:1px dashed #e0e0e0; padding:4px 8px; background-color:${rowBatchCol};">`;
   const _dash = '<span style="color:#ddd;">—</span>';
   const _cell = (inner) => _tdOpen + (inner || _dash) + '</td>';
   ```
   換成：
   ```js
   let _btStripeDone = false;
   const _btStripe = () => {
       if (_btStripeDone) return { cls: 'batch-cell', st: '' };
       _btStripeDone = true;
       return { cls: 'batch-cell fhs-bt-stripe', st: `--bt-accent:${_tone ? _tone.accent : 'transparent'}; ` };
   };
   const _dash = '<span style="color:#ddd;">—</span>';
   const _cell = (inner) => { const s = _btStripe(); return `<td class="${s.cls}" style="${s.st}vertical-align:top; border-bottom:${_rowBorderB}; border-right:1px dashed #e0e0e0; padding:4px 8px; background-color:${rowBatchCol};">` + (inner || _dash) + '</td>'; };
   ```
   換之前 `grep -n '_tdOpen'`：除咗 L13894 定義、L13896 `_cell`、同 ~L13925 註解，如果仲有其他地方用，停低回報，唔好刪。
2. 將 ~L13927 `_cellC` 一行換成：
   ```js
   const _cellC = (inner) => { const s = _btStripe(); return `<td class="${s.cls}" style="${s.st}vertical-align:top; text-align:center; border-bottom:${_rowBorderB}; border-right:1px dashed #e0e0e0; padding:4px 8px; background-color:${rowBatchCol};">` + (inner || _dash) + '</td>'; };
   ```
3. `_btStripeDone` 宣告喺 `if (_catView) {` 入面，而呢個 block 喺逐件品項迴圈入面，所以每條品項行自動重設，唔使手動 reset。
4. `_tone` 由 S5-1 喺 ~L13795 定義，早過呢度，作用域可用。
5. 驗收：每條類別視圖品項行有且只有 1 個 `td.fhs-bt-stripe`，而且係該行第一個類別格。

### S7 — 無子項目 fallback 列（~L14061-14090）

1. ~L14063 `const orderBatchCol = getBatchColor(o.Batch || "");` → `const orderBatchCol = fhsBatchCellBg(getBatchTone(o.Batch || ''), _zb);`（「無子項目」格同財務格照用 `orderBatchCol`，唔使逐格改）
2. 呢條 `<tr id="row-${o.id}">` 加 `data-zebra="${_zb}"`。
3. 備註格（~L14086，`background-color:${orderBatchCol}`）→ `${_zbBg}`。
4. 唔加色條。

### S8 — 手機 accordion（~L12215-12216、~L12334、~L12340-12347）

1. ~L12216 `const rowBatchCol = getBatchColor(rowBatch);` → `const _toneA = getBatchTone(rowBatch);`
   ⚠️ 錨點用 ~L12213-12216 四行做多行錨點（`const dimensions = getProductDimensions(item);` / `const qty = Number(item.Qty) || 1;` / `const rowBatch = …` / `const rowBatchCol = …`），唔可以靠單行（同桌面重複，見 S5-1）。`const rowBatch` 呢行**保留**（L12342 批次框 value 用緊）。已實測：手機函式入面 `rowBatchCol` 只喺 12216 同 12334 出現。
2. ~L12334 `<div class="acc-item-card" style="border-left: 3px solid ${rowBatchCol};">` → `<div class="acc-item-card fhs-bt-stripe" style="--bt-accent:${_toneA ? _toneA.accent : 'transparent'};--bt-row:${_toneA ? _toneA.rowW : 'transparent'};">`
3. ~L12340 批次 `<input type="text"` 後面加以下兩個屬性（**手機函式入面個變數叫 `_toneA`，唔係 `_tone`，唔好照抄 S5-4**）：
   ```
   class="${_toneA ? 'fhs-bt-on' : 'fhs-bt-off'}" style="--bt-accent:${_toneA ? _toneA.accent : 'transparent'};--bt-pill:${_toneA ? _toneA.pill : '#FFFFFF'};"
   ```
   **id `acc-batch-...`、value、placeholder、inputmode、onfocus、oninput、onblur 一字不改**。

### S9 — 即時變色（~L16399-16414 `applyBatchColorLive`、~L15900-15912 `saveInlineEdit` Batch_Number 分支）

1. `applyBatchColorLive` 整個函式體改成：
   ```js
   function applyBatchColorLive(val, inputEl) {
     if (!inputEl) return;
     fhsBatchPaint(inputEl.closest('tr[data-zebra]') || inputEl.closest('.acc-item-card'), val);
   }
   ```
   `window.applyBatchColorLive = applyBatchColorLive;` 保留。
2. `saveInlineEdit` Batch_Number 分支：刪走 `_savedCol`／`_targetRow`／`querySelectorAll('.batch-cell')` 同**成段備註格重新上色**（連 [D69 修復] 註解），換成：
   ```js
   const _paintScope = (el && (el.closest('tr[data-zebra]') || el.closest('.acc-item-card')))
     || (isItemUpdate ? document.getElementById(`row-${recordId}-item-${itemIndex}`) : document.getElementById(`row-${recordId}`));
   fhsBatchPaint(_paintScope, value);
   ```
   落手前確認 `el` 喺呢個作用域係批次 input 元素（~L15890 已用 `if (el) el.value = value;`）。**Supabase 寫入邏輯、`第N批` 格式化、樂觀更新 `o.items[...]` 一律唔郁。**

### S10 — 收尾清理

- `grep -c 'getBatchColor'` = 0；`grep -c 'BATCH_COLORS'` = 0；`grep -c 'itemBatchCol'` = 0。
- `grep -n 'class="batch-cell"'` 逐條核對：訂單層格（單號/日期/客人/勾選/備註）一條都唔可以有。
- 全部 inline `<script>` 用 `new Function()` parse 零錯誤（同今朝驗證手法）。

### S11 — 防止再漏帶（/8d v2）

1. S5-1 已喺 `rowBatchCol` 定義上加一行註解（見 S5-1 代碼）。
2. `.fhs/ai/skills/ui-ux-pro-max/FHS_INTEGRATION.md` 追加一條 Known failure mode（05_maintenance-protocol §1 列明「skill/command 檔追加 Known failure modes/Anti-patterns 條目」可自行改，但**改前必備份**）。先 grep 檔內有冇 `Known failure modes`／`Anti-patterns` 節：有就追加；冇就喺檔尾開 `## Known failure modes` 節（格式見 `.fhs/ai/governance/07_compounding-loop.md` §2）。條目內容：
   ```
   - 【情境】訂單總覽品項層新增 <td> 冇帶 class="batch-cell" + background-color:${rowBatchCol} → 淡色帶斷開、改批次唔會即時變色（V41 起財務格一直漏帶，2026-09-14 發現）。【修正】新增品項欄必帶兩者；訂單層 rowspan 格（勾選/單號/日期/客人/備註）只用 _zbBg、禁帶 batch-cell。驗證用方案 C 驗收 #13 DOM 檢查。【日期】2026-09-14。
   ```
3. **唔改 Section 六本文**（新增排版鐵律屬規則本體，唔喺自行改清單內）。

## 五、驗收標準（可機械判定）

用本機 `fhs-dashboard` server（`.claude/launch.json`，http 唔用 file://）＋生產 Supabase 真實資料。

`getComputedStyle` 回傳 `rgb()`／`rgba()` 唔係 hex，比對前先轉換：
```js
const toHex = s => { const m = s.match(/[\d.]+/g); if (!m || (m.length === 4 && +m[3] === 0)) return 'transparent'; return '#' + m.slice(0,3).map(n => (+n).toString(16).padStart(2,'0')).join('').toUpperCase(); };
```
透明會回 `rgba(0, 0, 0, 0)`，經上面轉做 `'transparent'`。

| # | 模式／闊度 | 核對（`getComputedStyle`） |
|---|---|---|
| 1 | 桌面「全部」1600px | 0600914：單號/日期/客人/勾選/備註＝該單斑馬底；手模擺設行 `.batch-cell`＝斑馬底、卡色條透明、批次框 `fhs-bt-off` 虛線；兩行鎖匙扣 `.batch-cell`＝`#FAF0F4`（白單）或 `#F5E9EA`（斑馬單）、卡左邊框 `#C25B84`、批次框 `fhs-bt-on` |
| 2 | 同上 | 0600107：34 批行＝4 號淡底、36 批行＝6 號淡底；訂單頭唔跟任何一個 |
| 3 | 同上 | 相鄰訂單 `data-zebra` 0/1 交替，無兩張相鄰同值 |
| 4 | 1200px（1130-1280 窄桌面） | 同 #1 規則成立，無橫向溢出 |
| 5 | 1000px（750-1129 合併財務） | `td.fhs-fin-merged` 底色＝品項淡底 |
| 6 | 類別視圖：手模／鎖匙扣／頸鏈 | 每條品項行恰好 1 個 `td.fhs-bt-stripe`，其 box-shadow 含該批 accent；冇產品卡 |
| 7 | 375px 手機 | 有批次 `.acc-item-card` 左邊框＝accent、背景＝rowW；冇批次卡左邊框透明；批次框 on/off 樣式正確 |
| 8 | 已完成分頁 | 同 #1 規則成立 |
| 9 | 即時變色（桌面） | 對 0600914 item-1 批次框 dispatch `input` 事件改值 → 只該行 `.batch-cell`／卡色條／批次框變；**單號/日期/客人/備註唔變**；測完改返原值 |
| 10 | 即時變色（手機） | 對任一 `acc-batch-` 框 dispatch `input` → 該卡色條＋卡底＋框樣式即時變（新行為）；測完改返原值 |
| 11 | Console | 全程零 error；全部 inline script（用 `/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g` 抽出）逐個 `new Function()` parse 零錯誤 |
| 12 | 失焦儲存路徑（桌面、手機各一次） | 見下方「#12 做法」 |
| 13 | 品項格防漏帶（桌面「全部」＋任一類別視圖各行一次；日後加欄可重行） | `[...document.querySelectorAll('tr[id*="-item-"]')].flatMap(tr => [...tr.children]).filter(td => !td.hasAttribute('rowspan') && !td.classList.contains('batch-cell')).length === 0`（訂單層格一律有 `rowspan` 屬性，單件單都係 `rowspan="1"`，所以唔會誤判） |

⚠️ #9、#10 **只准 dispatch `input` 事件，禁止 blur／focusout**（blur 會觸發 `saveInlineEdit` 寫生產 Supabase）。失焦路徑只准用 #12 嘅受控做法測。

**#12 做法**（/8d v2，測員工最常用嘅「打完撳走」路徑，而唔寫生產資料）：
1. 事前確認：`saveInlineEdit` 唔即時寫，而係入 `metadataUpdateQueue` 再由 `metadataUpdateTimer = setTimeout(...)`（~L15983）延遲送出。先 grep 嗰段送出代碼用邊個函式發請求，同埋延遲毫秒數。如果佢用嘅係頂層 `const`／`let` 綁定（即係改 `window.xxx` 截唔到），**停低回報，唔好做 #12**。
2. 喺測試分頁截住網絡：
   ```js
   window.__origFetch = window.fetch; window.__origFwt = window.fetchWithTimeout;
   window.fetch = window.fetchWithTimeout = async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
   ```
3. 對一件貨嘅批次框輸入**原本嘅同一個值**再 blur。雙重保險：就算有請求漏網，寫入嘅都係一模一樣嘅資料。
4. 等超過步驟 1 查到嘅延遲時間，核對該行顏色同 #1／#7 一致。
5. `read_network_requests` 核對期間 0 個請求去 `supabase.co` 或 `:8443/webhook`。有任何一個＝測試失敗，即刻回報。
6. 最後 reload 頁面，清走記憶體入面嘅樂觀更新同快取。

**驗收不自驗**：實作完成後派 fresh-context agent（T5 審查模板，general-purpose）按上表逐項獨立核對，附運行證據。

## 六、禁區

- 所有 HTML id（`batch-input-*`、`acc-batch-*`、`row-*-item-*`、`row-*`、`notes-input-*`、`cost-cell-*`、`cost-val-*`、`profit-cell-*`、`status-select-*`）一字不改。
- `saveInlineEdit` 嘅 Supabase 寫入、`captureFormState()`、`raw_form_state` 一律唔郁。
- 財務字色（`#B07D4C`／`#E63946`／`#2A9D8F`）唔改（見七-1）。
- `--fhs-bg`／`--fhs-bg-card` 未定義問題唔修（另案）。
- 類別橫幅 pills、批量改批次函式唔郁。
- **唔直接改 `Freehandsss_dashboard_current.html`**，部署只經 `/commit` Phase 2.5。

## 七、已知限制（接受，唔喺今次處理）

1. 財務字色喺最差淡底上：啡 `#B07D4C` 3.00:1、紅 `#E63946` 3.50:1、青 `#2A9D8F` 2.79:1。三隻喺純白底本身都唔夠 4.5:1（3.57／4.17／3.32），淡底再拉低約 0.5；但比而家三文魚色全格填色好好多。另案可考慮加深財務字色。
2. 斑馬紋跟渲染次序，排序／篩選後會重新交替（刻意：佢嘅作用係分開畫面上相鄰嘅單，唔代表訂單身份）。
3. 尾數取色令相差 10 嘅倍數嘅批次同色。
4. 每批顏色會變（例：第36批由三文魚色變玫瑰粉），同事要重新認色（Fat Mo 2026-09-14 已接受）。
5. 手機冇批次嘅卡左邊係 4px 透明，張卡左邊冇灰框。同今日一樣（而家係 3px 白色，一樣睇唔到），唔當回歸。

## 八、收尾流程

1. 按 memory `feedback_v42_main_repo_test_copy`：改完 V42.html 後 `cp` 覆寫主倉 `d:\SynologyDrive\Free_handsss\freehandsss_dashboard\Freehandsss_Dashboard\freehandsss_dashboardV42.html`，`md5sum` 兩邊核對。
2. Changelog.md 全文條目、decisions.md 加 D79 一行、handoff 便攜塊一行摘要。
3. 由 Fat Mo 決定幾時 `/commit`（會觸發 Phase 2.5 部署 current.html）。

## 九、卡關升級條件

同一子步驟錯兩次（例：S5 搬 `const` 爆 SyntaxError、或驗收 #9 order 格被誤染）→ 停低，附完整失敗軌跡升 Opus，唔好原地重試第三次。

## 十、方案審查記錄

- 2026-09-14 fresh-context 對抗審查（general-purpose／Opus，T5 模板，只讀）：spec 合規 ✅（12 條裁決全覆蓋、冇多做）；品質 Approved-with-fixes（0 BLOCKER、3 MAJOR、4 MINOR）。
- 已修：MAJOR-1 桌面／手機 `rowBatch` 兩行重複錨點（S5-1、S8-1 改多行錨點）；MAJOR-2 手機批次框變數名 `_toneA`（S8-3 寫出完整字串）；MAJOR-3 類別視圖色條寫法含糊（S6 改為完整替換碼）；MINOR-4 `orders.forEach` 重複錨點（S3-1）；MINOR-5 手機 focus 殘留全域光暈（S2-6 加 `box-shadow:none`）；MINOR-6 驗收 rgb／hex 轉換（五、加 `toHex`）；MINOR-7 inline script 數目（#11 改做全部）。風格建議採納 2 條（S2-5 位置、S4 四處提示），第 3 條（手機冇批次卡保留 1px 灰邊）唔採納，記入七-5。
- 審查員已實測確認：全部行號對得上；7 個新變數名全檔零命中冇撞名；外層迴圈冇提早 `return`；item-0 `<tr>` 入面訂單層格改完後冇 `.batch-cell`，唔會誤染；新 CSS 特異度足夠；`tr:hover` 陰影喺 `<tr>`、新色條喺 `<td>`，唔撞；`getBatchColor` 等全部觸點冇漏。
- 主 session 已獨立覆核審查員嘅 4 項事實聲稱（重複錨點 ×2、唯一錨點組合、L249 全域 focus），全部屬實。
- 2026-09-14 `/8d` 自我迭代（v2）：補三個弱點——(1) CSS 寫死 hex 違反 `FHS_INTEGRATION.md` L159 → 改用 token＋`FHS_ZEBRA` 載入時自檢（S1 補充、S2）；(2) 失焦儲存路徑冇實測 → 新增驗收 #12 截網絡受控測試；(3) 冇防止同一個漏帶再發生 → S11 註解＋Known failure mode 條目＋驗收 #13 DOM 檢查。另查證排除一個候選弱點：刪單（L16206）同封存／撤銷／失敗還原（L22143/22161/22163/22180/22192）全部重畫成個表，唔會令斑馬紋錯位。
- Fat Mo 2026-09-14 確認接受每批換色（見一-13）。
