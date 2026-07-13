-- Migration 0056: 修復 ig_watchdog_alerts dedup 索引與 PostgREST on_conflict 不相容
-- Session 171, 2026-07-13
--
-- 背景：Write Alerts 節點（build_n8n_workflow.cjs, id 'wa1'）POST 到 ig_watchdog_alerts
-- 時帶 Prefer: resolution=ignore-duplicates，但 URL 一直缺 on_conflict 參數。PostgREST
-- 在缺參數時，UPSERT 仲裁鍵預設落在 PRIMARY KEY（id，POST body 從不帶值，永遠不會撞），
-- 使得 migration 0043 定義的真正冪等鍵——expression unique index
-- ix_igwatch_alerts_dedup (alert_date, thread, COALESCE(order_id,''), kind)——完全沒被
-- PostgREST 當成仲裁對象。若同一批次真的出現重複（例：同 thread 同日兩則訊息皆
-- classify 為 not_created 且皆查無訂號，两者 order_id 皆為 NULL），Postgres 仍會依該
-- expression index 擲出 23505，而非 Prefer 期待的靜默忽略；因 Write Alerts 節點設有
-- continueOnFail:true + return=minimal，整批警報會被靜默吞掉且無可見錯誤。
--
-- 無法直接補 on_conflict=alert_date,thread,order_id,kind：PostgREST 的 on_conflict
-- 參數只接受純欄位名清單去比對既有 unique/exclusion constraint，不支援 expression
-- index（COALESCE(order_id,'')），指了會撞 42P10（找不到匹配的 unique constraint）。
--
-- 修法：比照本檔手法把 COALESCE(order_id,'') 具現化成一個 STORED generated column
-- （order_id_key），並在該純欄位上建 plain unique index 取代舊 expression index，
-- 語義完全等價（NULL order_id 一樣參與唯一性比對），但可被 on_conflict 指到。
--
-- 觸發：fresh-context review（decisions.md D31 finding F3）發現「Write Messages」節點
-- （P2a 新增）曾有相同缺陷並已修（on_conflict=thread,ig_message_id，該表 ig_message_id
-- 非 NULL 故毋須 generated column）；「Write Alerts」係既有節點，當時因執行範圍紀律
-- 未動，另案（spawn_task task_e3a60daa）追蹤，本 migration 即該案執行（decisions.md D33）。
--
-- 編號說明：本檔案原以 0054 建立，但 P2b（content_mismatch 表）已在同日稍早搶先
-- committed 為 0054/0055（見 c4b934a），故本檔改號 0056 避免檔名衝突；正式套用到
-- production 時使用 Supabase timestamp-based migration version（非檔名數字前綴），
-- 兩者互不干擾，實際 DB 版本號＝20260713091833（apply_migration 呼叫時自動產生）。

-- ============================================================
-- PART 1: 具現化 COALESCE(order_id,'') 為 generated column
-- ============================================================
ALTER TABLE public.ig_watchdog_alerts
    ADD COLUMN IF NOT EXISTS order_id_key text
    GENERATED ALWAYS AS (COALESCE(order_id, '')) STORED;

COMMENT ON COLUMN public.ig_watchdog_alerts.order_id_key
    IS 'COALESCE(order_id, 空字串) 具現化欄位，僅供 PostgREST on_conflict 定位唯一索引用（PostgREST 不支援 expression index 作 conflict target）；語義等價 migration 0043 舊 expression index。';

-- ============================================================
-- PART 2: 換成純欄位 unique index，淘汰舊 expression index
-- ============================================================
DROP INDEX IF EXISTS public.ix_igwatch_alerts_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS ix_igwatch_alerts_dedup_v2
    ON public.ig_watchdog_alerts (alert_date, thread, order_id_key, kind);
