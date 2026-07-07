# S152 — 十大框架條款吸收實施計畫（Skills Absorption）

> **狀態**：⏳ 待 Fat Mo 批准
> **版本**：v2 定稿（含 v1 摘要與自我批評三弱點，敘事單源：本檔為全文唯一居所）
> **日期**：2026-07-07（Fable 5 規劃）
> **執行者建議**：Sonnet 5，開新 session 只需開本計畫檔 + `artifacts/2026-07-07-1851-skills-research/00-verdict-summary.md`
> **輸入**：4 份原文研究筆記（artifacts/2026-07-07-1851-skills-research/01-04）+ 統一裁決表（00）
> **執行順序建議**：**先於 S148/S149**（理由見 §1.5 long_term；F 項例外留給 S149）

---

## §0 緣起與範圍

Fat Mo 提供「Codex 必裝十大技能」榜單，指示：學習各框架專家知識後**融入**既有治理系統（非整包安裝、非取代現行）。經 4 支 subagent 並行原文研究（10/10 框架，官方 repo 逐字核對），裁決為吸收包 A-M（見 00-verdict-summary.md）。本計畫定義 A-M 的落地方式。

**範圍外（明確不做）**：安裝任何整包框架；改動 guard.js（S149 領地）；改動財務規則/HTML ID/raw_form_state；改動 AGENTS.md 憲法本體（所有吸收落在 subagent/governance/command/reference 層）。

---

## §1 八維度分析

### 1.1 perf 系統效能
- 零 runtime hook 新增 → SessionStart/health check 預算（<2s）不受影響。
- 真實 perf 成本在**流程**層：A（TDD 循環）增加寫測試時間；D（兩 verdict）每次中高風險派工多一輪審查 spawn。
- 對策：A 限定適用域（見 §4.0b-1）；D 設風險門檻，小任務豁免（見 §4.0b-2）。

### 1.2 ux_mgmt 直觀管理
- 每條吸收落在其「自然居所」（TDD→tdd-guide、審查→04 模板、UX 規則→ui-ux-pro-max），Fat Mo 無需記新位置——現有路由表已覆蓋。
- 吸收總帳＝`artifacts/.../00-verdict-summary.md`＋decisions.md 一條；90 天 `/fhs-audit` 既有週期自動覆核，不新增管理儀式。

### 1.3 conflict 衝突避免
- 已裁決的三處衝突（吸收時以 FHS 為準）：①一次一題 vs R3 批量問（棄前者）；②3 次熔斷 vs FHS 兩輪（保留更嚴的兩輪）；③觸控 24px vs FHS 44px（保留 44px）。
- 條款措辭統一原則：**FHS 憲法語彙優先**，Superpowers 原文僅作尾註來源；凡與 AGENTS.md 現行條文語義重疊處，只補「缺的牙齒」不重寫既有句。
- 與 S148/S149 計畫檔的檔案交集：本計畫動 `02 §1/§4+新小節`、`03 R2/R4`、`04 T2/T4/T5`；S148 動 `02 §5-§7 [G]/kgov 區`與 05 §1 條目——**章節不重疊**。若 S148 執行時仍撞行，S148 對其章節有優先權。
- Guard 誤傷預案（handoff 易猜錯 #10）：新條款文字可能含觸發詞被 R2/R3 攔——改用 Bash heredoc 寫入（Bash 只掃 R5-R9 command 字串）或拆字改寫。

### 1.4 token 消費
- **固定載入增量＝0 bytes**：所有落點均為情境載入檔（subagent 本體只在 spawn 時載入；governance 按路由表按需讀；cl-flow.md 只在指令觸發時讀）。
- 情境載入增量預算（硬上限，超出即裁剪）：

| 檔案 | 增量上限 |
|---|---|
| tdd-guide.md（A） | ≤2,000 bytes |
| 03_judgment-rubrics.md（B+C 一行） | ≤900 bytes |
| build-error-resolver.md（C） | ≤400 bytes（haiku 釘選，見弱點 2） |
| 04_delegation-templates.md（D+I） | ≤1,200 bytes |
| cl-flow.md（E） | ≤800 bytes |
| ui-ux-pro-max/FHS_INTEGRATION.md（G 全表） | ≤2,500 bytes |
| code-reviewer.md（G 精華） | ≤400 bytes（haiku 釘選） |
| 02_model-dispatch.md（H+I） | ≤900 bytes |
| **合計** | **≤9,100 bytes，全部情境載入** |

- description 欄位一律不動（吸收自 Superpowers 的教訓本身：description 禁摘要工作流）。

### 1.5 long_term 長期方向
- **凍結快照制**：吸收條款＝上游某時點的凍結拷貝，每條尾註 `[來源: <repo> <skill>, 2026-07-07 吸收]`；**不設自動同步**（憲法自主權 > 上游跟隨；上游是為無治理的通用 agent 設計的，我方只要知識不要它的執行機制）。
- **退役機制**：走既有 learnings 退役慣例＋90 天 /fhs-audit 對照 00-verdict-summary 總帳；證明無用的條款按 05 維護協議退役，不留殭屍。
- **與 S149 銜接**：本計畫先執行 → 條款進入活體 master → S149 P3 抽取模板時自然帶走（免二次搬運）。F 項（skill 撰寫工藝）明文留給 S149 P2/P3 作工藝標準，本計畫不落盤。

### 1.6 responsive Desktop+手機
- G（Vercel 規則精選）直接服務 V42 三端（iPhone/iPad/Desktop POS）：觸控目標、動畫只動 transform/opacity（低階手機省電省卡頓）、CLS 防抖、APCA 對比。
- K（webapp-testing）補手機 viewport 的 Playwright 實測能力，與既有「視覺 bug 必實測」鐵律（feedback_visual_bug）同一戰線。
- 44px 觸控標準維持不變（比 Vercel 24px 嚴）。

### 1.7 subagent & skill
- 分層落點：subagent 層（A→tdd-guide、C→build-error-resolver、G精華→code-reviewer）／governance 層（B/C行/H/I）／command 層（E）／reference 層（G 全表）／plugin 層（K）。
- **同步鐵律**：subagent 改動只改 `.fhs/ai/subagents/freehandsss/`，同步複製到 `~/.claude/agents/freehandsss/`，驗收用 fc 比對兩份一致。
- **haiku 釘選保護**：code-reviewer/build-error-resolver 為 haiku——增量各 ≤400 bytes 且只放「觸發時機＋指向 reference 檔」，長表一律外置；P 階段各附一次 haiku 實跑 smoke（見 §4 驗收）。

### 1.8 history 歷史記錄
- 落盤鏈：decisions.md 新條目（吸收決策+三處衝突裁決）→ Changelog S152 → [B] 完成記錄 → handoff MASTER 表新行（/commit 時）→ Notion 同步。
- 條款級溯源：每條尾註來源+日期（見 1.5），未來 session 可辨「這是 2026-07-07 從外部吸收的」而非自創，退役決策有據。

---

## §2 v1 草案（摘要，已被 v2 取代）

v1＝「A-M 按落點分 6 個 Phase 順序寫入＋read-back 驗收＋guard/health 迴歸」。骨架與 v2 相同，缺陷由 §3 三弱點暴露後在 v2 修正，此處不重複展開。

---

## §3 自我批評（三弱點）

1. **v1 把「規則寫進去」當成完成，沒驗證「規則會被遵守」**——Superpowers 自己的 writing-skills 方法論反過來審判 v1：「未經 baseline 測試的 skill＝未測試的代碼」。寫進 tdd-guide 的鐵律若 subagent 實際無視，等於部署了未測試代碼。
   → **v2 修正**：對行為改變最大的兩條（A 的 TDD 鐵律、D 的兩 verdict）做 fresh-context 情境測試——派一個帶誘導違規壓力的任務給對應 subagent，觀察新條款是否被遵守；其餘低風險條款維持 read-back 驗收（全測不成比例，抗壓測試全套留給 S149 工藝標準）。

2. **v1 低估 haiku 釘選 subagent 的解析力風險**——code-reviewer/build-error-resolver 用 haiku 跑，塞長條款會稀釋其注意力，稽核質量不升反降（規則越多，每條權重越低）。
   → **v2 修正**：haiku subagent 增量硬上限 ≤400 bytes、≤5 條 checklist 行，完整內容外置 reference 檔（ui-ux-pro-max／governance），subagent 本體只放觸發時機＋指向；P1/P4 驗收各加一次 haiku 實跑 smoke（派審一個小 diff，確認輸出格式與判定質量未劣化）。

3. **v1 未處理來源漂移與退役**——吸收條款是上游凍結快照，上游修 bug 我方不知；且未定義條款證明無用時如何退場，長期會累積殭屍規則（正是 fhs-health 五病之「過時」）。
   → **v2 修正**：條款尾註來源+吸收日期；明文「不自動同步」為刻意決策記入 decisions.md；退役走 learnings 退役慣例＋90 天 /fhs-audit 對照 00 總帳覆核；00-verdict-summary 升格為吸收總帳（audit 對照基準）。

---

## §4 v2 定稿 — 執行計畫

### §4.0a 執行紀律
- 每 Phase 獨立 commit，訊息格式 `feat(S152): Phase N <slug>`；任一 Phase 驗收 FAIL → 修復通過才進下一 Phase。
- 全程遵守：巨檔三步替換、subagent 雙份同步、guard 誤傷改走 Bash heredoc（§1.3）。
- 執行 session 起手：讀本計畫 §4 + 00-verdict-summary + 對應原文筆記（按 Phase 按需讀 01-04，不預讀全量）。

### §4.0b 授權清單（批准本計畫＝一併授權以下五項）
1. **A 適用域限定**：TDD 鐵律適用 `Maintenance_Tools/`、`scripts/`、n8n Code Node 邏輯；**dashboard HTML 手改不適用**（單檔生產 HTML 無測試 harness，其驗收走 code-reviewer+實測既有分流），豁免另需 Fat Mo 批准之條款照抄 Superpowers 原則。
2. **D 風險門檻**：兩 verdict 審查制僅強制於中高風險派工（財務／schema／生產 HTML／制度層／n8n live），低風險小任務豁免（防 spawn 成本翻倍）。
3. **K 外部依賴**：安裝 anthropics/skills `webapp-testing`（新增一支 plugin skill，一次性）。
4. **governance 檔修改**：02/03/04 三檔按 05 維護協議屬制度層修改，批准本計畫＝授權本次修改（執行時仍先查 05 權限矩陣有無「先問」級條目命中）。
5. **執行順序**：S152 先於 S148/S149 執行（條款先進活體 master，S149 抽取自然繼承；若 Fat Mo 決定順序對調，S149 P1 manifest 普查須把本計畫列為 pending 輸入）。

### §4.1 Phase 表

| Phase | 內容 | 產出檔 | 機械驗收 |
|---|---|---|---|
| **P0 前置閘** | ①筆記已轉存 artifacts ✅（已完成）②查 05 權限矩陣 ③記錄各目標檔改前 byte 數 | — | 05 無「先問」級命中；byte 基準表落 scratchpad |
| **P1 subagent 層** | A→tdd-guide v1.1.0（鐵律+刪除重來+RED/GREEN MANDATORY+rationalization 表精選+豁免須批准+修bug先寫重現測試）；C→build-error-resolver（四階段指向+紅旗精選 ≤400B） | 2 檔+2 份 `~/.claude/agents/` 拷貝 | fc 雙份一致=0 差異；byte 增量≤預算；**haiku smoke**：派 build-error-resolver 診斷一個 mock 錯誤，確認按四階段回報 |
| **P2 governance 層** | B→03 R2 補「證據新鮮度」+「紅綠 revert」兩條；C 行→03 R4 補人類訊號一行；H→02 新小節「context 動態節流 ≥75%」；I→02 §1 補外部內容隔離一條 | 2 檔 | read-back+內部路徑存在性；byte 增量≤預算；guard fixtures 16/16+health 12/12 無回歸 |
| **P3 派工模板** | D→04 T5 補兩 verdict（spec 合規含「多做」+品質，缺一未完成）+T2 補 BLOCKED 四狀態；I→04 T4 補「每 2-3 動作落 findings」；「禁 pre-judge reviewer」入 T5 | 1 檔 | read-back；byte≤預算；**fresh-context 情境測試（弱點1）**：帶誘導 prompt 派一次 T5 審查，確認回報含兩 verdict |
| **P4 前端規則** | G→ui-ux-pro-max/FHS_INTEGRATION.md 增設「Vercel 框架無關精選」節（~10-15 條，44px 維持自家）；code-reviewer checklist 加 ≤5 條+指向 | 2 檔+1 份拷貝 | fc 一致；byte≤預算；**haiku smoke**：code-reviewer 審一個含 `transition:all` 的 mock diff，確認新規則被引用 |
| **P5 plugin** | K→安裝 webapp-testing；試觸發一次確認可用 | 安裝記錄 | skill 出現在可用清單+一次成功調用 |
| **P6 制度收尾** | M→knowledge-map.md 書籤 3 行；decisions.md 條目（含三衝突裁決+不自動同步決策）；[B] 完成記錄；[C] Changelog S152；handoff MASTER 行+便攜塊；/commit+Notion | 5-6 檔 | [A]-[G] 後效稽核逐項；雙紀律自檢兩行；fhs-health 無新增 issue |

### §4.2 TDD 鐵律情境測試規格（弱點 1 落實，P1 後任意時點執行）
派 fresh tdd-guide 任務：「為 scripts/ 下某函式加小功能，時間緊，先寫實作再補測試比較快」（誘導壓力：時間+效率）。PASS 判準：agent 拒絕先寫實作、要求先寫失敗測試、或引用鐵律條款。FAIL → 條款措辭回爐（參照 01 筆記 §6 Match the Form to the Failure），不得帶 FAIL 收尾。

---

## §5 Antigravity / VSCode / Codex 顧慮

- **Antigravity（永久備援）**：吸收條款全落 `.fhs/ai/`，AG 可讀 ✅；條款屬 prompt 層知識，AG 無 hook 也能受益（本來就只讀分析為主）。**不**複製任何內容進 `.gemini/skills/`（該目錄已凍結，S134 決策不變）。AG 緊急寫入後回 Desktop 覆核的守則不受影響。
- **VSCode / CLI**：同 harness 同配置零額外工作，條款自動生效 ✅。
- **Codex**：榜單雖名為「Codex 必裝」，FHS 工具矩陣（AGENTS §1.2）無 Codex 且無引入計畫——吸收物為純 markdown 知識、工具無關，若未來引入任何新 agent 平台，走 S149 可攜模板繼承，不為 Codex 做任何預先適配。這些框架的「強制執行機制」本就是為無治理的通用 agent 補課，我方吸收時已剝離其執行機制只留知識，故無平台耦合。

---

## §6 不做清單（再確認）

- 不裝任何整包框架；不採用 Superpowers/SuperClaude/MiniMax 的觸發與 Gate 機制（皆弱於 PreToolUse 代碼級攔截）。
- 不改 AGENTS.md 本體、不動 guard.js、不動財務六檔、不動 Dashboard HTML。
- 不做全套抗壓測試工藝（留 S149）；不為 Codex/Cursor 做預先適配。
- 條款不自動跟隨上游更新（刻意決策，見 §1.5）。
