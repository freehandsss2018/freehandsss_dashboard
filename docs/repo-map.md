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
├── .claude/                             ← Claude Code 專屬配置（含橋接指令）
│
├── Freehandsss_Dashboard/               ← Dashboard UI 核心區（HTML + 產品快取）
│   ├── README.md                           ← Dashboard 目錄說明
│   ├── Freehandsss_dashboard_current.html  ← ⚠️ 正式環境（手動上傳 NAS，禁止程式覆蓋）
│   ├── freehandsss_dashboardV36.html       ← V36 穩定基準版本 (Stable Baseline)
│   ├── freehandsss_dashboardV37.html       ← V37 開發版本 (後續唯一活躍開發版)
│   ├── products.js                         ← 前端產品快取
│   ├── products.json                       ← 前端產品快取（JSON 格式）
│   └── archive/                            ← 失效版本封存區
│       ├── freehandsss_dashboardV37_OLD.html
│       ├── freehandsss_dashboardV38_OLD.html
│       └── freehandsss_dashboardV39_proto_OLD.html
│
├── .fhs/                                ← FHS 專案幕後系統（隱藏）
│   ├── README.md                        ← 幕後系統總綱
│   ├── ai/                              ← 共用 AI 配置區
│   │   ├── README.md                   ← AI 指揮系統說明
│   │   ├── AGENTS.md                   ← 憲法層 v1.4.0
│   │   ├── commands/
│   │   │   ├── README.md               ← 指令索引
│   │   │   ├── read.md
│   │   │   ├── cl-flow.md               ← /cl-flow 全自動規劃協調（v2.1.0 重心）
│   │   │   ├── ag-plan.md               ← /ag-plan 本地實施計畫（A2 專用）
│   │   │   ├── px-plan.md               ← /px-plan 外部視角計畫（A1 專用）
│   │   │   ├── execute.md               ← /execute 唯一正式執行入口（v2.1 新增）
│   │   │   ├── fhs-check.md
│   │   │   ├── commit.md                ← 宣告結束與記憶同步（Commit 記憶引擎）
│   │   │   ├── error-eye.md             ← 錯誤監控（Catch-Push-Diagnose）
│   │   │   ├── guardian.md              ← 全端守護稽核（Anti-Tunnel Vision）
│   │   │   ├── px-audit.md              ← 外部審查（第三方審計員）
│   │   │   └── fhs-audit.md             ← 系統架構衛生稽核（21項，5大檢查）
│   │   ├── subagents/                   ← FHS Subagent 文件層（2026-04-05 新增）
│   │   │   ├── OPERATING_MODEL.md       ← FHS Subagent 運作模型 v2.0（5-Layer Stack）
│   │   │   ├── README.md                ← subagents 目錄說明與雙層架構
│   │   │   ├── MANIFEST.md              ← 機器可讀 agent 清單（版本追蹤）
│   │   │   ├── install-log.md           ← 安裝歷史記錄
│   │   │   ├── vendor/                  ← lst97 原始副本（未修改，供 rollback 與比對）
│   │   │   │   ├── ui-designer.md
│   │   │   │   ├── frontend-developer.md
│   │   │   │   └── code-reviewer.md
│   │   │   └── freehandsss/             ← FHS 重寫版 v1.1.0（實際使用版本）
│   │   │       ├── ui-designer.md       ← Phase A 設計衝刺 agent（5-layer workflow）
│   │   │       ├── frontend-developer.md ← Phase B 原型建構 agent（Input Contract）
│   │   │       └── code-reviewer.md     ← Phase C 品質稽核 agent（UX checklist）
│   │   └── skills/                      ← FHS Design Intelligence 參考層（2026-04-05 新增）
│   │       └── ui-ux-pro-max/           ← FHS-curated UI/UX intelligence layer
│   │           ├── FHS_INTEGRATION.md   ← 核心整合指引（Style Library + UX Checklist + 閘門）
│   │           ├── README.md            ← 用途、角色邊界、使用場景
│   │           └── vendor/
│   │               └── SKILL.md        ← 來源說明與角色邊界聲明
│   ├── notes/
│   │   ├── README.md                    ← 筆記層總綱
│   │   ├── decisions.md
│   │   ├── todo.md
│   │   ├── session-log.md
│   │   ├── SOP_NOW.md
│   │   ├── ai_reports/                  ← AI 協作報告區（活躍）
│   │   └── completion_reports/          ← 制度任務完成記錄（v1.4.0 新增）
│   └── memory/
│       ├── README.md                   ← 記憶層與同步規範
│       └── handoff.md
│
│
├── .agents/                             ← IDE 專屬：Slash 指令與自動化工作流
├── .gemini/                             ← Gemini CLI + Impeccable Skills（勿修改）
├── .vscode/                             ← VS Code 設定
│
├── docs/                                ← 技術文件
│   ├── README.md                        ← 技術文件索引
│   ├── repo-map.md                      ← 本文件
│   ├── FHS_Blueprint.md
│   ├── FHS_Product_Bible_V3.7.md
│   ├── FHS_Prompts.md                   ← 11個業務情境劇本庫（入口路由總機，AI遇業務問題必讀）
│   ├── GLOBAL_AI_SOP.md                ← v2.2 跨環境與多代理協作協議（+ Completion Report 規範）
│   └── archive/
│       ├── README.md                    ← 歸檔政策
│       └── pre-v1.0-backup/
│
├── n8n/                                 ← n8n Workflow 配置區
│   ├── README.md                        ← n8n 配置說明
│   └── Triple_Sync_Field_Map.md         ← 三端對齊欄位地圖 V45.7.4+
├── Maintenance_Tools/                   ← 系統健康檢查與維護腳本
│   ├── README.md                        ← 維護工具說明
│   ├── run_all.py                       ← 全部測試執行器
│   ├── generate_fix_payload.py          ← 修復 Payload 產生器
│   ├── rebuild_index.py                 ← 索引重建腳本
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
│   ├── rebuild_index.py                 ← 本地索引重建
│   └── cl-flow-runner.js               ← /cl-flow 協調器（Perplexity + Gemini headless runner）
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
