# .fhs/reports — 統一報告中心

所有 AI 生成報告的唯一存放位置。各指令生成報告時必須輸出至對應子目錄。

## 目錄結構

```
.fhs/reports/
├── planning/           ← cl-flow A1/A2/A3 計畫、AGENT_2 報告、雜項規劃文件
│   └── design-specs/   ← v39/v40 設計規格書（唯讀歷史）
├── audits/
│   ├── system/         ← /fhs-audit 輸出（audit_YYYY-MM-DD.md）
│   └── cost/           ← /fhs-cost-audit 輸出（total_cost_audit_YYYY-MM-DD.md）
├── incidents/          ← 重大事故報告
└── completion/         ← /execute 完成記錄（YYYY-MM-DD_*_completion_report.md）
```

## 路徑映射（指令 → 輸出位置）

| 指令 | 輸出路徑 |
|-----|---------|
| `/fhs-audit` | `.fhs/reports/audits/system/audit_YYYY-MM-DD.md` |
| `/fhs-cost-audit` | `.fhs/reports/audits/cost/total_cost_audit_YYYY-MM-DD.md` |
| `/execute` 完成記錄 | `.fhs/reports/completion/YYYY-MM-DD_*_completion_report.md` |
| `cl-flow` A1/A2 計畫 | `.fhs/reports/planning/a1_implementation_plan.md` 等 |
| `cl-flow` A3 Verdict | `.fhs/reports/planning/a3_execution_verdict.md` |
| `ag-stitch-sync` 草稿 | `.fhs/reports/planning/` |

## 注意事項

- `artifacts/` 目錄仍保留 cl-flow 的臨時輸出（gitignored）
- `.fhs/memory/lessons/` 不在此目錄 — 機構知識另行管理
- `.fhs/memory/backups/` 存放 n8n-mcp JSON 備份
