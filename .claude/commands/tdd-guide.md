# /tdd-guide（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/tdd-guide.md](/.fhs/ai/commands/tdd-guide.md)

### 流程摘要（RED-GREEN-REFACTOR）：
1. **RED** — 寫最小失敗測試，確認失敗且理由正確
2. **GREEN** — 寫最少代碼讓測試通過
3. **REFACTOR** — 清理代碼，確認測試仍通過

### 使用場景：
- 寫新功能前
- 修 Bug 前（搭配 `/debug-guide` 找到根因後）
- 修改 Maintenance_Tools 腳本
- n8n Code Node 邏輯驗證

### 防守檢查：
- ✅ 不修改任何專案檔案
- ✅ 必須先寫測試，不可跳過 RED 階段直接 GREEN
