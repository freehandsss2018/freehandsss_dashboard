-- Migration 0082: 修正 migration 0081 遺漏——position_code CHECK constraint 擴充容納大寶
-- 0081 註解誤稱「CHECK值域無需改動」，但 cl-final-plan.md §5.3-C1 設計嘅 getPositionCode()
-- 新值（大寶左手/大寶右手/大寶左腳/大寶右腳，用以令大寶同嬰兒各自獨立豁免分組，A2/#1採納項）
-- 會直接違反現行 CHECK（僅准左手/右手/左腳/右腳），若唔修正會令大寶落單時 Mirror RPC 寫入
-- 失敗。喺 Phase C（n8n代碼改動）動手前發現並即時修正。

ALTER TABLE public.order_items DROP CONSTRAINT order_items_position_code_check;

ALTER TABLE public.order_items ADD CONSTRAINT order_items_position_code_check
  CHECK (position_code IS NULL OR position_code IN (
    '左手','右手','左腳','右腳',
    '大寶左手','大寶右手','大寶左腳','大寶右腳'
  ));

-- Smoke test
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'order_items'::regclass AND conname = 'order_items_position_code_check'
      AND pg_get_constraintdef(oid) LIKE '%大寶左手%'
  ) THEN
    RAISE EXCEPTION '0082 Smoke FAIL: CHECK constraint 未成功擴充';
  END IF;
  RAISE NOTICE '0082 PASS: position_code CHECK 已擴充容納大寶四個新值，舊四值不變';
END $$;
