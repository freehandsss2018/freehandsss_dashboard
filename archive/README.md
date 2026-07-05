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
