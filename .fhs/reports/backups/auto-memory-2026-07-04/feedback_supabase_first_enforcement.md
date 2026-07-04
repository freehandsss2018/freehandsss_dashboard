---
name: feedback-supabase-first-enforcement
description: 工具缺口不得靜默降級至 Airtable；工具限制 = blocker 上報，非 workaround 觸發點
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 7db152b4-f881-413a-b1b5-012631549f9e
---

工具缺口不得成為繞開 Supabase-First 的理由。發現執行工具（AG/subagent/任何 AI）缺少 Supabase 存取能力時，正確行動是報告 blocker 並詢問解決方法，而不是靜默降級至 Airtable。

**Why:** 2026-06-04 事故：設計 VT-1/2/3 AG 驗證 prompt 時，發現 AG 缺少 Supabase MCP，選擇以 Airtable 替代而非上報。這違反 AGENTS.md Rule 3.12 Supabase-First 戰略，且是靜默降級——用戶不知道架構標準被繞開。Airtable 已明確降為輔助/備援角色（歷史記錄補救、遺失資料補救、冷備援），用 Airtable 驗證等於用備份核實主庫。

**How to apply:**
- 設計任何 live 資料查詢或驗證 prompt 前，先確認執行工具有 Supabase 存取
- 若工具缺少 Supabase MCP/HTTP 存取 → 立即報告為 blocker，提出解決選項（為工具加 MCP / 改由 Claude Code 執行 / Fat Mo 手動驗）
- 禁止以 Airtable 替代 Supabase 作為 live 驗證資料源，無論是否「技術上可行」
- 觸發場景關鍵詞：驗證 / 查詢 / VT / live data / 查單 / 查訂單

Related: [[feedback-airtable-direct-query]]
