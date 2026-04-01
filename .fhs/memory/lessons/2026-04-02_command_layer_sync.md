# Lesson: FHS 指令層同步 — Claude Code Skill 登錄
Date: 2026-04-02

## 事件
在本次 session 執行 `/execute` 時，用戶兩次嘗試 CLI slash command 均失敗（"Unknown skill: execute"），原因是 FHS 自訂指令未登錄為 Claude Code 原生 skill。

## 根因
FHS 指令定義存在於 `.fhs/ai/commands/*.md`，但 Claude Code 的 slash command 系統讀取 `.claude/commands/` 目錄。兩套系統並行，互不知曉。

## 修正
在 `.claude/commands/` 新增 8 個 skill 檔案，橋接 FHS 指令定義：
- execute, cl-flow, commit, guardian, fhs-check, fhs-audit, error-eye, px-audit

同時修正 Perplexity 預設模型：
- `sonar-reasoning` → `sonar-reasoning-pro`（原 `openai/gpt-5.4-thinking` 經 API 測試確認不可用）

## 教訓
1. 新增 FHS 指令時，必須同步在 `.claude/commands/` 建立對應 skill 檔案
2. Web UI 支援的模型 ≠ API endpoint 支援，切換前必須用 curl 實測
3. 授權信號需精確：用戶多次輸入 "execute"（無斜線）才成功授權，顯示 CLI 路徑對 Fat Mo 不直覺
