# /commit（任務完成 · 全包一條龍）

用途：任務完成時一鍵執行——記憶同步 + 雲端備份 + Git 推送。

觸發關鍵字（自動偵測）：
「commit」「收工」「任務完成」「同步記憶」「備份大腦」

執行步驟：

【第一階段：Memory Engine 同步】
1. 將本次教訓整理，寫入 .fhs/memory/lessons/YYYY-MM-DD_主題.md
2. 更新 .fhs/memory/handoff.md（核心狀態快照）
3. 檢查 .fhs/memory/lessons/ 是否有 _temp / _draft 臨時日誌
   若有：提示 Fat Mo 確認是否刪除，不得自動刪除
4. 執行 node scripts/Sync_Notion_Brain.js（V2.0 Auto-Discovery）
5. 更新 .fhs/notes/session-log.md
6. 回報：「✅ Memory Engine 同步完成」

【第二階段：Git 推送】
7. 執行 git add .
8. 執行 git status，檢查以下安全項目：
   - .env 是否出現？若出現立即執行 git reset HEAD .env 並警告 Fat Mo
   - 是否有非預期的大型檔案（>10MB）？若有暫停並提示
9. 若安全檢查通過，執行：
   git commit -m "chore: Memory Engine sync + session checkpoint [YYYY-MM-DD]"
10. 執行 git push
11. 回報：「✅ Git 推送完成，GitHub 已更新」

【第三階段：完成回報】
12. 輸出以下格式：

========================================
✅ /commit 全包完成
時間：YYYY-MM-DD HH:MM
========================================
Memory Engine 同步    ✅
Notion 上雲           ✅
handoff.md 更新       ✅
session-log.md 更新   ✅
git add               ✅
git commit            ✅
git push              ✅
========================================
雲端大腦 + GitHub 雙備份完成。收工！🏁

異常處理：
- .env 出現在 staging → 立即 reset，警告 Fat Mo，暫停 git push
- Notion API 失敗 → 本地保存，繼續執行 git push，事後提示補同步
- git push 失敗 → 回報錯誤訊息，不重試，等待 Fat Mo 指示
