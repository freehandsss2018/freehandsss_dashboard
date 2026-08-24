# Learnings — 治理 / 多代理 / 文件制度

> 由 `.fhs/memory/learnings.md` 分桶重構遷入（2026-08-03，flow `2026-08-03-2003`）。
> 制度說明、配額規則、tag 語法、退役 checklist 全部見 [README.md](README.md)，本檔只放內容。
> 全檔上限見 README 配額表（本桶：15）。

---

## Patterns

1. Subagent 單一職責：database-reviewer=靜態 schema；finance-auditor=Live 動態驗證，兩者正交不互換 — 源自 2026-05-10 `@governance` <!-- v:2026-05-10 -->

## Pitfalls

1. **既有「不可配置」的平台限制認定需定期複驗**：S51 判定「Obsidian dot-directory 永遠不可見」為不可配置硬限制，S137 實測外掛 `hidden-folders-access` 白名單機制即可解除（含大檔 handoff.md/多檔 lessons/ 皆無效能問題），限制認定已推翻。過往結論標「不可配置」時應附查證日期，逾期重大決策前先花 10 分鐘 WebSearch 複驗，見 decisions.md D4 — Session 137 `@governance` <!-- v:unknown -->
2. **文件是否停更不能只看 frontmatter `last_updated`**：`docs/CHANGELOG.md` frontmatter 標 `last_updated: 2026-06-05`，但內文實際含 2026-07-01 的 S130 條目——metadata 比內容還舊，若只讀 frontmatter 會誤判停更時間點。判斷任一文件是否過時，須比對其**最新一條實際內文日期**，而非宣稱的 metadata 欄位 — Session 138 `@governance` <!-- v:unknown -->
3. **【高頻 ⚠️】互動式改 `current.html` 期間，`freehandsss_dashboardV42.html`（dev source）會悄悄漂移**：連續多輪功能改動全部直接寫落 `current.html`（因為即時 browser dev preview 只讀呢個檔），事後先發現 V42.html 完全冇跟住改——下次 `/upload-web` 無參數升格流程會 `cp V42.html → current.html`，一次過洗走全部本次修復。用 `git diff current.html | sed 改路徑 | patch -p1` 補回 V42 可行且快，但依賴人手記得做。凡連續多輪 Edit 只針對 `current.html`，`/commit` 前必須先 `diff` 兩檔確認同步，或改埋 V42.html 先算完工 — Session 2026-07-23 [[project_governance_portability_plan]] `@governance` <!-- v:2026-07-23 -->
4. **健檢/監控腳本嘅 PASS 判準必須覆蓋「實際地面真相」，唔可以只信子程序 exit code**：`/fhs-check` 連續多輪回報「全部通過」，但真因係測試腳本內部一個短路邏輯 bug（CREATE 驗證失敗會跳過後續驗證仲印假成功訊息 + exit 0），令 Supabase 憑證 401 嘅生產故障隱藏咗 5 日。加咗偵測層（掃 stdout 警告字串）後首跑即證實：**新警報第一次觸發必須逐個案追到底確認「係咪指向真問題」，唔可以見一個案例修好就收工**——恆定 DEGRADED 同恆定 PASS 一樣會造成警報疲勞（同一種失效模式）。逐案追查反而再揪出兩個獨立舊 bug（RPC 邏輯漏洞、測試夾具過時）。判斷「案例應唔應該落地」呢類語義問題，唔好憑猜測/命名推斷，直接寫探針逐個案實測真實行為，用實測結果定案 — D62/D63/2026-08-11 [[project_n8n_supabase_401_credential_incident]] `@governance +n8n +tooling` <!-- v:2026-08-11 -->
5. **【高頻 ⚠️】安全類修復唔可以一輪收工——實測連續 4 輪對抗式審查，每一輪都揪到真問題，其中兩輪推翻咗主對話自己嘅核心設計前提**：V42 XSS 整治派咗 4 次 `code-reviewer`（opus/fresh context/T5 模板），命中率 4/4：第 1 輪揪出主對話漏咗第三個同源出口（交付提醒清單）；第 2 輪推翻「IG 係唯一外部入口」前提（刻字亦係客人提供，經另一條路入 DOM）；第 3 輪揪出主對話啱啱寫嘅換行修復係 **no-op**（源碼跳脫層數錯，睇代碼睇唔出）；第 4 輪揪出「正規化資料」方案會令 DB PATCH 靜默命中 0 行。**通則**：①「已修好」嘅自我判斷喺安全類任務上系統性偏樂觀，因為修復者同時係漏洞成因嘅共同作者，會沿用同一套錯誤前提；②每輪 prompt 要明寫「上一輪你揪到乜、我點修」，等審查員可以查修補本身而唔係重頭掃；③收工訊號唔係「審查話 PASS」，而係**逐欄位／逐語境嘅實測掃描全綠**（本次為 10 個 DB 欄位 × 2 條渲染路徑 = 零注入），審查只係用嚟揾出「你未諗到要掃邊個欄位」 — 2026-08-09 `@governance +frontend` <!-- v:2026-08-09 -->
6. **grep sweep 嘅「必查清單」本身可以就係漏嘅源頭，唔止靠記憶寫低嘅清單先會漏**：finance-gatekeeper §三B 第4步（D46/D47 事故後新增）要求新增財務欄位時 grep 兄弟欄位確認同步，並列明至少必查 5 份文件（Finance Bible/Product_Definition/Cost Schema v2/Quadruple_Sync_Field_Map/finance-gatekeeper 路由表）——但呢張「機制化」清單本身冇列 `finance-auditor.md`/`database-reviewer.md` 兩個 subagent 定義檔案，令 `accessory_cost`（2026-07-25 導入）喺呢兩個稽核邏輯檔案入面漏咗超過 3 星期都冇被揪到，直至下一輪 grep sweep 意外掃到先發現。教訓：機制化清單本身要定期問「呢張清單漏咗邊類消費者」，唔可以將「已經寫成清單」當「已經窮盡」——尤其係「稽核邏輯本身」（subagent 定義、驗證腳本）呢類消費者，容易被漏因為佢哋唔屬於「業務規則文件」直覺分類。建議：finance-gatekeeper SKILL.md §三B 第4步清單補加「9支subagent定義檔」一項，待 Fat Mo 確認後執行（05_maintenance-protocol.md 權限矩陣未明確覆蓋此檔，保守起見未自行改動）。— 2026-08-16 見 decisions.md D46/D47、`FHS_System_Logic_Overview.md` §5.4.7 補記 `@governance +finance` <!-- v:2026-08-16 -->
7. **【高頻 ⚠️】`handoff.md` 係 git 追蹤檔案，內容屬「分支局部」——只要有未 merge 嘅分支，交接狀態就必然有失同步窗口，加幾多寫入紀律都補唔到**：便攜塊被定為交接 SSOT（S118），但佢實體係一個 repo 內檔案，SessionStart hook 讀 `$PROJECT_DIR/.fhs/memory/handoff.md`＝**當前 checkout 分支嗰份**。全新雲端容器 checkout 預設分支（main），而實際工作喺 feature 分支進行、handoff 亦喺嗰邊更新——於是 main 上嘅便攜塊凍結喺上次 merge 嗰刻，新 session 讀到就係過時狀態。2026-08-18 實測：`main` 寫「D65 等緊 `/execute`」，同日 `claude/d65-family-owner-role` 分支寫「D65續IV 已部署，優先追問新定價規則」，同一檔案便攜塊 12 行全部唔同；本 session 據 main 版本重新規劃咗一次已完成並已部署嘅工作（PR #3）。**關鍵判斷**：歷來三次修復（S118 SSOT化／S144 五處寫同一件事／D60 時限待辦漏帶）全部係**內容/紀律層**（改「寫乜」同「寫幾多處」），故對此症零效果——d65 session 紀律其實完美（四個「續」各有 `docs: sync` commit 更新 handoff），問題喺**讀取端**唔喺寫入端。診斷任何「反覆修都唔好」嘅制度病，先問「之前嘅修復落喺邊一層」，唔好第四次再修同一層 — 2026-08-18 見 decisions.md D60/S118/S144、`scripts/hooks/session-start-sop.sh` `@governance +tooling` <!-- v:2026-08-18 -->
8. **【高頻 ⚠️】向 Fat Mo 確認「窮舉組合表」時禁止預填 ✅/🚫——AI 嘅預填會變成雙方都冇審視嘅共同前提**：2026-08-22 玻璃瓶大寶定價，AI 自行喺 7 格組合表預填「純大寶＝可能／嬰兒+大寶＝不可能」，Fat Mo 回覆「6、7 同樣不可能」時只逐點確認被問及嗰兩格，冇複核 AI 嘅預填值；結果新價綁咗喺**定義上不存在**嘅組合（令新價永遠觸發唔到），而真正適用嗰格反被標成不可能，migration 0090 全套作廢。根因唔係對方答錯，係預填令錯誤前提冇被任何一方審視。**做法**：①窮舉表交出去前一律留白或標「？」，唔好預填判斷；②涉及業務術語（嬰兒/大寶/父母/成人）嘅組合，**先問清楚術語定義本身**再問組合——相對稱謂（大寶相對嬰兒而存在）會直接消滅一半格數；③對方只回應部分格時，唔可以當其餘格默認同意，要明確追問未覆蓋嘅格 — 2026-08-22 見 decisions.md 2026-08-22 條目、`FHS_System_Logic_Overview.md` §5.4.20 `@governance +finance` <!-- v:2026-08-22 -->

9. **【高頻 ⚠️】同一個 AI 用同一套方法論自查三次仍會漏——驗收財務/生產改動必須改派獨立 fresh-context agent，唔可以再自己查第四次**：D65續IV-follow 玻璃瓶大寶定價，主對話自己核實咗三次「邏輯定義/UI/財務/測試驗收」四項（working tree→committed HEAD→再重複），每次都只查 Dashboard browser + Supabase products 表，從未實際跑 n8n webhook 全鏈路。改派一個完全冇對話記憶嘅 general-purpose agent 用相同四項清單獨立查，第一次就揪出 n8n 節點無條件降級玻璃瓶 SKU、抹走「(家庭)」/「+大寶」後綴嘅真 bug（存在超過一個月）。根因：自查會不自覺沿住之前驗證過嘅路徑再驗一次（同一套「browser+DB」方法論），唔會主動跳去未驗證過嘅層（n8n）；獨立 agent 冇呢個路徑依賴，會用自己嘅理解重新掃一次全部聲稱嘅範圍。日後任何財務/schema/n8n/生產HTML改動，交付後嘅「核實」唔應該由同一個 AI 用同一套方法反覆做，第二次起就應該改派獨立 subagent — 2026-08-24 見 decisions.md 同 Logic_Overview §5.4.21 `@governance +finance +n8n` <!-- v:2026-08-24 -->

10. **對自己前一個 commit 嘅「已同步/已完成」聲明都要保持懷疑，尤其涉及安全敏感內容**：2026-08-24 commit `219dc48` 聲稱「repo內n8n JSON備份檔已同步反映live修復」，實際只喺一份凍結3個月嘅舊快照插咗1行guard，冇真正重新拉取全量資料——備份檔仲殘留住D62/D63已洩漏並撤銷嘅死key文字（8處，其中3處喺一個之前完全未被發現嘅內嵌`activeVersion`歷史快照）。第二輪獨立agent覆核先揪出。**「已同步」呢類斷言，喺冇實際重新拉取全量資料源頭比對之前，唔應該講出口**——單一行 patch唔等於同步，尤其涉及git追蹤檔案入面嘅密鑰殘留呢類安全敏感內容，斷言錯咗嘅代價唔止係文件唔準確，可能係誤導未來讀者以為風險已清除。日後任何「已同步/已完成」聲明前，應該先問「我係咪真係重新攞晒源頭嘅全量資料嚟比對，定係淨係改咗聲稱要改嘅嗰一忽」 — 2026-08-24 見 decisions.md 2026-08-24續條目 `@governance +n8n` <!-- v:2026-08-24 -->

## Preferences

1. **Skill vs Subagent：規則 context 問題用 Skill**：「忘記財務/業務規則」是 context 沒帶規則進來的問題，解法是 Skill（task 開始前 load）；Subagent 是 spawn 出去做事，無法解決 AI 呼叫前不知道規則的問題 — 源自 2026-06-01 `@governance` <!-- v:2026-06-01 -->
2. **文件權威＝被使用（路由）＋被保養（合約），非自我聲明**：一份文件自稱「必讀/核心真相」不會令 AI 真的讀它——若無任何 hook/CLAUDE.md 路由表/查詢路由指向它，且無任何 execute.md 後效稽核合約要求同步它，它會腐爛而無人發現（FHS_Blueprint.md 案例：13 處過時、含財務事故誤讀源頭寫法，腐爛一個月無 session 察覺）。新建「必讀文件」前必須同時掛路由+寫回合約，否則寧可不留（S158 Fat Mo 裁決：無合約支撐的內容應遷至有真讀者處，而非降級留存） — S158 `@governance` <!-- v:unknown -->
3. **多代理管道應派缺 context 存取嘅模型做評審／red-team，唔好派佢做作者**：A1/A2 從零盲寫計劃反覆幻覺（假路徑/假角色/假 API），改做評審已有真實草案的角色後準確率大升——錯誤殺傷力亦由「作者錯要重寫」降為「評審錯唔採納就算」。日後設計任何多模型協作管道，先問邊個模型有 repo/現況存取，冇存取嘅只可以做評審唔可以做作者 — D39/S176 2026-07-16 `@governance` <!-- v:2026-07-16 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `supabase.md` #12 【高頻 ⚠️】規則系統由「thread 級」擴展成「全域生效」時，原有嘅「訊息內容存在」防偽護欄唔再夠——要問清楚呢個護欄嘅資料源頭本身係咪受同一信任邊界保護
- → `n8n.md` #7 【高頻 ⚠️】n8n Code node 預設封鎖環境變數存取（`N8N_BLOCK_ENV_ACCESS_IN_NODE`）——見到「secret 硬編碼 + 防禦性 try/catch 包住 env 讀取」呢個組合，唔好當疏忽，要當「env 存取曾經失敗過」嘅訊號
- → `tooling.md` #6 【高頻 ⚠️】Git worktree session 入面，絕對路徑漏咗 worktree 前綴會靜默錯改主倉，Read/Edit 完全唔會報錯
<!-- POINTERS:END -->
