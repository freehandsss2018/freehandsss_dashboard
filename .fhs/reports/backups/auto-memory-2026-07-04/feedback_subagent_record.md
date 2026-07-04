---
name: 任務完成必附 Subagent 使用記錄
description: 每次執行完任務，回覆結尾必須附一句 subagent 使用說明，不可省略
type: feedback
originSessionId: 01964f84-2080-4e42-87d3-be90c1b95fab
---
每次執行任務完成後，回覆結尾必附一行：

- **用了**：`Subagent：✅ 使用 [名稱]（原因一句）`
- **沒用**：`Subagent：❌ 未使用 — [評估理由一句]`
- **不知道**：`Subagent：❓ 未評估 — 下次補充`

**Why:** 上次執行修復任務後漏附此記錄，被 Fat Mo 指出。Router hook 有明確建議但未說明是否遵從。

**How to apply:** 在任何「執行完成」的回覆最後一段，無論任務大小，固定附上這一行。不需要完整表格，一句即可。
