讀取 `.fhs/ai/commands/execute.md` 並依照定義執行任務。

前置確認：
1. 確認 Fat Mo 已明確授權（本指令即為授權信號）
2. 確認存在有效的 /cl-flow Verdict 報告
3. 重新列出準備修改的檔案，等待最終確認

執行約束：僅執行 Verdict 已批准範圍，禁止超範圍修改。逐階段回報進度，不得靜默完成。

執行後必須完成後效同步稽核（A/B/C 三項觸發條件核查）：
- [A] 結構變動 → 更新 docs/repo-map.md + README.md
- [B] 制度層變動 → 產出 .fhs/notes/completion_reports/ 完成記錄
- [C] CHANGELOG 稽核 → 更新 CHANGELOG.md
