---
name: "source-command-fhs-check"
description: "Migrated source command `fhs-check`"
---

# source-command-fhs-check

Use this skill when the user asks to run the migrated source command `fhs-check`.

## Command Template

讀取 `.fhs/ai/commands/fhs-check.md` 並執行全系統健康檢查。

前置條件：已讀取 .fhs/ai/AGENTS.md 並確認版本號。

執行步驟：
1. 執行 python Maintenance_Tools/run_all.py
2. 依序完成：環境前置檢查 → LIFECYCLE → STRESS → ACCEPTANCE → COST_INTEGRITY → PRICE_AUDIT
3. 輸出 Health Report，明確標示所有 Red Flags / DEGRADED / WARN
4. 若發現 Red Flags，將問題摘要寫入 .fhs/notes/session-log.md

異常處理：
- run_all.py 不存在 → 回報「未找到，請 Fat Mo 確認路徑」，停止執行
- 任何測試階段失敗 → 停止後續測試，立即回報失敗階段與錯誤訊息
