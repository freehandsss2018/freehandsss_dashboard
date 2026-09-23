# 完成記錄：`item_sale_price` 分帳斷鏈修復 + `get_financial_charts()` 兩個口徑修正

**日期**：2026-09-23
**Flow**：`cl-flow-fast 2026-09-23-1957`
**Verdict**：CONDITIONAL_READY → finance-auditor 部署後驗收 PASS（無附帶條件）
**執行者**：Claude Code（Sonnet 5）
**授權**：Fat Mo `/execute`

---

## 一、緣起

Fat Mo 截圖訂單 0600721 分帳UI（清楚輸入「頸鏈①一對:$2980／頸鏈②一對:$2980」），質疑 2026-09-20 D79續 finance-auditor 揭發嘅「頸鏈 `item_sale_price` 全NULL」講法——UI明明有分帳輸入，點解會NULL？主對話重新派 finance-auditor 兩輪唯讀查證，揪出比原描述更完整嘅根因。

## 二、根因（finance-auditor 兩輪唯讀查證，Live SQL + n8n 源碼追蹤）

| # | 問題 | 根因 |
|---|---|---|
| ① | 頸鏈 `necklace_N` pair-key 從未被 `_splitMap` 支援 | Dashboard `calculatePricing()`（`freehandsss_dashboardV42.html:9892-9908`）頸鏈按「每2件charm一組」計價，分帳key格式 `necklace_1`/`necklace_2`，非鎖匙扣/木框嗰種位置式命名（`TEMP_{prefix}_{position}##`），n8n `Supabase Mirror Prep` 嘅 suffix 比對邏輯從未涵蓋 |
| ② | `additional_fee` 冇分帳格歸屬觸發全單棄用 | Dashboard「附加費($)」係獨立輸入格，從未落入 `depositSplitData`/`balanceSplitData`；舊版驗證基準連埋附加費一齊比對，令有附加費嘅單恆定「唔啱數」→ **全單**（非只有附加費嗰件）`item_sale_price` 棄用 |
| ③ | `get_financial_charts()` trend 漏計 `adjustment_amount` | 與 `get_financial_kpis()` 公式不一致，yearly 折線 vs KPI 差 $480 |
| ④ | `get_financial_charts()` monthly 非曆月滾動窗口 | 起點用日曆日非曆月頭，邊界月標籤同實際涵蓋範圍不符 |

**核心保證**：全部4項均**不影響 `orders.final_sale_price`**（Fat Mo實收金額，收款確收守護範圍），只影響 `order_items.item_sale_price`（品項層審計欄位）與 `get_financial_charts()` 分類/趨勢統計圖表精度。

## 三、規劃（cl-flow-fast 2026-09-23-1957）

A3草案 → AG（`gemini-2.5-flash`）對抗評審 4條批評（2MAJOR+2MINOR，冇BLOCKER）→ 全部處理：

| 批評 | Severity | 裁決 |
|---|---|---|
| 頸鏈`Quantity<=0`被誤判1件，累加位移影響後續全部頸鏈品項分組 | MAJOR | ✅採納，篩選階段排除 |
| 逐件捨入誤差累積 | MINOR | ✅採納，改整數分(cents)+餘數歸最後一件 |
| 單一測試單不足驗證R1排序假設 | MAJOR | ✅核心採納（測試擴充4組）；hash校驗機制部分視為超出範圍拒絕 |
| 硬編碼分類字面值脆弱 | MINOR | 🟡部分接納，範圍內拒絕重構（同節點其餘代碼一致慣例） |

**過程附帶事件**：Gemini 3個fallback model（3.8-flash/3.6-flash/flash-latest）同時503 high demand，即時curl probe確認3.6-flash/2.5-flash健康，`GEMINI_A2_MODEL_CHAIN`臨時env override重試成功。處理方法已落盤 `.fhs/memory/lessons/2026-06-23_cl-flow-runner-cloudflare-px-gemini-fix.md` 案例更新段 + `learnings/tooling.md` #14 + 四個master command檔（cl-flow/cl-flow-fast/ag-flow/8d）Known failure modes節（獨立commit，先於本次執行）。

## 四、執行

### [MODIFY] n8n `FHS_Core_OrderProcessor` / `Supabase Mirror Prep`（V47.16→V47.26）

- 修改A：`_splitValid` 驗證基準由 `Deposit+Balance+Additional_Fee` 改為 `Deposit+Balance`
- 修改B：新增頸鏈pair-group反查（按`Sub_Items`提交順序累加`Quantity`，每滿2件一組，cents精確分配到`item_key`）
- API PUT + `get_node` 回讀，確認同預期程式碼逐字一致，零漂移

### [NEW] `supabase/migrations/0096_get_financial_charts_adjustment_and_monthly_window.sql`

- trend子查詢新增`adjustment_amount`，對齊`get_financial_kpis()`公式
- monthly起點改`DATE_TRUNC('month', ref_date - INTERVAL '5 months')`
- `category_revenue`/`cost_breakdown`逐字不變（finance-auditor diff對比0085版確認僅3處差異，2處對應聲稱改動，1處純comment）

## 五、驗證

**主對話執行時驗證**：
- 4組真實webhook測試單（A頸鏈4件2對/B頸鏈3件1對+remainder/C混合品類/D附加費$80）全數逐項核對PASS
- 意外發現：測試SKU若非`products`表真實值會觸發`order_items_product_sku_fkey` FK違反，令**全單**建立失敗（非代碼bug，純測試資料設計問題，改用真實SKU後全數通過）
- Live直查：yearly trend/KPI profit 改前差$480、改後182246.00=182246.00完全吻合；monthly/yearly「2026-04」profit改後37530=37530完全吻合
- 6張歷史單（0500719/0600722/0600809/0600905/0600908/0650429）`item_sale_price`確認仍為NULL

**finance-auditor 部署後獨立驗收（強制，非自驗，背景派工）— PASS（無附帶條件）**：
1. `pg_get_functiondef()`直讀live定義，逐字比對migration 0096一致；與改動前版本（0085）diff僅3處差異，對應聲稱改動，`category_revenue`/`cost_breakdown`零字元差異
2. 獨立重算yearly trend vs KPI，182246.00=182246.00
3. 獨立重算monthly vs yearly「2026-04」，37530.00=37530.00
4. n8n節點審查：(a) `final_sale_price`/`net_profit`公式逐字未變 (b) 新邏輯無NaN/undefined風險（除零前置檢查、找不到group price時安全fallback至null）(c) 6張歷史單自行重查確認仍NULL
5. 抽查1張本次部署後真實生產訂單（07001013）：`final_sale_price=6380=item_sale_price加總`完全自洽，無異常
6. **結論**：`final_sale_price`（Fat Mo實收金額）沒有受影響，此為本次改動最關鍵紅線，確認守住

## 六、明確不做範圍

- `category_revenue`分類收入圖超收$12,711.5（頸鏈成本比例估算 vs 其他品類品項售價兩種口徑混用，同一混合單分攤不守恆）需 Fat Mo 先拍板分攤演算法，屬業務判斷非純技術bug，另案處理
- 已存在嘅歷史NULL單（如0600721/0600804/0600727本身）唔會被本次修復自動回填，backfill需另開`/execute`授權

## 七、後效同步稽核

- **[A] 結構變動**：新增 `supabase/migrations/0096_...sql` → 已更新 `docs/repo-map.md`
- **[G] 運算邏輯變動**：n8n Mirror節點代碼變動 + migration `CREATE OR REPLACE FUNCTION` → 已更新 `.fhs/notes/FHS_System_Logic_Overview.md` §10.26；`finance-gatekeeper/SKILL.md` 路由表核查後判斷不需加行（本次為既有RPC/節點嘅口徑修正，非新增財務規則類型）
- **[C] CHANGELOG**：已更新，見 2026-09-23 條目
- **[B] 完成記錄**：本文件

## 八、【交付前雙紀律自檢】

**驗收**：財務/成本 → `finance-auditor` live 三端驗收（本session第三次派工，部署後獨立驗收），PASS無附帶條件，附完整證據鏈（見上）
**Subagent**：✅ `finance-auditor` × 3（根因追查×2、部署後驗收×1，全部背景派工，理由：財務判斷必須獨立驗證，唔可以自驗）
