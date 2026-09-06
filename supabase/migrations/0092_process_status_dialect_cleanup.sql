-- [D69續四根治] 清洗 order_items.process_status / precomplete_status 歷史遺留嘅
-- ENUM 風格舊方言，令佢哋同 fhs_complete_order RPC／根治後前端一律寫入嘅「畫面原文」
-- 對齊。呢兩個欄位都係自由 text（冇 ENUM、冇 constraint，pg_constraint 已查證零約束），
-- 純資料層面清洗，唔涉及 schema 改動。
--
-- 範圍依 Fat Mo 2026-08-26 拍板（decisions.md D69續四）：
--   ①『製作中』刻意唔喺呢度清洗——細階段資訊已不可還原，維持原值 + 前端已有嘅
--      ⚠ 原值下拉提示，由 Fat Mo 逐筆人手指定正確階段，程式唔猜測。
--   ②SQL 清洗同 HTML 修復一次過上線（本 migration + 同一輪 commit 嘅前端改動）。
--   ③手模 checklist 專屬值（`已book日期`／`hm:...`）唔喺呢度處理——佢哋嘅根治
--      係前端移除 _sanitizeItemStatus() 寫入轉換（見 V42.html），資料本身唔需要
--      清洗，一移除轉換就自動正確往返。
--
-- process_status 執行前分佈（2026-08-26 live 查證）：
--   'Done 已完成' 65 | null 32 | '完成' 17 | '製作中' 8(不清洗) | '已book日期' 7(不清洗)
--   | '待製作' 4 | 'hm:已book|已做laser' 1(不清洗) | '需進行補打' 1
-- precomplete_status 執行前分佈：
--   null 79 | '完成' 54 | '0 什麼都未做' 1(已係canonical，無需改) | '待製作' 1
--
-- A2 Gemini 對抗評審 BLOCKER①：precomplete_status 同款污染範圍原方案漏咗，
-- fhs_uncomplete_order 會由呢個欄位還原，若唔一併清洗，「取消完成」操作會令
-- 舊方言死灰復燃。本 migration 已擴大範圍涵蓋兩欄。

update order_items
   set process_status = 'Done 已完成'
 where process_status = '完成';

update order_items
   set process_status = '0 什麼都未做'
 where process_status = '待製作';

update order_items
   set precomplete_status = 'Done 已完成'
 where precomplete_status = '完成';

update order_items
   set precomplete_status = '0 什麼都未做'
 where precomplete_status = '待製作';
