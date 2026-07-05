-- Migration 0048: cost_configurations 數值型 CHECK 約束
-- Session 147 (2026-07-05) — Phase 3 治理優化 Stage 3 pre-Stage-3-A 審計 F4 修正
-- 功能：config_value 若標記為 number，強制非負數字字串，防止負數/非數字寫入
--
-- 背景：database-reviewer 審計發現 config_value 為 TEXT 且無數值驗證，
-- 依賴應用層自律無法擋住直連 SQL 或誤寫。regex ^\d+(\.\d+)?$ 天然排除負號與非數字。
--
-- 套用前已核實：SELECT ... WHERE data_type='number' AND config_value !~ regex 回傳 0 筆，
-- 現有資料無違反此約束者，套用安全。
--
-- Rollback:
--   ALTER TABLE cost_configurations DROP CONSTRAINT IF EXISTS chk_config_value_numeric_nonneg;

ALTER TABLE cost_configurations
  ADD CONSTRAINT chk_config_value_numeric_nonneg
  CHECK (data_type <> 'number' OR config_value ~ '^\d+(\.\d+)?$');
