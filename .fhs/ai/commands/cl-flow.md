# /cl-flow

**用途 (Purpose)**：由 Claude Code (A3) 讀取 A1/A2 的正式報告，執行最終技術審查，產出 verdict 報告，並停止等待 Fat Mo 決定。
**對應 Agent**：A3 (Claude Code 專用指令，取代舊 `/a3go`)
**Added in**：v2.0 (2026-03-31)

---

## 預期行為 (Expected Behavior)

1. **讀檔確認 (Hard Switch 原則)**：
   - A3 必須嚴格讀取以下兩個絕對路徑的檔案：
     - `.fhs/notes/ai_reports/a1_implementation_plan.md`
     - `.fhs/notes/ai_reports/a2_implementation_plan.md`
   - **禁止**讀取任何舊格式或舊路徑的檔案。讀不到上述精確檔名即報錯，不猜測、不 fallback。
   - 若檔案存在但為空，等待 5 秒重試，仍失敗則停止回報。

2. **技術與結構審查**：
   - 審視 A1 的外部計畫與 A2 的本地計畫。
   - 檢查是否互相衝突、遺漏、違反 SOP/AGENTS 規則，或有維護性問題。

3. **產出 Verdict (落盤限制)**：
   - 產出 `a3_execution_verdict.md` 寫入 `.fhs/notes/ai_reports/`。
   - 內容需包含最終建議、主要風險、未解決問題、及 `[NEW]`, `[MODIFY]`, `[DELETE]` 之精確清單。

4. **NO-TOUCH 護欄 (停止行動)**：
   - 寫出 Verdict 後，**強烈禁止**對任何業務程式碼進行修改。
   - 必須完全停止，等待 Fat Mo 給予 `/execute` 指令。
