-- ============================================================
-- Migration 0020 — Financial Settings System
-- ============================================================
-- Purpose:
--   1. Create cost_configurations table (centralized cost SSoT)
--   2. Create financial_batch_logs table (audit trail)
--   3. Add orders.recalc_requested_at (avoids triggering 0018 Airtable sync)
--   4. Create 3 RPC functions for UI integration
--
-- Architecture Decision:
--   RPC does NOT call n8n directly (avoids pg_net dependency).
--   Frontend JS calls n8n webhook after RPC returns.
--   n8n polls financial_batch_logs for status='pending' entries.
--
-- Rollback:
--   DROP TABLE IF EXISTS cost_configurations CASCADE;
--   DROP TABLE IF EXISTS financial_batch_logs CASCADE;
--   ALTER TABLE orders DROP COLUMN IF EXISTS recalc_requested_at;
--   DROP FUNCTION IF EXISTS fhs_upsert_cost_config(TEXT, TEXT, TEXT);
--   DROP FUNCTION IF EXISTS fhs_estimate_batch_impact(TEXT, DATE, TEXT[]);
--   DROP FUNCTION IF EXISTS fhs_apply_financial_batch_update(TEXT, DATE, TEXT[]);
-- ============================================================


-- ============================================================
-- PART 1: cost_configurations table
-- ============================================================

CREATE TABLE IF NOT EXISTS cost_configurations (
  config_key    TEXT PRIMARY KEY,
  config_value  TEXT NOT NULL DEFAULT '0',
  display_name  TEXT,
  data_type     TEXT DEFAULT 'number' CHECK (data_type IN ('number', 'text')),
  description   TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    TEXT DEFAULT 'system'
);

COMMENT ON TABLE cost_configurations IS
  '集中式成本參數設定表。所有寫入必須通過 fhs_upsert_cost_config RPC，禁止前端直接 INSERT/UPDATE。';

ALTER TABLE cost_configurations ENABLE ROW LEVEL SECURITY;

-- anon: 只讀（SELECT）
CREATE POLICY "cost_config_anon_read"
  ON cost_configurations FOR SELECT TO anon USING (true);

-- 任何直接寫入請求由 RPC SECURITY DEFINER 繞過 RLS


-- ============================================================
-- PART 2: financial_batch_logs table (審計日誌)
-- ============================================================

CREATE TABLE IF NOT EXISTS financial_batch_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id      UUID NOT NULL DEFAULT gen_random_uuid(),
  scope         TEXT NOT NULL CHECK (scope IN ('all', 'date_after', 'specific')),
  affected_rows INTEGER DEFAULT 0,
  triggered_by  TEXT DEFAULT 'dashboard',
  n8n_status    TEXT DEFAULT 'pending'
                CHECK (n8n_status IN ('pending', 'submitted', 'processing', 'completed', 'error')),
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at  TIMESTAMPTZ,
  target_date   DATE,
  target_orders TEXT[]
);

COMMENT ON TABLE financial_batch_logs IS
  '財務批量重算審計日誌。n8n 完成後將 n8n_status 更新為 completed。';

ALTER TABLE financial_batch_logs ENABLE ROW LEVEL SECURITY;

-- anon: 允許 INSERT（觸發批量）+ SELECT（查看狀態）
CREATE POLICY "batch_logs_anon_all"
  ON financial_batch_logs FOR ALL TO anon
  USING (true) WITH CHECK (true);

-- TODO: 建議未來用 pg_cron 清理 30 天以上的記錄（與 error_logs 同模式）
-- SELECT cron.schedule('cleanup-batch-logs', '0 3 * * *',
--   $$DELETE FROM financial_batch_logs WHERE created_at < NOW() - INTERVAL '30 days'$$);


-- ============================================================
-- PART 3: orders.recalc_requested_at (避免觸發 0018 Airtable sync)
-- ============================================================

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS recalc_requested_at TIMESTAMPTZ;

COMMENT ON COLUMN orders.recalc_requested_at IS
  '財務批量重算標記時間。刻意不使用 updated_at，避免觸發 sync_order_to_mirror trigger (0018) 並爆破 Airtable API 額度。';


-- ============================================================
-- PART 4: RPC — fhs_upsert_cost_config
-- 允許前端安全寫入單筆設定值
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_upsert_cost_config(
  p_key        TEXT,
  p_value      TEXT,
  p_updated_by TEXT DEFAULT 'dashboard'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_key IS NULL OR trim(p_key) = '' THEN
    RAISE EXCEPTION 'config_key 不可為空';
  END IF;

  INSERT INTO cost_configurations (config_key, config_value, updated_at, updated_by)
  VALUES (p_key, p_value, NOW(), p_updated_by)
  ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    updated_at   = NOW(),
    updated_by   = EXCLUDED.updated_by;

  RETURN jsonb_build_object(
    'success', true,
    'config_key', p_key,
    'config_value', p_value
  );
END;
$$;

COMMENT ON FUNCTION fhs_upsert_cost_config IS
  '安全寫入 cost_configurations 單筆設定值。SECURITY DEFINER 繞過 RLS，前端用 anon key 呼叫。';

GRANT EXECUTE ON FUNCTION fhs_upsert_cost_config(TEXT, TEXT, TEXT) TO anon;


-- ============================================================
-- PART 5: RPC — fhs_estimate_batch_impact
-- 僅 COUNT，無任何寫入，用於前端預估影響筆數
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_estimate_batch_impact(
  p_scope         TEXT,
  p_target_date   DATE    DEFAULT NULL,
  p_target_orders TEXT[]  DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  IF p_scope NOT IN ('all', 'date_after', 'specific') THEN
    RAISE EXCEPTION '無效的 p_scope，必須為 all / date_after / specific';
  END IF;

  IF p_scope = 'all' THEN
    SELECT COUNT(*) INTO v_count
    FROM orders WHERE deleted_at IS NULL;

  ELSIF p_scope = 'date_after' THEN
    IF p_target_date IS NULL THEN
      RAISE EXCEPTION 'date_after 模式下 p_target_date 不可為空';
    END IF;
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE deleted_at IS NULL AND confirmed_at >= p_target_date;

  ELSIF p_scope = 'specific' THEN
    IF p_target_orders IS NULL OR array_length(p_target_orders, 1) IS NULL THEN
      RAISE EXCEPTION 'specific 模式下 p_target_orders 不可為空';
    END IF;
    SELECT COUNT(*) INTO v_count
    FROM orders
    WHERE deleted_at IS NULL AND order_id = ANY(p_target_orders);
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION fhs_estimate_batch_impact IS
  '批量重算影響筆數預估（純 COUNT，零寫入）。供前端防呆 UI 顯示受影響訂單數。';

GRANT EXECUTE ON FUNCTION fhs_estimate_batch_impact(TEXT, DATE, TEXT[]) TO anon;


-- ============================================================
-- PART 6: RPC — fhs_apply_financial_batch_update
-- 標記待重算訂單 + 寫入審計日誌
-- 注意：不直接呼叫 n8n（避免 pg_net 依賴）
--       前端 JS 在 RPC 成功後負責呼叫 n8n webhook
-- ============================================================

CREATE OR REPLACE FUNCTION fhs_apply_financial_batch_update(
  p_scope         TEXT,
  p_target_date   DATE    DEFAULT NULL,
  p_target_orders TEXT[]  DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_batch_id UUID := gen_random_uuid();
  v_count    INTEGER := 0;
BEGIN
  IF p_scope NOT IN ('all', 'date_after', 'specific') THEN
    RAISE EXCEPTION '無效的 p_scope，必須為 all / date_after / specific';
  END IF;

  -- 1. 標記目標訂單（用 recalc_requested_at，不觸發 Airtable sync trigger）
  IF p_scope = 'all' THEN
    UPDATE orders
    SET recalc_requested_at = NOW()
    WHERE deleted_at IS NULL;

  ELSIF p_scope = 'date_after' THEN
    IF p_target_date IS NULL THEN
      RAISE EXCEPTION 'date_after 模式下 p_target_date 不可為空';
    END IF;
    UPDATE orders
    SET recalc_requested_at = NOW()
    WHERE deleted_at IS NULL AND confirmed_at >= p_target_date;

  ELSIF p_scope = 'specific' THEN
    IF p_target_orders IS NULL OR array_length(p_target_orders, 1) IS NULL THEN
      RAISE EXCEPTION 'specific 模式下 p_target_orders 不可為空';
    END IF;
    UPDATE orders
    SET recalc_requested_at = NOW()
    WHERE deleted_at IS NULL AND order_id = ANY(p_target_orders);
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 2. 寫入審計日誌
  INSERT INTO financial_batch_logs (
    batch_id, scope, affected_rows, triggered_by,
    n8n_status, target_date, target_orders
  ) VALUES (
    v_batch_id, p_scope, v_count, 'dashboard',
    'pending', p_target_date, p_target_orders
  );

  -- 3. 回傳結果給前端（前端負責後續呼叫 n8n webhook）
  RETURN jsonb_build_object(
    'batch_id',      v_batch_id,
    'affected_rows', v_count,
    'status',        'pending',
    'message',       '已標記 ' || v_count || ' 筆訂單待重算，請前端呼叫 n8n webhook 完成任務提交'
  );
END;
$$;

COMMENT ON FUNCTION fhs_apply_financial_batch_update IS
  '批量財務重算觸發：標記目標訂單 recalc_requested_at，寫審計日誌，回傳 batch_id。
   前端收到後負責呼叫 n8n webhook，n8n 再讀取 cost_configurations 執行實際重算。
   設計決策：不在 RPC 內呼叫 n8n，避免 pg_net 依賴與超時風險。';

GRANT EXECUTE ON FUNCTION fhs_apply_financial_batch_update(TEXT, DATE, TEXT[]) TO anon;


-- ============================================================
-- PART 7: 初始 Seed 資料 (placeholder，Fat Mo 透過 UI 更新實際值)
-- ============================================================

INSERT INTO cost_configurations (config_key, config_value, display_name, data_type, description) VALUES
  ('drawing_cost_per_order',  '0', '繪圖費 / 單',       'number', 'n8n Calculate Profit: DRAWING_COST_PER_ORDER'),
  ('printing_cost_per_cm2',   '0', '印刷費 / cm²',      'number', 'n8n Calculate Profit: 每平方厘米印刷成本'),
  ('shipping_cost_standard',  '0', '標準運費成本',      'number', '一般訂單的物流成本'),
  ('shipping_cost_sf',        '0', '順豐運費成本',      'number', '順豐訂單的物流成本'),
  ('wool_felt_addon_cost',    '0', '羊毛氈加購成本',    'number', '羊毛氈加購件的材料成本'),
  ('light_addon_cost',        '0', '燈飾加購成本',      'number', '燈飾加購件成本（products 表 total_base_cost 優先）')
ON CONFLICT (config_key) DO NOTHING;
