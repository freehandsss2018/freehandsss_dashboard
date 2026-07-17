# FHS Dashboard — Claude Code 入口

1. 啟動時以 SessionStart hook 快照（便攜塊動態段，體積預算 ≤4,000 bytes，見 commit.md P0.7.1 防回胖機制；2026-07-04 實測 ~2,300 tokens，非舊稱 ~300 tokens）為準開工；僅遇複雜架構決策 / 跨長時間斷檔 / 需驗證交接細節時才 `/read` 全量重載（Rule 3.11）。
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
| 想找舊知識 / 過往決策為什麼這樣定 / 教訓在哪份文件 | `.fhs/notes/knowledge-map.md`（查詢路由表，非規則） |
| 要落盤教訓（learnings/skill）/ 平行派工（fan-out/loop 迭代）/ 想用 worktree | `.fhs/ai/governance/07_compounding-loop.md` |
| 想了解制度退化模式 / 給未來 session 的提醒 | `.fhs/ai/governance/06_letter-to-future-sessions.md` |
| 改 V42 排版/UI 骨架（表格對齊/字體/Loader/樣式鐵律） | `.fhs/ai/skills/ui-ux-pro-max/FHS_INTEGRATION.md` Section 六（排版鐵律唯一居所） |
| 需求模糊想「拷問」問清楚先做決定 | `.fhs/notes/grilling-quickcard.md`（mattpocock/skills 吸收版，召喚詞「拷問我」/「拷問落檔」） |
| 想知道日常操作/召喚詞速查（人讀，非規則） | `.fhs/notes/fatmo-ops-quickcard.md`（D39，harness 內建能力 + FHS 自建指令核心集） |

## 三條免查即生效的紅線（規則本體與完整版見 `.fhs/ai/governance/02_model-dispatch.md` §5-§6；診斷依據見 01_diagnosis.md）

- **禁全檔 Read**：巨檔（Dashboard HTML/handoff.md/CHANGELOG.md/decisions.md/n8n JSON 等）一律 Grep 定位 → 窗口讀。
- **巨檔替換三步**：改前 grep -c =1 → 才替換 → 改後 count 驗證。
- **驗收不自驗**：財務 / schema / n8n 部署 / 生產 HTML 的改動，驗收派 fresh-context agent 或附運行證據。

> ⚠️ 不要在此檔案新增規則。規則只在 AGENTS.md（憲法）與 `.fhs/ai/governance/`（調度制度）維護；本檔只做路由。
