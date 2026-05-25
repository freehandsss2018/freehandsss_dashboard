# /new-product — 新產品跨層融入引導

**用途 (Purpose)**：引導 Fat Mo 完成新產品類型（SKU / 配件 / 加購品）融入 FHS 系統的五步跨層流程，確保 Dashboard UI ↔ Supabase schema ↔ n8n SKU 表三端零錯誤整合。
**版本**：v1.1.0 (2026-05-23)
**觸發**：`/new-product [產品名稱或 SKU]`
**平台**：Claude Code (A3) 專用
**根據**：2026-05-21 Bug 修復循環學習（pitfalls.yaml P1–P5）

> ⚠️ 每步均為獨立 GATE。FAIL 必須修復後才可進行下一步。不得跳步。

---

## 啟動前置

> **複合產品提示**：若新產品為多配件組合或自訂框款（如「木框套裝 4肢 + 純銀吊飾 + 加購羊毛氈」），建議先執行 `/rp /new-product [產品詳情]` 整理規格與成本結構，再進入五步流程。標準單一產品可直接跳過此步。

```
1. 確認新產品基本資料：
   - 產品名稱（中文）
   - SKU 字串（完整格式，如 "P_MAIN_STATUETTE_RESIN_1P"）
   - 是否需要新 item_status ENUM 值
   - 是否為加購配件類型（如 W_WOOL）
   - 對應的 Dashboard 下拉進度選項是否需更新

2. 呼叫 product-integration-validator 執行基線掃描：
   → 確認目前系統狀態（在任何修改前）
```

---

## 五步 Atomic 流程

### Step 1 — Supabase Schema 更新

**負責 Subagent**：`database-reviewer`
**執行範圍**：僅在需要新 ENUM 值時執行

```
1a. 確認 item_status ENUM 是否需要新值
    讀取：supabase/migrations/0001_initial_schema.sql
    現有值：'待製作', '製作中', '完成', '已取件'

1b. 若需新值：
    新建 migration 檔案：supabase/migrations/000N_add_item_status_XXX.sql
    格式：ALTER TYPE item_status ADD VALUE '新值';

1c. 若新產品需要新 products 表 SKU：
    確認 products 表有對應 INSERT（含 sku, main_category 欄位）
    → 若不加入（如加購品）：後續 Step 3 必須將 product_sku 設為 NULL
```

**Gate 1 PASS 條件**：
- ENUM 新值已在 migration 檔案中，且與 Dashboard 計畫 value 完全一致
- 若不需 ENUM 變更：直接 PASS

**Gate 1 FAIL → Rollback**：刪除新 migration 檔，不部署至 Supabase

---

### Step 2 — n8n SKU 表更新

**負責 Subagent**：`build-error-resolver`（讀取 n8n workflow JSON）
**執行範圍**：Smart Cache / SKU normalization hardcoded 表

```
2a. 找出 n8n workflow 中的 SKU hardcoded 表
    目標 workflow：6Ljih0hSKr9RpYNm（含 Smart Cache Strategist）
    找出 Parse Items & Generate SKU 節點的 Code Node

2b. 確認新 SKU 是否需加入映射表
    若新產品屬加購配件（不獨立計費）：可能不需加入 SKU 表
    若新產品是主產品：必須加入 SKU normalization 映射

2c. 確認 n8n 在遇到此 SKU 時的行為：
    - 是否會嘗試寫 product_sku FK？（若 SKU 不在 products 表 → 23503 風險）
    - sbSyncOrder 的 product_sku 欄位處理是否兼容？

2d. 確認 Supabase Mirror Prep `product_sku` 寫入安全性
    檢查 Mirror Prep 節點：`product_sku: item.Product_Name || null`
    若新產品 SKU **已在 products 表**（Step 1 已建）→ FK 安全，無需改動
    若新產品 SKU **不在 products 表**（刻意不入表的加購品）→ 
      必須在 Mirror Prep 加 guard：
      `product_sku: isAddonItem(item.Order_Item_Key) ? null : (item.Product_Name || null)`

2e. 確認 Smart Cache Strategist COST_MAP 含新 SKU 成本
    讀取 n8n FHS_Core_OrderProcessor_live.json 中 Smart Cache Strategist 節點
    搜尋 hardcoded COST_MAP / cost table（通常為 const COST_MAP = { ... } 形式）
    確認新 SKU prefix（如 "皮框套裝"）已加入對應成本條目（total_base_cost）
    若缺漏：補入對應 SKU key 與 total_base_cost 數值後重新部署節點
    ⚠️ 此步遺漏 = 新訂單成本計算返回 0（pitfalls P7 根因之一，handoff 待辦 #1）
```

**Gate 2 PASS 條件**：
- n8n 不會因新 SKU 觸發 FK 23503
- 若新產品是加購品：確認 n8n 不寫入 product_sku（或 NULL）
- Smart Cache COST_MAP 含新 SKU 成本條目（或確認 fallback 值正確）

**Gate 2 FAIL → Rollback**：
- 回退 Step 1（刪除 migration 檔）

---

### Step 3 — Dashboard UI 同步

**負責 Subagent**：`frontend-developer`（如需，否則 A3 直接執行）
**執行範圍**：`freehandsss_dashboardV41.html`

```
3a. 更新 _deriveCat() 函式
    若新 item_key 格式含新後綴（如 _NEW_TYPE）：新增 case
    確認返回的 category 字串與 Supabase item_category 期望值一致

3b. 更新 _woolKey() 函式（若為加購配件）
    新增識別條件：.toUpperCase().includes('_NEW_SUFFIX')

3c. 若需新進度選項：
    更新兩個 dropdown（iPhone acc + Desktop table）
    ⚠️ CRITICAL：新 <option value="..."> 的 value 字串必須：
      - 完全等於 _fhsStatusStore 存入的 UI 字串
      - 能被 _sanitizeItemStatus() 映射至合法 ENUM（或加入新映射分支）
      
3d. IIFE 安全檢查（執行 Checklist E）：
    grep -n '\${(function()' freehandsss_dashboardV41.html
    確認每個 ${(function(){...})()} 均以 })()}  結尾

3e. 更新 sbSyncOrder INSERT mapper
    確認新 item 類型的 INSERT row 包含所有 key：
    { order_fhs_id, item_key, item_category, quantity,
      engraving_text, specification, process_status, batch_number }
    batch_number 必須永遠存在（值為 null 可以，但 key 不可缺）← P3 教訓

3f. Review Mode 渲染驗證（Desktop + Mobile）
    建立含新產品的測試訂單後，切換至訂單總覽（Review Mode）：

    Desktop — renderReviewTable：
    - 確認新 item 列的 category badge 正確顯示（非空、非 undefined）
    - 確認 getProductDimensions(item) 對新 item_key 返回正確 emoji + 款式名稱
      （立體擺設新款式應為 "🖼️ [款式名]"；其他類型比照現有 category emoji）
    - 確認 product_sku、specification、engraving_text 欄位值顯示正確

    Mobile — renderReviewAccordion：
    - 確認新 item accordion card 標題、款式 badge、明細欄位全部渲染
    - 確認無空白 card 或 "undefined" 字串出現
```

**Gate 3 PASS 條件**：
- product-integration-validator Checklist A + B + E 全部 PASS
- 新 INSERT row key set 與現有 item 類型一致
- Desktop + Mobile Review Mode 均正確渲染新產品明細（無 undefined / 空行）

**Gate 3 FAIL → Rollback**：
- 回退 Steps 1 + 2（reverts migration + n8n change）
- Dashboard 修改可保留（UI-only，不破壞現有功能）

---

### Step 4 — RLS 政策確認

**負責 Subagent**：`database-reviewer`

```
4a. 讀取 supabase/rls/rls_policies.sql
    確認以下政策存在：
    - 新 table（如有）：anon SELECT policy
    - 若新產品需 client 直接 UPDATE：anon UPDATE policy
      ⚠️ 若無 UPDATE policy → 改用 _localItemMetaCache overlay 模式（P4 教訓）

4b. 確認新 products 表 SKU（若有）的 RLS：
    products 表已有 products_anon_read → anon SELECT ✅
    n8n 用 service_role → products_service_full ✅

4c. 執行 product-integration-validator Checklist D
```

**Gate 4 PASS 條件**：
- product-integration-validator Checklist D PASS
- 若沒有 anon UPDATE → 文件說明已採用 cache overlay 模式

**Gate 4 FAIL → Rollback**：
- 若新 table 缺 RLS → 暫停部署，補 RLS migration 後重新執行 Step 4
- 回退 Steps 1 + 2（UI 變更 Step 3 可保留）

---

### Step 5 — 三端同步測試

**負責 Subagent**：`finance-auditor`（若涉及成本）/ A3 執行測試
**執行範圍**：端對端驗證

```
5a. 建立測試訂單（使用新產品）
    → 確認 sbSyncOrder 成功寫入 order_items（無 PGRST102 / 23503）
    → 確認 order_items 各欄位值正確

5b. 設定進度並同步
    → 設定 Process_Status 為新 dropdown 選項
    → 執行 sbSyncOrder
    → 重新開啟訂單：確認進度未被清空（P2 教訓）

5c. W_WOOL / 加購配件特有測試（若適用）
    → ON/OFF 切換加購 → 同步 → 再次確認其他 items 的 process_status 未被覆蓋

5d. n8n 端測試（若可）
    → 觸發 n8n 同步 → 確認新 SKU 不觸發 23503 / n8n error log 無新錯誤

5e. 執行 product-integration-validator 全 Checklist（最終驗證）

5f. 已有批次訂單 Edit Mode 重同步保留驗證
    操作步驟：
    1. 找一個已有 batch_number 的訂單（或 5a 建立後設定批次並完成第一次同步）
    2. 重新開啟該訂單 → 進入 Edit Mode → 修改任意欄位（如備註）→ 再次同步
    3. 同步完成後切換至訂單總覽，確認批次色與批次數字未改變

    驗證 SQL：
    SELECT item_key, batch_number, process_status
    FROM order_items
    WHERE order_fhs_id = '<測試訂單 ID>';
    期望：batch_number 與第一次設定值完全一致，process_status 為合法 ENUM 值

    ⚠️ 若 batch_number 被清空 → 診斷 _prevItemMap pre-fetch 邏輯（handoff Session #6）
    ⚠️ 若 process_status 變 null → 確認 _sanitizeItemStatus() 含新值映射（handoff Session #8）
```

**Gate 5 PASS 條件**：
- product-integration-validator 全部 5 個 Checklist PASS
- 無 PGRST102 / FK 23503 / RLS silent fail
- 進度設定後 → 同步 → 重開 → 進度仍保留
- 已有批次訂單 Edit Mode 重同步後，batch_number 100% 保留（SQL 驗證一致）

**Gate 5 FAIL → 診斷**：
- 呼叫 `build-error-resolver` 讀取 Supabase 錯誤 + n8n execution log
- 根據失敗 Checklist 項目判斷回退哪步

---

## Rollback Matrix

| 失敗步驟 | 必須回退 | 可保留 |
|---------|---------|-------|
| Step 1 FAIL | — | — |
| Step 2 FAIL | Step 1（刪除 migration）| — |
| Step 3 FAIL | Steps 1 + 2 | Step 3 UI 改動（不破壞現有功能） |
| Step 4 FAIL | Steps 1 + 2 | Steps 3 + UI 改動 |
| Step 5 FAIL | 依診斷結果（targeted）| 診斷前勿全部回退 |

---

## 副作用 (Side Effects)

- 是否寫檔：**是**（修改 Dashboard HTML / Supabase migration / n8n workflow JSON）
- 涉及 subagents：database-reviewer、build-error-resolver、product-integration-validator
- Token 消耗：~2000–5000（視新產品複雜度）

---

## 已知例外參考

| 情況 | 處理方式 |
|------|---------|
| 加購配件不在 products 表 | product_sku 設 NULL，_woolKey() 識別，不觸發 FK |
| UI string ≠ ENUM value | _fhsStatusStore 持久化原始 UI string，_getItemStatus() bridge |
| anon 無 UPDATE RLS | _localItemMetaCache overlay，sbSyncOrder 時 replay |
