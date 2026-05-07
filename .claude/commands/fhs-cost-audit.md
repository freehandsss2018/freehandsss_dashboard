# /fhs-cost-audit (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/fhs-cost-audit.md](/.fhs/ai/commands/fhs-cost-audit.md)

### 簡化流程：
1. 確認 `AIRTABLE_API_KEY` 環境變數已設定
2. 執行 `python Maintenance_Tools/audit_total_cost_integrity.py`
3. 輸出報告至 `.fhs/notes/aireports/total_cost_audit_YYYY-MM-DD.md`
4. 若有 CRITICAL 項目，回報 Fat Mo 等待處理授權
