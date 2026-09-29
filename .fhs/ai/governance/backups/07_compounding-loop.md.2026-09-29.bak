# 07 — 複利迴圈（教訓五階段 × Skills 複利 × 平行工作流）

> **Version**: v1.0.1（2026-07-08，Session 156，Fable 5 吸收 session 產出；同日 /8d 迭代修 3 弱點：§2 定位三規則、尾註 §4 回填豁免、learnings 檔頭 stage-3 註記）
> **讀者**：未來每一個 session 的主模型（Sonnet 等級為基準）。
> **來源**：blocktempo《自我改進 agent · Fable 5》系列第二篇（14 步路線圖）之**條款級凍結快照**——按 D15 慣例（decisions.md）：只吸收條款、附來源+日期、不自動跟隨上游更新。
> **與既有檔關係**：本檔只放 01–06 未覆蓋的增量。教訓「寫什麼、驗什麼」看本檔 §1–§2；「寫到哪」仍以 [[05_maintenance-protocol]] §2 落點分流表為準（該表已加 skill 落點行指回本檔）。

---

## §0 吸收邊界（先讀——防止未來 session 重複吸收同一篇文章）

該文 14 步中，以下項目**已被既有制度覆蓋，本檔刻意不重述**。未來 session 若再讀到該文（或同系列），對照此表即可，不要再開吸收案：

| 文章主張 | 已覆蓋於 |
|---|---|
| 驗證者 subagent 勝過自我批評 | [[02_model-dispatch]] §5 驗證不自驗 |
| 成本-能力矩陣（Fable/Opus/Sonnet/Haiku 分工） | [[02_model-dispatch]] §4 分派表 |
| 複利契約（離開前先寫 / 開場時先讀） | handoff.md 便攜塊 SSOT + SessionStart hook（既有） |
| STATE.md 狀態檔 | handoff.md 便攜塊即本環境的 STATE.md，且更成熟 |
| 對抗式驗證（製作者/驗證者各自乾淨 context） | [[04_delegation-templates]] T5 + 02 §5 |
| 視覺自我驗證 | [[03_judgment-rubrics]] R5（playwright 實測，禁純讀碼臆測） |
| Mythos 安全邊界 → 後備 Opus | 02 §0（`fable` 不可用一律以 `opus` 代位） |
| /goal 與 Outcomes | CMA 專用功能，本環境以 /loop 與 scheduled-tasks 對應；暫無需求，不立規 |

本檔吸收的五項增量：§1 教訓五階段、§2 Skills 複利、§3 平行工作流、§4 Worktree、§5 評分者降級。（§6 健檢掛鉤是 FHS 自加的制度接線，不是文章內容，未來對照上游時勿計入吸收物。）

---

## §1 教訓五階段（落盤門檻）[來源: blocktempo fable-5-2 Step 10, 2026-07-08]

教訓從發生到可複用有五個階段。**文章實測：Sonnet 級模型最常在第 1 階段就退出——把「失敗筆記＋未驗證的猜測」當成教訓落盤**，污染規則庫，讓之後每個 session 照著錯的猜測辦事。

| 階段 | 動作 | 產物 |
|---|---|---|
| 1. Fail | 記錄失敗，含足以日後再現的細節 | 現象 + 再現步驟 |
| 2. Investigate | 追查原因 | 假設（仍是猜測） |
| 3. Verify | **用證據核實假設**（03 R2 的證據分級：運行證據 > read-back > 計數） | 經查核的事實 |
| 4. Distill | 蒸餾成超越個案的通則 | 一條可執行規則 |
| 5. Consult | 下個任務直接查規則，不重新推導 | （既有路由已覆蓋） |

**硬規則**：寫入 `learnings.md`、`02 §7 實戰修正錄`、或任何 skill 檔的教訓，必須是**已過第 3 階段**的產物。自檢一句話：**「這條教訓的診斷，是用什麼證據核實的？」**答不出 = 還是猜測，不准落盤為規則。

**未過第 3 階段的猜測怎麼辦**——用 Open-failure 格式落 `.fhs/notes/todo.md` 的「未解待驗證 (Open Failures)」節（不入 learnings）：

```
- [ ] 【未解】YYYY-MM-DD：{現象}。假設：{猜測，明標「未驗證」}。再現：{步驟或檔案路徑}。下一步驗證動作：{具體命令或實驗}
```

若該未解項**阻擋現役工作**，在本 session 收尾 /commit 時把一行指標帶進 handoff.md「待辦 ⏳」（handoff 只能經 checkpoint/commit 寫入，憲法既有規則）——todo.md 不會被 SessionStart 自動載入，別指望下個 session 自己想起來去看。

- ✅ **正例**：cl-flow-runner「PX socket hang up」——若在 stage 2 就落盤，教訓會寫成「timeout 太短，調大」；實際做了 curl vs Node 對照實驗（stage 3）才發現真根因是 Cloudflare 指紋擋 Node https，最終規則「curl成功Node失敗=必為指紋勿調timeout」與猜測**方向完全相反**。
- ❌ **反例**：「n8n 節點又失敗了，大概是 API 不穩，教訓：加 retry」——零證據直接落盤。下個 session 照做加 retry，真根因（如 payload emoji 序列化，S133）繼續存在，且多了一層掩蓋症狀的 retry。

---

## §2 Skills 複利條款 [來源: blocktempo fable-5-2 Step 12, 2026-07-08]

**原則：把教訓寫進 skill 本身，而不只寫在教訓庫。** skill 是任務執行時必然被載入的檔案；learnings.md 靠「記得去查」。寫進 skill = 下次執行該任務時教訓自動在場。

**判準**：這條（已過 §1 第 3 階段的）教訓，是否關於「某個 skill / command 的執行方式」？
- 是 → 寫進該 skill 檔（`.fhs/ai/commands/*.md` 或 skill 本體）的專用節，`learnings.md` 至多留一行指標。
- 否（通用業務/技術 pitfall）→ 照 [[05_maintenance-protocol]] §2 既有分流。

**寫哪裡（三條定位規則，防漂移）**：
1. 只寫 **master 檔**（`.fhs/ai/commands/*.md`），不寫 `.claude` 側的 bridge 檔——bridge 只是引導頁，沒人讀內容。
2. 插入位置：「版本更新日誌」節**之前**；該 skill 無此節才放檔尾。
3. 首次為某 skill 建節時照下方格式範本，之後只追加條目。

**skill 檔內的追加格式**：

```markdown
## Known failure modes（迴圈追加，格式勿改）
- {模式名}：{現象}。Fix：{具體修法}。[S{n}, YYYY-MM-DD]

## Anti-patterns（禁做）
- {反面教訓一句話}。[S{n}, YYYY-MM-DD]
```

**權限**（對齊 05 §1 精神）：
- 追加 `Known failure modes` / `Anti-patterns` 條目 = **可自行**（純追加、不動既有流程語義；改前備份到 `.fhs/ai/governance/backups/`——這是 05 §5 備份義務對 skill/command 檔的延伸，備份集中同一處）。
- 修改 skill 的流程本體（步驟、判準、輸出格式） = **先問 Fat Mo**。

- ✅ **正例**：fhs-bug-triage 的 5-Gate 本身就是「假完成」教訓升格進執行流程的成功案例——教訓住在執行路徑上，不靠回憶。
- ❌ **反例**：n8n 部署踩了「PUT body 只能 4 欄」後只寫進 learnings——下個 session 執行 /execute 部署時沒查 learnings，重踩。正解：同時追加到部署相關 command 檔的 Known failure modes（learnings 留指標）。

---

## §3 平行工作流三模式 [來源: blocktempo fable-5-2 Step 7, 2026-07-08]

### 模式 A — 散出並彙整（fan-out-and-synthesize）

**何時用（三條件全滿足才用）**：(1) 子問題互相獨立、無共享狀態、無執行順序依賴；(2) 每個子問題可寫出獨立驗收條件；(3) 結果可按預先寫好的維度表彙整。典型：多來源研究、跨檔盤點、多方案各自估算。
**怎麼用**：派工模板 [[04_delegation-templates]] T7。N 從 2–3 起步；彙整者 = 主對話，**彙整維度表必須在派出前寫好**（事後現想維度 = 被各家回報牽著走）。
**反模式**：把有依賴順序的步驟 fan-out（B 需要 A 的結論）→ 結果互相矛盾且無法彙整，spawn 費全浪費。

### 模式 B — 對抗式驗證

已制度化：[[02_model-dispatch]] §5 + T5。本檔不重述。

### 模式 C — 跑到完成為止（loop-until-done）

製作者→獨立評分者→按 findings 修正→再評，直到停止條件。

**與「同一方法最多兩輪」熔斷（02 §4）的消歧**（同 D16 消歧精神：不同軸）：熔斷管的是**無新資訊的盲目重試**；loop-until-done 每一輪都必須有**新資訊輸入**（評分者的具體 findings）且下一輪針對 findings 修正。一輪沒有拿到新 findings 就重跑 = 那是重試，歸熔斷管。

**停止條件——啟動迴圈前必須明文寫下全部四條，缺一不准啟動**：
1. 評分者 verdict = PASS（正常出口）。
2. 本輪 findings 數 ≥ 上一輪 → **立即停**，按 [[03_judgment-rubrics]] R4 判斷是否方向錯了。
3. 輪數上限：默認 3 輪、財務/schema/生產 HTML 域 2 輪——**且每一輪的前提是拿到了評分者新 findings 並針對其修正**；沒有新 findings 的那一輪不叫迭代，直接歸 02 §4 兩輪熔斷處理（升級，不是續跑）。此上限不可被引用為「一般任務可以重試 3 次」的豁免。
4. context 黃燈（02 §1 動態節流）→ 停，寫 T6 交接膠囊。

**評分者必須 fresh context**，不可由製作者自評（02 §5）。

- ✅ **正例**：S137/S148 的「對抗審查→修 findings→複審至 PASS」即此模式，每輪輸入是具體 findings 清單。
- ❌ **反例**：「再跑一次說不定就好了」——無新輸入的重試不是迭代，是熔斷對象（02 §4 已明載此話在本 harness 歷史上從未成立）。

---

## §4 Worktree 平行安全 [來源: blocktempo fable-5-2 Step 8, 2026-07-08；FHS 風險註記為本環境實況]

**何時用**：≥2 個 agent 同時**寫**檔且改動面可能重疊；或平行實驗多個實作方案、擇優保留。單 agent 或純唯讀任務不需要。
**怎麼用**：Agent tool 帶 `isolation: "worktree"`（2026-07-08 實測本 harness schema 存在此參數；文檔稱未產生改動的 worktree 會自動清理）。

**⚠️ FHS 環境特有風險（用之前逐條讀）**：
1. **本 repo 位於 SynologyDrive 同步資料夾**，而 harness 的 worktree 建立位置**未經本環境確證**。首次使用前先實測：派一個最小 `isolation: worktree` agent，讓它只回報 `git rev-parse --show-toplevel`——路徑在 SynologyDrive 之下 = 不安全，停用並改走無隔離流程；確證安全後把實測結果寫回本條（附日期）。**自行 `git worktree add` 一律禁止建在 SynologyDrive 路徑下**——同步引擎會攪動 git 中繼資料（衝突副本/半同步狀態）。
2. **Antigravity 前科**（auto-memory 已記載）：AG v1.21.6+ 在 `.git/config` 含 `extensions.worktreeConfig=true` 時崩潰（__store TypeError）。任何 worktree 操作後若 AG 崩潰，跑 `git config --unset extensions.worktreeConfig`。
3. **用完驗證**：`git worktree list` 確認只剩主 worktree；殘留條目用 `git worktree prune` 清。

**默認保守**：FHS 日常任務（單線改檔）一律不用 worktree。這是平行實驗專用工具，不是常規配備。

---

## §5 評分者可降級 haiku（rubric 前置）[來源: blocktempo fable-5-2 成本矩陣, 2026-07-08]

**規則**：評分/分類型子任務，若**明文 rubric 已存在**（逐條可機械判 PASS/FAIL）→ 評分者可派 `haiku`。rubric 不存在 → 先寫 rubric 再派（[[03_judgment-rubrics]] R6：rubric 必須先寫好，事後打分=自欺）。

這是 02 §4「haiku 只做已驗證模式的機械套用」的同一原則：**明文 rubric 就是評分工作的「已驗證模式」**。

**異常升級**：haiku 評分結果無區分度（全 PASS 或全 FAIL）或與抽樣目測明顯不符 → 升 `sonnet` 重評，並檢查 rubric 是否本身含糊（含糊 rubric 換誰評都是假評）。

- ✅ **正例**：T7 fan-out 的 N 份回報，按預寫維度表由 haiku 逐條打分初篩，主對話只裁決分歧項。
- ❌ **反例**：「幫我評這三個方案哪個好」直接丟 haiku、無 rubric——品味級判斷（R6）連 sonnet 都不可靠，haiku 的回答只是雜訊。

---

## §6 健檢掛鉤（stage-1 污染偵測）

季度健檢（[[05_maintenance-protocol]] §7）執行時，追加抽查：**最近 5 條新增的 learnings/02 §7 條目，逐條問「診斷的核實證據是什麼」**（§1 自檢句）。≥2 條答不出 → stage-1 污染回潮，寫入健檢報告並向 Fat Mo 報告，比照自驗豁免漂移處理。

---

## 尾註

- 本檔為凍結快照（D15 慣例）：上游文章更新不自動同步；未來要再吸收，先對照 §0 邊界表。
- 本檔的維護權限比照 [[05_maintenance-protocol]] §1：追加正反例=可自行；動 §1–§5 規則本文=先問 Fat Mo。**例外**：§4 worktree 首用實測結果的回填（附日期）=事實同步（比照 05 §1「修失效路徑引用」級），可自行。
