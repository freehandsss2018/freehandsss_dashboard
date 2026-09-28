---
name: "source-command-fhs-audit"
description: "Migrated source command `fhs-audit`"
---

# source-command-fhs-audit

Use this skill when the user asks to run the migrated source command `fhs-audit`.

## Command Template

讀取 `.fhs/ai/commands/fhs-audit.md` 並執行系統唯讀健康稽核（24 項，7 大檢查）。

性質：純讀取稽核，零網路連線，不修改任何檔案，只輸出報告。

七大檢查：
1. README & repo-map 準確性（A1-1 至 A1-3）
2. 衝突偵測 - .cursorrules vs AGENTS.md 等（A2-1 至 A2-3）
3. 沉積檔案偵測 - scripts/Maintenance_Tools 孤兒引用計數（A3-1）
4. 孤獨檔案偵測 - archive 索引/路由條目/說明文件（A4-1 至 A4-3）
5. 過時檔案偵測 - 版本號/Changelog/handoff 日期（A5-1 至 A5-5）
6. 文檔生態系統版本一致性 - subagent 標準化/自動化工具當次重跑（A6-1 至 A6-4）
7. 語義稽核 - D1-D5 五維深度檢測（A7-1 至 A7-5）

輸出格式：每項標示 ✅ / 🟡 / 🔴，統計總通過數，列出待處理清單。
報告完成後寫入 .fhs/reports/audits/system/audit_YYYY-MM-DD.md。
等待 Fat Mo 指示後才處理問題，不自行修復。
