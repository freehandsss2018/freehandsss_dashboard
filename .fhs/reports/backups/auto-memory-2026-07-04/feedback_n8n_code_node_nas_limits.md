---
name: n8n Code Node NAS Limitations
description: Synology NAS 上 n8n Code 節點的三大不可用 API：fetch/process.env/require，以及解決方案
type: feedback
originSessionId: 5ed25bba-57d0-436c-a555-2d9516f46947
---
在這個 Synology NAS 上的 n8n Code 節點，以下 API **全部靜默失敗**（try-catch 捕獲，不拋出可見錯誤）：

| API | 狀態 | 解決方案 |
|-----|------|---------|
| `fetch()` | ❌ 靜默失敗 | 改用 n8n HTTP Request 節點，或 hardcoded 靜態資料 |
| `process.env` | ❌ ReferenceError | IIFE try-catch：`(() => { try { return process.env.X; } catch(e) { return null; } })()` |
| `require()` | ❌ ReferenceError | 完全不可用（fs, https, 任何 Node module）|

**Why:** 2026-05-18 session 中，Smart Cache Strategist 呼叫 Supabase fetch() 一直靜默失敗，`supabaseFetched` 永遠是 `false`。診斷後確認是 NAS 環境限制，與 Supabase 服務本身無關。

**How to apply:**
- 任何在 n8n Code 節點需要 HTTP 呼叫的場景 → 必須改用 HTTP Request 節點
- 需要環境變數 → 用 IIFE try-catch + fallback hardcoded 值
- 需要靜態成本/設定資料 → 直接 hardcode 在 Code 節點（每次 Supabase 有更新時需手動同步）
- 診斷 fetch 失敗：在節點輸出加 `supabaseFetched: boolean` flag，再用 Python 讀 execution API 確認
