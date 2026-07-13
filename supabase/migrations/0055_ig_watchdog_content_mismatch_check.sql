-- 0055_ig_watchdog_content_mismatch_check.sql
-- P2b（S150 §4.8 剝離範圍，flow_id 2026-07-13-1224）：擴充 ig_watchdog_alerts.kind CHECK
-- 允許第四值 'content_mismatch'，供 igwatch build script 寫入內容比對層鏡像警報
-- （複用既有 fhs_resolve_ig_alert RPC + V42 UI，詳見 migration 0054 註記）。
-- 約束反映現實原則（S147 Stage 3）：本次真的要用才擴充，順序鎖死於 n8n workflow PUT 前 apply。

ALTER TABLE public.ig_watchdog_alerts DROP CONSTRAINT ig_watchdog_alerts_kind_check;
ALTER TABLE public.ig_watchdog_alerts ADD CONSTRAINT ig_watchdog_alerts_kind_check
  CHECK (kind = ANY (ARRAY['not_created'::text, 'created_incomplete'::text, 'verified_ok'::text, 'content_mismatch'::text]));
