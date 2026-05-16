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

## 現有 Agent 清單 (8 個 Subagents)

| Subagent | 版本 | 日期 | 職責 |
|-----------|------|------|------|
| **ui-designer** | v2.0.0 | 2026-05-03 | 負責 UI/UX 產出與 HTML 結構設計（V40 架構師） |
| **frontend-developer** | v1.1.0 | 2026-05-03 | 負責 JS 邏輯與 CSS 實作（V39 原型實作者） |
| **code-reviewer** | v1.1.0 | 2026-05-03 | 負責品質稽核與代碼審查（Phase C 品質守門） |
| **database-reviewer** | **v2.1.0** | **2026-05-16** | 專攻 Airtable / Supabase Schema + n8n 資料流驗證（財務字段歸屬驗證） |
| **finance-auditor** | **v2.0.0** | **2026-05-16** | 四端財務稽核員（Dashboard ↔ n8n ↔ Airtable ↔ Supabase）Live 驗證 |
| **tdd-guide** | v1.0.0 | 2026-04-28 | 驅動測試驅動開發流程 (Test-Driven Development)，Python + n8n 專用 |
| **build-error-resolver** | v1.0.0 | 2026-04-28 | 自動化修復構建與運行錯誤，n8n workflow 診斷專用 |
| **blender-3d-modeler** | v2.0.0 | 2026-05-07 | FDM 3D 列印準備專家，STL 修復 / mesh 檢查 / 列印前置檢查 |

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
