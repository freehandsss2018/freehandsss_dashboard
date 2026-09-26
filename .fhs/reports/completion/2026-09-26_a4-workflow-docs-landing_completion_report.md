# A4（Codex）文件落地 — 完成記錄

**日期**：2026-09-26｜**flow**：`2026-09-26-1831`｜**決策**：D98｜**分支**：`gov/a4-docs-landing`（由 `gov/a4-codex-workflow` `8de94fd` 拉出，本地，未 push）
**授權範圍**：清單 #4、#5、#6（Tier 1）、#9、#10 ＋ D98；#7（runner）、#8（guard 規則）擱置。

## 已完成

| 檔案 | 改動 |
|---|---|
| `.fhs/ai/AGENTS.md` | v1.7.3→v1.8.0；新增 §7「跨代理角色表 A1–A4」（唯一本文）；`/a4-review` 入指令表；「A4 報告≠批准」；Rule 3.17 加 A4 附加層；三腦舊編號註明與角色表無關 |
| `.fhs/ai/commands/execute.md` | A4 基線、A4 步驟、[E] 驗收行加 A4 欄 |
| `.fhs/ai/commands/cl-flow.md`（v3.1.0）／`cl-flow-fast.md`（v2.1.0） | A1(PX) 狀態欄；批准提示加 `/a4-review` 指針 |
| `.fhs/ai/commands/a4-review.md`（新）、`.claude/commands/a4-review.md`（新橋接） | Tier 1 流程、提示詞模板、失敗態、已知限制、`Known failure modes` 尾節 |
| `.claude/commands/{execute,cl-flow,cl-flow-fast}.md` | 各加一行 A4 指針 |
| `CLAUDE.md`、根 `AGENTS.md` | 治理路由表各加一行（**提案項**：05 §1 規定增刪 CLAUDE.md 路由行須先問 Fat Mo；本批在授權範圍內，請 Fat Mo 確認保留） |
| `ANTIGRAVITY.md`、`.fhs/notes/FHS_Mode_Card.md` | 過時描述修正；Codex（A4）唯讀條目 |
| `.fhs/ai/team-manifest.json`（1.1.3） | trigger_words、automations、3brain 描述；名冊已重生 |
| `docs/FHS_Prompts.md`（v1.17） | 情境二十七；front-matter 更新 |
| `scripts/portability/manifest.json` | 兩個新檔各加 `SKIP`；未動任何 `upstream_blob_hash` |
| `decisions.md` D98、`Changelog.md`、`handoff.md` | 決策、摘要、便攜塊＋MASTER 列 |

## 驗收（不自驗）

- **fresh Codex 盲測**：`codex exec -s read-only`，3 題（A4 職責／重審上限／A3 自呼叫級別）全對且附正確出處；exit 0。
- **fresh Claude subagent 盲測**：兩跳內找到，3 題全對；未發現矛盾或斷連。
- **grep**：「Codex（A3）／Codex 裁決／Codex 撰寫 a3-draft」僅餘：`source-command-ag-flow`（已停用 /ag-flow，另案）與兩份「舊版曾寫…已移除」說明句、歷史報告引述。
- **角色表本文**：全 repo 僅 `.fhs/ai/AGENTS.md` 一份。
- **check-manifest**：`Source drift` ×5（AGENTS.md、execute、cl-flow、cl-flow-fast、FHS_Mode_Card，GENERIC-FORK 設計訊號；模板 v0.1.0 不含 A1–A4，是否再匯出由 Fat Mo 決定）；`Unclassified` ×3 為 S149 既有（`backups/{00_INDEX,05_maintenance-protocol,CLAUDE}.md.2026-09-26.bak`，**非本批造成**）；兩個新檔的「not tracked」在 `git add` 後消失。
- **名冊勘誤表 2 項（非本批造成）**：`stop-finance-auditor.js` 缺 team-manifest 描述；Canva 規則 CV-37 已被 3 單引用未升格。

## 未做／待 Fat Mo

1. 親手輸入 `/codex:review --base main`（第 2 次實審）；A3 不代跑。
2. Supabase 令牌旋轉（Fat Mo 自己做）。
3. ~~`.agents/skills/` 寫入類橋接去留~~：已由第 2 次實審 P1 觸發並修畢（見下節）。
4. `gov/a4-docs-landing` 未 push、未推 main、未同步 Notion。

## 第 2 次實審（Codex，`/codex:review --base main`，thread `01a0de00-8037-7a42-bae3-38b3f70832cd`）

- [P1] `/a4-review` 範圍依 `git diff HEAD`，已 commit 後為空 → **已修**：v1.1.0 改 `<BASE>..HEAD`（基準 SHA／merge-base）＋範圍非空自檢；`execute.md` 基線記 `HEAD=<sha>`。
- [P1] Codex 寫入類橋接 → **已修**：8 個橋接（`execute`、`commit`、`upload-web`、`db-query`、`new-product`、`canva-auto`、`3d-print`、`fhs-slim`）改為拒絕並指向 A3，備份於 `governance/backups/`；fresh Codex 唯讀測 `/execute` 回覆拒絕。
- 回應全文：`artifacts/2026-09-26-1831/a4-response-2.md`。

## 第 3 次實審（thread `01a0de08-c78a-7372-9459-ec344f2bb02a`，重審第 2 輪，上限 2 輪）

- [P1] 其餘寫入類橋接 → **已修**：再改 8 個（`fhs-check`、`fhs-audit`、`ag-plan`、`team`、`ag-stitch-sync`、`ag-ui-import`、`error-eye`、`usage-audit`），共 16 個；保留唯讀類 `read`、`rg`、`rp`、`guardian`、`8d`。
- [P2] `/a4-review` 非空自檢漏未追蹤檔 → **已修**（v1.2.0）。
- [P2] `/execute` 舊版路徑基線檔位置 → **已修**（舊版改存 `.fhs/reports/planning/a4_baseline.txt`）。
- 回應全文：`artifacts/2026-09-26-1831/a4-response-3.md`。若複審仍有未解 BLOCKER 標 `DISPUTE_ESCALATED`。

## 第 4 次實審（thread `01a0de23-a6c5-7b22-941b-deb1a13c9a32`，6 條全 P2）

- 已修 5：`/a4-review` v1.3.0（舊版流程 `<PKG>` 路徑；非 0 exit 一律受阻且防陳舊檔；main 上禁用退化 merge-base）、`ag-flow` 橋接改拒絕（共 17 個）、`domain-modeling` 加 A4 唯讀限制。
- 另案 1：`px` 技能指向不存在的 `CLAUDE_SESSION_INIT.md`（既有問題，與 A4 無關）。
- 回應全文：`artifacts/2026-09-26-1831/a4-response-4.md`。

## 工程記錄

- 工作位置：`gov/a4-codex-workflow` 被主倉佔用，改在 worktree 建 `gov/a4-docs-landing`（同 `8de94fd`）；合併回 gov 分支時在主倉 `git merge --ff-only gov/a4-docs-landing` 即可。
- 檔案為 CRLF 工作副本；以腳本改檔時保持原換行。

**Subagent 使用記錄**：✅ 派 fresh-context Claude subagent 做盲測；另以 `codex exec -s read-only` 做 Codex 盲測。

【交付前雙紀律自檢】
驗收：文件治理 → ≤2 跳盲測 3 問（Codex＋Claude fresh 各 3/3 PASS）、check-manifest 結果如上｜A4：不適用（本批為文件層；第 2 次實審由 Fat Mo 觸發 `/codex:review --base main`）
Subagent：前置評估後派 fresh-context 盲測 subagent＋Codex 盲測；其餘為直接文件編輯
