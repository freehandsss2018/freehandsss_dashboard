# S149 執行視圖（v2＋§5.1＋§5.4）

來源：`.fhs/reports/planning/2026-07-06_s149-governance-portability_implementation_plan.md`。此檔只整合執行步驟；原計畫條文與覆寫表仍是裁決來源。D96 分工：Codex 執行 Phase 0–1，Claude Code 執行 Phase 2 並安排 fresh-context opus 審查，Codex 再執行 Phase 3–5。各 Phase 依序交棒，不跨越依賴。

## 共通紀律

- S148 全 Phase 完成；每個有改動的 Phase 各一個 commit，commit 前先回填原計畫「執行狀態」。
- 巨檔只用搜尋定位與小窗口讀；改治理檔先備份。不要改動現有 FHS 生產行為，唯一例外是 Phase 2 行為等價的 guard 拆分。
- 模板資產以 Phase 1 manifest 為唯一分類來源；§0 資產矩陣只作歷史初判。
- Fat Mo 已按 D96 批准 §4.0b 授權清單及 §5.1、§5.4 增量。Phase 5 的回填律全域化仍須另案裁決。

## Phase 0：依賴閘與當日基線

1. 核對 S148 執行狀態及當日 `git` 基線。跑 fixtures 前確認 `.fhs/.deploy-ok` 不存在；若存在，停跑並記錄原因。
2. 跑 `scripts/hooks/test/` 下五支 runner：`run-fixtures.js`、`run-kgov-fixtures.js`、`run-health-fixtures.js`、`run-finance-stop-fixtures.js`、`run-handoff-gate-tests.js`。保存逐項輸出到 `.fhs-local/` 或 scratchpad。
3. 從 `pre-tool-guard.js` 的 `// ── Rule N` 標記抽取規則 ID 集合，保存拆分前清單。記錄本檔案基線 commit hash及測試計數。

## Phase 1：可攜性 manifest

1. 枚舉 `.fhs/ai/**`、`scripts/hooks/**`、`scripts/{cl-flow-runner,validate-ag-plan}.js`、`.claude/commands/**`、`.agents/workflows/**`、`.fhs/notes/{FHS_Mode_Card,knowledge-map,SOP_NOW}.md`、`.fhs/ai/commands/{8d,usage-audit,3d-print,canva-auto}.md`、`3d/`、`canva_auto/`，並補齊 require/import 閉包（例如 `scripts/lib/env.js`）與所需外部套件資訊。
2. 逐檔決定 U/F/M 類別、COPY-CLEAN/GENERIC-FORK/SKIP 動作、目的地、project/n/a 安裝層級、必要行數預算、GENERIC-FORK 的來源 blob hash、`deps` 閉包；SKIP 必須附一句理由。subagents 入模板者只採專案級 `.claude/agents/`。
3. `scripts/portability/check-manifest.js` 驗收未分類＝0、SKIP 理由齊全、GENERIC-FORK hash 齊全、`deps` 閉包內本地檔案皆有 manifest 條目。外部 package 依賴列入 Phase 3 模板的 `package.json`。
4. 回填狀態並 commit #1；D96 規定此處停低，交 Claude Code 執行 Phase 2。

## Phase 2：guard 拆分（Claude Code）

1. `pre-tool-guard.js` 拆成行為等價的引擎與 `scripts/hooks/guard-rules.fhs.json`；執行當日全部 R 規則外置。
2. 五套 runner 與 Phase 0 基線逐項一致；拆分前標記 ID 集合與拆分後 JSON 的 ID 集合相等；另驗 guard stdout JSON 結構完整。
3. 同一機器、同一組輸入，拆分前後各跑 30 次，以執行時間中位數比較，delta ≤50ms。
4. fresh-context opus diff 級對抗審查 PASS 後，回填狀態並 commit #2。router、kgov、stop-kgov、health-check 不在此 Phase 重構。

## Phase 3：抽取器與模板 v0.1.0

1. `export-template.js` 依 manifest 複製 COPY-CLEAN，並取 `template-src/` 的 GENERIC-FORK 去識別化副本；模板環境變數前綴用 `{{ENV_PREFIX}}_`。本機有模板目標路徑存取權時用獨立 repo，雲端環境用 `dist/template/`。
2. 模板含 governance 00–07 通用版、AGENTS/CLAUDE 骨架、8 支核心 commands、hooks/fixtures/記憶骨架、Mode Card、專案級 agents、cl-flow-runner、MCP/config 範例、橋接產生器、README、VERSION、CHANGELOG、domain param-memory 範式文件。Antigravity 新橋接目標是 `.agents/skills/`；hooks 映射及 FHS 現有橋接遷移另案處理。
3. 驗收 exporter、manifest 非 SKIP 檔數對齊、README ≤150 行、AGENTS skeleton ≤120 行、黑名單 0 hits；用含黑名單詞的合成樣本證明掃描器有效。完整黑名單 regex 為 `freehandsss|FHS_|app9GuLsW9frN4xaT|yanhei\.synology|6Ljih0hSKr9RpYNm|cztGsFXZYtvBUDA6|sbp_|X-N8N-API-KEY|final_sale_price|raw_form_state|captureFormState|Fat Mo|Edwin|SynologyDrive|Free_recorder|Lovart|canva_auto|param_memory|placement_memory|freehandsss2018`，對**匯出後模板目錄**掃描。匯出後模板重跑全部**已匯出**的可攜 runner（guard、kgov、health、handoff-gate）；FHS finance-stop runner 依 manifest SKIP，只在 Phase 0／2 活體五套基線執行。`VERSION` 記模板版本及來源 FHS commit hash。
4. 回填狀態並 commit #3。

## Phase 4：新專案乾跑

在 scratchpad 空白專案按 README bootstrap，由 fresh agent 盲測：SessionStart 快照、fixtures、橋接、read 流程、handoff 便攜塊、≤10 分鐘人工步驟、只看模板 README、跨裝置 SOP、乾淨 HOME 下 agents/hooks 來源不含 FHS 全域目錄。9/9 PASS；只把演練報告 commit #4。

## Phase 5：制度收尾

同步 decisions、完成報告、repo-map/README、CLAUDE 路由、05 §7 模板 drift 健檢及 auto-memory；按需要執行 `/commit`。回填所有 Phase，狀態行 `^- Phase [0-5]：⬜` 命中數＝0，再 commit #5。全域化回填律只提案，不隨此計畫生效。
