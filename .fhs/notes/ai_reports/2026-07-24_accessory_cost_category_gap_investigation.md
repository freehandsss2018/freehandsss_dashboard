# 配件成本分類缺口 — 調查報告（不急，待Fat Mo定案再動手）

**日期**：2026-07-24
**觸發**：S189 finance-auditor 全量成本審計時發現既有schema缺口（非新引入問題）
**狀態**：純調查，未改任何代碼

---

## 一、規模確認（live Supabase 查詢）

全庫 `order_items.item_category='配件'` 只有 **3 張單、3個品項**：

| order_fhs_id | product_sku | subtotal_cost | 訂單層 gap (total_cost − 三分類加總) |
|---|---|---|---|
| 0600107 | 燈飾 - 加購 | $30 | $30 |
| 0600723 | 燈飾 - 加購 | $30 | $30 |
| 0696216 | 羊毛氈公仔 - 加購 | $0 | $0（成本本身為0，無影響） |

**總影響金額：$60**（僅2張單有實質差額）。`total_cost`/`net_profit`/`final_sale_price` 本身完全正確——問題純粹係「總成本點分落三個分類欄」，唔係算錯錢。

---

## 二、Q1 — n8n 根因確認 ✅

`Calculate Profit & Pack Items`（workflowId `6Ljih0hSKr9RpYNm`，V47.21現行版）：

```js
function getItemCategory(sku) {
    if (!sku) return '其他';
    if (sku.includes('羊毛氈') || sku.includes('燈飾')) return '配件';   // ← 正確識別
    if (sku.includes('木框') || sku.includes('玻璃瓶') || sku.includes('立體擺設')) return '立體擺設';
    if (sku.includes('鎖匙扣')) return '金屬鎖匙扣';
    if (sku.includes('吊飾')) return '純銀頸鏈吊飾';
    return '其他';
}
...
const itemHandmodelCost = itemCategory === '立體擺設'    ? itemCost : 0;
const itemKeychainCost  = itemCategory === '金屬鎖匙扣'  ? itemCost : 0;
const itemNecklaceCost  = itemCategory === '純銀頸鏈吊飾' ? itemCost : 0;
// ← '配件' 冇任何分支命中，itemHandmodelCost/itemKeychainCost/itemNecklaceCost 全部=0
```

`itemCost`（=$30）本身有正確累加入 `totalBaseCost`（→ `orders.total_cost`）同 `packedItems[].Total_Base_Cost`（→ `order_items.item_base_cost`/`subtotal_cost`），live 數據證實（見上表 0600107/0600723 品項層 `subtotal_cost=$30` 正確）。**缺口只在三個分類累加變數的 if 判斷式，缺 `配件` 分支**，導致 `Handmodel_Cost_Total`/`Keychain_Cost_Total`/`Necklace_Cost_Total` 三者之和 < `Total_Cost`。

---

## 三、Q2 — Dashboard 顯示現狀確認 ✅（比預期更隱蔽）

`buildAuditLedgerHtml()`（`Freehandsss_dashboard_current.html:11107`）分兩層：

**① 訂單層②成本快照鏈摘要（第11314-11329行）**——完全冇配件蹤影：
```js
if (handmodelCost > 0) h += _costRow('手模成本',   handmodelCost, '手模');
if (keychainCost  > 0) h += _costRow('鎖匙扣成本', keychainCost,  '鎖匙扣');
if (necklaceCost  > 0) h += _costRow('吊飾成本',   necklaceCost,  '吊飾');
if (catSum === 0 && totalCost > 0) { /* 只喺catSum=0先trigger嘅fallback */ }
```
既有嘅「Problem E」缺口偵測（`shippingDeductAmt = catSum − totalCost`，第11213行）只處理 **catSum > totalCost**（運費扣減未反映落分類欄）呢個方向；配件缺口係反方向（**catSum < totalCost**，分類漏咗但total_cost係啱嘅），`shippingDeductAmt` 會係負數，兩個現有分支（`_costRow`／Problem E note）都唔會觸發。結果：使用者見到「手模+鎖匙扣+吊飾」加埋，同下面「n8n總成本」中間有$30睇唔明嘅落差，**冇任何提示文字解釋**——比「單純冇獨立display」更差，屬於靜默缺口。

**② 品項明細（第11381-11399行，`_catCode()`）**——反而冇問題：配件唔match `/手模|擺設|立體/`、`/鎖匙扣/`、`/頸鏈|吊飾/` 任何一個，會落入 `X`（其他）分組，用灰色「其他」標頭正常顯示品項名+`subtotal_cost`。**即品項細明層級配件係睇得到嘅，只有訂單層摘要漏咗。**

---

## 四、Q3 — 修復方案評估

### 方案 (a)：新增 `orders.accessory_cost` / `order_items.accessory_cost` 獨立欄位
- 需要：migration（2張表各加一欄）+ n8n加 `accessoryCostTotal` 累加分支及`Accessory_Cost_Total`回傳鍵 + Dashboard加第4個`_costRow`同catSum公式 + 檢查`sync_order` RPC（migrations 0028/0034/0038/0039一系）現有欄位映射表需同步擴充第4欄，否則手動sync時會漏寫
- 影響面：**4處要改**（schema + n8n + Dashboard + sync RPC），且需要新一輪drift函數/finance-gatekeeper §三B文件同步

### 方案 (b)：配件成本歸入 `handmodel_cost`（手模擺設分類）
- 查證：`addon_product_sop.md` 明確定義「加購配件需在主產品（P_MAIN）push 之後」——即羊毛氈/燈飾呢類加購配件**設計上只依附立體擺設(P_MAIN)訂單**，非獨立存在，同鎖匙扣/吊飾唔會同時共存於同一張配件品項
- 只需改 n8n 一行：`itemCategory === '立體擺設' || itemCategory === '配件'`
- Dashboard／schema／sync RPC **完全不用動**，`handmodelCost > 0` 既有`_costRow`直接吞落去，`catSum`公式不變
- 影響面：**1處**，且同「配件依附手模」既有產品定義一致，非強行湊數

### 建議：**方案(b)**
理由：
1. 影響面最細（單一n8n if判斷式改動），唔涉及schema migration/RPC同步/Dashboard公式改動，出錯面小
2. 語意上有 `addon_product_sop.md` 佐證——配件加購綁定P_MAIN（手模擺設），歸入手模分類非任意選擇
3 現有drift函數（migration 0059）只監測**SKU層**`products.total_base_cost`，唔監測訂單層三分類rollup，方案(b)對drift檢查零影響
4. 財務金額本身冇錯（`total_cost`/`net_profit`已正確），呢個純粹係分類顯示缺口，用最小改動閂咗個顯示漏洞已足夠，毋須為$60/年級別嘅缺口開新schema欄位

**若Fat Mo傾向方案(a)**（例如未來配件品類擴充、唔想同手模成本混埋），需要嘅4處改動已列於上，可另開cl-flow走完整版§三B前置紀律（完整方程式+對齊先例+drift檢查）。

---

## 五、後續步驟（等Fat Mo指示先做）

- [ ] Fat Mo選定方案(a)或(b)
- [ ] 走finance-gatekeeper §三B：完整方程式先行 + 對齊已驗證先例 + 改完跑drift檢查
- [ ] 若選(b)：n8n改一行 + 補charm/keychain同款inline comment記錄本次修復；歷史2張單（0600107/0600723）$30差額是否需要backfill入`handmodel_cost`（現時佢哋嘅`handmodel_cost`已經係$210，只反映立體擺設本身，唔含呢$30配件）——需連同修復一併決定是否backfill
- [ ] 若選(a)：另開cl-flow規劃4處改動
