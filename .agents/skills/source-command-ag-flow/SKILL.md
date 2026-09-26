---
name: "source-command-ag-flow"
description: "Codex 在本 repo 是 A4（獨立審查者，只審不改），不執行 /ag-flow（已停用的 AG 規劃流程，會跑 cl-flow-runner 並寫 artifacts）；收到此指令時說明並指向 Claude Code（A3）"
---

# source-command-ag-flow

Use this skill when the user asks to run `/ag-flow` inside Codex.

## Codex 不執行 /ag-flow

> **角色定位（2026-09-26，D98）**：本 repo 跨代理分工中 **A3=CL（Claude Code）** 負責實作與寫入，**A4=GPT（Codex）只審不改、無裁決權**。`/ag-flow` 屬寫入類指令（已停用的 AG 規劃流程，會跑 cl-flow-runner 並寫 artifacts），依 `.fhs/ai/AGENTS.md` §7 角色表規則 7，A4 不得執行。舊版橋接讓 Codex 可依技能執行本指令，與 A4 只審不改矛盾，已改寫（原檔備份於 `.fhs/ai/governance/backups/source-command-ag-flow.SKILL.md.2026-09-26.bak`）。

**收到 `/ag-flow` 時，Codex 應該：**
1. **不要**讀取或執行 `.fhs/ai/commands/ag-flow.md` 的流程，**不要**修改、建立、刪除任何檔案，**不要**呼叫任何寫入類 MCP／腳本。
2. 回覆 Fat Mo：`/ag-flow` 須回 Claude Code（A3）執行；Codex 在本 repo 是 A4，職責是實作後獨立審查。
3. 若 Fat Mo 要求審查與本指令相關的變更：只讀、逐條輸出 findings（嚴重度、檔案與行號、問題、建議），並聲明實際讀了哪些檔案。你的意見不是批准，也不是裁決。

Master 指令定義（僅供理解流程，不由 Codex 執行）：[/.fhs/ai/commands/ag-flow.md](/.fhs/ai/commands/ag-flow.md)
