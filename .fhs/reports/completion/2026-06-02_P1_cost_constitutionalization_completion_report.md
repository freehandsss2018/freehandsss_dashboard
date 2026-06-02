# P1 成本邏輯憲法化 — 完成記錄

**完成日期**：2026-06-02（Session 53）
**Flow ID**：2026-06-02-0713
**Verdict**：CONDITIONAL_READY → /execute 授權，v2 修正版執行完畢
**狀態**：⏳ 部分完成（待 Fat Mo：migration 部署 + Live 驗證）

---

## 已完成項目

### Phase 1 — Supabase migration 0025
| 項目 | 狀態 |
|------|------|
| 新增 `necklace_chain_cost` = 100 | ✅ |
| 新增 `charm_shipping_deduction_per_extra` = 35 | ✅ |
| 新增 `mixed_member_surcharge` = 300 | ✅ |
| 修正 `keychain_shipping_deduction_per_extra` description（行數→件數語義） | ✅ |
| 4 個 smoke test DO $$ block | ✅ |
| database-reviewer Gate | ✅ PASS |

**尚需 Fat Mo**：在 Supabase SQL Editor 執行 `0025_cost_atoms_seed.sql`

### Phase 2 — 前端競態防護（W5）
| 項目 | 狀態 |
|------|------|
| `loadCostConfigurations()` 加 `_fhsCostReady = false/true` | ✅ |
| `calculatePricing()` 入口 W5 guard（未載入時 return + 提示）| ✅ |
| `const _cc`, `chargedPositions` 宣告 | ✅ |

### Phase 3 — 成本引擎重構
| 項目 | 狀態 |
|------|------|
| 畫圖費 hardcode 240/110/110/60 → `_cc.drawing_cost_*`（fallback 保留） | ✅ |
| W1 chargedPositions：同部位跨產品免畫圖，PartDesc `.trim().toLowerCase()` 正規化 | ✅ |
| accessories `else if (!item.isAccessory)` 修正（原本意外計入畫圖費）| ✅ |
| `mixed_member_surcharge` $300 de-hardcode → `_cc.mixed_member_surcharge` | ✅ |
| 頸鏈成本：`Math.ceil(N/2) × necklace_chain_cost` | ✅ |
| 多件運費扣減：鎖匙扣 `(N-1)×20`、吊飾 `(N-1)×35`，全讀 config | ✅ |
| G8 負數防守：`Math.max(0, ...)` | ✅ |
| Shadow kill-switch `window.USE_LEGACY_COST_LOGIC` + `console.warn` | ✅ |
| code-reviewer Gate（G1–G8 全 PASS） | ✅ PASS |

### Phase 4 — n8n V47.14（已部署）
| 項目 | 狀態 |
|------|------|
| P0 bug 修正：`keychainItemCount++` → `+= Original_Qty` | ✅ LIVE |
| 備份路徑已記錄 | ✅ |
| **DEFERRED**：n8n 信任前端完整成本（待物料成本填入 config 後）| ⏸ |

### Phase 5 — Shadow 並跑
| 項目 | 狀態 |
|------|------|
| Kill-switch 內建於 Phase 3 | ✅ |
| Shadow 門檻（≤1元≥99%、>5元≤0.5%）設定於 cl-final-plan.md | ✅ 文件 |

### Phase 6 — 文件同步
| 項目 | 狀態 |
|------|------|
| `FHS_Product_Cost_Schema_v2.md`：17 → 20 keys | ✅ |
| `docs/repo-map.md`：新增 0025 條目 | ✅ |
| `Changelog.md`：P1 Session 53 條目 | ✅ |

---

## 尚待 Fat Mo 執行

| 優先序 | 行動 | 說明 |
|------|------|------|
| 1 | **部署 migration 0025** | Supabase SQL Editor 貼上並執行；確認 RAISE NOTICE 出現 |
| 2 | **Live 驗證 V1** | Slow-3G 重整後立即計算 → 應顯示「⏳ 成本設定載入中」 |
| 3 | **Live 驗證 V2** | 金屬全身 + 純銀全身同部位 → 畫圖只收一次 |
| 4 | **Live 驗證 V3** | 測例 #0600007 鎖匙扣 → System_Total_Cost = $455（含頸鏈/運費組件） |
| 5 | **Live 驗證 V4** | 吊飾 N 件 → 頸鏈 ceil(N/2)×$100 + 運費 (N-1)×$35 正確 |
| 6 | **Live 驗證 V7** | console 無 cost hardcode 殘留（瀏覽器 F12 確認） |
| 7 | **Shadow 觀察** | console.warn [FHS Cost Shadow] 觀察新舊差值是否合理 |
| 8 | **授權 current.html 同步** | V1–V7 全通過後輸入 `/execute V41 → current 同步` |

---

## 遺留 DEFERRED 項目

| 項目 | 說明 | 解封條件 |
|------|------|---------|
| 物料/打印成本接線 | `material_cost_keychain_stainless/alloy`、`material_cost_necklace_*` 仍為 0 | Fat Mo 確認實際物料成本後填入 config，引擎自動反映 |
| n8n 完全信任前端成本 | 目前 n8n 仍從 `products.total_base_cost` 算 | 前端 System_Total_Cost 完整（含物料）後再切換 |
| Phase 4 payload 四分量 | 頸鏈/運費未作為獨立 payload 欄位傳 n8n | 延至物料成本完整後一并實作 |
| 吊飾運費 n8n 修正 | n8n 的吊飾運費邏輯未對應 P0 更新 | 延至 Phase 4 完整實作時處理 |

---

## 架構決策記錄

1. **前端唯一成本權威**：`calculatePricing()` 同時計算售價與成本，共用 composition 迴圈，不可能 drift。
2. **cost_configurations 為原子源**：零 hardcode，任何成本改動只需更新 Supabase，無需改碼。
3. **total_base_cost 降級**：products.total_base_cost 保留為歷史快照/fallback，非主要成本源。
4. **chargedPositions**：W1 跨陣列（metal/silver/family）同部位免畫圖，實作為 Set，PartDesc 正規化。
5. **Shadow kill-switch**：`window.USE_LEGACY_COST_LOGIC` 為過渡期降級開關，生產部署前移除。

**Subagent 使用記錄**：
| 項目 | 內容 |
|------|------|
| Router 建議 | database-reviewer、finance-auditor、code-reviewer |
| 實際使用 | ✅ database-reviewer（Phase 1 Gate PASS）；✅ code-reviewer（Phase 6 Gate G1–G8 PASS，含 G8 修正後重稽核）；❌ finance-auditor（Live 驗證需 Fat Mo 在瀏覽器執行，subagent 無法替代）|
| 遵從 Router | ✅ database-reviewer / code-reviewer 均按計畫觸發；finance-auditor 延至 Fat Mo Live 驗證後 |
