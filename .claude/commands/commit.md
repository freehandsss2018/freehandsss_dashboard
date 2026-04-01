讀取 `.fhs/ai/commands/commit.md` 並執行全包一條龍任務收尾。

執行步驟：

【第一階段：Memory Engine 同步】
1. 整理本次教訓，寫入 .fhs/memory/lessons/YYYY-MM-DD_主題.md
2. 更新 .fhs/memory/handoff.md（格式：版本、狀態摘要、未解決項目、下個 Session 待辦、核心配置）
3. 檢查 .fhs/memory/lessons/ 是否有 _temp/_draft 臨時日誌，若有提示 Fat Mo 確認
4. 執行 node scripts/Sync_Notion_Brain.js
5. 更新 .fhs/notes/session-log.md

【第二階段：Git 推送】
6. 執行 git add .
7. 執行 git status，安全檢查：.env 出現立即 reset 並警告；大型檔案 >10MB 暫停提示
8. git commit -m "chore: Memory Engine sync + session checkpoint [YYYY-MM-DD]"
9. git push

異常處理：.env 出現 → 立即 reset，暫停 git push；Notion API 失敗 → 繼續 git push 後提示補同步。
