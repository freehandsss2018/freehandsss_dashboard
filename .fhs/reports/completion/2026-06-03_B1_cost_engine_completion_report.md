# B1 成本引擎補完 — 完成記錄

**完成日期**：2026-06-03（Session 54）
**Flow ID**：2026-06-03-0944
**Verdict**：CONDITIONAL_READY → /execute 授權，v2 + Phase 0 查證完成後執行
**狀態**：✅ B1 執行完成（待 Fat Mo：migration 部署 + Live 驗證）

---

## 已完成項目

### Phase 0 — payload 流向前置查證
| 項目 | 結果 |
|------|------|
| `System_Total_Cost` 是否進 payload | ✅ 是（line 6277）|
| n8n 是否讀 `System_Total_Cost` | ❌ **否** — n8n 讀 per-item `Total_Base_Cost`（Supabase products）|
| B1 模式裁定 | **純顯示層，零回寫風險，無需隔離旗標** |

### Phase 1 — migration `0026_b1_cost_atoms_complete.sql`
| 項目 | 狀態 |
|------|------|
| UPDATE `material_cost_necklace_silver` 0→260 | ✅ |
| UPDATE `material_cost_necklace_gold` 0→316 | ✅ |
| INSERT `material_cost_keychain_stainless_adult`=135 | ✅ |
| INSERT `material_cost_keychain_alloy_adult`=135 | ✅ |
| INSERT `keychain_clasp_cost`=10 | ✅ |
| UPDATE stainless/alloy display_name 補（嬰兒）| ✅ |
| 每 PART DO $$ smoke test（含 W2 alloy 補充）| ✅ |
| database-reviewer Gate | ✅ PASS |

**尚需 Fat Mo**：在 Supabase SQL Editor 執行 `0026_b1_cost_atoms_complete.sql`

### Phase 2 — calculatePricing() 引擎補完（V41 HTML）
| 項目 | 狀態 |
|------|------|
| 初始化 3 個新成本累計器（`_totalPrintingCost` / `_totalBaseShipping` / `_totalKeychainClaspCost`）| ✅ |
| items.forEach 內 per-item 打印費計算（吊飾金/銀 flat；鎖匙扣對象×材質路由）| ✅ |
| items.forEach 內 per-item 基礎運費（複用 deduction key 單價）| ✅ |
| items.forEach 內 per-item 環扣（鎖匙扣 $10）| ✅ |
| processTierPricing 累計（鎖匙扣）| ✅ |
| silverItems.forEach 累計（吊飾）| ✅ |
| 成本公式更新（Drawing+Printing+NecklaceChain+KeychainClasp+BaseShipping−ShippingDeduction）| ✅ |
| Shadow log 增強（含各分量明細）| ✅ |
| B1 過渡標示（uiDetails）| ✅ |
| code-reviewer Gate G1–G8 | ✅ PASS |

### Phase 3 — 文件同步
| 項目 | 狀態 |
|------|------|
| `FHS_Product_Cost_Schema_v2.md` v2.1.0→v2.2.0（21→23 keys，修正 clasp_cost 文件錯誤）| ✅ |
| `docs/repo-map.md` 新增 0026 條目 | ✅ |
| `CHANGELOG.md` B1 Session 54 條目 | ✅ |
| `decisions.md` B1 架構決策 + 生效日記錄 | ✅ |

---

## 尚待 Fat Mo 執行

| 優先序 | 行動 | 說明 |
|------|------|------|
| 1 | **部署 migration 0025**（若未部署）| 先確認 necklace_chain_cost / charm_shipping 等已在 Supabase |
| 2 | **部署 migration 0026** | Supabase SQL Editor 貼上並執行；確認 RAISE NOTICE 全 PASS |
| 3 | **Live 驗證 V1** | 嬰兒鎖匙扣不銹鋼 3 件 → System_Total_Cost = **$455** |
| 4 | **Live 驗證 V2** | 同部位 4 件吊飾 925銀 → System_Total_Cost = **$1,335** |
| 5 | **Live 驗證 V3** | 成人鎖匙扣不銹鋼 1 件 → Drawing(成人)+135+10+20 |
| 6 | **Live 驗證 V4** | 925金吊飾 1 件 → Drawing+316+100+35 |
| 7 | **Live 驗證 V5** | Slow-3G 重整即算 → ⏳ 載入中（W5 guard）|
| 8 | **Live 驗證 V6** | console.warn 顯示新舊差值合理（shadow）|
| 9 | **Live 驗證 V7** | F12 console 無 hardcode 殘留 |
| 10 | **Live 驗證 V8** | finance-auditor 驗前端內部 = Finance Bible（不要求三端一致，三端 deferred B2）|
| 11 | **授權 current.html 同步** | V1–V8 全通過後輸入 `/execute V41 → current 同步` |

---

## DEFERRED → B2

| 項目 | 說明 |
|------|------|
| n8n 信任前端完整成本 | n8n 仍從 products.total_base_cost 算；B2 啟動 |
| 四分量 payload（頸鏈/打印/環扣/運費）傳 n8n | B2 |
| n8n 吊飾運費 P0 對齊 | B2 |
| material→printing 語義命名重構 | PRM v2 P2 |

---

## Gate 記錄

| Gate | 工具 | 結果 |
|------|------|------|
| Phase 1 migration | database-reviewer | ✅ PASS（W2 alloy smoke test 已補）|
| Phase 2 引擎 | code-reviewer | ✅ G1–G8 全 PASS（W1 innerHTML XSS 為既有問題，非 B1 引入）|

---

## Subagent 使用記錄
| 項目 | 內容 |
|------|------|
| Router 建議 | `database-reviewer` |
| 實際使用 | ✅ `database-reviewer`（migration 0026 Gate）；✅ `code-reviewer`（G1–G8 Gate）；✅ `finance-auditor`（Airtable live 查，Phase 0 前序）；✅ n8n MCP `get_node`（Phase 0 payload 查證）|
| 遵從 Router | ✅ database-reviewer 按計畫啟動；code-reviewer 為 Verdict 規定的強制 Gate |
