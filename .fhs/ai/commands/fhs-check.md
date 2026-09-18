# /fhs-check

**用途 (Purpose)**：執行全系統健康檢查（連生產：webhook 生命週期/壓力/驗收 + 訂單成本一致性 + 產品售價完整性）。與 `/fhs-audit`（唯讀、零網路）以 blast radius 分界，見 `.fhs/ai/AGENTS.md` 路由表。
**版本**：v2.0.0 (2026-09-18，cl-flow 2026-09-18-1827 期一：移除從未真正實作嘅 LOCAL_AUDIT 階段、新增真環境前置檢查、COST_INTEGRITY／PRICE_AUDIT 改讀 Supabase、SKIP 改登記冊三態語義)

**執行階段 (Phases)**：

1. **Phase 1: 環境前置檢查** - 驗證 `SUPABASE_URL` / `SUPABASE_ANON_KEY` 已設定；缺一即全部停止，唔進入任何子腳本（2026-09-18 起為真實作，非僅描述——舊版此階段從未落地，令下方子腳本各自靜默跳過驗證而不自知，見 `artifacts/2026-09-18-1827/a3-draft-full.md` E3/E4）。
2. **Phase 2: 生命週期測試** - 執行 `LIFECYCLE`（`FHS_Full_System_Test.py`：建立 → 更新 → 刪除流程測試）。
3. **Phase 3: 壓力與驗收測試** - 執行 `STRESS`（`FHS_System_StressTester.py`）及 `ACCEPTANCE`（`FHS_Comprehensive_Test.py`），模擬高負載情境。
4. **Phase 4: 財務稽核** - 執行 `COST_INTEGRITY`（`audit_cost_integrity.py`：Finance Bible §九 驗證1/2/4後半 + drift RPC，讀 Supabase，取代已廢除嘅 `/fhs-cost-audit`）及 `PRICE_AUDIT`（`audit_price_completeness.py`：Supabase `products.suggested_price` 空白售價稽核，取代原 Airtable 實作）。
5. **Phase 5: 結案報告** - 輸出 Health Report 並將 Red Flags 記錄至 `.fhs/notes/session-log.md`。

**執行規範 (Execution Standards)**：

- **測試數據命名**：所有測驗建立的訂單，其 **Order ID 均必須以 `test` + 數字作為開端** (例如: `test1`, `test1024`)。
- **數據清理任務**：測試內容完成後，**必須將所有測試產生的數據完全刪除**，始可標記為測試成功。
- **健康標準**：必須無任何 Red Flags（FAIL）或 DEGRADED；已登記且未過期嘅 WARN（`.fhs/tools/check_registry.json`，附到期日）不視為違反健康標準，但 Health Report 一定會顯示，回報時須一併提及並留意到期日——未登記或已過期嘅 SKIP 一律視為 FAIL（2026-09-18 起，取代舊版「SKIP 一律不阻斷」語義，該語義正是 LOCAL_AUDIT 靜默失效 5 個月而不自知的根因）。

**前置條件 (Precondition)**：

- A3 GO 任務準備結案前，或由管理員手動呼叫。
- 已讀取 `/.fhs/ai/AGENTS.md` 並確認版本號。

**行為預期 (Expected Behavior)**：

1. 執行：`python Maintenance_Tools/run_all.py`
2. 依序完成上述五個階段。
3. 若發現異常，立即停止並回報失敗階段與錯誤訊息。

**異常處理 (Fallback)**：

- 若 `run_all.py` 不存在：回報「未找到 run_all.py」，停止執行。
- 若環境前置檢查未通過：立即停止，回報缺少的環境變數，不進入任何子腳本。
- 若任何階段失敗：立即截圖或記錄錯誤，等待人工指示。
