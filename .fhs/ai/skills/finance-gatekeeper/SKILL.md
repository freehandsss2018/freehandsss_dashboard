---
name: finance-gatekeeper
type: fhs-native
version: 1.3.0
scope: pre-load（任何財務任務前強制載入）
authority: L1 + L2 路由守門員
last_updated: 2026-06-20
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
| `cost_configurations` 改值後 `products.total_base_cost` 是否同步（懷疑 drift）| 先跑 `SELECT * FROM fhs_check_product_cost_drift();`（Session 112，**範圍限定**僅嬰兒 S/P 不銹鋼鎖匙扣，見 `FHS_System_Logic_Overview.md` §5.4）；其餘 tier 無自動檢查工具，需人工用 atom 公式核算，禁止假設「改設定中心=products 自動同步」|

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

## 四、常見易錯點（快速提示）

- 「異部位附加費」：**已移除**（Session 48 Phase 2，2026-05-31）—— 鎖匙扣和吊飾均無此費用
- 「頸鏈吊飾」：以**總吊飾數**合併計算頸鏈組，不分部位；925銀/金同價
- 「鎖匙扣定價」：每個**身體部位**獨立計階梯；S mode 和 P mode 有不同費率
- 「adjustment_amount」：FHS 無百分比折扣，唯一調整方式是金額差值（正數=追費，負數=折讓）
- 「products.total_base_cost」：目前為 migration 0023 硬編碼值，Task A 完成前不是動態 roll-up；**`cost_configurations` 改值不會自動回算此欄位**（無傳播機制，Session 112 確認），舊單 base cost 不變屬正常快照語義，非錯誤
- 「`recalculate_product_costs(text)` RPC」：**已於 migration 0042 移除**（v1 schema 死碼，引用不存在欄位必報錯），不存在替代品——目前無任何 RPC 能批量回算 products 表，僅 `fhs_check_product_cost_drift()` 可唯讀比對（範圍受限，見上）

---

## 五、技術債備忘

- **Task A 路由更新觸發條件**：Task A（四分量 roll-up）完成後，Cost Schema v2 將升至 v3（新增 drawing/printing/chain/shipping_cost key），本路由表需同步更新。
