# /upload-web（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/upload-web.md](/.fhs/ai/commands/upload-web.md)

### 簡化流程：
1. 解析 `/upload-web` 後的目標代稱（無則預設 `V42`）
2. 若目標為 `current`（生產版）→ 先向 Fat Mo 二次確認，執行時加 `-Force`
3. 執行 `powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 [目標] [-Force]`
4. 回報 PASS/FAIL：公開網址 + 大小比對 + SHA256

### 防守檢查：
- ✅ 密碼永不回顯，`.env` 永不入庫
- ✅ current.html 生產版需二次確認 + -Force
- ✅ 驗證三關（HTTP 200 + 大小 + SHA256）任一失敗即 FAIL
- ✅ 不修改 repo 內任何檔案（僅上傳副本至 NAS）