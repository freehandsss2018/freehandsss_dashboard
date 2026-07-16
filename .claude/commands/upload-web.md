# /upload-web（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/upload-web.md](/.fhs/ai/commands/upload-web.md)

### 簡化流程：

**Step 0（S143新增）**：預設先跑 `/fhs-check` 部署前置檢查；FAIL 停止部署；Fat Mo 可明示 skip。

**無參數（預設 — 升格流程）：**
1. 掃描 `Freehandsss_Dashboard/` 找最高版本號的 `freehandsss_dashboardV*.html`
2. 向 Fat Mo 二次確認（「偵測到最新版：VXX，確認升格 current 並部署？」）——**例外（S168，AGENTS.md v1.7.0）**：若由 `/commit` Phase 2.5 條件觸發（已偵測到本次 commit 有改動 Dashboard HTML），跳過此步
3. `Copy-Item` 最新版 → `Freehandsss_dashboard_current.html`
4. 執行 `powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 current -Force`
5. 回報 PASS/FAIL：偵測版本 + 公開網址 + 大小比對 + SHA256

**指定目標（`/upload-web V43` / `current` / `team` 等）：**
1. 解析目標代稱
2. 若目標為 `current` → 先向 Fat Mo 二次確認，執行時加 `-Force`；若為 `team`（AI 助理團隊名冊，2026-07-16 新增）→ 非生產系統不需二次確認，建議執行前先跑 `node scripts/agent_dashboardV42.js` 重新生成
3. 執行 `powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 [目標] [-Force]`
4. 回報 PASS/FAIL：公開網址 + 大小比對 + SHA256

### 防守檢查：
- ✅ 升格流程：二次確認後才 cp + 上傳，未確認不得繼續
- ✅ 密碼永不回顯，`.env` 永不入庫
- ✅ 驗證三關（HTTP 200 + 大小 + SHA256）任一失敗即 FAIL