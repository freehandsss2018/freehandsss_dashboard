-- Migration 0093: 訂單封面圖（刻字欄縮圖顯示）
-- 緣起：Fat Mo 要求刻字欄有圖時以 16:9 縮圖取代刻字字句顯示（2026-09-08）。
-- 圖片綁訂單層（非品項層）——同一單多品項時，只喺第一列（index===0）顯示，
-- 其餘品項照出各自刻字，前端 render 邏輯見 freehandsss_dashboardV42.html
-- fhsBuildOverviewHead()/render 迴圈附近。
--
-- 儲存策略：private bucket + 訂單層 path（<order_id>/cover.<ext>），非 public bucket，
-- 避免 URL 一經外洩就永久可讀；讀取一律經簽名 URL（1 小時 TTL，前端批量換）。
-- anon 可 INSERT/SELECT/UPDATE（同 orders 表現行 anon 全權限一致，見 grants 查證），
-- 刻意不給 DELETE——換圖用 upsert 覆蓋同一 path，唔需要刪除權限，減少誤刪面。

ALTER TABLE orders ADD COLUMN cover_image_path text;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-covers', 'order-covers', false, 2097152, ARRAY['image/webp','image/jpeg','image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY order_covers_anon_insert ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'order-covers');

CREATE POLICY order_covers_anon_select ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'order-covers');

CREATE POLICY order_covers_anon_update ON storage.objects
  FOR UPDATE TO anon
  USING (bucket_id = 'order-covers')
  WITH CHECK (bucket_id = 'order-covers');

-- Smoke test
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'cover_image_path'
  ) THEN
    RAISE EXCEPTION '0093 Smoke FAIL: orders.cover_image_path 欄位不存在';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'order-covers'
  ) THEN
    RAISE EXCEPTION '0093 Smoke FAIL: order-covers bucket 不存在';
  END IF;
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'order-covers' AND public = true
  ) THEN
    RAISE EXCEPTION '0093 Smoke FAIL: order-covers bucket 唔應該係 public';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'order_covers_anon_%') <> 3 THEN
    RAISE EXCEPTION '0093 Smoke FAIL: order-covers RLS policies 數量唔啱';
  END IF;
  RAISE NOTICE '0093 PASS: orders.cover_image_path + order-covers private bucket + 3 RLS policies 已建立';
END $$;
