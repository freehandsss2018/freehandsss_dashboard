# FHS Handoff - 2026-05-04
當前版本：v1.4.2（憲法層）/ V40.6（n8n Node 14）/ V40.7（UI層）/ 6 Agents + 2 Skills + Hook System v1.0.0

## 本次 Session 完成事項（2026-05-04）

✅ **n8n Node 14 → V40.6（跨部位運費扣減）**
- 加入 `keychainItemCount` 訂單層計算邏輯
- 規則：`(鎖匙扣 Order_Items 件數 − 1) × $20`
- 規則記錄於 `docs/FHS_Product_Bible_V3.7.md` §2.5

✅ **11 筆 Airtable Main_Orders 歷史記錄修正**
- Total_Cost & Net_Profit 各別更正，合計修正 −$260
- 受影響訂單：Akira(−$60)、SalinaLai/Amen/WingLee/Ivy/KaLeiChan/Gaeac/Kathleen/Angel/PrinceCheng/Kathy（各 −$20）

✅ **n8n-mcp-server PUT sanitization 修正**
- `n8n-client.js` `updateNodeCode()` 現改為最小化 PUT body，修正 HTTP 400 錯誤

✅ **文件同步**
- `Triple_Sync_Field_Map.md`：Shipping_Deduction 說明 + Node 14 Total_Cost 公式更新
- `decisions.md`：新增 [2026-05-04] 條目
- `todo.md`：n8n 安全網任務標記完成

✅ **FatMo 人手核對清單生成**
- 檔案：`.fhs/notes/2026-05-04_cost_audit_keychain_shipping.md`

## 上次 Session 完成事項（2026-05-03）

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

3. **[P-MED] n8n-mcp-server 重啟**
   - n8n-client.js PUT sanitization 已修正，但 MCP server 進程需重啟才能載入新程式碼
   - 重啟後 `update_node_code` MCP tool 可正常使用，無需繞道 bash script

4. **[PENDING] Fat Mo 人手核對**
   - 核對清單：`.fhs/notes/2026-05-04_cost_audit_keychain_shipping.md`
   - 重點：確認 0600721 Akira 是否確為 4 件鎖匙扣（扣 $60）

5. **[PENDING] preview_product_distinction_v40.html**
   - 未追蹤檔案，確認是否納入 git 或加入 .gitignore

6. **🟡 Legacy Scripts 文件化決策**（4 個腳本未在 scripts/README.md 記錄）

7. **iPhone 實機測試** — V40 財務模式

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.2 |
| 稼動生產版 | `Freehandsss_dashboard_current.html` |
| 主要開發版 | `freehandsss_dashboardV40.html`（V40.7）|
| n8n Workflow | V45.7.4（24 nodes）|
| Airtable Base | `app9GuLsW9frN4xaT` |
| Airtable 新欄位 | Order_Items +3 formula / Main_Orders +3 rollup（2026-05-03）|
