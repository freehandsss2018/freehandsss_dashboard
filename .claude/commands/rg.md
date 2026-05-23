# /rg（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/rg.md](/.fhs/ai/commands/rg.md)

### 簡化流程：
1. 解析 `/rg` 後面的 pattern 與可選過濾條件
2. 使用 Grep 工具執行搜尋（pattern / glob / path 對應 Master 定義）
3. 輸出：檔案路徑 + 行號 + 匹配內容（content mode）
4. 末尾統計匹配總數與檔案數

### 防守檢查：
- ✅ 不修改任何專案檔案
- ✅ 純 Grep 工具呼叫，無副作用
