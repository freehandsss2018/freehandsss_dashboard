# Lesson: Antigravity v1.21.6 MCP 修復 + VSCode 工具鏈整合

Date: 2026-04-30

## 問題 1 — Antigravity chat 完全無反應

**根本原因**：`.git/config` 含 `extensions.worktreeConfig = true`，導致 Antigravity 內建 Go language server crash，輸出：
`ConnectError: core.repositoryformatversion does not support extension: worktreeconfig`

**修復**：`git config --unset extensions.worktreeConfig`

**記憶**：已儲存至 `memory/feedback_antigravity_worktreeconfig.md`

## 問題 2 — Antigravity v1.21.6 所有 MCP 顯示「context canceled」

**根本原因**：v1.21.6 新增 Linux Sandboxing，OAuth-based `mcp-remote` flows（Figma、GitHub via githubcopilot.com）被沙盒阻擋。

**修復**：
- GitHub → 改用 `node` 直接執行 `@modelcontextprotocol/server-github/dist/index.js`（已安裝在 npm global）
- Figma → 移除（OAuth 沙盒不兼容，等官方更新）
- Perplexity-Pro-MCP → 移除（localhost:8787 未知服務）
- Notion → `npx @notionhq/notion-mcp-server` stdio 正常工作

**最終有效 MCP 列表**：airtable-fhs, StitchMCP, github, notion

## 問題 3 — Antigravity UI「Open MCP Config」按鈕會覆蓋手動設定

**修復**：不要用 Antigravity UI 按鈕修改 `mcp_config.json`，只用文字編輯器直接修改 `c:\Users\Edwin\.gemini\antigravity\mcp_config.json`

## 教訓

1. Antigravity crash 時，先查 VS Code Developer Tools Console（Help > Toggle Developer Tools）
2. MCP OAuth flows 在 v1.21.6 sandbox 失效，只用 stdio-based（npx/node）MCP
3. `extensions.worktreeConfig` 必須在 Antigravity 使用的 repo 中保持關閉

## VSCode 工具鏈整合（本 session 完成）

- 新增 `.vscode/extensions.json`（markdownlint, ESLint, GitHistory, GitLens）
- 新增 `.eslintrc.json`（browser + ES2021 環境，no-var/prefer-const/eqeqeq 規則）
- 更新 `.vscode/settings.json`（ESLint validate HTML + JS、markdownlint on save）
- 新增 `.markdownlint.json`（MD013/MD033/MD036/MD060 豁免）
- Markdownlint 1011 個錯誤修復完成

## Claude Code 全域權限更新

- `C:\Users\Edwin\.claude\settings.json` 新增 `"defaultMode": "bypassPermissions"`
- 效果：/commit、/read、/execute 等指令不再彈出 YES/NO 確認
