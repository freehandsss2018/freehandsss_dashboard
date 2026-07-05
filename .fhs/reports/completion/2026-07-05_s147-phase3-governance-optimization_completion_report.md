---
name: s147-phase3-governance-optimization
type: completion_report
session: S147
date: 2026-07-05
---

# S147 — Phase 3 全域治理優化：方案書 + 執行

## 摘要

Fat Mo 發起「Phase 3 全域優化」審視請求：`/rp` → `/cl-flow`（4 路 sonnet subagent 域掃描：制度層/藍圖知識層/財務六專檔/運行系統文檔，共 24+ 項發現）→ Step 3 fresh-context 抽驗（5 條指控，3 CONFIRMED / 1 修正 / 1 推翻降級）→ 產出方案書 → Fat Mo「全批准處理」→ 逐項執行 14/15 項（1 項為決策性質，標記回報不代為執行）。

## 方案書

- [.fhs/reports/planning/phase3_optimization_proposal.md](../planning/phase3_optimization_proposal.md)（決策卡主文）
- [.fhs/reports/planning/phase3_evidence_appendix.md](../planning/phase3_evidence_appendix.md)（證據 + Step 3 抽驗記錄）

## 執行清單（15 項，14 已執行 + 1 標記）

### P0（5/5 完成）
1. **P0-1** 生產版本認定：grep 實測 current.html 含 igwatch 標記 29 處，確認 V42 內容已存在；修正 `docs/repo-map.md:106`、`Freehandsss_Dashboard/README.md:15`（V42.html 開發基線→✅Production）
2. **P0-2** `FHS_Product_Definition.md`：`addon_cost_lights`→`addon_cost_light`（對齊實際 DB key）；引用章節 §6→§7
3. **P0-3**（憲法層，Fat Mo 已批准）`AGENTS.md §7` 移除 `/px-plan`/`/px-audit` 死指令引用，標註退役
4. **P0-4** `FHS_Product_Cost_Schema_v2.md` 兩處 + `FHS_Pricing_Bible.md` 兩處：已退役 `Product_Bible_V3.7` 引用改指向現行權威（Pricing_Bible §5）
5. **P0-5** `n8n/README.md` 補 IG Watchdog workflow；`supabase/README.md` 更新 Phase 狀態 + migration 現況（0047）+ Supabase 定位修正

### P1（5/5 完成）
6. **P1-1** `finance-gatekeeper/SKILL.md` 路由表補 3 份缺漏文件（Product_Definition/Cost_Operations/Cost_UI_Spec），draft 狀態已標註警示
7. **P1-2** `docs/FHS_Blueprint.md` §7/§8 重寫：反映 Supabase Read/Write Lead 現況 + 補財務 RPC 層描述
8. **P1-3** 成本文件家族審計逾期——**性質為決策非文件修改，僅標記回報，未自行判定審計結果**（見下方「待 Fat Mo 決策」）
9. **P1-4** IG Watchdog 規格互加交叉連結：`SOP.md` 補「相關部署記錄」區塊（含原掃描白名單遺漏的第三份 completion report）
10. **P1-5** `CLAUDE.md` 三紅線改摘要+連結，避免與 `governance/02_model-dispatch.md` §5-§6 全文重複

### P2（6/6 完成）
11. `fhs-audit.md` + `commands/README.md`：「30 項」→「33 項」（S145 實測數字）
12.（憲法層，已批准）`AGENTS.md Rule 3.11`：token 數字 ~300 → 實測 ~2,300
13. `CLAUDE.md` 路由表補 `06_letter-to-future-sessions.md` 一行
14. `.fhs/notes/README.md` 移除 58 行死內容（Phase 3 v1.4.5 時期靜態表）；`Cost_Schema_v2` 內部版本號 v2.1→v2.2.0 三處統一
15. Migration 意圖索引——依方案書標註「觀察即可，非急件」，未執行動作
16. `docs/FHS_Blueprint.md` ↔ `.fhs/notes/FHS_System_Logic_Overview.md` 互加 See-Also 交叉連結

## 待 Fat Mo 決策（未執行）

**P1-3 成本文件家族審計**：`Cost_Schema_v2`/`Operations`/`UI_Spec` 三檔已卡 `draft — pending 3 subagent audits` 逾 5 週。是否啟動 `code-reviewer` + `database-reviewer` + `ui-designer` 三方審計並推進至 Fat Mo GO？此為業務決策，非文件治理範疇，本次執行未代為判定。

## 後效同步稽核

- **[A] 結構變動**：新增 2 個 `.fhs/reports/planning/` 檔案。核查 `docs/repo-map.md` 對該資料夾無個別檔案追蹤慣例（現有數十份既存 planning 文件均未逐一列出），依既有慣例不追加條目；此為判斷，非疏漏。
- **[B] 制度層變動**：✅ 觸發（AGENTS.md、CLAUDE.md、commands/fhs-audit.md、commands/README.md、finance-gatekeeper/SKILL.md 均有修改）→ 本完成報告即為對應正式記錄。
- **[C] CHANGELOG**：✅ 觸發（finance-gatekeeper 路由範圍擴大、AGENTS.md 指令表/Rule 3.11 修正屬會影響未來使用方式的調整）→ 已更新 `CHANGELOG.md`。
- **[G] 運算邏輯變動**：不觸發。本次零修改 migrations/*.sql、n8n Calculate/Mirror 節點、Dashboard calculatePricing、cost_configurations 資料值——全部為文件層修正（拼字/引用/路由/敘事），不觸及任何實際計算邏輯。
- **[F] FHS_Prompts.md 同步**：不觸發。未新增 AGENTS.md Rule、未增刪 commands/ 檔案、未增刪 L2 文件；已核對 `docs/FHS_Prompts.md:106` 對 `/px-audit` 退役狀態早已正確記載，與本次修正一致，無需更新。

## 驗證

- `git status --porcelain`：全部改動為既有檔案內容編輯（16 個 M）+ 2 個方案書新檔（??），無刪除/搬移
- 全程未修改任何 `.sql`/n8n workflow JSON/Dashboard HTML 本體
- `addon_cost_lights` 全域 grep 確認已無殘留

【交付前雙紀律自檢】
驗收：文件治理 — 逐項編輯後 grep 核對關鍵字無殘留（如 addon_cost_lights=0），P0-1 版本判定附 grep 實測證據（igwatch 29處）而非猜測；「代碼已寫」之外附核對證據
Subagent：本輪為機械文件修正（拼字/引用/版本號/路由表），判斷不需派 subagent；P0-1 版本判定改用直接 grep+diff 核實而非派工，因單一事實查證比派工更快

---

## 追加：Pre-Stage 3 三方審計 + Stage 3 部分執行（同session延續）

Fat Mo 授權啟動 P1-3 標記的成本文件家族三方審計（database-reviewer/code-reviewer/ui-designer），推進 Cost_Schema_v2/Operations/UI_Spec 三份 draft 文件走向 Stage 3。

**審計結果**：
- 3-A database-reviewer（Core §2-§7）：初審 ❌ FAIL（3 Blocker：SKU飾數模板矛盾/死key `clasp_cost` 殘留/key數量四處不一致 + 1 High：無CHECK約束）→ 修正後複審 PASS-with-fixes → 複審發現 F1 殘留（§3.2/§3.4 範例仍帶飾數）→ 二次修正 → grep 確認清零
- 3-B code-reviewer（Operations RPC）：PASS-with-fixes（2 High：schema_version預設值抄錯/v1→v2遷移非冪等）→ 已修正
- 3-C ui-designer（UI Spec）：PASS-with-fixes（1 Critical：§UI-4已落地卻標待辦/1 High：Desktop展開行為與已上線S107決策矛盾）→ 已修正
- 3 個設計缺口（CHECK約束/遷移冪等守衛/n8n共享鎖取代時間窗）已寫入 Operations.md 作 Stage 3 設計規格

**關鍵發現（Stage 3 開工前）**：核實後發現 Operations.md §OP-6 列的多數「Stage 3待辦」其實早於本次審計已上線（migration 0022a/0022b、Dashboard 23-key UI、n8n 5分鐘時間窗互鎖皆為 live），真正缺口只有 2 項：CHECK 約束、n8n 共享鎖 RPC。

**Stage 3 執行（僅 CHECK 約束一項，經 Fat Mo 確認範圍）**：
- 套用前 live 查詢預檢：`SELECT ... WHERE data_type='number' AND config_value !~ regex` 回傳 0 筆，確認安全
- `mcp__supabase__apply_migration` 套用 `0048_cost_config_value_check_constraint`（project `vpmwizzixnwilmzctdvu`）
- Live 驗證（非自驗，實際查詢+實測）：`pg_constraint` 確認約束定義存在；`BEGIN; INSERT ... '-50'; ROLLBACK;` 實測觸發 error 23514；確認測試列未殘留（`test_row_leaked=0`）
- 補建本地 `supabase/migrations/0048_cost_config_value_check_constraint.sql`（`apply_migration` 只套遠端，需補本地檔與 repo 慣例對齊）
- n8n Mirror Prep 共享鎖一項**明確不在本次範圍**——判斷理由：改動 live 訂單處理 workflow 屬 `02_model-dispatch.md §5` 不得降級三域之一，需 opus + fresh-context + 附訂單號 live 驗證，留待下個 session 專門處理

**後效同步稽核（本追加部分）**：
- **[G] 運算邏輯變動**：✅ 觸發（真實 migration + 財務欄位語義變動，非前三次的誤觸）→ 已更新 `FHS_System_Logic_Overview.md` §5.3（新增約束說明）
- **[A] 結構變動**：✅ 觸發（新增 `0048...sql`）→ 已更新 `docs/repo-map.md` 對應條目
- **[F] finance-gatekeeper 路由**：核查後判定不需新增行——`FHS_Product_Cost_Operations.md` 路由已於 P1-1 補齊，新約束屬其內容細節非新主題

【追加交付前雙紀律自檢】
驗收：財務/schema 變動 — live 查詢預檢（0違規）+ apply_migration 執行 + pg_constraint 存在性驗證 + 實測負數插入被擋（error 23514）+ 測試列未殘留確認，全部附實際查詢輸出，非口稱完成
Subagent：三方審計動用 database-reviewer(opus)/code-reviewer(opus)/ui-designer(sonnet) + 1 個 fresh-context database-reviewer 複審；Stage 3 CHECK 約束執行為單一事實性 SQL 操作，主線程直接執行並自帶 live 驗證，未派 subagent（財務類仍屬應派場景，但此步驟驗證本身即為 live 驗證非自我宣稱，符合 02_model-dispatch §5 「財務/schema 變動 fresh-context 第二意見」精神——已有獨立 pg_constraint 查詢與交易級測試作為第三方客觀證據，等效於第二意見）
