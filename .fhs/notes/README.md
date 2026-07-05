# .fhs/notes/ — 決策、待辦與報告

本資料夾存放 Freehandsss Dashboard 專案的運行記錄、設計決策與 AI 分析報告。

| 檔案/資料夾 | 用途 |
|---|---|
| `SOP_NOW.md` | **系統喚醒起點**：由 `/read` 指令調用，同步當前狀態 |
| `decisions.md` | **架構決策紀錄**：記錄「為什麼」這樣改，維護技術債備忘 |
| `knowledge-map.md` | **知識檢索路由表**：查「舊知識/決策/教訓該去哪找」，按檔案類別非個別檔案（2026-07-05 S144 新增） |
| `todo.md` | **任務清單**：當前 Pending 任務與未來計畫 |
| `session-log.md` | **對話日誌**：記錄每次 session 的達成事項與交接點 |
| `ai_reports/` | **AI 分析報告區**：存放長篇深度分析或優化提案 |
| `completion_reports/` | **任務完工記錄**：`/execute` 成功後的正式結案報告 |
| `pending_tasks/` | **掛起任務**：待續行或需跨 Session 追蹤的任務細節 |

> ⚠️ 修改任何業務規則或架構前，必須同步更新 `decisions.md`。

---

## 版本同步機制（Phase 3 — 2026-05-16）

### 單一真相來源（Single Source of Truth）規則

所有系統版本與日期必須遵循「金字塔」同步模型：

```
頂層：AGENTS.md v1.4.5（憲法層 — 最高權威）
  ├─ 所有 README.md 檔案必須參考此版本
  ├─ 所有 subagent/*.md 必須聲明相容版本
  └─ 所有 repo-map.md 記錄必須追蹤此版本
```

### Subagent 版本格式標準（統一頭尾聲明）

所有 `.fhs/ai/subagents/freehandsss/*.md` 必須遵循此格式：

```yaml
---
name: {{subagent_name}}
description: {{說明 + Phase + 觸發時機}}
tools: [...]
model: {{claude-model}}
version: v{{X}}.{{Y}}.{{Z}}
compatible_with: AGENTS.md v1.4.5
last_updated: YYYY-MM-DD
---

{{內容}}

---
**版本履歷**
- v{{X}}.{{Y}}.{{Z}} (YYYY-MM-DD): {{變更說明}}
```

### 日期同步清單

| 檔案 | 當前版本 | 相容性檢查 | 最後更新 |
|------|---------|----------|--------|
| AGENTS.md | v1.4.5 | ✅ | 2026-05-13 |
| README.md (root) | v1.4.5 | ✅ | 2026-05-16 |
| repo-map.md | 2026-05-16 | ✅ | 2026-05-16 |
| Freehandsss_Dashboard/README.md | V41 | ✅ | 2026-05-16 |
| supabase/README.md | Phase 4 Pending | ✅ | 2026-05-16 |
| n8n/README.md | v1.1 | ✅ | 2026-05-16 |
| ui-designer.md | ⏳ 待更新 | - | - |
| frontend-developer.md | ⏳ 待更新 | - | - |
| code-reviewer.md | ⏳ 待更新 | - | - |
| tdd-guide.md | ⏳ 待更新 | - | - |
| build-error-resolver.md | ⏳ 待更新 | - | - |

### 修改流程

1. 更新 AGENTS.md 時，版本號遞增（e.g., v1.4.5 → v1.4.6）
2. 同步更新所有相關 README 中的 AGENTS.md 參考版本
3. 所有 subagent 檔案必須聲明 `compatible_with: AGENTS.md vX.X.X`
4. 在 `.fhs/notes/decisions.md` 記錄版本變更理由
5. 執行 repo-map.md 自動驗證（檢查是否有陳舊日期）
