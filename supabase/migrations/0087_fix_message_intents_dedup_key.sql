-- Migration 0087: 修復 message_intents 冪等鍵誤含 alert_date（2026-08-04 IG 看門狗 P2c 稽核發現）
-- Session 追蹤：is_primary 稽核（205 distinct 訊息全數 is_primary=true，起初懷疑 writer bug，
-- 排查後確認 build_n8n_workflow.cjs:471-480 的 hits.forEach idx===0 邏輯本身正確；
-- 唯一異常係 1 筆重複列：thread woshilili_956096984158193 / message_ig_message_id
-- 1x3u01b0yy7，2026-07-13 與 2026-07-25 各寫入一筆 complaint is_primary=true。
--
-- 根因：原索引 ix_message_intents_dedup（migration 0057 PART 2）含 alert_date（＝寫入當日，
-- 非訊息本身日期）。SOP.md 設計假設「Meta 每天匯出只含增量，同一訊息理論上不會重複出現」，
-- 靠 n8n staticData 的 per-thread cursor（build_n8n_workflow.cjs 約 L249-254）保障只處理一次；
-- 但若 staticData 曾遺失（如工作流被整個重建而非原地更新，cursor 歸零），同一歷史訊息會在
-- 不同 alert_date 下重新命中同一意圖，此時 on_conflict 因 alert_date 不同而視為「新列」，
-- 冪等保障失效，產生重複列（兩筆 is_primary 皆為 true，各自從單次 hits.forEach 角度看正確，
-- 但對同一則訊息而言邏輯上不該有兩個「primary」）。
--
-- 修復：冪等鍵改用訊息本身的自然鍵（thread + message_id + intent_label），不受重跑日期影響，
-- 徹底修正 SOP.md 原本的冪等假設落空的邊界情況。alert_date 欄位保留（僅用於報表/TTL 無關），
-- 不動 PART 5 TTL job（比對 created_at，不受影響）。

-- Step 1：清除既有重複列，保留每組 (thread, message_id, intent_label) 最早一筆
-- （訊息內容本身不因重跑改變，取先到者作為代表列，避免資料遺失爭議）
DELETE FROM public.message_intents a
USING public.message_intents b
WHERE a.message_thread = b.message_thread
  AND a.message_ig_message_id = b.message_ig_message_id
  AND a.intent_label = b.intent_label
  AND a.created_at > b.created_at;

-- Step 2：替換索引，移除 alert_date
DROP INDEX IF EXISTS public.ix_message_intents_dedup;

CREATE UNIQUE INDEX IF NOT EXISTS ix_message_intents_dedup
    ON public.message_intents (message_thread, message_ig_message_id, intent_label);

COMMENT ON INDEX public.ix_message_intents_dedup
    IS '冪等鍵（2026-08-04 修復，migration 0087）：同一訊息 + 同一意圖標籤最多一筆，不含 alert_date——
避免 thread cursor 重置後重跑同一訊息在不同日期繞過去重。對應 n8n Write Intents 節點
on_conflict=message_thread,message_ig_message_id,intent_label（build_n8n_workflow.cjs）。';
