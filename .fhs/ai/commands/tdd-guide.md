# tdd-guide — TDD 強制執行指南

> **Master 定義**。橋接版位於 `.claude/commands/tdd-guide.md`。

**技能來源**：`.fhs/ai/skills/vendor/superpowers/test-driven-development.md`

---

## 用途

強制執行 TDD RED-GREEN-REFACTOR 循環。任何新功能、Bug 修復、重構，必須先寫出失敗測試，才能寫實作代碼。

## 執行步驟

收到 `/tdd-guide` 後，立即讀取並嚴格遵循：
[.fhs/ai/skills/vendor/superpowers/test-driven-development.md](.fhs/ai/skills/vendor/superpowers/test-driven-development.md)

## 使用場景

- 寫新功能前
- 修 Bug 前（搭配 `/debug-guide` 找到根因後）
- 修改 Maintenance_Tools 腳本
- n8n Code Node 邏輯驗證

## 快速提示

1. **RED** — 寫一個針對目標行為的最小失敗測試，確認它失敗且理由正確
2. **GREEN** — 寫最少的代碼讓測試通過
3. **REFACTOR** — 清理代碼，確認測試仍通過

> ⚠️ **Iron Law**：沒有先看到測試失敗，就不知道測試是否真的在測正確的東西。
