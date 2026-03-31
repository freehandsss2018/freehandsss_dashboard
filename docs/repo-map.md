freehandsss_dashboard/
├── README.md                            ← 專案總覽
├── CLAUDE.md                            ← Claude Code 入口
├── ANTIGRAVITY.md                       ← Antigravity 入口
├── .cursorrules                         ← Cursor IDE 系統規則（勿移動）
├── .impeccable.md                       ← Impeccable 設計 Skills 配置（勿移動）
├── .env                                 ← 環境變數（禁止 commit）
├── .env.example                         ← 環境變數範例
├── .gitignore                           ← Git 忽略規則
├── Changelog.md                         ← 系統版本變更記錄
├── package.json / package-lock.json     ← Node.js 依賴
│
├── Freehandsss_Dashboard/               ← Dashboard UI 核心區（HTML + 產品快取）
│   ├── Freehandsss_dashboard_current.html  ← ⚠️ 正式環境（手動上傳 NAS，禁止程式覆蓋）
│   ├── freehandsss_dashboardV36.html       ← 當前開發版本
│   ├── products.js                         ← 前端產品快取
│   └── products.json                       ← 前端產品快取（JSON 格式）
│
├── .fhs/                                ← FHS 專案幕後系統（隱藏）
│   ├── README.md                        ← 幕後系統總綱
│   ├── ai/                              ← 共用 AI 配置區
│   │   ├── README.md                   ← AI 指揮系統說明
│   │   ├── AGENTS.md                   ← 憲法層 v1.4.0
│   │   └── commands/
│   │       ├── README.md               ← 指令索引
│   │       ├── read.md
│   │       ├── a3go.md                  ← /cl-flow 最終報告（verdict only，NO-TOUCH）
│   │       ├── execute.md               ← /execute 唯一正式執行入口（v2.1 新增）
│   │       ├── fhs-check.md
│   │       ├── commit.md                ← 宣告結束與記憶同步（Commit 記憶引擎）
│   │       ├── error-eye.md             ← 錯誤監控（Catch-Push-Diagnose）
│   │       ├── guardian.md              ← 全端守護稽核（Anti-Tunnel Vision）
│   │       ├── px-audit.md              ← 外部審查（第三方審計員）
│   │       └── fhs-audit.md             ← 系統架構衛生稽核（21項，5大檢查）
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
├── Maintenance_Tools/
│   └── run_all.py
├── perplexity-mcp-server/               ← Perplexity MCP 整合伺服器
├── scripts/                             ← 輔助腳本
├── archive/                             ← 專案層級舊版備份
│   └── README.md                        ← 備份與歸檔政策
└── tmp/                                 ← 臨時檔案（不納入 git）

註：node_modules/、tmp/ 與 .* 開頭之隱藏檔案為系統環境自動生成，禁止 AI 任意修改或刪除。
