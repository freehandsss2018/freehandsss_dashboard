# 完成記錄：D49 — 大寶/成人/家庭三對象轉V2三層成本模型

> flow_id: `2026-07-28-1121`／執行：Claude Code Sonnet 5／2026-07-28

## 一、任務背景

S189（見 `FHS_System_Logic_Overview.md` §5.4.6）將 V2 統一成本模型 Phase0-3 落地，但範圍限定嬰兒 tier。Fat Mo 明確要求下個 session 接續，將大寶/成人/家庭三個對象全面轉入 V2 模型。

## 二、規劃階段（/cl-flow）

- Step 0 /rp 精煉：識別 structural_warning（Q3家庭composite融入方案＋歷史回填範圍為開放決策點）
- A3 草案：全部經 live 查證（Dashboard 代碼行號、Supabase products/cost_configurations、n8n live 節點代碼）
- A2 Gemini 對抗評審（A1 Perplexity 因 quota 超限 degraded）：7 條批評，採納 6、拒絕 1（附 live 代碼反證）
- Verdict：`CONDITIONAL_READY`

## 三、Fat Mo 質詢與兩輪拷問修正（關鍵轉折）

Fat Mo 質詢「建議依據是否經財務專檔/產品定義核實」，促使 A3 逐條補做權威文件核證，過程揪出 A3 自身兩個錯誤：

1. **誤讀 Cost Schema v2 §3.3**：原文「成人1對+N個嬰兒/大寶**肢**」被 A3 讀成「N個**人**」
2. **Q3 首輪裁決（拆行複用SKU）物理前提錯誤**：家庭組合鎖匙扣係一件整合飾品（成員印同一塊大牌），拆行會重複計物料

Fat Mo 兩輪口述定案家庭組合完整業務定義（此前三份權威文件從缺，本次首次落檔）：只限鎖匙扣；嬰兒/大寶倒模為核心；S系＝必選玻璃瓶(家庭)；成人一對手一次過計；每部位S/P全自動推導；大牌$150+環扣$10=$160；qty=複製塊數。

## 四、最終裁決（Phase A）

| 決策 | 結果 |
|---|---|
| Q1 大寶身份 | 建8個大寶專屬V2 SKU（成本=嬰兒tier） |
| Q2 大寶standalone語義 | 新語義「大寶(P)」，廢止舊「升格家庭(P1)」規則 |
| Q3 家庭combo融入式 | 單行+n8n動態畫圖（非拆行） |
| β混型 | 正式啟用，取代Cost Schema §3.3舊defer聲明 |
| 歷史回填 | 不回填（僅1行受影響且原數字正確） |

## 五、執行內容

### Supabase（migrations 0081+0082）
- 0081：8個大寶V2 SKU + 2個家庭V2 SKU（塊牌成本$160）+ `material_cost_keychain_family=150`成本鍵 + `order_items.family_member_config` JSONB欄 + `fhs_verify_new_sku_costs()`擴充 + `sync_order_to_mirror()` RPC擴充
- 0082（**執行中即時發現並修正0081自身錯誤**）：0081原註解誤稱「position_code CHECK值域無需改動」，實測live CHECK僅准四個舊值，大寶新值（大寶左手等）會被拒絕，動手n8n代碼前即時補CHECK擴充

### n8n（3節點，經MCP `update_node_code` dry-run驗證後正式寫入，自動備份）
- `Parse Items & Generate SKU`（V47.13→V47.14）：新增`Family_Member_Config`透傳
- `Calculate Profit & Pack Items`（V47.23→V47.24）：`getPositionCode()`重寫（大寶獨立字串）+ `getDrawingRateForV2Sku()`大寶明確分支 + 家庭動態畫圖分支
- `Supabase Mirror Prep`（V47.15→V47.16）：新增`family_member_config`透傳

### Dashboard（`freehandsss_dashboardV42.html`，dev版限定）
- 大寶K/M真實提交+估價鏡像4區塊轉V2
- 家庭combo 2區塊改單行V2 + `Family_Member_Config`
- `getFamilyComboDetails()`全面改寫，新增`_fhsFamilyLimbMode()` S/P全自動推導
- 新增防呆（`syncToAirtable()`硬阻擋 + `calculatePricing()`估價側警示），取代舊S→P升格邏輯

### 權威文件（6份，經fresh-context subagent獨立覆核）
`FHS_Product_Definition.md`（新增§3.3a）／`FHS_Product_Cost_Schema_v2.md`（新增§10.6，v2.3.0→v2.4.0）／`FHS_Finance_Bible.md`（§五B擴充，v1.4.1→v1.4.2）／`n8n/Quadruple_Sync_Field_Map.md`（v2.0→v2.1）／`finance-gatekeeper/SKILL.md`（v1.8.0→v1.9.0）／`FHS_System_Logic_Overview.md`（新增§5.4.8）

## 六、驗證

### Live webhook 對抗測試（6項，全PASS，測試單即時清理）
| 測試 | 結果 |
|---|---|
| 大寶(S)鎖匙扣 qty=4 | `item_base_cost=820`（205×4，防漏乘） |
| **嬰兒左手+大寶左手同單**（A2/#1核心） | 兩行各自`drawing_charged_count=1`獨立收費，冇跨對象撞位 |
| 家庭S系（adult S+baby S） | `item_base_cost=330`（160+110+60） |
| 家庭β混型（adult P+baby S） | `item_base_cost=460`（160+240+60） |
| 家庭S2兩部位 | `item_base_cost=390`（160+110+60+60） |
| 舊SKU regression | `item_base_cost=500`不變（S189已知基準） |

### 過程中即時揪出並修正兩個真實bug
1. migration 0081 CHECK值域錯誤（見上）
2. `Parse Items & Generate SKU`節點漏轉發`Family_Member_Config`，令家庭動態畫圖恆為0，即場修正（V47.14）——此為 live webhook 測試（非純代碼審查）揪出嘅真實 production bug，證明測試方法論嘅必要性

### Browser UI 互動驗證
真實DOM click切換玻璃瓶款式+勾選家庭combo/大寶區塊，`window.fhsCurrentPricingItems`檢視確認`Family_Member_Config`/SKU/`FatMoCost`全部正確；防呆（關閉主套裝）即時顯示紅色阻擋。全程console零錯誤。

### 文件同步獨立覆核
派 database-reviewer subagent（fresh-context）獨立核對6份文件+Supabase live數據交叉一致性，結論：零缺口。

## 七、已知未完成項（非阻擋，列backlog）

- 舊家庭靜態SKU（S1/S2/P1/P2命名，~323行）保留未刪，列 `/fhs-slim` 遠期處理
- 家庭吊飾catalog SKU為死貨標記但未實際下架
- 配件-玻璃瓶款式後端驗證（S189已知backlog）仍未做
- `current.html` 未升格部署（另需 Fat Mo 授權）

## 八、相關檔案

- `artifacts/2026-07-28-1121/cl-final-plan.md`（完整規劃+批評處理表）
- `.fhs/notes/decisions.md` D49
- `.fhs/notes/FHS_System_Logic_Overview.md` §5.4.8
- `supabase/migrations/0081_family_baby_v2_cost_model.sql`、`0082_expand_position_code_check_for_elder.sql`
