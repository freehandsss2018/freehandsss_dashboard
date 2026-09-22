# FHS 成本運算系統 — 端到端總覽（單一入口）

> **性質**：指針＋解釋文件，**唔係規則本體**。費率、公式、不變量以 `FHS_Finance_Bible.md`（L1）／`FHS_Product_Cost_Schema_v2.md`（L2a）／`FHS_Pricing_Bible.md`（L2b）為準；本檔只回答四件事：**邊個計咩、數字去咗邊、點解咁設計、去邊度查**。與 Finance Bible 有衝突，以 Finance Bible 為準。
> **為何存在**：2026-09-20 同一個 session 內，AI 就「前端成本估算」連續多次答錯（「冇裁決」／「純顯示、零影響」／「冇呢個標籤」），根因係**冇任何一份文件講齊前端＋後端點樣一齊運作，更冇寫過點解咁設計**。詳見 `.fhs/reports/completion/2026-09-19_v2-item-drawing-cost-v4725_completion_report.md` §五。
> **建立**：2026-09-21，經 fresh-context `finance-auditor` 逐句核對後修正定稿。**幾時要更新**：見 §八。

---

## 一、一句話版

**售價同成本係兩條獨立嘅線。成本嗰條有兩個計算者，但只有一個係「帳」。**

- **Dashboard（前端）**計兩樣：①**售價**——操作員確收嘅 `final_sale_price`（訂金＋餘款＋附加費，手輸）係絕對真理；系統建議報價只係參考。②**成本估算**——「供操作者參考嘅預算估算，非確收數字」（Fat Mo 2026-06-03 確認），**唔係帳**。
- **n8n（後端）**計**帳**：`total_cost`／`net_profit`／分類成本，寫入 Layer 2 快照。操作員喺總覽、核對訂單、財務報表睇到嘅**訂單層**成本，全部嚟自呢度。
- **例外**：品項層四分量（`drawing／printing／chain／shipping_cost`）歷史上由前端計、n8n 透傳；其中 `drawing`、`chain` 已**部分**收歸 n8n（見 §三）。呢四欄同時有一個定位張力（S125 廢欄 vs D80 補寫；2026-09-21 決定維持現狀，見 D82），見 §四、§五。

## 二、一張圖

```
人手維護 → cost_configurations（Layer 1 設定）──（另行同步）──→ products.total_base_cost（單件全成本）
                    │                                                  │
                    ▼                                                  ▼
   Dashboard calculatePricing()                          n8n「Calculate Profit & Pack Items」
   ├ 售價建議 ─→ 操作員確收 final_sale_price ─────────→（n8n 不得重算）
   ├ 成本估算 System_Total_Cost ─→ n8n「Profit Auditor」（賠本守衛）
   └ 品項四分量 ─（部分透傳）→ n8n ─→ order_items 四分量
                                                                       │
                                                                       ▼
                                   orders.total_cost／net_profit／分類成本（Layer 2 快照）
                                                                       │
                                                                       ▼
                               總覽「成本」欄／核對訂單／財務 KPI（get_financial_kpis／charts）
```

- n8n 攞單件成本係即時讀 Supabase `products.total_base_cost`（節點名「Smart Cache」係誤導，實非檔案快取），**唔係**用前端估算。
- `cost_configurations → products.total_base_cost` **唔會自動同步**：鎖匙扣／吊飾／立體擺設冇同步 RPC，只能靠 migration 直接定值（`fhs_sync_products_from_config` 只同步兩個配件 SKU）；V2 SKU 亦係 migration 定值。驗證用 `fhs_check_product_cost_drift()`（見 `finance-gatekeeper` §一）。
- Airtable 自 D43（2026-07-22）已脫離 live 成本路徑，唔好再去 Airtable 查成本。

## 三、邊個計咩（核心表）

| 數字 | 邊個計 | 存去邊 | 操作員睇到？ | 地位 |
|---|---|---|---|---|
| 系統精算建議報價 | 前端 `calculatePricing()` | 只備存於 `raw_form_state.__System_Final_Sale_Price` | ✅ | 參考，非帳 |
| 確收金額 `final_sale_price` | **操作員手輸** | `orders` | ✅ | **絕對真理**，n8n／Supabase 不得重算 |
| 訂單總成本 `total_cost`、`net_profit`、四個分類成本 | **n8n**：逐件成本彙總（V2＝`products.total_base_cost`×數量；舊 SKU＝成套價；另逐件加家庭組合動態畫圖、舊 SKU 吊飾頸鏈），再減訂單層扣減（鎖匙扣／吊飾運費扣減、吊飾頸鏈共用、V2 同部位免畫圖） | `orders`（Layer 2）；調整明細見 `orders.n8n_adjustment_notes` | ✅ | **帳**。規則見 Cost Schema §10.3／§10.6 |
| 前端成本估算 `System_Total_Cost` | 前端 | 只送 n8n `Profit Auditor`；另存 `raw_form_state.__System_Total_Cost`（**冇任何程式讀**） | ❌（2026-07-21 起 UI 隱藏） | 參考，**非帳** |
| 品項四分量 `drawing／printing／chain／shipping_cost` | 見下表 | `order_items` | 核對訂單「品項展開」內可見 | **審計參考**；訂單層總數**唔係**佢哋加總 |

**四分量點分工（現況）**

| 分量 | 邊個計 |
|---|---|
| `drawing_cost` | 非家庭 V2 品項：**n8n**（V47.25 起，費率×數量，忽略前端值）；家庭組合(V2)：**n8n** 動態計（V47.24 起）；舊 SKU：前端透傳（仍用 S55 舊語義） |
| `chain_cost` | 吊飾類：**n8n** 自算（V47.20 起，覆寫前端值）；鎖匙扣環扣及其他：前端透傳 |
| `printing_cost` | **前端**計，n8n 透傳 |
| `shipping_cost` | 品項層：**前端**計，n8n 透傳；訂單層運費扣減：**n8n** 獨立計。⚠️ 品項層實值係「運費扣減率×數量」（鎖匙扣 $20／吊飾 $35 每件），**唔係真運費**，但核對訂單畫面標為「運費」 |

## 四、點解咁設計（WHY 時間線）

先講清楚：**下面每行嘅「批准情況」按 repo 記錄如實寫；查唔到就寫查唔到，唔作定性。**（唔好一律叫「裁決」，亦唔好因為想更正上一個錯就擺盪去另一個過頭講法。）

| 日期 | 事件 | repo 記錄嘅批准情況 |
|---|---|---|
| 2026-03-22 | V35.0：前端 `System_Total_Cost` 成為利潤結算基準 | Antigravity 改動；03-24 因未授權整體重寫還原 19 節點穩定版；03-27 `Profit Auditor` 檔頭已寫「system price is reference only」 |
| 2026-05-16 | Finance Bible 首版已寫明「成本計算引擎＝n8n Layer 2」（commit `0fcc9ea`） | 文件；L1 此分工自此冇改過 |
| 2026-06-02 | **S53**：`calculatePricing()` 確立為唯一成本計算權威，同時將「n8n 信任前端成本」列 deferred（S54 於 06-03 稱「前端顯示權威化」） | cl-flow／完工報告記「已獲 Fat Mo 確認」（AI 撰寫，原話查唔到） |
| **2026-06-03** | 成本側歸 n8n、前端輸出＝參考預算估算；S57 據此撤回 B2「n8n 信任前端四分量」（Rule 3.16） | **Fat Mo 確認**（`decisions.md`，該段標題為「AI 過失記錄」）；S57 批准者未註明。同 S53 方向相反；係「糾正誤讀」定「改制」，repo 兩種講法都有、冇明文定案 |
| 2026-06-05 | **S60**：品項四分量由前端計、n8n 透傳 | **批准者查唔到**：cl-flow 標明「需 Fat Mo 拍板」，repo 冇拍板記錄，之後交接稱已部署 |
| 2026-06-27 | **S125**：品項層四欄「正式廢欄」——保留欄位不 DROP、停止補寫投資（當時 80 列中 74–76 列為 0/NULL）。原文見 `FHS_System_Logic_Overview.md`「kgov 同步點」段（搜「正式廢欄」） | 決策者未註明（handoff 列為「已定決策」；`decisions.md` 冇 S125 條目） |
| 2026-07-21 | 前端成本數字 UI 隱藏；成本／利潤顯示改由「核對訂單」負責（commit `aa12f5e`；「同一組數顯示兩次」係 S187 誤讀成因） | commit message 標明 Fat Mo decision |
| 2026-07-24 | V2 統一成本模型（Cost Schema §10）推翻 S55 畫圖語義 | Cost Schema §10.3 記 Fat Mo 三度確認 |
| 2026-09-19 | D80：n8n V47.25，V2 品項 `drawing_cost` 由 n8n 計並回填 5 行 | Fat Mo `/execute`；與 S125「停止補寫」**方向相反／有張力**（D80 決策時未提 S125；V2 係 S125 之後新增路徑）|

**S60 原文理由**（`decisions.md` 2026-06-05，四點之一）：**「(3) n8n 拿不到部位級資料，無法重算 drawing 豁免邏輯（最高頻財務雷）」**。同一條 (4) 寫「此策略等同正式啟動『n8n 信任前端成本分量』」——**措辭同 S57 兩日前「n8n 信任前端成本＝違反 Rule 3.16」相反**；範圍上點區分（訂單層 vs 品項層）原文冇明文。

**⚠️ S60 (3) 呢個前提今日已部分失效**：n8n 自 V47.22（2026-07-24）起用 `getPositionCode()` 由 `Order_Item_Key` 尾碼解析部位，V47.25 起 V2 品項畫圖費已由 n8n 計。但該解析只涵蓋非家庭 V2 鎖匙扣／吊飾，**唔含家庭組合同立體擺設主件**。

**「易維護」呢個理由查唔到**：全 repo 搜索「易維護」「方便維護」「maintainab」，冇任何同「前端成本估算 vs n8n 記帳分工」相關嘅記錄（唯一中文命中係財務總覽 KPI 方案比較，無關）。Fat Mo 記得「當初刻意分開、因為易維護」係對話內容，repo 冇記錄；repo 有記錄嘅理由只有 S60 (3)。

## 五、現況同已知落差（截至 2026-09-21）

- **兩套數唔夾係已知現象，唔係新 bug。** 前端估算同 n8n 帳簿差異嘅來源（以 3 張 V2 實單拆解過，無未解釋餘額）：①立體擺設主件成本由 n8n 讀 `products.total_base_cost`，前端唔計（成本值見 Cost Schema §4）②燈飾加購 ③畫圖仍用 S55 舊語義 ④V2 SKU 單價已內含基本運費，前端估算冇對應（2026-07-24 起嘅新漂移，**非設計**）。
- **賠本守衛**（n8n `Profit Auditor`）：只喺「收款 ＞ 0 且前端估算 ＞ 0 且收款 ＜ 估算」先發 Telegram 警報（警報**冇金額**，只寫「稽核未通過」）。**截至 2026-09-21，現存 65 張未刪單中 0 張命中**；32 張估算為 0 而被跳過（全部係純立體擺設單）；有估算嘅 33 張中，估算對帳簿成本平均低約 $203（26 張偏低、5 張偏高、2 張相等；最大低 $560、最大高 $520），所以就算真蝕本都可能唔響。全庫冇任何真實蝕本單（最低售價／成本比 2.34）。D79 已刪 92 個 execution，歷史唔完整，證明唔到「從未觸發」。每張單儲存時另有 `Send Profit Report`（Telegram）發「入帳／成本／利潤」，數字用 n8n 帳簿，蝕本會顯示負數（收件人 repo 冇明文，需 Fat Mo 確認有收到）。呢個守衛由 AI 於 2026-03-27 實作（commit `7971623`，動機：舊版比對理論價表，因手動定價而誤報），查唔到 Fat Mo 裁決紀錄。
- **命名史**：2026-06-02（`aae874a`）至 07-21，該數字喺畫面上嘅標籤寫「**畫圖成本**」，入面裝嘅其實係**全成本估算**，名實不符約 7 星期（標籤帶 `fat-only`，只有 Fat Mo 角色睇到）；現已隱藏。**建議**（未經裁決）：將來如要重新顯示，必須明確標「估算·非帳」。
- **已裁決（D82，Fat Mo 2026-09-21 同意「唔改」）**：以下兩件維持現狀、暫不處理；重啟條件見 `decisions.md` D82（任何財務改動仍須先寫規格、Fat Mo `/execute`、`finance-auditor` 驗收）：
  1. **前端成本估算（`System_Total_Cost`／賠本守衛）保留定退役**——S60 (3) 已部分失效。
  2. **品項四分量嘅去向**——三個方向互相拉扯：S125「廢欄、停止補寫」／D80「重新補寫 `drawing_cost`」／收歸 n8n（`printing／shipping` 而家仍係前端值）。
  - **finance-auditor 數據導向結論（2026-09-21）：兩件都冇急迫需要動。** 平日入帳路徑冇用前端估算或四欄，帳簿冇因佢哋運行出錯（過往真正入錯帳，如頸鏈少計、畫圖豁免範圍，根源係 n8n／價目表／規則語義）；四欄冇任何財務總數、KPI、報表、`/fhs-check` 依賴，只用於核對訂單品項展開（未刪單 133 行中 67 行有值）及收斂律審計文字（`amount=0`）；即使四欄全 0，`Total_Cost`／`Final_Profit` 等**全部不變**。刪前端成本碼要動生產 HTML，且成本同售價喺同一段 `calculatePricing()` 交織（成本專屬約 150–200 行），風險高於收益。可低風險做嘅只有文件層加固（寫明「四欄唔可用作補數基準」＋更新 V42.html:15421-15424 過時註解）。
- **Field Map 缺口**：`n8n/Quadruple_Sync_Field_Map.md` 冇收錄 top-level `System_Total_Cost` payload 欄位，只有 `__System_Total_Cost`；另 :231／:274 仍寫 `final_sale_price ← System_Final_Sale_Price`（系統建議價），同 n8n 現行以收款合計寫入相反（2026-09-21 覆核指出，未處理）。

## 五之二、組件現行立場（速查，2026-09-22 新增）

> 目的：防止「每次建議改動都由局部代碼重新推導角色，導致建議立場反覆翻轉」（見 `decisions.md`「AI 過失記錄」2026-09-21）。**呢張表淨係放「立場＋決策編號」，唔放費率／公式／流程細節**（嗰啲喺 §二／§三／§四）。改動任何一行，必須同一 commit 更新對應 `decisions.md` 條目。

| 組件 | 現行立場 | 決策編號 |
|---|---|---|
| 前端成本估算（`System_Total_Cost`／賠本守衛） | **保留，暫不改**；重啟條件見 D82 | D82（2026-09-21） |
| 品項四分量（`drawing／printing／chain／shipping_cost`） | **維持現狀**，唔收歸 n8n、唔額外補寫、唔清空；重啟條件見 D82 | D82（2026-09-21） |
| `sync_order_to_mirror`（edit 已軟刪訂單） | 已修復——`edit` 拒絕已軟刪單，`create` 重用 ID 仍復活（原意保留） | D81（2026-09-20） |
| V2 品項層 `drawing_cost` | 已修復——n8n V47.25 自算，忽略前端傳值 | D80（2026-09-19） |
| 前端售價建議 `calculatePricing()` | 保留，冇異動 | 未有獨立決策（現況見 §三） |

**如何建議改動任何一行**：先讀本表 ＋ 對應決策全文，答四問（角色／建立原因／邊個依賴／唔改會點），並附「已發生嘅錯數」或「已證實嘅重大風險」；純預防性理由預設唔改（見 `learnings/finance.md` Preferences #3）。

## 六、我想查 X → 去邊度

| 我想查… | 去邊 |
|---|---|
| 單件成本數值、各類費率 | `FHS_Product_Cost_Schema_v2.md` §2.1（L2a，唯一 SSoT） |
| V2 統一成本模型、畫圖費點計、同部位豁免 | Cost Schema §10（§10.3 核心規則、§10.6 家庭組合） |
| 成本流向全鏈路、批量重算 RPC | Cost Schema §8.1／§8.2 |
| 售價點計 | `FHS_Pricing_Bible.md` |
| 架構不變量（Layer 1／2、邊個寫邊個欄位、禁 trigger） | `FHS_Finance_Bible.md`（L1，最高權威） |
| 前端點計成本（白話） | `FHS_System_Logic_Overview.md` §2.1 ⚠️ **有已知過時處**（公式仍含已移除嘅 BaseShipping、標題仍寫 V41） |
| n8n 點計成本、節點流程 | `FHS_System_Logic_Overview.md` §3.3 ⚠️ **有已知過時處**（未反映 V47.20 起嘅免畫圖扣減、頸鏈共用） |
| 收款確收守護 | `FHS_System_Logic_Overview.md` §4.3 |
| 欄位對照（Dashboard ↔ n8n ↔ Supabase ↔ Airtable） | `n8n/Quadruple_Sync_Field_Map.md`（缺口見 §五） |
| KPI／財務報表點計 | `FHS_System_Logic_Overview.md` §十 |
| 「點解咁設計」「有冇批准」 | `.fhs/notes/decisions.md`：搜 `2026-06-03`、`2026-06-05`（S57／S60）、`D80`、`D81`；S53 見 `.fhs/reports/completion/2026-06-02_P1_cost_constitutionalization_completion_report.md`、`artifacts/2026-06-02-0713/`；S60 見 `artifacts/2026-06-05-0136/`；S125 見 System_Logic「正式廢欄」 |
| 某張訂單嘅數字啱唔啱 | 派 `finance-auditor`（**必須**，見 `finance-gatekeeper` §〇） |
| 代碼位置 | Dashboard：搜 `calculatePricing`、`_totalCostNew`；n8n：workflow `6Ljih0hSKr9RpYNm`，節點 `Calculate Profit & Pack Items`、`Profit Auditor` |

## 七、常見誤區（AI 同人都曾經踩過）

1. **「前端成本估算純顯示、零影響」** ✗ — 品項層 `printing／shipping_cost`（及舊 SKU 嘅 `drawing`、鎖匙扣環扣 `chain`）現時仍係前端值，並真實寫入 `order_items`。但 `orders` 層總數唔受影響。
2. **「n8n 係成本唯一權威」** — 呢四個字 repo 冇明文。最接近嘅係 Finance Bible §一「成本計算引擎＝n8n Layer 2」同 AGENTS.md「成本側由 n8n／Supabase 負責」。實況：**訂單層歸 n8n；品項層四分量按分量而異**（§三）。
3. **「而家 UI 仲有成本估算」** ✗ — 前端估算 2026-07-21 起隱藏。**訂單層**成本（總覽成本欄、核對訂單總成本／分類成本、財務 KPI）全部嚟自 n8n 寫入嘅資料庫；但核對訂單「品項展開」內嘅 printing／shipping 等分量係前端計、n8n 透傳嘅值，顯示端另有 fallback（V2 `drawing_cost=0` 時用費率×數量自行重算）；總覽亦會顯示操作員手輸嘅「補打」調整。
4. **「訂單總成本 ＝ 四分量加總」** ✗ — 來自逐件 `products.total_base_cost` 彙總再加減訂單層調整（§三）；四分量只入收斂律審計（偏差超出門檻只寫 `convergence_note`，`amount=0`，唔影響入帳；門檻見 System_Logic §3.3），同時寫入 `order_items` 並喺核對訂單顯示。
5. **「Layer 2 不可變 ＝ 舊單永遠唔會變」** ✗ — L1 字面係禁 Trigger／Generated Column／View 動態重算；但**人手路徑有二**：①重新儲存某張舊單 → 該單重新經 n8n 用**當時** `products` 成本計算並覆寫（`cost_override_locked` 唔擋呢條路）；②「批量重算」RPC（Cost Schema §8.2，用舊公式，會跳過 `cost_override_locked` 單，截至 2026-09-21 未用過）。L1 字面「任何產品漲價均不影響此值」同上述實際行為之間**有缺口，未有裁決**。
6. **「待確認」** — 係訂單日期／刻字等細節待確認，**同財務無關**，訂金／全付一律已實收（Fat Mo 2026-09-20 澄清，見 `finance-gatekeeper` §四）。
7. **講「冇記錄／冇裁決」之前** — 要 grep 全 repo ＋ `git log -S` ＋ commit message，並派 `finance-auditor`。「而家冇」同「從來冇」係兩回事；批准情況要如實寫（Fat Mo 確認／決定、批准者查唔到），更正錯誤時唔好擺盪去另一個過頭講法。
8. **「有記錄」唔等於「有批准」** — S60 有理由記錄，但批准者查唔到；S125 決策者未註明；S125 同 D80 嘅 `drawing_cost` 處理方向相反／有張力，兩者都冇明文取捨。
9. **四欄唔可以當 backfill／重算基準** — 四欄係前端按數量計嘅審計值，可能同 SKU 成本語義唔同。2026-07-24 migration 0076 用四欄做基準，令 07001007 疑似成本低估 $220（未證實，見 handoff `[0076-follow]`）。修數一律按 Cost Schema §10 規則同 `products.total_base_cost` 重算，唔好用四欄倒推。

## 八、維護

以下任一情況，**同一個 commit 內**要更新本檔（連同 `Changelog.md`）：

- n8n `Calculate Profit & Pack Items` 有實質改動（尤其是四分量分工，§三表）
- `calculatePricing()` 成本部分有改動，或 UI 重新顯示／新增任何成本數字
- 新增、收歸或廢棄任何成本欄位
- Fat Mo 就 §五「未裁決」兩項作出裁決（同時更新 §四 時間線）

**唔好喺本檔複製費率、公式、SKU 清單、金額**——呢啲只准喺 L1／L2 存在一份，本檔只放指針同分工關係，否則就係第 N 份會漂移嘅副本（`System_Logic` §2.1 嘅估算公式就係咁漂移過）。
