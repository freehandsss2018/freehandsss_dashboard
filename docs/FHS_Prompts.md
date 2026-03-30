# FHS 業務情境劇本庫 (Scenarios Library) - v1.2
> 最後更新：2026-03-30（對齊 AGENTS.md v1.2 架構）
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
- 觸發：用戶提及「巡邏」「一致性」「冗餘」「清理」
- **動作**：定期檢查工作區內是否存在冗餘檔案或過時版本。

## 【情境九：記憶引擎 3.0 (Memory Engine)】
觸發：自動（每 10 則對話 / 用戶宣告結束）
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/commit.md。

## 【情境十：全端守護與防重災稽核 (The Guardian)】
觸發：用戶提及「大改」「重構」「多個節點」「翻新」「重寫」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/guardian.md。

## 【情境十一：外部研究與系統審查 (Perplexity Audit)】
觸發：輸入 /px audit 或 /px 審查
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/px-audit.md。

---

## 更新協議
當以下情況發生時，必須更新本文件對應情境：
- 業務規則改變（價格、SKU 邏輯、加購規則）
- 新增業務流程（新情境）
- 系統發生新災難並修復後（補充防護邏輯）
- AGENTS.md 全域硬規則新增時（同步對齊）
- commands/ 下任何指令檔更新時（Router 指向不得過時）
