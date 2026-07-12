---
description: 將指定 Dashboard 檔以 WebDAV 部署至 NAS Web Station /web 並三關驗證 (Antigravity Bridge)
---

# /upload-web (Antigravity Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/upload-web.md](/.fhs/ai/commands/upload-web.md)

### 簡化流程：

**無參數（預設 — 升格流程）：**
1. 掃描 `Freehandsss_Dashboard/` 找最高版本號的 `freehandsss_dashboardV*.html`（Bash：`ls ... | sort -V | tail -1`）
2. 向 Fat Mo 二次確認（「偵測到最新版：VXX，確認升格 current 並部署？」）——**例外（S168，AGENTS.md v1.7.0）**：若由 `/commit` Phase 2.5 條件觸發（已偵測到本次 commit 有改動 Dashboard HTML），跳過此步
3. `cp` 最新版 → `Freehandsss_dashboard_current.html`
4. 執行 `powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 current -Force`
5. 回報 PASS/FAIL：偵測版本 + 公開網址 + 大小比對 + SHA256

**指定目標（`/upload-web V43` / `current` 等）：**
1. 解析目標代稱
2. 若目標為 `current` → 先向 Fat Mo 二次確認，執行時加 `-Force`
3. 執行 `powershell -ExecutionPolicy Bypass -File scripts/upload-web.ps1 [目標] [-Force]`
4. 回報 PASS/FAIL：公開網址 + 大小比對 + SHA256

### 防守檢查：
- ✅ 升格流程：二次確認後才 cp + 上傳，未確認不得繼續
- ✅ 密碼永不回顯，`.env` 永不入庫
- ✅ 驗證三關（HTTP 200 + 大小 + SHA256）任一失敗即 FAIL

> ⚠️ AG 角色例外說明：部署為對外寫入動作，一般屬 CL 範疇。此指令經 Fat Mo 明確授權開放雙端，A2 執行前仍須遵守「對外動作先確認」與 `/execute` 紀律。
