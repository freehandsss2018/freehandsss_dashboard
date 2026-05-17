# /fhs-audit（系統架構衛生稽核 v2.1）

用途：全面檢查系統文件健康度，偵測衝突、沉積、孤獨檔案、過時檔案、版本漂移、語義一致性，並確認 README、repo-map 準確性與文檔生態系統一致性。

觸發指令：/fhs-audit
性質：純讀取稽核，不修改任何檔案，只輸出報告。
更新日期：2026-05-17（新增檢查七：語義稽核 — D1-D5 五維深度檢測）

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
A4-3 掃描 .fhs/ai/commands/，逐一列出每個 .md 指令檔，對照 docs/FHS_Prompts.md 確認是否有對應的情境路由條目（含觸發關鍵詞）。輸出缺失清單（如有）
A4-4 確認 perplexity-mcp-server/ 是否有對應文件說明其用途

### 檢查五：過時檔案偵測
A5-1 掃描 docs/，找出文件內有舊版本號（如 V1.0、V40 以前）但未標註「已歸檔」的文件
A5-2 確認 Changelog.md 最後一條記錄日期是否在 30 天內（若超過代表未更新）
A5-3 確認 .fhs/memory/handoff.md 最後更新日期（若超過 7 天代表記憶引擎未觸發）
A5-4 掃描 .fhs/notes/todo.md，列出所有超過 30 天未處理的待辦事項
A5-5a 確認穩定/開發版實體檔案存在（對照 AGENTS.md 或 handoff.md 記載之版本號，如 V41/V42）
A5-5b 確認 Changelog.md 最新版本號與該開發版 HTML 內部頂部註釋的版本標記一致

### 檢查六：文檔生態系統版本一致性
（新增：2026-05-16，融合文檔審核流程）

**目標**：確保所有文檔、subagent、README 與 AGENTS.md 版本對齊，達到零文檔漂移

A6-1 根目錄 & .fhs/ 層級版本同步
- 確認 README.md (root) 版本聲明
- 確認 .fhs/ai/README.md 版本聲明
- 確認 .fhs/ai/AGENTS.md = 真理來源 (v1.4.5)
- 確認 .fhs/notes/README.md 版本聲明
- 確認功能層 README (Freehandsss_Dashboard、n8n、supabase) 版本標記

A6-2 Subagent 標準化檢查 (.fhs/ai/subagents/freehandsss/)
- 所有 8 個 subagent 檔案必須包含 YAML frontmatter
- 必要字段：name、version、compatible_with、last_updated
- compatible_with 必須指向當前 AGENTS.md 版本 (v1.4.5)
- 檢查檔案清單：
  - blender-3d-modeler.md (v2.0.0)
  - build-error-resolver.md (v1.0.0)
  - code-reviewer.md (v1.1.0)
  - database-reviewer.md (v2.1.0)
  - finance-auditor.md (v2.0.0)
  - frontend-developer.md (v1.1.0)
  - tdd-guide.md (v1.0.0)
  - ui-designer.md (v2.0.0)

A6-3 docs/ 文件夾版本標記 (深度掃描)
- 確認關鍵文檔包含版本聲明：
  - FHS_Blueprint.md (v4.8)
  - FHS_Product_Bible_V3.7.md (v3.7)
  - FHS_Prompts.md (v1.5)
  - FHS_Finance_Bible.md
  - FHS_Legacy_Migration_Notes.md (v1.0)
  - plan_0004_supabase_cost_migration.md (v1.0)
  - CHANGELOG.md (v1.0)
  - repo-map.md (最新日期)
- 確認 GLOBAL_AI_SOP.md 正確標記為過時 (⛔ 廢棄標記)

A6-4 自動化驗證工具運行 (Phase 4)
- 執行 verify_repo_map.sh → 驗證 repo-map 與實際結構一致性
  期望：0 errors, 0 warnings
- 執行 generate_version_manifest.py → 生成版本清單 JSON
  期望：12 個文件追蹤成功，無編碼錯誤
- 驗證輸出：.fhs/reports/version_manifest.json 存在且有效

### 檢查七：語義稽核 (Semantic Audit) — v2.1 新增

（2026-05-17 新增：填補 v2.0 純結構稽核未能偵測「語義漂移」的盲區）

**目標**：偵測 5 個語義維度（過時 / 孤立 / 衝突 / 沉餘 / 廻路），確保憲法層規則與實際架構對齊。

**前置條件**：執行 `python .fhs/tools/semantic_audit.py` 生成 `.fhs/reports/semantic_audit_candidates.json`。

A7-1 **D1 Stale 過時偵測**（純程式化）
- 讀取 `.fhs/tools/canonical_keys.yml` 內每個 key 的 source_of_truth 與 pattern
- 抽取每檔當前值 → 比對是否與真理來源一致
- 期望：`canonical_values` 全部 `status: ok`，無 `no_match` 或 `missing_source`

A7-2 **D2 Orphan 孤立偵測**（程式化 + AI 仲裁）
- 從 `D2_D5_dangling_links` 抽取所有指向不存在檔案的引用
- AI 二次過濾：合法封存（archive/）vs 真孤兒
- 期望：`dangling_links` 為空，或全部為已批准封存

A7-3 **D3 Conflict 跨檔值衝突**（純程式化）
- 對每個 canonical key，掃描 allowed_references 內各檔的對應值
- 不一致即報告差異（如 SOP_NOW 寫 v1.4.5 但 AGENTS 寫 v1.4.6）
- 期望：所有 allowed_references 與 source_of_truth 值對齊

A7-4 **D4 Redundant 沉餘規則**（AI 仲裁為主）
- MVP 未自動化；由 Claude 主流程讀取 AGENTS.md / SOP_NOW.md / decisions.md / handoff.md
- 找出同一條制度規則在兩處被當 source of truth 寫出的情況
- 期望：每條規則只在一處有「定義性」表述，其他處引用而非重定義

A7-5 **D5 Loops 廻路 / Dangling / 殭屍 reference**（純程式化）
- 從 `D5_cycles` 偵測命令／文件循環引用（A→B→A）
- 從 `D5_deprecated_term_hits` 偵測黑名單命中（`.fhs/tools/deprecated_terms.txt`）
- 期望：`cycles` 為空；`deprecated_term_hits` 為空（命中視為殭屍 reference）

**Check 7 通過標準**：A7-1 ~ A7-5 全綠（或 🟣 標示「需 LLM 二次審查」項已由 Claude 主流程處理）。
**降級規則**：若 `.fhs/tools/semantic_audit.py` 執行失敗，Check 7 標記為 🔴 並暫停剩餘檢查，提示 Fat Mo 修腳本。

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
A4-3 commands/ 全部有 FHS_Prompts 路由條目  ✅ / 🔴 缺少路由：___
A4-4 perplexity-mcp-server/ 有說明  ✅ / 🟡

【檢查五：過時檔案】
A5-1 docs/ 無未歸檔舊版文件         ✅ / 🟡 發現：___
A5-2 Changelog.md 30天內更新        ✅ / 🟡 最後更新：___
A5-3 handoff.md 7天內更新           ✅ / 🟡 最後更新：___
A5-4 todo.md 逾期待辦               ✅ 無 / 🟡 發現___項
A5-5a 指定版號之實體檔案存在        ✅ / 🔴
A5-5b 頂部註釋與 Changelog 一致     ✅ / 🟡 差異：___

【檢查六：文檔生態系統版本一致性】
A6-1 根目錄 & .fhs/ 層級版本同步   ✅ / 🟡 發現___項問題
A6-2 Subagent 標準化 (8/8)         ✅ / 🔴 缺失：___
A6-3 docs/ 文件夾版本標記          ✅ / 🟡 未標記：___
A6-4 自動化驗證工具運行            ✅ / 🔴 工具失敗：___

【檢查七：語義稽核 (Semantic Audit)】
A7-1 D1 Stale canonical 值對齊     ✅ / 🟡 漂移：___
A7-2 D2 Orphan / Dangling links    ✅ / 🟡 候選：___（需 🟣 AI 二次過濾）
A7-3 D3 Conflict 跨檔值不一致      ✅ / 🔴 衝突：___
A7-4 D4 Redundant 規則沉餘         ✅ / 🟡 候選：___（🟣 AI 仲裁）
A7-5 D5 Loops / Deprecated 命中    ✅ / 🔴 殭屍 ref：___

========================================
總計：___ / 30 項通過

🟢 架構乾淨（25/25 或僅 🟡）
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

📝 文檔版本狀態（檢查六新增）：
版本清單自動化驗證報告：.fhs/reports/version_manifest.json
真理來源版本：AGENTS.md v1.4.5
文檔漂移狀態：✅ 零漂移 / 🟡 輕微不同步 / 🔴 嚴重版本冲突

---

## 執行規則
- 全程只讀取，不修改任何檔案
- 若無法讀取某目錄，記錄為 🔴 並繼續
- 報告完成後寫入 .fhs/reports/audits/system/audit_YYYY-MM-DD.md
- 檢查六（文檔版本）支援自動化工具驗證：
  - 執行 `bash .fhs/tools/verify_repo_map.sh`
  - 執行 `python .fhs/tools/generate_version_manifest.py`
  - 驗證輸出：`.fhs/reports/version_manifest.json`
- 等待 Fat Mo 指示後才處理任何問題，不自行修復

## 版本更新日誌
- **v2.1** (2026-05-17)：新增檢查七「語義稽核 (Semantic Audit)」— 5 維深度檢測（D1 Stale / D2 Orphan / D3 Conflict / D4 Redundant / D5 Loops），補齊 v2.0 純結構稽核盲區
  - 新增輔助腳本 `.fhs/tools/semantic_audit.py`（MVP 三函式）
  - 新增配置檔 `.fhs/tools/canonical_keys.yml`（單一真理 key 清單）
  - 新增黑名單 `.fhs/tools/deprecated_terms.txt`（已廢棄詞）
  - 輸出 `.fhs/reports/semantic_audit_candidates.json` 供 fhs-audit 主流程仲裁
  - 總分由 25 → 30
- **v2.0** (2026-05-16)：新增檢查六「文檔生態系統版本一致性」，融合 4 階段文檔審核流程
  - Phase 1/2：根目錄 & .fhs/ 層級版本同步
  - Phase 3：Subagent 標準化檢查
  - Phase 3.5：docs/ 文件夾深度掃描
  - Phase 4：自動化驗證工具運行
- **v1.0** (原始版本)：5 項系統衛生檢查
