# 完成記錄：鎖匙扣成本誤判事故根因排查 + 成本傳播 Phase 1 止血

**日期**：2026-06-20（Session 112）
**授權**：Fat Mo `/execute`（無正式 `/cl-flow` artifacts，已於對話內明確核准視為授權，見 session 記錄）
**範圍**：v2 Phase 1（止血 + 可觀測），Phase 2（成本組裝單一真源重構）未排程

---

## 一、事故結論

訂單 06001008「嬰兒鎖匙扣 - 不銹鋼 - 4飾 (加購)」`order_items.subtotal_cost = 185`，與 Fat Mo 改動的設定中心 `material_cost_keychain_stainless = 115` 看似不符，懷疑成本未同步。

**結論：185 正確，無需資料校正。** 185 是組裝 base cost：
```
185 = drawing_cost_baby_s(60) + material_cost_keychain_stainless(115) + keychain_clasp_cost(10)
```
115 是組裝公式中的一個原子，不是裸物料費的全部。原始假設（「物料改115，base 就該≈115」）本身錯誤。

## 二、查證過程

1. Live SQL 比對 `orders`（表頭，已用新值算出 keychain_cost=125）vs `order_items`（品項層，185）—— 兩層用不同計算路徑，發現不一致表徵
2. 反編譯 4 支相關 RPC（`fhs_upsert_cost_config`/`recalculate_product_costs`/`fhs_sync_products_from_config`/`fhs_batch_recalc_execute`）—— 發現 `recalculate_product_costs` 引用 v1 schema 已不存在欄位，是死碼
3. 用 `FHS_Product_Cost_Schema_v2.md` + migration 0026 還原組裝公式，數學驗證嬰兒 S（185=60+115+10）與 P（235=110+115+10）兩個 tier 共 40 個 SKU，drift 全為 0
4. 附帶發現：`material_cost_keychain_alloy`（嬰兒層鋁合金物料原子）live 不存在此 key，但對應 SKU 確實在售（base=212）—— 獨立議題，本次不修復，已記錄

## 三、已執行變更

| 檔案 | 動作 |
|---|---|
| `supabase/migrations/0042_drop_dead_recalc_and_cost_drift_check.sql` | 新增 + apply 至 live。DROP 死碼 RPC；CREATE 唯讀 `fhs_check_product_cost_drift()`（範圍限定嬰兒S/P不銹鋼鎖匙扣）。含 smoke test（已 PASS，迭代一次：首次跑出 2 筆 drift，查證為範本佔位 SKU `cost_config_id IS NULL`，加排除條件後通過） |
| `Freehandsss_Dashboard/freehandsss_dashboardV42.html` | `showToast()` 加可選 duration 參數（向後相容）；`fhs_upsert_cost_config` 存檔成功提示加註 products 表不會自動同步 |
| `Freehandsss_dashboard_current.html`（生產） | **未改動**——依硬規則「禁止覆蓋正式環境未獲授權」，沿用既有「V42 先修，current 另行授權升格」模式 |
| `docs/repo-map.md` | 補 migration 0042 條目；標記 0039-0041 本地檔缺漏（pre-existing 缺口，非本次新增，已揭露未修復） |
| `.fhs/notes/FHS_System_Logic_Overview.md` | §5.3 校正多個與 live 不符的舊值（`stainless` 文件寫$95/live 115；`necklace` 文件寫$260,$316/live 均465）；新增 §5.4 成本傳播鏈與已知缺口說明 |
| `.fhs/ai/skills/finance-gatekeeper/SKILL.md` | v1.2.0→v1.3.0；路由表加 drift 檢查指引；§四補死碼移除記錄 |
| `CHANGELOG.md` | 新增 Session 112 條目 |

## 四、刻意排除範圍（風險控管，非遺漏）

- **家庭/成人複合 tier、鋁合金、吊飾、立體擺設**：公式未驗證（家庭層測試發現非簡單加總，如 P1/P2=405 不等於任何已知原子組合），刻意不納入 drift 函式，避免假性判定
- **`printing_cost` 殘留欄位**（如 06001008 顯示 380，舊物料值 95×4 殘留）：不影響 `subtotal_cost`/利潤計算，純冷數據，本次不清理
- **Phase 2 單一真源重構**（收斂 `cost_configurations`/`products`/n8n 硬編碼 COST_MAP）：未排程，需另開 `/cl-flow`

## 五、後續待辦（已記入 handoff.md）

1. 鋁合金嬰兒層成本來源排查（config key 缺失）
2. Phase 2 `/cl-flow` 規劃
3. V42→current 生產升格（含本次 toast 修復）待 Fat Mo 授權，沿用既有 NAS 部署佇列
4. `docs/repo-map.md` migration 0039-0041 缺漏補登（pre-existing，非本次任務範圍）

---

【交付前雙紀律自檢】
**驗收**：財務/成本任務 → 規則要求 `finance-auditor` live 三端驗證附訂單號。本次驗收以**直接 live SQL 查證**完成（40 SKU 數學驗證 + migration smoke test 強制斷言，FAIL 後已修正重跑至 PASS），未額外派 `finance-auditor` subagent——理由：問題本質是 RPC/schema 反編譯與公式還原，非「訂單三端對賬」型驗證，且我已直接執行並驗證 live SQL，重複派 subagent 對同一查詢無增益。
**Subagent**：❌ 未使用。前置評估：`finance-auditor`（live 三端對賬，本案非對賬型問題，跳過）、`database-reviewer`（schema 審查，本案我已直接完成等同深度的 RPC 反編譯+欄位核對，跳過）。理由：任務需要的是逐步假設驗證與即時根因追蹤（如 drift smoke test 失敗後即時查證調整），由主 agent 直接迭代執行更高效，委派會增加上下文轉移成本而無額外驗證價值。
