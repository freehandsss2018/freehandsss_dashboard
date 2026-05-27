# Repo Map

freehandsss_dashboard/
├── README.md                            ← 專案總覽
├── CLAUDE.md                            ← Claude Code 入口
├── ANTIGRAVITY.md                       ← Antigravity 入口
├── .cursorrules                         ← Cursor IDE 系統規則（勿移動）
├── .impeccable.md                       ← Impeccable 設計 Skills 配置（勿移動）
├── .env                                 ← 環境變數（禁止 commit）
├── .env.example                         ← 環境變數範例
├── .gitignore                           ← Git 忽略規則
├── .mcp.json                            ← Claude Code MCP server 註冊（n8n-mcp-server）
├── Changelog.md                         ← 系統版本變更記錄
├── package.json / package-lock.json     ← Node.js 依賴
├── .env.supabase.example                ← Supabase 連線變數範本（2026-05-10 新增）
├── supabase/                            ← Supabase Schema 文件區（2026-05-10 新增）
│   ├── README.md                        ← Fat Mo 操作指南
│   ├── ANTI_IDLE_SETUP.md               ← 防閒置 ping 設定（Free Tier 7 天暫停問題）
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql      ← 初始建表 DDL（6 表 + 索引 + ENUM）
│   │   ├── 0002_add_deleted_at.sql      ← 軟刪除欄位（orders.deleted_at）
│   │   ├── 0003_base_cost_view_and_rpc.sql ← v_products_with_costs VIEW + get_base_cost_by_skus RPC（2026-05-15，Supabase-First Phase 1）
│   │   ├── 0004_cost_infrastructure.sql    ← recalculate_product_costs() + v_order_cost_breakdown VIEW（2026-05-15，Supabase-First Phase 2）
│   │   ├── 0005_field_descriptions.sql     ← 全表欄位中文說明 COMMENT ON（2026-05-16）
│   │   ├── 0006_n8n_cost_adjustments.sql   ← 新增 n8n_cost_adjustments 欄位 + 修正 0600802 keychain_cost（2026-05-16）
│   │   ├── 0007_fix_n8n_cost_adjustments.sql ← n8n_cost_adjustments JSONB→NUMERIC，新增 n8n_adjustment_notes JSONB（2026-05-16）
│   │   ├── 0008_order_0600802_admin_notes.sql ← 訂單 0600802 定價優惠原因記錄至 admin_notes（2026-05-16，待執行）
│   │   ├── 0010_order_id_cascade_update.sql   ← 外鍵啟用 ON UPDATE CASCADE 與初始 rename_order_id RPC（2026-05-22）
│   │   ├── 0011_rename_order_id_security_definer.sql ← 優化併發鎖定與防衝突合併的 rename_order_id RPC（2026-05-22）
│   │   ├── 0012_add_adjustment_amount.sql     ← orders 表加 adjustment_amount（補打金額，2026-05-24）
│   │   ├── 0013_sync_order_rpc_orphan_cleanup.sql ← sync_order_to_mirror 孤兒清理 + process_status ENUM cast（2026-05-23）
│   │   ├── 0014_add_woolfelts_product.sql     ← products 表加入羊毛氈公仔，解 FK 23503（2026-05-23）
│   │   ├── 0015_add_is_text_overridden.sql    ← orders 加 is_text_overridden BOOLEAN，Mode 1 手動文本保護（2026-05-26）
│   │   ├── 0016_add_order_text_split_columns.sql ← orders 加 full_order_text_a/b，手模/金屬段分拆（2026-05-26）
│   │   ├── 0017_save_structured_items_rpc.sql ← save_structured_order_items RPC，Mode 2 原子化寫入（2026-05-27）⚠ 待部署
│   │   └── 0018_protect_overridden_text.sql   ← sync_order_to_mirror V47.11 guard（is_text_overridden CASE），n8n DB-level保護（2026-05-27）⚠ 待部署
│   ├── rls/
│   │   └── rls_policies.sql             ← Row Level Security 政策
│   ├── descriptions_comments.sql        ← 全表全欄位中文說明（2026-05-13 新增，Fat Mo 查閱用）
│   └── rpc/
│       ├── get_order_summary.sql        ← 訂單摘要（已棄用，由 get_financial_kpis 替代）
│       ├── get_profit_audit.sql         ← 利潤稽核（finance-auditor）
│       ├── get_recent_orders.sql        ← 最近訂單列表（Dashboard）
│       ├── get_products_by_category.sql ← 產品目錄（Dashboard / n8n cache）
│       ├── get_base_cost_by_skus.sql    ← 批量 SKU 成本查詢（2026-05-15，替代 Airtable Fetch Exact Base Cost）
│       ├── get_financial_kpis.sql       ← Finance Mode KPI（revenue/cost/profit/orders/margin/aov，2026-05-16）
│       └── get_financial_charts.sql     ← Finance Mode 圖表（trend/category_revenue/cost_breakdown，2026-05-16）
├── 3d/                                  ← 3D 建模工作目錄（2026-05-07 新增，blender-3d-modeler 路徑規則）
│   ├── README.md                        ← 路徑規則說明
│   ├── input/                           ← 用戶上傳的原始 STL（只讀）
│   ├── projects/                        ← Blender .blend 工作檔（按 slug 分類）
│   └── output/                          ← 最終列印用 STL（按 slug 分類）
├── .claude/                             ← Claude Code 專屬配置（含橋接指令）
│   ├── commands/
│   │   ├── tdd-guide.md        ← /tdd-guide Bridge → vendor/superpowers/test-driven-development（2026-05-09）
│   │   ├── debug-guide.md      ← /debug-guide Bridge → vendor/superpowers/systematic-debugging（2026-05-09）
│   │   ├── db-query.md         ← /db-query Bridge → vendor/awesome-cc/read-only-postgres（2026-05-09）
│   │   ├── five.md             ← /five 五個為什麼根因分析（2026-05-09）
│   │   ├── mermaid.md          ← /mermaid Schema → Mermaid 圖表生成（2026-05-09）
│   │   ├── rp.md               ← /rp Prompt 結構化重寫 Bridge（CL，2026-05-20）
│   │   └── code-analysis.md    ← /code-analysis 多角度代碼深度分析（2026-05-09）
│   └── settings.json           ← hooks 配置（SessionStart/UserPromptSubmit/PreToolUse）
│
├── Freehandsss_Dashboard/               ← Dashboard UI 核心區（HTML + 產品快取）
│   ├── README.md                           ← Dashboard 目錄說明
│   ├── Freehandsss_dashboard_current.html  ← ⚠️ 正式環境（穩定運行中，內容與 V40.7 一致）
│   ├── freehandsss_dashboardV36.html       # 舊版穩定基準 (Legacy Stable)
│   ├── freehandsss_dashboardV37.html       # 展示/試用版本 (Trial / Legacy)
│   ├── freehandsss_dashboardV40.html       # **最新穩定基準** (iPhone/Desktop 雙模式，v40.7 財務優化完成)
│   ├── freehandsss_financial_overview.html ← Financial Overview 頁面 (財務圖表中樞)
│   ├── products.js                         ← 前端產品快取
│   ├── products.json                       ← 前端產品快取（JSON 格式）
│   └── archive/                            ← 失效版本封存區
│       ├── freehandsss_dashboardV36.html
│       ├── freehandsss_dashboardV38_OLD.html
│       └── freehandsss_dashboardV39_proto_OLD.html

│
├── .fhs/                                ← FHS 專案幕後系統（隱藏）
│   ├── README.md                        ← 幕後系統總綱
│   ├── ai/                              ← 共用 AI 配置區
│   │   ├── README.md                   ← AI 指揮系統說明
│   │   ├── AGENTS.md                   ← 憲法層 v1.4.5（2026-05-13 更新：Supabase 四端共存規則）
│   │   ├── FHS_Finance_Bible.md        ← 財務計算聖經 v1.0.0（2026-05-16 新增：雙層成本架構、SKU映射、驗證公式，subagent 強制前置讀取）
│   │   ├── commands/
│   │   │   ├── README.md               ← 指令索引
│   │   │   ├── read.md
│   │   │   ├── cl-flow.md               ← /cl-flow 全自動規劃協調（v2.1.0 重心）
│   │   │   ├── ag-plan.md               ← /ag-plan 本地實施計畫（A2 專用）
│   │   │   ├── px-plan.md               ← /px-plan 外部視角計畫（A1 專用）
│   │   │   ├── execute.md               ← /execute 唯一正式執行入口（v2.1 新增）
│   │   │   ├── fhs-check.md
│   │   │   ├── commit.md                ← 宣告結束與記憶同步（Memory Engine，取代 /reflect）
│   │   │   ├── error-eye.md             ← 錯誤監控（Catch-Push-Diagnose）
│   │   │   ├── guardian.md              ← 全端守護稽核（Anti-Tunnel Vision）
│   │   │   ├── px-audit.md              ← 外部審查（第三方審計員）
│   │   │   ├── fhs-audit.md             ← 系統架構衛生稽核（21項，5大檢查）
│   │   │   ├── ag-stitch-sync.md        ← /ag-stitch-sync Stitch UI snippet 擷取與依賴識別（2026-05-03）
│   │   │   ├── ag-ui-import.md          ← /ag-ui-import Stitch → Vanilla HTML/CSS 轉換入口（2026-05-03）
│   │   │   ├── rp.md                    ← /rp Prompt 結構化重寫（CL/AG/PL 三端通用，含 Command Compatibility Map，2026-05-25）
│   │   │   └── new-product.md           ← /new-product 新產品跨層融入引導（5步 atomic 流程 + rollback matrix，2026-05-21）
│   │   ├── subagents/                   ← FHS Subagent 文件層（2026-04-05 新增）
│   │   │   ├── OPERATING_MODEL.md       ← FHS Subagent 運作模型 v2.0（5-Layer Stack）
│   │   │   ├── README.md                ← subagents 目錄說明與雙層架構
│   │   │   ├── MANIFEST.md              ← 機器可讀 agent 清單（版本追蹤）
│   │   │   ├── install-log.md           ← 安裝歷史記錄
│   │   │   ├── vendor/                  ← lst97 原始副本（未修改，供 rollback 與比對）
│   │   │   │   ├── ui-designer.md
│   │   │   │   ├── frontend-developer.md
│   │   │   │   └── code-reviewer.md
│   │   │   └── freehandsss/             ← FHS 重寫版（實際使用版本）
│   │   │       ├── ui-designer.md       ← v2.0.0 Phase A 設計（iPhone/Desktop 響應式，廢除雙模式）
│   │   │       ├── frontend-developer.md ← Phase B 原型（使用 Input Contract）
│   │   │       ├── code-reviewer.md     ← Phase C 審核（使用 UX checklist 閘門）
│   │   │       ├── database-reviewer.md ← v2.1.0 Airtable schema + n8n 資料流審查（2026-05-16 升級：Supabase Layer 1/2 優先順序重組 + Finance Bible 強制讀取）
│   │   │       ├── finance-auditor.md   ← v2.0.0 四端財務稽核員（Supabase-First，Finance Bible 強制前置，2026-05-16 升級）
│   │   │       ├── tdd-guide.md         ← v1.0.0 TDD 測試驅動開發（Python + n8n 專用，2026-04-28 新增）
│   │   │       ├── build-error-resolver.md ← v1.0.0 錯誤診斷（Haiku model，2026-04-28 新增）
│       │       ├── blender-3d-modeler.md ← v2.0.0 Blender 3D 建模（2026-05-07：Triage / FDM printability / HANDOFF 工具清單 / 路徑規則 / 開放藝術建模）
│       │       └── product-integration-validator.md ← v1.0.0 新產品跨層融入驗證（2026-05-21：UI/ENUM/n8n/RLS 四層 checklist + pitfalls P1-P5）
│   │   └── skills/                      ← FHS Design Intelligence 參考層（2026-04-05 新增）
│   │       ├── ui-ux-pro-max/           ← FHS-curated UI/UX intelligence layer (Consumed by: ui-designer/reviewer)
│   │       │   ├── FHS_INTEGRATION.md   ← v2.0.0 核心整合指引（--fhs-* tokens + 響應式規則，廢除雙模式）
│   │       │   ├── README.md            ← 用途、角色邊界、使用場景
│   │       │   └── vendor/
│   │       │       └── SKILL.md        ← 來源說明與角色邊界聲明
│   │       ├── finance-calculator/      ← FHS 財務計算核心公式（2026-04-28 新增，finance-auditor 強制讀取）
│   │       │   └── SKILL.md            ← 利潤公式、前端/n8n 優先規則、欄位類型規範
│   │       ├── fhs-bug-triage/          ← FHS Bug 修復完成驗證協議（2026-05-13 新增）
│   │       │   └── SKILL.md            ← 5-Gate Completion Protocol，build-error-resolver 強制執行
│   │       └── vendor/                  ← 外部 skill/tool vendor-in 區（2026-05-09 新增）
│   │           ├── superpowers/         ← 來源：github.com/obra/superpowers
│   │           │   ├── test-driven-development.md  ← TDD RED-GREEN-REFACTOR 強制機制
│   │           │   └── systematic-debugging.md     ← 四階段根因調查法
│   │           └── awesome-cc/          ← 來源：hesreallyhim/awesome-claude-code
│   │               ├── read-only-postgres.md  ← 唯讀 PostgreSQL/Supabase 查詢（Supabase 遷移驗證）
│   │               ├── supabase-query.md      ← Supabase Management API CLI skill
│   │               └── hooks-setup-guide.md   ← Dippy + parry hooks 安裝指南（需手動安裝）
│   ├── notes/
│   │   ├── README.md                    ← 筆記層總綱
│   │   ├── decisions.md
│   │   ├── todo.md
│   │   ├── session-log.md
│   │   └── SOP_NOW.md
│   ├── reports/                         ← AI 產出正式報告與計劃區（2026-05-23 新增規則）
│   │   ├── README.md                    ← 報告區總綱
│   │   ├── completion/                  ← 制度任務完成記錄（含歷史備份）
│   │   ├── planning/                    ← /cl-flow 與實施計劃暫存區
│   │   └── audits/                      ← 架構衛生與自動稽核報告區
│   ├── memory/
│   │   ├── README.md                   ← 記憶層與同步規範
│   │   ├── handoff.md
│   │   ├── learnings.md                ← Pattern / Pitfall / Preference distill（/read Step 3，2026-05-20 新增）
│   │   └── pitfalls.yaml               ← Machine-readable 跨層整合 pitfall 知識庫（2026-05-21 新增，product-integration-validator 使用）
│   └── tools/                          ← 稽核工具腳本（2026-05-17 v2.1 新增）
│       ├── semantic_audit.py           ← /fhs-audit Check 7 候選偵測 MVP
│       ├── canonical_keys.yml          ← 單一真理 key 清單（agents_version / n8n_version 等）
│       └── deprecated_terms.txt        ← 已廢棄詞黑名單（Triple_Sync_Field_Map / 三端同步 等）
│
│
├── .agents/                             ← IDE 專屬：Slash 指令與自動化工作流
├── .gemini/                             ← Gemini CLI + Skills (Ref: skills/frontend-design/reference/)
├── .vscode/                             ← VS Code 設定
│
├── docs/                                ← 技術文件
│   ├── README.md                        ← 技術文件索引
│   ├── repo-map.md                      ← 本文件
│   ├── FHS_Blueprint.md
│   ├── DESIGN.md                        ← 大地溫潤 (Earthy Warm) 設計系統規範（2026-05-17 新增）
│   ├── FHS_Product_Bible_V3.7.md        ← 產品定價聖經（成本/售價/折扣邏輯唯一真理）
│   ├── FHS_Legacy_Migration_Notes.md    ← Excel 舊訂單遷移注意事項（缺失問題與處理方法）
│   ├── FHS_Prompts.md                   ← 11個業務情境劇本庫（入口路由總機，AI遇業務問題必讀）
│   ├── GLOBAL_AI_SOP.md                ← v2.2 跨環境與多代理協作協議（⚠️ 被 AGENTS.md v1.4.5 憲法層超越，保留作歷史參考）
│   └── archive/
│       ├── README.md                    ← 歸檔政策
│       └── pre-v1.0-backup/
│
│   ├── n8n/                                 ← n8n Workflow 配置區
│   ├── README.md                        ← n8n 配置說明
│   ├── Triple_Sync_Field_Map.md         ← ⚠️ [已過時] 三端對齊欄位地圖（被 Quadruple_Sync_Field_Map.md 取代）
│   ├── Quadruple_Sync_Field_Map.md      ← v1.1 (2026-05-13) 四端欄位映射（Airtable ↔ n8n ↔ Dashboard ↔ Supabase，最新版本）
│   ├── Airtable_Schema_Snapshot_2026-05.md ← Airtable 6 表 schema 快照 + Postgres DDL 草稿（2026-05-10）
│   ├── N8N_Node_Interaction_Map.md      ← n8n 26 nodes 工作流互動圖（FHS_Core_OrderProcessor v45.7.4，2026-05-10 新增）
│   ├── FHS_Core_OrderProcessor.json     ← 核心訂單處理機
│   └── FHS_Financial_Overview_workflow.json ← 財務聚合機
├── Maintenance_Tools/                   ← 系統健康檢查與維護腳本
│   ├── README.md                        ← 維護工具說明
│   ├── run_all.py                       ← 全部測試執行器
│   ├── generate_fix_payload.py          ← 修復 Payload 產生器
│   ├── FHS_Comprehensive_Test.py        ← 綜合測試
│   ├── FHS_Full_System_Test.py          ← 全系統測試
│   ├── FHS_System_StressTester.py       ← 壓力測試
│   ├── analyze_empty_prices.py          ← 空價格分析
│   ├── final_audit_check_v2.py          ← 最終審計檢查 v2
│   └── update_profit_auditor.py         ← 利潤審計器更新
├── n8n-mcp-server/                      ← n8n MCP Server — AI 控制層（Phase 1: FHS_Core_OrderProcessor）
│   ├── README.md                        ← 專案說明
│   ├── .env.example                     ← 環境變數範例（正式值在根目錄 .env）
│   ├── package.json                     ← Node.js 依賴
│   ├── src/
│   │   ├── index.js                     ← MCP server 入口
│   │   ├── config.js                    ← 認證 + workflow allowlist
│   │   ├── n8n-client.js                ← n8n REST API 連線層
│   │   └── tools/                       ← MCP tool 定義
│   │       ├── get-workflow.js          ← 讀取 workflow 定義
│   │       ├── get-node.js              ← 讀取指定節點
│   │       ├── update-node-code.js      ← 更新 node code（預設 dry-run）
│   │       ├── rollback-node-code.js    ← 從備份回復節點
│   │       ├── trigger-test.js          ← 觸發測試執行
│   │       ├── get-execution-log.js     ← 讀取 execution log
│   │       └── verify-triple-sync.js    ← 三端同步驗證
│   └── test-payloads/                   ← 測試用 mock payload
│       ├── mock_create_order.json
│       ├── mock_edit_order.json
│       └── mock_delete_order.json
├── perplexity-mcp-server/               ← Perplexity MCP 整合伺服器
├── scripts/                             ← 輔助腳本
│   ├── README.md                        ← 腳本說明索引
│   ├── Sync_Notion_Brain.js             ← Notion 雲端記憶同步
│   ├── cl-flow-runner.js               ← /cl-flow 協調器（Perplexity + Gemini headless runner）
│   ├── repair/                          ← 財務 / 資料修補腳本（一次性，需人工確認後執行）
│   │   └── sync_0600701.js             ← 訂單 0600701 利潤缺口修補（total_cost / net_profit NULL）
│   └── hooks/                           ← Claude Code Hooks 執行層（2026-04-28 新增）
│       ├── session-start-sop.sh         ← SessionStart hook：自動注入 SOP_NOW + handoff 摘要
│       ├── prompt-router.js             ← UserPromptSubmit hook：任務路由器（subagent/skill/model 建議）
│       └── pre-tool-guard.js            ← PreToolUse hook：AGENTS.md 硬規則守護（Write/Edit/Bash）
├── artifacts/                           ← /cl-flow 執行時生成（已納入 .gitignore，不版控）
│   └── {flow_id}/                       ← 每次 /cl-flow 產生獨立資料夾
│       ├── task-brief.md
│       ├── state.json
│       ├── px-report.md
│       ├── ag-plan.md
│       └── cl-final-plan.md
├── archive/                             ← 專案層級舊版備份
│   ├── README.md                        ← 備份與歸檔政策
│   ├── v39-aom.md                       ← 已廢棄的 V39 AOM 指令（原 .fhs/ai/commands/）
│   ├── v33_original_script.js           ← V33 原始腳本（歷史參考，從 Maintenance_Tools 封存）
│   └── test_audit_0695346.py            ← 訂單審計一次性測試腳本（封存）
└── tmp/                                 ← 臨時檔案（不納入 git）

註：node_modules/、tmp/ 與 .* 開頭之隱藏檔案為系統環境自動生成，禁止 AI 任意修改或刪除。
