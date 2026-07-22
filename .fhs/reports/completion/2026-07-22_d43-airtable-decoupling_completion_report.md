# 完成記錄：D43 — Airtable 全面剝離停用，Supabase 正式翻轉為唯一 SSoT（S187）

**日期**：2026-07-22
**執行者**：Claude Code（Sonnet 5 規劃+執行／Perplexity+Gemini 對抗評審／opus 獨立驗收）
**授權**：Fat Mo「將airtable 從系統中剝離停用，只保掛將來能再次連結的設定」指示 → `/cl-flow`（flow_id `2026-07-22-1058`）→ Fat Mo「批準」→ `/execute`
**決策記錄**：`decisions.md` D43

## 一、背景

Airtable 月度 API 額度爆（HTTP 429），已阻塞落單流程逾 12 小時（`test5001`/`test9002` 兩張測試單卡死）。Fat Mo 裁決全面剝離，只保留可重連設定，直至另行通知。

## 二、改動清單（全部已上線並 live 驗證）

| # | 改動 | 位置 | 驗證 |
|---|---|---|---|
| 0 | 修復 `Mirror Delete to Supabase` 表達式缺 `=` 前綴（一直靜默 0-row match） | n8n `6Ljih0hSKr9RpYNm` | 測試單 delete，`deleted_at` 實際被設置 |
| 1 | SKU 查詢/落單/刪單三分支斷 Airtable connection，改駁 Supabase | n8n `6Ljih0hSKr9RpYNm` | execution 4908/4909，executed nodes 零 Airtable |
| 2 | 判斷邏輯由 `.startsWith('rec')` 改用 `Order_Item_Key` 業務欄位判斷；順手修復 `Chunk Main_Orders` 孤兒連線；發現+修復平行 Code node 打 axios 崩潰 task runner | n8n `RPbUmSVvfVEvlyX4` | item+main 兩種更新真實觸發，Supabase 行核實變更 |
| 3 | `search Airtable Main_Orders`→Supabase 直連 | n8n `4m864MZ6pp1FjWu2` | 已知單/唔存在單兩種情況核實 |
| 4 | `id` 語意由 Airtable rec ID 改 Supabase 業務字串，`Order_Items_Links` 陣列匹配改 `order_fhs_id` 分組 | n8n `9c5hQNzSfjSOIZ1Q` | 44 單/103 品項同 Supabase 精確吻合 |
| 5 | 保留 JS 聚合邏輯，資料源改 Supabase，加分頁保護 | n8n `uQKtGDupMBnSygr3` | 年度總額同 `SUM()` 零誤差 |
| 6 | `Log to Airtable`→Supabase `error_logs` | n8n `8WbbEqZpiWu0CB1o` | 手動 REST 重現核實欄位映射 |
| 7 | 新建 `system_config` 表 + `update_system_config()` RPC，`loadSystemConfig`/`saveSeqSettings` 改駁 Supabase | migration `0060` + Dashboard | RLS 實測擋直接 UPDATE，放行 RPC |
| 8 | 拆走 429 重試邏輯 + 額度面板改「已停用」+ 2 個顯示文字殘留清理 | `current.html`+`V42.html` | 瀏覽器實測 `fetchGlobalReview`/`sysRefreshPanel` 零 console error |
| 9 | AGENTS.md v1.7.0→v1.7.1、FHS_Prompts.md v1.10→v1.11、decisions.md D43 | 治理文件 | fresh-context opus read-back 核實 |

## 三、順手修復嘅 5 個獨立 pre-existing bug

全部係「改緊嗰段代碼順手發現」，非預先規劃：
1. `Mirror Delete to Supabase` 表達式缺 `=` 前綴
2. n8n HTTP node 響應 0 筆時唔觸發落游 node（缺 `alwaysOutputData`）
3. n8n 兩個 Code node 平行分支同時打 axios 令 NAS task runner 崩潰
4. `orders.process_status` 係嚴格 enum，同 `order_items` 值域唔同，會累街整批更新（已加 try/catch）
5. 前端 `saveAdjustmentAmount()` 早已誤當 `o.id`=Supabase order_id（Step E 前一直靜默失效，Step E 完成後自動修復）

## 四、驗收（finance-gatekeeper §5 強制，非自驗）

派 fresh-context agent（`model: opus`）獨立覆核，唔信 decisions.md 字面記錄，重新 live 觸發全部 6 個 workflow webhook + 直查 Supabase 交叉核對（含新建測試單、全量核對 GlobalReview 44 單/103 品項、Financial Overview 年度總額零誤差、`system_config` RLS 實測）。5 大項全 PASS，總體 verdict：完整正確。詳細報告已併入 `decisions.md` D43「驗證」段。

## 五、技術債（已記錄，非本次處理）

- `Financial Aggregator` JS 邏輯未實作 3-layer revenue fallback，同 `get_financial_kpis`/`get_financial_charts` RPC 存在數字分歧風險
- Supabase Service Key 直接寫喺多個 n8n HTTP node（Phase 1 已有先例，屬全系統既有模式，key rotation/least-privilege 屬獨立安全強化專案）
- `system_config.last_id` 暫存 hardcode 預設值 `06000`（Airtable 429 期間無法查證原值），需 Fat Mo 經設定面板手動核實

## 六、後效同步稽核

- [A] 結構變動：不觸發（`git status` 全為 `M`，無新增/刪除/移動追蹤檔案；`artifacts/` 目錄 gitignored）
- [B] 制度層變動：觸發（AGENTS.md 修改）→ 本報告
- [C] CHANGELOG：觸發（重大制度規則變更）→ 已補 Session 187續VII 條目
- [F] FHS_Prompts.md：觸發（AGENTS.md 核心業務語義修正）→ 情境二十一措辭同步，v1.10→v1.11
- [G] 運算邏輯變動：不觸發——本次全部改動屬資料源/連線層（哪個 API 提供資料），無任何 n8n Calculate/Mirror 節點嘅計算公式、Dashboard `calculatePricing`、或 `cost_configurations` 資料值被改動。`system_config` migration 含 `CREATE OR REPLACE FUNCTION` 曾誤觸發 `.kgov-pending`，經核實該 RPC 純操作性（訂單序號 KV），零財務欄位，已確認為 false positive 並清除

【交付前雙紀律自檢】
驗收：n8n 部署 + 財務相關 → fresh-context opus 獨立 live 驗證，5 大項全 PASS
Subagent：✅ Explore（初期調查）+ general-purpose model:opus（強制第二意見）
