# FHS Dashboard — Claude Code 入口

1. 啟動時以 SessionStart hook 快照（~300 tokens）為準開工；僅遇複雜架構決策 / 跨長時間斷檔 / 需驗證交接細節時才 `/read` 全量重載（Rule 3.11）。
2. 規則本體在 `/.fhs/ai/AGENTS.md`（憲法層，最高優先）與 `/.fhs/ai/commands/`（指令層）。
3. 任何架構改動先提出方案，等待 Fat Mo 確認後才動手；完成後同步更新 `/.fhs/notes/decisions.md`。
4. 不要自作主張改專案結構。

## 治理路由表（做 X 之前，先讀 Y — 按情境載入，不要全部預讀）

| 你正要做的事 | 先讀 |
|---|---|
| 大量讀取 / 掃 repo / dump n8n JSON / 批次改檔 / 選 subagent 模型 | `.fhs/ai/governance/02_model-dispatch.md` |
| 卡關兩輪、想升級模型、想宣告完成、想問 Fat Mo、懷疑方向錯了 | `.fhs/ai/governance/03_judgment-rubrics.md` |
| 要派工給 subagent（搜尋/實作/重構/研究/審查） | `.fhs/ai/governance/04_delegation-templates.md` 直接套模板 |
| 要修改 governance / learnings / handoff 等制度檔案 | `.fhs/ai/governance/05_maintenance-protocol.md` 查權限矩陣 |
| 涉及財務 / 成本 / 定價 | 先載 `finance-gatekeeper` skill（既有硬規則） |

## 三條免查即生效的紅線（細節與依據見 governance/01_diagnosis.md）

- **禁全檔 Read**：`Freehandsss_Dashboard/` 目錄下**所有** `.html`（含 current / V41 / V42；檔名大小寫混用，一律視為在名單內）、`.fhs/memory/handoff.md`、`CHANGELOG.md`、`session-log.md`、`decisions.md`、n8n workflow JSON——一律 Grep 定位 → 窗口讀（≤250 行）。handoff.md 只准讀前 120 行（便攜塊＋MASTER 表已含全部現役狀態）。
- **巨檔替換三步**：改前 grep -c =1 → 才替換 → 改後 count 驗證（舊=0 新=1）。
- **驗收不自驗**：財務 / schema / n8n 部署 / 生產 HTML 的改動，驗收派 fresh-context agent 或附運行證據（HTTP 碼 / 測試輸出 / read-back），「代碼已寫」不等於完成。

> ⚠️ 不要在此檔案新增規則。規則只在 AGENTS.md（憲法）與 `.fhs/ai/governance/`（調度制度）維護；本檔只做路由。
