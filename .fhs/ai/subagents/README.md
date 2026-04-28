# FHS Subagents — 目錄說明

本目錄存放 FHS 系統的 subagent 文件層。

## 目錄結構

```
subagents/
├── OPERATING_MODEL.md   ← FHS Subagent 運作模型（長期制度文件）
├── MANIFEST.md          ← 機器可讀 agent 清單（版本追蹤）
├── install-log.md       ← 安裝歷史記錄
├── README.md            ← 本文件
├── vendor/              ← 原始副本（未修改，供 rollback 與比對）
│   ├── ui-designer.md
│   ├── frontend-developer.md
│   └── code-reviewer.md
└── freehandsss/         ← FHS 重寫版（實際使用版本）
    ├── ui-designer.md
    ├── frontend-developer.md
    └── code-reviewer.md
```

## 雙層架構說明

| 層 | 路徑 | 用途 |
|----|------|------|
| 原始碼層 | `.fhs/ai/subagents/freehandsss/` | 版本控制、變更追蹤、rollback 依據 |
| Runtime 層 | `~/.claude/agents/freehandsss/` | Claude Code 執行時偵測，每次 `/execute` 同步 |

## 現有 Agent 清單 (Subagents)

- **ui-designer**: 負責 UI/UX 產出與 HTML 結構設計
- **frontend-developer**: 負責 JS 邏輯與 CSS 實作
- **code-reviewer**: 負責品質稽核與代碼審查
- **database-reviewer**: 專攻 Airtable 與數據結構一致性
- **tdd-guide**: 驅動測試驅動開發流程 (Test-Driven Development)
- **build-error-resolver**: 自動化修復構建與運行錯誤

## Rollback 規則

還原任一 agent：
```
git checkout <commit> -- .fhs/ai/subagents/freehandsss/<agent>.md
cp .fhs/ai/subagents/freehandsss/<agent>.md ~/.claude/agents/freehandsss/<agent>.md
```

完整回滾參考 `install-log.md` 中的版本歷史。

## 憲法層聲明

所有 subagent 均須遵守 `AGENTS.md` 全域硬規則。
本目錄文件不得凌駕憲法層。
