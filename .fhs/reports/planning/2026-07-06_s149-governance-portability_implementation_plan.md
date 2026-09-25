# S149 治理系統可攜化實施計畫（Governance Portability Implementation Plan）

> **規劃**：Fable 5（S149，2026-07-06，純規劃 session，零生產代碼改動）
> **方法論**：八維度架構分析 → 實施計畫草案 v1 → 自我批評（3 弱點）→ v2 定稿（S148 慣例）
> **執行**：Sonnet 5（≥2026-07-07，且必須在 S148 迴圈硬化計畫全部 4 Phase 完成之後）
> **目標**：把 Fat Mo 長期沉積的 AI 工作流治理資產（rules / SOP / skills / roles / 多模型調度 / hooks 守護）做成可攜模板，日後任何非 Dashboard 新專案可完整繼承；原生支援 Claude Desktop App（主打）、VS Code ext / CLI、Antigravity（備援）、手機 App 多平台接入。
> **狀態**：🟢 待執行（v2 定稿 2026-07-06；**§5 v3.1 修訂 2026-07-12 已入檔，執行以「v2＋§5 覆寫」為準**；S148 前置閘已滿足）

---

## §0 環境與設備盤點（本 session 實測，2026-07-06）

### 平台矩陣

| 平台 | 接入機制 | 治理覆蓋 |
|---|---|---|
| Claude Desktop App（Code 分頁）＝主介面 | 與 CLI 同 harness：`.claude/`＋5 hooks＋`.mcp.json` 全繼承 | ✅ 全套 |
| VS Code ext / CLI＝永久 fallback | 同上，配置同源，零額外工作 | ✅ 全套 |
| Claude Desktop App（Cowork）/ 手機 App | 不執行 hooks / slash commands | ⚠️ 只讀分析（Mode Card 規範） |
| Antigravity（Gemini）＝永久備援 | `.agents/workflows/` 橋接＋`.gemini/skills/`（凍結） | ⚠️ 無 hook 守護，單一寫者矩陣約束 |
| Cursor | 休眠藍圖，未安裝 | —（`.cursorrules` 橋接規格已備） |

### 多模型協作設備

| 管道 | 模型 | 狀態 |
|---|---|---|
| Agent tool 調度（02 §4 四級升降） | haiku / sonnet / opus / fable | ✅ 現役，制度完整 |
| `/cl-flow`（scripts/cl-flow-runner.js） | Perplexity（A1）＋ Gemini（A2）→ Claude 裁決（A3） | ✅ 現役 |
| n8n 三腦 `cztGsFXZYtvBUDA6` | GPT＋Gemini＋Claude | ⏸ 休眠藍圖（AGENTS §1.2） |
| n8n NAS 業務層 V47.x | 財務計算 | ✅ 現役（業務域，不入模板） |
| MCP | 專案級 supabase＋n8n-mcp-server；claude.ai connectors | ✅ 現役 |

### 資產可攜性矩陣（三分類初判，Phase 1 逐檔定案）

| 分類 | 資產 |
|---|---|
| **U＝通用可攜** | governance 01–06、hooks **機制**（SessionStart 快照/Stop 交付紀律/health-check 五項引擎）、handoff 便攜塊 SSOT 範式、learnings/lessons/decisions/session-log 記憶架構、Master→橋接雙層指令架構、`/read` `/execute` `/commit` `/cl-flow` 流程骨架、Rule 3.11/3.14/3.15/3.17、檔案寫入安全守護、目標驅動執行、Mode Card 單一寫者矩陣**概念**、cl-flow-runner（env 化後）、fixtures 回歸框架 |
| **F＝FHS 專屬（不入模板）** | 財務六檔、finance-gatekeeper 本體、fhs-* 3 skills、產品 SOP、n8n 業務 workflow、Quadruple_Sync map、subagents 六支（finance-auditor/database-reviewer/product-integration-validator/blender-3d-modeler/ui-designer/frontend-developer）、guard 規則**內容**、`.mcp.json` 實鑰 |
| **M＝糾纏（需拆解或雙版本）** | AGENTS.md、CLAUDE.md、pre-tool-guard.js、prompt-router.js、post-tool-kgov.js、02 §0/§7 與 01 的 FHS 實測數據、commands master 內寫死路徑、OPERATING_MODEL.md（待驗） |

---

## §1 八維度架構分析

| # | 維度 | 關鍵發現 | 落入 v2 的設計約束 |
|---|---|---|---|
| 1 | 系統效能 perf | hooks 每次工具呼叫 spawn 全新 node process；guard 規則外置後多一次 `readFileSync`（小 JSON，~1ms 級）理論可忽略，但 PreToolUse 有 5s timeout 且攔在**每一次** Write/Edit/Bash 前，不容退化 | Phase 2 驗收加**執行時間對比**：拆分前後以相同樣本輸入實測，delta ≤50ms；SessionStart 快照 ≤4,000 bytes 預算隨模板出貨（commit.md P0.7.1 防回胖機制通用化） |
| 2 | 直觀管理 ux_mgmt | 單人操作者，可管理性＝單一入口＋最少新概念；v1 只驗「結構存在」，沒驗「開新專案實際好上手」 | 模板單一入口 README（≤150 行）＋bootstrap 步驟 ≤10 分鐘人工操作；不發明新機制，全部沿用既有慣例（Master→橋接、便攜塊、路由表）；Phase 4 加 README 盲測（見 §3 弱點 3） |
| 3 | 衝突避免 conflict | (a) S148 計畫改 guard.js/execute.md＝檔案級衝突；(b) **FHS subagents 同步在 `~/.claude/agents/freehandsss/`（全域），新專案照抄全域安裝會跨專案污染**；(c) GENERIC-FORK 副本與活體 drift；(d) 模板 repo 自身的寫入權未定義 | (a) S148 完成＝硬閘；(b) 模板 subagents 一律**專案級** `.claude/agents/`，README 明文禁止全域安裝；(c) manifest 記 blob hash＋健檢比對；(d) 模板 repo 亦只准 hook 守護側寫入（Mode Card 模板內建此行） |
| 4 | Token 消費 token | 治理資產最大 token 風險＝制度自肥＋巨檔全讀；FHS 的解法（禁全檔 Read 名單、路由表按需載入、輪轉觸發）本身就是可攜資產 | 禁全檔 Read 名單改為 per-project 設定隨 guard 規則檔出貨；模板文件行數預算：README ≤150、AGENTS skeleton ≤120、governance 通用版各 ≤原檔行數；CLAUDE.router.skeleton 只做路由不放規則 |
| 5 | 長期方向 long_term | 模板若無版本治理會退化成一次性 dump；harness 本身會演化（Agent tool enum / hooks API 過期風險）；新專案 fork 後的本地演化不回流 | 模板 repo 含 `VERSION`＋`CHANGELOG.md`＋再匯出 SOP（exporter 冪等可重跑→diff 審查→bump 版本）；02 §0「引用前過期重測」紀律入模板；「不回流」列為已知限制明文（單人操作者接受） |
| 6 | Desktop＋手機 responsive | 手機 App / Cowork 無 hooks，跨裝置連續性唯一機制＝handoff **便攜塊**（1 分鐘人讀、可貼進任何聊天） | Mode Card 模板含手機/Cowork 列；模板 README 專節「跨裝置接手 SOP」＝複製便攜塊開新對話；便攜塊格式規範隨記憶骨架出貨 |
| 7 | subagent & skill | 三支可通用化（code-reviewer/build-error-resolver/tdd-guide）；六支業務綁定；**finance-gatekeeper 的「守門員路由」模式本身是通用設計範式**（任何領域都需要「查 X 前先讀路由」）；22 支設計 skills 待 V43 裁決 | 模板出 trio 去識別化版＋`domain-gatekeeper.skeleton`（守門員模式空模，含觸發詞表＋任務型路由表結構）；22 支設計 skills 明文排除；安裝層級＝專案級（見維度 3） |
| 8 | 歷史記錄 history | 記憶六系統中五個平台中立（repo 內檔案）；輪轉/衛生規則（05 §4、learnings 50 條上限、health-check 五項）是防腐核心；Notion/Obsidian 同步是 FHS 專屬接線 | 記憶骨架全套（handoff/learnings/decisions/session-log/lessons+INDEX/knowledge-map 空模）＋輪轉觸發表＋health-check 引擎（五項檢查閾值 config 化）；Notion/Obsidian＝選配模組**文件化**不出碼；completion/planning 報告命名規範入 README |

---

## §2 實施計畫草案 v1（保留供追溯，**執行以 §4 v2 為準**）

架構抉擇 A′＝原位抽取（FHS repo 永遠活體 master，manifest＋exporter 產生模板）＋唯一物理重構 pre-tool-guard.js 引擎/規則拆分。雙軌抽取：`COPY-CLEAN`（直接複製＋佔位符替換）與 `GENERIC-FORK`（去識別化 fork 存 template-src/，記上游 blob hash）。六 Phase：Phase 0 依賴閘（S148 完成）→ Phase 1 manifest 普查 → Phase 2 guard 拆分（fixtures 16/16 紅線＋opus 對抗審查）→ Phase 3 抽取器＋模板本體（黑名單 grep＝0 紅線）→ Phase 4 新專案乾跑演練（fresh agent 5 項 checklist）→ Phase 5 制度收尾。

否決的替代案：B＝物理分家（爆炸半徑大，與 S148 檔案重疊）；C＝上游模板 repo 反向供給（單人雙 repo 同步負擔，過度工程）。

---

## §3 自我批評（v1 的 3 個弱點）

1. **全域 subagent 命名空間衝突未處理（conflict 維度漏洞）**：v1 把 trio 放進模板，但 FHS 現制是同步到 `~/.claude/agents/freehandsss/`（全域目錄）。新專案若照抄此慣例，會與 FHS 的同名 agent 互相覆蓋，且全域 agent 在所有專案可見＝跨專案污染。→ v2：模板 subagents 一律專案級 `.claude/agents/`；manifest 增 `install_level` 欄；README 明文禁止全域安裝。
2. **模板缺自身版本治理（long_term/history 維度漏洞）**：v1 只管第一次抽取，沒定義模板的版本號、CHANGELOG、再匯出流程——半年後 FHS 治理演化了，模板就是過期 dump，繼承者拿到的是壞地圖。→ v2：模板 repo 含 VERSION＋CHANGELOG＋再匯出 SOP；05 §7 健檢 drift 項同時比對 blob hash 與模板版本。
3. **驗收只驗「結構存在」不驗「實際好用」（ux_mgmt 維度漏洞）**：v1 Phase 4 的 5 項 checklist 全是機械存在性檢查（hook 有輸出/fixtures 過/橋接檔在），完全沒驗「Fat Mo 開新專案能不能在 10 分鐘內 bootstrap 完成並跑通第一個工作循環」。→ v2：Phase 4 checklist 擴為 8 項，加 bootstrap 計時、README 盲測（fresh agent 只靠 README 接線，禁止回看 FHS repo）、跨裝置接手 SOP 存在性。

---

## §4 實施計畫 v2（**定稿，Sonnet 5 照此執行**，各 Phase 獨立 commit）

> ⚠️ **執行前先讀 §5 v3 修訂（2026-07-12 重審）**：以下 v2 條文凡被 §5 覆寫表命中者，一律以 §5 為準；未命中者照舊。

### §4.0 執行紀律（開工前必讀）

- 前置閘：**S148 迴圈硬化計畫 4 Phase 全部完成**（讀該計畫檔「執行狀態」節確認）——S148 會改 guard.js（R11）與 execute.md/[G] 判準，本計畫必須基於其終態。
- 每 Phase 一個獨立 commit；驗收命令輸出貼進本檔「執行狀態」節。
- 卡關依 02 §4 升降級（sonnet 連錯兩輪→opus 帶完整失敗軌跡）；本計畫不涉財務域。
- 改 governance 任何檔前先備份（05 §5）；本計畫不改 AGENTS.md / CLAUDE.md 本文（僅授權項 #4 加一行路由）。
- 交付邊界照 Rule 3.17 輸出雙紀律自檢。
- 大量讀檔遵 02 §1/§6：巨檔 Grep 定位→窗口讀；探索型盤點派 Explore。

### §4.0b 授權清單（Fat Mo 批准本計畫＝一併授權以下八項；執行時不再逐項問）

1. **模板落點**：獨立 git repo `D:\SynologyDrive\AI_Governance_Template`（建議）；替代案＝本 repo `dist/template/` 子目錄。
2. **Phase 2 guard.js 引擎/規則拆分**（行為等價，fixtures 16/16＋perf delta ≤50ms 雙紅線）。
3. **新增 `scripts/portability/` 工具目錄**（manifest、exporter、template-src/、check 腳本）。
4. **CLAUDE.md 路由表加一行**：「要改治理可攜模板/新專案繼承 → 先讀 scripts/portability/README.md」（05 §1「先問」級，此處即提案）。
5. **05 §7 季度健檢追加「模板 drift 檢查」項**（比對 manifest blob hash＋模板 VERSION；05 §1「先問」級，此處即提案）。
6. governance 01–06 以**去識別化副本**入模板（活體原檔不動）。
7. 模板收錄 subagent 通用三支（code-reviewer / build-error-resolver / tdd-guide 去識別化版）＋`domain-gatekeeper.skeleton`，**安裝層級一律專案級 `.claude/agents/`**；其餘六支不入。
8. **標記慣例**（輕量，非規則本體變更）：今後 02 §7 / learnings 新條目自願帶【通用】/【FHS】前綴。

### §4.1 Phase 0 — 依賴閘與基線（無 commit，純檢查）

- 確認 S148 計畫執行狀態節 4/4 完成；`git log --oneline -10` 記基線 hash 填入執行狀態節。
- 依授權項 #1 裁決結果建模板目錄並 `git init`（獨立 repo 案）。

### §4.2 Phase 1 — 可攜性普查落盤（commit #1）

- 枚舉 `.fhs/ai/**`、`scripts/hooks/**`、`scripts/{cl-flow-runner,validate-ag-plan}.js`、`.claude/commands/**`、`.agents/workflows/**`、`.fhs/notes/{FHS_Mode_Card,knowledge-map,SOP_NOW}.md`，逐檔寫入 `scripts/portability/manifest.json`：`{source, class: U|F|M, action: COPY-CLEAN|GENERIC-FORK|SKIP, dest, install_level: project|n/a, line_budget?, upstream_blob_hash?}`。
- §0 矩陣為初判，逐檔開檔驗證後定案（特別是 OPERATING_MODEL.md、06_letter、health-check 引擎）。
- **驗收**：`node scripts/portability/check-manifest.js` 輸出「未分類＝0；SKIP 項均附一句理由；GENERIC-FORK 項均有 blob hash」。

### §4.3 Phase 2 — guard.js 引擎/規則拆分（commit #2，唯一觸碰生產行為的重構）

- `pre-tool-guard.js` → 判斷引擎＋`scripts/hooks/guard-rules.fhs.json`（R1–R11 規則全外置）。
- **紅線 1**：`node scripts/hooks/test/run-fixtures.js` 16/16 PASS 且逐項結果與拆分前基線完全一致（先跑基線留檔再拆）。
- **紅線 2（perf）**：相同樣本輸入實測拆分前後執行時間，delta ≤50ms。
- **驗收不自驗**：fresh-context **opus** 對抗審查（diff 級：無規則語義漂移、無新繞過面），PASS 才 commit。
- router / kgov / stop-kgov / health-check **不重構**，以 GENERIC-FORK 去識別化副本入模板。

### §4.4 Phase 3 — 抽取器＋模板本體 v0.1.0（commit #3）

- `scripts/portability/export-template.js`：按 manifest 執行 COPY-CLEAN（佔位符 `{{PROJECT_NAME}}` `{{OWNER}}` `{{DB_PRIMARY}}` 等）＋搬運 template-src/ 的 GENERIC-FORK → 輸出模板目錄。
- 模板內容集：governance 6 檔通用版、`AGENTS.skeleton.md`（≤120 行，通用規則＋`{{業務規則區}}`）、`CLAUDE.router.skeleton.md`、commands 核心 7 支（read/execute/commit/cl-flow/cl-flow-fast/rp/rg）通用版、hooks（guard 引擎＋範例規則檔＋session-start＋stop＋health-check config 化）、fixtures 框架（測試值全合成）、記憶骨架全套＋輪轉觸發表、Mode Card 模板（含手機/Cowork 列＋模板 repo 寫入權行）、subagent trio＋domain-gatekeeper.skeleton（專案級）、cl-flow-runner（env 化）、`.mcp.json.example`、`settings.json` hooks 接線範例、`scripts/generate-bridges.js`（master→`.claude/commands`＋`.agents/workflows` 產生器，模板專用，FHS 既有 20 支手維橋接不回頭改）、`README.md`（≤150 行：平台接入指南＋跨裝置接手 SOP＋禁全域安裝 agent＋再匯出 SOP）、`VERSION`（0.1.0）＋`CHANGELOG.md`。
- **機械紅線（黑名單 grep＝0）**：`grep -rniE "freehandsss|FHS_|app9GuLsW9frN4xaT|yanhei\.synology|6Ljih0hSKr9RpYNm|cztGsFXZYtvBUDA6|sbp_|X-N8N-API-KEY|final_sale_price|raw_form_state|captureFormState|Fat Mo|Edwin|SynologyDrive" <模板目錄>` → 0 hits。
- **驗收**：exporter 跑綠＋黑名單 0 hits＋輸出檔數與 manifest 非 SKIP 項 100% 對齊＋行數預算 `wc -l` 抽查（README/AGENTS skeleton）。

### §4.5 Phase 4 — 新專案乾跑演練（commit #4，只 commit 演練報告）

- 執行 session 的 scratchpad 建空白測試專案，照模板 README bootstrap。
- **驗收不自驗**：fresh-context agent 執行 8 項 checklist：(1) SessionStart hook 輸出快照；(2) fixtures 全 PASS；(3) `.claude/commands`＋`.agents/workflows` 橋接存在且指向 master；(4) `/read` 等效流程走通；(5) handoff 便攜塊可被 hook 抽取；(6) **bootstrap 人工步驟 ≤10 分鐘**（照 README 計步計時）；(7) **README 盲測**——agent 全程只准看模板 repo，禁止回看 FHS repo，卡住即 FAIL 並記缺口；(8) 跨裝置接手 SOP 章節存在且步驟完整。8/8 才 PASS，報告落 `.fhs/reports/completion/`。

### §4.6 Phase 5 — 制度收尾（commit #5）

- decisions.md 條目＋completion report（制度任務完成記錄強制律）＋repo-map.md/README 同步（`scripts/portability/`，文件同步強制律）＋CLAUDE.md 一行路由（授權項 #4）＋05 §7 drift 項（授權項 #5）＋auto-memory 更新＋（Fat Mo 要求時）`/commit`。

### §4.7 執行順序與依賴

```
S148 計畫 4 Phase 全完成（硬閘）
  → Phase 0（閘）→ Phase 1（manifest）→ Phase 2（guard 拆分，依賴 S148 後 guard 終態）
  → Phase 3（抽取，依賴 1+2）→ Phase 4（乾跑，依賴 3）→ Phase 5（收尾）
```

**明文排除（本計畫不做）**：不動 FHS 生產系統任何行為（guard 拆分行為等價除外）；不遷移 22 支設計 skills（待 V43）；不啟用 Cursor；不重寫 FHS 既有橋接；不搬動 `.fhs/` 現有檔案位置；Notion/Obsidian 同步不出碼只文件化；n8n 三腦僅以規格連結在模板 README 提及（休眠現狀不變）。

---

## §5 v3.1 修訂（2026-07-12 重審增量節，Fable 5，經 /8d 兩輪迭代）

> **背景**：v2 定稿後兩週（S150–S164）系統演化重審。本節為**唯一有效 delta**：執行以「§4 v2＋本節覆寫」為準，未列於 §5.1 的 v2 條文一律照舊。v2 本文一字未動（追溯性保留）。

### §5.1 逐條覆寫表

| 位置 | 原句（v2） | 改為（v3.1） |
|---|---|---|
| §4.0 前置閘 | 「S148…全部完成（讀該計畫檔『執行狀態』節確認）」 | **前置閘已滿足**：S148 已於 2026-07-07/08 執行完成，客觀證據＝git commits `b66aea`(P0+1)/`b7df3b5`(P2)/`439b29c`(P3)/`d80a349`(P4)＋Changelog S154；S148 執行狀態節曾漏回填，已於 2026-07-12 補課回填 |
| §4.0 執行紀律（追加一條） | — | **回填律（本計畫自身紀律）**：每 Phase commit 的前置條件＝本檔「執行狀態」節該 Phase 已回填；Phase 5 驗收含 `grep -c "⬜"` 本計畫檔＝0 |
| §4.1 Phase 0 | 「確認 S148 計畫執行狀態節 4/4 完成」 | 改為建立**當日基線**：三套夾具全跑留輸出檔（guard/kgov/health 三支 runner，存 `.fhs-local/` 或 scratchpad）＋`grep -oE "R[0-9]+" scripts/hooks/pre-tool-guard.js \| sort -uV` 留規則清單基線 |
| §4.3 Phase 2 紅線 1 | 「run-fixtures.js 16/16 PASS 且逐項結果與拆分前基線完全一致」 | 「**三套夾具全數 PASS 且與 Phase 0 當日基線逐項一致**；guard 規則清單拆分前後 grep 輸出相同」——計數不寫死（2026-07-12 實測快照僅供參考：R1–R12、guard 17／kgov 10／health 12） |
| §4.3 Phase 2 | 「（現有 R1–R11 全部規則外置）」 | 「執行當日全部 R 規則外置（以 grep 清單為準；含 D21 放寬後的 R10 語義與 S156 新增的 R12）」 |
| §4.4 模板內容集・governance | 「governance 6 檔通用版」 | 「governance 00–07 共 8 檔通用版（含 S156 新增 `07_compounding-loop.md`：fan-out／worktree／loop 純調度，U-class）」 |
| §4.4 模板內容集・commands | 「commands 核心 7 支（read/execute/commit/cl-flow/cl-flow-fast/rp/rg）」 | 「commands 核心 **8 支**（＋`/8d`，S153 新建、純 in-chat 零外部依賴）；`/usage-audit` 列 M-class 由 Phase 1 manifest 判定」 |
| §4.4 模板內容集（追加一項） | — | 「**domain param-memory 範式文件**（GENERIC-FORK 純文檔，**非 skeleton 代碼**）：rules_frozen 鐵律層＋cases 案例庫＋diff-learning＋補課檢查，源自 /canva-auto 與 /3d-print 姊妹指令；標記成熟度『2 實例未收斂』；模板 CHANGELOG 預留升格條件『≥3 單收斂後升 skeleton』——用範式自己的升格規則管自己」 |
| §4.4 模板內容集（追加一項） | — | 「**模板指令頭部規範**：『依賴／不可攜平台』必填欄位（/canva-auto 已示範：AG 無 Canva MCP 不可攜）；`generate-bridges.js` 據此欄位決定是否橋接至 `.agents/workflows/`」 |
| §4.2 Phase 1 枚舉範圍 | 原清單 | 追加：`.fhs/ai/commands/{8d,usage-audit,3d-print,canva-auto}.md`、`3d/`、`canva_auto/`（後三者預期 F-class，但為 param-memory 範式文件的來源材料） |
| §4.4 黑名單 | 原 grep pattern | 追加 token：`Free_recorder\|Lovart\|canva_auto\|param_memory\|placement_memory\|freehandsss2018` |
| §4.0b 授權清單（追加第 9 項） | — | 「9. 本 §5 增量節寫入＋S148 計畫檔執行狀態節回填補課（附 git log 證據；動另一份已完結計畫檔的唯一目的＝防未來讀者誤判）」——已於 2026-07-12 Fat Mo 口頭「繼續」授權執行 |
| §4.6 Phase 5（追加一項收尾動作） | — | 「回填律**全域化**提案：按 05 §1 提案格式（現行條文→新條文→動機→影響面）獨立提交 Fat Mo 裁決，**不隨本計畫批准自動生效**（不挾帶修憲）」 |

### §5.2 排序現實（2026-07-12）

S148 已完成；S150 Phase 4-6 明文等 S149 → **S149 現為執行佇列 blocker**。與 3D pipeline Phase 1（S161）零檔案交集，先後由 Fat Mo 裁決。

### §5.3 方法論記錄

本節經 `/8d` 兩輪迭代：第一輪對 v2 找出 3 弱點（範式過早抽象／回填治標不治根／覆寫毀追溯）→ v3；第二輪對 v3 再找 3 弱點（v2+delta 雙源歧義／授權項挾帶全域制度變更／釘死計數重蹈過時）→ v3.1（覆寫表＋§4 banner／回填律收斂為本計畫自身紀律＋全域版走 05 §1 正門／計數改當日基線不變量）。

---

## §5.4 v3.2 修訂（2026-09-25 重審增量節，Sonnet 5，經 Codex 交叉平台審閱＋獨立代碼核對）

> **背景**：Fat Mo 新訂閱 Codex，將本計畫（v2＋§5 v3.1）送去 Codex 做第二意見審閱。Codex 回覆 B1/M1–M5/Minor 共 9 項發現＋撤回上輪 2 項過重判斷；Sonnet 5 逐項對照現行 `scripts/hooks/**` 代碼、fixture 檔案、Antigravity 官方文件核實，**8 項成立（部分調整嚴重度）、2 項降級、另補 3 項 Codex 未發現的問題（N1–N3）**。本節為 §5 v3.1 之上的**第二層 delta**：執行以「§4 v2＋§5.1 覆寫＋本節 §5.4 覆寫」為準；v3.1 本文一字未動（追溯性保留）。

### §5.4.1 逐條覆寫表

| 位置 | 原句（v2/v3.1） | 改為（v3.2） |
|---|---|---|
| §4.1 Phase 0 | 「確認 S148 計畫執行狀態節 4/4 完成」＋建當日基線 | 追加前置檢查：**確認 `.fhs/.deploy-ok` 不存在**方可執行後續任何 fixtures 跑批；若存在則中止並記錄原因（原因：`pre-tool-guard.js` R1/R9 嘅 `checkDeployAuthorization()`／`consumeDeployAuthorization()` 冇 `FHS_GUARD_FIXTURE` 閘，跑夾具期間若旗標有效會被誤消耗＋誤寫 `deploy-log.md`＋令 R1/R9 夾具誤判 FAIL——Codex B1，核實成立，降級為 Major） |
| §4.1 Phase 0 基線範圍 | 「三套夾具全跑留輸出檔」 | 改為「**現有全部 5 支 runner**（`run-fixtures.js`／`run-kgov-fixtures.js`／`run-health-fixtures.js`／`run-finance-stop-fixtures.js`／`run-handoff-gate-tests.js`）全跑留輸出檔」——2026-07-12 定稿時只有 3 支，現已增至 5 支（Codex M1 部分成立：漏算咗 R13 專屬 runner 已存在） |
| §4.3 Phase 2 紅線 1 | 「三套夾具全數 PASS 且與 Phase 0 當日基線逐項一致；guard 規則清單拆分前後 grep 輸出相同」 | 改為「**五套 runner 全數 PASS 且與 Phase 0 當日基線逐項一致**；規則等價改用**規則 ID 集合比對**（拆分前用 `// ── Rule N` 代碼塊標記抽取 ID 集合，拆分後用規則 JSON 的 ID 欄位抽取，兩集合須相等）取代原本嘅純 grep 字串比對（因為拆分本身就係將規則搬去 JSON，「grep 輸出相同」自相矛盾）；另加 **guard stdout JSON 結構檢查**（現有 runner 只做子串比對，驗證唔到 `pre-tool-guard.js:476` 輸出嘅 JSON 結構完整性）——Codex M1，核實成立 |
| §4.2 Phase 1 manifest 欄位 | `{source, class, action, dest, install_level, line_budget?, upstream_blob_hash?}` | 追加 **`deps` 欄位**：記錄該檔案嘅 `require()`/`import` 閉包（例如 `cl-flow-runner.js` 依賴 `scripts/lib/env.js`，`env.js` 又依賴 `dotenv` package）；`check-manifest.js` 驗證條件追加「`deps` 閉包內全部檔案都有對應 manifest 條目」；模板附帶 `package.json` 記錄外部套件依賴——Codex M2，核實成立（現行 §4.2 枚舉範圍確實漏列 `scripts/lib/`） |
| §4.2 Phase 1 定位 | 「§0 矩陣為初判，逐檔開檔驗證後定案」 | 追加：**Phase 1 manifest 取代 §0 資產矩陣，成為唯一有效資產分類來源**——§0 已漂移（定稿時 5 支 hook 腳本／R1–R11，現時 7 支腳本／R1–R14，且 D92 起 guard 警告改直達輸出格式），日後查資產分類一律睇 manifest 不睇 §0（N2，Codex 未發現，本次補充） |
| §5.1 回填律 | `grep -c "⬜" 本計畫檔＝0` | 改為 `grep -cE '^- Phase [0-5]：⬜'`（原 pattern 會命中「回填律」條文自身嘅說明文字，實測模擬六個 Phase 全部打剔後計數仍為 1）——Codex M3，核實成立，降級為 Minor（後果只係驗收誤判 FAIL，一眼睇得出） |
| §0 平台矩陣・Antigravity 列 | 「`.agents/workflows/` 橋接＋`.gemini/skills/`（凍結）／⚠️ 無 hook 守護」 | 改為：**Antigravity Workflows 將於 2026-11-01 正式退役**（官方 Workflows to Skills Migration 文件確認，退役後 workflow 目錄不再被索引/可執行），新橋接目標改為 `.agents/skills/`；Antigravity 現已支援 hooks（`.agents/hooks.json`，涵蓋 PreToolUse/PostToolUse/PreInvocation/PostInvocation/Stop），但移植前須先驗證阻擋語義是否等價，**本輪不擴大範圍**，只更新橋接路徑——Codex M4a/M4b，核實成立（M4a 升級為 Major；M4b 降級為 Minor 且列後續）。**此事同時影響 FHS 現行系統**（16 個 `.agents/workflows/` 橋接檔，非本計畫獨有），已另行記入 handoff 時限待辦，不待本計畫執行 |
| §4.4 模板內容集 | 「`scripts/generate-bridges.js`（master→`.claude/commands`＋`.agents/workflows` 產生器）」 | 目標路徑同步改 `.agents/skills/`（隨 Antigravity 官方遷移路徑） |
| §4.5 Phase 4 checklist | 8 項 | 追加**第 9 項**：**agents／hooks 載入來源驗證**——斷言乾跑演練載入嘅 subagents／hooks 當中冇任何一項嚟自 `~/.claude/agents/freehandsss/`（FHS runtime agents 全域目錄，見 `OPERATING_MODEL.md`）；本項要求 Phase 4 喺**乾淨 HOME 環境**（或至少確認全域 agents 目錄冇同名衝突）下執行，否則 Claude Code 會載入使用者級 agents 造成假 PASS。9/9 才 PASS——Codex M4c，核實成立 |
| §4.0b 授權清單（追加第 10 項） | — | 「10. 環境變數前綴亦納入去識別化範圍：模板內 `FHS_*` 環境變數（`FHS_GUARD_FIXTURE`／`FHS_HANDOFF_GATE_FILE`／`FHS_HEALTH_*` 等 11 個）改用 `{{ENV_PREFIX}}_` 佔位符，避免撞正 Phase 3 黑名單嘅 `FHS_` 條目令引擎類檔案第一次 fork 就 FAIL；Phase 3 驗收追加**對匯出後嘅模板重新跑一次全套 runner**（而非只驗證活體），確保去識別化冇改壞行為」——Codex 未發現，本次補充（N1） |
| §4.4 機械紅線（黑名單） | 「黑名單 grep＝0 hits」 | 追加**正向對照**：另準備一份含黑名單字串嘅合成測試樣本，驗證掃描器確實能攔截（防止 pattern 本身失效但仍顯示 0 hits 嘅假陽性）——Codex M5，核實成立，維持 Minor |
| §4.0b 授權項 #1 | 「模板落點：獨立 git repo `D:\SynologyDrive\AI_Governance_Template`」 | 追加執行環境澄清：**Phase 0–3 須在具備該本地路徑存取權的機器（Fat Mo 本機）執行**；若改在雲端 session（例如本次審閱所在嘅 remote 環境）執行，一律改用替代案 `dist/template/` 子目錄方案，且路徑一律佔位符化，不寫死 Windows 路徑——Codex N3，本次補充 |
| §4.3 Phase 2/§4.4 Phase 3 驗收（追加三項 Minor） | — | ① 模板 `VERSION` 檔案追加記錄來源 FHS repo 嘅 commit hash；② `delta ≤50ms` 訂明採樣方法：同一部機、同一組樣本輸入，拆分前後各跑 30 次取執行時間中位數比較，非單次量測；③ Phase 0 額外產出一份「v2＋§5.1＋§5.4 全部覆寫」嘅單一執行視圖文件（`§4-effective.md`），方便執行 session 唔使人手疊三份 delta，v2/§5 原文一字不動保留追溯 |

### §5.4.2 Codex 發現核實結果一覽

| 編號 | Codex 判定 | 核實結果 | 嚴重度（本次裁定） |
|---|---|---|---|
| B1 | .deploy-ok 消耗風險 | ✅ 成立（`pre-tool-guard.js:200-201/307-308` 無 fixture 閘） | Major（原判 Blocker，降級——只會喺旗標 10 分鐘窗口內發生，加一行前置檢查即解） |
| M1 | 三套測試證明唔到行為等價 | ✅ 成立，但漏算 R13 已有專屬 runner（現為 5 支非 3 支） | Major |
| M2 | manifest 漏 `scripts/lib/env.js` 依賴 | ✅ 成立（`cl-flow-runner.js:24` require 鏈確認） | Major |
| M3 | `grep -c "⬜"` 命中自身 | ✅ 成立（實測模擬全 Phase 完成後計數仍為 1） | Minor（原判無明確分級，本次定為 Minor——後果為驗收誤判，非實質損害） |
| M4a | Antigravity Workflows 2026-11-01 退役 | ✅ 成立（官方 Workflows to Skills Migration 文件確認；官方頁面本身被網絡代理擋咗未能直接開啟，僅憑搜尋結果標題／摘要佐證，建議 Fat Mo 自行覆核） | Major（升級——同時影響 FHS 現行 16 個橋接檔，非本計畫獨有） |
| M4b | Antigravity 已支援 hooks | ✅ 成立，但移植語義未驗 | Minor（列後續範圍，本輪不做） |
| M4c | 專案級 agents 隔離唔到全域 agents | ✅ 成立（`OPERATING_MODEL.md` 確認 FHS runtime agents 全域目錄） | Major |
| M5 | 黑名單零命中只可做輔助證據 | ✅ 成立 | Minor |
| Minor×3 | VERSION／delta 採樣法／單一執行視圖 | ✅ 全部採納 | Minor |
| 「Git 狀態」（B1 附帶主張） | R13/handoff/health 亦受夾具污染 | ❌ 不採納——R13 喺 `FHS_GUARD_FIXTURE=1` 下唔行（`:374`）；handoff 測試用暫存檔且跳過 git 探測（`:103/:119`）；health runner 已用環境變數隔離 | — |
| 撤回項×2 | 「批准」與 `/execute` 互斥／`\|` 係 regex 錯誤 | ✅ 同意撤回（Markdown 表格跳脫寫法，非 regex 問題；批准與 `/execute` 可並存） | — |
| N1（本次補充） | `FHS_` 環境變數撞正 Phase 3 自己嘅黑名單 | 新發現 | Major |
| N2（本次補充） | §0 資產矩陣已漂移過時，manifest 應取代之 | 新發現 | Major |
| N3（本次補充） | 授權項 #1 路徑假設本地執行環境，雲端 session 建立唔到 | 新發現 | Minor |

### §5.4.3 明確排除（本輪不擴大範圍）

- Antigravity hooks 阻擋語義移植（M4b）：列為模板 v0.2+ 範圍，本輪只更新橋接目標路徑至 `.agents/skills/`，不實作 hooks 映射。
- FHS 現行 16 個 `.agents/workflows/` 橋接檔本身嘅遷移：屬 FHS 生產系統維護工作，不併入 S149 範圍，已另行記入 handoff 時限待辦（2026-11-01）供 Fat Mo 獨立排程。

---

## 執行狀態（執行 session 回填）

- Phase 0：⬜ 基線 commit hash：＿＿＿
- Phase 1：⬜ manifest 檔數/未分類：＿＿＿
- Phase 2：⬜ fixtures 基線 vs 拆後：＿＿＿；perf delta：＿＿ms
- Phase 3：⬜ 黑名單 grep：＿＿＿；行數預算抽查：＿＿＿
- Phase 4：⬜ fresh agent checklist：＿/8
- Phase 5：⬜
