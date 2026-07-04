---
name: project-governance-portability-plan
description: Fat Mo 計畫日後把 FHS 治理系統（governance/、指令執行架構、hooks、委派範本）拆成可攜模板，供未來非 Dashboard 專案繼承；目前延後到 Fable SOP 優化完成後才處理
metadata: 
  node_type: memory
  type: project
  originSessionId: 3f562981-eb7b-4460-b142-d6130922888a
---

Fat Mo 正透過 Fable 5 優化整個 FHS 工作流 SOP / Rule / Agent 體系。他關心的問題：這套長期沉積的治理守則（`.fhs/ai/governance/`、`/cl-flow` `/execute` `/commit` 等指令執行架構、hooks 機制、subagent 委派範本、handoff.md 交接範式）能否完整繼承到日後非 Dashboard 的其他專案。

**現況判斷**（2026-07-04 對話中分析）：
- 已通用可攜層：`.fhs/ai/governance/`（02_model-dispatch、03_judgment-rubrics、04_delegation-templates、05_maintenance-protocol）幾乎不含 FHS 業務內容，是純粹的 AI 調度判斷邏輯。
- 目前糾纏綁死層：`AGENTS.md` 憲法本體把通用原則（如 Rule 3.11 token 節約）和 FHS 業務事實（Airtable base ID、Supabase project、n8n workflow ID、財務真理規則）寫在同一份文件；`finance-gatekeeper`/`database-reviewer`/`finance-auditor` 等 skills/subagents 是 FHS 業務訂製品。
- 建議方向：拆成「治理引擎層」（可複製到新專案的模板）+「專案憲法層」（只留業務事實，引用通用層）。

**決策**：Fat Mo 選擇延後這個拆分重構，等 Fable SOP 優化告一段落後才處理。

**Why**：優化期間去做拆分屬於分心成本，且優化本身可能還在變動治理內容，過早拆分容易白工。

**How to apply**：
- 下次 Fat Mo 提起「治理系統可攜性」「拆分 governance」「其他專案繼承 FHS 規則」等話題時，直接引用這份記憶接續討論，不必重新分析一次。
- 若在 Fable 優化期間看到 AGENTS.md 或 governance/ 新增內容混雜了業務細節（如又寫入具體 Airtable/Supabase ID 到本該通用的判斷邏輯檔案），可以提醒 Fat Mo 這會墊高日後拆分成本——但不要主動去做拆分，除非他明確要求動手。
- 待辦不寫入 `.fhs/memory/handoff.md`（依 Rule 3 Mid-Session 脈衝規則，僅 Fat Mo 喊「checkpoint」/「存檔」時才落盤到 handoff.md）。
