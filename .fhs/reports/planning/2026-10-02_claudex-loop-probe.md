# Claudex Loop 安裝後探針報告（flow 2026-10-02-1522，D103）

日期：2026-10-02｜執行：A3（Claude Code）｜環境：Windows 11、codex-cli 0.157.1（ChatGPT 登入）、Claude Code 2.1.283、Python 3.13.3
上游：`chaseai-yt/claudex-loop` v2.1.0，commit `8cf5e2c1771c5151d90c12642391d0ba8fa71b0e`（plugin 安裝記錄 `gitCommitSha` 一致）
Fixture：session scratchpad 內一次性 git repo（`calc.py`＋刻意寫錯嘅 `PLAN.md`：聲稱 `average([])` 唔會除零），**未掂 FHS repo**。
Runner 診斷：`artifacts/2026-10-02-1522/runs/claudex-*/`（gitignored）。

## 安裝

| 側 | 指令 | 結果 |
|---|---|---|
| Claude | `claude plugin marketplace add chaseai-yt/claudex-loop` | ✔ marketplace 記入 user settings |
| Claude | `claude plugin install claudex-loop@claudex-loop -s project` | ✔ `.claude/settings.json` `enabledPlugins` 加 `claudex-loop@claudex-loop: true` |
| Codex | 複製上游 `skills/.` → `~/.agents/skills/` | ✔ `claudex-loop`、`claudex-route`、`codex-build`、`codex-review` |

`claude plugin details`：4 skills、0 agents、0 hooks、0 MCP；always-on 約 355 tokens／session。

## 探針結果

| # | 測試 | 結果 | 證據 |
|---|---|---|---|
| P1 | `runner.py roles --host claude／codex` | ✅ PASS | claude→reviewer codex、inspector codex；codex→reviewer claude、inspector claude |
| P2 | `codex exec -s read-only -c mcp_servers={}` 列可用 MCP 工具 | ✅ 機制有效／⚠️ runner 未套用 | 加 override：`NONE`；對照組（無 override）：`mcp__cua_repl`、`mcp__cua_repl.js`、`mcp__cua_repl.js_reset`（可執行 JS）。runner 唔接受額外 CLI 參數，故經 Claudex 審查時 Codex 仍帶 `cua_repl`——與現有 `/codex:review` 相同，非新增風險 |
| P3a | Claude→Codex 審錯誤 plan | ✅ PASS | REVISE，F1 high：「`average` 為 `sum/len`，`[]` 會 ZeroDivisionError」；coverage 有 SHA256 驗證 |
| P3b | 修正 plan 後 `--resume` 同一 reviewer | ✅ PASS | 同 session `01a0fc28-2516-78c0-8e1f-f50e0d467774`；APPROVED、0 findings；新 SHA256 `e18bb9f1…` |
| P3c | `check`：plan 未改／改一行 | ✅ PASS | 未改：「Approval matches the current plan.」exit 0；加一行後：「Plan changed after approval. Review the current plan again.」exit 1 |
| P4 | Codex→Claude（`--host codex`） | ✅ PASS（需 workaround） | 首次失敗：`Cannot safely launch …\npm\claude.CMD`（runner 只識舊版 `cli.js`，新版 npm 包改為 `bin/claude.exe`）。加 `--cli …/@anthropic-ai/claude-code/bin/claude.exe` 後成功：status completed、session `9277c846-…`、REVISE、observed model `claude-sonnet-5`（CLI 預設）。審查員參數：`--safe-mode --strict-mcp-config --mcp-config {"mcpServers":{}} --tools Read,Glob,Grep --permission-mode dontAsk` |
| P5 | 指令命名 | ✅ PASS | plugin skills 帶命名空間 `/claudex-loop:codex-review` 等，與 `/codex:review` 分得開 |

## 判定與後續

- Verdict #6 降級條件（P2 FAIL → 停用 Codex 寫入工具）**未觸發**：清空 MCP 嘅機制存在且有效；限制只係 runner 唔帶該參數。
- Fat Mo 可選：從 `~/.codex/config.toml` 移除 `node_repl`（或對應 `cua_repl` 來源）以徹底關閉 Codex 側 JS 執行工具——屬改個人設定，A3 不代做。
- P4 workaround 已寫入 `cl-flow-g.md` G0 及速查卡；上游若修正 `cli_prefix()`（`runner.py:60-76`）可移除。
- Codex→Claude 審查預設用 Claude CLI 預設模型；要指定須加 `--model`。
- 觀察：Codex 執行時自身 hooks（`~/.codex/hooks.json`）出現 `UserPromptSubmit Failed`／`Stop Failed`，與本次安裝無關，未處理。
- 未驗證：plugin project scope 喺主倉（非本 worktree）是否生效——`enabledPlugins` 寫喺 tracked `.claude/settings.json`，合併入 main 後應生效，下次喺主倉開 session 時確認 `/claudex-loop:` 出現。
