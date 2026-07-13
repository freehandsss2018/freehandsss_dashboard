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
├── .gitmodules                          ← Git submodule 登錄（perplexity-mcp-server，2026-06-11 補建）
├── .mcp.json                            ← Claude Code MCP server 註冊（n8n-mcp-server）
├── .eslintrc.json / .markdownlint.json  ← Lint 規則設定
├── .fhs-local/                          ← IG看門狗本機運算快取（gitignored，config/coverage/n8n_workflow快照，2026-07-05補列）
├── .trash/                              ← Obsidian vault 刪除項回收桶（空，非git追蹤，2026-07-05補列）
├── airtable-database/                   ← Airtable quota耗盡時的CSV遷移備援來源（gitignored，見scripts/migrate_from_csv.js，2026-07-05補列）
├── scratch/                             ← 個人查詢工具暫存（query_runner.html，gitignored，2026-07-05補列）
├── Temp 33/                             ← 個人3D建模工作暫存（.ztl Zbrush檔，與repo業務無關，gitignored，2026-07-05補列，建議另尋位置存放）
├── repomix-output.txt                   ← repomix 打包輸出（gitignored，供cl-flow-runner.js AG代碼上下文提升用，2026-07-05補列）
├── Changelog.md                         ← 系統版本變更記錄（唯一活躍版本；docs/CHANGELOG.md 分岔複本已於 2026-07-04 刪除）
├── package.json / package-lock.json     ← Node.js 依賴
├── skills-lock.json                     ← `npx skills` 安裝紀錄（S170 新增，記錄 mattpocock/skills 4支上游版本，供日後 update 對照）
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
│   │   ├── 0017_save_structured_items_rpc.sql ← save_structured_order_items RPC，Mode 2 原子化寫入（2026-05-27）✅ 已部署
│   │   ├── 0018_protect_overridden_text.sql   ← sync_order_to_mirror V47.11 guard（is_text_overridden CASE）（2026-05-27）✅ 已部署
│   │   ├── 0019_add_light_addon_product.sql   ← products 表加入燈飾 - 加購 $80，解 FK 23503（2026-05-27）✅ 已部署
│   │   ├── 0020_financial_settings_system.sql ← cost_configurations + financial_batch_logs + recalc_requested_at + 3 RPC（2026-05-27）✅ 已部署
│   │   ├── 0021_batch_recalc_execute_rpc.sql  ← fhs_batch_recalc_execute RPC，供 n8n 批量財務重算（2026-05-28）✅ 已部署
│   │   ├── 0022a_cost_config_v2_schema.sql    ← cost_configurations v2.1 schema（4 欄位 + 17 keys）✅ 已部署
│   │   ├── 0022b_cost_config_v2_rpc.sql       ← 樂觀鎖 RPC + fhs_sync_products_from_config ✅ 已部署
│   │   ├── 0023_main_products_seed.sql        ← 主力 30 SKU 靜態 seed（G4 CI Fix）✅ 已部署
│   │   ├── 0024_recalc_completed_at.sql       ← orders.last_recalc_completed_at + fhs_batch_recalc_execute v2（G6）✅ 已部署
│   │   ├── 0025_cost_atoms_seed.sql           ← P1 原子成本補完：3 新 key（頸鏈$100/吊飾運費$35/混合$300）+ P0 語義修正 ⏳ 待部署
│   │   ├── 0026_b1_cost_atoms_complete.sql    ← B1 引擎補完：UPDATE necklace 0→260/316；INSERT adult鎖匙扣135×2 + 環扣10；display_name 補（嬰兒）✅ 已部署
│   │   ├── 0027_order_items_cost_breakdown.sql ← Task A 前置資產：order_items 四分量欄（DEFAULT 0，待 Task A 顆粒化 roll-up 填值）✅ 已部署
│   │   ├── 0028_sync_rpc_four_cost_columns.sql ← Task A 收尾：sync_order_to_mirror RPC 支援 4 個成本欄位填值（由 n8n 寫入）✅ 已部署
│   │   ├── 0029_add_archive_favorite_columns.sql ← V42 封存/最愛：orders.is_archived / is_favorite / archived_at / meta_updated_at ⏳ 待 Fat Mo 執行
│   │   ├── 0030_fix_3d_frame_base_costs.sql ← 立體擺設 products.total_base_cost 修正：4 SKU 由 0 → 210（Session 65 根因修復）⏳ 待 Fat Mo 執行
│   │   ├── 0031_expense_logs.sql            ← expense_logs 表（Log Sheet Phase 1，Session 80/81）✅ 已部署
│   │   ├── 0032_delivery_reminders.sql      ← VIEW v_delivery_reminders（交貨期 SLA 90/126天，HKT，Session 82）✅ 已部署
│   │   ├── 0033_delivery_reminders_item_filter.sql ← VIEW 強化：全 items Done 自動豁免警告（Session 83）✅ 已部署
│   │   ├── 0034_sync_rpc_add_engraving_text.sql ← sync_order_to_mirror RPC 補 engraving_text 持久化（鎖匙扣/吊飾刻字失效根治，Session 84）✅ 已套用（Management API，has_engraving=true 驗證）
│   │   ├── 0035_fix_rpc_b1_b6_financial_kpis_charts.sql ← get_financial_kpis + get_financial_charts 全面重建（B1-B6 6 指標，Session 85）✅ 已部署
│   │   ├── 0036_fix_rpc_b3_qty_deleted_at_guard.sql ← qty 子查詢 8 條補 deleted_at IS NULL 守衛（Session 90）✅ 已部署
│   │   ├── 0037_add_item_sale_price_and_backfill.sql ← order_items 加 item_sale_price NUMERIC + balanceSplitData 存量補填（Session 90/91）✅ 已部署
│   │   ├── 0038_update_rpc_item_sale_price_3layer.sql ← get_financial_kpis 3-layer fallback（item_sale_price→成本比例→平均分） + data_quality 欄位（Session 90/91，applied via MCP，本地檔待補）✅ 已部署
│   │   ├── (0039-0041 本地檔缺漏，Session 90-99 applied via MCP 未補建，待後續任務補登 repo-map)
│   │   ├── 0042_drop_dead_recalc_and_cost_drift_check.sql ← DROP 死碼 recalculate_product_costs（v1 schema 遺留，引用不存在欄位必報錯）+ CREATE fhs_check_product_cost_drift()（唯讀比對 products.total_base_cost 與成本原子組裝值，範圍限定嬰兒S/P不銹鋼鎖匙扣，Session 112）✅ 已部署
│   │   ├── 0043_ig_watchdog_alerts.sql ← IG 看門狗警報表（Session 119）：ig_watchdog_alerts 表 + SECURITY DEFINER RPC fhs_resolve_ig_alert + RLS anon 只讀 + expression UNIQUE INDEX dedup + pg_cron 90天 TTL ✅ 已部署
│   │   ├── 0044_audit_logs.sql ← 綜合審計日誌（Session 124）：audit_logs 表 + RLS anon 只讀 + 3 索引 + RPC fhs_query_audit_logs + 升級 fhs_upsert_cost_config 加寫 audit（原子同交易）✅ 已部署
│   │   ├── 0045_keychain_cost_rpc.sql ← S124 v2：fhs_compute_keychain_cost(material, qty, drawing_fee) RPC，加購鎖匙扣成本單一真源（N飾維度，Session 124）✅ 已部署
│   │   ├── 0046_drift_function_n_figurines.sql ← S124 v2：fhs_check_product_cost_drift() N飾擴充，比對公式由 flat(185/235) 改為 fhs_compute_keychain_cost 動態計算（Session 124）✅ 已部署
│   │   ├── 0047_order_cost_override.sql ← S130 Phase B：orders.cost_override_locked(BOOLEAN) + fhs_adjust_order_cost RPC + fhs_unlock_order_cost RPC + fhs_apply_financial_batch_update 守衛 + fhs_batch_recalc_execute 守衛（Session 130）✅ 已部署
│   │   ├── 0048_cost_config_value_check_constraint.sql ← S147：cost_configurations 新增 chk_config_value_numeric_nonneg CHECK 約束（number 型 config_value 須為非負數字字串），Phase 3 治理優化 Stage 3 pre-Stage-3-A 審計 F4 修正（Session 147）✅ 已部署，live 驗證通過
│   │   ├── 0049_fhs_write_expense_log_rpc.sql ← S150 F2：記錄中心寫入主路徑 RPC fhs_write_expense_log（Session 150，本地檔案 S168 依 live pg_proc 定義補回填）✅ 已部署
│   │   ├── 0050_ig_watchdog_verified_ok_check.sql ← S150 Phase4 (P1a)：ig_watchdog_alerts.kind CHECK 擴充 'verified_ok'（Session 168）✅ 已部署
│   │   ├── 0051_orders_anon_policy_cleanup.sql ← S150 Phase5 (P1b)：orders anon 權限收斂，(a)項誤刪 orders_anon_delete 已由 0052 回滾，僅 (b) UPDATE 去重生效（Session 168）✅ 已部署
│   │   ├── 0052_restore_orders_anon_delete.sql ← 修正 0051 誤刪，回滾 orders_anon_delete 政策（Session 168，fresh-context opus 抓出 CRITICAL 回歸即時修復）✅ 已部署
│   │   ├── 0053_create_ig_messages_table.sql ← P2a（S150 §4.8 剝離範圍獨立 /cl-flow flow_id 2026-07-13-1224）：ig_messages 表，RLS anon 只讀 + dedup 唯一索引 + pg_cron 90天 TTL，content 一律經 lib/order-match.mjs redactPii() 遮罩（Session 171）✅ 已部署
│   │   ├── 0054_create_content_mismatch_table.sql ← P2b：content_mismatch 比對證據表，RLS anon 只讀 + dedup 唯一索引 + pg_cron 90天 TTL，僅 amount_mismatch（品項比對留待未來擴充 Fetch Orders 節點）（Session 171）✅ 已部署
│   │   ├── 0055_ig_watchdog_content_mismatch_check.sql ← P2b：ig_watchdog_alerts.kind CHECK 擴充第四值 content_mismatch（Session 171）✅ 已部署
│   │   └── 0056_igwatch_alerts_on_conflict_fix.sql ← Write Alerts on_conflict 修復（task_e3a60daa）：order_id_key generated column 具現化 COALESCE(order_id,'')，淘汰 expression index ix_igwatch_alerts_dedup 改建純欄位 unique index ix_igwatch_alerts_dedup_v2（Session 171續）✅ 已部署
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
│   │   ├── db-query.md         ← /db-query Bridge → vendor/awesome-cc/read-only-postgres（2026-05-09）
│   │   ├── rp.md               ← /rp Bridge v2.3（精煉引擎，獨立可用，2026-05-30）
│   │   ├── ag-flow.md          ← /ag-flow Bridge（精煉內建→A1+A2，AG裁決，2026-05-30）
│   │   └── upload-web.md       ← /upload-web Bridge（WebDAV 部署至 NAS /web，2026-06-08；AG 橋接亦在 .agents/workflows/）
│   │   [已退役] tdd-guide / debug-guide / five / mermaid / code-analysis（方法論移植至 subagent，2026-05-30）
│   ├── skills/                  ← Claude Skills 發現層（2026-07-03 新增，Desktop App 收斂 Phase 2.1）
│   │   ├── [22 支] normalize/onboard/polish/animate/clarify/audit/... ← 複製自 .gemini/skills/（活體 master，新技能只落此處）
│   │   ├── fhs-bug-triage/          ← 橋接 .fhs/ai/skills/fhs-bug-triage/SKILL.md
│   │   ├── fhs-p-product-display/   ← 橋接 .fhs/ai/skills/fhs-p-product-display/SKILL.md
│   │   ├── fhs-overview-badge-layout/ ← 橋接 .fhs/ai/skills/fhs-overview-badge-layout/SKILL.md
│   │   ├── finance-gatekeeper/      ← 橋接 .fhs/ai/skills/finance-gatekeeper/SKILL.md（description 欄位橋接層新增）
│   │   └── [4支] grilling/grill-me/grill-with-docs/domain-modeling ← mattpocock/skills 選裝吸收（2026-07-12 S170，`--copy` 非 symlink），非整包安裝；domain-modeling 為 FHS-FORK（ADR 落點改指 .fhs/notes/adr/），召喚詞見 .fhs/notes/grilling-quickcard.md；決策 decisions.md D27
│   └── settings.json           ← hooks 配置（SessionStart/UserPromptSubmit/PreToolUse）
│
├── Freehandsss_Dashboard/               ← Dashboard UI 核心區（HTML + 產品快取）
│   ├── README.md                           ← Dashboard 目錄說明
│   ├── Freehandsss_dashboard_current.html  ← ⚠️ 正式環境（穩定運行中；2026-07-05 grep 實測含 igwatch 標記 29 處，內容已含 V42 功能，非 V41）
│   ├── freehandsss_dashboardV42.html       ← ✅ Production（Session 115 升格）：手機訂單總覽 WhatsApp/Threads 視覺觸控改造；Session 119 加入 igwatch 模式（IG 看門狗警報查看 + resolve 回寫 + URL 深連結 ?view=igwatch&orderId=）
│   ├── freehandsss_dashboardV41.html       ← ⛔ 已凍結（V42 開發期間禁止改動）；穩定生產基準；成本引擎 B1+B2+Task A 完成版
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
│   │   ├── AGENTS.md                   ← 憲法層 v1.4.12（2026-06-05 Rule 3.17 雙紀律強制律；Rule 3.16 財務規則前置讀取）
│   │   ├── FHS_Finance_Bible.md        ← 財務架構聖經 v1.1.0 L1（架構不變量：Layer 2 快照、欄位歸屬、禁 trigger；2026-06-01 加 Authority header）
│   │   ├── FHS_Pricing_Bible.md        ← 定價聖經 v1.2.0 L2（§10 重構為規則 ID 可查表；2026-06-05）現行定價 HEAD
│   │   ├── FHS_Product_Definition.md   ← 產品身份 SSoT v1.0.0 L2（NEW 2026-06-05）4 類產品：立體擺設/吊飾/鎖匙扣/加購配件；§0 狀態欄強制；只回答 WHAT
│   │   ├── commands/
│   │   │   ├── README.md               ← 指令索引
│   │   │   ├── read.md
│   │   │   ├── cl-flow.md               ← /cl-flow 全自動規劃協調（v2.1.0 重心）
│   │   │   ├── ag-plan.md               ← /ag-plan 本地實施計畫（A2 專用）
│   │   │   [已退役] px-plan（外部研究已內建至 cl-flow A1，2026-05-30）
│   │   │   ├── execute.md               ← /execute 唯一正式執行入口（v2.1 新增）
│   │   │   ├── fhs-check.md
│   │   │   ├── commit.md                ← 宣告結束與記憶同步（Memory Engine，取代 /reflect）
│   │   │   ├── error-eye.md             ← 錯誤監控（Catch-Push-Diagnose）
│   │   │   ├── guardian.md              ← 全端守護稽核（Anti-Tunnel Vision）
│   │   │   [已退役] px-audit（外部研究已內建至 cl-flow A1，2026-05-30）
│   │   │   ├── fhs-audit.md             ← 系統架構衛生稽核（21項，5大檢查）
│   │   │   ├── fhs-slim.md              ← /fhs-slim 文件健康清理（L1健檢報告→方案→批准→S141紀律執行，2026-07-05 S142新增）
│   │   │   ├── ag-stitch-sync.md        ← /ag-stitch-sync Stitch UI snippet 擷取與依賴識別（2026-05-03）
│   │   │   ├── ag-ui-import.md          ← /ag-ui-import Stitch → Vanilla HTML/CSS 轉換入口（2026-05-03）
│   │   │   ├── rp.md                    ← /rp Prompt 結構化重寫 v2.3（精煉引擎，獨立可用，2026-05-30）
│   │   │   ├── upload-web.md            ← /upload-web 部署 Dashboard 至 NAS Web Station（WebDAV，2026-06-08；v1.2.0新增Step0部署前置/fhs-check檢查，2026-07-05 S143）
│   │   │   ├── ag-flow.md               ← /ag-flow 精煉內建→A1+A2，AG裁決（跳A3，2026-05-30）
│   │   │   └── new-product.md           ← /new-product 新產品跨層融入引導 v1.2.0（6步 atomic 流程 + Step 6 知識落盤 Gate，2026-06-05）
│   │   ├── governance/                  ← 模型調度制度層（Session 137，2026-07-04 新增，Fable 5 立制度）
│   │   │   ├── 00_INDEX.md              ← 索引 + 與既有制度職責邊界
│   │   │   ├── 01_diagnosis.md          ← Harness 診斷：token 洩漏/失焦/出錯 前三名（實測數字）
│   │   │   ├── 02_model-dispatch.md     ← 模型調度守則：指揮官不下場、派工三件套、model 對照表、升降級、驗證不自驗
│   │   │   ├── 03_judgment-rubrics.md   ← 判斷力外化：升級/完成/問人/換路/品質底線 五組 rubric
│   │   │   ├── 04_delegation-templates.md ← 派工 prompt 模板 ×7（搜尋/實作/重構/研究/審查/交接膠囊/fan-out）
│   │   │   ├── 05_maintenance-protocol.md ← 維護協議：權限矩陣、教訓落點、輪轉SOP
│   │   │   ├── 06_letter-to-future-sessions.md ← 給未來 session 的信
│   │   │   ├── 07_compounding-loop.md   ← 複利迴圈：教訓五階段門檻、Skills複利、平行工作流、worktree（S156 blocktempo 凍結快照）
│   │   │   └── backups/                 ← 修改既有檔案前的備份副本（帶日期）
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
│   │   │       ├── finance-auditor.md   ← v2.1.0 四端財務稽核員（v1.4.10 對齊、收款確收語義、V47.15、動態現況，2026-06-03 升級）
│   │   │       ├── tdd-guide.md         ← v1.0.0 TDD 測試驅動開發 subagent（Python + n8n 專用，2026-04-28）【指令已退役，subagent 保留】
│   │   │       ├── build-error-resolver.md ← v1.0.0 錯誤診斷（Haiku model，2026-04-28 新增）
│       │       ├── blender-3d-modeler.md ← v2.0.0 Blender 3D 建模（2026-05-07：Triage / FDM printability / HANDOFF 工具清單 / 路徑規則 / 開放藝術建模）
│       │       └── product-integration-validator.md ← v1.0.0 新產品跨層融入驗證（2026-05-21：UI/ENUM/n8n/RLS 四層 checklist + pitfalls P1-P5）
│   │   └── skills/                      ← FHS Design Intelligence 參考層（2026-04-05 新增）
│   │       ├── ui-ux-pro-max/           ← FHS-curated UI/UX intelligence layer (Consumed by: ui-designer/reviewer)
│   │       │   ├── FHS_INTEGRATION.md   ← v2.0.0 核心整合指引（--fhs-* tokens + 響應式規則，廢除雙模式）
│   │       │   ├── README.md            ← 用途、角色邊界、使用場景
│   │       │   └── vendor/
│   │       │       └── SKILL.md        ← 來源說明與角色邊界聲明
│   │       ├── finance-gatekeeper/      ← 財務知識守門員 v1.1.0（2026-06-03 升級）L1+L2a+L2b 三層路由、收款確收語義修正、技術債備忘
│   │       │   └── SKILL.md            ← 任何財務任務前強制載入（取代 finance-calculator）
│   │       ├── finance-calculator/      ← [DEPRECATED 2026-06-01] 已整合至 finance-gatekeeper
│   │       │   └── SKILL.md            ← 利潤公式、前端/n8n 優先規則（已過時，勿引用）
│   │       ├── fhs-bug-triage/          ← FHS Bug 修復完成驗證協議（2026-05-13 新增）
│   │       │   └── SKILL.md            ← 5-Gate Completion Protocol，build-error-resolver 強制執行
│   │       └── vendor/                  ← 外部 skill/tool vendor-in 區（2026-05-09 新增）
│   │           ├── superpowers/         ← 來源：github.com/obra/superpowers
│   │           │   ├── test-driven-development.md  ← TDD RED-GREEN-REFACTOR 強制機制
│   │           │   └── systematic-debugging.md     ← 四階段根因調查法
│   │           └── awesome-cc/          ← 來源：hesreallyhim/awesome-claude-code
│   │               ├── read-only-postgres.md  ← 唯讀 PostgreSQL/Supabase 查詢（Supabase 遷移驗證）
│   │               └── supabase-query.md      ← Supabase Management API CLI skill
│   │               [已刪除] hooks-setup-guide.md → `.fhs/reports/backups/hooks-setup-guide.md.2026-07-07-archived.md`（2026-07-07 S152-followup，確認孤兒無活讀者）
│   ├── notes/
│   │   ├── README.md                    ← 筆記層總綱
│   │   ├── decisions.md
│   │   ├── FHS_Mode_Card.md              ← 三模式決策卡 + 單一寫者矩陣（Desktop/Cowork/AG/Cursor，Phase 2.3，2026-07-03）
│   │   ├── knowledge-map.md              ← 知識檢索路由表（查X該去哪找，按檔案類別非個別檔案，2026-07-05 Session 144 新增）
│   │   ├── grilling-quickcard.md         ← mattpocock/skills 拷問技能中文速查卡（S170 新增，召喚詞「拷問我」/「拷問落檔」）
│   │   ├── adr/                          ← domain-modeling 技能 ADR 落點（S170 FHS-FORK，原版為 docs/adr/；lazy create，首篇 ADR 出現前不存在）
│   │   ├── todo.md
│   │   ├── session-log.md
│   │   ├── SOP_NOW.md
│   │   ├── FHS_System_Logic_Overview.md ← 系統運作總論 v1.0.0（2026-06-05 新增）前端成本/售價/畫圖費/n8n節點/IG訊息/B1標靶全記錄
│   │   └── product_pricing_reference.md ← [DEPRECATED 2026-06-01] 已合併至 FHS_Pricing_Bible.md（現位於 .fhs/ai/）
│   ├── reports/                         ← AI 產出正式報告與計劃區（2026-05-23 新增規則）
│   │   ├── README.md                    ← 報告區總綱
│   │   ├── backups/                     ← 高風險改動前的完整備份區
│   │   │   └── auto-memory-2026-07-04/  ← auto-memory 目錄瘦身前全量備份（31檔，2026-07-04 E2 新增，repo外檔案回退機制）
│   │   ├── completion/                  ← 制度任務完成記錄（含歷史備份）
│   │   ├── planning/                    ← /cl-flow 與實施計劃暫存區
│   │   │   ├── fhs_v0_desktop_probe.md  ← Desktop App 實機探針清單（11 項，Phase 0，2026-07-03）
│   │   │   ├── fhs_cowork_governance.md ← Cowork 模式治理替代方案（Phase 2.2，2026-07-03）
│   │   │   └── fhs_n8n_3brain_spec.md   ← n8n 三腦（A1 GPT/A2 Gemini/A3 Claude）介接規格，Fat Mo 人手駁接依據（Phase 3.1，2026-07-03；§十一 2026-07-04 休眠決策）
│   │   └── audits/                      ← 架構衛生與自動稽核報告區
│   ├── memory/
│   │   ├── README.md                   ← 記憶層與同步規範
│   │   ├── handoff.md                  ← 2026-07-04 S139 首次輪轉：3949→106行（僅存便攜塊+MASTER表+近5個session）
│   │   ├── archive/                    ← handoff.md 輪轉歸檔區（2026-07-04 S139 新增）
│   │   │   ├── handoff-full-until-2026-07-04.md  ← 輪轉前完整備份（3949行）
│   │   │   ├── handoff-portable-block-decisions-pre-2026-07-04.md ← 便攜塊瘦身：3條無他處收錄的決策全文歸檔（2026-07-04 S141）
│   │   │   └── handoff-portable-block-verified-pre-2026-07-04.md  ← 便攜塊瘦身：較舊「已證實」清單歸檔（2026-07-04 S141）
│   │   ├── learnings.md                ← Pattern / Pitfall / Preference distill（/read Step 3，2026-05-20 新增）
│   │   ├── pitfalls.yaml               ← Machine-readable 跨層整合 pitfall 知識庫（2026-05-21 新增，product-integration-validator 使用）
│   │   └── lessons/
│   │       ├── INDEX.md                ← Lessons 唯一檢索入口（一行式索引，2026-06-12 新增）
│   │       └── *.md                    ← 59 個教訓記錄（Notion Auto-Discovery 自動同步）
│   └── tools/                          ← 稽核工具腳本（2026-05-17 v2.1 新增）
│       ├── semantic_audit.py           ← /fhs-audit Check 7 候選偵測 MVP
│       ├── canonical_keys.yml          ← 單一真理 key 清單（agents_version / n8n_version 等），亦供 fhs-health-check.js 過時漂移偵測共用
│       ├── fhs-health-rules.json       ← L1 健康檢查規則資料檔（預算值+單位+出處，2026-07-05 S142 新增，不與 canonical_keys.yml 重複維護）
│       └── deprecated_terms.txt        ← 已廢棄詞黑名單（Triple_Sync_Field_Map / 三端同步 等）
│
│
├── .agents/                             ← IDE 專屬：Slash 指令與自動化工作流
├── .gemini/                             ← Gemini CLI + Skills (Ref: skills/frontend-design/reference/)
├── .vscode/                             ← VS Code 設定
├── .obsidian/                           ← Obsidian vault（人類視覺化圖譜，vault root = repo root，2026-06-01）
│                                            machine-specific 檔已 gitignore（workspace*.json、graph.json）
│   └── plugins/hidden-folders-access/   ← 社群外掛（2026-07-04 新增，Session 137）：白名單 `.fhs` 讓 dot-directory 於 FileExplorer/Graph/metadata cache 可見，推翻 2026-06-01 D1「.fhs 永遠不可見」限制認定，詳見 decisions.md
│
├── docs/                                ← 技術文件
│   ├── assets/                          ← 靜態資產（2026-06-01 新增）
│   │   └── FHS_Memory_Engine.png        ← FHS 記憶引擎架構圖（從 Obsidian/ 保全搬入）
│   ├── README.md                        ← 技術文件索引
│   ├── repo-map.md                      ← 本文件
│   ├── [已刪除] CHANGELOG.md             ← S63 建立的分岔複本，末條 S130 Phase B 後停更，2026-07-04 確認無獨立價值後刪除（備份於 .fhs/reports/backups/）
│   ├── [已刪除] FHS_Blueprint.md         ← 自稱必讀核心但零路由零寫回合約，13處過時腐爛無人發現；2026-07-08 S158 D20 裁決刪除（業務背景→auto-memory、§5排版鐵律→ui-ux-pro-max FHS_INTEGRATION.md Section 六；備份於 .fhs/reports/backups/）
│   ├── DESIGN.md                        ← 大地溫潤 (Earthy Warm) 設計系統規範（2026-05-17 新增）
│   ├── FHS_Product_Bible_V3.7.md        ← [DEPRECATED 2026-06-01] 多項定價規則已過時，現行定價請讀 .fhs/ai/FHS_Pricing_Bible.md
│   ├── FHS_Legacy_Migration_Notes.md    ← Excel 舊訂單遷移注意事項（缺失問題與處理方法）
│   ├── FHS_Knowledge_Map.md             ← Obsidian wikilink 圖譜索引（S137，供Graph View關聯導覽；⚠️ 勿與 `.fhs/notes/knowledge-map.md`（S144查詢路由表）混淆，兩者用途不同，2026-07-05補列）
│   ├── plan_0004_supabase_cost_migration.md ← Supabase 成本架構完整遷移計畫（2026-07-05補列）
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
│   ├── FHS_Financial_Overview_workflow.json ← 財務聚合機
│   └── templates/
│       └── fhs_delivery_reminder_push.json  ← 交貨期每日 Telegram 推送（09:00 HKT，v_delivery_reminders，Session 82）
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
│   ├── cl-flow-runner.js               ← /cl-flow 協調器（Perplexity + Gemini headless runner，模型由 GEMINI_A2_MODEL_DEFAULT 控制）
│   ├── validate-ag-plan.js             ← ag-plan 輸出格式守護（6 section + checkbox + 檔案標記驗證，保護 Verdict 鏈）
│   ├── deploy_batch_recalc_workflow.js  ← 建立並啟動 n8n 💰 Financial Batch Recalculate workflow（2026-05-28）
│   ├── repair/                          ← 財務 / 資料修補腳本（一次性，需人工確認後執行）
│   │   ├── sync_0600701.js             ← 訂單 0600701 利潤缺口修補（total_cost / net_profit NULL）
│   │   └── sync_0600903.js             ← 訂單 0600903 財務與時間修補
│   ├── hooks/                           ← Claude Code Hooks 執行層（2026-04-28 新增）
│   │   ├── session-start-sop.sh         ← SessionStart hook：自動注入 SOP_NOW + handoff 摘要
│   │   ├── prompt-router.js             ← UserPromptSubmit hook：任務路由器（subagent/skill/model 建議）
│   │   ├── pre-tool-guard.js            ← PreToolUse hook：AGENTS.md 硬規則守護（Write/Edit/MultiEdit/PowerShell/Bash/NotebookEdit，2026-07-04 S139 補洞：current.html Bash/PowerShell目標偵測 R9、sbp_/eyJ key pattern）
│   │   ├── post-tool-kgov.js            ← PostToolUse hook：知識治理自動捕捉（[G] 觸發提醒，2026-06-12）
│   │   ├── stop-kgov.js                 ← Stop hook：session 結束知識治理守衛（HARD_BLOCK=false 第一階段，2026-06-12）
│   │   ├── fhs-health-check.js          ← L1 文件健康快檢（零依賴，五病偵測，2026-07-05 S142 新增，session-start-sop.sh 末尾呼叫）
│   │   └── test/                        ← guard/health/kgov hook 特徵化測試夾具（S139 新增，S148 擴充）
│   │       ├── guard-fixtures.json      ← 12 組 tool_input 樣本 + 期望行為（含已修復缺口的回歸標記）
│   │       ├── run-fixtures.js          ← 夾具執行器：spawn guard.js 逐組斷言 exit code + stderr
│   │       ├── health-fixtures.json     ← 12 案期望結果清單（fhs-health-check.js 五病+週期到期+邊界案例，2026-07-05 S143 加cadence 2案）
│   │       ├── health-fixtures/         ← 12 個自足沙盒目錄，各含專屬 rules.json（S142新增10案+S143加cadence 2案）
│   │       ├── run-health-fixtures.js   ← 夾具執行器：env var 沙盒隔離（FHS_HEALTH_ROOT等）+ generates_fresh_evidence 動態日期夾具支援（S143），12/12 PASS
│   │       ├── kgov-fixtures.json       ← 10 組 post-tool-kgov.js 測試夾具（S148 新增）
│   │       └── run-kgov-fixtures.js     ← 夾具執行器：隔離 temp flag 檔案，10/10 PASS（S148 新增）
│   └── ig-watchdog/                     ← IG 漏單看門狗（全自動，NAS n8n 跑，Session 108→110；P2a Session 171 起會寫入 Supabase，見下方修正）
│       ├── build_n8n_workflow.cjs       ← 改規則的唯一入口：產生/更新 n8n workflow JSON（Code節點移植邏輯）
│       ├── index.mjs                    ← 本機手動工具（保留作ad-hoc深度分析，非日常必需）
│       ├── lib/decoder.mjs(+.test)      ← Meta mojibake 解碼（latin1→utf8 + U+FFFD 守衛，邏輯亦移植進n8n Code節點）
│       ├── lib/match.mjs(+.test)        ← CJK fuzzy + 🔴🟡⚪ 訊號分層（Phase 2 付款證據層，v3 降為次要）
│       ├── lib/order-match.mjs(+.test)  ← v3 訂號主鍵偵測單一真源：訂號抽取/正規化/三分類/報價守衛 + P2a新增 redactPii()/maskName()/hashId()（PII遮罩/姓名遮罩/冪等鍵雜湊）+ P2b新增 extractAmountsFromText()/compareToOrder()（金額比對，含曆年/付款尾碼誤報過濾，Session 171）（build 內嵌進n8n Code節點，diffguard.test 防漂移）
│       ├── fixtures/                    ← 合成自測資料（_gen.mjs 產生，無真實客人）
│       ├── hooks/pre-commit             ← 隱私守衛：擋含 sender_name/participants 的 JSON
│       ├── SOP.md                       ← Fat Mo 操作指南（架構說明 + 日常=看Telegram即可）
│       └── package.json                 ← ESM，零 runtime 依賴；npm test/watchdog/calibrate/selftest
│   # 自動化主體在 n8n workflow「FHS_IGWatchdog_DriveWatch」（NAS），非本機 repo 程式碼
│   # ⚠️ 客人 DM 內容只在 Google Drive↔NAS n8n 記憶體間流動，永不落本機/Git/第三方雲端
├── artifacts/                           ← /cl-flow 執行時生成（已納入 .gitignore，不版控）
│   └── {flow_id}/                       ← 每次 /cl-flow 產生獨立資料夾
│       ├── task-brief.md
│       ├── state.json
│       ├── px-report.md
│       ├── ag-plan.md
│       └── cl-final-plan.md
├── archive/                             ← 專案層級舊版備份
│   ├── README.md                        ← 備份與歸檔政策（2026-07-05補建，repo-map舊有引用曾指向不存在檔案）
│   ├── v39-aom.md                       ← 已廢棄的 V39 AOM 指令（原 .fhs/ai/commands/）
│   ├── v33_original_script.js           ← V33 原始腳本（歷史參考，從 Maintenance_Tools 封存）
│   ├── test_audit_0695346.py            ← 訂單審計一次性測試腳本（封存）
│   ├── freehandsss_financial_overview.html.deprecated ← 已停用的獨立財務總覽頁（2026-07-05補列）
│   ├── n8n_scripts/                     ← n8n workflow 建立腳本歷史版本（2026-07-05補列）
│   ├── scripts-scratch-2026-07/         ← `/fhs-audit` S145歸檔：46個一次性除錯/驗證腳本（原scripts/根目錄，2026-05-22~06-03建立，逾月無更新未列README，2026-07-05新增）
│   └── antigravity-backup-20260703.sha256.txt ← AG 全量安全快照 checksum（zip 本體 gitignored，Phase 0.1，2026-07-03）
└── tmp/                                 ← 臨時檔案（不納入 git）

註：node_modules/、tmp/ 與 .* 開頭之隱藏檔案為系統環境自動生成，禁止 AI 任意修改或刪除。
