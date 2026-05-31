---
name: finance-gatekeeper
type: fhs-native
version: 1.0.0
scope: pre-load（任何財務任務前強制載入）
authority: L1 + L2 路由守門員
---

# FHS Finance Gatekeeper — 財務知識守門員

> **觸發時機**：任何涉及定價 / 成本 / 利潤 / 折扣的任務，在第一個工具呼叫前必須載入本 Skill。
> **不替代**：finance-auditor（live 訂單驗證）和 database-reviewer（schema 稽核）職責不同，需另行啟動。

---

## 一、查詢路由表（先查這裡）

| 你要問的問題類型 | 讀哪份文件 |
|----------------|-----------|
| 產品定價、售價公式（吊飾/鎖匙扣/立體擺設多少錢）| **L2** `.fhs/notes/FHS_Pricing_Bible.md` §2–§4 |
| FatMo 繪圖成本（Drawing Cost）| **L2** `.fhs/notes/FHS_Pricing_Bible.md` §5 |
| 產品生產成本結構（total_base_cost 組成）| **L2** `.fhs/notes/FHS_Pricing_Bible.md` §6 |
| 折扣 / adjustment_amount 機制 | **L2** `.fhs/notes/FHS_Pricing_Bible.md` §7 |
| 品牌禁止邏輯（禁成人單買、嬰兒核心原則）| **L2** `.fhs/notes/FHS_Pricing_Bible.md` §0 |
| 架構規則（Layer 2 快照 / 誰寫哪個欄位 / 禁 trigger）| **L1** `.fhs/ai/FHS_Finance_Bible.md` |
| 四端同步欄位映射 | `n8n/Quadruple_Sync_Field_Map.md` |
| Live 訂單成本/利潤驗證 | 啟動 `finance-auditor` subagent |
| Supabase schema / SKU 成本資料 | 啟動 `database-reviewer` subagent |

---

## 二、權威階層與衝突解決

```
L1  FHS_Finance_Bible.md     ← 架構不變量（最高權威）
    若與任何文件衝突，以 L1 為準

L2  FHS_Pricing_Bible.md     ← 現行定價 HEAD（2026-06-01 起）
    取代 product_pricing_reference.md（已退役）
    取代 FHS_Product_Bible_V3.7.md（已退役，多項定價規則已過時）
    若與退役文件衝突，以 L2 為準
```

> ⚠️ 若搜索到 `product_pricing_reference.md` 或 `FHS_Product_Bible_V3.7.md`：
> 這兩份文件**已退役**，不得用於定價計算。請改讀 `FHS_Pricing_Bible.md`。

---

## 三、5 條財務死線（永不違反）

1. **前端利潤最高真理**：前端計算並傳入的 `final_sale_price` 為最終值，n8n 不得重算（除非前端傳入值為 0）
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
- 「products.total_base_cost」：目前為 migration 0023 硬編碼值，Task A 完成前不是動態 roll-up
