# Learnings — Dashboard 前端 HTML/JS

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：25）。

---

## Patterns

1. 同步進度輪詢機制：同步後切換訂單總覽，前端以 4s 輪詢 Supabase（20s 超時），進度 Banner 提供樂觀 UI — 源自 2026-05-23 `@frontend` <!-- v:2026-05-23 -->
2. **data-spec 通過屬性隔離**：DOM 顯示文字為衍生標籤時，必以 `data-spec="..."` 存原始值供 save 讀取；直接讀 textContent 會把 UI label 寫入 DB — 源自 2026-05-27 `@frontend` <!-- v:2026-05-27 -->
3. **`_isAddon()` + `_addonType()` 多配件過濾架構**：三層向後兼容（key 後綴 match → name keyword → category fallback）；新配件只需在 `_addonType()` 加一個 return 分支；已取代舊版「單一配件 filter 假設」問題類別 — 源自 2026-05-27 `@frontend` <!-- v:2026-05-27 -->
4. **`_fhsCostReady` flag 競態防護**：page-load 讀 Supabase 後才設 true；calculatePricing 入口 guard 若 false 拒絕計算，防空值算出 0 — 源自 2026-06-02 `@frontend` <!-- v:2026-06-02 -->
5. **`chargedPositions Set` 跨陣列追蹤**：PartDesc trim+toLowerCase 正規化，同部位跨產品第 2 件 baseDrawing=0；新產品類型必查是否需擴充 Set — 源自 2026-06-02 `@frontend` <!-- v:2026-06-02 -->

## Pitfalls

1. **Webhook payload 缺漏（Late Enrichment）**：enrichment 在 response.ok 後才執行，webhook 發出時 items 缺 `_ui_process_status`/`_ui_batch_number`。UI 狀態必須在 fetch() **前**注入 — 源自 2026-05-23 `@frontend +n8n` <!-- v:2026-05-23 -->
2. **【高頻 ⚠️】Chrome Date Parsing + 排序還原失效**：`new Date("DD/MM/YYYY")` → Invalid Date；載入時還原 filters 繞過 applyReviewFilters()。解法：正則手動解析 DD/MM/YYYY；fetch callback 尾端強制呼叫 applyReviewFilters() — 源自 2026-05-25 `@frontend` <!-- v:2026-05-25 -->
3. **【高頻 ⚠️】mapOrder() return object 不含 deposit/balance**：`mapOrder()` 只映射 `Final_Sale_Price / Additional_Fee / Net_Profit / Total_Cost / Adjustment_Amount`，`Deposit`/`Balance` 完全缺席。凡需讀 deposit/balance，必須從 Supabase orders fresh fetch 的 `extra` 物件讀取 — Session 103 `@frontend` <!-- v:unknown -->
4. **openOrderModal 第二參數是 catFilter 非 tab**：第二位 catFilter（'A'手模/'B'金屬/空=全訂單）控制標題與文本分段；要指定開啟分頁必須用**第三參數 initialTab**（內部呼 switchModalTab）。誤把 'finance' 當第二參數 → 捷徑永遠停訊息文本分頁 — Session 109 `@frontend` <!-- v:unknown -->
5. **【高頻 ⚠️】Dashboard 巨檔多 `<script>` block，看似頂層 function 可能只是另一 IIFE 內的區域函式**：`_findOrder` 定義在獨立 `<script>(function(){...})()` （P3/P4 Bottom-Sheet 區塊）內，於較早 script block 呼叫得 `ReferenceError`，onchange handler 內被靜默吞掉、UI 無任何反應。新函式引用「看起來是全域」的 helper 前，grep 確認其宣告是否包在 IIFE 內；務必實機點擊驗證（confirm/console mock），不能只靠語法檢查 — Session 161續 `@frontend` <!-- v:unknown -->
6. **【高頻 ⚠️】「每件扣減率」config key 唔可以複用嚟當「每件加項成本」**：`calculatePricing()` 將 `charm_shipping_deduction_per_extra`/`keychain_shipping_deduction_per_extra`（設計原意＝多件扣減單價）誤當 `BaseShippingCost` 逐件疊加落總成本，同真正嘅 `_totalShippingDeduction` 扣減項並存，變成「加咗全額、扣返N-1件」嘅隱性雙計——總數睇落唔算離譜（多$220/張），必須同 n8n 真實公式逐分量拆解先揪到。凡見到同一個 config value 被兩個唔同語意變數（加項 vs 扣減率）共用，要追查是否重複計算 — Session 187/2026-07-21 [[project_akira_shipping_double_count]] `@frontend +finance` <!-- v:2026-07-21 -->
7. **【高頻 ⚠️】`switchMode()` 等核心切換函式內部嘅 async 副作用（fetch+重繪）若冇 `await`，呼叫端喺其後做嘅 DOM 操作會被隨後先完成嘅重繪洗走**：`switchMode('review')` 內部 `fetchGlobalReview()` 從未 `await`（fire-and-forget），5個呼叫點（「返回」按鈕+3條「審閱」送出成功路徑）都係 `switchMode` 完就緊接 `flashOrderRow(oid)` 加 class，但 `switchMode` 內部未等待嘅 fetch 常喺 flash class 加咗之後先完成，整個表格重繪令 class 一併被洗走——race condition 唔係每次必現，靠網路/渲染速度撞時機，過去偶爾撞對先「睇落正常」。凡呼叫一個 `async function` 卻唔 `await` 佢，就假設咗佢副作用即時完成——呢個假設喺函式本身冇強制 `await` 內部非同步呼叫時必然錯。修復手法：核心函式內部嘅非同步副作用一律 `await`，令呼叫端 `await switchMode(...)` 之後嘅保證同函式名字義相符 — Session 2026-07-23 [[feedback_verify_active_code_path_before_analysis]] `@frontend` <!-- v:2026-07-23 -->
8. **【高頻 ⚠️】任何「逐欄位比對後產生使用者可見文字」嘅功能，用寫死對照表必然隨欄位增長靜默退化——要用命名規則解碼 + 兜底**：修正訂單 Telegram 訊息嘅 `Update_Note` 產生器逐個 `captureFormState()` 欄位比對報告，但 `labelMap` 只得 8 條中文對照；browser 實測 `captureFormState()` 實際回傳 102 個欄位，即 88 個（86%）一改動就直接吐原始英文變數名（`m_baby_sec_en`／`depositSplitData`）俾 Fat Mo 睇。呢類 bug 唔會報錯、唔會被測試捉到，只會喺 Fat Mo 啱啱改中某個未覆蓋欄位嗰陣先暴露，所以可以潛伏好耐。**修復手法**：①用欄位命名規則寫解碼器（FHS 部位欄位為 `{k|m}_[e_]{lh|rh|lf|rf}_{en|qty|top|bot|color|eng}`），令將來新增同規則欄位自動有中文名，唔使記得補表；②保留兜底出原始名（寧可醜，唔好靜默漏報）；③內部欄位（JSON 結構／純顯示鏡像／會寫穿去真實欄位嘅共用輸入格）應該 skip 而非改名，因為報咗等於同一改動出兩次。**判斷訊號**：見到 `labelMap`／`fieldNames` 之類物件字面量而資料源係動態掃 DOM（`querySelectorAll('input,select')`），就一定要問「呢張表覆蓋率係幾多 %」 — D57/2026-08-03 [[feedback_verify_active_code_path_before_analysis]] `@frontend` <!-- v:2026-08-03 -->

## Preferences

1. **完成訂單唯一出口為 Modal 審閱**：桌面/手機均不設直接 syncToAirtable 按鈕，操作者必須進入 Modal 審閱後才能同步。Modal 入口永遠可點 — 源自 2026-05-31 `@frontend` <!-- v:2026-05-31 -->
2. **視覺改動若會犧牲原有語意（如財務科目色彩區分）需先問，不要單方面統一簡化**：表頭對比度不足，修法是統一改白字，犧牲了入帳/成本/利潤原本紅綠琥珀的語意色彩區分；Fat Mo 檢視後不滿意，要求整段回退（含背景漸層也退回更早版本）。下次遇到「有取捨」的視覺修復，先列選項問，別直接套一個方案上去 — S159續 `@frontend` <!-- v:unknown -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `supabase.md` #10 新增資料表欄位後，除咗n8n寫入鏈，仲要逐一檢查前端所有獨立 fetch 呢個表嘅 SELECT query 有冇跟住補齊
- → `n8n.md` #2 Phase 0 payload 流向前置查證
<!-- POINTERS:END -->
