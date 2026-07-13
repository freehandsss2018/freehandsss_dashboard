-- 0056_igwatch_alerts_on_conflict_fix.sql
-- task_e3a60daa 修復：既有 ig_watchdog_alerts Write Alerts 節點缺 on_conflict 參數
-- （P2a fresh-context opus review 2026-07-13 F4 發現，同批 P2b F4 確認非本次新增缺陷）。
--
-- 根因：舊冪等鍵 ix_igwatch_alerts_dedup 是 COALESCE(order_id,'') expression index，
-- PostgREST 的 on_conflict 查詢參數只接受純欄位名稱，不支援 expression 作 conflict target。
-- 沒有 on_conflict 時，PostgREST UPSERT 仲裁鍵預設落在 PRIMARY KEY（id，body 從不帶，永遠
-- 不會撞），導致真撞到 dedup 鍵時是未處理的 23505 錯誤把整批 INSERT 打回，而非
-- Prefer: resolution=ignore-duplicates 預期的靜默忽略。
--
-- 修復：新增具現化欄位 order_id_key（= COALESCE(order_id,'') STORED），語義等價舊
-- expression index，但作為 plain column 可被 PostgREST on_conflict 參數正確定位；建立對應
-- plain-column 唯一索引 ix_igwatch_alerts_dedup_v2 取代舊索引。
--
-- ⚠️ 本檔補記錄：此 DDL 已於 2026-07-13 09:18 UTC 直接 apply 至 live Supabase
-- （migration 版本 20260713091833 / name igwatch_alerts_on_conflict_fix），但本地
-- repo 遲至本次才補建檔案，屬已知的「live 已跑、本地缺檔」drift（同 0049 先例）。
-- 陳述句照抄 IF NOT EXISTS / IF EXISTS，重跑本檔案對已是此狀態的 DB 無副作用。

ALTER TABLE public.ig_watchdog_alerts
    ADD COLUMN IF NOT EXISTS order_id_key text
    GENERATED ALWAYS AS (COALESCE(order_id, '')) STORED;

COMMENT ON COLUMN public.ig_watchdog_alerts.order_id_key
    IS 'COALESCE(order_id, 空字串) 具現化欄位，僅供 PostgREST on_conflict 定位唯一索引用（PostgREST 不支援 expression index 作 conflict target）；語義等價 migration 0043 舊 expression index。';

DROP INDEX IF EXISTS public.ix_igwatch_alerts_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS ix_igwatch_alerts_dedup_v2
    ON public.ig_watchdog_alerts (alert_date, thread, order_id_key, kind);
