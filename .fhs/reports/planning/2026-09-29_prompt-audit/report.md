# Prompt 稽核報告（/claude-api prompt-audit）— 2026-09-29

> 產出方式：非互動稽核，唔改任何被稽核檔案。建議改動全部喺同目錄 `proposed.diff`（49 個 hunk／24 檔，已 `git apply --check` 通過）。
> 分支：`claude/api-prompt-audit-980408`（worktree）

## 0. 前提假設（有錯就收窄範圍再跑一次）

**範圍**：本 worktree 內 Claude 會讀到嘅指令檔，共約 130 檔：
- `CLAUDE.md`、`.fhs/ai/AGENTS.md`（憲法）、`.fhs/ai/governance/00–07`
- `.fhs/ai/commands/*.md`（27）、`.claude/commands/*.md`（26 支橋接）
- `.claude/skills/**`（FHS 自家 4 支＋vendor impeccable 設計技能 20 支）、`.fhs/ai/skills/**`
- `.fhs/ai/subagents/**`（9 支 FHS subagent master、MANIFEST、OPERATING_MODEL、3 支 vendor 原版）

**排除（理由）**：
- `.fhs/ai/governance/backups/`、`docs/archive/`：備份，唔會載入
- 根目錄 `AGENTS.md`、`.agents/`、`.codex/`：Codex（A4）用嘅，**非 Anthropic 介面**，唔用 Claude 標準稽核
- `scripts/cl-flow-runner.js`（含 template 副本）：送 prompt 去 Gemini／Perplexity，**非 Anthropic provider**；只記錄，唔建議改用 Claude
- `scripts/portability/template-src/`：模板副本
- `~/.claude/agents/freehandsss/*`（runtime 副本）同 auto-memory：喺 repo 外。**repo 內 master 一改，runtime 副本要照 05 權限矩陣雙寫**，稽核冇掂佢哋
- `.claude/settings*.json`、`.mcp.json`、`.env`：可能有 secret，冇讀

**目標模型**：
- 主 session 讀嘅檔（CLAUDE.md、AGENTS、governance、commands、skills）→ **Claude Opus 5.5**（即係跑緊呢次稽核嘅模型）
- `model: haiku` 嘅 subagent（code-reviewer、build-error-resolver、product-integration-validator）→ **Claude Haiku 4.5**
- 其餘 subagent 冇 `model:`，跟主對話 → Opus 5.5

**Group 4（API request code）**：repo 冇任何 Anthropic SDK／API 呼叫碼，所以唔適用。subagent 名冊檢查照做（見 H6、F4）。

## 1. 摘要

**影響最大嘅三項：**

1. **Dashboard 路徑過時（H1）**：`/new-product` Step 3 仲指住 `freehandsss_dashboardV41.html`。生產版係 V42（V41 最後一次改係 2026-06-05，V42 係 2026-09-24）。`product-integration-validator`、`fhs-bug-triage` 5-Gate 同 `build-error-resolver`（指住根本唔存在嘅 V40）都係咁。後果：新產品上架同 bug 驗收會 grep／改錯檔，而且唔會報錯。
2. **憲法自己打自己（H3／H4）**：`AGENTS.md` Rule 3.12（2026-05-13）要求「Supabase 出事要無縫切換 Airtable」，§3 仲要求「修改前必讀 `Quadruple_Sync_Field_Map.md`」。但同一份檔嘅 §1.1／§4（2026-07-22，D43）已經寫明 Airtable 全面停用、欄位地圖只供歷史查閱。`finance-auditor` 定義檔仲寫「Airtable＝備援（異步同步）」。git blame 顯示 D43 嗰段較新，所以改舊嗰段。
3. **一個唔存在嘅驗收閘（H7）**：`AGENTS.md` Rule 3.17、`execute.md`、`a4-review.md`、`rp.md` 都要求「`code-reviewer` G1–G8 Gate 報告」。但 `code-reviewer.md` 根本冇定義 G1–G8；佢嘅範圍仲只限 `*_proto.html`，而 repo 入面一個都冇（見 F4）。所以代碼／HTML 驗收嗰行，係指向一份冇人寫得出嘅報告。

**各組數量**：Group 1（過時 prompt 寫法）3 項 · Group 2（過時事實／互相矛盾／歷史敘述）17 項 · Group 3（工具／agent 描述）1 項 · Group 4 唔適用（冇 API 碼；名冊檢查併入 H6／F4）· 只標記唔改（flag）7 項。

## 2. 發現清單（按信心排序）

### 高信心（被 repo 本身推翻；全部附 diff）

| # | 位置 | 證據 | 類型 | 點解過時 | 動作 |
|---|---|---|---|---|---|
| H1a | `.fhs/ai/commands/new-product.md:106,123` | `**執行範圍**：\`freehandsss_dashboardV41.html\`` | G2 過時具體值 | AGENTS §1：V42 係生產版。V41 自 2026-06-05 冇再改 | rewrite → V42 |
| H1b | `.fhs/ai/subagents/freehandsss/product-integration-validator.md:30,60` | `A2. 讀取 freehandsss_dashboardV41.html` | G2 | 同上；validator 會對住舊 dropdown 驗 | rewrite → V42 |
| H1c | `.fhs/ai/skills/fhs-bug-triage/SKILL.md:34,66` | `grep -n "sbSyncOrder\|final_sale_price" freehandsss_dashboardV41.html` | G2 | 5-Gate 範例驗錯檔 | rewrite → V42 |
| H1d | `.fhs/ai/subagents/freehandsss/build-error-resolver.md:85` | `讀取 Freehandsss_Dashboard/freehandsss_dashboardV40.html` | G2 | V40.html 唔存在；而且全檔讀巨檔違反 CLAUDE.md 紅線 | rewrite → Grep 定位 V42 |
| H2 | `.fhs/ai/AGENTS.md:21-22` | `**版本**：v1.5.1（S158…）` | G2 互相矛盾 | 檔頭寫 `Version: v1.8.0`；§1 快照停喺 v1.5.1 | remove（以檔頭為準） |
| H3 | `.fhs/ai/AGENTS.md:76, 253-254` | `**修改前必讀**：…與 \`n8n/Quadruple_Sync_Field_Map.md\``；§5 仲列住已廢棄嘅 Triple_Sync | G2 互相矛盾 | 同檔 §4:244（2026-07-22）：「已退役…唔再是現行規則來源」。blame：76＝05-17、254＝05-11，都較舊 | rewrite |
| H4 | `.fhs/ai/AGENTS.md:104-106, 234` | `若 Supabase 發生事故，系統必須能無縫切換至 Airtable 維持運行` | G2 互相矛盾 | §1.1／§4（D43，2026-07-22）：Airtable 全面停用。Rule 3.12 blame 2026-05-13，較舊 | rewrite |
| H5 | `.fhs/ai/subagents/freehandsss/finance-auditor.md:60` | `\| Airtable 角色 \| **備援**（異步同步，quota 限制時降級） \|` | G2 | 同 D43 矛盾。財務檔：**只提議**，要 Fat Mo 確認 | rewrite（其餘「四端」字眼見 F2） |
| H7 | `AGENTS.md:213,218,309`；`execute.md:100`；`a4-review.md:15,21`；`rp.md:181` | `` `code-reviewer` G1–G8 Gate 報告 `` | G2 過時事實 | `code-reviewer.md` 冇 G1–G8（全 repo 唯一嘅 G1–G6 係 `cl-flow-g.md` 流程步驟，唔係審查閘） | rewrite →「code-reviewer 稽核報告（含最終裁定）」，7 處一齊改 |
| H8 | `code-reviewer.md:14`；`frontend-developer.md:13` | `> 憲法層：AGENTS.md v1.4.0` | G2 互相矛盾 | 同一檔 frontmatter 寫 `compatible_with: v1.5.0`，現行係 v1.8.0 | rewrite（刪版本號） |
| H9 | `.fhs/ai/commands/rp.md:53,169,214` | `AGENTS.md v1.4.8、Dashboard V41 current.html` | G2 | `/rp` 會自動把呢啲前提注入精煉 prompt，等於每次都注入錯事實 | rewrite → V42 |
| H9b | `.fhs/ai/commands/rp.md:168` | `NAS Code Node fetch 禁用、必用 axios / HTTP Request 節點` | G2 | `decisions.md:3448,3621`：Code Node 用 `require('axios')` 令 Task Runner 崩潰，已改用 HTTP Request 節點；「必用 axios」係相反指示 | rewrite |
| H10 | `.fhs/ai/subagents/MANIFEST.md:12-19`；`OPERATING_MODEL.md:155,176,196` | `\| claude-sonnet-4-6 \|` | G2 互相矛盾 | 02 §0 同實際 frontmatter：6 支已刪 `model:`（跟主對話），3 支用短名 `haiku` | rewrite |
| H11 | `governance/06_letter-to-future-sessions.md:10-12, 47` | `**下一個有 20 分鐘空檔的 session 就該做**`（handoff 輪轉）；未竟事項 (1)(2) | G2 | `.fhs/memory/archive/` 已有輪轉檔；02 §0 寫明 model 行已清。一個已完成嘅任務仲寫成「最重要嘅事」 | rewrite（標已完成） |

### 中信心（有對應嘅已記載模式；附 diff）

| # | 位置 | 證據 | 類型 | 點解過時 | 動作 |
|---|---|---|---|---|---|
| M1 | `06_letter…:4,16`；`00_INDEX.md:4`；`01_diagnosis.md:4`；`07_compounding-loop.md:4`；`03_judgment-rubrics.md:98` | `你（正在讀的模型）多半是 Sonnet 或更小` ／ `你比 Fable 5 弱` ／ `Sonnet 等級為基準` | G1d 化石＋G2 釘死模型名 | 主對話而家係 Opus 5.5。將讀者設定成「弱模型」會令輸出偏焦慮、偏保守（prompt 語氣會帶落輸出語氣）。02:5 自己都寫「讀者：任何等級」，所以本身已經唔一致 | rewrite（模型中立） |
| M2 | `02_model-dispatch.md:14` | `` `fable` = Fable 5（本制度撰寫者） `` | G2 釘死模型名 | 現行最高階係 Fable 5.1；每出新版本就會過時 | rewrite →「最高階模型別名」 |
| M3 | `02_model-dispatch.md:22,29,31` | `（…S139 A3 已執行但本檔未同步更新，屬純文件漂移…）`、`📌 待辦已結案…`、`（推翻舊版錯誤警語）…予以刪除` | G2 歷史敘述 | 規則嘅權威來自佢規定嘅行為，唔係佢點樣推翻舊版；「舊表」嘅描述令讀者要腦補一份睇唔到嘅舊版 | rewrite（只留現行事實） |
| M4 | `02_model-dispatch.md:139-140` | kgov 自我觸發教訓＋`📌 已治本（S148…）…本條保留為歷史記錄` | G1d 補丁堆積 | 條文自己承認 v2.0.0 起已結構性消滅；主對話每次載入 02 都要讀一條死規則 | remove |
| M5 | `CLAUDE.md:3`；`AGENTS.md:71,86,97,99` | `2026-07-04 實測 ~2,300 tokens，非舊稱 ~300 tokens`；`（v1.7.0，S168…初版為「任何時候 /commit 都自動部署」…）`；`（S140 修正：消除與 §3 的字面矛盾…）` | G2 歷史敘述 | 相對於舊版嘅寫法（「非舊稱」「初版為」）會引入不存在嘅替代方案；:71 更係部署授權規則，將舊版行為寫喺條文入面有誤讀風險。規則本體一字不改 | rewrite；:86 保留防誤讀嗰半句 |
| M6 | `AGENTS.md:279,290,291` | `/px-plan` 已退役…、`/px-audit` 已退役…、`v39-aom.md` Archived | G1d 化石 | 指令表列住已退役嘅指令，每次載入都佔位；退役紀錄喺 decisions.md | remove |
| M7 | `.fhs/ai/commands/canva-auto.md:382-403` | `## 版本更新日誌`（v1.0.0–v1.8.11，22 行） | G2 歷史敘述 | 每次 `/canva-auto` 都載入成個 changelog，入面有「v1.3.0 更正 v1.2.0 錯誤結論——resize 會改動動畫」呢類新舊對立結論，模型要自己調和 | move → `.fhs/notes/changelogs/canva-auto.md` |
| M8 | `.fhs/ai/skills/finance-gatekeeper/SKILL.md:7-21` | frontmatter 入面 15 行 `[前次] …` | G2 歷史敘述 | 每個財務任務都強制載入呢個 skill；frontmatter 記住 15 輪修訂史，包括已被推翻嘅定案（如「推翻 2026-07-21 定案」）。財務檔：**只提議** | move → `.fhs/notes/changelogs/finance-gatekeeper.md` |
| M9 | `code-reviewer.md:4,88,109,178`（目標 Haiku 4.5） | `稽核時使用 \`mcp__sequential-thinking__sequentialthinking\` 工具逐維度分析` | G1b「用 think 工具規劃」scaffold | 現行模型毋須被叫都會規劃，呢類指示會導致過度規劃；深度應由 harness 控制，唔應該靠一個外掛 MCP。5 維度標題要求保留 | remove |
| M11 | `AGENTS.md:167` | `` `d:\SynologyDrive\…\a2_implementation_plan.md` `` | G2 過時具體值 | 寫死咗主倉絕對路徑；喺 worktree 會靜靜雞寫落主倉 | rewrite → repo 相對路徑 |

### 只標記、唔改（flag）

| # | 位置 | 觀察 | 點解唔改 |
|---|---|---|---|
| F1 | `AGENTS.md:158` vs `governance/03_judgment-rubrics.md:54` | AGENTS：「不確定時停止…必須停下詢問 Fat Mo，禁止猜測繼續」；03 R3：「必不問（自己查，問了算違規）」 | 兩者可以調和（先自查、查唔到先問），但 AGENTS 嗰條（2026-04-28，較舊）係禁止類規則，改佢等於放寬一條禁令，要 Fat Mo 決定。建議字眼：「先自查（live 數據／learnings／實測），仍無法確認才停下問 Fat Mo」 |
| F2 | `finance-auditor.md:10-12,64-83`；`database-reviewer.md:3,12,44` | 成份定義仍以「四端 Dashboard↔n8n↔Airtable↔Supabase」為核心，Tier 2＝Airtable | 財務稽核流程要重寫，唔係改字眼；H5 只改角色表嗰行 |
| F3 | `AGENTS.md:89` | 「寫入 Supabase（Primary）並同步鏡像至 Airtable（Fallback），嚴禁以 Airtable formula 替代 n8n 計算」 | 屬財務禁令；Airtable 停用後呢條基本上冇嘢要管，但刪除或改寫都要 Fat Mo 同 finance-auditor 確認 |
| F4 | subagent 名冊：`database-reviewer`、`ui-designer`、`frontend-developer`、`code-reviewer`；AGENTS §7 路由表 | database-reviewer 描述＝「Airtable schema specialist」，工具只有 Airtable／n8n MCP，冇 Supabase；但 finance-gatekeeper §〇 將「Supabase schema／SKU 成本資料審查」派畀佢。V39/V40 原型三件套：ui-designer 輸出 `V40.html`（唔存在），基礎版 `V37.html`（唔存在）；frontend-developer／code-reviewer 只處理 `*_proto.html`（repo 冇一個） | 屬 agent 職責／架構調整（CLAUDE.md 第 3 條：先提方案等 Fat Mo 確認）：要將 database-reviewer 轉做 Supabase 審查（加 `mcp__supabase__execute_sql` 唯讀），抑或退役；原型三件套係要擴大範圍去管 V42 實改，定係正式退役 |
| F5 | `code-reviewer.md:4`、`database-reviewer.md:4` | 引用 `mcp__context7__*`、`mcp__sequential-thinking__*`、`mcp__claude_ai_Airtable__*`，但本 session 嘅工具清單冇呢幾個 server | 按規矩冇讀 `.mcp.json`，無法喺 repo 內證實；請 Fat Mo 核對 |
| F6 | `CLAUDE.md:23` | 路由表指去 `CONTEXT.md` 查「大寶／家庭組合／owner」，但 repo 冇呢個檔 | domain-modeling skill 係有需要先建立（lazy create），唔算被推翻；不過路由表講到好似已經有定義 |
| F7 | `01_diagnosis.md:83`；`FHS_INTEGRATION.md:253` | 「9 個 subagent 全部釘 claude-sonnet-4-6」（已過時嘅病徵）；「由 Claude Opus 4.6 改寫」頁尾 | 診斷檔本身係歷史記錄；頁尾影響低（低信心） |

### 刻意冇標記（keep list）

- **財務強制派工閘**（CLAUDE.md 第 4 紅線、AGENTS「財務派工補充條款」、finance-gatekeeper §〇）：語氣強，但有講明原因（0600804 事故），又有 Stop hook 強制執行，而且係刻意覆寫 harness 預設。保留。
- **NO-TOUCH GUARDRAIL、禁止覆蓋 current.html、HTML ID／captureFormState／Raw_Form_State 禁令**：屬業務同安全約束，保留。
- **canva-auto「Known failure modes」**：係 Canva MCP 嘅工具合約細節，屬 context，保留（只搬走 changelog）。
- **vendor impeccable 設計技能**（frontend-design 等）：「AI slop」清單有逐項列明要避開嘅預設樣式，正正係 Opus 5.5 前端設計嘅有效寫法（1e 例外），保留。
- **Rule 3.16 觸發詞清單、skill description 嘅急迫字眼**：屬路由文字，允許帶校準過嘅急迫感。
- **02 §0「Agent tool 冇 effort 參數」**：同本 session 嘅 Agent tool schema 一致，唔係過時事實。

## 3. 套用方法

```bash
git apply --check .fhs/reports/planning/2026-09-29_prompt-audit/proposed.diff
```

- 每個 hunk 對應一項發現，可以揀住套。H5、M8 係財務檔，照紅線套用後要派 `finance-auditor` 做 read-back。
- 套用 H8、H10、M9 之後，`~/.claude/agents/freehandsss/` 嘅 runtime 副本要照 05 權限矩陣同步。
- M7／M8 會新增 `.fhs/notes/changelogs/`，照「文件同步強制律」要同步更新 `docs/repo-map.md`（diff 未包含，因為 repo-map 屬巨型導航檔，要睇埋當時嘅狀態先改）。
- 驗證方法（Step 7）：過時事實類（H*）逐條重新 `ls`／grep 就得；M1、M9 屬行為改動，建議套用後觀察一兩個 session 有冇回歸（例如 code-reviewer 報告係咪仍然覆蓋晒 5 個維度）。
