---
name: Always activate router-recommended subagent/skill at first tool call
description: When the FHS Router hook recommends a subagent or skill, invoke it before any other work
type: feedback
originSessionId: 9031bf2e-7b46-4c8c-ab2a-c7b2bff4313b
---
When the UserPromptSubmit hook fires with a `[FHS Router]` recommendation, invoke the recommended subagent or skill as the first action — not after several tool calls.

**Why:** In a prior session, the router repeatedly recommended `database-reviewer` subagent for Airtable/n8n data flow tasks. It was ignored every time. This led to unreviewed schema decisions, incorrect data flow assumptions, and having to redo work after Fat Mo pointed out the violation.

**How to apply:**
- See `[FHS Router] 建議 subagent: database-reviewer` → spawn `Agent(subagent_type="database-reviewer")` before doing any Airtable queries yourself
- See `[FHS Router] 建議 skill: X` → call `Skill(skill="X")` as first action
- The router recommendation is a hard requirement, not a suggestion
- Only skip if the recommendation is clearly irrelevant to the actual task (explain why in the response)

**擴充（2026-05-27）— 任務性質識別觸發**：
即使 Router hook 未明確推薦，當任務性質明確符合某個 skill 的觸發條件時（如「新加購品/配件」→ `/new-product`），必須在分析完成後、推入執行前主動識別並提議正確 skill。失誤模式：只完成分析輸出，等待用戶指示，而非主動說「此任務對應 `/new-product`，建議用它執行」。

**Why（新）：** 2026-05-27 session，燈飾加購品分析完成後直接輸出 Part A/B/C/D，未在執行轉折點掃描 available skills，用戶需要自行發現 `/new-product` 適用，屬於主動性失誤。
