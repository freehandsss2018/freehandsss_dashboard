-- 0051_orders_anon_policy_cleanup.sql
-- S150 Phase 5 (P1b)：orders anon 權限收斂。
-- ⚠️ (a) 項判斷錯誤，已由 0052_restore_orders_anon_delete.sql 回滾——保留本檔案原樣供審計軌跡，
--     見 0052 檔頭說明。實際生效者：僅 (b) 項（UPDATE 政策去重）。
-- (a) [已回滾] 移除未使用的 anon DELETE 政策（Dashboard 全檔 grep 無 DELETE orders 呼叫，S150 審計 +
--     Phase 4-6 執行時重確認）——grep 誤判：executeDeleteOrder() 確實以 anon key DELETE orders
--     （freehandsss_dashboardV42.html:11515-11525），只是 method:'DELETE' 與 URL 分行，單行 grep 未命中。
-- (b) 兩條重複 anon UPDATE 政策（anon_update_orders / orders_anon_update）qual=true、with_check=true 逐字等價，
--     保留命名與其餘 orders_anon_* 政策一致的 orders_anon_update，刪除 anon_update_orders

-- 回滾底稿：
-- CREATE POLICY orders_anon_delete ON public.orders FOR DELETE TO anon USING (true);
-- CREATE POLICY anon_update_orders ON public.orders FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY orders_anon_delete ON public.orders;
DROP POLICY anon_update_orders ON public.orders;
