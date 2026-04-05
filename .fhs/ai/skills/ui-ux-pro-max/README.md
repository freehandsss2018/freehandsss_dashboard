# FHS-Curated UI/UX Intelligence Layer

> FHS 原生建立的設計 intelligence 參考層，靈感來源於 UI/UX Pro Max 原則。
> 非第三方 repo mirror，非平行規則系統。

## 用途

本層作為 FHS subagent 5-layer workflow 的 Layer 3（SPEC 層），
提供 FHS 專屬設計規格、UX heuristics、品質閘門標準。

## 使用場景

| 角色 | 使用時機 | 使用方式 |
|------|---------|---------|
| `ui-designer` | Phase A 設計衝刺完成後 | 對照 FHS_INTEGRATION.md 完成 FHS Design Spec |
| `code-reviewer` | Phase C 品質稽核 | 使用 Section 三「設計品質閘門」作為稽核標準 |
| `frontend-developer` | 實作驗證 | 對照 Section 一「Style Library」確認 CSS Variables 完整性 |

## 與 Impeccable 的關係

本層整合了 Impeccable 的 7 個 reference docs 路徑索引，
作為橋接 `.gemini/skills/frontend-design/reference/` 與 FHS 業務規則的介面。

**Impeccable（`.gemini/skills/`）= Gemini 環境設計技能**（14 skills + 7 reference docs）
**本層（`.fhs/ai/skills/ui-ux-pro-max/`）= FHS 業務規則轉譯層**

## 檔案清單

- `FHS_INTEGRATION.md`：核心整合指引（Style Library + UX Checklist + 品質閘門 + Impeccable 路徑索引）
- `vendor/SKILL.md`：來源說明與角色邊界聲明
