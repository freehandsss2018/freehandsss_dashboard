---
description: /cl-flow-fast 的 A4 串接版（g=GPT=A4/Codex）：A3 草案→A2 評審→Verdict→/execute 後自動接 A4 交付包，Fat Mo 觸發 Codex。(Claude Code Bridge)
---

# /cl-flow-g (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。角色表本文見 `.fhs/ai/AGENTS.md` §7。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/cl-flow-g.md](/.fhs/ai/commands/cl-flow-g.md)

### 簡化流程（v1.0.0，D99）：
1. 前段同 `/cl-flow-fast`（精煉 → Gate 1 → --init → a3-draft → --review --fast → 批評處理表 → Verdict）；Verdict 加「A4 適用性」
2. 停，等 Fat Mo `/execute`
3. `/execute` 後：實作＋測試 → code-reviewer／finance-auditor 驗收 → 產 `a4-scope.md`
4. **硬停**：請 Fat Mo 親手觸發 `/codex:review --base main`（A3 不代跑）
5. 收結果 → 存 `gpt-review.md` → 逐條回應（severity 照抄；2 輪上限；`DISPUTE_ESCALATED` 交 Fat Mo）
6. `a4.status` 為 responded／not_applicable 才可收尾

### 防守檢查：
- ✅ Step 0 精煉、Gate 1 不可跳過
- ✅ NO-TOUCH：`/execute` 前禁止寫業務代碼
- ✅ A4 只審不改；未取得結果不得標「A4 已審」
