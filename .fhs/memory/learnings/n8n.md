# Learnings — n8n / Workflow

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：20）。

---

## Patterns

1. 四端同步隔離：Supabase 失敗不中斷 Airtable、Airtable 失敗不中斷 Supabase，用 try-catch 分隔鏈路 — 源自 2026-05-16 `@n8n` <!-- v:2026-05-16 -->
2. **Phase 0 payload 流向前置查證**：前端改動影響財務計算前，先 get_node 確認 n8n 是否實際讀取該欄位，再決定隔離策略 — 源自 2026-06-03 `@n8n +frontend` <!-- v:2026-06-03 -->

## Pitfalls

1. **【高頻 ⚠️】n8n + sbSyncOrder 雙寫競態**：responseMode:onReceived 令前端在 n8n RPC 完成前觸發 sbSyncOrder，DELETE+INSERT 與 UPSERT 並發 → 409 .catch() 靜默吞。架構解法：n8n RPC 為 SSoT，sbSyncOrder 只在 webhook 失敗時觸發 — 源自 2026-05-23 `@n8n +supabase` <!-- v:2026-05-23 -->
2. **【更正+補充D55】n8n Code 節點 NAS 限制**：`fetch`/`require`/`process` 三者皆鎖（require('axios') 同樣失敗），改用 HTTP Request 節點；但 `Buffer` 全域物件、`compression` 節點（解壓ZIP）可用；HTTP Request 回應空陣列時下游 0-item 節點被跳過，須設 `alwaysOutputData`。**新症狀（D55，2026-08-02）**：`require('axios')`唔一定靜默失敗，亦可能令Task Runner進程崩潰斷線（`InternalTaskRunnerDisconnectAnalyzer`錯誤+`N8N_RUNNERS_MAX_OLD_SPACE_SIZE`記憶體提示），對外表現為webhook trigger仍回HTTP 200但body完全空——執行記錄`status=error`但呼叫方睇唔到，診斷須查`GET /api/v1/executions`。修法一致：全換原生HTTP Request節點 — 源自 2026-05-22，2026-06-19 修正補充，2026-08-02 D55再補充 [[2026-05-18_n8n-nas-code-node-limits-telegram-debug]] [[2026-06-19_n8n-nas-code-node-buffer-compression-capabilities]] `@n8n` <!-- v:2026-08-02 -->
3. **n8n workflow API 送出限制集**：①POST 建立含 `"active":true` → 400，正確：POST→得ID→單獨 activate；②PUT 更新只接受 `{name,nodes,connections,settings}` 四欄，**且 `settings` 入面仲要再剝走 `binaryMode`**（帶住佢一樣 400；2026-08-03 D57 實測：同批 5 個 workflow 只有帶 `binaryMode` 嗰 2 個失敗，`availableInMCP` 則完全無問題可照帶；剝走後 PUT 成功且 n8n 會自動補回 `"separate"` 預設值，屬無損）；③`process.env.X` 須先載 .env 否則得字面量 `"undefined/..."`；④POST JSON array body 須 `contentType:"raw"`（`specifyBody:"string"`+`JSON.stringify`會被誤序列化成 `{"[...]":""}` → PGRST204）；⑤POST 空陣列 `[]` 觸發 PostgREST "Could not find '[]' column"，寫入前必加 `alerts.length > 0` guard；⑥expression 欄位（Text/URL）不支援 `.filter().map().join()` 鏈式語法，複雜邏輯移至 Code 節點輸出簡單欄位 — Session 67/121/124/127/133 `@n8n` <!-- v:unknown -->
4. **【高頻 ⚠️】SKU 目錄由「整套價焗死件數」改「單件價 × quantity」模型時，必須專門用 qty≥2 測試單驗證 n8n 有冇真的做呢個乘法**：舊系統慣性係「幾多件焗死喺 SKU 字串本身」（`total_base_cost` 已係成套價，n8n 從未需要乘 quantity），新模型改用單件價後，若只改 Supabase 目錄唔改 n8n 計算節點，會少計成本且完全唔會報錯——qty=1 測試會 PASS 掩蓋呢個 bug，要 qty>1 先揭發。同場證實：新增品類專屬固定成本（如頸鏈費）時，必須檢查係咪已經 baked 入新 SKU 單件價，避免同舊有獨立加成邏輯雙重計算 — Session 189/2026-07-24 [[project_order_cost_audit_2026_07_17]] `@n8n +finance` <!-- v:2026-07-24 -->
5. **【高頻 ⚠️】n8n 多節點鏈新增 payload 欄位，必須逐個節點檢查轉發，唔可以淨改頭尾兩端**：Dashboard 新增 `Family_Member_Config` 傳入 webhook 後，只改咗最終寫入節點（`Supabase Mirror Prep`）同計算節點（`Calculate Profit & Pack Items`），漏改中間嘅 `Parse Items & Generate SKU`（負責正規化 SKU 並將原始 payload 逐項轉成內部格式）——呢個節點原本冇轉發呢個新欄位，令下游 `Calculate` 節點永遠讀到空值，計算恆為 $0，零報錯（因為 fallback 邏輯令空陣列合法運算出 0）。真實 live webhook 測試（非純代碼審查）先揭發呢個 bug。修復手法：改任何 n8n 多節點鏈嘅 payload schema 前，用 `get_node` 逐個列出鏈上每一個 Code 節點嘅 output json 結構，確認新欄位喺**每一個**轉手節點都有明確 `field: value` 一行，唔可以假設「頭尾兩端改咗中間自然透傳」 — D49/cl-flow 2026-07-28-1121 `@n8n` <!-- v:2026-07-28 -->
6. **【高頻 ⚠️】Order_ID 缺失時固定字面值 fallback 會令多個不同請求撞落同一筆訂單**：`Parse Items & Generate SKU` 節點對缺 `Order_ID` 嘅請求用固定字面值 `orderId = body.Order_ID || "未命名"` 作退路（crash-defense 設計本意冇問題），但下游 `sync_order_to_mirror` RPC 以 `order_id` 做 UPSERT 仲裁鍵，令**任何**兩次缺 ID 請求（測試腳本忘記帶ID、手動測試、未來任何 malformed 呼叫）都會撞落同一筆殘留訂單，重複觸發「新訂單」Telegram 通知＋令舊訂單復活（`deleted_at` 需要重新清）。任何「缺必要欄位時 fallback 到固定字面值」嘅防禦寫法，若該欄位同時係下游 UPSERT/唯一鍵，必須改用**每次獨立**嘅 fallback（如字面值 + `Date.now()`），唔可以用常數字串 — 源自 2026-08-04（壓測腳本 TC-05 撞出兩日前殘留單）`@n8n +supabase` <!-- v:2026-08-04 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `supabase.md` #1 雙層成本架構
- → `supabase.md` #13 PATCH `?col=eq.<非ASCII值>` 可能 HTTP 200 但實際 0 rows 命中，同 #6 RLS silent-2xx 屬同型「勿信狀態碼」陷阱
- → `frontend.md` #1 Webhook payload 缺漏（Late Enrichment）
<!-- POINTERS:END -->
