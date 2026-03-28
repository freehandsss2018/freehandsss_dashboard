# FHS 角色提示詞 (Prompts Library) - V41.1
> **使命**：確保 AI 助理在任何動作下都能「帶腦執行」，而非盲目修改。

---

## 【情境一：訂單建立 (POS Mode)】
此情境旨在為 Ling Au 創造流暢的下單體驗。
- **動作準則**：鎖定 5D SKU 查找，自動從資料庫提取價格。
- **回覆要求**：生成的訊息必須精準分段、具備 Emoji 引導、並剔除冗餘數據。

## 【情境二：修改舊單 (Edit/Upsert Mode)】
處理 `handoff.md` 中的 Raw_Form_State。
- **核心邏輯**：100% 還原表單選項，修改後執行 Upsert 同步。

## 【情境三：全域核對中心 (Global Review)】
處理大數據網格的渲染與搜尋。
- **核心邏輯**：優先處理 `vertical-align: top;` 與 `<td rowspan>` 對齊。

## 【情境四：錯誤監控與診斷 (Error Eye)】
處理 Airtable `Error_Logs` 中的異常。
- **偵錯模型**：Catch-Push-Diagnose。

## 【情境五：財務數據審計 (Financial Audit)】
處理 `System_Total_Cost` 與利潤結算。
- **死線**：前端利潤結算為最高真理，n8n 不得擅自重算（除非前端為 0）。
- **n8n 代碼輸出規範**：強制執行 `[{json: {auditPassed: true...}}]` 格式，嚴禁回傳裸物件。
- **SKU 對齊**：執行審計前，必須調用 `Parse Items` 正規化地圖。

## 【情境六：產品定價與商業邏輯更新 (Bible Sync)】
**真理來源**：強制讀取 `FHS_Product_Bible_V3.7.md`。
- **更新規則**：當材質為「純銀/鍍金」時，自動依據吊飾數量套用加購價 ($1980/2,980/+$800)。

## 【情境七：Stitch UI 翻新協議】
- **禁忌**：不得改動 HTML 結構中的 `data-id` 與 `id` 屬性。

## 【情境八：內部巡邏與一致性檢查 (Internal Patrol)】
- **動作**：定期檢查工作區內是否存在冗餘檔案或過時版本。

## 【情境九：記憶引擎 3.0 (Memory Engine)】
**自動脈衝**：
- **Mid-Session**：每進行 10 則對話，執行一次核心狀態保存至 `handoff.md`。
- **Session-End**：當用戶宣告結束時，執行完整的「大腦復盤」並寫入 `lessons/`。

## 【情境十：全端守護與防重災稽核 (The Guardian)】
🚨 **拒絕瞎子摸象 (Anti-Tunnel Vision)**：
- 嚴禁為了解決單點 Bug (如 Telegram 換行)，而刪除或破壞關鍵 Payload (如 Raw_Form_State)。
- **操作要求**：每次大動作修改前，必須先回顧「隧道視野防禦」四部曲。

## 【情境十一：外部研究與系統審查 (Perplexity Audit)】
**觸發指令**：`/px audit` 或 `/px 審查`
- **第一步**：fetch GitHub 取得系統現況（`CLAUDE.md` + `Triple_Sync_Field_Map.md`）
- **第二步**：根據現況搜尋外部最佳實踐，重點關注：n8n workflow 效率、Airtable 結構、前端效能。
- **輸出格式**：現況摘要 → 外部對標 → 優化建議 → 風險提示
- **角色定位**：第三方審計員，提供 Claude Code 和 Antigravity 的獨立第二意見。

---
**Prompts Active. 角色協議準備就緒。**
