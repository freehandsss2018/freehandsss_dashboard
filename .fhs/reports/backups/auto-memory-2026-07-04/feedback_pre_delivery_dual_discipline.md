---
name: feedback-pre-delivery-dual-discipline
description: "Before any delivery boundary (task complete / /execute / handoff), output two-line dual-discipline self-check per Rule 3.17. Router recommendations must be actively considered; deviating is fine if the reason is recorded."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d2d28476-c875-4779-b646-56d43a4f0c21
---

At every delivery boundary (task complete / `/execute` closure / writing handoff.md), output the two-line dual-discipline self-check. Never skip.

**Why:** Two prior memories (`feedback_subagent_router` + `feedback_delivery_standards`) recorded the same lessons — router skipping and unverified delivery. Both were violated again in Session 63 even with memories present. Pure告示無效; rule now enforced via AGENTS.md Rule 3.17 + cl-flow/execute exit gate.

**How to apply:**

Output this at every delivery boundary:
```
【交付前雙紀律自檢】
驗收：[任務型對應驗證 + 結果 PASS/FAIL/不適用+具體理由]
Subagent：[前置評估了什麼 + 派了誰/沒派 + 理由]
```

驗收有效標準（任務型分流，AGENTS Rule 3.17）：
- 財務/成本 → `finance-auditor` live 三端，附訂單號
- 文件治理 → ≤2 跳盲測（3 問）或斷鏈數 = 0 附 log
- 代碼/HTML → `code-reviewer` G1–G8 Gate 報告
- n8n → execution log 或 `trigger_test_execution` log
- 純文件搬移 → 引用同步清單（N 個檔各一行確認）
- 純規劃（cl-flow 待 execute）→「待 /execute；驗收於執行後」

Subagent rule: When the UserPromptSubmit hook fires with `[FHS Router]` recommendation, actively consider that subagent before any other work — default to using it. But the router is first-match-wins keyword matching on the raw prompt and can misfire (confirmed 2026-07-04: a "harness architecture review" prompt containing "審查" matched the `code-reviewer` route, which is scoped to FHS HTML prototype quality gating, not environment/harness audits). When the recommended subagent's own description clearly doesn't fit the actual task, deviate and record the mismatch + reason in the delivery self-check instead of forcing the match. Even without hook recommendation, actively scan available skills when task nature clearly matches a skill trigger (e.g., new add-on product → `/new-product`).

**Why (subagent):** Router recommended `database-reviewer` / `build-error-resolver` and was ignored *silently* (Session 63) — that's the failure mode to prevent, not the act of deviating itself. A recorded, reasoned deviation (e.g. router keyword-matched the wrong domain) is not the same failure as ignoring a correct recommendation without comment.

**Why (delivery):** Fat Mo received an unverified fix that may fail at runtime. "File edited" ≠ done. Done = tested and confirmed.

**Linked rule:** [[AGENTS Rule 3.17]]
**Replaces:** `feedback_subagent_router` + `feedback_delivery_standards` (merged 2026-06-05 Session 63, net −1)
