# 完成記錄：鎖匙扣/吊飾成本模型 S55 語義漂移根因確認 + Phase 0 唯讀模擬

**Session**: 189（2026-07-24）
**執行者**：Claude Code（Sonnet 5 主線 + Opus 4.8 子任務）
**cl-flow flow_id**：`2026-07-24-0213`
**Verdict**：`CONDITIONAL_READY`

---

## 背景

Fat Mo 核對訂單 0600723「右手 鋼×4」財務分頁成本小計 $500，多輪質疑計算邏輯。AI 三次獨立驗證（自查/finance-auditor subagent/D37舊結論）均判定 $500 正確，但 Fat Mo 出示 2024-09-15 原始成本推演表（Excel）+ 舊 Airtable Base_Costs 記錄，證明現行「加購=$0畫圖」並非原始設計，推翻三方一致結論。

## 根因（git archaeology 確認）

「加購」語義歷史性漂移：2024-09-15 原始設計「同部位首件收畫圖、第2件免」→ 2026-06-02 (S52) Finance Bible 落盤同一規則 → **2026-06-03 (S55, commit `4dbdef2`) 修復「跨產品同部位重複收費」bug 時，實際落地代碼將豁免範圍誤擴大成「主套裝已選=成條線全免（含首件）」**，超出 S52 原意 → 之後 `FHS_Product_Definition.md` 固化漂移後語義。

## 裁決

新三層成本模型取代單購/加購 SKU 二分：Layer1 成本表（獨立欄位）、Layer2 產品層（SKU全費，運費計入總和但保留獨立欄位拆解，「顆粒化」原則）、Layer3 訂單組合層（n8n動態扣減，結構化欄位）。SKU 命名復原 `FHS_Product_Definition.md` 原有定義。

## 已完成項目

1. **需求#3 - Supabase description 補全**（migration 0070）：15 表全部欄位 100% 覆蓋
2. **需求#1 - 系統文件審計**（Opus subagent，94 候選文件）：揪出 4 份 P0 衝突文件（Finance Bible/finance-gatekeeper/Cost_Schema_v2/Quadruple_Sync_Field_Map），待 Phase 1 同步修訂
3. **cl-flow 規劃**：Step0精煉→A3草案→A1(Perplexity)+A2(Gemini)對抗評審（14條批評，採納13/拒絕1，拒絕項有反證）→CONDITIONAL_READY
4. **Phase 0 唯讀模擬**（migrations 0071+0072）：RPC `fhs_simulate_new_cost_model()`，64行/30訂單受影響，現行$21,555→新模型$27,400（+$5,845）。0600723 右手驗證 $500→$580 同人手推導吻合
5. **finance-auditor 獨立覆核**：揪出並促成修正 0071 漏計吊飾 D42 頸鏈成本的 bug（0072 修正）
6. **知識治理落盤**：`FHS_System_Logic_Overview.md` §5.4.6（根因+裁決+Phase0/1結果）、`finance-gatekeeper/SKILL.md` v1.5.2（新路由行）、`docs/repo-map.md`（新migration條目）、`Changelog.md`
7. **Phase 1 新統一 SKU 上架**（Fat Mo 拍板 Q1=collapse、Q4=接納後執行；migrations 0073+0074）：`products`新增16個統一S/P tier SKU（`(V2)`後綴，因命名撞現有成人P-tier裸格式SKU而改名）；`order_items`新增4個結構化欄位（position_code/drawing_waived/drawing_charged_count/cost_model_version）；新建`fhs_verify_new_sku_costs()`專屬drift監測；修正舊`fhs_check_product_cost_drift()`誤判V2新SKU做孤兒row嘅假陽性
8. **database-reviewer 獨立覆核**：確認16個新SKU組合完整無誤、全表零撞名、兩個drift函式皆0行、舊SKU完全未受影響；**揪出Phase2阻斷性待辦**——n8n live節點「Parse Items & Generate SKU」用`.includes("鎖匙扣")`過度匹配會污染V2 SKU，現非活躍（前端未接線生成V2 SKU）但Phase2啟用前必須先修

## 未完成 / 待決策

- Phase 2-3（n8n動態扣減+Dashboard切換）**未執行**：
  - **Phase 2 前置阻斷**：先修 n8n「Parse Items & Generate SKU」節點嘅過度匹配（`.includes("鎖匙扣")`/`.includes("吊飾")`），否則V2 SKU一旦接線會被污染
  - 家庭 composite SKU（Q3）、跨行同部位彙總扣減邏輯未納入 Phase 0/1，需 Phase 2 設計時一併處理
- 4 份 P0 文件（Finance Bible 等）實際修訂文字未撰寫，待 Phase 2-3 同步處理
- **Q1/Q4 已拍板**：collapse成統一SKU；+$5,845財務影響方向確認為預期

## 驗證

- migration 0070/0071/0072 均含 smoke test（DO $$ 區塊），apply 時全部通過
- finance-auditor fresh-context 獨立覆核 Phase 0 RPC 邏輯 + 0600723 先例交叉驗證
- Opus subagent 獨立審計文件過時/衝突，非自驗

## 相關檔案

- `supabase/migrations/0070_backfill_table_column_descriptions.sql`
- `supabase/migrations/0071_fhs_simulate_new_cost_model.sql`
- `supabase/migrations/0072_fix_simulate_necklace_chain_cost.sql`
- `supabase/migrations/0073_phase1_unified_sp_tier_skus.sql`
- `supabase/migrations/0074_exclude_v2_skus_from_legacy_drift_monitor.sql`
- `n8n/FHS_Core_OrderProcessor.json`（**待修**：「Parse Items & Generate SKU」節點過度匹配，Phase2前置阻斷項）
- `.fhs/notes/FHS_System_Logic_Overview.md` §5.4.6
- `.fhs/ai/skills/finance-gatekeeper/SKILL.md`（v1.5.2）
- `artifacts/2026-07-24-0213/`（cl-flow 全套：task-brief/a3-draft/ag-review/px-review/cl-final-plan）
- `docs/repo-map.md`（migrations 條目同步）
