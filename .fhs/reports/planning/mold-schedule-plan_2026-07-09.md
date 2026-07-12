# 取模排程中心 — 實施方案書（交 Sonnet 執行）

> 產出：2026-07-09（S159 規劃）。2026-07-12（S170）經 `grilling` 技能拷問修訂，決策見 `decisions.md` D27 附錄。範圍：A 撞期即時提示 + B 迷你月曆 + C 今日取模一覽 + D 過期未更新警示 + E 未約日期名單。
> 明確不在範圍：F 提醒文案 / G 交收日入曆 / H 封日功能（涉 schema，需 Fat Mo 另批）/ I 補打追蹤 / J 未取件提醒。範圍外即使看到問題也不做，記入回報「發現但未動」。

## ⚠️ S170 拷問修訂——分兩期執行（唔再係五樣一次過做）

**緣起**：Fat Mo 親述實際攞模節奏——「一日最多三單：上午一單/下午一單/晚上一單（好少），每單連傾偈核對埋單交通至少3小時」，但「冇絕對」（有時相距較近但交通方便都接納）；同時指出對 A（即時撞期提示）實際效果無信心，反而 B（月曆睇成日）最有把握有用；並揭露一個原方案冇考慮嘅真實使用場景——操作者跟客人傾緊嗰陣（未開訂單）就要睇「7月8月邊幾日得閒」再建議俾客揀，唔淨止係開緊訂單表單嗰刻先睇月曆。

**第一期（本次執行）**：B（月曆，含新增獨立入口）+ C（今日取模一覽）+ D（過期未更新）+ E（未約日期）。呢四項純顯示、冇判斷邏輯風險，工程直接、驗收機械化容易。

**第二期（延後，待第一期實際用過一排再決定值唔值得做）**：A 改做**簡化版**——唔做原方案嘅三色判級（紅/黃/綠）+ race guard + 30秒快取呢套完整工程，淨係喺 `appDate` 揀咗日子之後加一句樸素文字「呢日已有 N 張取模單」（純顯示已有幾多張，唔判斷撞唔撞、唔畀顏色警示）。原方案 A 的完整判撞邏輯**本次不做**，留待用戶用過簡化版覺得有需要先升級。

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
const CLASH_WINDOW_MIN = 150;  // 兩單取模時間相距少於此分鐘數 = 提醒（Fat Mo 可調；S170拷問依實際攞模節奏—每單≥3小時連傾偈核對交通—由60分鐘上修，並非硬性禁止，只係提醒）
const CLASH_CACHE_TTL = 30000; // 同一日期查詢結果快取 30 秒
```

### A.（第二期・延後）撞期簡化提示（新增訂單 + 修改訂單表單）

> S170 拷問裁決：本次**不做**原方案三色判級（紅/黃/綠）+ race guard + 快取嘅完整工程，改做以下簡化版，留待第一期（B/C/D/E）實際用過一排、且 Fat Mo 確認有需要，先升級做返足本判斷邏輯。

1. `appDate` 所在 form-group 內、input 之後加 `<div id="clashHint" style="display:none;"></div>`。
2. 新函數 `checkMoldDateClash()`（簡化版）：
   - `appDate` 空值或訂單類型=不含取模服務 → 隱藏 hint、直接 return。
   - fetch `orders?appointment_at=eq.{日期}&deleted_at=is.null&select=order_id,raw_form_state`（**只讀計數，冇 customer_name**）。
   - **客戶端過濾**：只計 `raw_form_state` 存在且 `enableP === true || enableP === 'true'` 嘅單。
   - **排除自己**：`currentMode === 'edit' && editTargetOrderId` 時，剔走 `order_id === editTargetOrderId`（FHS 單號係字串，唔係 UUID）。
   - **顯示邏輯（簡化，冇判撞、冇顏色分級）**：N=0 → 隱藏 hint 或顯示「當日冇其他取模預約」；N>0 → 顯示樸素文字「呢日已有 {N} 張取模單」（單一中性樣式，唔用紅/黃/綠三色）。
   - **失敗態**：fetch 拋錯或非 2xx → 「⚠ 未能檢查，請自行核對」。**任何情況下失敗都唔准顯示空白當作冇單**。
   - 不做：三色判級、時間 normalize、race guard、30秒快取（N 值查詢輕量，每次直接 fetch 即可，若日後升級足本版本才引入）。
3. 接線（三處，全部走三步替換）：
   - `appDate` 的 `onchange="generate()"` → `onchange="generate(); checkMoldDateClash()"`
   - 編輯模式載入舊單回填表單完成後（reconstruction helper 尾部，grep `updateIdStatus('available'` 定位）call 一次。
4. 樣式用現有 `--fhs-*` CSS 變數，唔好發明新色板。

### B. 迷你月曆（含 S170 拷問新增：獨立入口）

> S170 拷問發現：操作者真實使用場景唔淨止係開緊訂單表單嗰刻先睇月曆——傾緊客（未開訂單）就要睇「未來邊幾日得閒」再建議俾客揀。故月曆 render 邏輯抽出做共用 component，掛兩個入口。

1. **入口一（原方案，綁定表單）**：約定日期 label 行尾加一個小掣（📅 或現有 icon sprite），開 `<div id="moldCalPopup">`；撳日子 → 回填 `appDate` + 觸發 `generate()` + `checkMoldDateClash()` + 收埋月曆。
2. **入口二（S170 新增，獨立查看）**：`reviewModeContainer` 頂部（`reviewZone2` 之前）加一個獨立掣「📅 查看檔期」，開同一個月曆 component，但**唔綁定任何 `appDate` 欄位**——撳日子純粹高亮顯示該日詳情（見下），冇回填動作、唔觸發 `generate()`。用於操作者傾客途中隨時查閱，唔使先開草稿訂單。
3. `openMoldCalendar(year, month, { bindMode })`：`bindMode` 參數區分入口一（`'form'`，回填）／入口二（`'view'`，純顯示）。一次 query 成個月 `appointment_at=gte.{月頭}&appointment_at=lt.{下月頭}&deleted_at=is.null&select=order_id,appointment_at,raw_form_state`，同樣客戶端過濾 enableP，按日計數。
4. 7 欄格仔：今日=外框高亮；1 單=橙點；≥2 單=紅點。左右箭嘴切月（每月一次 query，同樣 30s 快取）。
5. 手機（窄屏）用 bottom-sheet 形式，唔好用細 popup；跟 Section 六排版鐵律。
6. 撳月曆掣以外位置 / Esc 收埋；月曆（入口一）唔准遮住 appDate input 本身。

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

【驗收條件】（逐條可機械判定；4–8 用 playwright 實測，唔准純讀碼自證。S170拷問後範圍＝第一期 B/C/D/E 全做+簡化版A，原方案完整三色判撞邏輯本次不驗）
1. 全部替換點附三步計數證據（改前 1 → 改後 舊0新1）。
2. 頁面載入無新 console error（playwright 開頁截 console）。
3.（簡化版A）新增模式揀一個已有取模單嘅日期 → `#clashHint` 於 2 秒內顯示「呢日已有 N 張取模單」，N 與實際一致；揀無預約日期 → 隱藏或顯示「當日冇其他取模預約」。
4. 編輯模式載入某單、日期不變 → 計數唔計自己（N 不含本單）。
5. playwright route abort Supabase 請求 → `#clashHint` 顯示「未能檢查，請自行核對」，**非空白**。
6. 月曆某日點數 == 該日實際取模單數（附對照用嘅 Supabase REST 查詢輸出）；入口一（表單內）撳日子會回填 `appDate`，入口二（訂單總覽頁「📅 查看檔期」獨立掣）撳日子**不會**回填任何表單欄位。
7. 訂單頁 `#moldSchedulePanel` 三組數字與 `globalOrders` 按同樣條件人手過濾嘅結果一致（附過濾用嘅 console 命令輸出）。
8. 手機視窗（375px）下 A hint 全寬正常摺行、B 為 bottom-sheet（兩個入口皆是）、C/D/E 面板可收合——playwright viewport 實測截圖。

【卡關協議】遇阻塞回報四態之一，不得沉默重試：DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED。`mapOrder` 欄位名同預期不符、或發現 appointment_at 語義同本方案假設矛盾 → 即報 NEEDS_CONTEXT，唔好靠估硬做。

【回報格式】≤40 行：改動檔案+行號範圍（每處一行說明）→ 驗收條件 1–8 逐條附證據 → 未處理邊界情況 → 「發現但未動」清單 → 信心：高/中/低+一句理由。diff >50 行落檔傳路徑。

【待 Fat Mo 隨時可調嘅參數】`CLASH_WINDOW_MIN`（現默認 150 分鐘，S170拷問依實際攞模節奏調整）；D/E 每組顯示上限（現 10，S170拷問已確認暫無異議）。
