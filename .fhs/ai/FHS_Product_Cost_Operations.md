---
name: FHS Product Cost Operations
version: v2.1.0
created: 2026-05-28
parent: .fhs/ai/FHS_Product_Cost_Schema_v2.md
authority: RPC / 並發 / 升級 / 回滾 SOP
status: v2.1 draft — pending code-reviewer + database-reviewer audit
---

# ⚙️ FHS 產品成本 Operations SOP

> **本文件用途**：定義成本資料的並發控制、RPC 行為、效能規範、回滾流程。
> **執行對象**：寫 SQL Migration 或修 n8n workflow 必須依此規範。
> **前置依賴**：必須通過 `code-reviewer` + `database-reviewer` subagent 審計。

---

## §OP-1. 並發衝突策略

### 1.1 場景識別

| ID | 場景 | 風險 |
|----|------|------|
| C-A | Fat Mo 在 UI 改 cost_config 時 batch recalc 正在跑 | 重算用到舊值，結果不一致 |
| C-B | `fhs_sync_products_from_config` 與 n8n Mirror Prep 同時寫 products.total_base_cost | last-write-wins，n8n 可能蓋掉手動設定 |
| C-C | 兩個 admin 同時開 UI 改不同 key | 互不影響（不同 row） |
| C-D | 兩個 admin 同時改同一個 key | 後寫覆蓋先寫，無歷史記錄 |

### 1.2 解決策略

**新增欄位（Migration 0022a）**：

```sql
ALTER TABLE cost_configurations
  ADD COLUMN IF NOT EXISTS version          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS schema_version   TEXT    DEFAULT 'v1',  -- 對齊 0022a 實際 migration；新欄位預設 v1，逐 key UPDATE 後才轉 v2
  ADD COLUMN IF NOT EXISTS display_group    TEXT    DEFAULT 'misc'
    CHECK (display_group IN ('drawing','material_3d','material_jewelry','shipping','addon','misc')),
  ADD COLUMN IF NOT EXISTS is_deprecated    BOOLEAN DEFAULT FALSE;

-- Stage 3 新增（2026-07-05 database-reviewer 審計 F4，雙保險設計）：
-- DB 層硬底線 CHECK：config_value 若標記為 number，必須是非負數字字串
-- （regex 本身天然排除負數與非數字，^\d+(\.\d+)?$ 不含負號）
ALTER TABLE cost_configurations
  ADD CONSTRAINT chk_config_value_numeric_nonneg
  CHECK (data_type <> 'number' OR config_value ~ '^\d+(\.\d+)?$');
```

> **RPC 層第二道防線**：`fhs_upsert_cost_config`（見 §OP-2）應在寫入前先驗證數值格式，回傳友善錯誤訊息（如「成本值需為非負數字」），而非讓呼叫方直接撞到 DB CHECK 的原始 constraint violation 錯誤。DB CHECK 是硬底線，RPC 驗證是使用者體驗層——兩者互補，缺一則要嘛體驗差要嘛可被繞過。

**策略 C-A — UI 鎖定**：
- 前端載入頁時 SELECT financial_batch_logs WHERE n8n_status IN ('pending','submitted','processing')
- 若有結果 → 全欄位 disabled + 顯示 banner（見 UI Spec §UI-3.3）

**策略 C-B — Advisory Lock（共享鎖，見 §OP-3 詳細設計）**：
- `fhs_sync_products_from_config` RPC 取 `pg_try_advisory_xact_lock(hashtext('cost_sync'))`
- n8n Mirror Prep 改透過 `fhs_mirror_write_product_cost` RPC 寫入 products，該 RPC 內部搶同一把鎖，與 sync RPC 互斥（取代舊版 5 分鐘時間窗判斷，見 §OP-3.2 修正說明）

**策略 C-D — 樂觀鎖**：
- `fhs_upsert_cost_config` 改 4 參數版本：`(p_key, p_value, p_expected_version, p_updated_by)`
- 內部用 `WHERE version = p_expected_version` 防覆寫
- 衝突時 raise exception → 前端顯示「請重新載入」modal

### 1.3 樂觀鎖 RPC 範例（v2.1 修正版）

> **修正原因**：舊版 SELECT + INSERT 間有 TOCTOU 競爭窗口（兩 session 可同時通過 version check）。
> 改為 `SELECT FOR UPDATE` 鎖定行，消除窗口。舊 3 參數簽名保留重載版本確保向後相容。

```sql
-- 新 4 參數版本（帶樂觀鎖）
CREATE OR REPLACE FUNCTION fhs_upsert_cost_config(
  p_key              TEXT,
  p_value            TEXT,
  p_expected_version INTEGER DEFAULT NULL,
  p_updated_by       TEXT    DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_current_version INTEGER;
  v_rows_updated    INTEGER;
BEGIN
  -- SELECT FOR UPDATE：鎖定此 row 直到 transaction 結束，消除 TOCTOU 窗口
  SELECT version INTO v_current_version
  FROM cost_configurations
  WHERE config_key = p_key
  FOR UPDATE;

  -- 樂觀鎖衝突偵測
  IF v_current_version IS NOT NULL
     AND p_expected_version IS NOT NULL
     AND v_current_version <> p_expected_version THEN
    RAISE EXCEPTION 'version_conflict: expected % but got %',
      p_expected_version, v_current_version
      USING ERRCODE = 'P0001';
  END IF;

  -- 原子性 upsert（row 已鎖定，無競爭）
  INSERT INTO cost_configurations (config_key, config_value, version, updated_at, updated_by)
  VALUES (p_key, p_value, 1, NOW(), p_updated_by)
  ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    version      = cost_configurations.version + 1,
    updated_at   = NOW(),
    updated_by   = EXCLUDED.updated_by;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success',     true,
    'config_key',  p_key,
    'new_version', COALESCE(v_current_version, 0) + 1,
    'rows',        v_rows_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, INTEGER, TEXT) TO anon;

-- 保留舊 3 參數簽名（向後相容，轉發至新版）
CREATE OR REPLACE FUNCTION fhs_upsert_cost_config(
  p_key        TEXT,
  p_value      TEXT,
  p_updated_by TEXT DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN fhs_upsert_cost_config(p_key, p_value, NULL::INTEGER, p_updated_by);
END;
$$;

GRANT EXECUTE ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, TEXT) TO anon;
```

---

## §OP-2. RPC 設計清單

### 2.1 新增 RPC：`fhs_sync_products_from_config`

```sql
CREATE OR REPLACE FUNCTION fhs_sync_products_from_config()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_updated      INTEGER := 0;
  v_rows         INTEGER := 0;
  v_wool_cost    NUMERIC;
  v_light_cost   NUMERIC;
BEGIN
  -- Advisory lock（transaction 作用域），避免與 n8n Mirror Prep 並發衝突
  IF NOT pg_try_advisory_xact_lock(hashtext('cost_sync')) THEN
    RAISE EXCEPTION 'sync_in_progress: another sync running, retry later';
  END IF;

  -- 取成本值（避免子查詢失敗靜默）
  SELECT config_value::NUMERIC INTO v_wool_cost
  FROM cost_configurations WHERE config_key = 'addon_cost_wool_felt';

  SELECT config_value::NUMERIC INTO v_light_cost
  FROM cost_configurations WHERE config_key = 'addon_cost_light';

  IF v_wool_cost IS NULL OR v_light_cost IS NULL THEN
    RAISE EXCEPTION 'sync_config_missing: addon_cost keys not found in cost_configurations';
  END IF;

  -- 羊毛氈
  UPDATE products SET total_base_cost = v_wool_cost WHERE sku = '羊毛氈公仔 - 加購';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE WARNING 'sync: sku 羊毛氈公仔 - 加購 not found in products'; END IF;
  v_updated := v_updated + v_rows;

  -- 燈飾
  UPDATE products SET total_base_cost = v_light_cost WHERE sku = '燈飾 - 加購';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RAISE WARNING 'sync: sku 燈飾 - 加購 not found in products'; END IF;
  v_updated := v_updated + v_rows;

  -- Phase v3 候選：立體擺設、飾品物料同步（目前從 products 直接管理）

  RETURN jsonb_build_object('success', true, 'updated_rows', v_updated);
END;
$$;

-- 限 service_role（SECURITY DEFINER 可寫 products，不應開放 anon）
GRANT EXECUTE ON FUNCTION fhs_sync_products_from_config() TO service_role;
```

### 2.2 既有 RPC 改動清單

| RPC | 改動 |
|-----|------|
| `fhs_upsert_cost_config` | 加 p_expected_version 參數（向後相容：預設 NULL） |
| `fhs_estimate_batch_impact` | 無改動 |
| `fhs_apply_financial_batch_update` | 無改動 |
| `fhs_batch_recalc_execute` | 第 0 步加：先呼叫 `fhs_sync_products_from_config()` 確保 products 最新 |

---

## §OP-3. n8n Mirror Prep 互鎖

### 3.1 問題

n8n V47.x 的 Mirror Prep 節點會從 Airtable 反向寫 `products.total_base_cost`。若與 Supabase RPC 並發 → 競爭條件。

### 3.2 解決方案（2026-07-05 code-reviewer 審計 F3 修正：改用共享 Advisory Lock，取代純時間窗判斷）

> **問題**：原始 5 分鐘時間窗判斷是 TOCTOU（Time-of-check to time-of-use）漏洞——n8n 讀到「6 分鐘前」決定寫入的瞬間，Fat Mo 剛好在 UI 改 config，兩者仍會對 `products.total_base_cost` 雙寫，last-write-wins 蓋掉手動值。時間窗只能降低機率，無法消除競態。
> **修法**：n8n 不再直接 PATCH `products` 表，改呼叫新 RPC `fhs_mirror_write_product_cost`，此 RPC 內部搶與 `fhs_sync_products_from_config`**同一把** advisory lock（`hashtext('cost_sync')`），與 UI 手動觸發的 sync RPC 互斥，徹底消除競態而非僅降低機率。

**Stage 3 新增 RPC**（`supabase/migrations/` 待 Stage 3 落地時建立）：

```sql
CREATE OR REPLACE FUNCTION fhs_mirror_write_product_cost(
  p_sku TEXT,
  p_total_base_cost NUMERIC
) RETURNS JSONB AS $$
BEGIN
  -- 與 fhs_sync_products_from_config 搶同一把鎖，非時間窗判斷
  IF NOT pg_try_advisory_xact_lock(hashtext('cost_sync')) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'sync_in_progress_retry_later');
  END IF;

  UPDATE products SET total_base_cost = p_total_base_cost, updated_at = NOW()
  WHERE sku = p_sku;

  RETURN jsonb_build_object('skipped', false, 'sku', p_sku);
END;
$$ LANGUAGE plpgsql;
```

**n8n Mirror Prep Code 節點改動**：不再直接 REST PATCH `products` 表，改呼叫上述 RPC；若回傳 `skipped:true`，n8n 排入下一輪重試（不視為錯誤）。

---

## §OP-4. Smart Cache 失效策略

### 4.1 當前風險

n8n `Smart Cache Strategist` 持有 BASE_PREFIXES 與 hardcoded 預設值。若 cost_config 改動 → cache 仍用舊值 → 直到下次重啟才更新。

### 4.2 解決方案

兩層防護：

| 層 | 機制 | 優點 |
|----|------|------|
| L1 | Smart Cache 每次優先 Supabase REST 即時讀（已實作於 2026-05-23 設計） | 即時、無需失效訊號 |
| L2 | `fhs_sync_products_from_config` 完成後觸發 webhook 通知 n8n（可選） | 雙保險 |

→ **本 v2.1 暫只啟用 L1**（已驗證可用），L2 列為 v3 候選。

---

## §OP-5. 升級回滾 SOP

### 5.1 0022a 回滾

> **執行順序**：必須先回滾 V41 HTML 變更，再執行以下 SQL，避免前端依賴 `display_group` 但欄位已刪除。

```sql
-- Step 0：回滾 HTML（見 §5.3 git 還原步驟；本 SQL 段必須在 HTML 還原完成後才執行）

-- Step 1：遷移 v1 舊 key 名稱（0022a 若已重命名，還原回原名）
UPDATE cost_configurations SET config_key = 'wool_felt_addon_cost'  WHERE config_key = 'addon_cost_wool_felt';
UPDATE cost_configurations SET config_key = 'light_addon_cost'      WHERE config_key = 'addon_cost_light';
UPDATE cost_configurations SET config_key = 'drawing_cost_per_order' WHERE config_key = 'drawing_cost_fixed_per_order';

-- Step 2：刪除 v2 新增 keys（11 個）
DELETE FROM cost_configurations WHERE config_key IN (
  'drawing_cost_baby_s','drawing_cost_baby_p','drawing_cost_adult_s','drawing_cost_adult_p',
  'material_cost_woodframe','material_cost_glassjar',
  'material_cost_keychain_stainless','material_cost_keychain_alloy',
  'material_cost_necklace_silver','material_cost_necklace_gold',
  'keychain_shipping_deduction_per_extra'
);

-- Step 3：刪除 products addon 行（加前置防護，避免清零歷史成本）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM order_items
    WHERE product_sku IN ('羊毛氈公仔 - 加購', '燈飾 - 加購')
    LIMIT 1
  ) THEN
    RAISE EXCEPTION '回滾中止：仍有訂單引用加購 SKU，請先遷移或備份成本資料';
  END IF;
END $$;

DELETE FROM products WHERE sku IN ('羊毛氈公仔 - 加購', '燈飾 - 加購');

-- Step 4：移除 v2 新欄位
ALTER TABLE cost_configurations DROP COLUMN IF EXISTS version;
ALTER TABLE cost_configurations DROP COLUMN IF EXISTS schema_version;
ALTER TABLE cost_configurations DROP COLUMN IF EXISTS display_group;
ALTER TABLE cost_configurations DROP COLUMN IF EXISTS is_deprecated;
```

### 5.2 0022b 回滾

```sql
DROP FUNCTION IF EXISTS fhs_sync_products_from_config();
-- fhs_upsert_cost_config 改回 3 參數版本（從 0020 重跑該段）
```

### 5.3 V41 HTML 回滾

從 git 還原修改前的 `Freehandsss_dashboardV41.html`（每次改動前 `cp -p` 備份）。

---

## §OP-5.3 v1 舊 key 遷移（0022a 必做）

0020 seed 資料的 key 名稱與 v2.1 不同，必須在 0022a 執行重命名遷移，避免平行幽靈 key：

> **冪等性聲明**（2026-07-05 code-reviewer 審計 F2 修正）：以下每條 rename UPDATE 皆加 `AND NOT EXISTS` 守衛。原因：若 migration 中途失敗後重跑（例如 rename 成功但後續 INSERT 新 key 因故中斷），無守衛的版本會因新名已存在而在重複執行時嘗試二次 rename，可能撞 PRIMARY KEY 衝突導致整段 migration abort。加守衛後，重跑時 `WHERE` 條件對已完成的 rename 一律命中 0 列，安全跳過。

```sql
-- 0022a 中必須包含（在 INSERT 新 key 之前執行）
UPDATE cost_configurations
SET config_key = 'addon_cost_wool_felt', updated_at = NOW()
WHERE config_key = 'wool_felt_addon_cost'
  AND NOT EXISTS (SELECT 1 FROM cost_configurations WHERE config_key = 'addon_cost_wool_felt');

UPDATE cost_configurations
SET config_key = 'addon_cost_light', updated_at = NOW()
WHERE config_key = 'light_addon_cost'
  AND NOT EXISTS (SELECT 1 FROM cost_configurations WHERE config_key = 'addon_cost_light');

UPDATE cost_configurations
SET config_key = 'drawing_cost_fixed_per_order', updated_at = NOW()
WHERE config_key = 'drawing_cost_per_order'
  AND NOT EXISTS (SELECT 1 FROM cost_configurations WHERE config_key = 'drawing_cost_fixed_per_order');

-- v1 剩餘 key（printing_cost_per_cm2 / shipping_cost_standard / shipping_cost_sf）命名不變，標記繼承
UPDATE cost_configurations
SET is_deprecated = FALSE, schema_version = 'v2', display_group =
  CASE config_key
    WHEN 'printing_cost_per_cm2'  THEN 'misc'
    WHEN 'shipping_cost_standard' THEN 'shipping'
    WHEN 'shipping_cost_sf'       THEN 'shipping'
    ELSE 'misc'
  END
WHERE config_key IN ('printing_cost_per_cm2','shipping_cost_standard','shipping_cost_sf');
```

## §OP-6. 受影響檔案總清單

> **2026-07-05 現況核實**（Stage 3 開工前發現）：以下多項早於本次審計已是 live 狀態，非待辦。表格狀態欄已更新反映實況。

| 檔案 | 變更內容 | Stage | 狀態 |
|------|---------|-------|------|
| `supabase/migrations/0022a_cost_config_v2_schema.sql` | 加 4 欄位、rename keys | Stage 3 | ✅ 已上線（早於本次審計） |
| `supabase/migrations/0022b_cost_config_v2_rpc.sql` | `fhs_upsert_cost_config`／`fhs_sync_products_from_config`／樂觀鎖 | Stage 3 | ✅ 已上線（早於本次審計） |
| `supabase/migrations/0048_cost_config_value_check_constraint.sql` | `chk_config_value_numeric_nonneg` CHECK 約束 | Stage 3 | ✅ 已上線（2026-07-05，live 驗證：插入負數已實測擋下） |
| `supabase/migrations/`（待編號） | 新 RPC `fhs_mirror_write_product_cost`（見 §OP-3.2） | Stage 3 | ⏳ 待辦——下個 session 處理，需 opus + fresh-context 審查 |
| `Freehandsss_dashboard_current.html` | 23-key 分組 UI + 樂觀鎖 + 衝突 banner | Stage 3 | ✅ 已上線（早於本次審計，見 UI Spec §UI-4） |
| n8n `FHS_Core_OrderProcessor_live.json` Mirror Prep 節點 | 改呼叫 `fhs_mirror_write_product_cost` RPC，取代現行 5 分鐘時間窗判斷（見 §OP-3.2） | Stage 3.1 | ⏳ 待辦——**改動 live 訂單處理 workflow**，下個 session 依 n8n 部署規格（GET→定點改→PUT，opus + fresh-context + live 驗證附訂單號）處理，本次不動 |
| `docs/repo-map.md` | 新增 3 份 v2.1 文件指引 | Stage 4 |
| `Changelog.md`（根目錄；`docs/CHANGELOG.md` 分岔複本已於 2026-07-04 刪除） | 記錄 v2.1 schema + 樂觀鎖上線 | Stage 4 |
| `.fhs/notes/decisions.md` | 記 α / γ / 樂觀鎖 / Advisory lock 決策 | Stage 4 |
| `.fhs/memory/handoff.md` | 更新 session 狀態 | Stage 4 |
| `.fhs/memory/learnings.md` | v1→v2 設計教訓 + 衝突邊界補完經驗 | Stage 4 |
| `.fhs/notes/addon_product_sop.md` | 解除「禁止寫入 product_sku」警告（α 落地後 FK 已通） | Stage 4 |

---

## §OP-7. 部署順序

```
2.1b  database-reviewer  審 Core + Operations §OP-1/2/5
2.1c  ui-designer        審 UI Spec §UI-1~4
2.1d  code-reviewer      審 Operations RPC + n8n 互鎖
  ↓ 3 份 PASS verdict
2.1e  Fat Mo GO
  ↓
3a    Migration 0022a 部署 + 驗證 schema
3b    Migration 0022b 部署 + 驗證 RPC
3c    frontend-developer 改 V41 HTML
3d    n8n Mirror Prep 加互鎖
3e    code-reviewer 後置審核
  ↓
4     後效同步（repo-map / CHANGELOG / decisions / handoff / learnings / addon SOP）
```

---

**Operations SOP 結束 — 等候 database-reviewer + code-reviewer 審計。**
