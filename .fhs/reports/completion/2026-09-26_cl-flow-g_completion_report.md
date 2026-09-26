# /cl-flow-g 新增 — 完成記錄

**日期**：2026-09-26｜**決策**：D99｜**分支**：`gov/a4-docs-landing`（未 push）

## 已完成
- 新增 `.fhs/ai/commands/cl-flow-g.md`（v1.0.0）與 `.claude/commands/cl-flow-g.md`（橋接）；`/cl-flow-fast` 不動。
- 流程：前段同 fast；Verdict 加「A4 適用性」；`/execute` 後 G1–G6（實作測試→既有驗收→`a4-scope.md`→硬停請 Fat Mo 觸發 A4→`gpt-review.md` 與逐條回應→2 輪上限／`DISPUTE_ESCALATED`／受阻→`a4.status` 收尾條件）。
- 同步：AGENTS.md §7 指令表、`commands/README.md`、`docs/repo-map.md`、`team-manifest.json`（名冊已重生）、`FHS_Prompts.md` 情境二十七、`CLAUDE.md`／根 `AGENTS.md` 路由行、portability manifest（兩檔 SKIP）、decisions D99、Changelog。

## 驗收（不自驗）
- fresh-context Claude subagent 盲測 4 題全對；Step 編號／`a4-review` 版本／基線路徑一致。
- 揪出並已修：repo-map 版本號過時、D99 條目缺失。
- 名冊勘誤表 2 項為既有（`stop-finance-auditor.js` 缺描述、CV-37 未升格），非本批造成。

## 待 Fat Mo
- 首次實跑 `/cl-flow-g` 時觀察 G3 硬停與 `a4.status` 是否好用；Codex 仍由你親手觸發。
- AGENTS.md 只增指令表一行，未升版號（仍 v1.8.0）。

【交付前雙紀律自檢】
驗收：文件治理 → ≤2 跳盲測 4 題 PASS＋斷鏈 0｜A4：不適用（文件層，純指令文件新增；如需可由 Fat Mo 觸發 `/codex:review --base main`）
Subagent：✅ fresh-context Claude subagent 盲測；其餘直接編輯
