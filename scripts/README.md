# scripts/ — 輔助腳本

本資料夾存放專案維護與排錯的輔助腳本。

| 檔案 | 用途 |
|---|---|
| `Sync_Notion_Brain.js` | 將核心邏輯或災難分析同步寫入 Notion 以作為雲端記憶備份 |
| `cl-flow-runner.js` | `/cl-flow` 協調器核心 — 並行調用 Perplexity + Gemini API，生成真實 artifact（模型由 `GEMINI_A2_MODEL_DEFAULT` 控制）|
| `validate-ag-plan.js` | ag-plan 輸出格式守護 — 驗證 Gemini 產出的 `ag-plan.md` 結構完整性，保護 Verdict 鏈 |
| `migrate_airtable_to_supabase.js` | **Supabase 遷移**：批量將 Airtable 資料同步至 Supabase (Phase 1)，需 Airtable API |
| `migrate_from_csv.js` | **CSV 遷移備援**：當 Airtable API quota 耗盡時，改從 `airtable-database/*.csv` 讀取並遷移至 Supabase（支援 multiline quoted fields）|
| `run_supabase_migration.js` | **遷移啟動器**：自動化執行 Supabase 遷移流程 |
| `qa_v41_supabase.js` | **V41 驗證**：測試 Dashboard V41 與 Supabase 連接與渲染 |
| `add_supabase_mirror_nodes.js` | **n8n 自動化**：自動向 n8n 工作流添加 Supabase 鏡像節點 |
| `update_n8n_supabase_mirror.js` | **n8n 自動化**：將 n8n 工作流中的 Supabase 鏡像節點代碼更新為基於 Axios 的實作 |
| `deploy_native_supabase_mirror.js` | **n8n 自動化**：將最新的 SSoT Webhook 準備邏輯部署至 NAS |
| `deploy_batch_recalc_workflow.js` | **n8n 自動化**：建立並啟動 `💰 Financial Batch Recalculate` workflow（2026-05-28）|
| `scratch_pull_and_save_workflow.js` | **n8n 工具**：從 NAS 下載並儲存完整的 n8n live 工作流備份 |
| `backfill_deposit.js` | **數據回填**：修復舊訂單缺失的訂金欄位 |

## 🧪 測試與驗證腳本 (Test Suite)

| 檔案 | 用途 |
|---|---|
| `test_engraving_render.js` | 驗證刻字資料在 V41 渲染是否正確 |
| `test_full_reconstruction.js` | 測試訂單狀態從 Raw_Form_State 完全重建 |
| `test_edit_order.js` | 測試 Supabase 環境下的訂單編輯同步 |
| `test_final_verify.js` | 上線前的最終全系統驗證 |

## 已歸檔的一次性除錯腳本（2026-07-05，`/fhs-audit` S145）

46 個未文件化的一次性 n8n 節點探查/驗證腳本（`scratch_*.js` ×42、`apply_rls_policies.js`、`verify_b1_all.js`、`verify_ui_temp.js`、`test_old_order.js`；2026-05-22~06-03 建立，逾一個月無更新）已 `git mv` 至 `archive/scripts-scratch-2026-07/`，詳見該目錄 README 條目與 `.fhs/reports/audits/system/audit_2026-07-05.md`。`scratch_pull_and_save_workflow.js` 因仍在下方表中有正式用途說明，不在此次歸檔範圍。

## repair/ — 財務與資料修補腳本

> ⚠️ 此目錄內腳本為一次性修補操作，執行前必須確認前置條件，並建議先跑 `--dry-run`。

| 檔案 | 用途 |
|---|---|
| `repair/sync_0600701.js` | 訂單 0600701 利潤缺口修補（total_cost / net_profit NULL）— 支援 `--dry-run` + `--force` |
| `repair/sync_0600903.js` | 訂單 0600903 財務與時間比對與更新修補 — 支援 `--dry-run` + `--force` |

## Legacy 歷史資料遷移與校正腳本

此區腳本主要用於處理 2026 年初歷史資料遷移與財務校正，目前已處於穩定狀態（無需進一步修改），但保留於此以備不時之需或作為代碼參考。

| 檔案 | 用途 |
|---|---|
| `sync-legacy-orders.js` | **訂單匯入**：一次性批量匯入 2026-01 ~ 2026-04 的 Excel 歷史訂單資料至 Airtable 結構。 |
| `update-legacy-profit.js` | **利潤校正**：聚合舊訂單的各項目成本（Order Items Cost），計算並回填 `Total_Cost` 與 `Net_Profit`。 |
| `update-legacy-sale-price.js` | **售價校正**：針對非 P 系列舊訂單，自動調整最終售價以包含缺失的木框產品成本 (+ $2,380)，並同步更新利潤。 |
| `deploy-order-confirm-date.js` | **自動化部署**：透過 n8n REST API 自動更新工作流節點，加入 `Order_Confirm_Date` 的新欄位映射。 |

## hooks/ — Claude Code Hooks 執行層

新增於 2026-04-28。由 `.claude/settings.json` 配置，在對應 lifecycle 事件時自動執行。

| 腳本 | 觸發事件 | 用途 |
|------|---------|------|
| `hooks/session-start-sop.sh` | `SessionStart` | 自動注入 SOP_NOW 快照 + handoff 待辦，取代手動 `/read` |
| `hooks/prompt-router.js` | `UserPromptSubmit` | 分析任務描述，建議最適 subagent / skill / model（建議模式，不強制）|
| `hooks/pre-tool-guard.js` | `PreToolUse (Write\|Edit\|MultiEdit\|PowerShell\|Bash\|NotebookEdit)` | 守護 AGENTS.md 硬規則：阻止覆蓋 current.html（含 Bash/PowerShell 目標偵測 R9），需 `.fhs/.deploy-ok` 授權放行一次（10分鐘TTL）；R10（v2，S159續放寬）AI 可自建此旗標，但僅限直接回覆 AI 提出的升格確認問題（AGENTS.md v1.6.0 行為層硬約束，hook 無法技術驗證），或 Fat Mo 自行終端機 `touch` 建立；另阻擋硬編碼 API key（sbp_/eyJ/sb_secret_）、git add .env 等違規操作；R11-observe 對財務相關 shell 寫入 warn-only 記錄（觀察期，2026-07-04）；回歸測試見 `hooks/test/`（16組 fixtures） |
| `hooks/post-tool-kgov.js` | `PostToolUse (Write\|Edit\|MultiEdit\|mcp__.*__apply_migration\|mcp__.*__update_node_code\|mcp__.*__execute_sql)` | 知識治理自動捕捉：v2.0.0 (S148) 依真值表（migrations .sql/MCP/Dashboard HTML+財務）寫 `.fhs/.kgov-pending` flag + 注入 [G] 提醒，其餘 md/js 僅 warn，防誤觸；加載 T6 budget gate；回歸測試見 `hooks/test/`（10組 kgov fixtures，S148 新增）|
| `hooks/stop-kgov.js` | `Stop` | session 結束知識治理守衛：flag 存在時提醒未結案的 §十/lessons 更新（HARD_BLOCK=false 第一階段，2026-06-12）|
| `hooks/fhs-health-check.js` | 由 `session-start-sop.sh` 末尾呼叫（非獨立 hook 掛載） | L1 文件健康快檢：零依賴，偵測過肥/沉積孤兒/過時漂移/同名重複/歸檔斷鏈五種病 + 週期稽核到期（第6檢查，2026-07-05 S143：`/fhs-audit` 逾90天未跑才提醒，記憶負擔歸零），規則資料在 `.fhs/tools/fhs-health-rules.json`，正常沉默、異常 ≤2 行警示，<2 秒；報告見 `.fhs/.health-report.json`；清理走 `/fhs-slim` 指令；fail-open（node不存在/腳本出錯絕不擋 session 啟動）；回歸測試見 `hooks/test/`（12組 fixtures，S142建10組+S143加cadence 2組）|

**回滾方法**：刪除 `.claude/settings.json` 中的 `hooks` 區段即可停用所有 hooks，腳本檔案不受影響。`fhs-health-check.js` 掛載於 `session-start-sop.sh` 末尾，單獨移除該行即可停用，不影響其餘 hook。

## ig-watchdog/ — IG 漏單看門狗（全自動，NAS n8n 跑，Session 108→109）

唯讀工具，零人手介入。IG 設定每天自動匯出訊息到 Google Drive → n8n Google Drive Trigger
偵測新檔 → Compression 解壓 → Code 節點（mojibake 解碼 + CJK 模糊比對）→ 唯讀查 Supabase
`orders`/`sales_pipeline` → 分級（🔴疑似漏單/🟡待查/⚪低信心）→ Telegram 推送摘要。
**永不寫入** Supabase/Airtable；客人 DM 內容全程不落地本機/Git/第三方雲端，只在
Drive↔NAS n8n 記憶體間流動。n8n workflow：`FHS_IGWatchdog_DriveWatch`（ID `D4LK6VrQbiXlju0V`）。
完整操作/重建見 `ig-watchdog/SOP.md`。

| 檔案/指令 | 用途 |
|------|------|
| `build_n8n_workflow.cjs` | **改規則的唯一入口**：產生 n8n workflow JSON（含 Code 節點移植邏輯），PUT 上 n8n 套用 |
| `npm run watchdog`/`calibrate`/`selftest` | 本機手動工具，保留作 ad-hoc 深度分析/校準用，非日常必需（見 SOP §五）|
| `npm test` | 單元測試（decoder mojibake 解碼 + match 分類，19 cases）|

**演進**：原規劃本機常駐 `server.mjs`（方案A）已棄用並刪除——實測發現 NAS n8n 的 Code 節點
其實能用 `Buffer`+`Compression` 節點完成全部解壓/解碼/比對，遂改為全 NAS 跑（方案C），
徹底消除「主機關機=分析暫停」的依賴。

**背景**：IG Graph API 讀 DM 需 Meta 商業驗證（BR/網站/業務帳單），FHS 無 → 此路封死；
DYI 每日自動匯出是唯一合法免驗證途徑。詳見 `artifacts/2026-06-16-2330/cl-final-plan.md`。

**回滾**：n8n 停用/刪除 `FHS_IGWatchdog_DriveWatch` workflow 即可，零線上業務系統影響。

## cl-flow-runner.js 使用說明

**直接使用**（Claude 會自動觸發，通常不需手動執行）：

```bash
node scripts/cl-flow-runner.js "你的任務描述"
```

**環境需求**：

- Node.js 16+
- `.env` 含 `PERPLEXITY_API_KEY` + `GEMINI_API_KEY`
- （選用）`repomix` 已安裝，可提升 AG 代碼上下文質量

**輸出**：

```text
artifacts/{flow_id}/
  ├── task-brief.md   ← 任務說明
  ├── state.json      ← 流程狀態
  ├── px-report.md    ← Perplexity 外部研究報告
  └── ag-plan.md      ← Gemini 本地實作計劃
```
