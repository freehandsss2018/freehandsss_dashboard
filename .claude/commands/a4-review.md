---
description: 準備 A4（Codex）實作後審查交付包，並處理 A4 意見。A4 由 Fat Mo 觸發，A3 不代跑。(Claude Code Bridge)
---

# /a4-review (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。角色表本文見 `.fhs/ai/AGENTS.md` §7。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/a4-review.md](/.fhs/ai/commands/a4-review.md)

### 防守檢查：
- ✅ 前置：已 /execute、測試過、code-reviewer 完成
- ✅ A3 只產交付包（a4-scope.md）與回應 findings；審查由 Fat Mo 觸發
- ✅ A4 只審不改；未取得結果不得標「A4 已審」
