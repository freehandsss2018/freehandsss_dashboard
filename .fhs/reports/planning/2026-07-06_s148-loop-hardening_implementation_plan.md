# S148 迴圈硬化實施計畫（Loop Hardening Implementation Plan）

> **製作**：2026-07-06 / S148（Fable 5 規劃 session，僅規劃不執行）
> **執行者**：Sonnet 5（2026-07-07 之後，由 Fat Mo 啟動）
> **依據**：S148 全系統迴圈稽核（同 session 完成，證據全部實測，結論見本檔 §0）
> **性質**：治理層/hook 層改動，**零業務代碼**（不碰 Dashboard HTML 功能、n8n 業務 workflow、Supabase 業務表）
> **敘事單源**：本檔為此計畫全文唯一居所（S144 合約）；其他文件引用 ≤3 行 + 連結

---

## §0 背景：稽核已證實的四個斷點（證據位置）

| # | 斷點 | 證據 |
|---|---|---|
| B1 | R11-observe 觀察數據被測試夾具污染：17 條記錄 14 條是 `guard-fixtures.json:203` 的夾具指令，2 條是誤觸診斷指令 | `.fhs/.kgov-observe.log` 全文 + `run-fixtures.js:38`（spawn 真 guard，無測試隔離） |
| B2 | [G] hook 觸發判準（關鍵字密度）≠ execute.md 明文（diff 物理特徵）：S147 4 觸發 3 誤觸；同主題 workaround 教訓已累積 6 條（02§7 ×4 + Pitfall #25/#26）；人工清 flag 已固化成 settings.json allowlist 4 條 | `post-tool-kgov.js:71-86` vs learnings Pitfall #26 引述的 execute.md 定義 |
| B3 | 文件衛生「清完隔 1 session 回胖」：S146 slim 51→50，S147 又 51 + 便攜塊 4,023>4,000；規則只在 commit.md 紙上，寫入當下無檢查 | `.fhs/.health-report.json` 2026-07-06 + learnings.md 檔頭 |
| B4 | /commit 漏跑靠人抓：S141-143 三次漏跑由 Fat Mo 人工發現（S143 補跑）；Stop hook 只查 kgov flag 不查交接完整性 | handoff MASTER 表 S143 條目 |

---

## §1 八維度架構分析

| 維度 | 分析 |
|---|---|
| **perf 系統效能** | 全部改動在 hook 層（每次工具呼叫 spawn 一個 node 進程，timeout 5s）。T6 budget gate 併入既有 `post-tool-kgov.js` 進程內（不新增 hook 註冊、不多 spawn 一個進程），僅在 filePath 命中 learnings.md/handoff.md 時才讀檔計數（learnings 18KB / handoff 前 120 行，<10ms）。T5 在 SessionStart 加一次 `git log -1 --format=%cs`（~100ms，帶 timeout+fail-open）。零業務端（Dashboard/n8n/Supabase）效能影響。 |
| **ux_mgmt 直觀管理** | Fat Mo 的人工介入點從三個（裁決 [G] 誤觸、記得跑 /fhs-slim、抓漏跑 /commit）降為零個常態介入 + 一次性批准本計畫。[G] 誤觸消滅後，交付摘要不再充斥「G 觸發：核實為誤觸」段落。budget 超額改為寫入當下提示（AI 當場自修），Fat Mo 不再看到 session start 紅字。 |
| **conflict 衝突避免** | ①執行順序硬約束：Phase 0 先跑 /fhs-slim 清空欠帳，否則 T6 gate 上線即對既有超額誤鳴；②T4 與 T6 同檔（post-tool-kgov.js）改動，安排在不同 Phase 但同一檔案的兩次獨立 commit，第二次改動前必須 `git log` 確認第一次已 commit（防 Pitfall #20 checkout 攜帶）；③T4 判準變更後，02§7 四條 workaround 教訓與 Pitfall #26 必須同 Phase 退役/改寫，否則制度層出現「hook 已修但教訓仍教人繞路」的第二真源分叉（06 信退化模式 #2）；④kgov flag 檔案路徑在新夾具中用 env var 隔離，防夾具污染真 flag（B1 同型錯誤的預防）。 |
| **token 消費** | hook 全是零 token 死腳本。收益端：消滅每次 [G] 誤觸的人工核實迴路（git diff + 說明 ≈ 500-1,000 tokens/次，S147 一個 session 3 次）；T4 完成後退役 6 條 workaround 教訓，回收 learnings 額度；便攜塊 gate 防止 session-start 注入持續膨脹（現 ~2,300 tokens，預算鎖 4,000 bytes）。執行本計畫本身：Sonnet 5 全程窗口讀，預估單 session 可完成（各檔 <300 行，僅 guard-fixtures.json 需 Grep 定位）。 |
| **long_term 長期方向** | 方向 = 把「靠 AI 自律 + 人工補救」換成「機械迴路」，與 governance 立層初衷（把判斷力外化成弱模型可執行的制度）一致。教訓熔斷條款（T8a）給教訓系統裝出口，防止 learnings 永遠只進不出。R11 觀察期數據修復後，未來 warn→hard-block 轉正決策才有可信依據。本計畫全部改動可攜（hooks + 制度檔），與 Fat Mo 的治理可攜化計畫（auto-memory 記錄）相容。 |
| **responsive Desktop+手機** | 零 UI 改動。唯一用戶可見面 = hook 的 terminal 文字輸出（與裝置無關）。注意邊界：Cowork/手機模式不執行 hooks（AGENTS §1.2），budget gate 保護不了 Cowork 寫入——但單一寫者矩陣本就規定 Cowork 對 memory/notes 唯讀，維持現狀，非新缺口。 |
| **subagent & skill** | 執行模式：Sonnet 5 主對話直接做（清單式定點編輯，符合 governance/02 §1「主對話可直接做」門檻），不派實作 subagent。**驗收紅線**：T4（判準變更，判斷承載最重）完成後必須派 fresh-context agent 做對抗審查（read-back 真值表 vs 實作 + 跑三套夾具），主對話不得自驗宣告 PASS。/fhs-slim 用既有指令不手工模仿。新增 kgov 夾具套件後，「guard 16/16 + health 12/12 + kgov N/N」成為未來所有 hook 改動的三套回歸標配。 |
| **history 歷史記錄** | 收尾走 /commit 全流程：Changelog S148/S14X 條目、handoff 便攜塊六欄更新（R11 觀察期重啟日、[G] 判準已治本）、Notion 同步、decisions.md 補 T4 判準變更決策條目（架構改動強制）。學習層：退役條目一律帶 📌 可追溯附註（S136/S142 慣例）。完成報告落 `.fhs/reports/completion/`，本計畫檔案狀態欄由執行 session 回填。 |

---

## §2 實施計畫草案 v1（保留供追溯，**執行以 §4 v2 為準**）

1. 修 R11 污染：guard `logKgovObserve` 加 env var 跳過；run-fixtures.js spawn 時注入該 env；手工清洗 observe log。
2. 跑 /fhs-slim 清 51→50 + 便攜塊瘦身。
3. post-tool-kgov.js 判準重寫：.md 文件編輯降級為 warn 不落 flag；migrations .sql / MCP / Dashboard HTML 含財務內容才落 flag。
4. post-tool-kgov.js 加 budget check（learnings 條數、便攜塊 bytes）。
5. session-start-sop.sh 加 git log 日期 vs 便攜塊日期比對，脫節即警示疑似漏跑 /commit。
6. prompt-router.js 大改路由加唯讀排除詞。
7. 制度層：05 §7 加教訓熔斷條款、cadence_checks 登記 governance 健檢、更新 R11 觀察期起算日。

## §3 自我批評（v1 的 3 個弱點）

1. **打包成一團，缺分段 commit 與獨立回滾**。v1 把 7 件事當一個工作流，Sonnet 5 中途卡住（如夾具意外紅燈）會留下半改動狀態；且 T4 與 T6 同檔改動若混在一個 commit，回滾 T4 會連帶滾掉 T6。→ v2 改為 4 個 Phase、每 Phase 獨立 commit、獨立驗收、獨立回滾，任一 Phase 失敗其餘照常交付。
2. **T4 判準只寫了散文，弱模型無法機械執行**。「.md 降級、Dashboard HTML 含財務內容才落 flag」留了太多臨場判斷（HTML 路徑怎麼匹配？hook 自我編輯算什麼？execute_sql 動不動？），而 [G] 誤觸的根因正是判準含糊。→ v2 給出完整**真值表 + 10 條新夾具**逐行覆蓋，並新建 kgov 專用夾具套件（現在 kgov hook 完全沒有測試，v1 竟然沒發現這件事本身就是缺口）。
3. **漏了兩個收尾迴路**：①observe log 清洗後沒定義「觀察期重啟日記錄在哪」——不記的話 2 週後複查又沒有基準日；②T5 的 git log vs 便攜塊日期比對在「同日多 commit」「純文件 commit」場景會誤報，v1 沒設計誤報抑制，會重蹈 prompt-router 狼來了覆轍。→ v2 補：觀察期重啟日寫入 handoff 待辦欄；T5 改為僅當 commit 日期 **晚於** 便攜塊日期 ≥1 天才警示（warn-only），並在警示文案附自查指令。

---

## §4 實施計畫 v2（**定稿，Sonnet 5 照此執行**）

### §4.0 執行紀律（Sonnet 5 開工前必讀）

- 全程窗口讀：`guard-fixtures.json`（~200+ 行）用 Grep 定位後窗口讀；禁全讀 handoff.md/Changelog.md（紅線）。
- 每 Phase 一個獨立 commit，commit 前跑該 Phase 驗收命令；Phase 之間先 `git log --oneline -1` 確認上一 commit 已落（Pitfall #20）。
- 任一 Phase 夾具紅燈且兩輪內修不好 → 停手，按 governance/03 R1/R5 上報 Fat Mo，不硬修、不跳過夾具。
- 改 governance 檔前先備份至 `.fhs/ai/governance/backups/<檔名>.<日期>.bak`（05 §5）。
- 修改 post-tool-kgov.js/pre-tool-guard.js 時，注意內容含財務關鍵字會自我觸發 [G]（02§7 已有教訓）——Phase 2 完成前屬預期現象，按既有教訓核實清除；Phase 2 完成後此現象應消失（驗收點之一）。

### §4.0b 授權清單（Fat Mo 批准本計畫 = 授權以下改動；執行時不再逐項問）

| 項 | 對象 | 權限級別 |
|---|---|---|
| A1 | `pre-tool-guard.js` / `run-fixtures.js` / `post-tool-kgov.js` / `session-start-sop.sh` / `prompt-router.js` 按本計畫改動 | hook 層（S139/S140 慣例：計畫批准即授權） |
| A2 | **[G] 觸發判準變更**（§4.2 真值表）——治理核心 | ⛔ 05 §1「先問」級 → **本計畫 §4.2 即提案書，批准本計畫 = 批准判準** |
| A3 | 02 §7 四條 guard/kgov 誤觸教訓退役改寫 + learnings Pitfall #26 改寫 | ⛔ 刪除類「先問」級 → 同上，批准即授權 |
| A4 | 05 §7 新增教訓熔斷條款（§4.4 原文） | ⛔ 判準本文「先問」級 → 同上 |
| A5 | `.fhs/.kgov-observe.log` 清洗（保留非夾具條目） | 資料修復，隨 A1 |

### §4.1 Phase 1 — R11 觀察數據止血（獨立 commit #1）

**改動 1**：`scripts/hooks/pre-tool-guard.js` 的 `logKgovObserve()`（現 55-61 行）函式開頭加：
```js
if (process.env.FHS_GUARD_FIXTURE === '1') return; // 夾具測試不污染觀察數據（S148）
```
（警示文字輸出**不變**——夾具斷言依賴 stderr，只抑制檔案 append。）

**改動 2**：`scripts/hooks/test/run-fixtures.js:38` 的 `spawnSync` options 加 env：
```js
const result = spawnSync('node', [GUARD_PATH], { input, encoding: 'utf8', env: { ...process.env, FHS_GUARD_FIXTURE: '1' } });
```

**改動 3**：清洗 `.fhs/.kgov-observe.log`——刪除全部 `echo "cost_configurations" >> notes.txt` 條目與 `git diff` 開頭條目（那是誤觸診斷指令），保留其餘（清洗前 `cp` 備份至 `.fhs/memory/archive/kgov-observe-polluted-2026-07.log`）。

**改動 4**：handoff.md MASTER 表 R11-observe 行備註改為「觀察期於 <執行日> 重啟（S148 修復夾具污染，舊數據已歸檔），~2 週後複查」。（handoff 寫入豁免：任務結束交接，AGENTS §3。）

**驗收（機械）**：
1. `node scripts/hooks/test/run-fixtures.js` → 16/16 PASS（斷言零改動，必須全綠）。
2. 污染復發測試：`wc -l .fhs/.kgov-observe.log` → 跑一次夾具套件 → 再 `wc -l`，**行數必須相同**。
3. 真實路徑仍活著：手動 `echo '{"tool_name":"Bash","tool_input":{"command":"echo cost_configurations >> x.txt"}}' | node scripts/hooks/pre-tool-guard.js`（不帶 env var）→ log 行數 +1，隨後手動刪掉該測試行。

**回滾**：revert commit #1；observe log 從備份還原。

### §4.2 Phase 2 — [G] 判準對齊 execute.md（獨立 commit #2；本節即 05 §1 提案書）

**現行條文**：`post-tool-kgov.js` HIT_PATH_PATTERNS 含 `FHS_Finance_Bible.md`/`FHS_System_Logic_Overview.md`/`calculatePricing`（路徑），HIT_CONTENT_PATTERNS 對**任何** Write/Edit 內容掃財務關鍵字 → 命中即落 flag。
**建議新條文**：flag 只給 diff 物理特徵（execute.md [G] 原定義）；文件/代碼層財務內容改動降級為 warn（可見、不落 flag、不觸發 Stop 攔截）。
**動機**：S147 4 觸發 3 誤觸；6 條 workaround 教訓；allowlist 4 條清 flag 化石（證據見 §0-B2）。
**影響面**：誤觸歸零後 Stop hook 攔截只剩真財務邏輯變動；文件層改動失去強制力——以 warn 文案補償（見下）。

**判準真值表**（實作即照此，逐行有夾具）：

| # | 情境 | 判定 |
|---|---|---|
| 1 | Write/Edit → `supabase/migrations/*.sql`（任何內容） | 🚩 flag |
| 2 | MCP `__apply_migration` / `__update_node_code` | 🚩 flag（不變） |
| 3 | MCP `__execute_sql`：寫動詞 + 財務 pattern | 🚩 flag（不變） |
| 4 | Write/Edit → `Freehandsss_Dashboard/*.html` **且**內容命中財務 pattern | 🚩 flag |
| 5 | Write/Edit → `Freehandsss_Dashboard/*.html`，內容無財務 pattern | ✅ 靜默 |
| 6 | Write/Edit → 任何 `.md`（含 Finance_Bible）內容命中財務 pattern | ⚠️ warn，不落 flag |
| 7 | Write/Edit → 其他代碼檔（如 scripts/hooks/*.js）內容命中財務 pattern | ⚠️ warn，不落 flag（保留可見性，回應 02§7「勿 SAFE 化 hooks」的顧慮） |
| 8 | SAFE_PATH（memory/、session-log、decisions.md、docs/CHANGELOG、auto-memory） | ✅ 靜默（不變） |
| 9 | Write/Edit → `FHS_System_Logic_Overview.md` / `lessons/INDEX.md` 且 flag 存在 | 🧹 清 flag（不變） |
| 10 | `__execute_sql` 純 SELECT 含財務詞 | ✅ 靜默（不變） |

**warn 文案**（情境 6/7 用，取代原 G_REMINDER）：
```
⚠️ [kgov-hook] 文件/代碼層財務內容編輯（未落 flag）
   → 若本次為財務規則「語義」變更（非錯字/排版/註解），請照 execute.md [G] 手動更新
     FHS_System_Logic_Overview.md 對應章節；純文字修正可忽略本提示
```

**實作要點**：
- 刪 HIT_PATH_PATTERNS 中三條（Finance_Bible / Logic_Overview / calculatePricing 路徑），新增 `DASHBOARD_HTML = /Freehandsss_Dashboard[\/\\][^\/\\]+\.html$/i`。
- 為可測性，`FLAG_FILE` 改為 `process.env.FHS_KGOV_FLAG_FILE || path.join(...)`（預設行為不變）。
- **新建 kgov 夾具套件**：`scripts/hooks/test/kgov-fixtures.json`（≥10 條，逐行覆蓋真值表）+ `run-kgov-fixtures.js`（仿 run-fixtures.js：spawn post-tool-kgov.js，斷言 stdout additionalContext 內容 + flag 檔存在性；flag 路徑經 env var 指向 test 目錄暫存檔，跑完清理）。

**教訓同步（同 commit，防第二真源分叉）**：
- 02 §7 四條誤觸教訓：各加一行「📌 已治本（S148 判準對齊，見 planning/2026-07-06_s148 計畫 §4.2），本條保留為歷史」；不刪原文（可追溯）。
- learnings Pitfall #26：改寫為 ≤2 行「[G] 判準已於 S148 對齊 execute.md diff 物理特徵，.md 編輯只 warn 不落 flag；歷史誤觸模式見 02§7」——淨省額度。

**驗收（不自驗紅線）**：
1. 三套夾具全綠：guard 16/16 + health 12/12 + **kgov 10/10（新）**。
2. **派 fresh-context agent**（general-purpose 或 code-reviewer）對抗審查：真值表 vs 實作逐行 read-back + 實跑三套夾具 + 專項驗證「編輯 FHS_Finance_Bible.md 錯字不再落 flag、編輯 migrations .sql 仍落 flag」。verdict 非 PASS 不得 commit。
3. decisions.md 補 D 編號條目（判準變更 = 架構決策）。

**回滾**：revert commit #2（夾具套件與判準同 commit，一起回滾無殘留）。

### §4.3 Phase 3 — 預防端三小件（獨立 commit #3）

**T6 budget gate**（`post-tool-kgov.js` 內加函式，Write/Edit 後檢查，僅命中兩檔時執行）：
- filePath 以 `learnings.md` 結尾 → 讀檔 count `^\d+\.` 條目數（與 fhs-health-check.js 同規則，預算值從 `.fhs/tools/fhs-health-rules.json` 讀，勿硬編碼 50）→ 超額 emit additionalContext：「⚠️ learnings.md 本次寫入後 N>預算——請當場對等替換（合併/退役一條），勿留給 /fhs-slim」。
- filePath 以 `handoff.md` 結尾 → 抽 ```` ```handoff ```` 至 `─── 便攜邊界` 段 byte 數（JS 重寫 session-start-sop.sh:18 的 awk 邏輯）→ >4,000 bytes 即警示（引 commit.md P0.7.1）。

**T5 /commit 漏跑偵測**（`session-start-sop.sh` 過期偵測段後加）：
```bash
LAST_COMMIT=$(git -C "$PROJECT_DIR" log -1 --format=%cs 2>/dev/null || echo "")
if [ -n "$LAST_COMMIT" ] && [ -n "$BLOCK_DATE" ] && [ "$LAST_COMMIT" \> "$BLOCK_DATE" ]; then
  echo "⚠️  最新 commit（$LAST_COMMIT）晚於便攜塊更新日（$BLOCK_DATE）— 疑似上個 session 漏跑 /commit"
  echo "   → 自查：git log --oneline -5 對照 Changelog.md 最新條目；確認漏跑則先補 /commit"
fi
```
（字串比較對 ISO 日期安全；同日多 commit 不觸發 = 誤報抑制；warn-only。）

**T7 router 唯讀排除**（`prompt-router.js` 大改路由加一個 `excludes` 欄）：
```js
excludes: ['不要改', '先不改', '唯讀', '只分析', '只盤點', '只規劃', '製作計畫', '實施計畫', 'implementation plan', '先讀取', '稽核報告'],
```
匹配邏輯：該路由 patterns 命中但 excludes 亦命中 → 跳過此路由繼續往下試（其他路由不受影響）。僅套用於「大範圍改動」路由，其餘路由不動。

**驗收**：
1. budget gate：臨時副本測試——複製 learnings.md 至 scratchpad 加一條假條目，餵 post-tool-kgov.js 模擬 stdin，斷言 additionalContext 出現；便攜塊同法（現檔 4,023 bytes 若 Phase 0 已瘦身，用 scratchpad 加料副本測超額路徑）。納入 kgov 夾具套件（+2 條，kgov 夾具總數 12）。
2. T5：本地 sandbox 驗證——臨時把便攜塊日期改舊→跑 `bash scripts/hooks/session-start-sop.sh` 斷言警示出現→還原（或等下個真 session 自然驗證，標記「待 live 驗證」）。
3. T7：`echo '{"prompt":"重構分析：只規劃不要改"}' | node scripts/hooks/prompt-router.js` → 無 guardian 建議；`echo '{"prompt":"重構付款模組"}' | ...` → 有。

**回滾**：revert commit #3（三件互不依賴，也可單獨 revert 單 hunk）。

### §4.4 Phase 4 — 制度層收尾（獨立 commit #4）

1. **05 §7 教訓熔斷條款**（備份後加為第 5 項；A4 已授權）：
   > 5. 熔斷檢查：任一主題的 workaround 教訓跨檔（02 §7 + learnings.md + lessons/）累積 ≥3 條 → 禁止追加第 4 條，必須升級為制度/hook 修正提案交 Fat Mo；健檢時 grep 抽查一次。
2. **cadence_checks 登記**：`.fhs/tools/fhs-health-rules.json` 的 `cadence_checks` 加 governance 季度健檢（90 天，出處 05 §7；上次基準 = governance 建立日 2026-07-04）→ 跑 `node scripts/hooks/fhs-health-check.js` 確認靜默（未到期）+ health fixtures 12/12 無回歸（若 fixture 斷言涉及 cadence 條目數，按 S143 慣例補夾具）。
3. **/commit 收尾（全計畫完成後一次）**：Changelog 條目、便攜塊六欄更新（含 R11 重啟日、[G] 已治本、三套夾具新基線「guard 16 + health 12 + kgov 12」）、Notion 同步、完成報告落 `.fhs/reports/completion/`、本計畫檔頂部補「執行狀態」欄。

### §4.5 執行順序與依賴總覽

```
Phase 0: /fhs-slim（清 51→50 + 便攜塊 <4000）＋ 02§7 追加「觀察數據來源隔離」教訓
   ↓（必先做——否則 Phase 3 gate 上線即對存量欠帳誤鳴）
Phase 1: R11 污染止血（commit #1）
   ↓
Phase 2: [G] 判準對齊 + kgov 夾具套件 + 教訓退役（commit #2）← fresh-context 對抗審查
   ↓（同檔改動，須確認 #2 已 commit）
Phase 3: budget gate + commit 漏跑偵測 + router 排除（commit #3）
   ↓
Phase 4: 制度層 + /commit 收尾（commit #4）
```
任一 Phase 失敗：完成的照常交付，失敗的按 03 R1 上報，不回滾已交付 Phase。

---

## 執行狀態（執行 session 回填）

- [ ] Phase 0　- [ ] Phase 1　- [ ] Phase 2　- [ ] Phase 3　- [ ] Phase 4
- fresh-context 對抗審查 verdict：＿＿
- 三套夾具最終基線：＿＿
