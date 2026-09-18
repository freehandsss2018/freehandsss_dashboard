# /fhs-audit（唯讀健康稽核 v3.0.0）

用途：全面檢查系統文件健康度與版本一致性——偵測衝突、孤獨檔案、過時檔案、版本漂移、語義一致性，並確認 README、repo-map 準確性與文檔生態系統一致性。**唯讀靜態、零網路**，不連生產（連生產的成本/售價/webhook 驗證見 `/fhs-check`）。

觸發指令：/fhs-audit
性質：純讀取稽核，不修改任何檔案，只輸出報告。
更新日期：2026-09-18（v3.0.0，cl-flow 2026-09-18-1827 期一：刪 9 項假防線 + 修復多項寫死值與路徑錯誤 + 實作 D3 跨檔比對——詳見版本更新日誌）

> **與 `/fhs-slim` 分界**（2026-07-05，S142 新增，未變）：本指令為重量級按需深稽核；若只需日常文件健康快檢（過肥/沉積孤兒/過時漂移/同名重複/歸檔斷鏈），
> 那五項已由 `scripts/hooks/fhs-health-check.js`（L1，每次 SessionStart 自動偵測，fail-open）+
> `/fhs-slim`（L2 清理管道）覆蓋，不必跑全套 /fhs-audit。詳見 `.fhs/ai/commands/fhs-slim.md`。
>
> **總項目數**：本指令目前共 **24 項**（A1-A7 共 7 大檢查）。此數字由本檔各檢查小節逐條加總得出，**唯一居所在本檔**——若日後增刪檢查項，只須改動小節本身，禁止在標題/摘要另外寫死總數（v2.1 曾同時流通 21/30/33 三個不一致數字，正是本次 v3.0.0 要根治嘅腐化案例之一，見版本更新日誌）。

---

## 稽核流程

### 檢查一：README & repo-map 準確性
A1-1 讀取 docs/repo-map.md，逐一確認每個列出的檔案與目錄是否實際存在
A1-2 掃描專案根目錄，確認是否有實際存在但未列入 repo-map.md 的檔案或目錄（排除 node_modules/ 與 hidden 系統檔）
A1-3 確認 scripts/README.md 存在且描述與實際腳本吻合（逐支腳本用 `grep -rl` 確認至少一處被指令/hook/其他腳本引用；零引用者標記為孤兒候選，非直接判定刪除）

### 檢查二：衝突偵測
A2-1 確認 .cursorrules 與 .fhs/ai/AGENTS.md 之間有無矛盾規則
     （重點檢查：HTML ID 保護、財務規則、部署權限）
A2-2 確認 FHS_Prompts.md 的情境四/九/十/十一 是否已為 Router 格式
     （若仍保留舊執行邏輯 = 雙源衝突）
A2-3 確認 CLAUDE.md 與 ANTIGRAVITY.md 的入口指向是否一致

### 檢查三：沉積檔案偵測
A3-1 掃描 scripts/ 與 Maintenance_Tools/，對每支腳本執行引用計數（`grep -rl "<檔名>" .fhs/ai/commands/ .claude/commands/ scripts/hooks/ Maintenance_Tools/*.md 2>/dev/null`），零引用者列入孤兒候選清單（非自動刪除，交 Fat Mo 裁決）

> 2026-09-18 v3.0.0 刪除四項純結構性掃描（原 A3-1 根目錄臨時檔、A3-3 tmp/ 掃描、A3-4 BRAIN_ROOT 殘留驗證、A3-5 lessons/ 臨時日誌）：前三項與 `/commit` Phase 0.3（`commit.md:30-31`，每次 commit 已掃 `test_*`/`fix_*`/`*_temp`/`*_draft`）及 `/fhs-slim`「沉積孤兒」快檢完全重疊；A3-3 目標 `tmp/` 目錄已不存在（純死碼）；A3-4 驗證嘅 `BRAIN_ROOT` 殘留早已為 0（一次性修復驗證長駐清單，鑑別力歸零）。詳見版本更新日誌。

### 檢查四：孤獨檔案偵測
（孤獨檔案 = 沒有被任何文件引用、也沒有被任何指令使用的檔案）
A4-1 掃描 docs/archive/pre-v1.0-backup/ 與 archive/，列出所有備份檔案，並確認每個均在 `archive/README.md` 索引表內有對應條目（缺索引 = 🟡，非缺陷但需補記）
A4-2 掃描 .fhs/ai/commands/，逐一列出每個 .md 指令檔，對照 docs/FHS_Prompts.md 確認是否有對應的情境路由條目（含觸發關鍵詞）。輸出缺失清單（如有）
     > ⚠️ 本項判準本身待確認：`docs/FHS_Prompts.md` 是否仍為指令路由唯一 SoT，抑或部分指令（如 team/usage-audit/3d-print/canva-auto）已改行 Claude Code Bridge skill 機制、與 FHS_Prompts.md 並行——若後者屬實，本項對呢類指令會產生假陽性缺口。此判準尚待 Fat Mo 裁決，2026-09-18 v3.0.0 暫維持原判準不變，缺口清單需人工過濾 Bridge 類指令。
A4-3 確認 perplexity-mcp-server/ 是否有對應文件說明其用途

### 檢查五：過時檔案偵測
A5-1 掃描 docs/，找出文件內有舊版本號（如 V1.0、V40 以前）但未標註「已歸檔」的文件，**與檢查六 A6-3 DEPRECATED 標記驗證合併處理**（同一批檔案，避免兩個檢查項各驗一半）：DEPRECATED 標記完好者跳過版本號警示，僅未標記者才報 🟡
A5-2 確認 Changelog.md 最後一條記錄日期是否在 30 天內（若超過代表未更新）
A5-3 確認 .fhs/memory/handoff.md 最後更新日期（若超過 7 天代表記憶引擎未觸發）
A5-4 掃描 .fhs/memory/handoff.md 便攜塊內狀態表（🟡/⏳ 標記列）之待辦項新鮮度，列出超過 30 天未見更新之項目——**不再查 `.fhs/notes/todo.md` 逾期天數**：該檔已自聲明 SSoT 移轉（`todo.md` 頂部「本文件僅作為長期架構規劃或低優先級技術債的停放區」），其現存項目本質為長期技術債，逾期 30 天屬設計如此，非異常
A5-5 確認穩定/開發版實體檔案存在（對照 AGENTS.md 或 handoff.md 記載之版本號，如 V41/V42）

> 2026-09-18 v3.0.0 刪除原 A5-5b（HTML 頂部註釋版本標記與 Changelog 一致性比對）：實測 V42/current.html 均無檔案層版本註釋（`grep -nE "V4[0-9]\.[0-9]+"` 首個命中僅為 CSS 調色盤註解，非版本標記），判準前提已不成立。

### 檢查六：文檔生態系統版本一致性
（新增：2026-05-16，融合文檔審核流程）

**目標**：確保所有文檔、subagent、README 與 AGENTS.md 版本對齊，達到零文檔漂移

A6-1 根目錄 & .fhs/ 層級版本同步
- 確認 README.md (root) 版本聲明
- 確認 .fhs/ai/README.md 版本聲明
- **執行時讀取 `.fhs/ai/AGENTS.md` 頂部 `> Version:` 行作為現行真理來源值**（禁止在本檔任何地方寫死具體版本號——S158 教訓：寫死 v4.8 曾令本稽核反向認證咗一份過時檔案；本次 v3.0.0 修復 A6-1/A6-2/報告模板三處同類殘留寫死值 v1.4.5，詳見版本更新日誌）
- 確認 .fhs/notes/README.md 版本聲明
- 確認功能層 README (Freehandsss_Dashboard、n8n、supabase) 版本標記

A6-2 Subagent 標準化檢查 (.fhs/ai/subagents/freehandsss/)
- **對 `.fhs/ai/subagents/freehandsss/*.md` 執行 glob 取得現行檔案清單**（禁止手寫固定清單——2026-09-18 實測目錄內為 9 個檔案，含 v2.1 版本手寫清單漏列的 `product-integration-validator.md`）
- 所有檔案必須包含 YAML frontmatter，必要字段：name、version、compatible_with、last_updated
- `compatible_with` 欄位僅記錄存在性與格式（`v\d+\.\d+\.\d+`），**暫不比對是否等於現行 AGENTS.md 版本**——2026-09-18 實測全部 9 個 subagent 之 `compatible_with` 均停留 v1.4.x/v1.5.0（現行 v1.7.2），此為長期存在嘅維護缺口而非本次範圍，比對邏輯待另案裁決後再啟用（避免本項在裁決前恆為 FAIL）

A6-3 docs/ 及 .fhs/ai/ 文件夾版本標記 (深度掃描)
- 確認關鍵文檔包含版本聲明——**只驗「frontmatter version/日期欄存在」＋「compatible_with 與 AGENTS.md 現行版本一致」，禁止在本清單寫死具體版本號**：
  - `docs/FHS_Prompts.md`
  - `.fhs/ai/FHS_Finance_Bible.md`（2026-09-18 修正：v2.1 原清單誤寫 `docs/FHS_Finance_Bible.md`，該檔實際位於 `.fhs/ai/` 下，原路徑照字面搜尋恆找不到）
  - `.fhs/ai/FHS_Legacy_Migration_Notes.md`
  - `.fhs/notes/plan_0004_supabase_cost_migration.md`
  - `docs/repo-map.md` (最新日期)
- 確認 DEPRECATED 檔案警示標記完好（已廢棄檔不驗版本，只驗標記存在，與 A5-1 合併處理）：`docs/GLOBAL_AI_SOP.md`（⛔ 廢棄標記）、`docs/FHS_Product_Bible_V3.7.md`（DEPRECATED 標記）

A6-4 自動化驗證工具運行 (Phase 4)
- **強制當次重新執行**（禁止只確認舊輸出檔存在——2026-09-18 實測 `.fhs/reports/version_manifest.json` 為 2026-07-05 舊快照，記載 AGENTS.md v1.5.0，早已過時 2 版，若只驗檔案存在即等同拿過時證據蓋章）：
  - 執行 `bash .fhs/tools/verify_repo_map.sh` → 驗證 repo-map 與實際結構一致性，期望：0 errors
    （原 `.fhs/tools/verify_repo_map.py` 為功能等價之重複實作，已於 2026-09-18 歸檔至 `archive/verify_repo_map.py.duplicate`，`.sh` 為唯一現行版本）
  - 執行 `python .fhs/tools/generate_version_manifest.py` → 重新生成版本清單 JSON，期望：無編碼錯誤
  - 驗證輸出：`.fhs/reports/version_manifest.json` 存在且 `generated_at` 為當次執行時間（非陳舊快照）

### 檢查七：語義稽核 (Semantic Audit)

**目標**：偵測語義維度（過時 / 孤立 / 衝突 / 沉餘 / 廻路），確保憲法層規則與實際架構對齊。

**前置條件**：執行 `python .fhs/tools/semantic_audit.py` 生成 `.fhs/reports/semantic_audit_candidates.json`。

A7-1 **D1 Stale 過時偵測**（純程式化）
- 讀取 `.fhs/tools/canonical_keys.yml` 內每個 key 的 source_of_truth 與 pattern
- 抽取每檔當前值 → 比對是否與真理來源一致
- 期望：`D1_canonical_values` 全部 `status: ok`，無 `no_match` 或 `missing_source`

A7-2 **D2 Orphan 孤立偵測**（程式化 + AI 仲裁）
- 從 `D2_D5_dangling_links` 抽取所有指向不存在檔案的引用
- AI 二次過濾：合法封存（archive/）vs 真孤兒
- **與檢查四分工**：A4 系列為人工列舉式孤兒檢查（archive 索引、路由條目、說明文件），本項為程式化 dangling-link 掃描（引用目標檔案是否物理存在），兩者角度不同、非重複設計，缺一均有盲區
- 期望：`dangling_links` 為空，或全部為已批准封存

A7-3 **D3 Conflict 跨檔值衝突**（2026-09-18 v3.0.0 實作；v2.1 時期此項僅有文字描述，程式碼從未讀取 `allowed_references`，屬未實作狀態，此為本次 20 宗腐化實證之一）
- 對每個 canonical key，`semantic_audit.py` 依 key 類型採不同比對策略：
  - **結構化宣告類**（如 `agents_version` 於散文語境出現）：只比對顯式標記 `<!-- canonical:agents_version=vX.Y.Z -->` 或 frontmatter `compatible_with:` 欄位，**不使用自然語言 regex 猜測語境**（2026-09-18 cl-flow Verdict 採納 A2 評審 #4：散文正則區分「斷言語境」vs「歷史語境」過於脆弱，改用顯式元數據）
  - **檔名字面常量類**（如 `production_html` 於 `scripts/*.js`／`Maintenance_Tools/*.py` 內以字串常量出現，如 `freehandsss_dashboardV41.html`）：保留字面 regex 匹配——檔名常量無語境歧義，不受上述脆弱性影響
- `allowed_references` 範圍已擴充至活躍規格檔：`.fhs/ai/commands/*.md`、`scripts/*.js`、`Maintenance_Tools/*.py`；明確排除歷史類（`decisions.md`／`Changelog.md`／`session-log.md`／`.fhs/reports/**`／`archive/**`）——歷史檔記錄舊版本號屬其職責，非漂移
- 期望：`D3_conflicts` 為空，或全部為已登記於 `.fhs/tools/check_registry.json` 之 known_exceptions

A7-4 **D4 Redundant 沉餘規則**（AI 仲裁為主）
- MVP 未自動化；由 Claude 主流程讀取 AGENTS.md / governance/*.md / decisions.md / handoff.md
- 找出同一條制度規則在兩處被當 source of truth 寫出的情況；比對基礎至少含 `.fhs/ai/governance/` 各檔既有規則編號索引，避免憑空手判
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
🔍 FHS 系統唯讀健康稽核報告
執行時間：YYYY-MM-DD HH:MM
========================================

【檢查一：README & repo-map 準確性】
A1-1 repo-map 列出的檔案全部存在    ✅ / 🔴 缺少：___
A1-2 實際存在但未列入 repo-map      ✅ / 🟡 發現：___
A1-3 scripts/README.md 描述準確     ✅ / 🟡 差異／孤兒候選：___

【檢查二：衝突偵測】
A2-1 .cursorrules vs AGENTS.md      ✅ 無衝突 / 🔴 衝突：___
A2-2 FHS_Prompts Router 格式正確    ✅ / 🔴 仍有舊邏輯：情境___
A2-3 CLAUDE.md & ANTIGRAVITY 一致   ✅ / 🟡 差異：___

【檢查三：沉積檔案】
A3-1 scripts/Maintenance_Tools 孤兒候選  ✅ 無 / 🟡 發現：___

【檢查四：孤獨檔案】
A4-1 archive/ 索引完整性            ✅ / 🟡 缺索引：___
A4-2 commands/ 全部有 FHS_Prompts 路由條目  ✅ / 🔴 缺少路由：___（已排除 Bridge 類指令，見 A4-2 判準備註）
A4-3 perplexity-mcp-server/ 有說明  ✅ / 🟡

【檢查五：過時檔案】
A5-1 docs/ 無未歸檔舊版文件         ✅ / 🟡 發現：___
A5-2 Changelog.md 30天內更新        ✅ / 🟡 最後更新：___
A5-3 handoff.md 7天內更新           ✅ / 🟡 最後更新：___
A5-4 handoff.md 待辦狀態新鮮度      ✅ / 🟡 發現___項逾30天
A5-5 指定版號之實體檔案存在        ✅ / 🔴

【檢查六：文檔生態系統版本一致性】
A6-1 根目錄 & .fhs/ 層級版本同步   ✅ / 🟡 發現___項問題
A6-2 Subagent 標準化 (9/9)         ✅ / 🔴 缺失：___
A6-3 docs/.fhs/ai/ 文件夾版本標記  ✅ / 🟡 未標記：___
A6-4 自動化驗證工具運行（當次重跑）✅ / 🔴 工具失敗：___

【檢查七：語義稽核 (Semantic Audit)】
A7-1 D1 Stale canonical 值對齊     ✅ / 🟡 漂移：___
A7-2 D2 Orphan / Dangling links    ✅ / 🟡 候選：___（需 🟣 AI 二次過濾）
A7-3 D3 Conflict 跨檔值不一致      ✅ / 🔴 衝突：___
A7-4 D4 Redundant 規則沉餘         ✅ / 🟡 候選：___（🟣 AI 仲裁）
A7-5 D5 Loops / Deprecated 命中    ✅ / 🔴 殭屍 ref：___

========================================
總計：___ / 24 項通過

🟢 架構乾淨（24/24 或僅 🟡）
🟡 輕微待整理（有 🟡 項目）— 列出建議
🔴 需要立即處理（有 🔴 項目）— 等待 Fat Mo 指示
========================================

📋 待處理清單（優先級排序）：
🔴 高優先：
（列出所有 🔴 項目與建議修復方向）

🟡 建議整理：
（列出所有 🟡 項目與建議處理方式）

📁 孤獨/孤兒檔案清單：
（列出所有建議歸檔或刪除的檔案）

📝 文檔版本狀態（檢查六新增）：
版本清單自動化驗證報告：.fhs/reports/version_manifest.json（當次重新生成，非舊快照）
真理來源版本：AGENTS.md（執行時讀取現行 `> Version:` 行，不寫死）
文檔漂移狀態：✅ 零漂移 / 🟡 輕微不同步 / 🔴 嚴重版本衝突

---

## 執行規則
- 全程只讀取，不修改任何檔案，零網路連線
- 若無法讀取某目錄，記錄為 🔴 並繼續
- 報告完成後寫入 .fhs/reports/audits/system/audit_YYYY-MM-DD.md
- 檢查六（文檔版本）支援自動化工具驗證：
  - 執行 `bash .fhs/tools/verify_repo_map.sh`
  - 執行 `python .fhs/tools/generate_version_manifest.py`
  - 驗證輸出：`.fhs/reports/version_manifest.json`
- 等待 Fat Mo 指示後才處理任何問題，不自行修復

## 版本更新日誌
- **v3.0.0**（2026-09-18，cl-flow 2026-09-18-1827 期一）：全面修復系統性腐化，20 宗實證見 `artifacts/2026-09-18-1827/a3-draft-full.md` §1.1
  - **刪除 9 項假防線**（目標不存在／永遠 PASS／與其他機制完全重疊）：A1-3（README 非空恆 PASS）、A1-5（notes/README 存在恆 PASS）、A2-3（版本重疊文件，與 fhs-slim 重疊）、A3-1（根目錄臨時檔，與 commit.md P0.3 重疊）、A3-3（tmp/ 目標不存在）、A3-4（BRAIN_ROOT 殘留恆為 0）、A3-5（lessons/ 臨時日誌，與 commit.md P0.3 重疊）、A4-2 舊項（Freehandsss_Dashboard/ 為空——前提與 repo-map.md 記載直接矛盾）、A5-5b（HTML 版本註釋，V42 無此標記格式）
  - **修復寫死值**：A6-1/A6-2/報告模板三處 AGENTS.md 版本號 v1.4.5 改為執行時動態讀取；A6-2 subagent 清單改 glob（8→9 個檔案）；A6-3 修正 `FHS_Finance_Bible.md` 路徑錯誤（`docs/` → `.fhs/ai/`）
  - **修復假驗證**：A6-4 由「確認舊輸出檔存在」改為「強制當次重跑」（原快照為 2026-07-05，記載已過時 2 版之 AGENTS.md 版本）
  - **實作 D3**：A7-3 由文字描述（程式碼從未讀取 `allowed_references`）改為真正實作，範圍擴至活躍規格檔（`.fhs/ai/commands/*.md`／`scripts/*.js`／`Maintenance_Tools/*.py`），依 A2 評審採納意見改用結構化宣告比對（散文語境）+ 字面常量比對（檔名語境）
  - **歸檔重複工具**：`.fhs/tools/verify_repo_map.py`（與 `.sh` 功能等價之重複實作）
  - **項目總數**：由三個不一致流通數字（bridge 21／模板 30／實測 33）收斂為單一居所 24 項
  - **定位調整**：由「架構衛生稽核」改為「唯讀健康稽核」，明確與 `/fhs-check`（連生產）以 blast radius 分界（cl-flow 2026-09-18-1827 決策 Q3/Q4）
- **v2.1** (2026-05-17)：新增檢查七「語義稽核 (Semantic Audit)」— 5 維深度檢測（D1 Stale / D2 Orphan / D3 Conflict / D4 Redundant / D5 Loops），補齊 v2.0 純結構稽核盲區
  - 新增輔助腳本 `.fhs/tools/semantic_audit.py`（MVP 三函式）
  - 新增配置檔 `.fhs/tools/canonical_keys.yml`（單一真理 key 清單）
  - 新增黑名單 `.fhs/tools/deprecated_terms.txt`（已廢棄詞）
  - 輸出 `.fhs/reports/semantic_audit_candidates.json` 供 fhs-audit 主流程仲裁
- **v2.0** (2026-05-16)：新增檢查六「文檔生態系統版本一致性」，融合 4 階段文檔審核流程
  - Phase 1/2：根目錄 & .fhs/ 層級版本同步
  - Phase 3：Subagent 標準化檢查
  - Phase 3.5：docs/ 文件夾深度掃描
  - Phase 4：自動化驗證工具運行
- **v1.0** (原始版本)：5 項系統衛生檢查
