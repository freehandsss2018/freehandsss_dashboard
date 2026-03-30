# /fhs-audit（系統架構衛生稽核）

用途：全面檢查系統文件健康度，偵測衝突、沉積、孤獨檔案、過時檔案，並確認 README 與 repo-map 準確性。

觸發指令：/fhs-audit
性質：純讀取稽核，不修改任何檔案，只輸出報告。

---

## 稽核流程

### 檢查一：README & repo-map 準確性
A1-1 讀取 docs/repo-map.md，逐一確認每個列出的檔案與目錄是否實際存在
A1-2 掃描專案根目錄，確認是否有實際存在但未列入 repo-map.md 的檔案或目錄（排除 node_modules/ 與 hidden 系統檔）
A1-3 確認 README.md 存在且不為空
A1-4 確認 scripts/README.md 存在且描述與實際腳本吻合
A1-5 確認 .fhs/notes/README.md 存在

### 檢查二：衝突偵測
A2-1 確認 .cursorrules 與 .fhs/ai/AGENTS.md 之間有無矛盾規則
     （重點檢查：HTML ID 保護、財務規則、部署權限）
A2-2 確認 FHS_Prompts.md 的情境四/九/十/十一 是否已為 Router 格式
     （若仍保留舊執行邏輯 = 雙源衝突）
A2-3 確認 docs/ 下是否有兩份版本號不同但內容重疊的文件
A2-4 確認 CLAUDE.md 與 ANTIGRAVITY.md 的入口指向是否一致

### 檢查三：沉積檔案偵測
A3-1 掃描根目錄，偵測任何非系統定義的 .js / .py / .html 臨時測試檔案
A3-2 掃描 scripts/，確認所有腳本是否仍有實際用途（對照 scripts/README.md）
A3-3 掃描 tmp/，列出所有檔案（tmp/ 應為空或僅有臨時內容）
A3-4 確認 Sync_Notion_Brain.js 內已無 BRAIN_ROOT 變數（沉積代碼）
A3-5 掃描 .fhs/memory/lessons/，列出檔名含 _temp 或 _draft 的臨時日誌

### 檢查四：孤獨檔案偵測
（孤獨檔案 = 沒有被任何文件引用、也沒有被任何指令使用的檔案）
A4-1 掃描 docs/archive/pre-v1.0-backup/，列出所有仍存在的備份檔案
A4-2 確認 Freehandsss_Dashboard/ 資料夾是否仍為空（repo-map 標註為空）
A4-3 掃描 .fhs/ai/commands/，確認每個 .md 是否都被 FHS_Prompts.md 或 .fhs/ai/AGENTS.md 引用
A4-4 確認 perplexity-mcp-server/ 是否有對應文件說明其用途

### 檢查五：過時檔案偵測
A5-1 掃描 docs/，找出文件內有舊版本號（如 V1.0、V40 以前）但未標註「已歸檔」的文件
A5-2 確認 Changelog.md 最後一條記錄日期是否在 30 天內（若超過代表未更新）
A5-3 確認 .fhs/memory/handoff.md 最後更新日期（若超過 7 天代表記憶引擎未觸發）
A5-4 掃描 .fhs/notes/todo.md，列出所有超過 30 天未處理的待辦事項
A5-5a 確認開發版實體檔案存在：freehandsss_dashboardV36.html
A5-5b 確認 Changelog.md 最新版本號與 freehandsss_dashboardV36.html 內部頂部註釋的版本標記一致

---

## 輸出報告格式

執行完畢後，輸出以下格式：

========================================
🔍 FHS 系統架構衛生稽核報告
執行時間：YYYY-MM-DD HH:MM
========================================

【檢查一：README & repo-map 準確性】
A1-1 repo-map 列出的檔案全部存在    ✅ / 🔴 缺少：___
A1-2 實際存在但未列入 repo-map      ✅ / 🟡 發現：___
A1-3 README.md 存在且不為空         ✅ / 🔴
A1-4 scripts/README.md 描述準確     ✅ / 🟡 差異：___
A1-5 .fhs/notes/README.md 存在      ✅ / 🔴

【檢查二：衝突偵測】
A2-1 .cursorrules vs AGENTS.md      ✅ 無衝突 / 🔴 衝突：___
A2-2 FHS_Prompts Router 格式正確    ✅ / 🔴 仍有舊邏輯：情境___
A2-3 docs/ 無重疊版本文件           ✅ / 🟡 發現：___
A2-4 CLAUDE.md & ANTIGRAVITY 一致   ✅ / 🟡 差異：___

【檢查三：沉積檔案】
A3-1 根目錄無臨時測試檔案           ✅ / 🟡 發現：___
A3-2 scripts/ 腳本全有用途          ✅ / 🟡 無用途：___
A3-3 tmp/ 狀態                      ✅ 為空 / 🟡 內容：___
A3-4 BRAIN_ROOT 已清除              ✅ / 🔴
A3-5 lessons/ 臨時日誌              ✅ 無 / 🟡 發現：___

【檢查四：孤獨檔案】
A4-1 archive/pre-v1.0-backup/ 內容  列出：___
A4-2 Freehandsss_Dashboard/ 為空    ✅ / 🟡 發現內容：___
A4-3 commands/ 全部被引用           ✅ / 🟡 孤獨：___
A4-4 perplexity-mcp-server/ 有說明  ✅ / 🟡

【檢查五：過時檔案】
A5-1 docs/ 無未歸檔舊版文件         ✅ / 🟡 發現：___
A5-2 Changelog.md 30天內更新        ✅ / 🟡 最後更新：___
A5-3 handoff.md 7天內更新           ✅ / 🟡 最後更新：___
A5-4 todo.md 逾期待辦               ✅ 無 / 🟡 發現___項
A5-5a 開發版實體檔案存在            ✅ / 🔴
A5-5b 頂部註釋與 Changelog 一致     ✅ / 🟡 差異：___

========================================
總計：___ / 21 項通過

🟢 架構乾淨（21/21 或僅 🟡）
🟡 輕微待整理（有 🟡 項目）— 列出建議
🔴 需要立即處理（有 🔴 項目）— 等待 Fat Mo 指示
========================================

📋 待處理清單（優先級排序）：
🔴 高優先：
（列出所有 🔴 項目與建議修復方向）

🟡 建議整理：
（列出所有 🟡 項目與建議處理方式）

📁 孤獨檔案清單：
（列出所有建議歸檔或刪除的檔案）

---

## 執行規則
- 全程只讀取，不修改任何檔案
- 若無法讀取某目錄，記錄為 🔴 並繼續
- 報告完成後寫入 .fhs/notes/ai_reports/audit_YYYY-MM-DD.md
- 等待 Fat Mo 指示後才處理任何問題，不自行修復
