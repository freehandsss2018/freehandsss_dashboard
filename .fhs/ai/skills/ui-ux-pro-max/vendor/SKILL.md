---
name: FHS-Curated UI/UX Intelligence Layer
type: fhs-native
version: 1.0.0
created: 2026-04-05
source: FHS original — inspired by UI/UX Pro Max principles
---

# FHS-Curated UI/UX Intelligence Layer

> 本文件為 FHS 原生建立的設計 intelligence 參考層，靈感來源於 UI/UX Pro Max 原則，
> **非第三方 repo mirror，非外部完整安裝**。
> 所有內容均針對 FHS 業務規則（令狐沖/肥貓雙模式、純 HTML/CSS 約束）重新整理。

## 核心用途

作為 FHS subagent workflow 的 design intelligence reference，供：
- `ui-designer`：Phase A/B 設計決策的 checklist 工具
- `code-reviewer`：Phase C 視覺品質稽核的評分標準
- `frontend-developer`：實作時的設計規格驗證依據

## 角色邊界

- **是**：checklist 工具、reference layer、品質閘門標準
- **不是**：第四個 subagent、平行規則中心、外部 repo mirror
- **不含**：YAML frontmatter、Claude Code agent 配置
- **不上傳**：不安裝至 `~/.claude/agents/`

## 主要文件

- `FHS_INTEGRATION.md`：FHS 專屬整合指引（核心文件）
- `README.md`：用途與使用場景說明
