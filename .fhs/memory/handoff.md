# FHS Handoff - 2026-05-03
當前版本：v1.4.2（憲法層）/ V40.7（UI層）/ 6 Agents + 2 Skills + Hook System v1.0.0

## 本次 Session 完成事項（2026-05-03）

✅ **Stitch → Antigravity 整合（Phase A–D）**
- 新增 `ag-stitch-sync.md`、`ag-ui-import.md` 指令
- 更新 ANTIGRAVITY.md、ui-designer.md、frontend-developer.md
- pending task 標記 COMPLETED

✅ **n8n 安全網（問題一 B）確認關閉**
- Create Sub Items 節點已是純 upsert，無刪舊邏輯

✅ **Dashboard Bug 修正 — IG 預覽「待定」遺漏**
- `formatLimbs()` 移除「待定」過濾：V40 + current.html 均已修正

✅ **Airtable 成本分拆欄位建立**
- Order_Items：Handmodel_Cost、Keychain_Cost、Necklace_Cost（formula，有紅三角待修）
- Main_Orders：3 個對應 Rollup 欄位（SUM）

✅ **AGENTS.md 升級至 v1.4.2**
- 新增「Stitch 資產守護」、「Airtable 計算職責分工」兩條新規則

## 待辦 ⏳ 項目

1. **[P-HIGH] Airtable formula 欄位紅三角修正**
   - Order_Items 的 Handmodel_Cost / Keychain_Cost / Necklace_Cost 有錯誤
   - 修正腳本（Scripting Extension）：`updateOptionsAsync({ formula: 'IF(FIND(...), SUM({Item_BaseCost}) * {Quantity}, 0)' })`
   - 或改方向：n8n Create Sub Items 直接寫入（改為 number 欄位）

2. **[P-MED] n8n Create Sub Items 更新**
   - 若 formula 方案無法修復，改為 n8n 直接寫入 3 個成本欄位
   - 節點現有欄位：Product_Link、Quantity、Engraving_Text、Order_Link、Order_Item_Key
   - 需加入：Handmodel_Cost、Keychain_Cost、Necklace_Cost（依 item 類別判斷）

3. **[PENDING] preview_product_distinction_v40.html**
   - 未追蹤檔案，確認是否納入 git 或加入 .gitignore

4. **🟡 Legacy Scripts 文件化決策**（4 個腳本未在 scripts/README.md 記錄）

5. **iPhone 實機測試** — V40 財務模式

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.2 |
| 稼動生產版 | `Freehandsss_dashboard_current.html` |
| 主要開發版 | `freehandsss_dashboardV40.html`（V40.7）|
| n8n Workflow | V45.7.4（24 nodes）|
| Airtable Base | `app9GuLsW9frN4xaT` |
| Airtable 新欄位 | Order_Items +3 formula / Main_Orders +3 rollup（2026-05-03）|
