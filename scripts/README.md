# scripts/ — 輔助腳本

本資料夾存放專案維護與排錯的輔助腳本。

| 檔案 | 用途 |
|---|---|
| `Sync_Notion_Brain.js` | 將核心邏輯或災難分析同步寫入 Notion 以作為雲端記憶備份 |
| `cl-flow-runner.js` | `/cl-flow` A3-first 協調器（v2.0.0，D39）— `--init` 開檔（不叫 API）／`--review [--fast]` 送 A3 草案俾 A1 Perplexity + A2 Gemini 評審（模型由 `GEMINI_A2_MODEL_DEFAULT` 控制）|
| `validate-ag-plan.js` | ⚠️ 舊版 ag-plan 作者格式驗證器（D39 前）— 現行評審格式（`ag-review.md`）已不再呼叫此驗證器，檔案保留但未接線於當前 Verdict 鏈 |
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
| `agent_dashboardV42.js` | **AI 助理團隊名冊生成器**（`/team`）：掃描 subagents/commands/skills/hooks/MCP frontmatter + n8n API live 實掃 → 生成 `artifacts/agent_dashboardV42.html`（人睇）+ `.json`（AI 讀），制度見 `.fhs/notes/ai-team-registry.md` |
| `upload-web.ps1` | **NAS Web Station 部署器**（`/upload-web`）：WebDAV 上傳 + 三關驗證（HTTP 200/大小/SHA256）。目標代稱 `V42`/`V41`/`V40`/`current`（POS Dashboard，來源 `Freehandsss_Dashboard/`）＋ `team`（AI 助理團隊名冊，來源 `artifacts/`，2026-07-16 新增），憑證讀 repo 根 `.env` |

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
| `hooks/pre-tool-guard.js` | `PreToolUse (Write\|Edit\|MultiEdit\|PowerShell\|Bash\|NotebookEdit)` | 守護 AGENTS.md 硬規則：阻止覆蓋 current.html（含 Bash/PowerShell 目標偵測 R9），需 `.fhs/.deploy-ok` 授權放行一次（10分鐘TTL）；R10（v2，S159續放寬）AI 可自建此旗標，但僅限直接回覆 AI 提出的升格確認問題（AGENTS.md v1.6.0 行為層硬約束，hook 無法技術驗證），或 Fat Mo 自行終端機 `touch` 建立；另阻擋硬編碼 API key（sbp_/eyJ/sb_secret_）、git add .env 等違規操作；R11-observe 對財務相關 shell 寫入 warn-only 記錄（觀察期，2026-07-04）；R12（S156，2026-07-09）寫入 learnings.md 時 warn 提醒 Rule 3.17 雙紀律自檢句；回歸測試見 `hooks/test/`（17組 fixtures） |
| `hooks/post-tool-kgov.js` | `PostToolUse (Write\|Edit\|MultiEdit\|mcp__.*__apply_migration\|mcp__.*__update_node_code\|mcp__.*__execute_sql)` | 知識治理自動捕捉：v2.0.0 (S148) 依真值表（migrations .sql/MCP/Dashboard HTML+財務）寫 `.fhs/.kgov-pending` flag + 注入 [G] 提醒，其餘 md/js 僅 warn，防誤觸；加載 T6 budget gate；回歸測試見 `hooks/test/`（10組 kgov fixtures，S148 新增）|
| `hooks/stop-kgov.js` | `Stop` | session 結束知識治理守衛：flag 存在時提醒未結案的 §十/lessons 更新（HARD_BLOCK=false 第一階段，2026-06-12）|
| `hooks/fhs-health-check.js` | 由 `session-start-sop.sh` 末尾呼叫（非獨立 hook 掛載） | L1 文件健康快檢：零依賴，偵測過肥/沉積孤兒/過時漂移/同名重複/歸檔斷鏈五種病 + 週期稽核到期（第6檢查，2026-07-05 S143：`/fhs-audit` 逾90天未跑才提醒，記憶負擔歸零），規則資料在 `.fhs/tools/fhs-health-rules.json`，正常沉默、異常 ≤2 行警示，<2 秒；報告見 `.fhs/.health-report.json`；清理走 `/fhs-slim` 指令；fail-open（node不存在/腳本出錯絕不擋 session 啟動）；回歸測試見 `hooks/test/`（12組 fixtures，S142建10組+S143加cadence 2組）|

**回滾方法**：刪除 `.claude/settings.json` 中的 `hooks` 區段即可停用所有 hooks，腳本檔案不受影響。`fhs-health-check.js` 掛載於 `session-start-sop.sh` 末尾，單獨移除該行即可停用，不影響其餘 hook。

## ig-watchdog/ — IG 漏單看門狗（全自動，NAS n8n 跑，Session 108→109；P2a 寫入行為變更見下方，Session 171）

IG 設定每天自動匯出訊息到 Google Drive → n8n Google Drive Trigger
偵測新檔 → Compression 解壓 → Code 節點（mojibake 解碼 + CJK 模糊比對）→ 唯讀查 Supabase
`orders`/`sales_pipeline` → 分級（🔴疑似漏單/🟡待查/⚪低信心）→ Telegram 推送摘要 →
寫入 `ig_watchdog_alerts`（Session 119 起）。
⚠️ **「永不寫入 Supabase」已過時（P2a，Session 171 起不再成立）**：P2a 新增 `ig_messages`
表持久化每則新訊息，寫入前一律經 `lib/order-match.mjs` `redactPii()` 遮罩（電話/IG handle/
地址門牌/付款尾碼）+ `maskName()` 遮罩 `customer_name`，`ig_message_id` 以 `hashId()`
雜湊組成（不落地明文姓名/thread於id欄位）；未遮罩明文訊息本體仍不落地（只在 Drive↔NAS n8n
記憶體間流動），但已知結構性訊號（`thread` 資料夾名稱，性質近似客戶識別碼）比照既有
`ig_watchdog_alerts` 先例仍以明文存放，屬已知且已記錄的設計取捨（見 decisions.md D31）。
**P2b（同 Session 171）新增金額比對**：`content_mismatch` 表記錄「IG 訊息提及金額 vs 訂單實際
記錄金額」比對證據（僅 `amount_mismatch`，品項比對未做——現行 pipeline 未攞 order_items
明細）；比對邏輯 `compareToOrder()`/`extractAmountsFromText()` 同樣在 `lib/order-match.mjs`。
上線頭 2 週刻意不接 Telegram 通知（只寫表供人工覆核校準閾值），詳見 decisions.md D32、
`.fhs/notes/FHS_System_Logic_Overview.md` §11.8。
**P2c（同 Session 173）新增意圖標註 + 回覆範本庫**：`message_intents` 表記錄
`tagIntent()`（regex-first，5類：cancel/complaint/modify_order/payment_inquiry/place_order）
命中結果，只標註客人發出的訊息；`reply_templates` 為人工維護靜態範本表（5類各1筆草稿種子，
非 pipeline 寫入對象）。兩表皆用 `message_thread`+`message_ig_message_id` 軟性參照（比照
P2b `content_mismatch` 設計，非計畫書原文 `message_id` FK——現行 n8n REST POST fire-and-forget
寫入模式取不回 INSERT 產生的 UUID，見 migration 0057 註記）。⚠️ 執行期無足量真實多樣樣本
（`ig_messages` 0 筆、`ig_watchdog_alerts` 現存 10 筆真實 snippet 皆為訂單細節確認，無
cancel/complaint/payment_inquiry/modify_order 案例），cl-final-plan §7「≥20真實樣本/
覆蓋率≥70%/準確度≥80%」量測 Fat Mo 裁決延後，待 `ig_messages` 自然累積足量後補測（誠實收窄，
比照 P2a/P2b v1 慣例），詳見 decisions.md D34。
n8n workflow：`FHS_IGWatchdog_DriveWatch`（ID `D4LK6VrQbiXlju0V`）。
完整操作/重建見 `ig-watchdog/SOP.md`。

| 檔案/指令 | 用途 |
|------|------|
| `build_n8n_workflow.cjs` | **改規則的唯一入口**：產生 n8n workflow JSON（含 Code 節點移植邏輯），PUT 上 n8n 套用 |
| `npm run watchdog`/`calibrate`/`selftest` | 本機手動工具，保留作 ad-hoc 深度分析/校準用，非日常必需（見 SOP §五）|
| `npm test` | 單元測試（decoder mojibake 解碼 + match 分類 + order-match v3/PII三函式/金額比對/意圖標註，Session 173 起 43 cases）|

**演進**：原規劃本機常駐 `server.mjs`（方案A）已棄用並刪除——實測發現 NAS n8n 的 Code 節點
其實能用 `Buffer`+`Compression` 節點完成全部解壓/解碼/比對，遂改為全 NAS 跑（方案C），
徹底消除「主機關機=分析暫停」的依賴。

**背景**：IG Graph API 讀 DM 需 Meta 商業驗證（BR/網站/業務帳單），FHS 無 → 此路封死；
DYI 每日自動匯出是唯一合法免驗證途徑。詳見 `artifacts/2026-06-16-2330/cl-final-plan.md`。

**回滾**：n8n 停用/刪除 `FHS_IGWatchdog_DriveWatch` workflow 即可，零線上業務系統影響。

## cl-flow-runner.js 使用說明（v2.0.0，D39 A3-first）

**兩段式**（Claude 會自動觸發，通常不需手動執行）：

```bash
# 第一段：開檔（不叫 API）
node scripts/cl-flow-runner.js --init "你的任務描述"

# ——中間 Claude 撰寫 artifacts/{flow_id}/a3-draft.md——

# 第二段：送草案俾 A1/A2 評審
node scripts/cl-flow-runner.js --review {flow_id}          # 完整版：A1 Perplexity + A2 Gemini
node scripts/cl-flow-runner.js --review {flow_id} --fast   # 精簡版：淨 A2 Gemini（/cl-flow-fast 用）
```

**環境需求**：

- Node.js 16+
- `.env` 含 `GEMINI_API_KEY`（`--review` 非 `--fast` 模式另需 `PERPLEXITY_API_KEY`）
- 不再依賴 `repomix`——A3 草案由 Claude 直接用 Grep/Read 查證 repo，evidence 已內嵌於草案本身

**輸出**：

```text
artifacts/{flow_id}/
  ├── task-brief.md   ← 任務說明（--init 產出）
  ├── state.json      ← 流程狀態（degraded 欄位標記單邊評審失敗）
  ├── a3-draft.md      ← Claude 撰寫的基礎分析＋部署方案草案
  ├── px-review.md    ← A1 外部驗證評審（--review，非 --fast 時產出）
  └── ag-review.md    ← A2 對抗 red-team 評審（--review 兩種模式皆產出）
```
