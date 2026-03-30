# .agents/ — AI IDE 工作流配置

本資料夾存放各類 AI 編輯器（如 Cursor、Windsurf 或 Antigravity）專用的自動化工作流 (Workflows)。

| 檔案/資料夾 | 用途 |
|---|---|
| `workflows/` | 定義可在編輯器對話框透過 `/斜線指令` 觸發的協作腳本 |

> ⚠️ 這是 AI IDE 的硬綁定目錄，請勿移動或更名，否則 UI 快捷鍵將失效。
> 任何工作流內若需參照 FHS 規則，請統一指向 `/.fhs/ai/AGENTS.md`。
