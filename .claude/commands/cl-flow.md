讀取 `.fhs/ai/commands/cl-flow.md` 並執行最終審核報告（Verdict）。

NO-TOUCH GUARDRAIL：全程禁止任何寫入、修改、建立、刪除操作。

步驟：
1. 讀取 AGENTS.md + .fhs/memory/handoff.md 確認系統狀態
2. 讀取 .fhs/notes/ai_reports/a1_implementation_plan.md（A1 計畫）
3. 讀取 .fhs/notes/ai_reports/a2_implementation_plan.md（A2 計畫）
4. 審視兩份計畫是否衝突、遺漏、違反 SOP/AGENTS 規則
5. 產出 Verdict 報告（結論、風險、建議做法、diff 預覽）
6. 停止等待 Fat Mo 的 /execute 授權，禁止自行執行
