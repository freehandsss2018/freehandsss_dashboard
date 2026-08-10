# Learnings — Supabase / Postgres / PostgREST

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：20）。

---

## Patterns

1. 雙層成本架構：Supabase View（Layer 1 即時報價）+ n8n 靜態寫入（Layer 2 歷史快照），職責不重疊 — 源自 2026-05-16 `@supabase +n8n` <!-- v:2026-05-16 -->

## Pitfalls

1. **PostgreSQL/PostgREST 型別與過濾陷阱**：①`->>` 得 text，不能隱式轉型為 ENUM，須 explicit cast `(v_json->>'field')::order_status`（42804）；②SKU 含括號時（如 "木框套裝 (4肢)"），過濾值必須用雙引號包裹 `sku.like."FILTER*"` — 源自 2026-05-23 `@supabase` <!-- v:2026-05-23 -->
2. **RPC GRANT 安全層級**：SECURITY DEFINER 函式若寫業務表（如 products），GRANT 應給 service_role 而非 anon；否則任何持 anon key 的人可觸發 — 源自 2026-05-28 `@supabase` <!-- v:2026-05-28 -->
3. **Migration 套用時序與可見性**：①新欄位加入 SELECT 或 PATCH body 前必確認 migration 已套用，否則 PostgREST 400（順序：migration 套用→加 SELECT→加 PATCH）；②`CREATE TABLE IF NOT EXISTS` 在表已存在時靜默跳過，後續 PART（ALTER/INSERT/RPC）不執行無報錯，各 PART 必須有獨立 smoke-test 查詢 — 源自 2026-05-26，2026-05-29 `@supabase` <!-- v:2026-05-29 -->
4. **批量 UPDATE 前必先 SELECT 記錄原始值**：直接 UPDATE 無法回滾（Supabase 無交易歷史），Airtable 備份不保證有值。每次批量改狀態前先 `SELECT ... RETURNING` 存快照 — 源自 2026-06-11 `@supabase` <!-- v:2026-06-11 -->
5. **【Pitfall #19】Postgres `CREATE OR REPLACE FUNCTION` 不能改參數名**：`CREATE OR REPLACE` 替換函數時若參數名與原函數不同，報 `42P13: cannot change name of input parameter`。解法：保留原參數名，或先 `DROP` 再建。改函數前必須讀原 migration SQL 確認 param names — Session 130 Phase B `@supabase` <!-- v:unknown -->
6. **【高頻 ⚠️】移除 RLS 政策前必查真實呼叫+驗真實資料狀態，勿信 HTTP 200**：稽核「表是否有 anon 呼叫」不能只 grep 單行 pattern（`method:'DELETE'` 常與 URL 分行漏判）；移除政策後，若 table 級 GRANT 仍在但無 permissive RLS，PostgREST 回 HTTP 200+0 rows 而非 403，驗收只看 status code 會誤判成功。政策變更驗收須用真實（非 bogus）測試列，確認資料真的被改動 — Session 168 [[2026-07-12_rls-policy-removal-silent-2xx-write-failure]] `@supabase` <!-- v:2026-07-12 -->
7. **PostgREST `Prefer:ignore-duplicates` 冪等假象**：POST body 不帶 PK 值時，UPSERT 仲裁鍵預設落 PRIMARY KEY（永不匹配），URL 未帶 `?on_conflict=<欄位>` 明確指定真正的 dedup UNIQUE INDEX 就不會生效——真撞號時 23505 打回整批，配合 `continueOnFail`+`return=minimal` 會靜默丟失整批資料。任何用 ignore-duplicates 模式的 POST 節點，必須確認 on_conflict 參數對齊真正的 dedup 索引欄位。**附加陷阱**：若 dedup 索引是 expression index（如 nullable 欄位常見的 `COALESCE(col,'')`），PostgREST 的 `on_conflict` 只接受 plain column 名稱、不支援 expression，不能照抄 plain-column 表的修法直接把欄位名塞進去——須先加具現化欄位（`GENERATED ALWAYS AS (expr) STORED`）+ 對應 plain-column 唯一索引取代原 expression index，`on_conflict` 才能正確命中 — Session 171/171續II [[project_p2a_ig_message_pii]] `@supabase` <!-- v:unknown -->
8. **【高頻 ⚠️】新增/沿用 status-filter 查詢前必查權威完成旗標 + 生產真實字面值**：`v_delivery_reminders` view 從未引用 `orders.is_archived`（S104 `fhs_complete_order` 寫入嘅權威完成旗標），只靠兩個已失效嘅 process_status 字面值過濾（order 層 `NOT IN('完成','已取件','已取消')`——生產數據從未出現過呢三值；item 層 `NOT IN('完成','已取件')`——漏咗佔多數嘅真實完成值 `'Done 已完成'`），令33筆入面16筆已完成單被誤判逾期。同一「已完成」語義若 DB層 view 同前端各自實作過濾守衛（見 Logic_Overview.md §10.9 `_fhsArchivedIds`），好易漏一處。任何新增讀取「訂單是否完成」嘅查詢，必須 (a) 確認有冇引用 `is_archived` (b) 實測（非假設）字面值是否等於生產真實值 — Session 187續XIII/2026-07-22 [[project_financial_rpc_status_filter_bug]] `@supabase +finance` <!-- v:2026-07-22 -->
9. **【高頻 ⚠️】SQL 用 `col NOT IN (已完成清單)` 過濾「未完成」項時，`col IS NULL` 永遠回傳 UNKNOWN 而非 TRUE，令 NULL 資料兩頭唔到岸**：`v_delivery_reminders` view 用 `oi2.process_status NOT IN ('完成','已取件',...)` 判斷品項未完成，但品項剛建立、狀態仍係 NULL（從未被觸碰過）嘅新訂單，NULL 三值邏輯令呢個 EXISTS 判斷完全唔命中，整張訂單就咁樣喺 view 消失（連「正常」都唔顯示）。任何用 `NOT IN` 排除已完成清單嘅過濾條件，必須明確加 `OR col IS NULL`（NULL 通常語意上最應該落入「未完成/未設定」分支），唔可以假設 NULL 會自然歸邊。同 session 亦證實：舊系統遺留嘅字面值 ENUM（如「完成」vs 畫面下拉選單/checkbox 產生嘅「Done 已完成」）即使語意相近都唔可以假設等價——同一字面值喺唔同訂單可能代表完全相反嘅真實狀態，任何完成判斷邏輯只應信任「當前 UI 唯一產出路徑」會寫入嘅字面值 — D44/2026-07-23 `@supabase` <!-- v:2026-07-23 -->
10. **新增資料表欄位後，除咗n8n寫入鏈，仲要逐一檢查前端所有獨立 fetch 呢個表嘅 SELECT query 有冇跟住補齊**：`order_items` 新增 `position_code/drawing_waived/drawing_charged_count/cost_model_version` 四欄後（migration 0073），Dashboard 入面同一個 `Freehandsss_dashboardV42.html` 有 6+ 處各自 hand-written 嘅 `rest/v1/order_items?select=...` fetch（訂單明細/財務彈窗/批次狀態等唔同用途），只改咗寫入鏈（n8n Mirror Prep + RPC）冇同步檢查所有讀取端，令財務彈窗完全冇資料可用（欄位值一律undefined）但零報錯——表面睇落似邏輯bug，實際係fetch漏欄位。修復手法：新增/改動任何表結構化欄位後，`grep "rest/v1/<table>?"` 列晒所有讀取點，逐一核對select list 是否需要同步 — Session 189/2026-07-24 [[project_order_cost_audit_2026_07_17]] `@supabase +frontend` <!-- v:2026-07-24 -->
11. **【高頻 ⚠️】Supabase RPC 要限「service_role only」，單靠 `GRANT EXECUTE ... TO service_role` 唔夠，anon 依然叫得動**：Supabase 專案級 `pg_default_acl` 對 public schema 新函式自動 GRANT EXECUTE 俾 anon/authenticated/service_role（平台既有預設）；PostgreSQL 函式建立時另有 PUBLIC 偽角色預設授權（`proacl` 顯示 `=X/postgres`），所有角色自動係 PUBLIC 隱含成員會繼承——`has_function_privilege('anon',...,'EXECUTE')` 喺兩層都冇 REVOKE 前依然回傳 true。真正做到限制需要兩層都 REVOKE：`REVOKE EXECUTE ON FUNCTION ... FROM anon, authenticated;` **加埋** `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC;`（後者先係關鍵，前者淨係處理明確授權）。驗證方式必須用 `has_function_privilege()`（真實 effective 權限，非淨睇 `pg_proc.proacl` 表面有冇具名 grant）或直接用 anon-key REST 呼叫確認回 401——IG 看門狗學習系統 `fhs_touch_ig_thread_rules` 審計計數器 RPC 即場踩中，兩次 REVOKE 先真正鎖死 — IG看門狗Phase C/2026-08-01 `@supabase` <!-- v:2026-08-01 -->
12. **【高頻 ⚠️】規則系統由「thread 級」擴展成「全域生效」時，原有嘅「訊息內容存在」防偽護欄唔再夠——要問清楚呢個護欄嘅資料源頭本身係咪受同一信任邊界保護**：thread 級規則（0084）用「規則只可綁真實存在嘅警報」做護欄天然安全，因為攻擊者最多操控自己個 thread（自殘，唔影響他人）；但擴展成全域規則（0086）後，同一句「phrase 必須出現喺來源訊息」邏輯唔再夠——若來源表（`ig_messages`/`ig_watchdog_alerts`）RLS 對 anon 開 SELECT、且來源訊息可經外部管道（IG DM）自動觸發入庫，攻擊者可自行製造一則「合法」來源訊息去餵飼護欄，寫出全域生效嘅惡意規則（例如全域抑制某個成交關鍵詞令看門狗永久靜默）。修法：全域規則加二段式狀態機（`proposed`/`approved`），寫入時只可造未生效嘅提案，真正生效需另一個信任層級（service_role）批准，DB CHECK 約束喺資料庫層強制此順序，即使上層代碼寫錯都擋得住。設計「跨個體/跨客人生效」嘅規則系統前，thread 級 vs 全域級睇落似只係 scope 大細差異，實際上信任模型完全唔同，唔可以直接複製 thread 級護欄嘅安全假定 — cl-flow 2026-08-04-0244（IG看門狗Phase 2a，A2 Gemini對抗評審揪出兩條BLOCKER）`@supabase +governance` <!-- v:2026-08-04 -->
13. **PATCH `?col=eq.<非ASCII值>` 可能 HTTP 200 但實際 0 rows 命中，同 #6 RLS silent-2xx 屬同型「勿信狀態碼」陷阱**：n8n `Mirror Delete to Supabase` 節點用 `orders?order_id=eq.{{encodeURIComponent(...)}}` PATCH 刪除中文 Order_ID（如「未命名」）嘅訂單，執行記錄顯示 success、HTTP 200，但直接查 DB 確認 `deleted_at` 完全未被寫入；改用 `execute_sql` 直接 UPDATE 即時成功，排除咗 RLS/GRANT 問題。根因未查清（疑似 URL 編碼後嘅中文值同 PostgREST filter 比對唔上），但驗收紀律同既有教訓一致：任何靠 PATCH/DELETE 嘅 `?col=eq.<動態值>` 刪除/更新非純 ASCII 或罕見格式嘅識別碼後，必須直接查 DB 確認實際受影響列數，唔可以只信 HTTP 狀態碼 — 源自 2026-08-04 `@supabase +n8n` <!-- v:2026-08-04 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `frontend.md` #10 【高頻 ⚠️】屬性值做 HTML 轉義對 `getElementById` 係完全透明——唔好為咗「轉義會令查找對唔上」而去正規化資料本身
- → `n8n.md` #1 【高頻 ⚠️】n8n + sbSyncOrder 雙寫競態
- → `n8n.md` #6 【高頻 ⚠️】Order_ID 缺失時固定字面值 fallback 會令多個不同請求撞落同一筆訂單
<!-- POINTERS:END -->
