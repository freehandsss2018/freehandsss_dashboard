# FHS Lessons INDEX

> **剛性規則（受 execute.md [B] 稽核約束）**：
> 凡新建 `lesson-*.md` 或任何 lesson 檔案，**必須同步在本表末尾追加一行**，
> 否則 session 不得視為正式收尾。格式嚴格遵守下方表格，勿跳行或重排。

<!-- 格式範本（複製此行填入）：
| YYYY-MM-DD | 檔名.md | 主題（≤10字） | 關鍵字（逗號分隔） | 一行摘要（≤30字） |
-->

| 日期 | 檔案 | 主題 | 關鍵字 | 摘要 |
|------|------|------|--------|------|
| 2026-07-22 | 2026-07-22_n8n-code-node-and-expression-pitfalls.md | n8n Code node 平行崩潰+表達式`=`前綴+HTTP零結果 | n8n, expression, code-node, axios, task-runner | url等字串參數缺`=`前綴會靜默送純文字；HTTP node 0筆結果落游不執行需alwaysOutputData；兩個Code node平行打axios可致task runner崩潰改行序列鏈 |
| 2026-07-17 | 2026-07-17_charm_cost_ledger_drift_and_missing_chain_rule.md | 吊飾成本雙數簿漂移+頸鏈規則缺失 | finance, n8n, cost-drift, necklace-chain, migration-0046 | products.total_base_cost凍結舊值vs cost_configurations新值長期漂移；頸鏈$100規則從未落實n8n |
| 2026-07-04 | 2026-07-04_docs-changelog-duplicate-cleanup.md | docs/CHANGELOG.md 重複檔案清理 | changelog, duplicate, frontmatter, repo-map | 分岔複本判斷法：metadata 可能比內容還舊，需比對實際內文最新日期 |
| 2026-03-20 | 20260320_1358_Memory_Engine_2.0_Architecture.md | Memory Engine 2.0 架構 | memory, notion, sync, architecture | Memory Engine V2 自動掃描 lessons/ 同步 Notion 大腦的設計決策 |
| 2026-03-21 | 20260321_History_Indexing_Fix.md | 歷史索引修復 | indexing, history, fix | 修復歷史訊息索引失效問題 |
| 2026-03-21 | 20260321_Full_Check_Report.md | 全系統核查報告 | audit, full-check, report | 全系統核查後的問題清單與修復建議 |
| 2026-03-21 | 20260321_Airtable_Data_Cleansing_V3.5.md | Airtable 資料清洗 V3.5 | airtable, data-cleansing, v3.5 | Airtable 訂單資料清洗流程與 V3.5 規則 |
| 2026-03-21 | 20260321_Final_Judgment_Protocols.md | 最終裁決協議 | protocol, judgment, governance | AI 最終裁決的協議設計與授權邊界 |
| 2026-03-21 | 20260321_UI_System_Offline_Impeccable.md | UI 離線無懈可擊 | ui, offline, resilience | UI 在離線狀態下的健壯性設計要點 |
| 2026-03-21 | 20260321_JS_Init_Bug_Context.md | JS 初始化 Bug | javascript, init, bug | Dashboard JS 初始化順序錯誤的根因與修復 |
| 2026-03-21 | 20260321_Reflex_Audit_Report.md | Reflex 稽核報告 | reflex, audit, system | 系統 Reflex 稽核報告摘要 |
| 2026-03-21 | 20260321_n8n_MCP_Activation.md | n8n MCP 啟動 | n8n, mcp, activation | n8n MCP Server 啟動流程與連線驗證步驟 |
| 2026-03-22 | 20260322_Unauthorized_Merge_Violation.md | 未授權合併違規 | authorization, merge, violation | AI 未獲授權執行合併操作的事故記錄 |
| 2026-03-24 | 20260324_PowerShell_Encoding_Corruption_Crisis.md | PowerShell 編碼危機 | powershell, encoding, corruption, chinese | PowerShell 寫入 CJK 內容出現亂碼的根因與 UTF-8 fix |
| 2026-03-24 | 20260324_Incomplete_SOUL_Recovery_Incident.md | SOUL 不完整復原事故 | soul, recovery, incident | SOUL 文件不完整復原導致系統狀態不一致的事故 |
| 2026-03-24 | 20260324_System_Management_Chaos_Reflection.md | 系統管理混亂反思 | governance, chaos, reflection | 多 AI 協作下系統管理失控的反思與改進方向 |
| 2026-03-24 | 20260324_Unauthorized_n8n_Rewrite_Incident.md | 未授權 n8n 重寫事故 | n8n, unauthorized, rewrite | AI 未獲授權重寫 n8n workflow 的事故與邊界重申 |
| 2026-03-24 | 20260324_n8n_Search_Formula_Stabilization_V45.5.md | n8n 搜尋公式穩定 V45.5 | n8n, search, formula, v45.5 | n8n V45.5 搜尋公式穩定化改動記錄 |
| 2026-03-26 | 20260326_n8n_Soul_Restoration_V45.7.4.md | n8n Soul 復原 V45.7.4 | n8n, soul, restoration, v45.7.4 | n8n V45.7.4 核心工作流完整復原記錄 |
| 2026-03-26 | 20260326_Triple_Sync_Field_Map_Ground_Truth.md | Triple Sync 欄位地圖真相 | triple-sync, field-map, ground-truth | Triple Sync 欄位映射的真實狀態與 Quadruple 遷移前置 |
| 2026-03-30 | 2026-03-30_AI_Architecture_Upgrade_v1.2.md | AI 架構升級 v1.2 | architecture, upgrade, v1.2, agents | AI 協作架構升至 v1.2 的設計決策與變更清單 |
| 2026-03-30 | 2026-03-30_System_Hygiene_Upgrade.md | 系統衛生升級 | hygiene, cleanup, system | 系統衛生檢查後的清理與規範化改動 |
| 2026-03-31 | 2026-03-31_AI_Authorization_Breach_Fix.md | AI 授權越界修復 | authorization, breach, fix | AI 越界執行的根因分析與 execute 指令邊界修復 |
| 2026-03-31 | 2026-03-31_System_Init_v131.md | 系統初始化 v1.3.1 | init, v1.3.1, system | 系統初始化流程升至 v1.3.1 的改動與驗證 |
| 2026-03-31 | 2026-03-31_GLOBAL_AI_SOP_v2.md | GLOBAL AI SOP v2 | sop, global, v2, governance | GLOBAL_AI_SOP 升至 v2 的多 AI 協作協議改動 |
| 2026-04-02 | 2026-04-02_windows_encoding_fix.md | Windows 編碼修復 | windows, encoding, utf8, fix | Windows 環境 UTF-8 編碼問題的根治方案 |
| 2026-04-02 | 2026-04-02_command_layer_sync.md | 指令層同步 | commands, sync, layer | 指令層多處配置同步失效的修復與雙份同步規則 |
| 2026-04-03 | 2026-04-03_cl-flow-v2.1-verification.md | cl-flow v2.1 驗證 | cl-flow, v2.1, verification | cl-flow v2.1 完整管道驗證記錄 |
| 2026-04-03 | 2026-04-03_command_authorization_lesson.md | 指令授權教訓 | command, authorization, lesson | /execute 唯一授權入口強制律的建立背景 |
| 2026-04-03 | 2026-04-03_fhs_audit_resolution.md | FHS 稽核解決 | audit, resolution, fhs | FHS 系統稽核後遺留問題的逐項解決記錄 |
| 2026-04-05 | 2026-04-05_subagent_engineering_installation.md | Subagent 工程安裝 | subagent, engineering, installation | database-reviewer / finance-auditor 等 subagent 安裝與配置 |
| 2026-04-07 | 2026-04-07_architecture-hygiene-px-ag-audit.md | 架構衛生 PX+AG 稽核 | architecture, hygiene, px, ag, audit | PX+AG 雙軌稽核架構衛生問題與整改方案 |
| 2026-04-10 | 2026-04-10_v39-rebuild-phase4-hookup.md | V39 重建 Phase 4 接回 | v39, rebuild, phase4, hookup | V39 Dashboard 重建 Phase 4 功能接回記錄 |
| 2026-04-18 | 2026-04-18_IG_Text_Format.md | IG 訊息格式 | ig, text, format, telegram | IG/Telegram 訊息格式規範與換行守護規則 |
| 2026-04-22 | 2026-04-22_css-specificity-and-legacy-bugs.md | CSS 特殊性與舊版 Bug | css, specificity, legacy, bugs | CSS 優先級衝突導致舊版樣式殘留的根因與修復 |
| 2026-04-22 | 2026-04-22_iphone-accordion-audit-center.md | iPhone 手風琴稽核中心 | iphone, accordion, audit, mobile | iPhone 手風琴 UI 稽核中心的問題清單與修復 |
| 2026-04-25 | 2026-04-25_financial-overview-v40-integration.md | 財務概覽 V40 整合 | financial, overview, v40, integration | V40 財務概覽模組整合設計與 Supabase 資料流 |
| 2026-04-30 | 2026-04-30_antigravity-mcp-vscode-config.md | Antigravity MCP VSCode 配置 | antigravity, mcp, vscode, config | Antigravity MCP 在 VSCode 的配置方法與 worktreeConfig 衝突修復 |
| 2026-05-03 | 2026-05-03_order-integrity-audit.md | 訂單完整性稽核 | order, integrity, audit, supabase | Supabase 訂單完整性稽核結果與缺漏欄位修復 |
| 2026-05-04 | 2026-05-04_keychain-shipping-deduction.md | 鎖匙扣運費扣減 | keychain, shipping, deduction, cost | 鎖匙扣跨部位運費共享扣減邏輯的確立記錄 |
| 2026-05-05 | 2026-05-05_Blender_Subagent.md | Blender Subagent | blender, subagent, 3d, stl | blender-3d-modeler subagent 安裝與 FHS 整合 |
| 2026-05-06 | 2026-05-06_boundary_hygiene.md | 邊界衛生 | boundary, hygiene, authorization | AI 執行邊界衛生規則重申與 /execute 唯一授權再確認 |
| 2026-05-09 | 2026-05-09_skill-import-and-report-unification.md | Skill 導入與報告統一 | skill, import, report, unification | superpowers/awesome-cc 技能導入與報告存放路徑統一 |
| 2026-05-09 | 2026-05-09_Baby_Color_TBD_Logic.md | Baby 顏色 TBD 邏輯 | baby, color, tbd, logic | Baby 產品顏色 TBD 佔位邏輯的設計與 SKU 映射 |
| 2026-05-11 | 2026-05-11_UI_UX_Optimization.md | UI/UX 優化 | ui, ux, optimization, mobile | V40 UI/UX 優化記錄，含手機 bottom-sheet 改進 |
| 2026-05-12 | 2026-05-12_AI_Accountability_Protocol.md | AI 問責協議 | ai, accountability, protocol | AI 問責協議建立背景與 Rule 3.15 根因調查強制律 |
| 2026-05-12 | 2026-05-12_Financial_Restoration_Fix.md | 財務還原修復 | financial, restoration, fix, supabase | Supabase 財務欄位還原修復記錄 |
| 2026-05-13 | 2026-05-13_Bug_Fix_Completion_Bias.md | Bug 修復完成偏誤 | bug, fix, completion, bias | AI 過早宣告 bug 修復完成的偏誤根因分析 |
| 2026-05-14 | 2026-05-14_P_Product_Badge_Debug.md | P 產品 Badge 偵錯 | p-product, badge, debug, ui | P 品類 Badge 顯示異常的偵錯過程與修復 |
| 2026-05-15 | 2026-05-15_Overview_Badge_Layout_Redesign.md | 概覽 Badge 排版重設計 | overview, badge, layout, redesign | 財務概覽 Badge 排版重設計記錄 |
| 2026-05-16 | 2026-05-16_CSV_Migration_Bug6_Fix.md | CSV 遷移 Bug6 修復 | csv, migration, bug6, fix | CSV 遷移腳本 Bug6 修復記錄 |
| 2026-05-16 | 2026-05-16_Documentation_Ecosystem_Audit.md | 文件生態系稽核 | documentation, ecosystem, audit | 全文件生態系稽核後的退役/整合/保留清單 |
| 2026-05-16 | 2026-05-16_keychain_shipping_deduction.md | 鎖匙扣運費扣減（補錄） | keychain, shipping, deduction | 鎖匙扣運費扣減規則補充記錄（件數 vs 行數釐清） |
| 2026-05-16 | 2026-05-16_order_0600802_pricing_concession.md | 訂單 0600802 定價讓步 | order, pricing, concession, 0600802 | 0600802 訂單定價讓步決策記錄 |
| 2026-05-17 | 2026-05-17_handmodel-bar-chart-subdivision.md | 手模長條圖細分 | handmodel, bar-chart, subdivision, ui | 財務概覽手模長條圖子類別細分設計 |
| 2026-05-17 | 2026-05-17_finance-mode-sql-debugging.md | 財務模式 SQL 偵錯 | finance, sql, debugging, rpc | 財務模式 Supabase RPC SQL 偵錯過程記錄 |
| 2026-05-17 | 2026-05-17_stitch_design_system_mcp_export.md | Stitch 設計系統 MCP 匯出 | stitch, design, mcp, export | Google Stitch MCP 匯出與 FHS 無害化轉換流程 |
| 2026-05-18 | 2026-05-18_n8n-nas-code-node-limits-telegram-debug.md | n8n NAS Code Node 限制 | n8n, nas, code-node, limits, telegram | NAS n8n Code Node fetch/require 靜默失敗根因與 HTTP Request 繞過方案 |
| 2026-05-19 | 2026-05-19_dom-restore-multilayer-override.md | DOM 還原多層覆寫 | dom, restore, multilayer, override | DOM 還原時多層 inline style 覆寫問題的修復記錄 |
| 2026-05-19 | 2026-05-19_antigravity-implicit-memory-behavior.md | Antigravity 隱式記憶行為 | antigravity, implicit-memory, behavior | A2 在 say-hi 後主動執行初始化的隱式記憶問題與修復 |
| 2026-05-24 | 2026-05-24_Timeout_Finally_Syntax_Safety.md | Timeout Finally 語法安全 | timeout, finally, syntax, safety | try-finally 超時清理語法安全規則 |
| 2026-06-12 | 2026-06-12_split-box-ux-and-zeroing-boundary.md | Split Box UX 歸零邊界 | split-box, ux, zeroing, boundary, v42 | V42 Split Box 互斥歸零邊界守衛設計與全格清空 UX |
| 2026-06-12 | 2026-06-12_knowledge-governance-enforcement-layer.md | 知識治理強制執行層 | kgov, hooks, 3-layer, execute-G, pitfall | 邏輯改動不更新文件導致反覆犯錯；B1+B2+D 三層防禦設計記錄 |
| 2026-06-13 | 2026-06-13_audit_ledger_four_column_unreliable.md | Audit Ledger 四欄不可靠 | audit-ledger, four-column, task-a, total_cost, pitfall, v42 | order_items 四欄 91% 空（Task A 半成品），成本顯示須以 total_cost 為真理；問題E運費扣減破壞驗證1 |
| 2026-06-19 | 2026-06-19_n8n-nas-code-node-buffer-compression-capabilities.md | NAS Code節點能力邊界精確化 | n8n, nas, code-node, buffer, compression, filesystem-v2, alwaysOutputData | Buffer/Compression節點可用（require/fetch/process仍鎖），filesystem-v2讀檔法+空陣列跳過節點兩個踩坑 |
| 2026-06-20 | 2026-06-20_n8n-google-drive-search-query-mechanics.md | Google Drive Search 查詢機制精確化 | n8n, google-drive, search, query, pairedItem, fan-out, ig-watchdog-v2 | searchMethod:query才是原始q查詢(filter.query靜默忽略)、fields須陣列、全域query接多輸入下游N倍暴增為拓樸問題非bug、pairedItem在fan-out後可靠 |
| 2026-06-20 | 2026-06-20_keychain-cost-drift-misdiagnosis-and-propagation-gap.md | 鎖匙扣成本誤判+傳播缺口 | cost, keychain, drift, products, cost_configurations, pitfall, migration-0042 | order_items成本是組裝值非單一原子,直接比對設定中心key必假性誤判;cost_configurations改值無自動回算products機制,死碼RPC已移除 |
| 2026-06-23 | 2026-06-23_cl-flow-runner-cloudflare-px-gemini-fix.md | cl-flow runner 雙API故障修復 | cl-flow, perplexity, cloudflare, fingerprinting, curl, gemini, socket-hang-up, infra | Cloudflare指紋reset Node https/urllib只放行curl(PX改curl子程序);Gemini過載走.env切model不改代碼;curl成功而Node失敗=必為指紋勿調timeout |
| 2026-06-23 | 2026-06-23_pitfall_cost_config_key_gap.md | 成本 Config Key 缺漏 | cost_configurations, alloy, baby, migration, pitfall, products | 新物料遷移未建 config key，products 硬碼平數無三層錨定；修復須同步建 key+更新 total_base_cost+查既有訂單 |
| 2026-06-25 | 2026-06-25_keychain_addon_subtotal_ignores_quantity.md | 加購鎖匙扣成本無視數量 | cost, keychain, subtotal_cost, quantity, addon, task-a, n8n, pitfall | 加購鎖匙扣 subtotal_cost/keychain_cost 停在單件$185無視quantity(qty3/4全185);正解=首件全價+加購件×N;前端禁做185×N假乘法,屬n8n計算bug歸Task A |
| 2026-06-26 | 2026-06-26_audit_ledger_honest_cost_presentation.md | Audit Ledger 誠實成本呈現 | audit-ledger, cost, honest, qty-warn, single-source, v42, pitfall, preference | 前端遇成本資料異常(未隨件數累加/四欄空)只誠實警示不製造假數(禁base×qty假乘法);展開只列真實欄位禁前端用cost_configurations重算(守單一真源);呈現vs資料分線 |
| 2026-07-04 | 2026-07-04_n8n_api_workflow_build_pattern.md | n8n API 建置手法 | n8n, api, workflow, webhook, credentials, cloudflare, pattern, pitfall | n8n workflow可全靠REST API建置測試免UI；webhook需補webhookId+人工存檔一次才註冊路由；Cloudflare封鎖屬執行環境非API服務商屬性 |
| 2026-07-05 | 2026-07-05_git-checkout-carries-uncommitted-changes-silent-merge-noop.md | Git checkout 攜帶未提交修改 | git, checkout, merge, silent, commit, pitfall | checkout會靜默帶走未commit修改跨分支，merge回報Already up to date即空合併訊號 |
| 2026-07-07 | 2026-07-07_onclick-json-stringify-double-quote-collision.md | onclick 雙引號衝突 | onclick, json-stringify, html-attribute, quote-collision, pitfall, igwatch | JSON.stringify輸出雙引號嵌入同樣雙引號分隔的HTML屬性會截斷斷裂，靜默失效不報錯；解法換單引號包裹（前提字元集安全） |
| 2026-07-07 | 2026-07-07_frontend-rpc-call-probe-before-trust.md | 前端呼叫RPC先探針 | rpc, probe, frontend, backend, supabase, pattern | 前端呼叫程式碼看起來正確不代表被呼叫的RPC存在；稽核順序應先探針後端物件存在性再信任前端邏輯 |
| 2026-07-07 | 2026-07-07_fixed-positioning-inside-transformed-parent-clipping-pitfall.md | CSS transform 容器裁剪 | transform, fixed, containing-block, clip, css, pitfall | transform 會改變 fixed 包含塊，導致滾動收合時子控制項隨之移動裁剪 |
| 2026-07-07 | 2026-07-07_micro-vector-scaling-semantic-preservation.md | 微型向量縮放語意保留 | micro-icon, vector, scale, semantic, emoji, pitfall | 轉換 CJK Emojis 為向量時，避免使用過簡化開路徑，以防微尺寸縮放下遺失手指/腳板細節與語意 |
| 2026-07-12 | 2026-07-12_rls-policy-removal-silent-2xx-write-failure.md | RLS 政策移除靜默 2xx 失敗 | rls, policy, grep-blind-spot, silent-failure, supabase, delete, pitfall | 移除anon DELETE政策後前端請求仍回200但0 rows；grep單行漏判method與URL分行呼叫；驗收須測真實資料狀態非status code |
| 2026-07-22 | 2026-07-22_migration-repo-db-drift-create-or-replace-regression.md | Migration Repo/DB Drift 回歸事故 | migration, drift, supabase, create-or-replace, pitfall, financial-rpc | apply_migration套用嘅修復未同步落repo檔案，令後續CREATE OR REPLACE照抄repo舊檔打回死碼；改RPC前須核對pg_get_functiondef同repo是否一致 |
<!-- kgov sync confirmed: Session 124 -->

