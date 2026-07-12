-- 0050_ig_watchdog_verified_ok_check.sql
-- S150 Phase 4 (P1a)：擴充 ig_watchdog_alerts.kind CHECK 允許 'verified_ok'，
-- 供 igwatch build script 寫入「created_full → verified_ok」正向記錄（resolved=true，不進待處理計數）。
-- 順序鎖死：本 migration 須先 apply 並驗證，才可修改/PUT n8n workflow。

ALTER TABLE public.ig_watchdog_alerts DROP CONSTRAINT ig_watchdog_alerts_kind_check;
ALTER TABLE public.ig_watchdog_alerts ADD CONSTRAINT ig_watchdog_alerts_kind_check
  CHECK (kind = ANY (ARRAY['not_created'::text, 'created_incomplete'::text, 'verified_ok'::text]));
