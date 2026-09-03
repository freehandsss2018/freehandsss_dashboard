# 訂單總覽「類別」顯示方案書 — 手模 / 鎖匙扣 / 頸鏈 視圖重新設計

> **日期**：2026-08-25
> **需求方**：Fat Mo（直接指示 + 三張截圖 + Excel 原檔 `Free_handsssV2 (Feb) 2026.xlsx`）
> **狀態**：✅ **已定案並落地**（Fat Mo 揀 **方案 B**；財務欄選 **收起**）——改動只入 `freehandsss_dashboardV42.html`，`current.html` 未同步（待部署授權）
> **決策記錄**：decisions.md **D69** / Changelog 2026-08-25 條目
> **原型**：[`overview-category-view-prototype_2026-08-25.html`](./overview-category-view-prototype_2026-08-25.html)（真實 Supabase 資料 7 張單，三方案即時對照）
> **分支**：`claude/order-overview-category-display-1a4f84`

---

## 一、需求原文與拆解

原文：
1. 優化訂單總覽「全部 / 手模 / 鎖匙扣 / 頸鏈」的顯示（截圖一紅圈）
2. 揀「手模 / 鎖匙扣 / 頸鏈」時，**只顯示該訂單相關的項目**——截圖二例：`0500703` 揀咗鎖匙扣，就唔應該再顯示佢嘅手模擺設列
3. 原因：操作者習慣咗 Excel（截圖三）可以**一眼睇晒全盤狀況**，可參考 Excel 原有設計
4. 「全部」不需重新設計

拆解成三件可獨立驗收的事：

| # | 事項 | 性質 |
|---|---|---|
| R1 | 類別篩選由「訂單層」改為「品項層」 | 明確缺陷，必做 |
| R2 | 類別視圖要達到 Excel 級「一眼睇晒」 | 設計題，本文重點 |
| R3 | 「全部」維持原樣 | 約束 |

---

## 二、現況機制（已 grep 核實，執行者不必重查）

生產檔 `Freehandsss_Dashboard/freehandsss_dashboardV42.html`（`Freehandsss_dashboard_current.html` md5 相同，同一份）：

| 位置 | 內容 |
|---|---|
| L4276–4282 | 類別 chip HTML，`data-category` = `''` / `手模` / `鑰匙扣` / `頸鏈` |
| L12211–12217 | `matchesOrderCategory(order, cat)` — **訂單層** 比對，只讀 `item.Category` 原始字串 |
| L12132–12134 | `applyReviewFilters()` 用上式 filter **整張訂單** |
| L11374+ | `renderReviewTable()` — Desktop：`o.items` 逐件出一 `<tr>`；`orderLeftColsHtml` 用 `rowspan="${itemsCount}"` 只喺 `index===0` 輸出 |
| L11009+ | `renderReviewAccordion()` — 手機路徑，同一套 item 卡結構 |
| L10391+ | `getProductDimensions(item)` — badge 顯示嘅分類真源（讀 `_P_`/`_K_`/`_M_` key suffix + 產品名/spec 文字） |
| L11062 註解 | 明文寫住「分類沿用 `getProductDimensions`，**唯一真源**」 |

**核心問題一句話**：chip 答嘅係「呢張單有冇鎖匙扣」，操作者問嘅係「畀我睇晒所有鎖匙扣」。

---

## 三、同 Excel 對位分析（讀咗原檔，非估）

Excel `銷售_2026` 工作表欄位（第 2 行表頭，A:Q）：

```
S/N │ 日期 │ 客人 │ 刻名 │ 刻日 │ 對象 │ 手腳 │ 產品 │ 材料 │ 數量 │ 組合 │ 批量 │ 金額 │ 成本 │ 調整 │ 營收 │ 備注
```

Excel 之所以「一眼睇晒」，靠嘅係三件事：

1. **一件一行（flat）**：`S/N`/`日期`/`客人` 只喺該單第一行填，之後空白 → 分組靠留白暗示，唔靠合併儲存格
2. **維度各佔一欄**：`對象`｜`手腳`｜`產品`｜`材料`｜`數量` 全部係**獨立欄**，所以可以**直向掃**——掃「手腳」欄就知有幾多隻腳未做
3. **AutoFilter 落喺「產品」欄**：篩 `產品 = 鎖匙扣` → 剩低嘅全部係鎖匙扣行，跨曬所有訂單

Dashboard 現況相對應：

| Excel 做法 | Dashboard 現況 | 差距 |
|---|---|---|
| 一件一行 | ✅ 一件一 `<tr>`（已對齊） | 無 |
| 維度各佔一欄 | ❌ 全部逼喺「產品明細」一格，變 badge 團 | **唔可以直向掃** |
| AutoFilter 落品項 | ❌ 篩訂單，唔篩品項 | **R1** |

> 結論：R1 只係補回 AutoFilter 行為；要達到 R2「一眼睇晒」，關鍵係第 2 點——**把 badge 團拆返做欄**。而拆欄之所以可行，正正因為類別視圖入面成個畫面只得一個類別，形狀齊一（「全部」視圖形狀唔齊一，所以維持 badge 團係啱嘅，同需求 R3 一致）。

---

## 四、規模驗證（Supabase live 查詢，2026-08-25）

```
品項總數：立體擺設 55 · 金屬鎖匙扣 54 · 純銀頸鏈吊飾 16 · 配件 7 · 銀飾 2 · "??" 2
以 item_key 計：P 54 件/52 單 · K 48 件/28 單 · M 18 件/9 單 · 配件 16 件/12 單
訂單分佈（67 張有品項的單）：單一類別 41 張 · 兩類別 21 張 · 三類別 5 張
```

**26 張單（39%）係多類別單**——即係話現時每三張單就有超過一張，喺類別視圖會出現「唔關事嘅列」。原型實測：篩「鎖匙扣」時列數由 **18 → 10**（少 44%），同時多顯示咗一張現況睇唔到嘅單。

---

## 五、順帶揪出嘅兩個現況 Bug（同一支修）

### Bug 1｜兩套分類標準唔一致，令 4 件品項／2 張單喺類別篩選完全消失

`matchesOrderCategory()` 只讀 `item_category` 原始字串，但 live 資料有兩個值唔中任何關鍵字：

| order_id | item_key | item_category | 後果 |
|---|---|---|---|
| `0600100` | `0600100_P_MAIN`、`0600100_K_LF` | `??` | 揀手模／鎖匙扣／頸鏈 **三個 chip 都搵唔到呢張單** |
| `0600804` | `0600804_M_LH`、`0600804_M_E_RH` | `銀飾` | 揀頸鏈搵唔到（`銀飾` 唔含「吊飾」「頸鏈」） |

同一時間，`getProductDimensions()` 靠 `_K_`／`_M_` key suffix，**分類完全正確**——即係畫面 badge 畫住「鎖匙扣」，但篩鎖匙扣佢唔出現。

**修法**：訂單層同品項層都收窄到 `getProductDimensions()` 一個真源（代碼註解本身已宣告佢係唯一真源，只係篩選路徑冇跟）。順帶覆蓋 1 件 legacy pipe-format key（`0600101 | 嬰兒鎖匙扣…`），佢冇 `_K_` 但 `getProductDimensions` 靠產品名文字一樣中。

### Bug 2｜品項 index 漂移 → 內聯編輯會**靜默寫落錯嘅品項**（⚠ 最高風險）

`saveInlineEdit(recordId, field, elementId, itemIndex)`（L13509）同 `_fhsHmCheckChange(orderId, itemIndex, pfx)`（L5895）都係用 **`o.items[itemIndex]`** 反查係邊件；而 render 迴圈傳落去嘅 `index` 係**渲染陣列**嘅 index。

現時之所以冇爆，純粹係好彩：現有唯一嘅過濾（羊毛氈／燈飾配件）排序後一定墊底，過濾後啱啱好係 prefix，index 對得返。**一旦按類別過濾，過濾結果唔再係 prefix**：

> `0500703` 篩鎖匙扣 → 渲染 index 0 = 鎖匙扣，但 `o.items[0]` 係手模擺設 →
> 改批次／改進度會寫落**手模擺設**嗰件，畫面完全冇提示。

**修法**：render 時保留一個 `_trueIdx`（該件喺 `o.items` 入面嘅真 index），所有 DOM id（`batch-input-*`／`status-select-*`／`hmck-wrap-*`／`hmck-val-*`／`adj-wrapper-*`／`save-indicator-*`／`row-*-item-*`）同所有回呼一律傳 `_trueIdx`，唔好再用迴圈 index。副作用係好嘅：DOM id 唔會再隨篩選改變。

> 註：呢啲 id 係前端 render 時動態生成，n8n 從未見過，唔屬 finance-gatekeeper §三死線 5「HTML ID 禁止變更」所指嘅 POS 表單固定 ID。已核實。

---

## 六、三個方案

### 方案 A｜只隱藏不相關列（最小改動）

- 類別 chip 生效到品項層：`_renderItemsFinal` 先按類別過濾，再計 `itemsCount`／`rowspan`
- 訂單層欄（單號／日期／客人／入帳／成本／利潤／備註）維持全單值，加細字「全單」標籤
- 單號格下加提示 chip：`另有：手模擺設 ×1、純銀吊飾 ×2`，防止誤讀成「呢張單淨係有鎖匙扣」
- 保險：過濾後若某張單零列（理論上只有兩套 matcher 打架先會發生），**fallback 顯示全部列**，永不出現破 rowspan 的空組
- 欄位、排版、互動零改動

**改動面**：`renderReviewTable` + `renderReviewAccordion` 各一段 + `matchesOrderCategory` 換真源 + Bug 2 的 `_trueIdx`。
**達成**：R1 ✅　R2 ⚠️（badge 團仍在，未做到 Excel 直向掃）

### 方案 B｜類別視圖（**推薦**）

方案 A 之上再加三樣：

**B1 · 欄位換裝（同 Excel 逐欄對位）**

| Excel 欄 | 手模視圖 | 鎖匙扣視圖 | 頸鏈視圖 |
|---|---|---|---|
| 對象 | — | **對象**（嬰兒／大寶／成人／家庭） | 同左 |
| 手腳 | — | **部位**（左手／右手／左腳／右腳） | 同左 |
| 產品 | **款式**（木框／玻璃瓶） | 收起（成欄同類，係雜訊） | 收起 |
| 材料 | **加購**（羊毛氈／燈飾） | **材質**（不銹鋼／鋁合金） | **材質**（925 銀／925 金） |
| 數量 | **肢數明細**（嬰兒／父母／大寶逐個） | **數量** | **數量** |

左邊「單號／日期／客人」同右邊「刻字／批次／進度／備註」位置**完全唔郁**，保住肌肉記憶同 `rowspan` 對齊定律。只係「產品明細」一欄拆成 2–4 欄。
（**定案後補記**：入帳／成本／利潤三欄依 §七 (丙) 喺類別視圖一併收起，所以實際落地係 12 欄 → 手模 11 欄／鎖匙扣・頸鏈 12 欄。）

**B2 · 刪走重複 badge**：鎖匙扣視圖入面成欄都係「🔑 鎖匙扣」，係純雜訊，刪走騰返闊度畀有資訊量嘅欄。

**B3 · 類別工作台橫幅**：表格上方一條，`鎖匙扣 · 48 件 / 28 張單` ＋ 進度分佈（未開始／進行中／需補打／已完成）＋ 批次分佈。呢條就係「一目了然全盤狀態」嘅正面回答——現時要數呢啲數，操作者要自己碌成頁。

**改動面**：方案 A 全部 + 一組 `colsFor(cat)` 欄位定義 + 動態 `<thead>` + 橫幅組件。
**達成**：R1 ✅　R2 ✅　R3 ✅（「全部」行為零改動）

### 方案 C｜拉平做純品項清單（Excel 模式）

類別視圖索性放棄訂單分組，一件一行、訂單欄逐行重複、可按批次／進度排序，最貼近 Excel 工作清單。

**但**：直接同 `ui-ux-pro-max/FHS_INTEGRATION.md` Section 六 排版鐵律第一條相撞——「『全域核對中心』**強制**使用 `<td rowspan>` 結構排列多品項」。要行呢條路需要 Fat Mo 明示豁免該鐵律（並同步改鐵律文字），唔可以偷雞。列出來只為完整，**唔推薦**。

### 對比

| | 方案 A | 方案 B ★ | 方案 C |
|---|---|---|---|
| 只顯示相關列（R1） | ✅ | ✅ | ✅ |
| Excel 級直向掃（R2） | ❌ | ✅ | ✅ |
| 全盤狀態一眼睇（R2） | ❌ | ✅ 橫幅 | ⚠️ 要自己數 |
| 「全部」零改動（R3） | ✅ | ✅ | ✅ |
| 撞現有鐵律 | 無 | 無 | ⚠️ Section 六 第 1 條 |
| 改動量 | 小 | 中 | 大 |
| 回歸風險 | 低 | 中（欄數變動要驗 `colspan`／空狀態） | 高 |

---

## 七、財務欄裁決（已載 `finance-gatekeeper`）

類別視圖入面「入帳 $3,680」擺喺一行鎖匙扣旁邊，好容易誤讀成「呢個鎖匙扣賣 $3,680」。三個選擇：

| 做法 | 評估 |
|---|---|
| (甲) 維持全單值 + 「全單」標籤 | 誠實、零財務風險。逐項金額繼續由現有「顯示項目財務」掣控制（已 gate、行 SKU 建議價） |
| (乙) 新增「類別入帳小計」 | ❌ **不建議**。`final_sale_price` 係訂單層真理（死線 1），唯一獲授權嘅拆分係財務頁 RPC 嘅 3-layer fallback（`FHS_System_Logic_Overview.md` §10.3）——伺服器端、而且只分 handmodel／metal 兩類，同總覽三分類軸唔對齊。前端另寫一套 = 制造第二本數簿，正正係 D40／D42 修過嘅「雙數簿漂移」 |
| **(丙) 類別視圖收起財務欄** | ✅ **Fat Mo 選呢個**。類別視圖＝純生產工作清單，唔顯示入帳／成本／利潤，騰返闊度畀產品維度欄；要睇錢切返「全部」。連帶：「顯示項目財務」掣喺類別視圖 disabled 並喺 tooltip 講明原因（唔扮有反應）。手機 accordion 卡頭嘅訂單層金額**保留**——嗰度係訂單摘要卡而非逐件並排，冇「全單金額擺喺單件旁邊」嘅誤讀風險。 |

另記錄一個**已知不對齊**（不在本次修復範圍，只作備案）：財務頁類別軸係 `all / handmodel / metal`（鎖匙扣＋頸鏈合併），訂單總覽係手模／鎖匙扣／頸鏈三分。兩處數字唔會逐項對得上，屬設計如此。

---

## 八、落地結果（已完成）

| 階段 | 內容 | 驗收（依 CLAUDE.md 紅線三「驗收不自驗」） |
|---|---|---|
| P0 | Bug 2 `_trueIdx` 修復（**必須行喺篩選之前**） | 真實多品項單：改第 2 件批次 → Supabase 核實寫落正確 `item_key`；派 fresh-context agent 覆核 |
| P1 | 分類真源統一（Bug 1） | `0600100` 揀手模／鎖匙扣要出現；`0600804` 揀頸鏈要出現；`0600101` legacy key 要中 |
| P2 | 方案 A 品項層過濾（Desktop + Accordion 兩路徑） | `0500703` 揀鎖匙扣只剩 1 列；26 張多類別單逐張目視；零列 fallback 用合成單測 |
| P3 | 方案 B 欄位換裝 + 橫幅（如獲批） | 三個類別視圖各自 `<thead>`／`<td>` 數對齊；空狀態 `colspan` 跟住變；`browser` 實測零 console error |

### 實際驗證結果（live Supabase 55 張單，browser 實測）

| 項目 | 結果 |
|---|---|
| 語法 | 9 個 inline `<script>` 區塊全部 `node vm.Script` 通過 |
| 欄數／列數 | 全部 12 欄 69 列｜手模 11 欄 29 列｜鎖匙扣 12 欄 28 列｜頸鏈 12 欄 12 列 |
| cell 對齊 | 逐列 cell 數（計 `colspan`）**零溢出**（四個視圖皆是） |
| **Bug 1 修復** | 新舊 matcher 逐單逐類別對照，**恰好 3 處差異**：`0600100` 手模＋鎖匙扣、`0600804` 頸鏈，全部 old=false→now=true，**零反向誤收** |
| **Bug 2 修復** | 28 個鎖匙扣列嘅 DOM id 逐個反查 `o.items[i]`，**0 mismatch**；並實測 **12 張單嘅渲染真 index 由 1 起跳**——即舊碼上咗類別過濾之後，呢 12 張單每次批次／進度編輯都會寫錯品項 |
| 手機 Accordion | 卡數同 Desktop 一致（69／28／29／12），DOM id **0 mismatch**；「另有」資訊由既有「產品組成 chips」承擔（本來就由 `o.items` 全量計） |
| 表頭重建副作用 | 排序升↔降箭嘴、`sort-active` class、master checkbox 全部存活 |
| 掣狀態 | 「顯示項目財務」在／離開類別視圖雙向跟得上（同步點放喺 `renderReviewTable` 呢個唯一收窄點，唔係淨靠 chip handler） |
| Console | 全程 **零 error** |

**巨檔紀律**：V42.html 1.2MB，全程 grep 定位→窗口讀；每次替換前 `grep -c` = 1，改後再 count 驗證。

---

## 九、決策結果與仍待拍板

**已拍板**
1. 方案：**B · 類別視圖**
2. 財務欄：**丙 · 類別視圖收起**

**仍待拍板（未動）**
3. 類別視圖預設排序要唔要由「載入順序」改做「批次 → 進度」（工作清單語序）？——現時維持原排序不變
4. chip 文案：`data-category` 用緊「鑰匙扣」，DB／文件一律「鎖匙扣」——順手統一？現時維持「鑰匙扣」不變（改動涉及已儲存篩選 localStorage 相容性，唔值得順手做）
5. **部署授權**：`Freehandsss_dashboard_current.html` 未同步。README 明文「未獲 Fat Mo 授權，絕不可覆蓋正式環境」

---

## 十、實際改動點（`freehandsss_dashboardV42.html` 唯一代碼改動檔）

| 位置 | 改動 |
|---|---|
| CSS（`.badge-cat-燈飾` 之後） | 新增 `.review-rest-chip` + `.fhs-cat-strip*` 一組（含 <768px 直向堆疊） |
| `<thead>` | `<tr>` 加 `id="reviewTheadRow"`（供動態重建） |
| 表格上方 | 新增 `<div id="reviewCatStrip">` 容器 |
| `matchesOrderCategory` | 重寫；新增 `fhsItemCatKey()` / `matchesItemCategory()`，收窄至 `getProductDimensions()` 單一真源 |
| 新增 | `_FHS_TH_DEF` / `fhsOverviewCols()` / `fhsOverviewColCount()` / `fhsBuildOverviewHead()` / `fhsStatusBucket()` / `fhsRenderCatStrip()` / `fhsClearCategoryFilter()` / `fhsSyncAuditBtnState()` |
| `renderReviewTable()` | 開頭呼叫表頭／橫幅／掣狀態三個 sync；品項層過濾 + 「另有」chip；`_iIdx` 真 index；`_catCellsHtml` 類別欄；財務欄與產品明細欄改為 `_catView` 條件輸出 |
| `renderReviewAccordion()` | 同一套品項層過濾 + `_aIdx` 真 index |
| `toggleAuditMode()` | 類別視圖時 early-return；`textContent`＋emoji → `innerHTML`＋sprite icon（Icon 鐵律清理） |
| `clearFilters()` / 載入已儲存篩選 / 初始化 | 補呼叫 `fhsSyncAuditBtnState()` |
| 5 處 loading／error `colspan="12"` | 改為 `fhsOverviewColCount()` 動態值 |

**未改**：Supabase schema、n8n、`captureFormState()`、任何 POS 表單固定 ID、`current.html`。

---

## 十一、已驗證事實清單（執行者可直接引用，不必重查）

- V42 與 current.html md5 相同：`50ac816d4b0373b2d7be0f2fee8638ef`
- `matchesOrderCategory` 全檔僅 2 個引用點（L12133 呼叫、L12211 定義）
- `reviewCategoryFilter` 全檔 8 個引用點（L10379/12132/12133/12255/12301/12340/12363/15448）
- `getProductDimensions` 回傳 `category` 值域：`手模擺設`／`鎖匙扣`／`純銀吊飾`／`羊毛氈公仔`／`燈飾`／`其他`
- `_fhsIsOrderReadyToArchive`（L5944）讀 `o.items` 資料層而非 DOM → **唔受列過濾影響**，唔使改
- 加購配件（羊毛氈／燈飾）現時合併入第一件手模擺設列顯示 → 類別視圖歸手模視圖（配件僅限玻璃瓶款式立體擺設，`FHS_Product_Cost_Schema_v2.md` §7.1）
- Icon 全部走 sprite `<use href="#icon-*">`，禁 emoji／裸 Unicode 幾何字符（Section 六 Icon 鐵律）；原型已依此，新增欄位所需 icon（`baby`/`hand`/`footprint`/`settings`/`crown`/`gem`/`image`/`bottle`/`lightbulb`）sprite 內全部已存在，**唔使加新 symbol**
