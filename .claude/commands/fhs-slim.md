# /fhs-slim（Claude Code Bridge）

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/fhs-slim.md](/.fhs/ai/commands/fhs-slim.md)

### 流程摘要（v1.0.0）：
1. **Step 1** — 讀取 `.fhs/.health-report.json`（L1 健康檢查報告），無 issue 則結束
2. **Step 2** — 逐項核實現況＋出清理方案（壓縮索引 / 歸檔 / 安全刪除 / 修正漂移 / 去重）
3. **Step 3** — 停等 Fat Mo 批准（Y / 排除特定項 / 取消）
4. **Step 4** — 執行（S141 紀律：備份→只歸檔不刪→每步一commit→視範圍派fresh-context核對）
5. **Step 5** — 完成回報 + 後效同步稽核

### 與 `/fhs-audit` 分界：
`/fhs-audit` = 30 項架構衛生深稽核（含語義層，重、按需）
`/fhs-slim` = 5 種文件病快檢清理管道（輕、L1 hook 每 session 自動觸發偵測）
