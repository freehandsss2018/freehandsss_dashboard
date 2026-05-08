# debug-guide — 系統化除錯指南

> **Master 定義**。橋接版位於 `.claude/commands/debug-guide.md`。

**技能來源**：`.fhs/ai/skills/vendor/superpowers/systematic-debugging.md`

---

## 用途

四階段系統化除錯。任何 bug、測試失敗、n8n 異常，必須先完成根因調查，禁止直接猜測修復。

## 執行步驟

收到 `/debug-guide` 後，立即讀取並嚴格遵循：
[.fhs/ai/skills/vendor/superpowers/systematic-debugging.md](.fhs/ai/skills/vendor/superpowers/systematic-debugging.md)

## 使用場景

- n8n Workflow 執行失敗
- Airtable 數據異常（成本/利潤計算錯誤）
- Maintenance_Tools 腳本錯誤
- Dashboard JS 異常
- 任何「改了 A，壞了 B」的連鎖問題

## 四階段快速導覽

1. **Root Cause** — 讀錯誤訊息、重現問題、查 git diff、在多層系統中逐層收集證據
2. **Pattern Analysis** — 找到可運行的相似代碼，逐一比較差異
3. **Hypothesis** — 形成單一假設，用最小改動測試
4. **Implementation** — 先寫測試，修根因而非症狀；若 3 次仍失敗→停下來質疑架構

> ⚠️ **Iron Law**：未完成 Phase 1，禁止提出任何修復方案。
