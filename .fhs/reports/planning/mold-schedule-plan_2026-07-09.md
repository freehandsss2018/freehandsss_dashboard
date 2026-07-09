# 取模排程中心 — 實施方案書（交 Sonnet 執行）

> 產出：2026-07-09（S159 規劃）。範圍：A 撞期即時提示 + B 迷你月曆 + C 今日取模一覽 + D 過期未更新警示 + E 未約日期名單。
> 明確不在範圍：F 提醒文案 / G 交收日入曆 / H 封日功能（涉 schema，需 Fat Mo 另批）/ I 補打追蹤 / J 未取件提醒。範圍外即使看到問題也不做，記入回報「發現但未動」。

---

【目標】在 FHS Dashboard V42 加入取模日期撞期檢查與排程一覽，共 5 個功能（A–E），全部純前端、read-only Supabase 查詢。

【動機】操作者（mobile POS，極度防呆導向）而家揀取模日期時零提示，撞期靠人腦記。做完之後：揀日期即時見到當日已有邊幾單（A）、開月曆一眼睇晒成個月鬆定逼（B）、朝早開「訂單」頁即見今日邊個客嚟（C）、甩咗手尾嘅單自動浮面（D/E）。
邊界取捨原則：**寧可顯示「未能檢查」都唔可以假綠色**——檢查失敗時絕不能令操作者以為安全。

【上下文 — 相關檔案與角色】
- `Freehandsss_Dashboard/freehandsss_dashboardV42.html` — 唯一要改嘅檔案（production，S115 裁決）。**唔好碰** `Freehandsss_dashboard_current.html` 同 archive/ 下任何檔。
- `.fhs/ai/skills/ui-ux-pro-max/FHS_INTEGRATION.md` Section 六 — V42 排版鐵律唯一居所，**動 UI 前必讀**。
- `.fhs/ai/AGENTS.md` — 硬規則（HTML ID 合約等），有疑問查佢。

【上下文 — 已核實錨點】（行號為 2026-07-09 快照，動手前先 grep 重新定位，唔好盲信）
- 約定日期欄：line 3744 `<div class="form-group"><label>約定日期</label><input type="date" id="appDate" onchange="generate()"></div>`
- 取模時間欄：line 3745–3753，`appTimeHour`（值如 `"3:30"` 或 `"待定"`）+ `appTimeAmPm`（`AM`/`PM`）
- 非取模單時 `appDate` 會被 disabled：line 5679–5701（`_syncOrderTypeUI` 一帶）
- Supabase 請求既有寫法（照抄呢個 pattern）：line 7232–7237，`fetch(`${_sbUrl}/rest/v1/orders?...`, { headers: { apikey: _sbKey, Authorization: `Bearer ${_sbKey}` } })`；全域另有 `SB_URL`（line 4978 / 13509）
- 編輯模式判斷：`currentMode === 'edit' && editTargetOrderId`（line 7645 用法示範）
- 訂單頁容器：`reviewModeContainer`（line 3483），內部順序 = `reviewZone2`（3489）→ `reviewFiltersV2`（3511）
- 訂單快取：`globalOrders`（宣告 line 8062；載入完成點 line 8480 cache 路徑 / line 8521 網絡路徑）
- 取模服務開關：checkbox `enableP`（line 3791）；存入 `raw_form_state.enableP`
- 有效狀態集：line 4986（`待製作/製作中/完成/已取件/需進行補打/已book日期/已取模/待交收`）

【設計規格】

### 共用常數（放喺新函數群頂部，一處定義）
```js
const CLASH_WINDOW_MIN = 60;   // 兩單取模時間相距少於此分鐘數 = 紅色撞期（Fat Mo 可調）
const CLASH_CACHE_TTL = 30000; // 同一日期查詢結果快取 30 秒
```

### A. 撞期即時提示（新增訂單 + 修改訂單表單）
1. `appDate` 所在 form-group 內、input 之後加 `<div id="clashHint" style="display:none;"></div>`。
2. 新函數 `checkMoldDateClash()`：
   - `appDate` 空值或訂單類型=不含取模服務 → 隱藏 hint、直接 return。
   - 顯示「檢查中…」灰色狀態 → fetch `orders?appointment_at=eq.{日期}&deleted_at=is.null&select=order_id,customer_name,raw_form_state`。
   - **客戶端過濾**：只計 `raw_form_state` 存在且 `enableP === true || enableP === 'true'` 嘅單（歷史單有非取模單都寫過 appointment_at，唔過濾會誤報）。
   - **排除自己**：`currentMode === 'edit' && editTargetOrderId` 時，剔走 `order_id === editTargetOrderId`。注意 FHS 單號係字串（如 `FHS-ABC123`），**唔係 UUID**——已知 pitfall。
   - 時間 normalize：`appTimeHour`+`appTimeAmPm` → 24 小時制分鐘數（PM 且 h≠12 加 720；AM 且 h=12 作 0）；`"待定"` / 缺值 → `null`。
   - 判級：無同日單 → **綠**「當日冇其他取模預約」；有同日單且與本單時間相距 `< CLASH_WINDOW_MIN` → **紅**「撞正時段」並列出對方時間+客名+單號；其餘 → **黃**，逐單列 `時間 · 客名 · 單號`；時間為 null 嘅對方單固定入黃組標「時間待定」，**永不觸發紅**；本單時間未揀時最多黃。
   - **失敗態**：fetch 拋錯或非 2xx → 琥珀色「⚠ 未能檢查撞期，請自行核對」。**任何情況下失敗都唔准顯示綠色或空白**。
   - **race guard**：模組級遞增 `_clashSeq`，response 返嚟時 seq 唔係最新即棄。
   - 快取：`Map<dateStr, {ts, rows}>`，TTL 30 秒；時間下拉改變時用快取重判級，唔重新 fetch。
3. 接線（三處，全部走三步替換）：
   - `appDate` 的 `onchange="generate()"` → `onchange="generate(); checkMoldDateClash()"`
   - `appTimeHour` 的 `onchange="generate()"`（line 3747）→ 加 `; checkMoldDateClash()`
   - 編輯模式載入舊單回填表單完成後（reconstruction helper 尾部，grep `updateIdStatus('available'` 定位）call 一次。
4. 三色一律 icon+文字並行，唔准淨靠顏色（色盲防呆）。樣式用現有 `--fhs-*` CSS 變數，唔好發明新色板。

### B. 迷你月曆
1. 約定日期 label 行尾加一個小掣（📅 或現有 icon sprite），開 `<div id="moldCalPopup">`。
2. `openMoldCalendar(year, month)`：一次 query 成個月 `appointment_at=gte.{月頭}&appointment_at=lt.{下月頭}&deleted_at=is.null&select=order_id,appointment_at,raw_form_state`，同樣客戶端過濾 enableP，按日計數。
3. 7 欄格仔：今日=外框高亮；1 單=橙點；≥2 單=紅點；撳日子 → 回填 `appDate` + 觸發 `generate()` + `checkMoldDateClash()` + 收埋月曆。左右箭嘴切月（每月一次 query，同樣 30s 快取）。
4. 手機（窄屏）用 bottom-sheet 形式，唔好用細 popup；跟 Section 六排版鐵律。
5. 撳月曆掣以外位置 / Esc 收埋；月曆唔准遮住 appDate input 本身。

### C+D+E. 取模排程面板（訂單 review 頁）
1. 喺 `reviewModeContainer` 內、`reviewZone2` 之後 `reviewFiltersV2` 之前插入 `<div id="moldSchedulePanel">`，可收合（預設展開），標題「取模排程」。
2. 資料來源：**直接用已載入嘅 `globalOrders`，唔准另發網絡請求**。喺 line 8480（cache 路徑）同 line 8521（網絡路徑）兩個載入完成點之後 call `renderMoldSchedulePanel()`。注意 `globalOrders` 元素係 `mapOrder()` 產物——動手前 grep `function mapOrder` 核實欄位名（appointment date / process status / enableP 喺 mapped object 上叫乜），唔好靠估。
3. 三組（每組空 = 顯示一行「—」，唔好成組隱藏，等操作者知道系統有檢查過）：
   - **今日取模**：appointment date == 今日（本地時區）且含取模服務。行格式：`時間 · 客名 · 單號`，按時間升序，時間待定排最尾。
   - **過期未更新**（D）：appointment date < 今日 且 status == `已book日期`。行尾標紅色「已過 N 日」。
   - **未約日期**（E）：appointment date 為空 且 含取模服務 且 status ∉ {`完成`,`已取件`}。行尾標「落單至今 N 日」。
   - D/E 組各限顯示最舊 10 筆，多過 10 顯示「仲有 N 筆」。
4. 每行可撳 → 開該單現有詳情（grep 現有 review 列表行嘅 onclick 慣例照抄；傳 **FHS 字串單號**，唔係 UUID）。

【硬約束】
1. 禁改任何現有 HTML ID / 禁刪 contract-critical ID（AGENTS.md ID 合約）。
2. 禁動 `captureFormState` / `generate()` 內部邏輯 / 任何財務欄位計算 / sync 流程——本任務只准「追加」，唔准「修改語義」。
3. 巨檔紀律：V42 HTML **禁全檔 Read**，一律 Grep 定位 → 窗口讀（≤250 行）。
4. 巨檔替換三步：每處改動 改前 `grep -c` 舊字串=1 → 替換 → 改後 舊字串=0、新字串=1，計數證據入回報。
5. Supabase 只准 SELECT（publishable key）；禁 INSERT/UPDATE/DELETE；禁碰 n8n。
6. 新函數唔准包大 try-catch 吞錯（TDZ silent catch 已知教訓）——catch 只准包 fetch 網絡層，且 catch 內必須 render 失敗態 UI。
7. 只改 `freehandsss_dashboardV42.html` 一個檔。

【驗收條件】（逐條可機械判定；4–7 用 playwright 實測，唔准純讀碼自證）
1. 全部替換點附三步計數證據（改前 1 → 改後 舊0新1）。
2. 頁面載入無新 console error（playwright 開頁截 console）。
3. 新增模式揀一個已有取模單嘅日期 → `#clashHint` 於 2 秒內出現黃或紅，內容含對方單號；揀無預約日期 → 綠。
4. 編輯模式載入某單、日期不變 → 唔會同自己撞（僅自己嗰日=綠）。
5. playwright route abort Supabase 請求 → `#clashHint` 顯示琥珀「未能檢查」，**非綠非空白**。
6. 月曆某日點數 == 該日實際取模單數（附對照用嘅 Supabase REST 查詢輸出）。
7. 訂單頁 `#moldSchedulePanel` 三組數字與 `globalOrders` 按同樣條件人手過濾嘅結果一致（附過濾用嘅 console 命令輸出）。
8. 手機視窗（375px）下 A hint 全寬正常摺行、B 為 bottom-sheet、C/D/E 面板可收合——playwright viewport 實測截圖。

【卡關協議】遇阻塞回報四態之一，不得沉默重試：DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED。`mapOrder` 欄位名同預期不符、或發現 appointment_at 語義同本方案假設矛盾 → 即報 NEEDS_CONTEXT，唔好靠估硬做。

【回報格式】≤40 行：改動檔案+行號範圍（每處一行說明）→ 驗收條件 1–8 逐條附證據 → 未處理邊界情況 → 「發現但未動」清單 → 信心：高/中/低+一句理由。diff >50 行落檔傳路徑。

【待 Fat Mo 隨時可調嘅參數】`CLASH_WINDOW_MIN`（現默認 60 分鐘）；D/E 每組顯示上限（現 10）。
