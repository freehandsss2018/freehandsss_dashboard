# FHS Lesson: History Indexing Awakening (Windows)

## 💡 學習點總結
當 Cursor 的 Sidebar (Chat History) 發生延遲、無法顯示最新對話或匯入歷史時，這通常是檔案系統監聽器 (File System Watcher) 未能及時捕捉到 `.gemini/antigravity/brain` 的變動所致。

## 🛠️ 解決方案 (The "Brain Ping" Protocol)
1. **路徑識別**: 鎖定 `%USERPROFILE%\.gemini\antigravity\brain`。
2. **深度遍歷**: 遍歷該目錄下的所有 UUID 子目錄。
3. **強制喚醒**: 對每個子目錄執行一次 `list_dir` (而非終端機的 `ls`)。
   - **核心原理**: 使用 AI Agent 內建的檔案讀取 API 會比 shell 指令更容易觸發後台的事件通道。

## ⚠️ 踩坑筆記
- ❌ **失敗嘗試**: 使用 `touch` 或 `ls` 效果不佳，或是因權限/環境變數問題無法執行。
- ✅ **成功關鍵**: 必須逐一「讀進去」每一個子文件夾，才能完整重置整個索引樹。

## 🔮 未來應用
若未來遇到 Sidebar「發呆」或是 `handoff.md` 讀取不到最新狀態，應優先執行此協議。

---
*Created: 2026-03-21*
*Category: System Maintenance / UI Stability*
