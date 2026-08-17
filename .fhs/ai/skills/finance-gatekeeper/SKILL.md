---
name: finance-gatekeeper
type: fhs-native
version: 1.11.1
scope: pre-load（任何財務任務前強制載入）
authority: L1 + L2 路由守門員
last_updated: 2026-08-17（D65續II：立體擺設價錢真源抽為 `_pPriceOfSku()`，§一路由表加一行；純代碼重構，128組窮舉證實零財務規則變動，見 §5.4.18）
[前次] 2026-08-16（D65：父母/大寶升格訂單層一次性角色，§一路由表新增 owner 歸屬/家庭組合 S/P 全單判定一行，見 §5.4.17）
[前次] 2026-08-16（§三「5條財務死線」第2條補漏 `accessory_cost`——此前只列三分類，屬同 finance-auditor.md/database-reviewer.md 文件缺口同一批 grep sweep 事後揪出；一併修復 `FHS_Finance_Bible.md` §九「驗證公式」自身內部漂移，同檔 §三 line 136 早有4分類但 §九 line 396 仍停留3分類）
[前次] 2026-08-16（`sync_order_to_mirror` RPC `accessory_cost` 讀寫回歸修復完成，migration 0088，狀態由「未修復」更新為「✅已修復」，見 §5.4.16）
[前次] 2026-08-15（D64：多件手模擺設訂單新財務規則入表；曾記錄 accessory_cost「已修復」過時聲明——已於2026-07-28回歸，見 §5.4.15）
[前次] 2026-07-28（cl-flow 2026-07-28-1121：大寶/成人/家庭三對象轉V2模型——§一路由表新增家庭組合(V2)/大寶standalone廢止規則兩行；§三B方程式段新增V2擴充+家庭動態畫圖式）
[前次] 2026-07-25（D46事故後：§三B新增第4步「文件同步完整性grep sweep」，防止成本欄位改動漏同步Finance Bible/Product_Definition等權威文件；大型改動另派fresh-context subagent覆核）
compatible_with: AGENTS.md v1.4.13
---

# FHS Finance Gatekeeper — 財務知識守門員

> **觸發時機**：任何涉及定價 / 成本 / 利潤 / 折扣的任務，在第一個工具呼叫前必須載入本 Skill。
> **不替代**：finance-auditor（live 訂單驗證）和 database-reviewer（schema 稽核）職責不同，需另行啟動。

---

## 一、查詢路由表（先查這裡）

| 你要問的問題類型 | 讀哪份文件 |
|----------------|-----------|
| 產品定價、售價公式（吊飾/鎖匙扣/立體擺設多少錢）| **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §2–§4 |
| FatMo 繪圖成本（Drawing Cost）| **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §5 |
| 產品生產成本組成邏輯（total_base_cost 有哪些分量）| **L2a** `.fhs/ai/FHS_Product_Cost_Schema_v2.md`（唯一SSoT，2026-07-25起 Pricing Bible §6 已改指針） |
| 成本 key 實際數值（material_cost_* / keychain_* / chain 等）| **L2a** `.fhs/ai/FHS_Product_Cost_Schema_v2.md` §2.1（唯一SSoT，§5.2重複表已於2026-07-25刪除） |
| 折扣 / adjustment_amount 機制 | **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §7 |
| 品牌禁止邏輯（禁成人單買、嬰兒核心原則）| **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §0 |
| 產品身份/結構定義（WHAT，非成本/定價；SKU 依附關係、加購配件清單、V2統一SKU）| `.fhs/ai/FHS_Product_Definition.md` |
| 成本 RPC / 並發 / 升級 / 回滾 SOP（歷史參考） | `.fhs/ai/FHS_Product_Cost_Operations.md`（⚠️ 已於2026-07-25退役，唯一未完成項`fhs_mirror_write_product_cost` RPC見handoff.md待辦） |
| 成本設定中心 UI 規範（歷史參考，內容已100%落地） | `.fhs/ai/FHS_Product_Cost_UI_Spec.md`（⚠️ 已於2026-07-25退役） |
| 架構規則（Layer 1/2 快照 / 誰寫哪個欄位 / 禁 trigger）| **L1** `.fhs/ai/FHS_Finance_Bible.md` |
| 四端同步欄位映射 | `n8n/Quadruple_Sync_Field_Map.md` |
| KPI 收入分攤 / 混合單 3-layer fallback / get_financial_kpis / get_financial_charts | §十 `.fhs/notes/FHS_System_Logic_Overview.md` §十（RPC 財務計算層 SSoT） |
| Live 訂單成本/利潤驗證 | 啟動 `finance-auditor` subagent |
| Supabase schema / SKU 成本資料 | 啟動 `database-reviewer` subagent |
| `cost_configurations` 改值後 `products.total_base_cost` 是否同步（懷疑 drift）| 先跑 `SELECT * FROM fhs_check_product_cost_drift();`——**2026-07-18 Phase 2 起已覆蓋全品類**（嬰兒/成人/家庭鎖匙扣不銹鋼+鋁合金、吊飾全 tier、立體擺設、配件、佔位 row 監測），見 `FHS_System_Logic_Overview.md` §5.4.3。禁止假設「改設定中心=products 自動同步」|
| 吊飾成本計錯 / 頸鏈成本 / `necklace_chain_cost` | `FHS_System_Logic_Overview.md` §5.4.2（D40，migration 0046 + n8n V47.19，雙數簿漂移修復先例）+ §5.4.5（D42，2026-07-22，V47.19→V47.20 記帳格式對齊鎖匙扣環扣模式，部署狀態見§三B） |
| 家庭套裝（鎖匙扣/吊飾）畫圖成本計錯 / composite 畫圖式 | **⚠️ 2026-07-28起分岔**：舊模型靜態SKU（S1/S2/P1/P2命名）仍適用 `FHS_System_Logic_Overview.md` §5.4.3（D41，migrations 0058/0059，成人份+每個嬰兒肢各計一次），僅供**歷史舊單**參考；**新單一律用**家庭鎖匙扣(V2) 動態畫圖模型，見下一行 |
| 家庭組合鎖匙扣(V2) 點計 / β混型 / Family_Member_Config | `FHS_Product_Cost_Schema_v2.md` §10.6（唯一SSoT，2026-07-28新增）：單行+n8n動態畫圖（成人一對$110/240一次過+每部位$60/110逐個計，S/P由Dashboard全自動推導）；業務定義（一件整合飾品/只限鎖匙扣/嬰兒大寶核心必須）見 `FHS_Product_Definition.md` §3.3a；決策記錄 `.fhs/notes/decisions.md` 2026-07-28 |
| 大寶 standalone（冇主套裝）成本計錯 / 「升格家庭」規則 | **舊規則已廢止**（2026-07-28，核實三份權威文件皆無記載，純代碼行為）：大寶standalone用「大寶(P)」新語義（單件全費，非升格家庭(P1)）。詳見 `FHS_Product_Cost_Schema_v2.md` §10.6、`FHS_Finance_Bible.md` §五B |
| 「加購」鎖匙扣/吊飾點解冇畫圖費 / V2統一SKU模型 / 品項全額訂單淨額規則 / 同部位畫圖共享豁免 | **規則家族「V2統一成本模型」（S189起，已落地生產，非待辦；2026-07-28擴充大寶/成人/家庭tier）**——正式權威：`FHS_Product_Cost_Schema_v2.md` §10（唯一SSoT，公式+26SKU清單+架構，含§10.6家庭exception）+ `FHS_Finance_Bible.md` §五B（架構責任）+ §四附錄（「單購/加購」歷史命名對照，舊訂單專用）。事件時序/決策過程（點解由S55漂移到而家嘅裁決）留喺 `FHS_System_Logic_Overview.md` §5.4.6，唔再係查規則嘅終點——查「現行規則係咩」請直接讀上述兩份正式文件，唔使讀session筆記 |
| n8n 四端欄位映射 / 「Node 14 – Cost Calculator」等舊節點名對唔上現行代碼 | `Quadruple_Sync_Field_Map.md` 已於 2026-07-28 改版至 v2.1（新增`family_member_config`欄位映射；位置代碼值域擴充大寶），讀現行v2.1版本，唔好對照歷史記憶/舊版對話 |
| 配件成本（羊毛氈/燈飾加購）點解冇獨立分類欄 / `accessory_cost` | `FHS_System_Logic_Overview.md` §5.4.7（cl-flow 2026-07-25-0148，✅已修復，schema+n8n+Dashboard）+ §5.4.16（migration 0088，2026-08-16，✅已修復，RPC讀寫回歸修復；發現過程見§5.4.15）：`orders`/`order_items.accessory_cost` 完整鏈路已修復（migration 0079/0080 建欄+首次RPC讀寫，0081 曾令RPC讀寫回歸，migration 0088 補回）；配件僅限**玻璃瓶款式**立體擺設（非全部立體擺設），`FHS_Product_Cost_Schema_v2.md` §7.1/7.5 為正式定義 |
| 多件手模擺設訂單（一單多件木框/玻璃瓶）成本點計 | `FHS_System_Logic_Overview.md` §5.4.14（D64，2026-08-15）：逃生口模式，每件獨立收取完整基礎成本 $210，不設第二件起減免；追加件燈飾照計 $30/件 |
| 父母/大寶唯一性規則 / 家庭瓶歸屬（owner）/ 家庭定價 $2,580 判斷歸邊件 / 家庭組合鎖匙扣 S/P 全單判定 | `FHS_System_Logic_Overview.md` §5.4.17（D65，2026-08-16）：父母/大寶升格「訂單層一次性角色」，全單最多一件家庭瓶，歸屬由 `#p_family_owner` 選擇器指定（`_isFamilyOwner()`）；業務規則七條+owner機制全文見 `FHS_Product_Definition.md` §3.1a；家庭組合鎖匙扣 S/P 語義＝「全單任何一件」倒模狀態（與立體擺設家庭定價「只讀 owner 件自身」刻意不同，見 §3.3a） |
| 立體擺設價錢真源 / `_pPriceOfSku` 定義喺邊 / 卡片徽章顯示邏輯 | `FHS_System_Logic_Overview.md` §5.4.18（D65續II，2026-08-17）：`calculatePricing()` 原 inline 價錢判斷式抽為純函數 `_pPriceOfSku(name)`，卡片 owner 徽章與報價共讀同一函數（結構上不可能唔一致）；純代碼結構重構，128組窮舉證實零財務規則語義變動，七條業務規則本身不變 |

---

## 二、權威階層與衝突解決

```text
L1  FHS_Finance_Bible.md     ← 架構不變量（最高權威）
    若與任何文件衝突，以 L1 為準

L2a FHS_Product_Cost_Schema_v2.md ← 成本 key 數值定義
    查成本實際數值時讀此文件

L2b FHS_Pricing_Bible.md     ← 現行定價 HEAD（2026-06-01 起）
    取代 product_pricing_reference.md（已退役）
    取代 FHS_Product_Bible_V3.7.md（已退役，多項定價規則已過時）
    若與退役文件衝突，以 L2b 為準
```

> ⚠️ 若搜索到 `product_pricing_reference.md` 或 `FHS_Product_Bible_V3.7.md`：
> 這兩份文件**已退役**，不得用於定價計算。請改讀 `FHS_Pricing_Bible.md`。

---

## 三、5 條財務死線（永不違反）

1. **收款確收守護（v1.4.10 語義修正）**：操作者手動輸入的確收金額 `final_sale_price`（= Deposit + Balance + Additional_Fee）為絕對真理，n8n 不得重算（除非前端傳入值為 0）。成本 `total_cost` 由 n8n 從 Supabase 估算，屬後台快照，非「真理」。
2. **Layer 2 歷史快照不可變**：`orders.total_cost` / `net_profit` / `handmodel_cost` / `keychain_cost` / `necklace_cost` / `accessory_cost` 訂單確認後不可變更
3. **禁止 trigger 重算成本**：Postgres trigger / generated column 重算任何成本欄位是架構反模式
4. **captureFormState() 禁止改動**：此函式是整個 POS 系統的數據根基
5. **HTML ID 禁止變更**：前端 Input/Button ID 是 n8n Webhook 掛鉤

---

## 三B、成本改動前置紀律（v1.4.0 新增，2026-07-18 D40 事故後強制；v1.8.0 新增第4步，2026-07-25 D46 事故後強制）

> **背景（三步版）**：2026-07-17~18 吊飾成本修復連環出錯四次（漏頸鏈→險雙計→誤用過時文件判「漏運費」→N飾未倍增），根因＝每次只驗「今次改嗰忽」，冇一次過寫低完整方程式對齊。
> **背景（第4步新增）**：2026-07-25（D46）新增 `accessory_cost` 欄位後，AI 只跟自己寫低嘅執行計劃同步咗3份文件，漏咗 `FHS_Finance_Bible.md`（L1最高權威）同 `FHS_Product_Definition.md`（L2產品身份SSoT）——兩份文件入面都逐字列出兄弟欄位（`handmodel_cost`/`keychain_cost`/`necklace_cost`）但冇機制逼AI搜齊全部命中處。Fat Mo 事後質詢先發現。根因：文件同步靠「憑記憶/憑執行計劃寫低嘅清單」，唔靠機械化搜尋，清單本身可以就係漏嘅。
>
> 以下四步，任何 `products.total_base_cost` / `cost_configurations` / n8n 成本節點 / `orders`／`order_items` 成本欄位改動前**強制執行，缺一不得動手／不得宣告完成**：

1. **完整方程式先行**：動手前必須寫出該品類「per-SKU 成本方程式全式」（drawing/material/clasp/chain/shipping 每個分量：喺 SKU 層定訂單層？含定唔含？），並用 **live 數據**（非文件）驗證現狀符合——文件可以過時（本事故中 Pricing Bible §6.2 運費分解已被 S124 v2 裁決取代但仍留喺文件度），live 數據先係真相。
2. **對齊已驗證先例**：同鎖匙扣終態（S124 v2，migration 0045）逐分量對照，任何結構性差異（如吊飾頸鏈共用 vs 鎖匙扣環扣獨立）要寫明點解唔同。
3. **改完即跑 drift 檢查**：`SELECT * FROM fhs_check_product_cost_drift() WHERE drift <> 0;`（0057 起覆蓋鎖匙扣嬰兒層 + 吊飾全 tier 共 282 行）——必須零行先算收工；未覆蓋品類（立體擺設/成人鎖匙扣/鋁合金）改動需人工全式核算並記錄於改動記錄。
4. **文件同步完整性 grep sweep（新增，D46）**：宣告「文件已同步」前，必須執行 `grep -rn "<兄弟欄位名，如handmodel_cost>" .fhs/ai/ .fhs/notes/ n8n/*.md docs/`（兄弟欄位＝同一收斂公式/同一責任表入面已存在嘅同類欄位，例如加 `accessory_cost` 就搜 `handmodel_cost`/`keychain_cost`/`necklace_cost`），逐一列出命中檔案，核對新欄位是否已在**每一個**命中處同步出現（實體清單/彙總公式/責任表/收斂驗證式）——唔可以只跟執行計劃自己寫低嘅文件清單，因為嗰份清單本身可能就係漏嘅源頭。清單必須包含至少：`FHS_Finance_Bible.md`（L1）、`FHS_Product_Definition.md`（L2）、`FHS_Product_Cost_Schema_v2.md`（L2a）、`n8n/Quadruple_Sync_Field_Map.md`、`finance-gatekeeper/SKILL.md` 路由表。
   - **大型/跨多份文件改動**（例如一次過改3份以上權威文件，或欄位新增涉及架構性決策）：grep sweep 後另派一個 **fresh-context subagent**（唔帶住本對話記憶）獨立覆核同一清單，防止「自己以為改晒」嘅盲點（今次事故正正係 Fat Mo 事後質詢先發現，非AI自查揪出）。

**現行已定案方程式（live 驗證，2026-07-18，Phase 2 已擴充覆蓋全品類）**：
- 嬰兒鎖匙扣（不銹鋼/鋁合金）：加購 = (material+clasp$10)×N；單購 = tier_drawing{嬰兒60/嬰兒(P)110} + 同上。運費不入 SKU（訂單層扣減 (N−1)×$20）。
- 成人/家庭鎖匙扣（不銹鋼/鋁合金，material 已同價 $125）：加購 = (material+clasp$10)×N；單購 = **composite_drawing** + 同上。composite_drawing＝成人份+每個嬰兒肢各計一次：成人(P)=240、家庭(S1)=170、家庭(S2)=230、家庭(P1)=350、家庭(P2)=460。
- 吊飾（嬰兒/成人）：加購 = material($465)×N；單購 = tier_drawing{60/110/240} + material×N。運費不入 SKU（扣減 (N−1)×$35）。**頸鏈成本（現行 live，V47.20，2026-07-22 D42）**＝品項層對稱摺入每件 $100（`order_items.chain_cost`/`item_base_cost`/`subtotal_cost`/`necklace_cost` 皆已反映，即每件吊飾對稱多 $100），訂單層用共用折扣 `floor(N/2)×$100` 扣減（`n8n_adjustment_notes` type=`necklace_chain_sharing_discount`，負數），取代已退役嘅 V47.19 訂單層單一加項式（`necklace_chain_cost` 正數，`ceil(N/2)×$100`）。數學等價（`100N−floor(N/2)×100=ceil(N/2)×100`），總數不變，純記帳格式對齊鎖匙扣環扣模式。**7 張真實歷史單已一併 backfill**（Dede/Kathleen/Akira/DebbieHo/Amen/Selina Lai/Lokyi_C），全庫現時已統一新格式，冇新舊並存問題。見 `FHS_System_Logic_Overview.md` §5.4.5、decisions.md D42。
- 家庭吊飾（單購）：composite_drawing（同鎖匙扣，D41 修正原單一成人式錯誤）+ material×N；加購 = material×N（無畫圖，不變）。**⚠️ 以上鎖匙扣composite_drawing式僅適用歷史舊單（S1/S2/P1/P2靜態SKU）；新單見下方V2動態式。**
- **V2統一SKU（2026-07-28擴充，大寶/成人tier）**：`大寶(S/P)鎖匙扣/吊飾 - 材質 (V2)`，成本值＝嬰兒tier同值（205/255鎖匙扣、660/710吊飾）；`成人(S/P)鎖匙扣/吊飾 - 材質 (V2)`＝265/395/710/840。大寶standalone用「大寶(P)」新語義，取代舊「升格家庭(P1)」規則（已核實三份權威文件皆無記載，正式廢止）。
- **家庭鎖匙扣(V2) 動態畫圖式（2026-07-28新增，取代composite_drawing）**：`products.total_base_cost=$160`（塊牌物理成本only：material_cost_keychain_family$150+clasp$10）；畫圖費n8n訂單層動態計算＝adult_rate(S110/P240)+Σ每部位limb_rate(S60/P110)，唔隨qty相乘。S/P由Dashboard全自動推導（成人：玻璃瓶家庭已選=S；部位：主套裝該部位有冇倒模=S）。β混型（成人P+部位S混合）天然支援。只限鎖匙扣，冇家庭吊飾版本。完整公式見 `FHS_Product_Cost_Schema_v2.md` §10.6。
- 立體擺設：$210 flat（2肢/4肢同價，migration 0030）。
- 配件（羊毛氈/燈飾加購）：$30 flat。

## 四、常見易錯點（快速提示）

- 「異部位附加費」：**已移除**（Session 48 Phase 2，2026-05-31）—— 鎖匙扣和吊飾均無此費用
- 「頸鏈吊飾」：以**總吊飾數**合併計算頸鏈組，不分部位；925銀/金同價
- 「鎖匙扣定價」：每個**身體部位**獨立計階梯；S mode 和 P mode 有不同費率
- 「adjustment_amount」：FHS 無百分比折扣，唯一調整方式是金額差值（正數=追費，負數=折讓）
- 「products.total_base_cost」：目前為 migration 0023 硬編碼值，Task A 完成前不是動態 roll-up；**`cost_configurations` 改值不會自動回算此欄位**（無傳播機制，Session 112 確認），舊單 base cost 不變屬正常快照語義，非錯誤
- 「`recalculate_product_costs(text)` RPC」：**已於 migration 0042 移除**（v1 schema 死碼，引用不存在欄位必報錯），不存在替代品——目前無任何 RPC 能批量回算 products 表，僅 `fhs_check_product_cost_drift()` 可唯讀比對（2026-07-18 起已覆蓋全品類）
- 「家庭套裝畫圖成本」：**唔係單一成人式**——每個嬰兒肢都各自要計畫圖費，成人+2嬰兒肢 = 成人份+2×嬰兒份，唔係淨計成人嗰份（D41 教訓，opus 首輪對抗審查方向都判斷錯，最終要查 Dashboard 前端原始碼先定案）

---

## 五、技術債備忘

- **Task A 路由更新觸發條件**：Task A（四分量 roll-up）完成後，Cost Schema v2 將升至 v3（新增 drawing/printing/chain/shipping_cost key），本路由表需同步更新。
