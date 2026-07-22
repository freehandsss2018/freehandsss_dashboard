> ⚠️ **2026-07-22 事後更正**：本檔分析對象係 n8n `Financial Aggregator`，但 live browser 實測後發現 Dashboard 實際渲染用嘅係另一套獨立實作 `sbFetchFinancial()`（前端直呼 Supabase RPC，繞過 n8n），本檔「§一/§二 分類完全缺失」結論**不適用於用戶實際睇到嘅畫面**（嗰套實作 groups 本身正確）。真正嘅 bug 同修復記錄見 `decisions.md`「D43續完成」條目。本檔轉換層設計（選項 C）仍然按原計劃實作咗，作為 n8n fallback path 嘅正確性改善，非本次核心修復。

# Financial Overview 3-Layer Fallback 落差量化 + 轉換層設計提案

**日期**：2026-07-22
**觸發**：D43 完成記錄「技術債」§5 第一項（Fat Mo 定性「得重要」，指定新 session 優先處理）
**授權範疇**：本檔僅為量化+設計提案，**未經 Fat Mo 確認不得動手實作**（CLAUDE.md Rule 3：架構改動先提案）
**方法**：直查 live n8n workflow `uQKtGDupMBnSygr3`（REST API，非 MCP——該 workflow 不在 Phase 1 allowlist）+ 直呼 Supabase RPC 交叉核對

---

## 一、現況比對照（比 D43 完成記錄原始描述更嚴重）

D43 完成記錄原文：「`Financial Aggregator` JS 邏輯未實作 3-layer revenue fallback，同 `get_financial_kpis`/`get_financial_charts` RPC 存在數字分歧風險」。

**live 代碼實查後發現：比「未實作 3-layer」更嚴重——`groups`（分類）維度整個不存在。**

live workflow 節點鏈（webhook → 兩段 Supabase 直連 code node → merge → `Financial Aggregator`）：

```
FO Webhook → Fetch Orders (Supabase) → Collect Main Orders
           → Fetch Items (Supabase)  → Merge Datasets → Financial Aggregator → Respond
```

- `Fetch Orders (Supabase)` 只 select `order_id, appointment_at, final_sale_price, total_cost, net_profit`——**冇 select `handmodel_cost`/`keychain_cost`/`necklace_cost`**，Layer 2（成本比例分攤）需要嘅欄位連查都冇查。
- `Fetch Items (Supabase)` 只 select `product_sku, quantity`——**冇 `item_category`、冇 `item_sale_price`**，Layer 1（精確分帳）需要嘅欄位同樣冇查。
- `Financial Aggregator` 本體現行代碼（5,248 bytes，經檢查已非 repo 內 `n8n/FHS_Financial_Overview_workflow.json` 那份 V40.4 舊版本——該檔案自 D43 起已係 stale，production 代碼從未同步回 repo）：只計算 `all` 聚合（revenue/cost/profit/orders），**完全冇輸出 `groups` 鍵**；`barChart`/`pieChart` 用假數據頂替（barChart 按品項數量比例硬分攤總收入；pieChart 用寫死嘅 50/17/23/7/3% 假設「原材料/包裝/人工/運費/雜項」，同真實成本結構完全無關）。

前端 `Freehandsss_Dashboard_current.html` 早已為分類 KPI 準備好完整消費邏輯（`foUpdateKPI` line 13995：`d.groups && d.groups[foCurrentCategory] ? d.groups[foCurrentCategory] : d`；`foDrawBar`/`foDrawPie` 同款 fallback），亦已有 3 個常駐可點擊按鈕（line 4891-4893：全部/手模擺設/金屬產品）。**因為 live payload 冇 `groups`，呢 3 個 fallback 全部落空到 `: d`（即全部類別分頁都顯示同一組「全部」數字）。** 呢個唔係「有偏差」，而係「分類篩選功能對用戶而言完全唔存在——UI 睇落有得揀，實際揀邊個都係同一組數」，比預期嘅「估算誤差」更嚴重。

---

## 二、量化偏差（live Supabase RPC 直查，2026-07-22，yearly 期）

| 類別 | 應顯示（RPC 真值） | 實際顯示（因 groups 缺失而 fallback 到全部） | 偏差 |
|---|---|---|---|
| 手模擺設 revenue | $67,068.57 | $154,860（全部） | **+130.9%**（虛報 $87,791） |
| 手模擺設 cost | $6,930 | $26,791（全部） | **+286.6%**（虛報 $19,861） |
| 金屬產品 revenue | $71,750.33 | $154,860（全部） | **+115.8%**（虛報 $83,110） |
| 金屬產品 cost | $19,821 | $26,791（全部） | **+35.2%**（虛報 $6,970） |
| 全部（all）revenue/cost | $154,860 / $26,791 | $154,860 / $26,791 | 0（`all` 類別本身無偏差——3-layer 只影響分類切分，唔影響總額） |

RPC `data_quality`（yearly 期）：`avg_split_orders=8`、`metal_fallback_orders=9`（共 41 張年度單中，8~9 張混合單需要 Layer 2/3 估算分帳，其餘走 Layer 1 精確 `item_sale_price`）。

**結論**：`all` 分頁本身數字正確（同 RPC/`SUM()` 零誤差，D43 驗收已confirm）；問題 100% 集中喺「手模擺設」「金屬產品」兩個分類分頁——現時完全冇分類邏輯，UI 分頁形同虛設。

---

## 三、附帶發現：Current/Monthly/Yearly 三分頁語義位移（非本次待辦原範疇，但同一檔案內發現，一併記錄）

前端分頁按鈕文字為英文 `Current`/`Monthly`/`Yearly`（line 4869-4871），對應 `FHS_System_Logic_Overview.md` §10.1 RPC 定義：
- `current` = 本月迄今 vs 去年同期
- `monthly` = 本月完整 vs 上月
- `yearly` = 本年迄今 vs 去年同期

**live `Financial Aggregator` 實際邏輯**（讀代碼確認）：
- 輸出鍵 `current` = 本月完整 vs 上月 → 語義對應 RPC 定義嘅 `monthly`
- 輸出鍵 `monthly` = 本年迄今 vs 去年全年 → 語義對應 RPC 定義嘅 `yearly`
- 輸出鍵 `yearly` = **全部歷史訂單總和**（無日期範圍，非 RPC 三態任何一種）vs 去年全年

即：用戶撳「Current」睇到嘅其實係「本月完整」數據；撳「Yearly」睇到嘅係「歷來全部訂單總和」（隨時間單調遞增，永不重置，同「今年」概念脫鉤）。三個分頁標籤同底層邏輯錯位，非本次待辦直接範疇，但轉換層設計必須一併處理（見下）。

**根因補充**：`n8n/FHS_Financial_Overview_workflow.json`（git 追蹤檔）仍係 V40.4 Airtable 版本，同 production 代碼（已改駁 Supabase、演化出上述 current/monthly/yearly 邏輯）完全對唔上——呢個 workflow 嘅代碼多次直接喺 n8n UI 改動，從未同步備份返 repo。建議轉換層完成後，順手将 live workflow JSON 導出覆蓋 repo 內舊檔，恢復代碼可追溯性。

---

## 四、轉換層設計提案（3 個選項，等 Fat Mo 揀）

### 選項 A — n8n 內轉換層（Adapter Code Node）
`Financial Aggregator` 改為呼叫 `get_financial_kpis`/`get_financial_charts` RPC（HTTP Request 或 code node 內 axios POST `/rest/v1/rpc/...`），3 個 tab_mode × 3 個 category = 最多 18 次 RPC 呼叫（9 kpis + 9 charts），再用一個新 Adapter Code Node 將 RPC JSON 重新組裝成前端要嘅 `{current,monthly,yearly}×{groups,barChart,pieChart,breakdown,data_quality}` 形狀。
- 優點：不用寫新 SQL，改動集中喺 n8n；RPC 邏輯升級自動生效，無重複計算邏輯。
- 缺點：單次 webhook 觸發 18 次 RPC round-trip，延遲增加（需實測，估計 +1~3 秒視 Supabase 延遲）；Adapter 邏輯本身都要小心對齊欄位命名。

### 選項 B — 補全既有 JS 聚合邏輯（唔叫 RPC，本地重算 3-layer）
擴大 `Fetch Orders (Supabase)`/`Fetch Items (Supabase)` 兩個 select 欄位（加返 `handmodel_cost`/`keychain_cost`/`necklace_cost`、`item_category`、`item_sale_price`），喺 `Financial Aggregator` 內部用 JS 重寫一份同 SQL RPC 一樣嘅 3-layer fallback 邏輯。
- 優點：單次 round-trip，冇額外延遲。
- 缺點：**同一條 3-layer 公式喺 SQL（RPC）同 JS（n8n）各寫一份，雙來源永久漂移風險**——finance-gatekeeper §三B 就係為防呢類「兩處各自維護同一條方程式」而設（D40 教訓：連環四錯正正源於邏輯分散多處）。不建議作為長期方案。

### 選項 C — 新建單一整合 RPC（推薦）
新寫一個 Postgres function（例如 `get_financial_overview_full(ref_date date) RETURNS json`），內部組合現有 `get_financial_kpis`/`get_financial_charts` 邏輯（可直接呼叫現有兩個函式 3×3 次，喺 SQL 層完成組裝），一次性回傳前端要嘅完整 `{current,monthly,yearly}` 形狀。n8n 端簡化為 `Webhook → 一次 HTTP 呼叫 → Respond`，移除自製 JS 聚合邏輯。
- 優點：單一 round-trip（延遲最低）；SSoT 徹底集中喺 SQL，零重複邏輯；n8n workflow 結構最簡單、最易維護。
- 缺點：需要新寫一份 SQL function 並過 review（複雜度：組裝現有函式輸出，非重新發明成本公式，風險低於直接改 cost 邏輯，但仍需完整方程式核對 + drift 檢查慣例）。

**建議**：選項 C 長期最乾淨，同 D43 已定調嘅「Supabase RPC 為 SSoT」方向一致；若 Fat Mo 想先止血、盡快消除「分類分頁數字虛報」用戶可見問題，可先上選項 A 作為過渡（唔動 SQL，risk 較低較快），之後擇機升級選項 C 並淘汰 Adapter Code Node。**不建議選項 B。**

---

## 五、待 Fat Mo 決策的兩個獨立問題

1. **轉換層方案**：選 A（n8n 內轉換，較快較保守）／選 C（新 SQL 整合函式，長期最乾淨）／或 A 過渡後升 C？
2. **Current/Monthly/Yearly 語義位移**（§三）：維持現狀（用戶已習慣現時「Current=本月完整/Yearly=歷來總和」的實際行為，改咗數字會變）／改正對齊 RPC 定義同分頁標籤字面意思（用戶會見到 Yearly 分頁數字從「歷來總和」變成「今年迄今」，屬用戶可見變化，需要 Fat Mo 明確同意先可以動手）？

---

## 六、相關檔案清單

| 檔案 | 角色 |
|---|---|
| n8n workflow `uQKtGDupMBnSygr3`（live，非 repo 內 JSON） | `Financial Aggregator` 現行代碼所在，需經 REST API（`.env` 之 `N8N_INSTANCE`/`N8N_KEY`）讀取，MCP 唔准（Phase 1 allowlist 只放 Core_OrderProcessor） |
| `n8n/FHS_Financial_Overview_workflow.json` | repo 內舊版（V40.4 Airtable 版），已 stale，唔反映 production 代碼 |
| `Freehandsss_Dashboard/Freehandsss_dashboard_current.html` (~line 13824-14380) | 前端消費邏輯：`FO_MOCK_DATA` 結構定義（含 `groups`/`barChart[cat]`/`pieChart[cat]`/`breakdown[cat]`/`data_quality`）、`foGetTabData`/`foUpdateKPI`/`foDrawBar`/`foDrawPie`/`foSetCategory` |
| `.fhs/notes/FHS_System_Logic_Overview.md` §十 | RPC 權威定義（3-layer 公式、tab_mode 語義、category WHERE 條件、data_quality 欄位） |
| Supabase RPC `get_financial_kpis` / `get_financial_charts` | 現有已驗證嘅權威邏輯來源，轉換層設計圍繞呢兩個函式 |
| `.fhs/reports/completion/2026-07-22_d43-airtable-decoupling_completion_report.md` §五 | 原始技術債記錄（本檔為其詳細展開） |
