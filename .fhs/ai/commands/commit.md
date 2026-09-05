# /commit (任務完成 · 全包一條龍)
> Version: v2.6.0 (2026-09-05, D70) | 新增 Phase 2.6 主線同步：Phase 2/2.5 push 完之後，嘗試將目前分支 fast-forward-only 合併落 `main`（`git push origin HEAD:main`）；若 main 自本分支分岔後已有其他 session 搶先落地（非快進），一律跳過並回報，唔做衝突自動解決、唔強推。根源：Fat Mo 指出「commit 完＝任務完成，理應等同 main 已同步」，現行預設要人手再 merge/PR 同呢個直覺唔一致；經查證本 repo 常態有多條 worktree 分支並行（含 2026-09-03「分支合併事故」先例），故只做技術上零風險嘅快進部分，唔做全面自動合併。見 decisions.md D70
> Version: v2.5.0 (2026-08-21, D68) | P0.7 由「散文指示」升格為**機械強制**：`pre-tool-guard.js` 新增 R13 handoff 同步閘，`git commit` 前檢查便攜塊日期戳＝今日且 handoff.md 無未 staged 改動，唔過即 exit 2 攔截。根因：D67(08-19)/D66-follow(08-20) 兩次 `/commit` 都更新咗內容但日期戳三日冇郁——D66 已證「內容·紀律層」修復零效果，SessionStart hook 只做事後偵測，寫入時點一直真空。見 decisions.md D68
> Version: v2.4.0 (2026-08-05) | P0.7 新增第七欄「⏰ 時限待辦」+ MASTER 表列混寫禁令；根因：2026-08-04拷問技能2026-08-09試用閘的日期只落MASTER表未落便攜塊，被「最高優先3條」篩選器結構性漏帶，下個session開場看不見，Fat Mo質詢揭發（見 fhs-health-rules.json deadline_surfacing_checks 新增機械偵測）
> Version: v2.3.0 (2026-07-12, Session 168) | 新增 Phase 2.5 條件觸發升格部署鏈（AGENTS.md v1.7.0 授權途徑c，先偵測 Dashboard HTML 是否有改動才部署）
> 本指令為任務完成之單一入口：包含掃描、同步、備份、推送、（視偵測結果）升格部署。

## 🧩 執行標準 (General Rules)
- **🔴 項目失敗**：立即中斷任務，輸出錯誤並等待修復。
- **🟡 項目警告**：列出清單，詢問 Fat Mo 確認後方可繼續。
- **✅ 項目成功**：靜默通過，記錄於最後報告。

---

## 【Phase 0: Pre-Commit Sweep (健全掃描)】

### P0.1 系統接通確認
- **Hooks**: 確認 `scripts/hooks/` (session-start-sop.sh, prompt-router.js, pre-tool-guard.js) 與 `.claude/settings.json` 存在。
- **Subagents**: 確認 `~/.claude/agents/freehandsss/` 下 8 個主要 agent 存在且非空。
- **🔴 失敗處理**：輸出「❌ 系統接通失敗」，指明缺失項並停止。

### P0.2 文件同步映射
若發生變更，須確認以下對應文件已同步更新：
- `scripts/**` ↔ `scripts/README.md`
- `.fhs/ai/commands/**` ↔ `docs/repo-map.md`
- `Freehandsss_Dashboard/**` ↔ `Freehandsss_Dashboard/README.md`
- 新增/刪除目錄 ↔ `docs/repo-map.md`
- **🟡 警告**：列出未同步清單並確認。

### P0.3 沉積掃描
- **Git Check**: 執行 `git status` 辨識疑似臨時檔 (test_*, fix_*, *_temp, *_draft)。
- **🟡 警告**：列出發現項，確認是否清除。

### P0.4 幽靈偵測
- **Ghost Check**: 比對 `.fhs/ai/commands/` (Master) vs `.claude/commands/` (Bridge)。
- **🟡 警告**：列出發現項，確認是否補全指令橋接。

### P0.5 狀態一致性
- **Changelog.md** & **handoff.md**: 確保在本 session 已更新（若有代碼改動）。
- **.env**: 嚴禁 Staging 包含真實 API Keys。
- **🔴 失敗**：手動改動後未更 Changelog/Handoff 則禁止 commit。

### P0.6 MASTER 待辦同步（新，2026-06-11）
- 讀取 handoff.md 頂部「📋 MASTER 持續待辦」區塊。
- 將本 session 已完成的項目從表中移至「已確認完成」清單。
- 若本 session 產生新待辦，追加至表格。
- **🟡 警告**：MASTER 區塊若不存在，立即補建後繼續。
- **列寫法禁令（新，2026-08-05）**：單一列的「狀態」欄禁止混寫「✅ 已完成主體 + 🟡/🔴 未來待跟進尾巴」（如「✅ 已修復；🟡 附帶發現待核實」）。已完成主體與待跟進尾巴須拆成兩列：完成主體維持原列標 `✅ 完成`；待跟進尾巴另開一列，標對應優先度 emoji（🟡/🔴/⚪），若含具體日期則同步登記到 P0.7 便攜塊「⏰ 時限待辦」。目的：避免 `fhs-health-check.js` 的 `deadline_surfacing_checks` 掃描時誤判整列為「已完成」而放行漏帶（2026-08-04→08-05 事故成因之一：MASTER 表確有記錄，但混寫令逐次 `/commit` 摘要時容易誤讀為「純完成項，免搬便攜塊」）。
- 目的：解決 append-only 歷史積壓導致「持續待辦永遠不更新」的系統性漏洞。

### P0.7 便攜摘要塊更新（新，2026-06-23；2026-08-05 新增第七欄）
- 讀取 handoff.md **最頂部** ` ```handoff ` 便攜塊，逐一核對七類欄位是否反映本 session 最新狀態：
  - `🎯 目標` — 若工作線已轉移，更新
  - `✅ 已定決策` — 本 session 有新拍板決策，追加（保留舊條，加 session 號）
  - `🔬 驗證` — 把本 session「已證實」移入「已證實」清單；新「未驗」加入
  - `📋 待辦` — 對應 P0.6 MASTER 表最高優先 3 條（不含日期，見下一欄）
  - `⏰ 時限待辦`（新，2026-08-05）— MASTER 表中**任何**含具體未來日期的待跟進項（覆核點/scheduled task fireAt/deadline），**不受「最高優先 3 條」上限約束**，只受「日期已過期」約束（過期即移除或轉入 📋 待辦補記結果）。若該待辦靠 scheduled task 兜底，須註明 taskId 供下次一句可驗存活。目的：修補「優先度排序表擠掉時限項」的結構性漏洞（P0.6 MASTER 表本身無問題，問題在於「最高優先3條」篩選只挑優先度不挑日期迫切性）。`scripts/hooks/fhs-health-check.js` 的 `checkDeadlineSurfacing`（第7類健檢）機械偵測此欄是否漏帶，SessionStart 自動跑，非人手記憶負擔。
  - `➡️ 下一步` — 下個 session 第一個行動
  - `更新: <日期> / S<session號>` — 必須更新至今日日期
- **若本 session 無任何狀態改變**（純查詢 session）→ 只更新日期即可。
- **🟡 警告**：便攜塊若不存在，依 decisions.md Session 118 SSOT 機制補建後繼續。
- 目的：確保人類複製（外部聊天）與 hook 自動注入（AI session）始終同源不 drift。

#### P0.7.2 機械強制閘 R13（新，2026-08-21 D68）
> **本節唔係新規則，係上面 P0.7 嘅執行保證。** 之前 P0.7 純散文，AI 記得改內容記唔住改日期標籤（實測 D67／D66-follow 連續兩次中招），故加機械閘。

- **攔截點**：`scripts/hooks/pre-tool-guard.js` R13，PreToolUse 攔 Bash/PowerShell 嘅 `git commit`。
- **兩個條件**（任一不過即 exit 2 擋住 commit）：
  1. 便攜塊頂部 `更新: YYYY-MM-DD` **≠ 今日本地日期**
  2. `handoff.md` 有**未 staged** 嘅改動（改咗但冇 `git add`）
- **幂等**：條件(1)令同一日第二個 commit（如 Phase 2.5 部署 commit）自動過關，唔使開後門 flag——**冇「AI 自我授權」漏洞，檢查本身即係驗證**（對比 R1/R9 要靠 `.deploy-ok` 一次性旗標）。
- **fail-open 邊界**（寧鬆莫死鎖）：`git -C <path> commit` 形式唔命中 regex／git 不可用／讀唔到 handoff／便攜塊格式壞 → 一律放行（格式壞會出警告）。**擋唔到「日期戳啱但內容根本冇更新」**——機械層無法驗證內容新鮮度，呢部分仍靠 P0.7 紀律。
- **逃生口**：`FHS_SKIP_HANDOFF_GATE=1 <git 指令>`，每次繞過記入 `.fhs/notes/deploy-log.md` 供稽核。誤擋情境：指令字串內夾住 `git commit` 字樣（如 `echo "run git commit"`）。
- **測試**：`node scripts/hooks/test/run-handoff-gate-tests.js`（8 案例，獨立 runner——既有 `run-fixtures.js` 用 `FHS_GUARD_FIXTURE=1` 跑，而 R13 喺該旗標下刻意自我跳過，免得所有既有 Bash 夾具突然被擋）。

### P0.7.1 便攜塊體積預算（新，2026-07-04 Session 141 防回胖）
- **背景**：便攜塊設計初衷為 hook 每 session 輕量注入（原估 ~300 tokens），但因「✅ 已定決策」逐 session 只追加不精簡，Session 140 實測動態段已膨脹至 7,787 bytes（~3,500 tokens），超出設計值 10 倍以上。
- **預算**：動態段（hook 抽取的邊界以上部分）目標 **≤ 4,000 bytes**。
- **輪轉規則**：`/commit` 執行 P0.7 時，若「✅ 已定決策」條目數 > 20 條，將**最舊**且已於 `decisions.md`/`AGENTS.md`/本檔 MASTER 待辦表**有完整記錄**的決策，壓縮為「一行摘要＋連結」；若查無其他完整記錄，搬移全文至 `.fhs/memory/archive/handoff-portable-block-decisions-<日期>.md` 並留一行摘要＋連結（禁止直接刪除不留痕）。「🔬 驗證」欄同理，只留最近 3 個 session 的「已證實」項，較舊者搬移至 `.fhs/memory/archive/handoff-portable-block-verified-<日期>.md`；「未驗」項無論哪個 session 一律保留（代表仍是待辦）。「📋 待辦」欄已完成（✅）項若下方 MASTER 表已有對應記錄，直接移除（非歸檔，因 MASTER 表本身即完整記錄，同檔內重複才需清除而非搬移）。
- **不得壓縮**：「⚠️ 易猜錯」欄（踩坑教訓性質，全保留）；本 session 產生的新決策/驗證/待辦（只精簡「舊」的，不精簡「當次」的）。
- **「⏰ 時限待辦」自限規則**：此欄不適用「不得壓縮」豁免——過期項（日期已過）直接移除（若仍待跟進則轉記入 📋 待辦補記結果，不留在此欄），確保此欄天然有上限、不會像「⚠️ 易猜錯」般只增不減。
- **已知緊張**：「⚠️ 易猜錯」全保留（只增不減）與 4,000 bytes 預算兩者長期會結構性衝突——2026-08-05 實測含 17 條踩坑後，即使「✅已定決策」/「🔬驗證」已充分壓縮、新增「⏰時限待辦」僅一行，動態段仍達 4,386 bytes（9.6% 超支）。本次不動「⚠️ 易猜錯」上限（超出本次授權範圍），超支先留存並由健檢機制持續示警；是否調整預算數值或改為「⚠️ 易猜錯」另設獨立輪轉規則，待 Fat Mo 裁決。

---

## 【Phase 1: Memory Engine 同步】
1. **Lessons**: 寫入 `.fhs/memory/lessons/YYYY-MM-DD_主題.md`。
2. **Handoff**: 更新 `.fhs/memory/handoff.md` (強制包含：版本、完成事項、待辦、核心配置)。
   每個 session 完成事項末尾必須附上 **Subagent 使用記錄** 表格（格式見 execute.md [E]）。
3. **Notion**: 執行 `node scripts/Sync_Notion_Brain.js`。
4. **Logs**: 更新 `.fhs/notes/session-log.md`。
5. **Learnings Distillation**: 自動判斷本次會話是否需要 distill Lesson 至 `.fhs/memory/learnings/`（2026-08-03 起分 6 桶，見 Phase 1.5）。

### 【Phase 1.6 敘事單源分級合約（新，2026-07-05 Session 144）】
> **背景**：同一件事同時寫進 handoff session 條目、MASTER 表、session-log、Changelog、completion report 五處，是 S142「MASTER 表遺留 drift」與 S143「/commit 補跑」兩次事故的根因——寫得越多處，越容易漏同步。本節不免除 §3「交接強制」的寫入義務，只約束**寫多細**。

**分級規則**（二選一，依任務規模判斷）：
- **(a) 有 `.fhs/reports/completion/` 完成報告的任務**（制度層變動/[B]觸發）：完成報告＝**唯一全文居所**。`Changelog.md`、`session-log.md`、handoff MASTER 表對應行，一律**≤3 行摘要 + 連結指回該報告**，不得重複展開細節。
- **(b) 無完成報告的小改動**（如純清理、單點修復）：`Changelog.md` 條目本身即**全文居所**（不設行數上限），其餘處（session-log/handoff）只需一行摘要 + 連結指回 Changelog 對應條目。

**判準**：先問「這件事有沒有觸發 execute.md [B]（制度層變動）」→ 有 → 走 (a)；沒有 → 走 (b)。不存在「兩處都寫全文」的第三種情況。

## 【Phase 1.5: Lesson Distillation 自動判斷】

判斷本次會話是否需要 distill Lesson。ONLY 在以下條件滿足時執行：

### 【Pattern 條件】（成功反覆驗證的做法）
- ✓ 本次會話改進了多個 session 都在用的技術模式
- ✓ 該模式已通過至少 2 次以上的不同場景驗證
- *例*：「同步進度輪詢機制」、「四端同步隔離」— 都是跨多個 session 驗證的

### 【Pitfall 條件】（重複踩過的雷）
- ✓ 本次會話的根本問題已被其他 session 踩過，或被文件記錄為 handoff 待辦項
- ✓ 該問題有明確的「預防檢查清單」或「修復方案」
- ✓ 未來新產品/功能很可能會踩到同一個坑
- *例*：「Smart Cache COST_MAP 硬編碼表遺漏」— 對應 handoff #1、P7 pitfall，新 SKU 都會遇到

### 【Preference 條件】（Fat Mo 已確認的偏好）
- ✓ 本次會話涉及架構決策，且 Fat Mo 明確確認了方向
- ✓ 該決策不是臨時的，而是未來多個類似情況都適用
- *例*：「橋接版禁止含邏輯」、「最小改動優先」— 都是跨多個會話的決策方向

### 【執行流程】
1. 檢查本次會話的改動是否屬於上述三種之一 → 若否：靜默跳過
2. 若是 → 判斷所屬領域桶（supabase/frontend/finance/n8n/governance/tooling，見 `.fhs/memory/learnings/README.md`），檢查該桶（若橫跨多桶則主桶）是否已有相同或相似條目（避免重複）
3. 若無重複 → 寫入 1 條內容（≤150 字元含日期來源），並加 `` `@主桶 [+副桶...]` `` tag（2026-08-03 分桶重構起，格式規格見 `learnings/README.md` §3）；若有跨桶 tag，寫完後跑 `node scripts/learnings-pointers.js` 生成對應副桶 pointer
4. 在 Phase 3 完成報告中註明：「✅ Lesson: [Pattern/Pitfall/Preference] — [選擇原因] — 落 learnings/[bucket].md」

---

## 【Phase 2: Git 推送與安全】
1. **Staging**: `git add .` -> `git status`。
2. **Safety**: 若出現 `.env` 則立即 `git reset HEAD .env` 並警告。
3. **Push**: `git commit -m "chore: sync [YYYY-MM-DD]"` -> `git push`。

## 【Phase 2.5: 自動升格部署（條件觸發，2026-07-12 Session 168，AGENTS.md v1.7.0 授權途徑c）】
> **先偵測、後執行、不再詢問**：Fat Mo 執行 `/commit` 本身即構成「有條件」授權（AGENTS.md §3 授權途徑 c）。AI 先自動判斷本次是否需要部署，需要則直接續走部署鏈，不需要則只做 commit+push——兩種結果皆不再另外詢問確認。

1. **偵測是否需要部署**：`git diff --cached --name-only`（或本次已知改動清單）是否包含 `Freehandsss_Dashboard/freehandsss_dashboardV*.html`（dev 版原始檔，非 `current.html` 本身）。
   - **有**改動該檔案 → 判定「需要部署」，繼續下方步驟 2-6。
   - **沒有**改動（純文件/治理/migration/n8n/其他 scripts 改動）→ 判定「不需要部署」，Phase 2.5 到此結束，直接進 Phase 3 回報，並註明「本次未改動 Dashboard HTML，已跳過部署」。
2. 依 `upload-web.md` 無參數流程執行：偵測 `Freehandsss_Dashboard/` 內版本號最高的 `freehandsss_dashboardV*.html` → **跳過該檔案原本的 Step 1 二次確認**（已由途徑c預先授權）→ AI 自建 `.fhs/.deploy-ok`（純 ISO timestamp 字串，禁夾帶說明文字，詳見 `.fhs/memory/handoff.md` 便攜塊「⚠️易猜錯」(11)）→ cp 升格為 `Freehandsss_dashboard_current.html`。
3. 執行 `scripts/upload-web.ps1 current -Force` 完成 NAS 部署，三關驗證（HTTP 200 / Content-Length 相符 / SHA256 相符）不可省略——**任一關失敗則視為部署失敗**，回報 Fat Mo，不得回頭跳過驗證強行視為成功。
4. 部署前置 `/fhs-check`（Step 0）仍需執行；若命中**已有先例裁決不阻擋部署的已知外部限制**（如 Airtable API 429 額度用盡類的 PRICE_AUDIT FAIL），比照先例繼續部署並在回報中註明；若是**新出現**的 Red Flag（非既有已裁決先例），停止部署並回報，不得比照舊例擅自放行。
5. `git add` 補上 `Freehandsss_Dashboard/Freehandsss_dashboard_current.html` + `.fhs/notes/deploy-log.md`（hook 自動追加）→ 追加一個部署 commit → push。
6. 回報格式併入 Phase 3（見下），額外附上傳三關結果 + 公開網址。

---

## 【Phase 2.6：主線同步（Fast-Forward Auto-Merge，新，2026-09-05，D70）】
> **目的**：Fat Mo 指出「commit 完＝任務完成，理應等同 main 已同步」——現行預設要另外人手 merge/開 PR，同呢個直覺唔一致。本節補上呢個等號，但**只喺技術上保證零風險嘅情況先自動做**，唔做任何形式嘅衝突自動解決。

1. **前置**：Phase 2（及 Phase 2.5，若本次有觸發部署 commit）已完成 push。若目前分支本身就係 `main`（例如直接喺 main 開工），Phase 2 嘅 push 已經即係寫落 main，本節略過。
2. **偵測**：`git fetch origin main` → 判斷 `origin/main` 是否為目前分支 HEAD 嘅**祖先**（`git merge-base --is-ancestor origin/main HEAD`）。
   - **是**（fast-forward 可行，即由本分支分岔到而家，main 未被其他 session 搶先郁過）→ 續步驟 3。
   - **否**（main 自本分支分岔後已有其他 commit 落地，即有並行 worktree session 搶先 merge 咗）→ **跳過自動合併**，輸出 `git log HEAD..origin/main --oneline` 畀 Fat Mo 睇邊啲 commit 令 main 郁咗，回報「本次未自動合併主線，main 已被其他分支更新，需人手 merge / 開 PR review」，直接跳落 Phase 3。
3. **執行**：`git push origin HEAD:main`——呢個係 fast-forward-only 推送，git 原生拒絕非快進嘅推送，唔會產生隱藏嘅三方合併或衝突解決，亦唔會多一個 merge commit，main 歷史保持線性。
4. **失敗處理**：若步驟 3 因為極罕見嘅時間差被 remote 拒絕（偵測完到推送之間 main 又被其他 session 搶先郁咗）→ 視同步驟 2「否」分支處理，回報並停止，唔重試唔強推（`--force` 一律禁止，同 R7 一致）。
5. **刻意不做**（超出本次授權範圍，留待日後另案裁決）：
   - 唔自動刪除來源分支或 worktree。
   - 唔處理 Phase 2.5 嘅 NAS 部署衝突——`Freehandsss_dashboard_current.html` 係跨分支共享嘅部署目標，屬 git 之外嘅另一個課題（見 decisions.md「分支合併事故」2026-09-03 條目），本節只同步 git `main` ref，唔改動任何 NAS 部署邏輯。
   - 唔嘗試自動解決衝突：只要唔係乾淨快進，一律停低等人手，物理上唔可能靜默覆寫或遺失第三方分支嘅內容。

**安全依據**：fast-forward-only 由 git 底層保證——冇「自動判斷點解決衝突」呢一步，只有「係咪線性延續」呢個客觀事實判斷，判斷錯咗會直接被 git 拒絕（步驟 4），故本節唔存在令 main 資料遺失或被靜默覆寫嘅路徑。

---

## 【Phase 3: 完成回報】
輸出格式如下：
```text
✅ /commit 全包完成 [YYYY-MM-DD HH:MM]
- Pre-Commit Sweep: ✅
- Memory Engine: ✅ (Notion + Handoff)
- Git Operation: ✅ (Commit + Push)
雲端大腦 + GitHub 雙備份完成。收工！
```

狀態框之後，必須接**三段式摘要**（強制，2026-07-16 Fat Mo 指示，與 execute.md 完成後動作同一格式）：

```
**已完成** — 一兩行講咗咩（唔列逐步驟過程）
**點運作** — 日後點用/有咩改變（召喚詞/操作方式）
**點維護** — 要人手跟進嘅嘢/已知限制
```

簡短直白，寫俾唔熟技術細節嘅人睇；細節留 Changelog/completion report，禁止喺對話重複展開。
✅ / 🟡 [差距清單]
P0.3 沉積掃描    ✅ / 🟡 [發現清單]
P0.4 幽靈偵測    ✅ / 🟡 [孤獨清單]
P0.5 衝突確認    ✅ / 🔴🟡 [問題]
═══════════════════════════
[全綠：繼續執行] / [有🔴：停止修復] / [有🟡：詢問後繼續]
```

