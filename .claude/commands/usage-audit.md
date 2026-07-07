# /fhs-usage-audit（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/usage-audit.md](/.fhs/ai/commands/usage-audit.md)

### 流程摘要（v1.0.0）：
1. **Step 1** — 跑 `node scripts/usage-audit/scan.js`，讀 `.fhs/.usage-report.json`
2. **Step 2** — 讀上次快照（`.fhs/memory/usage-audit/`），做趨勢對比
3. **Step 3** — 產出三清單：可 Skill 化清單 / 重複 Prompt 清單 / 浪費模式清單（只提方案不動手）
4. **Step 4** — 存本次聚合快照（只存數字，不存長文本）
5. **Step 5** — 完成回報

### 與 `/fhs-slim`、`/fhs-audit` 分界：
`/fhs-audit` = 架構衛生深稽核；`/fhs-slim` = 文件五病清理；`/fhs-usage-audit` = **AI 使用行為**審計（資料源是 transcript，非 repo 檔案），三者正交不重疊。
