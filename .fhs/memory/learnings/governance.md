# Learnings — 治理 / 多代理 / 文件制度

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：15）。

---

## Patterns

1. Subagent 單一職責：database-reviewer=靜態 schema；finance-auditor=Live 動態驗證，兩者正交不互換 — 源自 2026-05-10 `@governance` <!-- v:2026-05-10 -->

## Pitfalls

1. **要唔要一次性授權旗標，睇「檢查本身能否構成驗證」**：R1/R9 護 current.html 要 `.deploy-ok`，因「部署授權」機械層驗證唔到只能人手發鑰匙；R13 護 handoff 唔需要，因「日期戳係咪今日」係客觀可讀事實。能自驗嘅閘唔好加旗標——旗標即係自我授權漏洞入口 — D68 2026-08-21 `@governance` <!-- v:2026-08-21 -->
2. **既有「不可配置」的平台限制認定需定期複驗**：S51 判定「Obsidian dot-directory 永遠不可見」為不可配置硬限制，S137 實測外掛 `hidden-folders-access` 白名單機制即可解除（含大檔 handoff.md/多檔 lessons/ 皆無效能問題），限制認定已推翻。過往結論標「不可配置」時應附查證日期，逾期重大決策前先花 10 分鐘 WebSearch 複驗，見 decisions.md D4 — Session 137 `@governance` <!-- v:unknown -->
3. **文件是否停更不能只看 frontmatter `last_updated`**：`docs/CHANGELOG.md` frontmatter 標 `last_updated: 2026-06-05`，但內文實際含 2026-07-01 的 S130 條目——metadata 比內容還舊，若只讀 frontmatter 會誤判停更時間點。判斷任一文件是否過時，須比對其**最新一條實際內文日期**，而非宣稱的 metadata 欄位 — Session 138 `@governance` <!-- v:unknown -->
4. **【高頻 ⚠️】互動式改 `current.html` 期間，`freehandsss_dashboardV42.html`（dev source）會悄悄漂移**：連續多輪功能改動全部直接寫落 `current.html`（因為即時 browser dev preview 只讀呢個檔），事後先發現 V42.html 完全冇跟住改——下次 `/upload-web` 無參數升格流程會 `cp V42.html → current.html`，一次過洗走全部本次修復。用 `git diff current.html | sed 改路徑 | patch -p1` 補回 V42 可行且快，但依賴人手記得做。凡連續多輪 Edit 只針對 `current.html`，`/commit` 前必須先 `diff` 兩檔確認同步，或改埋 V42.html 先算完工 — Session 2026-07-23 [[project_governance_portability_plan]] `@governance` <!-- v:2026-07-23 -->
5. **健檢/監控腳本嘅 PASS 判準必須覆蓋「實際地面真相」，唔可以只信子程序 exit code**：`/fhs-check` 連續多輪回報「全部通過」，但真因係測試腳本內部一個短路邏輯 bug（CREATE 驗證失敗會跳過後續驗證仲印假成功訊息 + exit 0），令 Supabase 憑證 401 嘅生產故障隱藏咗 5 日。加咗偵測層（掃 stdout 警告字串）後首跑即證實：**新警報第一次觸發必須逐個案追到底確認「係咪指向真問題」，唔可以見一個案例修好就收工**——恆定 DEGRADED 同恆定 PASS 一樣會造成警報疲勞（同一種失效模式）。逐案追查反而再揪出兩個獨立舊 bug（RPC 邏輯漏洞、測試夾具過時）。判斷「案例應唔應該落地」呢類語義問題，唔好憑猜測/命名推斷，直接寫探針逐個案實測真實行為，用實測結果定案 — D62/D63/2026-08-11 [[project_n8n_supabase_401_credential_incident]] `@governance +n8n +tooling` <!-- v:2026-08-11 -->
6. **【高頻 ⚠️】安全類修復唔可以一輪收工——實測連續 4 輪對抗式審查，每一輪都揪到真問題，其中兩輪推翻咗主對話自己嘅核心設計前提**：V42 XSS 整治派咗 4 次 `code-reviewer`（opus/fresh context/T5 模板），命中率 4/4：第 1 輪揪出主對話漏咗第三個同源出口（交付提醒清單）；第 2 輪推翻「IG 係唯一外部入口」前提（刻字亦係客人提供，經另一條路入 DOM）；第 3 輪揪出主對話啱啱寫嘅換行修復係 **no-op**（源碼跳脫層數錯，睇代碼睇唔出）；第 4 輪揪出「正規化資料」方案會令 DB PATCH 靜默命中 0 行。**通則**：①「已修好」嘅自我判斷喺安全類任務上系統性偏樂觀，因為修復者同時係漏洞成因嘅共同作者，會沿用同一套錯誤前提；②每輪 prompt 要明寫「上一輪你揪到乜、我點修」，等審查員可以查修補本身而唔係重頭掃；③收工訊號唔係「審查話 PASS」，而係**逐欄位／逐語境嘅實測掃描全綠**（本次為 10 個 DB 欄位 × 2 條渲染路徑 = 零注入），審查只係用嚟揾出「你未諗到要掃邊個欄位」 — 2026-08-09 `@governance +frontend` <!-- v:2026-08-09 -->
7. **grep sweep 嘅「必查清單」本身可以就係漏嘅源頭，唔止靠記憶寫低嘅清單先會漏**：finance-gatekeeper §三B 第4步（D46/D47 事故後新增）要求新增財務欄位時 grep 兄弟欄位確認同步，並列明至少必查 5 份文件（Finance Bible/Product_Definition/Cost Schema v2/Quadruple_Sync_Field_Map/finance-gatekeeper 路由表）——但呢張「機制化」清單本身冇列 `finance-auditor.md`/`database-reviewer.md` 兩個 subagent 定義檔案，令 `accessory_cost`（2026-07-25 導入）喺呢兩個稽核邏輯檔案入面漏咗超過 3 星期都冇被揪到，直至下一輪 grep sweep 意外掃到先發現。教訓：機制化清單本身要定期問「呢張清單漏咗邊類消費者」，唔可以將「已經寫成清單」當「已經窮盡」——尤其係「稽核邏輯本身」（subagent 定義、驗證腳本）呢類消費者，容易被漏因為佢哋唔屬於「業務規則文件」直覺分類。建議：finance-gatekeeper SKILL.md §三B 第4步清單補加「9支subagent定義檔」一項，待 Fat Mo 確認後執行（05_maintenance-protocol.md 權限矩陣未明確覆蓋此檔，保守起見未自行改動）。— 2026-08-16 見 decisions.md D46/D47、`FHS_System_Logic_Overview.md` §5.4.7 補記 `@governance +finance` <!-- v:2026-08-16 -->
8. **【高頻 ⚠️】`handoff.md` 係 git 追蹤檔案，內容屬「分支局部」——只要有未 merge 嘅分支，交接狀態就必然有失同步窗口，加幾多寫入紀律都補唔到**：便攜塊被定為交接 SSOT（S118），但佢實體係一個 repo 內檔案，SessionStart hook 讀 `$PROJECT_DIR/.fhs/memory/handoff.md`＝**當前 checkout 分支嗰份**。全新雲端容器 checkout 預設分支（main），而實際工作喺 feature 分支進行、handoff 亦喺嗰邊更新——於是 main 上嘅便攜塊凍結喺上次 merge 嗰刻，新 session 讀到就係過時狀態。2026-08-18 實測：`main` 寫「D65 等緊 `/execute`」，同日 `claude/d65-family-owner-role` 分支寫「D65續IV 已部署，優先追問新定價規則」，同一檔案便攜塊 12 行全部唔同；本 session 據 main 版本重新規劃咗一次已完成並已部署嘅工作（PR #3）。**關鍵判斷**：歷來三次修復（S118 SSOT化／S144 五處寫同一件事／D60 時限待辦漏帶）全部係**內容/紀律層**（改「寫乜」同「寫幾多處」），故對此症零效果——d65 session 紀律其實完美（四個「續」各有 `docs: sync` commit 更新 handoff），問題喺**讀取端**唔喺寫入端。診斷任何「反覆修都唔好」嘅制度病，先問「之前嘅修復落喺邊一層」，唔好第四次再修同一層 — 2026-08-18 見 decisions.md D60/S118/S144、`scripts/hooks/session-start-sop.sh`。**2026-08-21 D68 續**：D66 補嘅讀取層修復仍然唔夠——因為佢係**事後偵測**（警告要下一個 session 開場先見到）。實測 D67(08-19)/D66-follow(08-20) 兩次 `/commit` 都更新咗內容但便攜塊頂部日期戳連續三日凍結。真正真空喺**寫入時點**：`commit.md` P0.7 白紙黑字寫「必須更新至今日日期」但純屬散文，冇嘢會攔，等於冇規則。已加 `pre-tool-guard.js` R13 攔 `git commit`。**完整層級檢查表**：內容層（寫乜）→ 紀律層（寫幾多處）→ 讀取層（幾時睇到）→ **寫入層（幾時攔）**；偵測 ≠ 攔截，事後 ≠ 事前，散文 ≠ 強制 `@governance +tooling` <!-- v:2026-08-21 -->

## Preferences

1. **Skill vs Subagent：規則 context 問題用 Skill**：「忘記財務/業務規則」是 context 沒帶規則進來的問題，解法是 Skill（task 開始前 load）；Subagent 是 spawn 出去做事，無法解決 AI 呼叫前不知道規則的問題 — 源自 2026-06-01 `@governance` <!-- v:2026-06-01 -->
2. **文件權威＝被使用（路由）＋被保養（合約），非自我聲明**：一份文件自稱「必讀/核心真相」不會令 AI 真的讀它——若無任何 hook/CLAUDE.md 路由表/查詢路由指向它，且無任何 execute.md 後效稽核合約要求同步它，它會腐爛而無人發現（FHS_Blueprint.md 案例：13 處過時、含財務事故誤讀源頭寫法，腐爛一個月無 session 察覺）。新建「必讀文件」前必須同時掛路由+寫回合約，否則寧可不留（S158 Fat Mo 裁決：無合約支撐的內容應遷至有真讀者處，而非降級留存） — S158 `@governance` <!-- v:unknown -->
3. **多代理管道應派缺 context 存取嘅模型做評審／red-team，唔好派佢做作者**：A1/A2 從零盲寫計劃反覆幻覺（假路徑/假角色/假 API），改做評審已有真實草案的角色後準確率大升——錯誤殺傷力亦由「作者錯要重寫」降為「評審錯唔採納就算」。日後設計任何多模型協作管道，先問邊個模型有 repo/現況存取，冇存取嘅只可以做評審唔可以做作者 — D39/S176 2026-07-16 `@governance` <!-- v:2026-07-16 -->
4. **人類直覺「completion＝主線已同步」值得實現，但只喺技術上零風險（fast-forward-only）先自動做，唔可以做「naive 每次自動合併」**：Fat Mo 質疑「打 commit 就代表任務完成，是否應該等同自動落 main」，落手前先查證而非直接照做——揪出本 repo 常態同時有多條 worktree 並行、`handoff.md` 幾乎每個 commit 都改到同一區塊、且已有真實「分支合併事故」先例（2026-09-03，一分支連續部署冇核對時間戳覆寫另一分支 31 輪成果）。故只做 git 底層保證零風險嘅子集（`merge-base --is-ancestor` 判斷 + fast-forward push），main 已被搶先就停低等人手，唔追求「每次都自動」嘅表面完整。**通則**：實現一個符合直覺嘅自動化功能前，先查現況是否真係「邊緣情況罕見」，唔可以假設；一旦查到已有真實事故先例，自動化範圍就要收窄到「物理上不可能靜默遺失資料」嗰個子集 — D70 2026-09-05 `@governance` <!-- v:2026-09-05 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `supabase.md` #12 【高頻 ⚠️】規則系統由「thread 級」擴展成「全域生效」時，原有嘅「訊息內容存在」防偽護欄唔再夠——要問清楚呢個護欄嘅資料源頭本身係咪受同一信任邊界保護
- → `n8n.md` #7 【高頻 ⚠️】n8n Code node 預設封鎖環境變數存取（`N8N_BLOCK_ENV_ACCESS_IN_NODE`）——見到「secret 硬編碼 + 防禦性 try/catch 包住 env 讀取」呢個組合，唔好當疏忽，要當「env 存取曾經失敗過」嘅訊號
- → `tooling.md` #6 【高頻 ⚠️】Git worktree session 入面，絕對路徑漏咗 worktree 前綴會靜默錯改主倉，Read/Edit 完全唔會報錯
<!-- POINTERS:END -->
