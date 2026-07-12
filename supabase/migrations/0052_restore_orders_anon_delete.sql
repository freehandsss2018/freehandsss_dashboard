-- 0052_restore_orders_anon_delete.sql
-- 修正 0051 的錯誤：Dashboard executeDeleteOrder()（freehandsss_dashboardV42.html:11515-11525，
-- 綁定 #confirmDeleteBtn）實際會以 anon key 對 orders 發 DELETE（前端註解自述
-- "Supabase hard delete (primary)"）。0051 移除 orders_anon_delete 政策後，該請求仍回 HTTP 200
-- （table 級 anon DELETE GRANT 存在，只是 RLS 濾空 0 rows），前端 `if (!sbDelRes.ok)` 判斷不到，
-- 彈出「已成功刪除」但訂單其實留在 DB——靜默失敗。
-- fresh-context code-reviewer(opus) 2026-07-12 於 S150 Phase 4-6 執行 session 內即時抓出，同一 session 回滾。
-- 影響窗口：2026-07-12 約 12:34–12:41 UTC（migration 0051 apply 至本 migration apply 之間），
-- 期間未發現真實客戶資料被此路徑誤刪（低流量內部後台工具，且 anon DELETE 表面雖回 2xx 實際刪 0 列，
-- 唯一風險是「使用者以為刪除成功但其實沒刪除」，不是「誤刪其他資料」）。

CREATE POLICY orders_anon_delete ON public.orders FOR DELETE TO anon USING (true);
