# FHS Lesson: JS 初始化順序與 ReferenceError 偵漏

## 💡 學習點總結
在 V34 版本的開發中，控制台攔截到 `ReferenceError: Cannot access 'isDevMode' before initialization`。這是一個典型的「提前存取」問題。

## 🛠️ 問題診斷
- **發生位置**: `getWebhookUrl()` -> `loadSystemConfig()`。
- **核心病因**: `getWebhookUrl` 在變數 `isDevMode` 被 `let` 定義之前就已經被腳本執行流呼叫了。
- **臨時狀態**: 目前該錯誤被保留，系統雖能運行（因為 `isDevMode` 最後會被初始化），但會導致初次載入時的 `Load Config Error`。

## ⚠️ 建議修復
- **提升變數**: 應將 `let isDevMode = false;` 的聲明提升到所有函數定義之前，或確保 `loadSystemConfig` 在變數定義完成後再觸發。
- **嚴禁改動 JS**: 在大型 UI 翻新任務中，除非明確授權，否則應保持 JS 邏輯完全不動，避免觸發連鎖 Reactivity 問題。

---
*Created: 2026-03-21*
*Reference Session: 4d98d815-4689-4fb6-9e49-16f47e8fc94d*
