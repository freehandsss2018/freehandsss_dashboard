讀取 `.fhs/ai/commands/fhs-audit.md` 並執行系統架構衛生稽核（21 項，5 大檢查）。

性質：純讀取稽核，不修改任何檔案，只輸出報告。

五大檢查：
1. README & repo-map 準確性（A1-1 至 A1-5）
2. 衝突偵測 - .cursorrules vs AGENTS.md 等（A2-1 至 A2-4）
3. 沉積檔案偵測 - 臨時測試檔、無用腳本（A3-1 至 A3-5）
4. 孤獨檔案偵測 - 未被引用的檔案（A4-1 至 A4-4）
5. 過時檔案偵測 - 版本號、Changelog、handoff 日期（A5-1 至 A5-5b）

輸出格式：每項標示 ✅ / 🟡 / 🔴，統計總通過數，列出待處理清單。
報告完成後寫入 .fhs/notes/ai_reports/audit_YYYY-MM-DD.md。
等待 Fat Mo 指示後才處理問題，不自行修復。
