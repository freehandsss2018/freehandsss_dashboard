---
name: FHS Product Definition
version: v1.1.0
created: 2026-06-05
updated: 2026-07-25（S189財務文件全面審查：§3.2吊飾+§3.3鎖匙扣補入V2統一SKU完整子條目，履行本文件§五自訂「新SKU上線必須加條目」規則，原S189 Phase1新增16個SKU一直未落盤此處）
compatible_with: AGENTS.md v1.4.13
authority: L2 — 產品身份 SSoT
status: active
description: 每個 FHS 產品的身份、部位構成、產品間關係、SKU 命名對應。只回答 WHAT/結構，不回答 HOW MUCH/HOW（成本/定價/操作規程）。
---

# FHS 產品定義 (FHS Product Definition)

> **本文件唯一職責**：定義「這個產品是什麼、由哪些部位組成、和其他產品什麼關係、SKU 怎麼命名」。
>
> **禁止欄位**：成本數值（→ 見 `FHS_Product_Cost_Schema_v2.md`）、定價公式（→ 見 `FHS_Pricing_Bible.md`）、視覺規格（→ 見 `DESIGN.md`）、操作流程（→ 見 `/new-product` + `addon_product_sop.md`）。
>
> **文件層級**：L2（與 Pricing_Bible / Cost_Schema_v2 並列，均受 L1 Finance_Bible + L0 AGENTS 約束）

---

## 一、品牌核心原則

- **靈魂產品**：嬰兒手足立體石膏倒模紀念品
- **§0 嬰兒原則**：所有產品必須圍繞嬰兒展開；禁止「嬰兒照片建模 + 成人實體倒模」組合；禁止單獨訂購成人產品
- §0 例外裁決格式：`§0 狀態：例外 — [理由一行] — Fat Mo 核准日期 → decisions.md [日期]`

---

## 二、產品類別一覽

| 類別 | Order_Item_Key 模式 | item_category | §0 狀態 |
|------|---------------------|---------------|:-------:|
| 立體擺設 | `*_P_*` | `立體擺設` | 符合 |
| 純銀/鍍金吊飾 | `*_M_*` | `純銀頸鏈吊飾` | 符合 |
| 金屬鎖匙扣 | `*_K_*` | `金屬鎖匙扣` | 符合 |
| 加購配件 | `*_W_WOOL`、`*_LIGHTS` 等 | `配件` | 符合（依附主產品）|

---

## 三、產品條目

### 3.1 立體擺設（Category P）

**身份**：嬰兒/大寶/家庭手足石膏倒模，嵌入木框或玻璃瓶的主力紀念品。

**部位構成**：
- 容器款式：木框套裝（方形木質相框）/ 玻璃瓶套裝（圓形玻璃容器）
- 肢數：2肢（雙手 OR 雙腳）/ 4肢（全四肢）
- 成員：嬰兒 / 大寶 / 成人（附 §0 約束）/ 家庭混合

**產品間關係**：
- 立體擺設是「主產品」（`hasMainProduct = true`）；吊飾/鎖匙扣/加購配件依附於它
- 同訂單有主產品時，吊飾/鎖匙扣進入 S mode（有主產品模式）

**SKU 命名**：
```
[款式] ([N]肢)
例：木框套裝 (4肢)、玻璃瓶套裝 (2肢)
```
例外：玻璃瓶套裝若倒模對象含**父母**，SKU 改為「玻璃瓶套裝 (家庭)」（不再標肢數，因售價 flat 不分 2肢/4肢，2026-07-19 新增，見 `FHS_Pricing_Bible.md §2.1`）。木框套裝暫無對應變體。

**Order_Item_Key 格式**：`{orderId}_P_MAIN`

**§0 狀態**：符合（嬰兒/大寶為核心；成人須以「家庭」形式出現，不得單獨成人訂購）

→ 定價：`FHS_Pricing_Bible.md §2`
→ 成本：`FHS_Product_Cost_Schema_v2.md §4`

---

### 3.2 純銀/鍍金吊飾（Category M）

**身份**：以嬰兒手足倒模為造型的純銀或鍍金墜飾，掛於頸鏈上佩戴。

**部位構成**：
- 材質：925純銀 / 925鍍金（售價相同，成本 key 獨立）
- 對象：嬰兒 / 大寶 / 成人 / 家庭
- 建模法：S（實體倒模掃描）/ P（照片建模）
- 部位：左手 / 右手 / 左腳 / 右腳 / 組合（共用同一頸鏈計算）

**頸鏈組規則**（關鍵結構關係）：
- 每條頸鏈最多掛 2 個吊飾（`Math.ceil(totalCharms / 2)` 條頸鏈）
- 同訂單所有吊飾 Order_Items **合併計入**同一頸鏈組計算，不分部位獨立計
- 奇偶規則：偶數吊飾 = 滿條頸鏈；奇數 = 最後一條只掛 1 個

**運費共享規則**：同訂單吊飾件數 ≥ 2，從第 2 件起每件扣 $35 運費

**SKU 命名**：
```
[對象]([建模法])[品類] - [材質]
例：嬰兒吊飾 - 925銀、家庭(S1)吊飾 - 925金、成人(P)吊飾 - 925銀
```

**Order_Item_Key 格式**：`{orderId}_M_{部位碼}_{序號}`

**§0 狀態**：符合（嬰兒為主；成人須伴隨嬰兒訂單出現，不得單獨成人）

→ 定價：`FHS_Pricing_Bible.md §3`
→ 成本：`FHS_Product_Cost_Schema_v2.md §5`（jewelry group）

**V2 統一 SKU（2026-07-24起，嬰兒tier，S189）**：

身份/部位構成不變，但SKU命名同計價路徑改變：
```
[對象]([S/P])[品類] - [材質] (V2)
例：嬰兒(S)吊飾 - 925銀 (V2)、嬰兒(P)吊飾 - 925金 (V2)
```
- 結構變化：不再分單購/加購兩條目（見 `FHS_Finance_Bible.md` §四附錄「單購/加購歷史對照」），統一單件全費SKU，`products.total_base_cost` 直接定值（非cost_configurations組合），quantity欄位獨立於SKU字串
- `Order_Item_Key` 格式不變（`{orderId}_M_{部位碼}`）
- 部位共享規則：同部位（跨鎖匙扣/吊飾）首件收畫圖費，其餘豁免，由 `order_items.position_code`/`drawing_waived`/`drawing_charged_count` 記錄
- 現時僅覆蓋嬰兒tier；大寶/成人/家庭仍用舊模型
- 完整16個SKU清單 + 公式 → `FHS_Product_Cost_Schema_v2.md` §10（唯一SSoT，本文件不重複列表）

---

### 3.3 金屬鎖匙扣（Category K）

**身份**：以嬰兒手足倒模為造型的金屬扁平鑰匙扣掛件，附鑰匙環。

**部位構成**：
- 材質：不銹鋼 / 鋁合金（售價相同）
- 對象：嬰兒 / 大寶 / 成人 / 家庭
- 建模法：S / P
- 部位：左手 / 右手 / 左腳 / 右腳（每個部位獨立計階梯）

**重要結構差異（vs 吊飾）**：
- 鎖匙扣**不合併**：每個部位各自獨立計階梯定價（左手 qty=3 和右手 qty=2 分別算）
- 無頸鏈組概念；clasp = 環扣配件（$10 per 件），非頸鏈

**運費共享規則**：同訂單鎖匙扣件數 ≥ 2，從第 2 件起每件扣 $20 運費

**SKU 命名**：
```
[對象]([建模法])[品類] - [材質]
例：嬰兒鎖匙扣 - 不銹鋼、成人(P)鎖匙扣 - 鋁合金
```

**Order_Item_Key 格式**：`{orderId}_K_{部位碼}_{序號}`

**§0 狀態**：符合（成人須伴隨嬰兒訂單）

→ 定價：`FHS_Pricing_Bible.md §4`
→ 成本：`FHS_Product_Cost_Schema_v2.md §5`（jewelry group）

**V2 統一 SKU（2026-07-24起，嬰兒tier，S189）**：

身份/部位構成不變，但SKU命名同計價路徑改變：
```
[對象]([S/P])[品類] - [材質] (V2)
例：嬰兒(S)鎖匙扣 - 不銹鋼 (V2)、嬰兒(P)鎖匙扣 - 鋁合金 (V2)
```
- 結構變化：不再分單購/加購兩條目（見 `FHS_Finance_Bible.md` §四附錄「單購/加購歷史對照」），統一單件全費SKU，`products.total_base_cost` 直接定值（非cost_configurations組合）
- `Order_Item_Key` 格式不變（`{orderId}_K_{部位碼}`）
- 部位共享規則變化：由「每個部位獨立計階梯」延伸為「同部位（跨鎖匙扣/吊飾）首件收畫圖費，其餘豁免」，由 `order_items.position_code`/`drawing_waived`/`drawing_charged_count` 記錄
- 現時僅覆蓋嬰兒tier；大寶/成人/家庭仍用舊模型
- 完整16個SKU清單 + 公式 → `FHS_Product_Cost_Schema_v2.md` §10（唯一SSoT，本文件不重複列表）

---

### 3.4 加購配件（Add-on Products）

**身份**：依附於立體擺設主產品的選購附加品，不獨立成行顯示，以 badge 形式附在父產品列。

**現有配件**：

| 配件名稱 | Order_Item_Key 後綴 | form field | 成本來源 |
|---------|--------------------|-----------|----|
| 羊毛氈公仔 | `_W_WOOL` | `w_wool_en` | `addon_cost_wool_felt` | `羊毛氈公仔 - 加購` |
| 燈飾 | `_LIGHTS` | `lights_en` | `addon_cost_light` | `燈飾 - 加購` |

**結構規則**：
- 必須有主產品（`enableP = true`）才可加購
- Supabase products 表需有對應 SKU row（FK 保護）
- `sbSyncOrder` item mapper **不寫** product_sku，除非 products 表已有該 SKU（→ `addon_product_sop.md`）

**§0 狀態**：符合（加購配件依附嬰兒倒模主產品存在）

→ 定價：`FHS_Pricing_Bible.md §2.3`
→ 成本：`FHS_Product_Cost_Schema_v2.md §7`（GROUP E — Addon）
→ 新增 SOP：`addon_product_sop.md`（含四必改位置 + FK 保護）

---

### 3.5 新增非嬰兒產品（§0 例外，需正式裁決）

適用場景：寵物腳印吊飾、成人紀念品（非家庭形式）等非嬰兒主體產品。

**必要流程**：
1. 在 `decisions.md` 記錄裁決（產品定義 + 為何豁免 §0 + Fat Mo 核准日期）
2. 本檔條目填寫：`§0 狀態：例外 — [一行理由] → decisions.md [日期]`
3. 執行 `/new-product` 五步 + Step 6（知識落盤）

**沒有 decisions.md 正式批准 = 不得新增 §0 例外產品。**

---

## 四、產品間關係速查

```
立體擺設（主產品）
    ├── 吊飾（S mode，同訂單合併頸鏈組計算）
    ├── 鎖匙扣（S mode，各部位獨立計階梯）
    └── 加購配件（badge 形式，不獨立成行）
            ├── 羊毛氈公仔
            └── 燈飾

無立體擺設（P mode）
    ├── 吊飾（P mode 定價，獨立計算）
    └── 鎖匙扣（P mode 定價，各部位獨立）
```

---

## 五、新增產品必做

任何新產品類型/SKU 上線，必須：

1. 在本文件加條目（身份/部位/關係/SKU/§0 狀態/連結）
2. 執行 `/new-product` 五步 atomic 流程（含 Step 6 知識落盤）
3. Step 6 具體：
   - 本檔新增條目 ✓
   - `FHS_Pricing_Bible.md §10` 沿革登一行 ✓
   - `decisions.md` 記決策理由 ✓（§0 例外必填，一般產品可選）

---

*本文件只回答 WHAT。成本問 `FHS_Product_Cost_Schema_v2.md`；定價問 `FHS_Pricing_Bible.md`；流程問 `/new-product` + `addon_product_sop.md`。*
