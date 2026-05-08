# FHS Handoff - 2026-05-09 23:59
當前版本：v1.4.3（憲法層）/ V45.7.4（n8n）/ V40.8（UI層 / Stable Production）

## 本次 Session 完成事項（2026-05-09）

### 指令系統重構分析 + 三項執行

**問題診斷**：系統指令過多相似，subagent 無決定性觸發機制，FHS_Prompts.md 路由表靜默過期。

**Range B 執行（三層修復）**：

✅ **FHS_Prompts.md v1.3 → v1.4**
- 修正情境九：移除已廢除「每10則對話自動存檔」規則
- 新增情境十三～二十：補入 8 個缺失指令路由（/debug-guide、/tdd-guide、/five、/fhs-cost-audit、/cl-flow-fast、/db-query、/mermaid、/code-analysis）

✅ **AGENTS.md 新增兩條強制律**
- FHS_Prompts.md 路由同步強制律：凡新增/刪除指令必須同步更新路由表
- Subagent 決定性路由規則（8條）：條件成立 → 必須調用 subagent，不再依賴軟性「proactively」

✅ **fhs-audit.md A4-3 強化**：從「確認是否被引用」改為「逐一對照 FHS_Prompts.md 輸出缺失清單」

✅ **todo.md 清理**：關閉 V37/V39 過期條目

**Subagent Skills 連接**：

✅ `build-error-resolver` → 強制載入 `systematic-debugging.md`（Iron Law）
✅ `tdd-guide` → 強制載入 `test-driven-development.md`
✅ `database-reviewer` → 強制載入 `read-only-postgres.md` + `supabase-query.md`

**Range A（/auto meta-skill）**：評估後取消。FHS_Prompts.md v1.4 已在更根本層面解決路由問題，/auto 為多餘步驟。

## 待辦 ⏳ 項目

1. **[P-HIGH] finance-auditor**: 建立 FHS 專屬財務稽核 Subagent（基於 Python/Logic Validation），自動化 V40.8 財務對帳。
2. **[P-HIGH] Supabase 遷移準備**: `read-only-postgres` skill 已就緒，需完成 connections.json 設定並執行數據驗證實驗。
3. **[P-MED] iPhone 實機測試 — V40 財務模式**
4. **[P-LOW] 定期執行 /fhs-audit 確保衛生狀態**
5. **[P-LOW] parry hook**: Rust/Cargo 安裝後，配置 PreToolUse prompt injection 防護（Airtable 寫入前）

## 核心配置

| 項目 | 現況 |
|------|------|
| 憲法層 | `AGENTS.md` v1.4.3（含 Subagent 決定性路由規則 + FHS_Prompts 同步強制律） |
| 路由總機 | `docs/FHS_Prompts.md` v1.4（20 個情境，覆蓋所有現有指令） |
| 稼動生產版 | `Freehandsss_dashboard_current.html` |
| 主要開發版 | `freehandsss_dashboardV40.html`（V40.8）|
| n8n Workflow | V45.7.4（24 nodes）|
| Airtable Base | `app9GuLsW9frN4xaT` |
| 報告中心 | `.fhs/reports/`（統一） |
| Subagents | 7 個 FHS 專屬（含 Skills 連接） + 通用 Explore/Plan/general-purpose |
