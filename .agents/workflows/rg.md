---
description: 全專案 ripgrep 搜尋 — 關鍵字、正則、副檔名過濾 (Antigravity Bridge)
---

# /rg (Antigravity Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/rg.md](/.fhs/ai/commands/rg.md)

### 簡化流程：
1. 解析 `/rg` 後面的 pattern 與可選過濾條件（`--filter`、`--path`）
2. 使用 `grep_search` 工具執行搜尋（支援正則、路徑過濾、大小寫不敏感）
3. 輸出：檔案路徑 + 行號 + 匹配內容
4. 末尾統計：共 N 個匹配，分佈在 M 個檔案

### 防守檢查：
- ✅ 不修改任何專案檔案
- ✅ 不執行任何 shell 命令（只用 grep_search 工具）
- ✅ 純讀取操作，無副作用
- ✅ 預設排除 node_modules/ · .git/ · *.pb · artifacts/
