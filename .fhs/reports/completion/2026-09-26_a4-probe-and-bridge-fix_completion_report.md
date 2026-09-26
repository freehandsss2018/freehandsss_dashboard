# 完成記錄：A4（Codex）探針、Codex 橋接角色修正、開分支

**日期**：2026-09-26｜**flow**：`2026-09-26-1831`（/cl-flow-fast）｜**授權**：Fat Mo 批准清單 #1、#2、#3 及「修正兩份 Codex bridge 的 A3 定位」；#7（runner）、#8（guard 規則）擱置，待探針結果與 3 次實審後再議。
**執行者**：Claude Code（A3）｜**分支**：`gov/a4-codex-workflow`（由 main `34c78b8` 開出，未 commit）

## 已執行

| 項 | 內容 | 證據 |
|---|---|---|
| #1 令牌處置（本地部分） | `.git/info/exclude` 加入 `.codex/config.toml`；`.codex/config.toml` 明文令牌改 `env_vars = ["SUPABASE_ACCESS_TOKEN"]` | `git check-ignore` 命中；令牌 grep=0；`codex mcp get supabase` 讀到 `env_vars` |
| #2 探針 | R4 (a)–(g) 加 (h) 外掛 `/codex:review` | `.fhs/reports/planning/2026-09-26_a4-probe-report.md`；原始證據 `D:\tmp\a4-probe-meta\` |
| #3 開分支 | `git switch -c gov/a4-codex-workflow`（起點 `34c78b8`） | `git branch --show-current` |
| 橋接修正 | `.agents/skills/source-command-cl-flow/SKILL.md`、`source-command-cl-flow-fast/SKILL.md`：由「Codex 撰寫草案／裁決（A3）」改為「Codex 不執行，只做 A4 審查」 | 備份 `.fhs/ai/governance/backups/source-command-cl-flow*.SKILL.md.2026-09-26.bak`；盲測見下 |
| 後效稽核 | `Changelog.md` 新增頂部條目（[C]）；本完成記錄（[B]） | Changelog 條目數 525→526，錨點唯一 |

## 驗證

- **盲測（fresh Codex，唯讀，於本 repo）**：輸入 `/cl-flow …` 並問 3 題。Q1 自認 A4、只審不改；Q2 不會自寫 `a3-draft.md` 與裁決；Q3 指向 Claude Code。3/3 符合新橋接內容。
- **探針結論摘要**：`codex exec -s read-only` 擋下 shell 與 `apply_patch` 寫入；`.codex/hooks.json` 對 Codex 5 次執行 0 次觸發（未能證明 guard 生效）；`codex review --uncommitted` 不可併用自訂提示；預埋 bug 6/6、3/3 找到；三種失敗態可機械分辨。
- **repo 狀態**：除上表項目外，探針過程未改動任何 repo 檔案（`git status` 核對）。

## 未完成／待決

- 令牌旋轉（Fat Mo）：`.env`、`.mcp.json`、`C:\Users\Edwin\.claude\settings.json`、`.claude/worktrees/canva-learning-records-design-e99f26/.env`、Windows 環境變數 `SUPABASE_ACCESS_TOKEN`。
- 清單 #4–#6、#9、#10 未批准：AGENTS.md 角色表、`execute.md` A4 步驟、`a4-review.md`、名冊／模式卡／decisions（含 D98）等尚未寫入，**現行憲法與指令對 A4 仍是空白**。
- #7、#8 擱置。
- 探針之外的發現（未動）：`.agents/skills/source-command-ag-flow/SKILL.md:14,32` 仍有「Codex 裁決」舊字樣；`.agents/skills/` 共 24 個橋接，含 `execute`、`commit`、`upload-web`、`db-query`、`new-product`、`canva-auto`，Codex 可依技能執行寫入類指令，與 A4「只審不改」矛盾。
- 探針限制：只測非互動 `codex exec`；桌面版與互動模式的沙盒與 hook 未測。

## 後效稽核宣告

- [B] 成立：修改指令層橋接檔 → 本完成記錄。
- [C] 成立：Codex 橋接行為改變 → `Changelog.md` 已更新。
- [A] 不觸發：新增檔案僅為報告與備份，`docs/repo-map.md` 現行慣例不逐檔索引報告類檔案（grep 報告目錄 0 命中）。
- [G] 不觸發；[F] 不觸發（`.fhs/ai/commands/` 無增刪、AGENTS.md 無新增 Rule）。
- decisions.md：D98 待清單 #9 批准後一併寫入；本次尚未寫。

【交付前雙紀律自檢】
驗收：文件治理型——fresh-context 盲測 3 題全符合；橋接內引用路徑 `.fhs/ai/commands/cl-flow*.md` 存在；舊字樣 grep 僅剩註記與 `ag-flow`（已列為未動項）。PASS。
Subagent：前置評估：無財務、無代碼、無 n8n 變更，不需專科 subagent；盲測改用 `codex exec` 的 fresh 進程（非 Claude subagent）。❌ 未派 Claude subagent。
