# Maintenance_Tools/ — 系統健康檢查

## 快速執行

```bash
python run_all.py
```

執行順序：環境前置檢查 → LIFECYCLE → STRESS → ACCEPTANCE → COST_INTEGRITY → PRICE_AUDIT

等同於 `/fhs-check` 指令。建議在每次重大修改結案前執行一次。

## 檔案

| 檔案 | 用途 |
|---|---|
| `run_all.py` | 統一入口，依序執行下列子腳本，輸出 Health Report |
| `FHS_Full_System_Test.py` | LIFECYCLE：全週期測試（Create → Update → Delete） |
| `FHS_System_StressTester.py` | STRESS：多情境 webhook 壓力測試 |
| `FHS_Comprehensive_Test.py` | ACCEPTANCE：結案驗收測試 |
| `audit_cost_integrity.py` | COST_INTEGRITY：訂單成本一致性稽核（讀 Supabase，2026-09-18 起取代已廢除的 `/fhs-cost-audit`） |
| `audit_price_completeness.py` | PRICE_AUDIT：Supabase products.suggested_price 空白售價稽核（2026-09-18 起改讀 Supabase，取代原 Airtable 實作） |

例外登記：`.fhs/tools/check_registry.json`（SKIP/已知違規三態語義，見 `run_all.py` 頂部註解）。
