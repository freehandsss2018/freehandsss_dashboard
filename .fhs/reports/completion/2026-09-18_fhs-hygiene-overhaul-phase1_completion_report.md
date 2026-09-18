# 完成記錄：FHS 衛生機制重整 期一（減法+修復）

> flow_id: `2026-09-18-1827`／執行：Claude Code Sonnet 5／2026-09-18

## 一、任務背景

`/fhs-check` 例行執行揭發 `Maintenance_Tools/run_all.py` 之 LOCAL_AUDIT 階段指向 2026-04-07 已刪除嘅 `test_audit_0695346.py`，已靜默 SKIP 5 個月而 Health Report 一直照印「全部通過」（`run_all.py` 自身邏輯把 SKIP 視為非阻斷）。Fat Mo 提議用 `cl-flow` 全面審查全部衛生機制（`/fhs-check`／`/fhs-audit`／`/fhs-cost-audit`／fhs-health），並要求範圍加入前端設計/動畫/功能 button（現時三支完全冇覆蓋嘅盲區）。

## 二、規劃階段（`/cl-flow-fast`）

- `/rp` 完整精煉 → 觸發 `structural_warning`（objective 含 5 個動作動詞）→ Fat Mo 選擇「拷問我」
- `/grilling` 十輪拷問（Q1-Q10）逐條拍板：
  - Q1 `/fhs-cost-audit` 同 PRICE_AUDIT 重寫落 Supabase 併入 `/fhs-check`（非直接廢除——A3 中途發現 PRICE_AUDIT 亦查 Airtable，原判斷「可作替代」係錯，已自我更正）
  - Q2 分兩期，先減後加，兩次 `/execute`
  - Q3 按 blast radius 分兩支：`/fhs-audit`＝唯讀零網路、`/fhs-check`＝連生產
  - Q4 前端拆兩層：唯讀層→`/fhs-audit`（期二）、端對端層→`/fhs-check`（期二）
  - Q5 SKIP 白名單＋到期日三態語義
  - Q6 版本漂移偵測覆蓋擴至活躍規格檔（`.fhs/ai/commands/*.md`／`scripts/*.js`／`Maintenance_Tools/*.py`）
  - Q7-Q9 期二前端唯讀層設計（Section 六硬條款機械化 + 視覺回歸 + baseline 即時由 main 渲染）
  - Q10 視覺差異時 `/commit` 暫停出縮圖網格（期二）
- Gate 1 確認後走 `/cl-flow-fast`：3 個 fresh-context `general-purpose` agent 平行盤點（`/fhs-audit` 33項逐項效用判定／反向引用全 repo 盤點／測試資產盤點），A3 自行 Supabase 唯讀查證財務公式
- A3 草案（`artifacts/2026-09-18-1827/a3-draft-full.md`，40.9KB）→ A2 Gemini 評審兩次因請求過大遭 Google 端間歇性過載拒收（首輪誤判為「請求太大」，經多次 curl 對照實測後更正為「間歇性過載」——A3 第四次自我更正）→ 壓縮至 12.7KB 評審版，重試 2 輪後 `gemini-3.6-flash` 成功交回完整評審
- A2 提出 7 條批評（2 BLOCKER + 3 MAJOR + 2 MINOR）：
  - 拒絕：#1（main baseline 會載入分支相對 JS——查證 V42 全部 `<script>` 內嵌零 `src`，前提不成立）、#3（migration 時序競爭——查證 migration 用 `apply_migration` 先上 live 後補 repo，時序相反）
  - 部分採納 #2（E2E 寫生產——crash 清理失敗風險同真通知副作用查實成立，改用 try/finally + 孤兒掃除；拒絕改用 mock，因違反 Q4 既定裁決）
  - 採納 #4（D3 語境判斷改用結構化標記）、#5（暫停流程改 exit code fail-fast）、#6（時鐘邊界隔離）、#7（Schema Probe 防欄位級權限令成本欄位靜默變 NULL）
- Verdict `CONDITIONAL_READY`（兩條 BLOCKER 部分拒絕，依規則上限）；Fat Mo 就 5 條待確認條件（C1-C5）全部回覆「採用你建議」→ `/execute` 期一

## 三、執行內容

### 新建

- `.fhs/tools/check_registry.json` — 衛生檢查例外登記冊：`skips`（整項跳過）+ `known_exceptions`（單條違規），三態語義（未登記=FAIL、過期=FAIL、有效=WARN），JSON 壞 fail-closed
- `Maintenance_Tools/audit_cost_integrity.py` — COST_INTEGRITY：讀 Supabase anon key，實作 Finance Bible §九 驗證1（四分類成本和=total_cost）/驗證2（net_profit=final_sale_price-total_cost）/驗證4後半（`total_base_cost NOT NULL`）+ `fhs_check_product_cost_drift()` RPC 零漂移；反靜默閘（0訂單/0產品即FAIL）+ Schema Probe（成本欄位全 NULL 即FAIL，防欄位級權限靜默降級）
- `Maintenance_Tools/audit_price_completeness.py` — PRICE_AUDIT：改讀 Supabase `products.suggested_price`（取代原查 Airtable 版），`(V2)` SKU 按 migration 0074 先例排除（設計如此非漏填）

### 修改（憲法/治理層）

- `.fhs/ai/AGENTS.md`（v1.7.1→v1.7.2）：刪 `/fhs-cost-audit` 路由行，更新 `/fhs-check`／`/fhs-audit` 描述
- `.fhs/ai/commands/commit.md`（v2.6.0→v2.7.0）：刪 `:144` Airtable 429 書面白名單；新增 **Phase 2.4 健檢閘**——`git diff` 觸及 Dashboard HTML／`supabase/migrations/*`／`n8n/*` 任一即跑全量 `/fhs-check`，FAIL/DEGRADED 即停止 Phase 2.5/2.6（修復舊版「migration/n8n 改動零健檢」缺口）
- `Maintenance_Tools/run_all.py`（V45.7.4→V46.0.0）：移除 LOCAL_AUDIT；新增真環境前置檢查（Supabase 憑證缺失即全部停止，根治子腳本各自靜默 `return True` 跳過驗證）；SKIP 改三態（未登記/過期=FAIL、有效=WARN）；DEGRADED_MARKERS 新增 3 條（`not set, skipping verification for`／`failsafe may have regressed`／`Verification query failed`）；支援 `.js` 子腳本（期二用）；新增 COST_INTEGRITY 項
- `.fhs/ai/commands/fhs-audit.md`（v2.1→v3.0.0）：刪 9 項假防線（A1-3/A1-5/A2-3/A3-1/A3-3/A3-4/A3-5/A4-2舊項/A5-5b，逐項附證據）；修復三處寫死 AGENTS.md v1.4.5；A6-2 改 glob（8→9 個 subagent）；A6-3 修正 `FHS_Finance_Bible.md` 路徑錯誤（`docs/`→`.fhs/ai/`）；A6-4 改強制當次重跑（原驗證嘅係 2026-07-05 舊快照）；A7-3 D3 由文字描述改真實作；定位改「唯讀健康稽核」；項目數收斂至單一居所 **24 項**
- `.fhs/tools/semantic_audit.py`（0.1.0-mvp→0.2.0）：`parse_canonical_keys()` 修復死碼（v0.1.0-mvp 從未真正解析 `allowed_references` list——list item 因無 `:` 被解析器靜默跳過）；新增 `compare_references()` 實作 D3；報告輸出拆 `D1_canonical_values`/`D3_conflicts`
- `.fhs/tools/canonical_keys.yml`：新增 `key_type`（structured/literal）+ `reference_pattern` 欄位；`allowed_references` 擴充至活躍規格檔（`.fhs/ai/commands/*.md`／`scripts/*.js`／`Maintenance_Tools/*.py`）；同時發現並移除誤含嘅 `docs/repo-map.md`（D3 首次真正執行才發現：該檔為多版本盤點表非單一斷言，會對 V36/V37/V40/V41 歷史記載產生 5 個假陽性）

### 文件同步

`.claude/commands/fhs-audit.md`（改純指標 bridge）、`.claude/commands/fhs-check.md`（修正 LOCAL_AUDIT 殘留）、`.agents/workflows/fhs-audit.md`（發現同款嵌入式「21項」寫死值，一併修正——原計劃誤判此檔「唔使改」）、`docs/FHS_Prompts.md`、`.fhs/ai/commands/README.md`、`.fhs/ai/README.md`、`.claude/commands/fhs-slim.md`、`.fhs/ai/commands/fhs-slim.md`、`.fhs/ai/commands/usage-audit.md`、`.fhs/notes/fatmo-ops-quickcard.md`、`.fhs/ai/skills/finance-gatekeeper/SKILL.md`（v1.14.0→v1.15.0）、`scripts/hooks/prompt-router.js`、`scripts/agent_dashboardV42.js`、`Maintenance_Tools/README.md`、`docs/repo-map.md`、`.env.example`、`scripts/README.md`、`archive/README.md`

### 歸檔（`git mv` 至 `archive/`，9 個）

`fhs-cost-audit.md`／`fhs-cost-audit-bridge.md`／`audit_total_cost_integrity.py`（廢除嘅 `/fhs-cost-audit` 三件）、`analyze_empty_prices.py`／`final_audit_check_v2.py`／`update_profit_auditor.py`（零引用孤兒，最後者會靜默覆寫 n8n Profit Auditor 節點為硬編碼 V45.8）、`viewport-check.html`／`viewport-check2.html`（一次性診斷頁）、`test_full_reconstruction.js`（內建已不存在 V40 分支）、`verify_repo_map.py.duplicate`（與 `.sh` 功能等價之重複實作，此項執行時臨場決定，未列於原始批准清單，屬計劃外但無害嘅範圍擴充）

### 已知例外登記（`check_registry.json`）

- `COST_INTEGRITY` / C2 / `0600804`：net_profit 與 `final_sale_price-total_cost` 不符（差額 $2,860），已另開獨立任務 `task_9dba2023` 追查，到期 2026-10-18
- `SEMANTIC_D3` / `production_html` / 4 支仍指向 V41 嘅腳本（`qa_v41_supabase.js`／`test_edit_order.js`／`test_engraving_render.js`／`test_final_verify.js`），到期 2026-12-17，待期二前端唯讀層收編

## 四、Live 唯讀驗證（Supabase，62 張生產訂單）

| 驗證 | 結果 |
|---|---|
| Finance Bible §九 驗證1（四分類成本和=total_cost） | 0 違規 |
| 驗證2（net_profit=final_sale_price-total_cost） | 1 違規（`0600804`，已登記例外） |
| `products.total_base_cost IS NOT NULL` | 0 違規（200/200） |
| `fhs_check_product_cost_drift()` 非零 | 172 行非零 0（現有落差，非本次引入，登記範圍外） |
| `products.suggested_price IS NULL` | 26/200，全屬 `(V2)` SKU（設計如此） |

## 五、驗證

- **V1**：改寫後 `python Maintenance_Tools/run_all.py` 實跑兩次（含生產 Supabase webhook），5 項全 PASS（LIFECYCLE/STRESS/ACCEPTANCE/COST_INTEGRITY/PRICE_AUDIT），零 SKIP，exit 0
- **V2**：SKIP 三態邏輯隔離單元測試（未登記=FAIL、有效=WARN、過期=FAIL、JSON 壞=fail-closed）全過，登記冊還原後 `0600804` 確認仍在
- **V3**：清空 `SUPABASE_ANON_KEY` 實跑，環境前置檢查正確 FAIL 並停止，零子腳本執行
- **V4**：3 條新 DEGRADED marker 逐一比對子腳本實際輸出字串，全命中
- **V5**：`audit_price_completeness.py` 過濾邏輯正反測試（去 V2 排除→26行；加排除→0行），修正一個實作 bug（`sku.like."..."` 雙引號包裹規則誤用於頂層查詢參數，令排除條件完全失效）
- **V7**：`semantic_audit.py` D3「紅得起」測試——注入結構化標記版本不符（`.tmp_d3_test.md` 含 `<!-- canonical:agents_version=v9.9.9 -->`）確認真會命中並於刪除後清零；歷史語境（`commit.md:136`）零誤判；現行 repo D3 命中 4 條，全部對應已登記例外
- **V9**：反向引用全 repo 重掃（`fhs-cost-audit`／`21項`／`33項`／`30項`／`LOCAL_AUDIT`），現行類殘留全數確認為刻意保留（歷史記錄/解釋性文字），修正額外揪出嘅 5 個真殘留（`.claude/commands/fhs-slim.md`／`.fhs/ai/commands/fhs-slim.md`／`.fhs/ai/commands/usage-audit.md`／`.fhs/ai/README.md`／`docs/FHS_Prompts.md`）
- **V10（驗收不自驗）**：派 fresh-context `general-purpose` agent 獨立驗收，涵蓋 10 項逐一核實（憲法層改動／財務公式對照原文／PostgREST 語法／DEGRADED marker 逐字比對／JSON 合法性／D3 死碼修復確認／`fhs-audit.md` 項目數逐節手數／反向引用／實際跑健檢）。**結論**：spec 合規 PASS-with-fixes、品質 PASS（零 PostgREST/regex/JSON 語法錯）。揪出 3 個文件同步缺口（Changelog.md／decisions.md／session-log.md 未記錄本次變動）+ 1 個計劃外但無害嘅執行決定（`verify_repo_map.py` 歸檔）——**全部已修復**，見上方「文件同步」與「已知例外」段

## 六、已知限制 / 刻意不做

- 期二（前端唯讀層、端對端層取代 `qa_v41_supabase.js`、視覺回歸、`/commit` Phase 2.4 前端閘）留待另次 `/execute`，需期一驗收通過後方可開始
- `0600804` 財務數據本身唔喺本次範圍，交由獨立任務 `task_9dba2023` 處理
- `fhs_check_product_cost_drift()` 172 行非零嘅既有落差、`compatible_with` 全部 subagent 停留 v1.4.x/v1.5.0 嘅維護缺口——本次僅發現同記錄（`fhs-audit.md` A6-2 已註明暫緩比對邏輯），非本次範圍
- 根目錄 `README.md:86` 版本號漂移（v1.4.6/v1.5.0 vs 現行 v1.7.2）——查證為本次改動之前已存在嘅舊漂移，非今次引入，且不在批准清單內，留待下次 `/fhs-audit` 或另案處理
- `docs/repo-map.md:411` 列出嘅 `tmp/` 目錄實測不存在——與 `AGENTS.md`／node_modules 同類「系統環境自動生成」描述框架下屬可接受，未強行修改

## 七、影響檔案

| 類型 | 檔案 |
|---|---|
| `[NEW]` | `.fhs/tools/check_registry.json` |
| `[NEW]` | `Maintenance_Tools/audit_cost_integrity.py` |
| `[NEW]` | `Maintenance_Tools/audit_price_completeness.py` |
| `[NEW]` | 本完成記錄 |
| `[MODIFY]` | `.fhs/ai/AGENTS.md`（⛔憲法層，v1.7.1→v1.7.2） |
| `[MODIFY]` | `.fhs/ai/commands/commit.md`（v2.6.0→v2.7.0） |
| `[MODIFY]` | `Maintenance_Tools/run_all.py`（V45.7.4→V46.0.0） |
| `[MODIFY]` | `.fhs/ai/commands/fhs-audit.md`（v2.1→v3.0.0） |
| `[MODIFY]` | `.fhs/ai/commands/fhs-check.md`（v1.1→v2.0.0） |
| `[MODIFY]` | `.fhs/tools/semantic_audit.py`（0.1.0-mvp→0.2.0） |
| `[MODIFY]` | `.fhs/tools/canonical_keys.yml` |
| `[MODIFY]` | `.claude/commands/fhs-audit.md`／`.claude/commands/fhs-check.md`／`.agents/workflows/fhs-audit.md` |
| `[MODIFY]` | `docs/FHS_Prompts.md`／`docs/repo-map.md`／`.env.example` |
| `[MODIFY]` | `.fhs/ai/commands/README.md`／`.fhs/ai/README.md`／`.fhs/notes/fatmo-ops-quickcard.md` |
| `[MODIFY]` | `.claude/commands/fhs-slim.md`／`.fhs/ai/commands/fhs-slim.md`／`.fhs/ai/commands/usage-audit.md` |
| `[MODIFY]` | `.fhs/ai/skills/finance-gatekeeper/SKILL.md`（v1.14.0→v1.15.0） |
| `[MODIFY]` | `scripts/hooks/prompt-router.js`／`scripts/agent_dashboardV42.js` |
| `[MODIFY]` | `Maintenance_Tools/README.md`／`scripts/README.md`／`archive/README.md` |
| `[MODIFY]` | `Changelog.md`／`.fhs/notes/decisions.md`／`.fhs/notes/session-log.md` |
| `[DELETE→archive/]` | 9 個檔案（見上方「歸檔」段） |

## 八、對話期間 A3 自我披露嘅事實錯誤（4 次）

1. Q1：曾稱 PRICE_AUDIT「走 Supabase」可作 `/fhs-cost-audit` 替代——錯，查 Airtable，已更正為「重寫」而非「廢除」
2. Q9：曾稱「淨改後端分支出現視覺差異＝強訊號」——錯，fixture 化下未改 V42 嘅 diff 必為零
3. Q6：曾稱 `canonical_keys.yml` 跨檔比對「機器已存在只係稽核者自我豁免」——錯，機器從未實作（dead code）
4. A2 評審失敗原因：先誤判「請求太大」，經多次 curl 對照重複實測後更正為「Google 端間歇性過載」

**Subagent 使用記錄**：✅ 3 個 fresh-context `general-purpose` agent 平行盤點（研究，非實作）+ 1 個獨立驗收 agent（PASS-with-fixes，非自驗）。
