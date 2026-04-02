# Completion Report: True 1-Click /cl-flow Coordinator

**Date**: 2026-04-02
**Task Slug**: cl-flow-coordinator
**Version**: v2.1.0
**Status**: COMPLETED

---

## 任務概要

實作真正的一鍵 `/cl-flow` 協調器，消除過去需手動依序觸發 `/px` 與 `/ag` 的人為中斷。

---

## 完成項目

### [NEW] `scripts/cl-flow-runner.js`
- 核心調度腳本
- 並行調用 Perplexity API（sonar-reasoning-pro）+ Gemini API（gemini-2.0-flash）
- `Promise.all` 確保雙報告落盤後才繼續
- Retry 機制（最多 3 次，指數退避）
- Timeout 保護（PX 60s，Gemini 90s）
- repomix 上下文注入（含 fallback）
- `fs.writeFile('utf8')` 安全寫入（Option B 方案，Fat Mo 裁決）
- 環境變數啟動前檢查（缺 key 即阻斷）
- stdout 輸出 `FLOW_ID=xxx` 供 Claude 讀取

### [MODIFY] `.fhs/ai/commands/cl-flow.md` → v2.1.0
- 從「直接讀 a1/a2」改為「執行 runner → 讀 artifact → 審閱 → 輸出 cl-final-plan.md」
- 新增 Deterministic Gate（artifact 缺失即阻擋）
- 強制引述真實 artifact 內容（非模擬）
- 輸出路徑改為 `artifacts/{flow_id}/`
- 新增 state.json 狀態更新步驟

### [MODIFY] `.fhs/ai/commands/execute.md`
- 新增 `/cl-flow` 後續執行路徑：讀取 `artifacts/{flow_id}/cl-final-plan.md`
- 驗證 `execution_status: locked` + Verdict `APPROVED_READY`
- 保留舊版 a3_execution_verdict.md 路徑作 fallback

### [MODIFY] `.gitignore`
- 新增 `artifacts/` 排除（runtime 產物，不版控）

### [MODIFY] `.env`
- 新增 `PERPLEXITY_API_KEY` + `GEMINI_API_KEY` placeholder（待 Fat Mo 填入真實值）

### [MODIFY] `scripts/README.md`
- 新增 `cl-flow-runner.js` 說明及使用方式

### [MODIFY] `docs/repo-map.md`
- 新增 `scripts/cl-flow-runner.js` 條目
- 新增 `artifacts/` 目錄結構說明

---

## 關鍵設計決策

| 決策 | 選項 | 理由 |
|------|------|------|
| 檔案寫入方案 | Option B: `fs.writeFile('utf8')` | Fat Mo 裁決：單一 Node.js 檔案，無額外依賴，CJK 安全 |
| AG 模型 | Gemini 2.0 Flash | 已有 GEMINI_API_KEY 環境，成本低，速度快 |
| 並行策略 | `Promise.all` | 最大化速度，兩份報告同時生成 |
| artifacts/ 版控 | .gitignore 排除 | Runtime 產物，不適合版控，審計由 handoff.md 負責 |

---

## 待辦（Fat Mo 需手動完成）

- [ ] 在 `.env` 填入真實 `PERPLEXITY_API_KEY`
- [ ] 在 `.env` 填入真實 `GEMINI_API_KEY`
- [ ] 測試：`node scripts/cl-flow-runner.js "測試任務"`

---

## 後效同步稽核

- **[A] 結構變動**：已更新 `docs/repo-map.md` + `scripts/README.md` ✅
- **[B] 制度層變動**：已產出本 completion_report ✅（修改了 cl-flow.md, execute.md）
- **[C] CHANGELOG**：cl-flow 行為語義重大變更，需更新 CHANGELOG.md（見 handoff.md 待辦）
