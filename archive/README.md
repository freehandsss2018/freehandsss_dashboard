# archive/ — 專案層級舊版備份與歸檔政策

本目錄存放已停用但保留作歷史參考的檔案，不再參與現行系統運作。

## 歸檔原則

- 只搬移（`git mv`），不刪除——保留 git 歷史與可回溯性
- 搬入時若原路徑被其他文件引用，**不回頭修改歷史文件**（session-log/completion report/Changelog 屬時間快照，保留原路徑描述是正確行為，不是斷鏈）
- 大型二進位備份（如 `.zip`）一律 `.gitignore`，只保留 checksum（`.sha256.txt`）供驗證

## 目錄內容

| 檔案/資料夾 | 說明 |
|---|---|
| `freehandsss_dashboardV31.html` ~ `V35.html` | 早期 Dashboard 版本存檔 |
| `freehandsss_financial_overview.html.deprecated` | 已停用的獨立財務總覽頁（功能併入 Dashboard 內嵌模式） |
| `v33_original_script.js` | V33 原始腳本（歷史參考） |
| `v39-aom.md` | 已廢棄的 V39 AOM 指令（原 `.fhs/ai/commands/`） |
| `test_audit_0695346.py` | 訂單審計一次性測試腳本（封存） |
| `n8n_scripts/` | n8n workflow 建立腳本歷史版本 |
| `antigravity-backup-20260703.zip`（gitignored，僅 `.sha256.txt` 入版控） | Antigravity 全量安全快照（Phase 0.1，2026-07-03） |
| `scripts-scratch-2026-07/` | `/fhs-audit` 2026-07-05（S145）歸檔：46 個一次性除錯/驗證腳本（原 `scripts/` 根目錄，2026-05-22~06-03 建立，逾一個月無更新且未列入 `scripts/README.md`），詳見 `.fhs/reports/audits/system/audit_2026-07-05.md` |
| `fhs-cost-audit.md` / `fhs-cost-audit-bridge.md` | 2026-09-18 廢除：純 Airtable 資料源，公式與實作脫節，建基於 D37 已判定語意不可靠的 `Item_BaseCost`。功能重寫落 Supabase，併入 `/fhs-check` COST_INTEGRITY phase，見 cl-flow 2026-09-18-1827 |
| `audit_total_cost_integrity.py` | 同上，`/fhs-cost-audit` 舊實作腳本，由 `Maintenance_Tools/audit_cost_integrity.py` 取代 |
| `analyze_empty_prices.py` / `final_audit_check_v2.py` | 2026-09-18 歸檔：零引用孤兒（`Maintenance_Tools/`），research-path3 盤點確認全 repo 零命中 |
| `update_profit_auditor.py` | 2026-09-18 歸檔：零引用孤兒，且性質為一次性遷移腳本（會覆寫 `n8n/FHS_Core_OrderProcessor.json` Profit Auditor 節點為硬編碼 V45.8），留在 `Maintenance_Tools/` 屬地雷，不適合繼續存在於工具目錄 |
| `viewport-check.html` / `viewport-check2.html` | 2026-09-18 歸檔：2026-08-29（D69續八-follow-2）一次性 viewport 診斷頁，假設已被推翻定案，零引用 |
| `test_full_reconstruction.js` | 2026-09-18 歸檔：內建已不存在的 V40 比較分支（執行必 fatal），零呼叫方；斷言 4 支同批姊妹腳本已收編入期二前端唯讀層工作範圍（cl-flow 2026-09-18-1827） |
| `verify_repo_map.py.duplicate` | 2026-09-18 歸檔：`verify_repo_map.sh` 之功能等價 Python 重複實作，`.sh` 為 `/fhs-audit` A6-4 現行版本 |
