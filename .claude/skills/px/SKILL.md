---
name: px
description: Perplexity search with FHS system context. Usage: /px <question> | /px audit
---

Use the `perplexity_search` MCP tool to search for the user's query and return a concise, well-structured answer.

## Instructions

1. Take the user's input after `/px` as the search query.
2. Call `perplexity_search` with that query.
3. Return the result in clear, readable format — summarize key points, cite sources if available.

If the query contains keywords like "deep research", "深度研究", "詳細分析", or "comprehensive", use `perplexity_deep_research` instead.

## System Audit Mode

If the query contains "audit", "審查", "審視", "系統現況", or "review system":

1. **First fetch system context from GitHub:**
   - `https://raw.githubusercontent.com/freehandsss2018/freehandsss_dashboard/main/CLAUDE_SESSION_INIT.md`
   - `https://raw.githubusercontent.com/freehandsss2018/freehandsss_dashboard/main/n8n/Triple_Sync_Field_Map.md`

2. **Analyze current system state** based on fetched files.

3. **Search externally** for best practices relevant to what you found (e.g. n8n workflow patterns, Airtable optimization, dashboard performance).

4. **Output a structured report:**
   - 現況摘要 (what the system is doing now)
   - 外部對標 (what industry best practice says)
   - 優化建議 (specific actionable improvements)
   - 風險提示 (anything that looks fragile or outdated)
