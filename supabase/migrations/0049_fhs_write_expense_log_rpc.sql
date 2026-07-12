-- 0049_fhs_write_expense_log_rpc.sql
-- S150 F2：記錄中心 (Log Sheet) 寫入主路徑 RPC。
-- 背填（backfill）：此 migration 已於 2026-07-07 (S150 Phase 3) apply 至 live，
-- 但本地 migrations 資料夾當時缺檔（前科：0039-0041 亦曾缺漏）。
-- 本檔於 2026-07-12 (S150 Phase 4 接續) 依 live pg_proc 定義逐字回填，補齊本地/live 同步。

CREATE OR REPLACE FUNCTION public.fhs_write_expense_log(
  p_log_type text,
  p_entry_date date,
  p_category text,
  p_item_name text,
  p_amount numeric,
  p_remarks text,
  p_operator text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO expense_logs (log_type, entry_date, category, item_name, amount, remarks, operator)
    VALUES (p_log_type, p_entry_date, p_category, p_item_name, p_amount, p_remarks, p_operator)
    RETURNING id INTO v_id;
    RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fhs_write_expense_log(text, date, text, text, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.fhs_write_expense_log(text, date, text, text, numeric, text, text) TO authenticated;
