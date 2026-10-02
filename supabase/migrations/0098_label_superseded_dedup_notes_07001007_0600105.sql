-- 0098_label_superseded_dedup_notes_07001007_0600105.sql
-- 2026-10-03 — 純審計說明：標明 0076/0077 寫入嘅 drawing_position_dedup_deduction note 已被 0097 取代
--
-- 【背景】migration 0097（D104）更正 07001007／0600105 嘅 total_cost 後，兩單 n8n_adjustment_notes 內
--   0077 追加嘅「同部位第2件起免畫圖費」note（07001007 −220／0600105 −440）仍留喺度，
--   訂單財務頁會顯示成扣減 badge，同新 total_cost 對唔上。finance-auditor 驗收（2026-10-02）觀察 2。
-- 【改動】只喺該 note 嘅 desc 末尾追加說明文字；amount/detail/type 一律不變；不碰任何成本／售價欄位。
--   Fat Mo 2026-10-03 批准（「跟你建議做」＝補一句「已被 0097 取代」）。
-- 【冪等】只處理 desc 未含「0097」嘅 note；重跑 0 行。

UPDATE orders o
SET n8n_adjustment_notes = (
    SELECT jsonb_agg(
        CASE
            WHEN n->>'type' = 'drawing_position_dedup_deduction'
                 AND COALESCE(n->>'desc','') NOT LIKE '%0097%'
            THEN jsonb_set(n, '{desc}', to_jsonb((n->>'desc') || '（⚠ 此扣減已被 migration 0097 取代：該單 total_cost 已按 0097 更正，本 note 金額僅供歷史參考，不再對應現行總額）'))
            ELSE n
        END
        ORDER BY ord)
    FROM jsonb_array_elements(o.n8n_adjustment_notes) WITH ORDINALITY AS t(n, ord)
)
WHERE o.order_id IN ('07001007', '0600105')
  AND jsonb_typeof(o.n8n_adjustment_notes) = 'array'
  AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(o.n8n_adjustment_notes) e
      WHERE e->>'type' = 'drawing_position_dedup_deduction' AND COALESCE(e->>'desc','') NOT LIKE '%0097%'
  );
