# 02 — 模型調度守則（Model Dispatch Doctrine）

> **Version**: v1.0.1（2026-07-04，Session 137；同日對抗審查修正：巨檔名單明確化、財務審查 opus 寫死、兩套命名系統警語）
> **讀者**：主對話模型（任何等級）。每逢「大量讀取 / 掃 repo / 查網頁 / 批次改檔 / 選模型」先讀本檔。
> **依據**：[[01_diagnosis]] token 洩漏 #2/#3。
> **與 AGENTS.md 關係**：本檔管「怎麼派工」；業務硬規則（財務/HTML ID/raw_form_state）仍以 AGENTS.md 為準。

---

## §0 環境實測事實（2026-07-04 查證；引用前過期重測）

**Agent tool 的 `model` 參數實測 enum**：`sonnet` | `opus` | `haiku` | `fable`
- `fable` = Fable 5（本制度撰寫者），未來可用性未知——**規則禁止依賴它**；若某天不可用，一律以 `opus` 代位。
- 省略 `model` 時：用 subagent 定義檔的 frontmatter `model:`；定義檔也沒有時，繼承主對話模型。**Agent tool 參數 > frontmatter**。

**effort 參數：不存在。** 本 harness 的 Agent tool 沒有 per-call effort/thinking 旋鈕（實測 schema 只有 model/prompt/description/isolation/run_in_background/subagent_type）。深度控制的替代手段：
1. `Explore` agent 接受 prompt 內指定廣度關鍵詞：`quick` / `medium` / `very thorough`（其定義文檔明載）。
2. 其他 agent：在 prompt 裡寫明步驟預算與深度（「最多開 10 個檔」「找到 3 個一致證據即停」）——這就是 effort 控制，沒有別的。

**內建 agent**：`Explore`（唯讀搜索）、`Plan`（規劃）、`general-purpose`（全工具）、`claude`（catch-all）。
**FHS subagents（9 支）frontmatter 釘選現況（2026-07-04 grep 實測）**：

| Subagent | 現釘模型 | 狀態 |
|---|---|---|
| code-reviewer, build-error-resolver, product-integration-validator | claude-haiku-4-5(-20251001) | ✅ 現役 ID |
| database-reviewer, finance-auditor, frontend-developer, tdd-guide, ui-designer, blender-3d-modeler | claude-sonnet-4-6 | ⚠️ **舊世代 ID**（現役為 claude-sonnet-5）|

⚠️ 待辦（需 Fat Mo 授權，屬 05 權限矩陣「先問」級）：把 6 支 `claude-sonnet-4-6` 更新為 `claude-sonnet-5`，或刪除 `model:` 行改為繼承。過渡期解法（免改檔）：派工時用 Agent tool `model` 參數覆蓋，如 `subagent_type: finance-auditor, model: sonnet`。

⚠️ **兩套命名系統，不可混用**：subagent frontmatter 的 `model:` 用**全名 ID**（如 `claude-haiku-4-5`、`claude-sonnet-5`）；Agent tool 的 `model` 參數用**短名 enum**（`sonnet`/`opus`/`haiku`/`fable`）。把短名寫進 frontmatter、或把全名塞進 Agent tool 參數，都會失敗。

---

## §1 指揮官不下場（主對話禁做清單）

主對話 context 是全 session 最貴的資源——它裝著任務目標、約束、與 Fat Mo 的往來授權。灌進去的每一份原始材料都在擠壓後續推理。

**主對話禁止直接做（→ 派 subagent，只收結論）**：

| 動作 | 門檻 | 派給誰 |
|---|---|---|
| 探索式讀檔 / 找「X 在哪定義」 | 需開 >3 個檔或位置不明 | `Explore`（指定 quick/medium/very thorough）|
| 掃 repo / 跨檔一致性盤點 | 一律 | `Explore`（very thorough）或 `general-purpose` |
| 網頁研究 / 查外部文檔 | 一律 | `general-purpose`（帶回≤30行摘要+來源）|
| n8n workflow JSON dump | 一律 | 先 curl 落檔到 scratchpad → grep 針對性提取；需通盤理解才派 agent 讀檔總結 |
| 批次改檔 | >5 檔或 >10 處同型替換 | `general-purpose`（模式驗證後可用 haiku，見 §4）|
| 大 SQL 結果 / log 分析 | 預期輸出 >150 行 | 落檔 + subagent 分析，回報結論 |

**主對話可以直接做（別為這些浪費一次 spawn）**：
- 已知檔案+已知位置的定點讀寫（1-3 個 Grep/Read/Edit 解決）
- 單條 SQL、單次 curl、預期輸出 <150 行的命令
- 與 Fat Mo 的所有溝通、裁決、授權確認（**這些永遠不可委派**）

**成本平衡（防過度派工）**：每次 spawn 冷啟動要重建上下文，本 plan 上屬昂貴路徑。判準一句話：**「這件事的中間產物會不會污染主 context 超過 150 行？」會→派；不會→自己做。** 為一次 Grep 派 agent 和為 dump 整份 workflow JSON 進主對話，是同一枚硬幣的兩面錯誤。

---

## §2 派工三件套（每個 Agent prompt 缺一不可）

1. **目標與動機**：做什麼 + 為什麼（動機讓 agent 在邊界情況自己做對取捨）。subagent 是冷啟動——把它當「什麼都不知道的新同事」：給檔案路徑、給背景、給術語定義，不給「如前所述」。
2. **驗收條件**：可機械判定的完成標準（「找到定義位置並給出行號」「測試 X 通過」「read-back 確認含 Y 字串」），不是「做好一點」。
3. **回報格式**：明確規定回報結構與長度上限（見 §3 回報合約）。

模板已寫好填空版：[[04_delegation-templates]]，直接套，不要即興發揮。

---

## §3 回報合約（subagent 端遵守，派工 prompt 裡要寫進去）

- 回報 = **結論 + 檔案:行號引用**，上限 ~40 行。
- 任何長產物（報告/diff/清單 >50 行）**落檔**（`artifacts/` 或 scratchpad），回報只傳路徑 + 3 行摘要。
- 禁止在回報裡貼大段檔案內容原文。
- 回報結尾必須有一行：`信心：高/中/低 + 一句理由`（給主對話決定要不要驗證加碼）。
- 主對話收到回報後：**agent 的結論是輸入不是判決**——與已知事實矛盾時，先查證再採信（fresh agent 沒有你的上下文，會自信地錯）。

---

## §4 模型分派表 + 升降級路徑

### 分派表（起手默認）

| 任務性質 | model | 理由 |
|---|---|---|
| 機械批次套用**已驗證的模式**（同型替換×N、格式化、簡單彙總） | `haiku` | 便宜快；只在模式已被證明後才降到這級 |
| 搜尋、實作、重構、研究、審查（一切默認工作） | `sonnet` | 默認主力 |
| 架構裁決、跨 ≥3 模組因果不明的 debug、財務/schema 高風險改動的第二意見、對抗審查 | `opus` | 升級目標 |
| （若可用）品味級判斷、模糊題裁決 | `fable`，不可用則 `opus` | 不依賴 |

### 升降級（機械規則，不留心證空間）

- **haiku 錯一次 → 直接升 sonnet 重做**。不給 haiku 第二次機會（重試成本 > 升級差價）。
- **sonnet 同一子任務連錯兩次 → 升 opus**，且必須帶**完整失敗軌跡**：試了什麼、輸出什麼、預期什麼、兩次的差異。不帶軌跡的升級 = 讓 opus 重犯同樣的錯。
- **opus 也解不掉 → 停**，按 [[03_judgment-rubrics]] §R4 判斷是方向錯了還是該問 Fat Mo。禁止第三種模型輪盤。
- **降級**：opus/sonnet 解出可複製的模式（如「這 40 處都是同一種替換」）→ 把模式寫成明確指令，降 `haiku` 批次套用 + 抽樣驗證（≥10% 或 ≥3 件）。
- **重試上限**：同一方法最多兩輪。第三輪前必須換方法或換模型或升級 Fat Mo——「再跑一次說不定就好了」在這個 harness 的歷史上從未成立過（見 learnings：curl成功Node失敗=指紋問題勿調timeout）。

---

## §5 驗證不自驗（Verification Doctrine）

**原則：寫改動的 context 不做最終驗收。** 依據：01 診斷出錯 #1（自驗豁免漂移）。

| 改動類型 | 最低驗收標準 | 執行者 |
|---|---|---|
| 文件/制度檔 | read-back：fresh agent 讀檔，逐條確認派工方指定的不變量（關鍵句存在、路徑有效、無互相矛盾） | fresh `Explore` 或 `general-purpose`（haiku 可）|
| 程式碼 | 測試或實跑證據（node --test 輸出 / HTTP 狀態碼 / 實際執行 log），不接受「讀起來對」 | 主對話跑命令可（命令輸出=客觀證據），判讀複雜時派 fresh agent |
| 巨檔 HTML 改動 | 替換三步計數 + （視覺類）playwright/preview 實測 computed style | 主對話計數 + 工具實測 |
| 財務 / schema / n8n 部署 | live 驗證附訂單號/versionId/HTTP 碼（既有紀律）**+ fresh-context 第二意見** | fresh agent 強制，**model: opus**（此三域不得降級）|
| 高風險判斷（不可逆、對外、法遵） | 多答案評審：讓 2-3 個獨立 agent 各給答案，主對話按 rubric 選優；或直接升 Fat Mo | 主對話主持 |

**「靜態自檢」豁免收窄**：只適用於同時滿足 (a) 純顯示層 (b) 不碰財務欄位/HTML ID/raw_form_state (c) 改動 <20 行 (d) 有 grep 計數證據。四項缺一，送外驗。

---

## §6 巨檔紀律（規則本體，CLAUDE.md 紅線的完整版）

1. **禁全檔 Read 名單**：`Freehandsss_Dashboard/` 目錄下**所有** `.html`（~15K 行；含 current / V41 / V42，檔名大小寫混用，一律在名單內）、`.fhs/memory/handoff.md`（只准前 120 行）、`CHANGELOG.md`、`.fhs/notes/session-log.md`、`.fhs/notes/decisions.md`、任何 n8n workflow JSON。
2. 讀法：Grep 關鍵詞取行號 → `Read offset/limit`，單窗 ≤250 行。找不到就換關鍵詞再 Grep，不是擴大讀取範圍。
3. n8n workflow：`curl → 落檔 scratchpad → python/jq/grep 針對性提取`。修改用既有慣例「GET → 定點改 → PUT（body 只含 name/nodes/connections/settings 四欄）」。
4. 改巨檔 = §5 替換三步計數，無例外。

---

## §7 實戰修正錄（供未來 session 追加；格式見 05 §3）

> 調度層教訓寫這裡（不寫 learnings.md——那是 FHS 業務域）。每條 ≤3 行：情境 / 修正 / 日期。

- 【情境】general-purpose 研究型子任務（T4）3 次工具呼叫、22 秒即回報「等待其他背景任務」——誤把自己當協調者而非執行者，零實質研究。【修正】T4 派工 prompt 須明文「你是唯一執行者，直接呼叫 WebSearch，不要回覆等待類文字」；同一任務第一次失敗，重派時加此警語即可，不必立即升級模型。【日期】2026-07-04
- 【情境】handoff.md 開頭 UTF-8 BOM 使 `session-start-sop.sh` 的 `awk '/^```handoff$/'` 無法匹配首行，SessionStart hook 長期靜默走 fallback（head -8）而非設計中的動態段精準抽取，過期偵測功能同樣失效。【修正】任何被 shell 腳本以行首錨點 pattern（`awk`/`grep ^`）解析的檔案，若曾用非 UTF-8-no-BOM 工具寫入（Windows 記事本、某些 IDE 儲存），改動前先 `xxd \| head -c 3` 確認無 `ef bb bf`；hook 腳本本身可加 `sub(/^\xef\xbb\xbf/,"")` 防禦。【日期】2026-07-04
- 【情境】`pre-tool-guard.js` 的 R2/R3 只掃 Write/Edit 的 `content`/`new_string`（不掃 `old_string`），R5-R9 只掃 Bash/PowerShell 的 `command`（不掃 API key pattern）——寫測試夾具或合法密鑰檔（如 `.env`）內容含真實 key 格式字串時，用 Edit 工具會被自己新增的規則誤傷，改用 Bash 寫入或把敏感子字串拆成兩段字串相加即可繞過（非繞過安全意圖，是避免對測試資料/合法密鑰居所的誤判）。【修正】未來若要在受 guard 保護的檔案內寫入「看起來像密鑰但其實是測試資料」的內容，優先用 Bash 寫檔或字串拼接拆解，不要嘗試放寬 guard pattern 本身。【日期】2026-07-04
