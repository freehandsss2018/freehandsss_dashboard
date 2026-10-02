---
name: "source-command-cl-flow-fast"
description: "Codex 在本 repo 的角色是 A4（代號 GPT，獨立審查者，只審不改），不執行 /cl-flow-fast；收到此指令時說明並指向 Claude Code（A3）"
---

# source-command-cl-flow-fast

Use this skill when the user asks to run `/cl-flow-fast` inside Codex.

## Codex 不執行 /cl-flow-fast

# /cl-flow-fast (Codex Bridge — 已停用作者／裁決角色)

> **角色定位（2026-09-26 修正）**：本 repo 的跨代理分工為 A1=PX（Perplexity）、A2=AG（Gemini）、**A3=CL（Claude Code）**、**A4=GPT（Codex，獨立審查者，只審不改，無裁決權）**。
> 舊版本橋接曾寫「Codex 撰寫 a3-draft.md」「Codex 裁決」「裁決者：Codex（A3）」，與上述分工衝突，已移除。

**收到 `/cl-flow-fast` 時，Codex 應該：**
1. **不要**執行 `scripts/cl-flow-runner.js`，**不要**撰寫 `a3-draft.md`、批評處理表或精簡 Verdict（`cl-final-plan.md`）。
2. 回覆 Fat Mo：`/cl-flow-fast` 須回 Claude Code（A3）執行；Codex 在本 repo 是 A4，職責是實作後獨立審查。
3. 若 Fat Mo 交來 `artifacts/{flow_id}/` 內的文件要求審查：只讀、不修改任何檔案，逐條輸出 findings（嚴重度 BLOCKER/MAJOR/MINOR、檔案與行號、問題、建議），並聲明實際讀了哪些檔案、有無讀不到的部分。你的意見不是批准，也不是裁決。

Master 指令定義（僅供理解流程，不由 Codex 執行）：[/.fhs/ai/commands/cl-flow-fast.md](/.fhs/ai/commands/cl-flow-fast.md)

### 防守檢查：
- ✅ NO-TOUCH：禁止任何業務代碼寫入，直到 Fat Mo 輸入 `/execute`
- ✅ A4 只審不改；未真正讀取的檔案不得標示為已審
