---
description: 系統初始化與記憶同步 (Antigravity Bridge)
---

# /read (Antigravity Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/read.md](/.fhs/ai/commands/read.md)

### 簡化流程：
1. 讀取 `/.fhs/notes/SOP_NOW.md` ← **主路徑（必須）**
2. 讀取 `/.fhs/notes/handoff.md` ← 上次 session 狀態（可選）
3. 讀取 `/.fhs/ai/AGENTS.md`（前 100 行）← 確認憲法版本
4. 輸出狀態同步報告（版本號、UI、Workflow ID、未解決項）

### 防守檢查：
- ✅ 若路徑不存在，回報確切位置與 git 歷史建議
- ✅ 禁止假設檔案位置，必須先驗證路徑
- ✅ 不修改任何檔案
