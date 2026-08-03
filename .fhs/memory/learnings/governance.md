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

## Preferences

1. **Skill vs Subagent：規則 context 問題用 Skill**：「忘記財務/業務規則」是 context 沒帶規則進來的問題，解法是 Skill（task 開始前 load）；Subagent 是 spawn 出去做事，無法解決 AI 呼叫前不知道規則的問題 — 源自 2026-06-01 `@governance` <!-- v:2026-06-01 -->
2. **文件權威＝被使用（路由）＋被保養（合約），非自我聲明**：一份文件自稱「必讀/核心真相」不會令 AI 真的讀它——若無任何 hook/CLAUDE.md 路由表/查詢路由指向它，且無任何 execute.md 後效稽核合約要求同步它，它會腐爛而無人發現（FHS_Blueprint.md 案例：13 處過時、含財務事故誤讀源頭寫法，腐爛一個月無 session 察覺）。新建「必讀文件」前必須同時掛路由+寫回合約，否則寧可不留（S158 Fat Mo 裁決：無合約支撐的內容應遷至有真讀者處，而非降級留存） — S158 `@governance` <!-- v:unknown -->
3. **多代理管道應派缺 context 存取嘅模型做評審／red-team，唔好派佢做作者**：A1/A2 從零盲寫計劃反覆幻覺（假路徑/假角色/假 API），改做評審已有真實草案的角色後準確率大升——錯誤殺傷力亦由「作者錯要重寫」降為「評審錯唔採納就算」。日後設計任何多模型協作管道，先問邊個模型有 repo/現況存取，冇存取嘅只可以做評審唔可以做作者 — D39/S176 2026-07-16 `@governance` <!-- v:2026-07-16 -->

<!-- POINTERS:BEGIN — 本區由 scripts/learnings-pointers.js 生成，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
（本桶目前無跨領域條目）
<!-- POINTERS:END -->
