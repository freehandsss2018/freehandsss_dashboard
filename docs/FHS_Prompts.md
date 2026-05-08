# FHS 業務情境劇本庫 (Scenarios Library) - v1.4
>
> 最後更新：2026-05-09（補入情境十三～二十；修正情境九廢除規則；對齊 AGENTS.md v1.4.3）
> 使命：確保 AI 在任何業務場景下都能「帶腦執行」，而非盲目修改。
> 定位：業務入口路由總機——負責偵測情境並調用對應 command 執行。

---

## 【情境一：訂單建立 (POS Mode)】

- 觸發：用戶提及「新單」「下單」「報價」「POS」
此情境旨在為 Ling Au 創造流暢的下單體驗。
- **動作準則**：鎖定 5D SKU 查找，自動從資料庫提取價格。
- **回覆要求**：生成的訊息必須精準分段、具備 Emoji 引導、並剔除冗餘數據。

## 【情境二：修改舊單 (Edit/Upsert Mode)】

- 觸發：用戶提及「改單」「修改」「舊單」「Upsert」
處理 `handoff.md` 中的 Raw_Form_State。
- **核心邏輯**：100% 還原表單選項，修改後執行 Upsert 同步。

## 【情境三：全域核對中心 (Global Review)】

- 觸發：用戶提及「核對」「全域」「Global Review」
處理大數據網格的渲染與搜尋。
- **核心邏輯**：優先處理 `vertical-align: top;` 與 `<td rowspan>` 對齊。

## 【情境四：錯誤監控與診斷 (Error Eye)】

觸發：用戶提及「錯誤」「Error Log」「異常」「診斷」「掛了」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/error-eye.md。

## 【情境五：財務數據審計 (Financial Audit)】

- 觸發：用戶提及「利潤」「審計」「Total Cost」
處理 `System_Total_Cost` 與利潤結算。
- **死線**：前端利潤結算為最高真理，n8n 不得擅自重算（除非前端為 0）。
- **n8n 代碼輸出規範**：強制執行 `[{json: {auditPassed: true...}}]` 格式，嚴禁回傳裸物件。
- **SKU 對齊**：執行審計前，必須調用 `Parse Items` 正規化地圖。

## 【情境六：產品定價與商業邏輯更新 (Bible Sync)】

- 觸發：用戶提及「定價」「產品聖經」「Bible」
**真理來源**：強制讀取 `FHS_Product_Bible_V3.7.md`。
- **更新規則**：當材質為「純銀/鍍金」時，自動依據吊飾數量套用加購價 ($1980/2,980/+$800)。

## 【情境七：Stitch UI 翻新協議】

- 觸發：用戶提及「UI」「介面」「翻新」「Ling Au」

Ling Au 專屬設計準則（強制執行）：

- 觸控區最小 44px（iPad / iPhone 操作防呆）
- 所有非同步操作必須包裹 showLoader() / hideLoader()
- 關鍵操作（刪單、清空、提交）必須有二次確認 Modal
- 錯誤訊息必須顯示強烈紅色警示，不能只寫 console.log

禁忌（不得觸碰）：

- HTML 結構中的 data-id 與 id 屬性
- captureFormState() 序列化邏輯
- 任何 onclick / onchange 事件綁定

## 【情境八：內部巡邏與一致性檢查 (Internal Patrol)】

- 觸發：用戶提及「巡邏」「一致性」「冗餘」「清理」「fhs-audit」
- **動作**：執行內部巡邏，檢查是否存在孤立檔案、過時版本或路由斷層。
- **執行邏輯**：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/fhs-audit.md。

## 【情境九：記憶引擎 3.0 (Memory Engine)】

觸發：用戶輸入「checkpoint」「存檔」或明確宣告結束 session
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/commit.md。
> 備註：舊指令別名 `/reflect` 已退役，統一使用 `/commit`。
> ⚠️ 「每 10 則對話自動存檔」規則已在 AGENTS.md v1.4.1 廢除，AI 不得在無明確觸發的情況下單獨寫入 handoff.md。

## 【情境十：全端守護與防重災稽核 (The Guardian)】

觸發：用戶提及「大改」「重構」「多個節點」「翻新」「重寫」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/guardian.md。

## 【情境十一：外部研究與系統審查 (Perplexity Audit)】

觸發：輸入 /px audit 或 /px 審查
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/px-audit.md。

## 【情境十二：全自動規劃流 (The Planning Triad)】

觸發：用戶提及「規劃」「開發新功能」「大規模修改」「流程優化」
執行邏輯：全系統進入 v2.1.0 核心開發模式。

1. 執行 `/px-plan` (由 A1 提供外部建議)
2. 執行 `/ag-plan` (由 A2 提供本地實施計畫)
3. 執行 `/cl-flow` (由 A3 產出最終 Verdict 與執行序，等待授權)
指令說明詳見：.fhs/ai/commands/cl-flow.md。

---

## 【情境十三：代碼根因調查 (Debug Guide)】

觸發：用戶提及「除錯」「找 bug」「根因」「測試失敗」「test failure」「root cause」
> 與情境四的區別：情境四處理 n8n/系統層錯誤監控；此情境處理代碼邏輯層的 root cause 調查。
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/debug-guide.md。
配套技能：`.fhs/ai/skills/vendor/superpowers/systematic-debugging.md`（四階段根因調查法，NO FIX WITHOUT ROOT CAUSE）

## 【情境十四：測試驅動開發 (TDD Guide)】

觸發：用戶提及「TDD」「測試驅動」「先寫測試」「test first」「寫測試再實作」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/tdd-guide.md。
配套技能：`.fhs/ai/skills/vendor/superpowers/test-driven-development.md`

## 【情境十五：五個為什麼根因分析 (Five Whys)】

觸發：用戶提及「為什麼」「五個為什麼」「five whys」「根因分析」「系統性原因」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/five.md。
最佳搭配：`/debug-guide`（找到根因後再開始修復）

## 【情境十六：財務成本完整性稽核 (Cost Audit)】

觸發：用戶提及「成本稽核」「cost audit」「Total_Cost 對帳」「rollup 比對」「成本完整性」
> 與情境五的區別：情境五處理一般財務數據審計；此情境專門執行 Total_Cost vs rollup 的結構性比對。
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/fhs-cost-audit.md。

## 【情境十七：輕量快速規劃 (Fast Planning)】

觸發：用戶提及「快速規劃」「輕量版規劃」「功能實作」「UI 修改」「bug fix 規劃」「跳過 PX」
> 與情境十二的區別：情境十二跑完整 PX+AG+CL 三段流程；此情境跳過 PX，只跑 AG → 精簡 Verdict，適合功能實作、UI 修改、Bug 修復。
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/cl-flow-fast.md（或直接執行 `/cl-flow-fast [任務]`）。

## 【情境十八：資料庫查詢 (DB Query)】

觸發：用戶提及「查詢資料庫」「Supabase 查詢」「Postgres」「SQL 查詢」「read-only 查詢」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/db-query.md。
配套技能：`.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md`、`.fhs/ai/skills/vendor/awesome-cc/supabase-query.md`

## 【情境十九：流程圖與架構圖 (Mermaid)】

觸發：用戶提及「流程圖」「架構圖」「diagram」「mermaid」「畫圖」「視覺化流程」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/mermaid.md。

## 【情境二十：代碼分析 (Code Analysis)】

觸發：用戶提及「代碼分析」「code analysis」「程式碼品質」「重構分析」「技術債」「code review」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/code-analysis.md。

---

## 更新協議

當以下情況發生時，必須更新本文件對應情境：

- 業務規則改變（價格、SKU 邏輯、加購規則）
- 新增業務流程（新情境）
- 系統發生新災難並修復後（補充防護邏輯）
- AGENTS.md 全域硬規則新增時（同步對齊）
- commands/ 下任何指令檔更新時（Router 指向不得過時）
