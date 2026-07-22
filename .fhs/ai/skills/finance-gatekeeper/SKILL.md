---
name: finance-gatekeeper
type: fhs-native
version: 1.5.1
scope: pre-load（任何財務任務前強制載入）
authority: L1 + L2 路由守門員
last_updated: 2026-07-22
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
| 產品生產成本組成邏輯（total_base_cost 有哪些分量）| **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §6 |
| 成本 key 實際數值（material_cost_* / keychain_* / chain 等）| **L2a** `.fhs/ai/FHS_Product_Cost_Schema_v2.md` |
| 折扣 / adjustment_amount 機制 | **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §7 |
| 品牌禁止邏輯（禁成人單買、嬰兒核心原則）| **L2b** `.fhs/ai/FHS_Pricing_Bible.md` §0 |
| 產品身份/結構定義（WHAT，非成本/定價；SKU 依附關係、加購配件清單）| `.fhs/ai/FHS_Product_Definition.md` |
| 成本 RPC / 並發 / 升級 / 回滾 SOP | `.fhs/ai/FHS_Product_Cost_Operations.md`（⚠️ status: draft，pending audit） |
| 成本設定中心 UI 規範（Desktop/Mobile） | `.fhs/ai/FHS_Product_Cost_UI_Spec.md`（⚠️ status: draft，pending audit） |
| 架構規則（Layer 1/2 快照 / 誰寫哪個欄位 / 禁 trigger）| **L1** `.fhs/ai/FHS_Finance_Bible.md` |
| 四端同步欄位映射 | `n8n/Quadruple_Sync_Field_Map.md` |
| KPI 收入分攤 / 混合單 3-layer fallback / get_financial_kpis / get_financial_charts | §十 `.fhs/notes/FHS_System_Logic_Overview.md` §十（RPC 財務計算層 SSoT） |
| Live 訂單成本/利潤驗證 | 啟動 `finance-auditor` subagent |
| Supabase schema / SKU 成本資料 | 啟動 `database-reviewer` subagent |
| `cost_configurations` 改值後 `products.total_base_cost` 是否同步（懷疑 drift）| 先跑 `SELECT * FROM fhs_check_product_cost_drift();`——**2026-07-18 Phase 2 起已覆蓋全品類**（嬰兒/成人/家庭鎖匙扣不銹鋼+鋁合金、吊飾全 tier、立體擺設、配件、佔位 row 監測），見 `FHS_System_Logic_Overview.md` §5.4.3。禁止假設「改設定中心=products 自動同步」|
| 吊飾成本計錯 / 頸鏈成本 / `necklace_chain_cost` | `FHS_System_Logic_Overview.md` §5.4.2（D40，migration 0046 + n8n V47.19，雙數簿漂移修復先例）+ §5.4.5（D42，2026-07-22，V47.19→V47.20 記帳格式對齊鎖匙扣環扣模式，部署狀態見§三B） |
| 家庭套裝（鎖匙扣/吊飾）畫圖成本計錯 / composite 畫圖式 | `FHS_System_Logic_Overview.md` §5.4.3（D41，migrations 0058/0059）：家庭套裝畫圖成本 = **成人份 + 每個嬰兒肢各計一次**，非單一成人式；Dashboard 前端 `calculatePricing()` isFamily 分支為真源 |

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
2. **Layer 2 歷史快照不可變**：`orders.total_cost` / `net_profit` / `handmodel_cost` / `keychain_cost` / `necklace_cost` 訂單確認後不可變更
3. **禁止 trigger 重算成本**：Postgres trigger / generated column 重算任何成本欄位是架構反模式
4. **captureFormState() 禁止改動**：此函式是整個 POS 系統的數據根基
5. **HTML ID 禁止變更**：前端 Input/Button ID 是 n8n Webhook 掛鉤

---

## 三B、成本改動前置紀律（v1.4.0 新增，2026-07-18 D40 事故後強制）

> **背景**：2026-07-17~18 吊飾成本修復連環出錯四次（漏頸鏈→險雙計→誤用過時文件判「漏運費」→N飾未倍增），根因＝每次只驗「今次改嗰忽」，冇一次過寫低完整方程式對齊。以下三步，任何 `products.total_base_cost` / `cost_configurations` / n8n 成本節點改動前**強制執行，缺一不得動手**：

1. **完整方程式先行**：動手前必須寫出該品類「per-SKU 成本方程式全式」（drawing/material/clasp/chain/shipping 每個分量：喺 SKU 層定訂單層？含定唔含？），並用 **live 數據**（非文件）驗證現狀符合——文件可以過時（本事故中 Pricing Bible §6.2 運費分解已被 S124 v2 裁決取代但仍留喺文件度），live 數據先係真相。
2. **對齊已驗證先例**：同鎖匙扣終態（S124 v2，migration 0045）逐分量對照，任何結構性差異（如吊飾頸鏈共用 vs 鎖匙扣環扣獨立）要寫明點解唔同。
3. **改完即跑 drift 檢查**：`SELECT * FROM fhs_check_product_cost_drift() WHERE drift <> 0;`（0057 起覆蓋鎖匙扣嬰兒層 + 吊飾全 tier 共 282 行）——必須零行先算收工；未覆蓋品類（立體擺設/成人鎖匙扣/鋁合金）改動需人工全式核算並記錄於改動記錄。

**現行已定案方程式（live 驗證，2026-07-18，Phase 2 已擴充覆蓋全品類）**：
- 嬰兒鎖匙扣（不銹鋼/鋁合金）：加購 = (material+clasp$10)×N；單購 = tier_drawing{嬰兒60/嬰兒(P)110} + 同上。運費不入 SKU（訂單層扣減 (N−1)×$20）。
- 成人/家庭鎖匙扣（不銹鋼/鋁合金，material 已同價 $125）：加購 = (material+clasp$10)×N；單購 = **composite_drawing** + 同上。composite_drawing＝成人份+每個嬰兒肢各計一次：成人(P)=240、家庭(S1)=170、家庭(S2)=230、家庭(P1)=350、家庭(P2)=460。
- 吊飾（嬰兒/成人）：加購 = material($465)×N；單購 = tier_drawing{60/110/240} + material×N。運費不入 SKU（扣減 (N−1)×$35）。**頸鏈成本（現行 live，V47.20，2026-07-22 D42）**＝品項層對稱摺入每件 $100（`order_items.chain_cost`/`item_base_cost`/`subtotal_cost`/`necklace_cost` 皆已反映，即每件吊飾對稱多 $100），訂單層用共用折扣 `floor(N/2)×$100` 扣減（`n8n_adjustment_notes` type=`necklace_chain_sharing_discount`，負數），取代已退役嘅 V47.19 訂單層單一加項式（`necklace_chain_cost` 正數，`ceil(N/2)×$100`）。數學等價（`100N−floor(N/2)×100=ceil(N/2)×100`），總數不變，純記帳格式對齊鎖匙扣環扣模式。**7 張真實歷史單已一併 backfill**（Dede/Kathleen/Akira/DebbieHo/Amen/Selina Lai/Lokyi_C），全庫現時已統一新格式，冇新舊並存問題。見 `FHS_System_Logic_Overview.md` §5.4.5、decisions.md D42。
- 家庭吊飾（單購）：composite_drawing（同鎖匙扣，D41 修正原單一成人式錯誤）+ material×N；加購 = material×N（無畫圖，不變）。
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
