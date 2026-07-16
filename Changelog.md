# Changelog

## [2026-07-16] Session 177續（Claude Code / Sonnet 5 執行，`/grilling` 六輪拷問後執行）— n8n 殭屍 workflow 清理（22 條）

- **緣起**：S174 `/team` live 實掃揭露 25 條停用 n8n workflow 中疑似 7 條殭屍待批准清理；本 session 追查 `FHS_Query_GlobalReview` 執行異常時一併全量重新盤點。
- **`FHS_Query_GlobalReview` 異常根因**：直查該 workflow 最近 10 次執行（2026-07-12~07-14）100% 失敗，錯誤均為「Search Main_Orders」節點打 Airtable API 回傳 `429 PUBLIC_API_BILLING_LIMIT_EXCEEDED`——與 handoff.md 已記錄嘅「Airtable API 本月額度用盡」係同一個額度牆打在另一條 workflow 上，非新故障，AI 端無法修復，只能等額度重置或升級方案。
- **殭屍盤點**：25 條停用 workflow 全查，非 7 條而係 22 條判定可刪（4 條測試垃圾件 + 6 條 `FHS_Core_OrderProcessor` 版本演化前身 + 12 條 V22/V25 世代舊管線），3 條保留（`FHS_Deploy_Webhook`／`3brain API Probe`／`FHS AI 開發團隊`——AGENTS.md §1.2 明文休眠藍圖，非殭屍）。
- **依賴查核（刪除前四項事實驗證）**：① 10 條活躍 workflow 全定義掃描，零 Execute Workflow 子呼叫節點依賴；② 全 repo grep 22 個 ID，命中僅生成物快照 + 現行活躍件殘留嘅前身 `id` 欄位（非依賴，反而證實 2 條演化血緣：`Fetch_V25_Order`→`FHS_Query_OrderHistory`、`FHS_Error_Monitor`→`FHS_System_ErrorMonitor`）；③ 22 條執行紀錄查詢全部「從無執行紀錄」。
- **`/grilling` 六輪拷問定案**：Q1 備份 commit 入 git（非本地暫存）；Q2 全部 22 條先備份完、覆核齊全先開始刪（非逐條原子處理）；Q3 任何一條備份失敗即全部停低零刪除（非跳過繼續）；Q4 備份+刪除一次過做完唔再停低問（非分階段確認）；Q5 三重驗證（API 重查停用數／活躍不變／重跑生成器）；Q6 index.md 記錄前身推斷血緣。
- **執行**：22 條全 GET 備份成功（`n8n/archive/zombies-2026-07-16/`，22 JSON + index.md）→ 22 條 DELETE 全數成功（HTTP 200，其中 1 條因 Windows curl `/dev/null` 寫入 quirk 誤判失敗、重跑後確認 404＝已刪成功，非資料損失）。
- **三重驗證結果**：① 停用 workflow 總數 25→3，與預期保留名單完全一致；② 活躍 10 條 workflow ID/active 狀態零變動；③ 重跑 `agent_dashboardV42.js` 顯示「✨ 零勘誤」（此 worktree 缺 `.env`，n8n live 探測本身 skip，非迴歸——實際 n8n 狀態已由①②直查確認）。
- **決策脈絡**：非架構決策，不編新 D 號，同 S177 先例一致；純例行技術債清理。
- **Subagent 使用記錄**：❌ 未使用 subagent — 全程主對話（Sonnet 5）直接用 n8n API 執行，屬單純 API 查詢/刪除操作，非需要獨立驗證視角的財務/HTML/schema 改動。

【交付前雙紀律自檢】
驗收：n8n 生產系統刪除操作（不可逆）— 刪除前已完整備份存檔 + 四項事實依賴查核 + `/grilling` 六輪拷問取得 Fat Mo 逐項明確同意 = ✅（非財務/HTML/schema 類別，不落入 02 §5 fresh-context 強制驗收分流，但已用查證+備份+拷問三重把關替代）
Subagent：❌ 未使用 — 判斷理由見上

## [2026-07-16] Session 177（Claude Code / Fable 5 裁決 + Sonnet 5 執行）— `/team` R4 勘誤跟進：4 項 subagent 版本漂移修復

- **緣起**：S174 `/team` 重生成撈到 4 項 MANIFEST 漂移（`database-reviewer`/`tdd-guide`/`ui-designer` frontmatter 版本號 ≠ MANIFEST 記錄、`finance-auditor` 未登記於 MANIFEST），已記入 S175 待辦，`ai-team-registry.md` R4 禁止靜默忽略。
- **方案審視（執行前，Fable 5）**：先核實 master（`.fhs/ai/subagents/freehandsss/`）與已安裝（`~/.claude/agents/freehandsss/`）兩邊 frontmatter 完全一致，非雙目錄失同步；真正過時的只有 `MANIFEST.md`。按 registry §1「frontmatter 為真源」原則裁決：修復方向＝MANIFEST 追上 frontmatter，不得反向改動 frontmatter；本次不觸及 `model:`/`tools:` 欄，屬 governance/05 §1「可自行改」範圍的例行同步，非需 Fat Mo 事先批准的規則變更。
- **執行內容**：`.fhs/ai/subagents/MANIFEST.md`「已安裝 Agents」表更新 database-reviewer(1.0.0→2.1.0)/tdd-guide(1.0.0→1.1.0)/ui-designer(1.1.0→2.0.0)，新增 finance-auditor(2.2.0) 一行；「版本歷史」表尾補齊對應歷史條目（附 git commit hash 或 last_updated 註記）。順帶 P0.2 文件同步掃描抓到 `docs/repo-map.md` 同款漂移（finance-auditor 標註 v2.1.0、tdd-guide 標註 v1.0.0），一併修正至 v2.2.0/v1.1.0。
- **驗證**：重跑 `node scripts/agent_dashboardV42.js`，console 顯示「✨ 零勘誤」、`artifacts/agent_dashboardV42.json` `warnings: []`，原 4 項全清；9 支 subagent 版本逐一與 frontmatter 核對相符；`git status` 確認未手改任何 frontmatter 或生成物（R1）。
- **待確認**：`finance-auditor.md` frontmatter 缺 `model` key，MANIFEST 新增行暫填 `claude-sonnet-4-6`（比照同類 native subagent 慣例外推，非真源欄位），待 Fat Mo 確認是否需要補回 frontmatter 的 model 欄。
- **未納入本次範圍**：`/fhs-audit` 掃描順帶偵測到 `learnings.md` 52 條超出 governance/05 §4 上限 50 條，非本任務範圍，只記錄不處理，留待 `/fhs-slim`。
- **後效同步稽核**：[A] 觸發（`docs/repo-map.md` 已同步）；[B] 不適用（無制度層規則變更，純資料勘誤）；[C] 已更新本條目；[G] 不適用（無財務欄位異動）。
- **Subagent 使用記錄**：✅ 使用 1 支 — general-purpose（sonnet，T2 模板）執行 MANIFEST 修復；方案審視由主對話（Fable 5）完成。

【交付前雙紀律自檢】
驗收：低風險文件層修正 — 生成器機械驗證（零勘誤）非自驗 = ✅（02 §5 分流表「文件/勘誤修正」豁免中高風險雙 verdict）
Subagent：✅ 使用 1 支 — general-purpose 執行修復，按 governance/04 T2 模板派工

## [2026-07-16] Session 176（Claude Code / Sonnet 5 執行）— Audit Ledger「疑漏算加購」假警示移除（`/grilling` 拷問確認後執行，D37）

- **緣起**：Fat Mo 回報訂單 0600724 財務分頁鎖匙扣品項出現紅色「⚠ 疑漏算加購」警示，並質疑該訊息本身邏輯有錯（誤把已 ×qty 的打印/環扣/運費金額當單件金額顯示）。
- **查證過程（三輪反覆，最終用 live Supabase 交叉比對坐實）**：
  - 第一輪：AI 只看單一訂單 0600724 的 order_items 欄位，誤判「數字都對，警示是誤報」。
  - 第二輪：AI 擴大查詢範圍到 24 筆同類活資料，誤判「n8n 真的漏算 quantity，是 Task A 舊病灶重現」。
  - 第三輪（正確）：交叉比對 `orders.keychain_cost` 用已知運費扣減公式 `(總片數-1)×$20` 反推——`250+250-60=440`，精準對上 0600724 的 `keychain_cost=440`；07001007（`360+360-60=660`）同樣對上。證實 **`subtotal_cost`／`keychain_cost`／`total_cost` 從未算錯**，真正不一致的只有 `item_base_cost` 這個輔助欄位（n8n 寫入時有時存單件charm價、有時存整套catalog價），此觸發了前端 `qtyUnscaled` 判斷式的系統性誤報（對 24 筆樣本中所有「有明細分解」的正常訂單全部誤報，零真陽性）。
- **`/grilling` 拷問確認方案**（五輪逐條確認，Fat Mo 全部作答）：完全移除警示文案（非改字）→ 連帶移除收合狀態的紅色 ⚠ icon → 「單件基礎成本」標籤語意問題本次不動 → dev（V42）+ production（current.html）一次過改 → fresh-context subagent 覆核。
- **執行內容**：`buildAuditLedgerHtml()` 刪除 `qtyUnscaled` 變數宣告 + 警示文案行 + summary 紅色 ⚠ 三元運算式，`freehandsss_dashboardV42.html` 與 `Freehandsss_dashboard_current.html` 同步刪除，純顯示層改動，無任何金額計算邏輯異動。Fat Mo 直接回覆「一起改」構成 AGENTS.md §3 路徑(a)升格確認，AI 自建 `.fhs/.deploy-ok` 執行 current.html 部署。
- **驗證**：fresh-context code-reviewer 覆核（讀 diff + 語法平衡檢查 + 用訂單 0600724 已知數據手動追蹤邏輯路徑），PASS，判定可部署；發現一項非阻塞殘留（CSS class `.fhsAudit_qtyWarn` 樣式表仍在但零元素引用，純死代碼，留待日後衛生清理）。
- **教訓**：`item_base_cost` 欄位語意不可靠（同一 category 不同訂單，有時單件有時整套），任何以此欄位為前提的前端判斷式都不可信；根治需動 n8n Code Node（資料源頭），屬獨立範圍本次刻意不做。已更新 auto-memory `project_keychain_addon_qty_cost_bug.md` 修正舊有誤解。
- **後效同步稽核**：[A] 不適用（無 repo-map 相關新增）；[B] 觸發（生產 HTML 財務顯示邏輯異動，已同步 decisions.md D37 + 本條目 + handoff MASTER 表）；[C] 已更新本條目；[G] 觸發但核實為誤報修復非財務計算異動，已於本條目說明。
- **Subagent 使用記錄**：✅ 使用 1 支 — code-reviewer（fresh-context 驗收，diff + 語法 + 邏輯路徑追蹤，PASS）。

【交付前雙紀律自檢】
驗收：生產 HTML 顯示層改動 — fresh-context code-reviewer 覆核 PASS（非自驗）= ✅（02 §5 分流表適用）
Subagent：✅ 使用 1 支 — code-reviewer 驗收，按 governance/02 §1 及既定驗收流程派工

## [2026-07-15] Session 175（Claude Code / Sonnet 5 執行）— llm-council-skill 查證+暫緩安裝（D28）+ `/rp`／`/cl-flow`／`/ag-flow` 拷問掛鉤機械化（D36）

- **緣起①**：Fat Mo 分享 Notion 導讀文章 + GitHub `tenfoldmarc/llm-council-skill` 連結（Karpathy「LLM Council」方法論移植版技能：5顧問人格平行辯論+匿名互審+主席裁決），問要唔要裝。
- **查證與裁決**：WebFetch 讀取 GitHub repo 原文 `SKILL.md` 全文（Notion 文章因重定向失敗未能直讀，repo 原文已足夠評估），對照 FHS 現有決策工具鏈（`/8d`/`/cl-flow`/`/px`/grilling）逐項比較後，俾 Fat Mo 三選一方案，Fat Mo 選方案 A：**暫緩安裝**，理由是同期已有拷問技能（D27）在 4 週試用觀察期，同時裝兩套「決策輔助 meta-skill」會攤薄量測。
- **`/8d` 自我迭代**：Fat Mo 後續打 `/8d` 對「暫緩安裝」方案本身跑自我批評，抓出原案用「拷問用量」單一判準裁決 council 去留屬 proxy 錯配（兩者使用場景唔同）。v2 修訂：判準解耦（拷問按原 D27 判準；council 改用「過去4週 decisions.md 新增大架構/治理決策 D 條目 ≥2 單」自己嘅需求證據）、補記「鎖模型」屬 prompt 層指示非 hook 機械強制、成本結構預案（若日後安裝由 5+5+1=11 subagent 砍為 3+1=4 subagent）、設一次性 scheduled task（taskId `fhs-2026-08-09-skill-trial-gate-review`，fireAt 2026-08-09T09:00+08:00）自動覆核，避免重演 S168 live cron 覆核飄移嘅同款模式。
- **緣起②**：Fat Mo 追問「點解拷問技能唔自動掛入日常 `任務→/rp→cl-flow` 工作流」。查證 `rp.md`/`cl-flow.md` 原文設計理由後答覆：全自動執行違反 grilling 核心原則（決策權在人類非 AI 代答）、`rp.md` 明文「精煉階段無參照物，強制批評是表演」、Compatibility Map 明文禁止 AI 主動在管道指令前插精煉層——三者皆指向不可強制自動化。但識別出真缺口：D27 承諾嘅「AI 主動問要唔要拷問」一直靠行為層記憶落地，未機械化掛在 `/rp`/`/cl-flow` 既有嘅模糊度判斷點（`structural_warning`／Gate 1）上。
- **執行內容**（純提議掛鉤，`structural_warning` 未觸發時零改動零摩擦）：
  - `.fhs/ai/commands/rp.md`（v2.3→v2.4）：Step 3 `structural_warning` 有實際觸發時，XML 輸出後加一行主動提議「要唔要『拷問我』一輪」。
  - `.fhs/ai/commands/cl-flow.md`（v2.2.0→v2.2.1）：Gate 1 審閱框新增「拷問我」回覆選項，選咗先跑 grilling 逐條釐清，問完返回同一個 Gate 供最終確認，不自動略過。
  - `.fhs/ai/commands/ag-flow.md`：同步補齊對應 Gate 1 選項（該檔案 2026-07-04 起已 DEPRECATED，僅歷史一致性，非新建議用法）。
  - `.fhs/ai/commands/cl-flow-fast.md` 不改動——其設計本身已跳過 `structural_warning`，掛鉤天然不適用。
  - `docs/repo-map.md`：同步修正 `rp.md`/`cl-flow.md` 版本號標記（P0.2 文件同步），順手訂正 `cl-flow.md` 一處已存在嘅舊 `v2.1.0` 標記漂移（非本次造成）。
- **順帶發現**：`/team` 重生成時撈到 4 項舊有 subagent 版本漂移勘誤（`database-reviewer`/`tdd-guide`/`ui-designer` frontmatter 版本號 ≠ MANIFEST 記錄、`finance-auditor` 未登記 MANIFEST 已安裝表），與本次任務無關但依 R4 規則禁靜默忽略，已記入 handoff MASTER 表待處理，非本次範圍修復。
- **`.fhs/ai/team-manifest.json`**：新增 `fhs-2026-08-09-skill-trial-gate-review` scheduled task 做非檔案資產登記（`automations` 陣列），重跑 `agent_dashboardV42.js` 確認同步（121→122 成員）。
- **驗證**：純文件/治理層改動，無 runtime 代碼異動，非 browser/live 驗證範圍；scheduled task 建立由工具回傳確認生效；`/team` 重生成成員數字變化符合預期（新增 1 項自動化資產）。
- **後效同步稽核**：[A] 已更新 `docs/repo-map.md`；[B] 觸發（Master 指令檔 `rp.md`/`cl-flow.md`/`ag-flow.md` 屬治理層變動，已同步 decisions.md D28/D36+本條目+handoff MASTER 表三處）；[C] 已更新本條目；[G] 不觸發（無財務函式異動）。
- **待辦**：2026-08-09 09:00 scheduled task 自動覆核拷問試用閘＋council 判準；4 項 subagent 版本漂移待處理。
- **Subagent 使用記錄**：❌ 未使用——純本地文件查證（WebFetch 讀 GitHub repo 原文）+ 治理檔案落盤，範圍明確可直接驗證，無需獨立 fresh-context 審查。

【交付前雙紀律自檢】
驗收：純文件/治理層改動，無業務邏輯/財務/生產 HTML 異動 = 免驗收門檻適用；scheduled task 建立已由工具回傳確認、`/team` 重生成確認資產同步 = ✅
Subagent：❌ 未使用（純文件查證+治理落盤，範圍明確，理由見上）

## [2026-07-14] Session 174（Claude Code / Sonnet 5 執行）— AI 助理團隊名冊（`/team`）v1.1：白底卡片牆 + n8n live 實掃 + 服務狀態 zone + 左側功能欄；生成器改名 `agent_dashboardV42.js`

- **緣起**：Fat Mo 分享 Threads @raymond0917「AI Agent Dashboard」帖文，授權「找方案達成它，甚至更好」，指定讀者為未來 AI 模型（判斷/推理需轉成制度文件）。v1.0（D30）先落地生成式名冊架構；Fat Mo 隨後兩輪追加視覺與功能要求：①貼參考截圖要求改用白底卡片牆風格；②貼「自動化/服務狀態」參考圖要求補功能指標並分類；③要求改名呼應 V42 命名慣例並執行 `/commit`。
- **v1.0 → v1.1 渲染層重寫**（`scripts/agent_dashboardV42.js`，原名 `agent-dashboard.js`）：
  - 白底卡片牆風格：頁頭統計 4 tiles（成員總數/分類數/召喚詞/勘誤）、搜尋列+7 個 filter chips、每卡 emoji 圖示磚+彩色分類 pill（10 色系）、「⟳ 重新生成」複製指令掣。
  - **n8n workflows 由「manifest 手記」升級為「API live 實掃」**：`.env` 讀 `N8N_INSTANCE`/`N8N_KEY`，`curl` 叩 `/api/v1/workflows`（全量 35 條自動發現）+ `/api/v1/executions?limit=50`（最近執行結果），active 旗標 × 最近執行狀態 → 運行/異常/停止/待命四態；離線時整批標「未知」，生成不失敗（`n8n_categories` regex 分類規則 + `n8n_id` 供長期成員補描述，皆登記於 `team-manifest.json`）。
  - 新增「服務狀態」zone：4 個統計 tiles（自動化總數/常駐服務/守護狀態/執行紀錄，含最近成功/失敗次數）+ 9 個 `<details>` collapsible 分類清單（治理守護/交接路由/文件衛生 3 類 hooks；規劃管道/業務流水線/財務/查詢讀取/系統維運監控/其他實驗 6 類 n8n workflow），異常成員卡片自動粉紅底。守護狀態 tile＝`fhs-health-check.js` issue_count ＋ `.kgov-pending` 旗標 ＋ hook `node --check` 語法檢查三合一即時判定。
  - 新增左側功能欄（sidebar，`>1120px` 顯示）：上層 8 個頁內錨點導航（含平滑滾動+ active 高亮）、下層 6 個外部工具入口（新視窗開）——🏪 V42 生產 Dashboard（`https://yanhei.synology.me/Freehandsss_dashboard_current.html`，URL 由 `upload-web.ps1` 部署慣例推導並實測 HTTP 200 後始落盤，非猜測）/🔩 n8n 後台/🐘 Supabase 後台/📋 Airtable/🎬 Canva/📺 YouTube @Free_handsss，登記於 `team-manifest.json` 新增之 `sidebar_links`。
  - **實測即時抓到 3 個真問題**（非本次改動製造，工具上線即發現）：`FHS_Query_GlobalReview` workflow active 但最近一次執行 error；最近 50 次 n8n 執行有 15 次失敗（30%）；25 條 workflow 處於停止狀態，其中「其他/實驗」類 7 條（`Qqq`/`My workflow`/`TEMP_DELETEME_*`/多隻 `OrderProcessor` clone）疑為殭屍 workflow，待 Fat Mo 批准另開清理 session。
- **改名同步**（Fat Mo 指定，呼應 `Freehandsss_dashboardV42.html` 命名慣例）：`scripts/agent-dashboard.js` → `scripts/agent_dashboardV42.js`；輸出 `artifacts/agent-dashboard.{html,json}` → `artifacts/agent_dashboardV42.{html,json}`。同步更新 6 處引用：`team-manifest.json`、`.fhs/notes/ai-team-registry.md`（升 v1.1.0）、`.fhs/notes/decisions.md`（D30 追加 📌 更新註記，原文保留不追溯改名）、`.fhs/ai/commands/team.md`＋`.claude/commands/team.md`（升 v1.1.0）、auto-memory `project_ai_team_dashboard.md`。
- **文件同步補完**（`/commit` P0.2）：`scripts/README.md` 補 `agent_dashboardV42.js` 條目；`docs/repo-map.md` 補 `team.md` 條目（並標註該區塊既有缺口——2026-05 後新增指令未逐一補齊，非本次造成，留待 `/fhs-slim`）。
- **驗證**：瀏覽器實測（Browser pane，`http://localhost:3000/agent_dashboardV42.html`）——桌面 1280px 截圖確認服務狀態 zone 4 tiles + 9 個分類 collapsible 正確渲染；`FHS_Query_GlobalReview` 異常卡粉紅底可見；sidebar 撳「服務狀態」icon 觸發平滑滾動+高亮；零 console error；HTML/JSON 密鑰洩漏掃描（`eyJhbGci` JWT 前綴）確認乾淨；重新生成後統計數字一致（121 成員，無因改名/重構產生數據漂移）。
- **制度層**：無新增 D 編號（屬 D30 既定方向的迭代執行+使用者直接指示，非新架構決策）；`.fhs/notes/ai-team-registry.md` 升 v1.1.0（§2 補 n8n live 實掃行、§4 補服務狀態快照非實時邊界）。

## [2026-07-13] Session 173（Claude Code / Sonnet 5 執行）— P2c：意圖標註 + 回覆範本庫執行完成（S150 §4.8 剝離範圍）

- **緣起**：Fat Mo 於用量緊繃（約5%剩餘）情境下明確批准 `/execute` P2c（cl-final-plan §6.3 P2c 段，flow_id 2026-07-13-1224），依賴 P2a（訊息入庫），不依賴 P2b。
- **執行前查證發現阻塞點**：計畫 §7 要求「意圖 regex 對照既有真實 IG 對話樣本（至少 20 則，人工標記地面真相）量測覆蓋率 ≥70%、主標籤準確度 ≥80%，未達標不算 P2c 完成」。查證 live 資料：`ig_messages` 表 0 筆（P2a 上線後 cron 僅跑過一次，當日 0 筆符合條件）；`ig_watchdog_alerts` 現存 10 筆真實 snippet 全為訂單細節確認文本，無 cancel/complaint/payment_inquiry/modify_order 案例，多樣性不足。三選一問 Fat Mo（AskUserQuestion），裁決：**先建代碼、驗收延後**，量測項目明確標記待自然累積後補測，不宣稱已達標（誠實收窄，比照既有 P2a/P2b 慣例）。
- **編號調整**：計畫書原文 migration `0056` 已被同日另案 task_e3a60daa（D33）佔用，改用 `0057`。
- **設計調整**（比照 P2b/migration 0054 已審查通過的先例）：計畫書原文 `message_intents.message_id` 為 FK→`ig_messages`，但現行 n8n REST POST 批量 fire-and-forget 寫入模式取不回 INSERT 產生的 UUID，改用 `message_thread`+`message_ig_message_id` 軟性參照，沿用 P2b 已定案模式。
- **執行內容**：
  - `supabase/migrations/0057_create_message_intents_and_reply_templates.sql`：`message_intents` 表（5類 `intent_label` CHECK 約束 + dedup 唯一索引 + pg_cron 90天 TTL）+ `reply_templates` 表（5類意圖各1筆草稿種子，佔位文案待 Fat Mo 覆核）。已 `apply_migration` 至 live DB。
  - `scripts/ig-watchdog/lib/order-match.mjs`：新增 `tagIntent(text)` 純函式（`INTENT_PATTERNS` 5類 regex：cancel/complaint/modify_order/payment_inquiry/place_order，優先序取消/投訴 > 改單/查詢/新單），單一真源不新開判斷邏輯。
  - `scripts/ig-watchdog/lib/order-match.test.mjs`：新增 8 組 `tagIntent` 單元測試（功能回歸用途，測試檔內明確註記非 §7 正式驗收樣本）。
  - `scripts/ig-watchdog/build_n8n_workflow.cjs`：`Classify & Report` 節點新增 `intents` 陣列組裝（只標註客人發出的訊息，`isBizSender()` 過濾）；新增 `Has Intents?` IF 節點 + `Write Intents` HTTP Request 節點（`on_conflict` 對齊 dedup 索引，吸取 P2a F3 教訓不重犯）；`Classify & Report` 平行分支擴充為 4 條。
  - `.gitignore`：補 `.fhs/.kgov-block-count`（hook 執行期新產生的 runtime 計數檔，比照既有 `.kgov-pending`/`.deploy-ok` 慣例排除版控）。
- **部署與驗證**：`node --test` 43/43 PASS（含新增 8 組）；diff-guard 測試 PASS（lib 嵌入一致性）；build script 執行 + JS 語法檢查通過；GET live workflow → 與本地重建 JSON 結構化 diff（僅新增 2 節點 + `Classify & Report` 內容更新 + 對應 connections，無其餘節點/連線 drift）→ PUT 部署（HTTP 200）→ 再 GET 確認 26/26 節點與本地建構版本逐一比對零差異。live DB 查詢確認 `reply_templates` 5 筆種子資料、`message_intents` 索引/CHECK 約束全部正確建立。**未做** §7 要求的覆蓋率/準確度正式量測（見上方阻塞點裁決）。
- **後效同步稽核**：[A] 已更新 `docs/repo-map.md`（新增 migration 0057 行）；[B] 不觸發（非制度層檔案變動）；[C] 已更新本條目；[G] 不觸發（無 `CREATE OR REPLACE FUNCTION`/財務欄位語義變動，新表為 IG 看門狗輔助資料，非財務主題）；[F] 不觸發（無 AGENTS.md 新 Rule/無 commands 增刪/無核心業務語義修正）。
- **待辦**：`ig_messages` 自然累積足量真實訊息後補測 §7 覆蓋率/準確度；`reply_templates` 5 筆草稿文案正式對客使用前需 Fat Mo 覆核修訂。
- **Subagent 使用記錄**：❌ 未使用——單一功能域（regex 純函式+schema+n8n節點）改動，範圍明確可直接程式驗證+live GET/PUT diff 核對，且 cl-final-plan §7 已明定 fresh-context opus 審查範圍為「P2b 完成後一次」（P2a+P2b+P2c 三期共用，已於 S171續執行），P2c 不重複觸發。

【交付前雙紀律自檢】
驗收：schema/n8n 部署 — live migration apply 確認 + GET/PUT/GET 三段 diff 零差異 + node --test 43/43 PASS + diff-guard PASS（附運行證據）= ✅；§7 量測項目誠實標記未達標/延後，非隱瞞 = ✅
Subagent：❌ 未使用（理由見上，plan §7 已將 fresh-context opus 審查範圍定義為 P2 系列共用一次，非逐期重複）

## [2026-07-13] Session 172（Claude Code / Sonnet 5 執行）— /canva-auto 訂單 0800802（Janet）執行 + SOP 缺口修補 + Parakeet 公式 v2 重擬合

- **緣起**：`/canva-auto` 執行 Janet 訂單 0800802（純音樂款，特殊之處：客人有 2 條 Lovart 動畫 Video1/Video2，非慣常 1 條），Fat Mo 指定母片 DAHN9LxGdEE 作參考。
- **Stage①-③ 執行**：copy-design + 改名 + 換字句 + 歸檔；發現 Fat Mo 首次上載嘅 page2 圖對其實係未加工原始檔（非 `local_prep.py` 去背/Parakeet 版），退回重上載；page3 雙片首次無 precedent，AI 首版猜「並排」，另撞到 `resize_element` `preserve_aspect_ratio=true` 保留嘅係「目前 container 舊比例」而非 asset 原生比例嘅陷阱（864×864 方形 container 令 960×1920 直片變形重疊），已修正並記落 known failure modes。
- **Fat Mo 人手修正 + 5 點回報**：page3 正確版型係「兩段片疊放同一位置」（非並排，同母片一致）；page2 黑白圖 Fat Mo 改用 **Canva 原生 ColourMix > Parakeet** 效果重新生成（Hue offset=0.8/Saturation=0.3/Rainbow amount=0.2/Rainbow offset=0），非本地公式版本；另加人手進場動畫（黑白圖=墨水/汙漬，彩色圖=模糊類）；揭發**客人音訊全程未上載**（AI SOP 從未提示呢步）。
- **收口動作**：
  - `canva_auto/placement_memory.json`：新增 order 0800802 案例，記錄 page2/page3 正確幾何、asset 替換、動畫需求、音訊缺口，`learned: true`。
  - `canva_auto/local_prep.py`：Parakeet 色相公式改用**正規化座標**（u=x/寬, v=y/高）重新反推，取代 v1「拉伸貼合 1563×1563 參考 canvas」未驗證假設；新增 `canva_auto/sample_gradient_fit.py`（相位差分法反推工具，供日後滑桿數值變更時重新擬合）；`canva_auto/README.md` 同步更新已知限制章節。Saturation 擬合值 0.3064 同 Fat Mo 滑桿讀數 0.3 幾乎完全吻合，交叉驗證通過（樣本為 182×199 縮圖，未用全解像度驗證，已記錄為待覆核風險）。
  - `.fhs/ai/commands/canva-auto.md`：Stage②補「純音樂款須上載客人音訊」必做提醒；新增 Stage③人手補完清單（進場動畫/音軌/過場/頁面時長皆屬 Canva MCP 掂唔到嘅範圍）；Known failure modes 追加 `resize_element` preserve_aspect_ratio 陷阱記錄。
  - Fat Mo 已補上載客人音訊並 set 好，訂單出貨（MP4 + 封面 JPG）。
- **驗證**：本地重跑 `local_prep.py` v2 公式，肉眼比對輸出色調方向同 Fat Mo 嘅 Canva 原生版本一致；Saturation 數值交叉驗證。
- **後效同步稽核**：[A] 已更新 `canva_auto/README.md`（同目錄內文件同步，非 repo-map 範圍——`docs/repo-map.md` 本 repo 現無此檔，屬既有缺口非本次新增）；[B] 不觸發（產品線工具修復，非治理制度層變動）；[C] 已更新本條目；[G] 不觸發（無財務計算函式異動）。
- **Subagent 使用記錄**：❌ 未使用（Canva MCP 在主 session，canva-auto.md 執行規則明文不派工）。

【交付前雙紀律自檢】
驗收：local_prep.py 公式改動 — 本地重跑肉眼比對 + Saturation 數值交叉驗證（0.3064 vs 0.3）= ✅；Canva 設計改動由 Fat Mo 親自驗收並確認出貨 = ✅
Subagent：❌ 未使用（Canva MCP 主 session 限定，不派工）

## [2026-07-13] Session 171續II（Claude Code / Sonnet 5 執行）— task_e3a60daa 修復：Write Alerts on_conflict + 補記錄一筆未落文件的 live drift

- **緣起**：Fat Mo 批准處理 D31/D32 F4 追蹤的既有缺陷（`ig_watchdog_alerts` 的 `Write Alerts` 節點缺 `on_conflict`，冪等形同虛設）。
- **診斷發現**：`ig_watchdog_alerts` 的冪等鍵 `ix_igwatch_alerts_dedup` 是 `COALESCE(order_id,'')` **expression index**（因 `order_id` 可為 NULL），與 P2a/P2b 的 plain-column 索引結構不同——PostgREST `on_conflict` 參數不支援 expression 作 conflict target，不能照抄 P2a 修法。進一步查證發現 **DB 側已被修好**：一筆完全未落文件的 live migration（Supabase 內部版本 `20260713091833`／name `igwatch_alerts_on_conflict_fix`）已新增具現化欄位 `order_id_key`（`GENERATED ALWAYS AS (COALESCE(order_id,'')) STORED`）+ 新 plain-column 唯一索引 `ix_igwatch_alerts_dedup_v2`；GET live n8n workflow 確認 `Write Alerts` 節點 URL 也已帶 `?on_conflict=alert_date,thread,order_id_key,kind`——修復本體其實已全部 live 部署完成，但本地 `build_n8n_workflow.cjs`/`supabase/migrations/` 皆未同步，且全程零文件記錄。
- **本次執行**（純補齊 SSOT，非新部署）：
  - `scripts/ig-watchdog/build_n8n_workflow.cjs`：補回 `on_conflict` 參數 + 說明註解，與 live 狀態同步。
  - 新建 `supabase/migrations/0056_igwatch_alerts_on_conflict_fix.sql`：照抄已 live 執行的 DDL（`IF NOT EXISTS`/`IF EXISTS` 冪等），關閉 migration 編號 drift。
  - GET live workflow 與重新產生的本地 JSON 逐節點/連線 diff：24 個節點完全一致（僅 `settings.callerPolicy`/`availableInMCP` 兩個 n8n 自動附加欄位差異）——**未重新 PUT**，避免不必要的 Google Drive credential 重新指派負擔。
- **驗證**：`EXPLAIN INSERT ... ON CONFLICT (alert_date, thread, order_id_key, kind) DO NOTHING` 對 live DB 執行（零寫入，僅 query plan），輸出確認 `Conflict Arbiter Indexes: ix_igwatch_alerts_dedup_v2` 正確命中。
- **task_e3a60daa**：已確認修復（DB+n8n 皆已 live），dismiss 該背景任務 chip。
- **後效同步稽核**：[A] `docs/repo-map.md` 待下次 `/fhs-slim`/`/commit` 週期補列 migration 0056；[B] 不觸發；[C] 已更新本條目；[G] 不觸發（無 CREATE OR REPLACE FUNCTION，本次為 index/generated column，非財務計算函式）。
- **Subagent 使用記錄**：❌ 未使用——純診斷+對齊既有 live 狀態，無新邏輯需要獨立審查；驗證改以 live EXPLAIN query plan 證據替代。

【交付前雙紀律自檢】
驗收：schema/n8n 改動 — `EXPLAIN` query plan 證實 conflict arbiter 命中新索引 + GET live workflow 逐節點 diff 確認一致 = ✅（附運行證據，未額外派 fresh-context agent，因本次為「補記錄已 live 狀態」而非新邏輯）
Subagent：❌ 未使用（診斷+文件同步性質，無新業務邏輯）

## [2026-07-13] Session 171續（Claude Code / Sonnet 5 執行）— P2b 內容比對層：金額比對（S150 §4.8 剝離範圍）

- **緣起**：同 session 接續 P2a，執行 cl-final-plan §6.3 P2b。誠實收窄範圍：v1 僅做金額比對，品項比對因現行 pipeline 未攞 `order_items` 明細刻意不做。
- **執行**：`supabase/migrations/0054_create_content_mismatch_table.sql`（比對證據表，RLS anon 只讀+dedup 索引+90天TTL）+ `0055_ig_watchdog_content_mismatch_check.sql`（CHECK 擴充第四值 `content_mismatch`）+ `lib/order-match.mjs` 新增 `extractAmountsFromText()`/`compareToOrder()` + `build_n8n_workflow.cjs` 新增 `Has Mismatches?`/`Write Mismatches` 節點（`Classify & Report` 輸出三向平行分流）+ `Freehandsss_Dashboard/freehandsss_dashboardV42.html`（本次 P2b 首次觸及 Dashboard HTML）igwatch UI 新增橘色「⚠️ 疑似對不上」badge + 「核對金額」按鈕 + 金額差顯示行。live 部署 workflow `D4LK6VrQbiXlju0V`。
- **fresh-context opus 獨立審查**（比照 D25/D31 先例）：PASS-WITH-CONCERNS，5 項發現 4 項即時修復——(1) F1 曆年誤判：V42 制式確認文本固定含取模日期（如「2026/07/13」），「2026」落喺金額合理範圍會被誤認金額，對訂單價低於約$1842的訂單幾乎每張確認訊息都會誤判，嚴重污染2週校準期資料，已修法「曆年形狀數字需鄰近貨幣標記先當真金額」；(2) F2 deposit fallback 系統性誤報：`created_incomplete` 訂單常 `final_sale_price` 未填、`deposit` 只係全額約一半，客人提及全額/尾數會被系統性誤判，已移除 fallback（冇 final_sale_price 就唔比對）；(3) F3 付款尾碼誤判：重用 `redactPii` 已有 `PAYMENT_TAIL_RE` 排除；(4) F5 金額差未顯示：已補「IG講$X vs 系統$Y」顯示行。第(4)項 F4（既有 `Write Alerts` 缺 `on_conflict`）為 P2a 已發現的既有缺陷（`task_e3a60daa`），P2b 自身新節點正確帶咗 `on_conflict`。
- **修復後重新驗證**：`node --test order-match.test.mjs`（35/35，含 F1/F2/F3 回歸測試，含真實 V42 確認文本+日期的 F1 迴歸場景）+ diff-guard + mock-execution harness 重跑對真實部署 jsCode 確認 + 瀏覽器注入合成資料驗證 V42 UI 渲染 + 二次 live PUT/GET 核對修復生效。
- **待辦**：P2c（意圖標註+回覆範本庫）依 cl-final-plan §8 排隊；真實 cron 端到端資料流驗證留待下次自然排程（約 2026-07-13T22:00Z 後）。
- **後效同步稽核**：[A] 已更新 `docs/repo-map.md`（migration 0054-0055 補列 + order-match.mjs lib 描述更新）；[B] 不觸發；[C] 已更新本條目；[G] 不觸發（無 CREATE OR REPLACE FUNCTION、`_renderIgWatchList` 為顯示函式非財務計算函式）。
- **Subagent 使用記錄**：✅ 已使用 1 支（general-purpose，opus，fresh-context 獨立審查，比照「n8n/schema 改動驗收不自驗」紅線）。

【交付前雙紀律自檢】
驗收：n8n/schema/UI 改動 — 35 單元測試（含 F1/F2/F3 回歸）+ diff-guard + mock-execution harness + 瀏覽器 DOM 注入驗證 UI 渲染 + 二次 live PUT/GET 核對 + fresh-context opus 獨立審查（PASS-WITH-CONCERNS，4/5 即時修復）= ✅；真實 cron 端到端驗證留待自然排程後覆核
Subagent：✅ 已使用 1 支（general-purpose/opus，金額比對邏輯/wiring/dedup/跨表一致性/Dashboard diff 獨立審查）

## [2026-07-13] Session 171（Claude Code / Sonnet 5 執行）— P2a IG 訊息入庫 + PII 明文剝離（S150 §4.8 剝離範圍，獨立 /cl-flow）

- **緣起**：處理 S150 收尾時發現 §4.8 明文聲明 P2（訊息入庫+內容比對+意圖標註+回覆範本庫+PII政策）為全新架構域，未來需獨立 `/cl-flow` 規劃。Fat Mo 裁決現在開規劃。
- **規劃**：`/cl-flow`（flow_id `2026-07-13-1224`）跑 PX（Perplexity 外部研究）+ AG（Gemini 本地方案），A3 審閱時抓到 AG 提案技術不可行處（Postgres Function 無法調用 `lib/order-match.mjs` Node ESM 模組）與架構不一致處（新增 4 個 Postgres Function 偏離既有 n8n HTTP Request 直寫 PostgREST 模式），已在 Verdict（`artifacts/2026-07-13-1224/cl-final-plan.md`，CONDITIONAL_READY）中修正，並補完 AG 原稿缺失的回滾計畫與風險章節。方案分三期（P2a/P2b/P2c）分次執行，本次只做 P2a。
- **P2a 執行**：
  - `supabase/migrations/0053_create_ig_messages_table.sql`（NEW，已部署）：`ig_messages` 表，RLS anon 只讀 + 無 anon 寫入政策（比照 `ig_watchdog_alerts` 先例）+ `(thread, ig_message_id)` 唯一 dedup 索引 + 90 天 TTL pg_cron 清理。
  - `scripts/ig-watchdog/lib/order-match.mjs`：新增 `redactPii(text)`（正則遮罩電話/IG handle/地址門牌/付款尾碼）、`maskName(name)`（姓名遮罩，只留首字）、`hashId(str)`（cyrb53 純 JS 算術雜湊，避開 n8n Code 節點 `require('crypto')` 靜默失敗地雷）。因單一真源機制（build 時逐字內嵌進 n8n Code 節點），三函式自動隨既有 diff-guard 測試防漂移。
  - `scripts/ig-watchdog/build_n8n_workflow.cjs`：`Classify & Report` 節點輸出新增 `messages` 陣列（每則新訊息，`content` 經 `redactPii()`、`customer_name` 經 `maskName()`、`ig_message_id` 經 `hashId()`）；新增 `Has Messages?`（空陣列守衛，同既有 `Has Alerts?` 模式）+ `Write Messages`（POST `ig_messages`，同既有 `Write Alerts` 模式）兩個節點，`Classify & Report` 輸出平行分流至 `Has Alerts?`/`Has Messages?`，既有警報/Telegram 分支未受影響。
  - n8n live workflow `D4LK6VrQbiXlju0V`（`FHS_IGWatchdog_DriveWatch`）curl PUT 部署兩次（第二次含下方修復）。
- **fresh-context opus 獨立審查**（比照 D25 先例）：抓到 4 項發現，3 項即時修復——(1) v1 只遮罩 `content`，`customer_name`/`ig_message_id` 仍存明文姓名/thread，已補 `maskName()`/`hashId()`；(2) `redactPii` 正則有實測可繞過樣本（電話含分隔符/新版7x-8x開頭/852國碼/全形數字/地址數字在前語序/付款尾碼詞彙過窄），已逐一補正則+補測試（21→27 條全過）；(3) `Write Messages` 缺 `on_conflict` 參數令 dedup 唯一索引形同虛設，已補 `?on_conflict=thread,ig_message_id`。第 4 項（既有 `Write Alerts` 節點同缺 `on_conflict`，Session 119 建立非本次範圍）依執行紀律未一併修，已 spawn_task 開獨立追蹤（task_e3a60daa）。決策詳見 `decisions.md` D31。
- **接受的設計取捨**：`ig_messages.thread` 維持明文（結構性 join key，比照 `ig_watchdog_alerts` 既有先例），非本次缺口，已記入 `scripts/README.md`。
- **驗收**：`node --test order-match.test.mjs`（27/27）+ `order-match.diffguard.test.mjs`（逐字嵌入確認）+ mock-execution harness（對已部署 jsCode 跑合成資料，含 fresh-context review 的 F2 repro 樣本，全過）+ 兩次 live PUT 後 GET 核對（credentials 完整、node 數正確、jsCode 內容確認）。真實 cron 端到端驗證留待下次自然排程（約 2026-07-13T22:00Z 後）。
- **待辦**：P2b（內容比對層）/ P2c（意圖標註+回覆範本庫）依 cl-final-plan §8 分次執行策略排隊；`Write Alerts` on_conflict 修復另案追蹤。
- **後效同步稽核**：[A] 已更新 `docs/repo-map.md`（migration 0049-0053 補列 + ig-watchdog 區塊更新）+ `scripts/README.md`（修正「永不寫入 Supabase」過時聲明）；[B] 不觸發（無制度層檔案改動）；[C] 已更新本條目；[G] 不觸發（無 CREATE OR REPLACE FUNCTION、無財務欄位語義變動）。
- **Subagent 使用記錄**：✅ 已使用 1 支（general-purpose，opus，fresh-context 獨立審查，比照 D25「n8n/schema 改動驗收不自驗」紅線）。

【交付前雙紀律自檢】
驗收：n8n/schema 改動 — mock-execution harness + diff-guard + 27 單元測試 + live PUT/GET 核對 + fresh-context opus 獨立審查（PASS-WITH-CONCERNS，3/4 發現即時修復）= ✅；真實 cron 端到端驗證留待自然排程後覆核
Subagent：✅ 已使用 1 支（general-purpose/opus，PII regex/RLS/wiring/idempotency 獨立審查，理由：n8n 部署 + PII 處理屬「驗收不自驗」紅線範圍）

## [2026-07-12] Session 170續（Claude Code / Sonnet 5 執行）— grilling 實戰示範：拷問修訂取模排程中心方案書

- **緣起**：裝完拷問技能後 Fat Mo 要求即場實戰示範（唔淨止講解），避免工具裝咗但唔識用變裝飾。
- **對象**：選用真實待辦「S159 取模排程中心方案書」（`mold-schedule-plan_2026-07-09.md`）做拷問標的，跟 `grilling` 紀律一問一答（AI 附建議答案，決策權在 Fat Mo）。
- **產出**：6 條問答，抓出並修正 3 個原方案未問過嘅盲點——① `CLASH_WINDOW_MIN` 60→150分鐘（依 Fat Mo 親述實際攞模節奏：一日最多三單、每單連傾偈核對交通≥3小時）+ 文案由「撞正」軟化為請自行確認；② 執行分兩期（B月曆/C今日一覽/D過期/E未約 先做，A即時撞期提示降級簡化版後做，因 Fat Mo 對 A 完整判撞邏輯效果無信心）；③ B 月曆新增訂單總覽頁獨立入口（傾客途中查檔期唔使開草稿單），呼應 Fat Mo 描述嘅真實使用場景。
- **文件同步**：方案書本文（設計/驗收條件/可調參數三處）已直接改寫；決策見 `decisions.md` D29。
- **技術副發現**：`grill-me`/`grill-with-docs` 因原檔 `disable-model-invocation:true` 在此 harness 內完全無法被呼叫，但中文召喚詞設計上本就直接呼叫 `grilling` 本體，對使用體驗零影響（詳見 D27）。
- **待辦**：方案書仍排在 S149/S155 之後，本次未落地代碼，下次執行 session 直接讀取修訂版即可。
- **Subagent 使用記錄**：❌ 未使用——拷問過程為主對話直接與 Fat Mo 互動問答，`grilling` 技能本質為對人互動而非派工，方案書改寫屬已知路徑定點編輯。

## [2026-07-12] Session 170（Claude Code / Fable 5→Sonnet 5 執行）— mattpocock/skills 選擇性吸收（拷問技能）

- **緣起**：Fat Mo 讀完 aiposthub 導讀文章後想安裝 `mattpocock/skills`（47支技能包），要求先評估風險再裝，並要求設計「唔會變裝飾」的學習方案。
- **查證**：逐支讀原始 SKILL.md（非文章二手轉述）後裁決只選裝 4 支：`grilling`/`grill-me`/`grill-with-docs`/`domain-modeling`。不裝 `code-review`（會拆走 FHS code-reviewer 財務/HTML ID 鐵律護欄）、`tdd`/`implement`/`diagnosing-bugs`（同既有 subagent 重疊）、`handoff`（同 FHS 交接制度撞名）、`triage`/`wayfinder`/`to-tickets`（需 ticket 文化，FHS 用 handoff.md MASTER 表代替）。
- **安裝**：`npx skills add mattpocock/skills -s grilling,grill-me,grill-with-docs,domain-modeling -a claude-code --copy`，落地 `.claude/skills/`；`skills-lock.json` 記上游版本。
- **FHS-FORK**：`domain-modeling` ADR 落點由原版 `docs/adr/` 改寫為 `.fhs/notes/adr/`，定位為 `decisions.md` D 表詳文層，避免兩套決策記錄系統 drift；Fork 註記寫入 `SKILL.md`/`ADR-FORMAT.md` 頭部供日後上游同步時人手 diff。
- **未跑官方 setup 精靈**：`/8d` 自我批評抓出該精靈產出的配置檔（`docs/agents/*.md`）消費者為未安裝的 to-spec/triage/wayfinder，屬無效步驟，已移除；改以 `.fhs/notes/grilling-quickcard.md` 一頁速查卡代替。
- **中文召喚詞**：「拷問我」＝逐條慢問模糊需求；「拷問落檔」＝同步寫 CONTEXT.md+ADR。不改英文技能名（`grill-me` 正文以原名互相引用，改名會斷鏈）。
- **防裝飾機制**：新增行為層規則——AI 日後遇 Fat Mo 提出模糊需求時須主動問「要唔要拷問一輪先？」，不靠 Fat Mo 記得用；4 週試用閘（用過≥2次留低，冇用過拆走）。
- **決策**：`.fhs/notes/decisions.md` D27。
- **待辦**：4 週後（約 2026-08-09）覆核試用閘結果；如通過，評估第二批吸收 `to-spec` 格式。
- **Subagent 使用記錄**：❌ 未使用——技能原文查證（WebFetch）+ `/8d` in-chat 自我批評+治理對照，屬主對話可直接完成的研究與文件工作，`/8d` 明文禁外部派工。

## [2026-07-12] Session 169（Claude Code / Sonnet 5 執行）— 開發預覽伺服器 port 5500 衝突修復

- **問題**：`.claude/launch.json` 的 `fhs-dashboard` 設定寫死 `-l 5500` + `"port": 5500`，其他 chat session 已佔用該埠，導致本 session preview_start 失敗。
- **修復**：`Freehandsss_Dashboard/` 純靜態檔案預覽伺服器，無 OAuth/webhook/CORS 依賴固定埠號，改 `"autoPort": true` 並移除 `runtimeArgs` 中硬編碼的 `-l 5500` 讓 `serve` 自行採用分配埠；驗證：`preview_start` 成功於 3000 埠啟動，`preview_logs` 無錯誤。
- **待辦**：無。
- **Subagent 使用記錄**：❌ 未使用——單檔設定修正+瀏覽器工具驗證，屬主對話可直接做的已知路徑操作。

## [2026-07-12] Session 168（Claude Code / Sonnet 5 執行）— S150 Phase 4-6 執行完成（verified_ok正向記錄+orders anon權限收斂，含即時修復一則回歸）

- **Phase 4（P1a）verified_ok 正向記錄**：Migration `0050`（`ig_watchdog_alerts.kind` CHECK 三值擴充）→ `scripts/ig-watchdog/build_n8n_workflow.cjs` 新增 `created_full`→`verified_ok` 映射（resolved=true，不進待處理計數、TG 不加噪音）→ curl 4 欄位 PUT 部署至 live n8n `D4LK6VrQbiXlju0V`（versionId `05740bb4...`→`4a125f6b...`）→ V42 `_renderIgWatchList` `kindLabel`/`kindColor` 補綠色「✓ 已核對」（L13965-13966）。冪等由既有 `ix_igwatch_alerts_dedup` UNIQUE INDEX 天然覆蓋。本地 Node 模擬（mock `$()` 執行抽出的 jsCode）驗證邏輯正確；live cron 端到端驗證留待下次排程（2026-07-12T22:00Z 後）。
- **Phase 5（P1b）orders anon 權限收斂 + 即時修復回歸**：Migration `0051` 刪除重複的 anon UPDATE 政策（保留 `orders_anon_update`）判斷正確；但同批誤刪 `orders_anon_delete`（判斷「未使用」，實際 grep 因 `method:'DELETE'` 與 URL 分行漏判 `executeDeleteOrder()` 的真實呼叫），造成 Dashboard 刪除訂單按鈕靜默失效（RLS 濾空但仍回 HTTP 200，UI 誤報成功）。由 fresh-context code-reviewer(opus) 同一 session 內抓出，即以 Migration `0052` 回滾，真實列 anon DELETE 探針二次確認生效。影響窗口約 7 分鐘（12:34–12:41 UTC），無真實訂單資料受損。
- **驗收**：fresh-context code-reviewer(opus) 兩輪獨立審查（初輪抓 CRITICAL → 修復 → 複驗 PASS），符合 AGENTS.md「驗收不自驗」紅線。
- **文件同步**：`.fhs/notes/FHS_System_Logic_Overview.md` §11 全節更新（新增 §11.6）；`decisions.md` D25；新增教訓 `2026-07-12_rls-policy-removal-silent-2xx-write-failure.md` 並登記 `lessons/INDEX.md`；本地 migrations 資料夾同步補齊 0049（此前已 live 但本地缺檔的舊 drift）+ 0050-0052。
- **待辦**：live cron 端到端驗證（首批 `verified_ok` 寫入）待 2026-07-12T22:00Z 後由後續 session 或 Fat Mo 覆核。
- **Subagent 使用記錄**：`code-reviewer`（opus，fresh-context）× 1 個 agent、2 輪對話（初審抓 CRITICAL 回歸 + 修復後複驗 PASS）。

## [2026-07-12] Session 168續（Claude Code / Sonnet 5 執行）— /commit 升格與部署，新增授權途徑(c)條件觸發自動部署

- **部署**：Fat Mo 直接回覆同意升格確認問題，AI 自建 `.fhs/.deploy-ok`（AGENTS.md 授權途徑a）→ V42 升格 current.html（MD5一致）→ NAS WebDAV 三關驗證 PASS（PUT HTTP 204／989,490 bytes 相符／SHA256 `3AA00D31...D853D5`）→ `/commit` 全包完成，commit `b9e9dcd`（S150 Phase4-6）+ `b5aa013`（current.html部署）已 push。Step0 `/fhs-check`：LIFECYCLE/STRESS/ACCEPTANCE PASS，PRICE_AUDIT 仍 FAIL（Airtable 429 月額度用盡，比照 S167 先例不阻擋部署）。
- **治理規則新增**：Fat Mo 對「commit→push→upload-web 逐步詢問」表達不耐，AI 提出兩種範圍請 Fat Mo 選擇後，Fat Mo 選定「任何時候 `/commit` 都自動一併部署」，隨即主動優化為「先自動偵測是否需要部署，需要才自動一併部署」（判斷依據＝本次 commit 是否包含 `Freehandsss_Dashboard/freehandsss_dashboardV*.html`）。AGENTS.md §3 授權途徑由二擇一擴充為三選一（v1.6.0→**v1.7.0**）；`commit.md`（v2.2.0→v2.3.0）新增 Phase 2.5 條件觸發部署鏈；`upload-web.md`（v1.2.0→v1.3.0）Step 1 新增鏈式觸發例外。三途徑對 Antigravity/VS Code 同樣適用（Master 檔案雙邊橋接）；AG 因不經 `pre-tool-guard.js` 守護，途徑(c)在 AG 端純屬行為層約束。部署三關驗證與 `/fhs-check` 前置檢查兩道機械防線不受影響，只移除「是否要部署」的人工確認層。決策見 [decisions.md](../notes/decisions.md) D26。
- **Subagent 使用記錄**：❌ 未使用——既定 SOP（`/upload-web`、`/commit`）執行 + 憲法層文件直接編輯，屬主對話可直接做的已知路徑操作。

## [2026-07-12] Session 167（Claude Code / Sonnet 5 執行）— S165 Dashboard 功能實機測試 PASS，升格 current 部署

- **實機測試**：Browser preview 對 V42 實跑 S165 兩項功能：(1) 全域錯誤可見化——手動觸發 JS Error 與 Promise rejection，右上角提示卡正確彈出（文案/8秒消失/防重複皆符合設計）；(2) 訂單草稿自救——新增訂單模式輸入內容→重整頁面→草稿還原提示條正確出現→「繼續上次輸入」正確還原表單內容。Fat Mo 確認通過。
- **部署前置 `/fhs-check`**：LOCAL_AUDIT SKIP（測試檔不存在，與本次無關）、LIFECYCLE/STRESS/ACCEPTANCE 三項核心流程全 PASS；PRICE_AUDIT FAIL（Airtable API 429 `PUBLIC_API_BILLING_LIMIT_EXCEEDED`，本月額度用盡，屬外部服務限制，與 S165 前端改動無關）。Red Flag 記入 `.fhs/notes/session-log.md`，Fat Mo 裁決此 Red Flag 不阻擋部署，繼續執行。
- **升格部署**：Fat Mo 直接回覆同意升格（AGENTS.md §3 授權途徑(a)），AI 自建 `.fhs/.deploy-ok`（記入 `deploy-log.md` 供稽核）→ `freehandsss_dashboardV42.html` → `Freehandsss_dashboard_current.html`（MD5 相符）→ `scripts/upload-web.ps1 current -Force` 上傳 NAS，三關驗證 PASS：PUT HTTP 204、檔案大小 989,402 bytes 本地/遠端相符、SHA256 `10B43DC7...5DC6420` 一致。公開端點：`https://yanhei.synology.me/Freehandsss_dashboard_current.html`。
- **待辦**：無（S165 全案結案）。
- **Subagent 使用記錄**：❌ 未使用——瀏覽器工具實機測試+既定 SOP（`/fhs-check`、`/upload-web`）執行，屬主對話可直接做的已知路徑操作。

## [2026-07-12] Session 166（Claude Code / Sonnet 5 執行）— 3D打印pipeline v0 Phase1（腳）執行完成+師傅版模式

- **Phase 1 全流程跑通**：依方案書 `.fhs/reports/planning/3d-print-pipeline-v0_2026-07-10.md` 派 `blender-3d-modeler` agent 執行 P1→P9（樣本 Amen-leftleg），輸出 `3d/scripts/pipeline_v0_phase1_foot.py`。機械 QC 獨立覆核（自寫 numpy STL parser 重新解析，非只信 agent 自報）全 PASS：最長軸 30.5mm、0 boundary、0 non-manifold、島嶼數=1，刻字「KKH 0213」可讀。過程修復：原掃描 4,226 條退化碎邊要 `dissolve_degenerate` 先清理否則趾甲毀+白斑噪聲；腳踝橫紋摺痕經比對 raw scan 確認係原掃描真實特徵非 bug。
- **Fat Mo 裁決（2026-07-12）降級**：AI 紋理誇張化(k=2.5頻帶分離)風格與師傅手工仍有差距（AI版偏腫、師傅版線條幼細）。v0 實用範圍改為：**紋理繼續由師傅做，AI 只負責縮放+刻字+加環+QC+出檔**。已加「MASTER 模式」入口至同一 script（`PIPELINE_ENTRY_MODE="MASTER"`，跳過 P2 紋理誇張化），驗證用模擬師傅版輸入跑通，QC 同樣全 PASS，輸出 `3d/output/pipeline-v0-phase1/master-mode/`（gitignore，不進版控）。原 FULL 模式邏輯經 diff 確認未改壞。附帶修復兩個真 bug：OBJ 匯入座標轉向誤烘焙落 object matrix、QC render 預設鏡頭角度睇錯面。
- **文件同步**：`3d/README.md` 補目錄結構（scripts/、param_memory.json）與現有專案表；`.claude/commands/` 補建 `3d-print.md`、`canva-auto.md` 兩個橋接檔（Master 早於 S161/S164 已建但漏橋接，/commit P0.4 幽靈偵測發現）。
- **待辦**：Phase 1 未經 Fat Mo 最終目測簽收前禁開 Phase 2（手）；MASTER 模式待真正師傅版樣本檔到手後再驗一次真實輸入（目前為模擬輸入驗證）。
- **Subagent 使用記錄**：`blender-3d-modeler` × 3 次（Phase1全流程執行、紋理bug修復、MASTER模式改裝），主控負責獨立覆核 QC 數據 + 文件同步。

## [2026-07-12] Session 165（同一延續 session，Claude Code / Fable 5 執行，較早階段補記）— Dashboard 全域錯誤可見化+新增訂單草稿自救 / S149治理可攜化計畫§5重審修訂

- **全域錯誤可見化**：`freehandsss_dashboardV42.html` 新增自足 `<script>` block，監聽 `window.error`/`unhandledrejection`，靜默失敗的 JS/Promise 錯誤改為右上角浮動提示卡（同一文案 5 秒防重複彈、ResizeObserver 噪音過濾、最多疊 3 張），提示用戶截圖回報 Fat Mo。目的：防「錯誤被靜默吞、UI 無反應」此類事故（呼應 Pitfall #28 `_findOrder` IIFE 作用域錯誤等歷史案例）。
- **新增訂單草稿自救**：POS 手機新增訂單流程加入 `localStorage`（`fhs_create_draft_v1`）自動快照，表單有實質內容變動 800ms 後防抖存檔；頁面重載偵測到未過期（48小時）草稿彈出還原/棄置提示；webhook 或 Supabase fallback 寫入成功即清除草稿。只在 `currentMode==='create'` 生效，edit 模式不受影響，沿用既有 `captureFormState()`/`restoreFormState()` 還原路徑（含 S107 split 快照保護）。
- **S149 治理可攜化計畫重審**：`.fhs/reports/planning/2026-07-06_s149-governance-portability_implementation_plan.md` 新增 §5 v3.1 修訂（經 `/8d` 兩輪迭代），以逐條覆寫表方式更新 v2 前置閘現況（S148 已完成客觀證據）、驗收標準（改當日基線而非釘死計數）、模板內容集（追加 `/8d`/`/usage-audit`/param-memory 範式文件）；v2 本文不動，執行以「v2＋§5 覆寫」為準。狀態由「待批准」改「待執行」。
- **S148 計畫回填**：`.fhs/reports/planning/2026-07-06_s148-loop-hardening_implementation_plan.md`「執行狀態」節於當時（S148執行時）漏填，因依賴此節作前置閘的 S149 重審險些誤判「未完成」；已依 git log 客觀證據（commits `b66aea`/`b7df3b5`/`439b29c`/`d80a349`）補填 4 Phase 全完成，並回饋為 S149 §5 的「回填律」條款。
- **待辦**：S149 計畫現為執行佇列 blocker（S150 Phase4-6 等其後），待 Fat Mo 批准後執行；回填律全域化提案（獨立於本計畫）待走 05 §1 提案正門另行裁決。

## [2026-07-10] Session 162（Antigravity 執行）— 訂單總覽 UI/UX 五項修復與功能擴充

- **修復 1：Tooltip 溢位渲染 Bug**：`#fhsToggleAuditBtn` 按鈕的 `title` 屬性中內嵌 HTML 標籤（`<svg>`）與雙引號導致 HTML 語法損毀並在網頁上溢位顯示。已修復為純文字標記並採用 Emoji 示意：`title="SKU建議價｜SKU建議利潤｜📋 SKU參考價，不含整單優惠／折讓"`.
- **功能 2：雙端清除篩選按鈕**：在共用篩選面板（`#reviewFiltersV2`）增加「清除篩選」按鈕。點擊後將所有篩選欄位（年度、月份、狀態、批次、搜尋字串、排序等）重設為預設空值，重設選取類別的 Chip 狀態、清除 localStorage 儲存的篩選狀態，最後呼叫 `fetchGlobalReview(true)` 重新套用篩選並載入數據。
- **功能 3：Desktop 版返回總覽按鈕**：在 Desktop 模式表單底部的按鈕列（`#bottomActionBar`）中增加「← 返回總覽」按鈕，對齊並採用與 Mobile 模式底部欄（`#v40-bottom-bar`）中相同的返回總覽並觸發高亮閃爍定位的邏輯。
- **功能 4：n8n 同步等待遮罩與 Supabase Polling**：在進行訂單同步或刪除操作時，等候期間會啟動全網域 Loading 遮罩層（`#globalLoader`）並彈出提示，顯示毛玻璃背景防誤觸。針對同步操作，前端會啟動 Supabase 輪詢（`pollSupabaseSync`），每 1.5 秒查詢一次，至多 15 次，確保資料寫入成功後才關閉遮罩並切回總覽。若 n8n 發生網路或 Webhook 錯誤，會自動 fallback 直連 Supabase 寫入，完成後一樣執行切換與高亮。
- **功能 5：返回總覽高亮閃爍動畫**：新增 CSS 動畫 `@keyframes fhs-row-flash`。在修改或新增完成返回總覽後，定位至該訂單所在的表格列（Desktop）或 Accordion 卡片（Mobile），使其閃爍黃色背景 3 下，提供即時的視覺更新回饋。
- **驗證**：已執行全系統健檢套件 `python Maintenance_Tools/run_all.py`，全生命週期、壓力測試、結案驗收測試皆全數 PASS。

## [2026-07-10] Session 161續 III（Claude Code / Sonnet 5 執行）— 修復完成偵測漏判純鎖匙扣/純吊飾訂單

- **問題**：Fat Mo 回報訂單完全沒有手模擺設、只有鎖匙扣和/或純銀吊飾且皆已完成時，完成提示沒有觸發。根因是判斷邏輯強制要求「至少 1 筆手模擺設」（變數 `hasHm`），未涵蓋純鎖匙扣/純吊飾訂單。
- **修正**：條件放寬為「至少 1 筆屬於{手模擺設/鎖匙扣/純銀吊飾}三類之一」（`hasGated`），完成判斷本身不變（存在的類別都須完成，羊毛氈/燈飾豁免，混入無關分類不觸發）。
- **驗證**：單元測試 11 組（4 原情境+3 新情境+4 邊界）全 PASS；真實訂單 0600803（2鎖匙扣+2純銀吊飾皆完成、無手模擺設）端到端驗證正確觸發。
- **部署**：已升格 V42→current 並上傳 NAS，三關驗證 PASS。
- 決策詳見 [decisions.md](.fhs/notes/decisions.md)。

## [2026-07-10] Session 161續 II（Claude Code / Sonnet 5 執行）— 訂單總覽桌面表格新增「退回進行中」按鈕

- **問題**：既有完成⇄取消完成雙向切換只接在手機版（swipe-row + Bottom-Sheet），桌面稽核表格沒有任何入口可以把已完成訂單退回進行中——尤其剛上線的自動完成偵測若在桌面誤觸發就無法復原。
- **修正**：桌面表格每列訂單資訊欄新增條件按鈕，僅在訂單已標記完成時顯示「退回進行中」，點擊直接呼叫既有的 `triggerArchiveOrder()`（沿用既有 `fhs_uncomplete_order` RPC 與狀態還原邏輯），未新增任何後端邏輯。只做退回單方向，正向完成仍靠既有自動偵測與手機版。
- **驗證**：語法檢查全過；起 preview server（desktop 1280×900）用真實訂單資料驗證按鈕條件渲染、點擊後狀態正確翻轉、重繪後按鈕正確消失。
- 決策詳見 [decisions.md](.fhs/notes/decisions.md)。

## [2026-07-10] Session 161續（Claude Code / Sonnet 5 執行）— 訂單總覽自動完成偵測擴大納入鎖匙扣/純銀吊飾

- **問題**：既有 S157 封存提示機制（`_fhsHmCheckChange`）只在訂單「全部品項」都是手模擺設或羊毛氈/燈飾配件時才會觸發完成提示；只要訂單裡混了真正的鎖匙扣或純銀吊飾商品，整單就永遠不會跳自動完成提示，即使三者實際都已完成。
- **修正**：抽出共用函式 `window._fhsCheckHmOrderCompletion(orderId)`，涵蓋 4 種完成情境：純手模全踢／手模+鎖匙扣皆完成／手模+純銀吊飾皆完成／手模+鎖匙扣+純銀吊飾皆完成。訂單須至少含 1 筆手模擺設，且所有品項只能來自 {手模擺設/鎖匙扣/純銀吊飾/羊毛氈公仔·燈飾（豁免）} 白名單，混入其他分類則不觸發。同時把此函式掛到鎖匙扣/純銀吊飾狀態下拉選單的 `onchange`（table 版與手機 accordion 版皆補上，原本完全沒有觸發點），以及既有手模勾選格變動掛鉤。
- **範圍**：僅修改 `freehandsss_dashboardV42.html`（生產原始碼 ~5110/8921/9382行），未動 `Freehandsss_dashboard_current.html`，待 Fat Mo 確認後另行升格部署。
- **驗證**：6 個 script block 語法檢查全過；抽出實際函式跑 8 組單元測試（4 情境 + 4 邊界案例：鎖匙扣未完成不觸發、羊毛氈配件狀態不影響判斷、混入無關分類不觸發、無手模項目不觸發、已封存訂單不重複觸發）全數 PASS。
- **實機驗證追加修復（2 bug）**：Fat Mo 本機實測「全踢無反應」回報後，起 preview server 用真實 Supabase 訂單重驗，發現 (a) 新函式誤用了定義在另一獨立 `<script>` IIFE 內的區域函式 `_findOrder`，拋 `ReferenceError` 被 onchange 靜默吞掉——改為 inline 查 `globalOrders`；(b) 鎖匙扣/純銀吊飾真實資料裡「完成」值主要是 `完成`（49筆）而非下拉選單的 `Done 已完成`（10筆），改為與手模擺設同一組完成值判斷。修復後用真實訂單（0700101 真實點擊三格、0650429 混合訂單）端到端重驗 PASS。
- **部署**：`/fhs-check` 前置健檢 PASS，`/upload-web` 升格 V42→current 並上傳 NAS，三關驗證 PASS（HTTP 204 / 大小 971,995 bytes / SHA256=`9B3FB135...C5602`）。公開網址：https://yanhei.synology.me/Freehandsss_dashboard_current.html
- 決策詳見 [decisions.md](.fhs/notes/decisions.md)。

## [2026-07-10] Session 160（Antigravity 執行）— 手機模式底部導覽列橫向滑動動畫優化

- **底部導覽列橫向滑動過渡動畫**：將手機模式下（`max-width: 767px`）底部常駐導覽列（`.fhs-top-bar__actions`）的切換樣式優化為橫向平滑漂移過渡效果，對齊頂部 Segmented Control (`全部/進行中/已完成`) 的 iOS 滑動指示器動效。
- **動態指示器 (Indicator) 機制**：新增 `.fhs-nav-indicator` 作為絕對定位背景高亮框，利用 `initBottomNavIndicator()` 在頁面加載時動態測量並透過 `requestAnimationFrame` 配合 CSS 的 `transform: translateX(...)` 和 `width` 屬性實現位移與寬度的過渡；按鈕本身（`.fhs-top-bar__actions button`）設定為 `position: relative; z-index: 1;` 置於指示器之上，以避免被背景遮蓋。
- **狀態與切換同步**：將動畫更新函式 `window.updateBottomNavIndicator()` 掛載於模式切換 `switchMode()` 尾部、螢幕旋轉（orientationchange）與視窗大小變化（resize）事件中，確保橫向漂移位置即時、準確。
- **測試驗證與同步**：已同步在 `Freehandsss_dashboard_current.html` 與 `freehandsss_dashboardV42.html` 實施，全週期測試及壓力測試（LIFECYCLE/STRESS/ACCEPTANCE/PRICE_AUDIT）共 4 項全部通過（PASS）。

## [2026-07-09] Session 159 續 III（互動式 Claude Code / Fat Mo 操作）— S152 webapp-testing 插件識別名更正為 playwright，已裝

**[S152] 遺留 BLOCKED 項處理，順帶抓到規劃期臆測錯誤**：S152 完成記錄裡「待安裝 `anthropics/skills:webapp-testing`」一直卡在 BLOCKED（需互動式 `/plugin install`，非互動 session 無法代跑）。Fat Mo 在互動式 Claude Code 終端機實測時發現：`anthropics/skills:webapp-testing` 這個插件識別名**從未存在**——`/plugin marketplace add anthropics/skills` 加入後實際登記名稱是 `anthropic-agent-skills`，其下並無叫 `webapp-testing` 的插件，`/plugin install webapp-testing` 直接回報「not found in any marketplace」。透過 Discover 分頁關鍵字搜尋（`testing`/`web`）比對 S152 原始需求「補手機 viewport 的 Playwright 實測能力」，找到功能完全對等的插件 **`playwright`**（`claude-plugins-official` marketplace，Microsoft 出品，Browser automation and end-to-end testing MCP server），以 **project scope** 安裝完成（原因：此能力綁定 FHS Dashboard 這個 repo 的測試需求，project scope 讓設定隨 repo git 同步，任何機器/Desktop App clone 後自動繼承，符合 FHS 治理資產「SSOT 在 repo」原則）。

S152 完成記錄、handoff.md MASTER 表、便攜塊已同步更正：K 項 ⏳ BLOCKED → ✅ 完成（以 `playwright` 取代原臆測名稱 `webapp-testing`）。教訓：規劃期若引用外部套件名稱卻無互動環境可即時核實，應在文件中明確標註「未核實，僅為推測」，避免後續 session 把猜測當成既定事實反覆卡關。

## [2026-07-09] Session 159 續 II（Claude Code / Sonnet 5 執行）— 待辦清單澄清 + S156 guard learnings warn 提案裁決落地

**待辦清單澄清（無代碼變動）**：Fat Mo 對 handoff 便攜塊四項提出疑問，逐一釐清：(1) 桌面版表頭對比度其實已是 Fat Mo 主動裁決的最終狀態，非待修項，便攜塊措辭誤把「已裁決維持原狀」寫成「問題仍未解決」的待辦式語氣，已改寫並移出待辦段；(2) [S156] 底下其實有兩個不同項目（blocktempo 條款吸收=已完成 vs guard learnings warn 提案=待裁決），便攜塊只寫了後者名稱易與前者混淆；(3) [S152] webapp-testing plugin 卡在需要互動式 `/plugin install`，本 session/hook 無對應工具可執行，需 Fat Mo 自行手動安裝；(4) [S149] 治理系統可攜化計畫已解除阻擋（S148 前置依賴已於 S154 完工），純規劃產出待執行，非新項目。

**[S156] pre-tool-guard learnings warn 提案裁決同意並落地**：`/8d` v2-1(b) 提案（Write/Edit 目標為 `learnings.md` 時 warn 提醒 Rule 3.17 雙紀律自檢，不 block，沿用 kgov v2.0.0 md-only-warn 哲學）經 Fat Mo 裁決同意。`pre-tool-guard.js` 新增 **R12**：檔名以 `learnings.md` 結尾時輸出 warning（exit 0）提醒「提交前請確認已依 AGENTS.md Rule 3.17 完成【交付前雙紀律自檢】兩行」。`guard-fixtures.json` 新增 1 案例；回歸測試 **17/17 PASS**（原16+新1），無回歸。屬純工具層 warn-only 擴充，不變更 AGENTS.md 規則本體，憲法版本號不動。詳見 [decisions.md](.fhs/notes/decisions.md) D22。

## [2026-07-09] Session 159 續（Claude Code / Sonnet 5 執行）— 部署授權機制放寬 D21 + S159 正式部署 + 表頭對比度調查

**current.html 部署授權放寬（D21）**：原規則要求 Fat Mo 必須親自於終端機 `touch .fhs/.deploy-ok` 才能授權 AI 覆寫正式版，Fat Mo 認為太麻煩，提案改為聊天室確認即代表授權。經提出安全權衡（原設計防外部資料注入誤導 AI 自我授權）後，Fat Mo 選擇「加防護版」：AI 可自行建立 `.fhs/.deploy-ok`，但僅限**直接回覆 AI 自己提出的升格確認問題**時才可建立，嚴禁從訂單備註/webhook/歷史訊息等其他資料來源推斷同意——此條件無法由 hook 技術驗證，屬 AI 行為層硬約束。`AGENTS.md` v1.5.1→**v1.6.0**（規則本體變更）；`pre-tool-guard.js` R10 兩變體（Write/Edit + Bash）由封鎖改為放行+記錄至 `deploy-log.md`；`guard-fixtures.json` 對應兩案例改為 `expected_exit:0`；`scripts/README.md` 同步更新規則說明；guard 回歸測試 16/16 PASS 無回歸。改動前備份 `AGENTS.md`/`pre-tool-guard.js` 至 `governance/backups/*.2026-07-09.bak`。詳見 [decisions.md](.fhs/notes/decisions.md) D21。

**S159 修復正式部署**：`/fhs-check` 4項全PASS（LIFECYCLE/STRESS/ACCEPTANCE/PRICE_AUDIT）後，依新授權機制升格 `freehandsss_dashboardV42.html` → `current.html` 並上傳 NAS，三關驗證全過（HTTP 204、大小953,370 bytes 一致、SHA256 042CCC8C...982D8F 一致）。

**桌面版表頭對比度調查（Fat Mo 最終選擇維持原狀）**：Fat Mo 反映桌面版訂單總覽表頭（客人/入帳/成本/利潤/刻字/產品明細/批次/進度/備註）文字看不清楚。查證根因：11 個 `<th>` inline `color`（多為 `var(--fhs-text-secondary)`，入帳/成本/利潤另用 `#B07D4C`/危險紅/成功綠）疊在深色漸層背景上，對比不足——這批 inline 色是舊設計殘留，早於某次背景改深底時未同步更新。先試修為統一白字（`color:#fff`），經 Fat Mo 檢視後**不滿意，要求還原**；進一步要求連背景漸層本身也退回 S157 主色系清理**之前**的深藍黑漸層（`#2A2D43→#3d4163`，S159 commit 前為暖棕漸層 `var(--fhs-text-secondary)→#5c4e3c`）。最終狀態：`freehandsss_dashboardV42.html` 表頭背景與文字色皆已還原至 S157 改動前原狀（逐行對比 commit `5d0f4c6` 確認一致）；`current.html` 全程未被此段改動觸及（R1 正確擋下直接編輯嘗試），仍是部署當下的暖棕漸層版本，兩檔案此段暫時不同步（Fat Mo 未要求重新部署此段）。對比度問題本身仍未解決，屬 Fat Mo 已知並主動選擇維持現狀，非遺漏。

## [2026-07-09] Session 159（Claude Code / Sonnet 5 執行）— S157 主色系清理殘留黑字全面補完

Fat Mo 反映「多個不同分頁字體變實黑色」，透過 Antigravity 多次要求修改均未修好。查證發現 S157 Changelog 條目雖已記錄「整體主色系一致性與舊版 slate 藍灰色清理」並聲稱測試全 PASS，但該次改動實際只涵蓋部分 `#2A2D43`/`#1D3557` 實色（且尚未 commit，一直留在工作目錄），並未涵蓋以下三類散落色號，才是 Fat Mo 反覆看到「變黑」的真因：

- **硬編碼舊色號未遷移**（純讀碼/單一 grep 查不全，逐一分頁 DOM 掃描才找齊）：`color:#222`（8處，核對帳單面板 `.fhsAudit_*`＋IG 訊息預覽 `#fhsOrderViewDiv`）、`color:#1D3557`（6處 CSS + 1處 JS 賦值，SKU利潤等財務強調值）、`color:#333`/`color:#333333`（8處，Review 篩選 badge/textarea/audit 明細）、JS 動態賦值 `style.color='#333'`/`'#999'`（15處，訂金/尾款 split-box 快填按鈕狀態），以及系統頁「↻ 刷新」按鈕（`#igwatchRefreshBtn`）完全漏設 `color`，退回瀏覽器預設純黑。全數改為對應主題變數 `var(--fhs-text-primary)`/`var(--fhs-text-secondary)`/`var(--fhs-text-muted)`。
- **JS inline style 覆寫蓋掉 class 定義**（純看 CSS 定義查不出，需讀 `element.getAttribute('style')`）：`switchMode()` 覆寫邏輯（`freehandsss_dashboardV42.html:12423-12431`）在「新增/修改/財務/系統」模式對頂部標題 `#v40-top-order-id` 動態指派 `style.color='inherit'`，蓋過 class 原定的 `var(--fhs-text-secondary)`，改繼承外層較深的 `--fhs-text-primary`，配上 16px 粗體 700 視覺讀成純黑。改為 `style.color=''`（清空覆寫、讓 class 規則接管）。
- **模式間標題色不一致**：「訂單」模式（review）額外覆寫 `style.color='var(--fhs-accent)'`（橘色），與其餘四個模式的暖灰棕色不同調，Fat Mo 截圖比對發現「訂單總覽」自成一色。移除該特例，五個模式頂部標題統一使用 class 預設色。

**驗證方式**：純讀碼/grep 對此類 bug 不可靠（散落寫法不一、不同機制混雜），全程改用瀏覽器 preview 實測 `getComputedStyle` 逐分頁自動掃描（走訪全頁葉節點比對 computed color 是否落在暖棕主色 rgb(44,36,22) 之外），並對每個修復點量測前後數值坐實。同步套用於 `freehandsss_dashboardV42.html` 與 `Freehandsss_dashboard_current.html`；「新增/修改/訂單/財務/系統」五分頁標題與核對帳單/IG訊息 modal 均實測通過，console 無錯誤。教訓已寫入 auto-memory `feedback_visual_bug_measure_not_guess.md`（擴充涵蓋顏色類 bug 與 inline-style-覆寫陷阱）。

## [2026-07-08] Session 158（Fable 5）— FHS_Blueprint 13 處過時修正＋v5.0 降級改定位＋全系統接線

Fat Mo 發現「必讀核心檔」Blueprint 腐爛一個月無 session 發現（含 2026-06-03 財務事故誤讀源頭寫法仍在檔）。v4.9 修 13 處 → `/8d` 自我批評 → v5.0 降級為「系統導覽＋UI 排版規範（§5 唯一居所）」非規則源；接線 CLAUDE.md 路由/knowledge-map/兩支 UI subagent；修 `/fhs-audit` A6-3 寫死版本反向認證問題。根因（零路由/無寫回合約/稽核反向認證）、M4-lite 盤點、AGENTS.md 兩行呈批項全文見完成記錄 [2026-07-08_s158-blueprint-demotion-rewiring_completion_report.md](.fhs/reports/completion/2026-07-08_s158-blueprint-demotion-rewiring_completion_report.md)；決策 D20。

**同日追加（Fat Mo 二次裁決）**：「不要為留而留」→ v5.0 降級方案作廢，Blueprint **整檔刪除**（備份 backups/）；§5 排版鐵律遷 `ui-ux-pro-max/FHS_INTEGRATION.md` Section 六、§1 業務背景遷 auto-memory；八處反向引用全部清理。詳見完成記錄 §八與 D20 同日追加段。

**三度追加（Fat Mo 批准呈批項）**：AGENTS.md 兩行過時引用修正落地——§3 亂碼自癒改指真實記錄的 lesson 檔；§5 系統真理庫移除已刪除的 Blueprint 行與已 DEPRECATED 的 Product_Bible_V3.7 行。憲法版本 v1.5.0→**v1.5.1**。S158 全案結案。

## [2026-07-08] Session 157（Antigravity 執行）— 編輯模式新增刪除訂單按鈕與 actions menu 遮擋優化

- **編輯模式新增「刪除訂單」按鈕**：為了解決在修改舊單（Edit Mode）時，無法直接在表單頁面刪除訂單的問題，我們在桌面版底部動作列（`bottomActionBar`）新增了紅色的「刪除此訂單」按鈕，並在行動版底部動作列（`v40-bottom-bar`）新增了紅色的「刪除」按鈕。這兩個按鈕僅在表單加載了現有訂單（`editTargetOrderId` 存在）時才會動態顯示。點選後會彈出二次確認視窗，刪除成功後會自動清空表單並引導切換回「訂單總覽（review mode）」。
- **手機版 actions menu 刪除按鈕防遮擋優化**：修復行動版底部 actions menu（Bottom Sheet）中「刪除訂單」按鈕被 Threads 風格底部常駐導覽列覆蓋 of UI Bug。將 `.bs-sheet` 設定 `max-height: 85vh` 且使 `.bs-list` 支援垂直滾動 (`overflow-y: auto`)，並在手機版下調整 `.bs-safe-area` 的高度為 `calc(80px + env(safe-area-inset-bottom, 0px))`。這能將 Bottom Sheet 底部的「刪除訂單」按鈕及分隔線安全地推高到常駐導覽列上方，確保其在手機版上 100% 可視與可點擊。
- **手模擺設進度檢核與自動完成**：優化了折疊面板（Accordion）和表格（Table）中的手模擺設進度檢核渲染邏輯。根據產品的 `Style` 動態區分進度步驟：**玻璃瓶 (`玻璃瓶`)** 為 2 階段（`已book`、`已完成`），其餘如 **木框 (`木框`)** 等為 3 階段（`已book`、`已做laser`、`已做音訊`）。複選框進度會在 `_fhsHmCheckChange` 中動態以 piped string 形式儲存至 `Process_Status` 欄位；此外，當訂單內僅含手模擺設項目（忽略燈飾、羊毛氈等配件 addons）且全數完成時，新增自動彈出確認視窗，提醒用戶是否將該訂單標記為「已完成」（自動封存）。
- **手機端底部常駐導覽列（Threads 風格毛玻璃）優化**：
  - 將底部導覽列背景改為 `rgba(255, 255, 255, 0.6)` 半透明，並增強 backdrop-filter 模糊半徑至 `24px` 與 `saturate(180%)`，呈現極具現代感的毛玻璃透光視覺（滾動時後方內容可隱約透出）。
  - 對齊頂部 Segmented Control（全部/進行中/已完成）的活躍選項演繹：底部的選中項目（新增/修改/訂單/財務/系統）新增白色圓角卡片包覆框架（`background: var(--fhs-bg-surface)`、`border: 1px solid var(--fhs-border)` 加上細緻陰影），活躍字體/圖示變更為深棕色 `var(--fhs-text-primary)` 粗體，並加入回彈動畫，提升整體的點擊質感。
- **頂部標題列（Header）視覺最佳化**：
  - **隱藏 Supabase 狀態按鈕**：移除無實質用途的 `Supabase 已開啟`（`.sb-status-chip`）狀態指示晶片，減少畫面多餘雜訊。
  - **品牌標誌（Logo）居中與更名**：將原本靠左的 Logo 改名為 `freehandsss`（全小寫），並透過絕對定位使期水平居中置頂，展現精緻平衡的 Threads 微簡約品牌感。
  - **分頁標籤靠左與放大**：將分頁標籤（`#v40-top-order-id`，例如「訂單 #0600404」、「訂單總覽」）維持靠左，並將字型大小放大至更顯眼且符合資訊階層的 `16px`（`font-weight: 700`，字型由等寬 Monospace 改為系統無襯線體 Sans-serif，顏色為暖棕色 `var(--fhs-text-secondary)`）；同時為手機版新增最大寬度安全限制，且將綠色的訂單筆數 Badge 靠最右對齊，徹底消除文字重疊。
- **整體主色系一致性與舊版 slate 藍灰色清理**：
  - 將所有舊版 slate 藍灰色（`#2A2D43` 和 `#1D3557`）的實色標題與區塊進行回滾與替換，全面改用 FHS 暖色系變數（`var(--fhs-text-primary)` 暖碳棕、`var(--fhs-text-secondary)` 暖棕灰、`var(--fhs-accent)` 磚紅色、`var(--fhs-danger)` 警示紅）。
  - **表頭漸層暖化**：將訂單列表表頭（`.review-table thead th`）的原有深藍色漸層改為精緻的暖巧克力色漸層（`linear-gradient(135deg, var(--fhs-text-secondary), #5c4e3c)`），維持高對比閱讀體驗的同時融入系統美學。
  - **原始碼預覽區塊（Preview Card）整合**：將表單最下方的 output-preview 區塊從原本突兀的深黑藍色調改為系統一致的卡片風格（`var(--fhs-bg-surface)` 白底與 `var(--fhs-bg-base)` 暖米色文字框），大幅提升視覺連貫性。
- **檔案同步與驗證**：已同步修改 `freehandsss_dashboardV42.html` 與 `Freehandsss_dashboard_current.html`；執行全系統 Lifecycle 測試、壓力測試與結案驗收測試等共 4 項（LIFECYCLE/STRESS/ACCEPTANCE/PRICE_AUDIT）均全數通過（PASS）。

## [2026-07-08] Session 156（Fable 5）— blocktempo fable-5-2 條款吸收：新建 governance/07 複利迴圈

- 審閱 blocktempo《自我改進 agent · Fable 5》第二篇，60% 已覆蓋不重吸，五項增量入新檔 `07_compounding-loop.md`（教訓五階段門檻/Skills複利/平行工作流/worktree/評分者降級），接線 CLAUDE.md 路由+04 T7+05 權限與分流+INDEX+repo-map；opus 對抗審查 4F 修畢+haiku read-back 13/13。
- 過程處置：S155 撞號改 S156、S155 計畫檔 D18→D19 消歧、誤覆寫 S148 備份已 git restore。
- 全文見完成報告 [.fhs/reports/completion/2026-07-08_s156-blocktempo-absorption_completion_report.md](.fhs/reports/completion/2026-07-08_s156-blocktempo-absorption_completion_report.md)；決策 D18。

## [2026-07-08] Session 154（Gemini 3.5 Flash 執行）— S148 迴圈硬化（Loop Hardening）防誤觸與預防機制治理

完成 S148 迴圈硬化（Loop Hardening）計畫，針對 [G] 財務邏輯稽核進行物理特徵對齊，徹底根治 Session 147 頻繁誤觸問題，並補全預防端與制度層三小件：

- **Phase 0 & 1（fhs-slim + R11 觀察止血）**：`learnings.md` Preference #10 退役（51→50 條），使體積預算達標；`pre-tool-guard.js` 及 `run-fixtures.js` 引入 `FHS_GUARD_FIXTURE=1` 環境變數隔離測試夾具，徹底杜絕 observe log 被夾具測試污染；清洗原污染日誌（33 行全夾具污染），標記觀察期從今日重啟（c: `b66ae6a`）。
- **Phase 2（[G] 物理特徵判準對齊）**：重寫 `post-tool-kgov.js`（v2.0.0）並對齊 `execute.md` 真值表（migrations .sql/MCP/Dashboard HTML+財務才落 flag；其餘 md/js 文字編輯僅 warn），防 md/js 編輯誤觸；flag 檔案支援 `FHS_KGOV_FLAG_FILE` 環境變數以便測試隔離；建立 `kgov-fixtures.json`（10 組夾具）與 `run-kgov-fixtures.js` 測試執行器，對抗審查 PASS；`learnings.md` Pitfall #26 壓縮為 ≤2 行歷史摘要，`02_model-dispatch.md` §7 補治本註記（c: `b7df3b5`）。
- **Phase 3（預防端三小件）**：
  - **T6 budget gate**：`post-tool-kgov.js` 每次寫入 `learnings.md` (>50 條) 或 `handoff.md` 便攜區 (>4000 bytes) 後即時進行條目與體積檢查並警示。
  - **T5 commit 漏跑偵測**：`session-start-sop.sh` 中比對最新 git commit 日期 vs 便攜塊日期，若 commit 日期晚於塊日期且 ≥1 天則發出警告。
  - **T7 router 排除**：`prompt-router.js` 大改路由的「大範圍改動」路由加入 `excludes` 排除詞（「只規劃」、「實施計畫」等），匹配時自動跳過，防止規劃型 prompt 誤觸 guardian 建議（c: `439b29c`）。
- **Phase 4（制度層收尾）**：
  - **教訓熔斷條款**：`05_maintenance-protocol.md` v1.1.0 新增第 5 項「教訓熔斷條款」，當 `02 §7` 或 `learnings.md` 中出現 ≥3 條同型 workaround 則必須治本，不再允許無限累積 workaround。
  - **governance 健檢偵測**：`fhs-health-rules.json` v1.1.0 加入 `governance_health_cadence` 季度健檢偵測（90 天週期，以 backups 中 `05` 備份檔名日期為證）。
  - **健檢記錄**：`05` §8 記錄首次季度健檢成果，消除 cadence 偵測警示（c: `d80a349`）。
- **驗證**：4 個獨立 commit。guard 16/16 PASS，kgov 10/10 PASS，health-check 0 issues。對抗審查由 fresh-context research subagent 執行判定為 PASS。

## [2026-07-07] Session 153（續，Sonnet 5 執行）— /fhs-usage-audit 制度化（審 AI 使用行為）

Fat Mo 提出「審計自己嘅 Claude Code 使用方式」需求，複製 S141-143 `fhs-health`（文件衛生）成功樣板，落成三層架構：

- **L1 掃描器** `scripts/usage-audit/scan.js`：掃 `~/.claude/projects/*.jsonl`，per-file mtime+size 快取增量掃描，JWT/Airtable PAT/API KEY 一律正則替換為 `[REDACTED_*]` 後才落盤，輸出 `.fhs/.usage-report.json`（gitignore）。目標目錄明確設定於 `.fhs/tools/usage-audit-config.json`（同 S140 kgov 外部路徑教訓一致，不用 cwd 猜測）。
- **L2 指令層** `/fhs-usage-audit`（`.fhs/ai/commands/usage-audit.md` + bridge）：跑 L1 → 讀上次快照做趨勢對比 → 產出「可 Skill 化清單／重複 Prompt 清單／浪費模式清單」→ 只存聚合數字快照，不存長文本。明確與 `/fhs-audit`（架構衛生）、`/fhs-slim`（文件五病）三方正交，資料源（transcript vs repo 檔案）不重疊。
- **L3 紀律接線** `fhs-health-rules.json` 新增 `usage_audit_cadence`（借既有 `cadence_checks` 機制，30天週期），零新增 SessionStart hook，避免防回胖預算被再度佔用。
- **首份快照**：`.fhs/memory/usage-audit/2026-07-07.json`（91 sessions）。發現手打「八維度分析」長 prompt 重複 36 次（此制度最高價值單一發現），待另立 `/8d` 類 skill 追蹤處理。
- **驗證**：3 個獨立 commit（c1660c2/afb9728/8bb2ce0），fresh-context general-purpose subagent 做零損失核對 8/8 PASS（JSON 語法/腳本可執行/脫敏 0 洩漏/gitignore 生效/decisions.md 條目完整/knowledge-map 路由/cadence 無回歸/Master-Bridge 一致性）。`node scripts/hooks/fhs-health-check.js` 重跑 issue_count=1（learnings.md 51/50 條既存異常，非本次引入）。

## [2026-07-07] Session 152-followup（Sonnet 5 執行）— 接線稽核與三項裁決執行

S152 完成後 Fat Mo 追問全系統有無「無讀者/無觸發/重複/衝突」情況，先自查修復 ui-designer 未接 Vercel 規則+code-reviewer 重複觸控規則（已於前一輪 commit）；再派 subagent 做全系統接線稽核，主對話第一手複核後執行三項裁決：AGENTS.md Rule 3.15 加熔斷數字消歧註記；歸檔孤兒 `vendor/awesome-cc/hooks-setup-guide.md`；`prompt-router.js` 補 finance-auditor/product-integration-validator/blender-3d-modeler 三支缺漏路由——過程中抓到並修復真實 bug（新規則因陣列順序被更早的關鍵字路由搶先攔截，「財務稽核」「新sku」原本會誤路由）。router 實跑5條測試PASS；guard 16/16無回歸。全文見完成記錄 [2026-07-07_s152-followup-wiring-audit_completion_report.md](.fhs/reports/completion/2026-07-07_s152-followup-wiring-audit_completion_report.md)。

## [2026-07-07] Session 153（Sonnet 5 執行）— 訂單總覽與部位標籤 100% SVG 向量化與底部導覽重疊 BUG 修復

針對 UI 各處殘留的 Emoji 進行無死角 SVG 圖標替換，修復手機版底部返回操作列的固定重疊 BUG，並將最新生產版發布部署：

- **手機版底部操作列固定 BUG 修復**：修正行動裝置（<768px）下 `.fhs-bottom-bar` 樣式，由 `position: fixed !important` 改為 `position: static !important`。使其作為卡片自然排列在表單容器 `#formContainer` 之下隨頁滾動，徹底解決遮擋與重疊問題。同步將 body `padding-bottom` 縮減為 `88px`，`fhs-toast` Spacing 相應下移至導覽列上方。
- **訂單卡片與部位標籤 100% 向量化**：重構 `getProductDimensions()` 維度解析引擎，將 CJK 肢體、產品材質、款式與主題及統計中的 Emoji 替換為 SVG 線條向量圖標，包括新增 `icon-crown`（皇冠）、`icon-bottle`（玻璃瓶）、`icon-heart`（心形）、`icon-waves`（波浪線條）圖標。
- **手與腳圖標精細化**：重寫 `icon-hand` 與 `icon-footprint` 壞軌的 SVG 路徑。`icon-hand` 使用 Lucide 標準多路徑手掌；`icon-footprint` 採用標準成對腳印，使其在 12px 小尺寸下依然精確居中且可清晰識別。
- **動態 UI Emojis 清除**：修改審閱 Modal `_updateIgCopyUI()`，複製成功與否以 `innerHTML` 動態寫入綠色向量 `icon-check` 與夾具圖標；同步修復 `toggleIgFormatA()` 格式切換按鈕文字 `innerHTML` 含 `icon-refresh-cw` 的同步複製行為。
- **展開折疊訂單卡片與詳情彈窗 100% 向量化 (追加)**：將 expanded accordion card（Review mode）內的 `備註`、`產品明細`、`刻字`、`批次`、`進度` 標題、狀態下拉選項及 `手模`/`金屬` 詳情按鈕中的 Emoji 全部替換為對應的 SVG 圖標；將詳情 Modal 的分頁標籤（訊息文本、訂單明細、財務、已人工編輯、重新生成、編輯）及動態 Title 徹底向量化，實現完全零 Emoji 的標準化 UI。
- **逾期狀態指示器向量化 (追加)**：將 delivery status badge 的 `🔴 逾期`、`🔴 今日到期`、`⚠️ 剩` 轉換為 Lucide 線條圖標 `icon-shield-alert`與`icon-bell`。
- **全案測試與 WebDAV 部署**：執行全生命週期與壓力測試套件（LIFECYCLE/STRESS/ACCEPTANCE/PRICE_AUDIT）共 4 項全部 PASS。以 `/upload-web` 成功部署 current 生產版 HTML 至 Synology NAS (PUT HTTP 204 通過)。

## [2026-07-07] Session 152（Fable 5 規劃 → Sonnet 5 執行）— 十大框架條款吸收（Skills Absorption）

Fat Mo 提供「Codex 必裝十大技能」榜單，經 4 支 subagent 原文研究裁決：不裝整包框架，只吸收條款級規則（A-M）融入既有治理。完成：tdd-guide.md 補鏈既有 TDD vendor 檔（發現 A/C 項早於 2026-05-09 已部分吸收，避免重複造輪）；03 R2/R4 補證據新鮮度+紅綠revert+人類訊號；02 補外部內容隔離+context動態節流；04 T2/T5 補兩verdict審查+BLOCKED四狀態+落盤紀律；cl-flow.md 補計畫反佔位條款；ui-ux-pro-max/FHS_INTEGRATION.md+code-reviewer 補 Vercel 框架無關前端規則。fresh-context 情境測試+haiku smoke test 各一次 PASS；guard 16/16 無回歸。webapp-testing plugin 安裝因需互動式操作標記 BLOCKED 待 Fat Mo 手動處理。全文見完成記錄 [2026-07-07_s152-skills-absorption_completion_report.md](.fhs/reports/completion/2026-07-07_s152-skills-absorption_completion_report.md)。

## [2026-07-07] Session 151（Sonnet 5 執行）— 手機版 Threads 底部導覽列與 Supabase 狀態列對位優化

針對手機版（橫寬 <767px）底部 Threads 風格半透明圓角浮動導覽列進行滾動防剪裁與位置防覆蓋優化：

- **手機版底部導覽列常駐固定**：新增 `DOMContentLoaded` 偵測，若為手機寬度，自動將按鈕群 `.fhs-top-bar__actions` 從頂部標題列移動到 `<body>` 根節點下。這樣一來，它就脫離了頂部標題列的 transform 隱藏範圍與 `overflow: hidden` 裁切範圍，能夠**長期且穩定地固定在畫面底部**（向上滾動時不再被隨之隱藏）。
- **Supabase 狀態指示器移至頂部右側**：移除手機版下對 `#v41-supabase-toggle` 的 `position: absolute` 定位，改回相對定位 `position: relative !important; right: auto !important;`。在手機載入時動態將其掛回頂部標題列 `#v40-top-bar` 內。這樣它作為標題列內的 Flex 子元素，與綠色的訂單數量徽章（`#reviewCountBadge` - "33 筆"）**自然並排且無重疊**，且會隨著標題列的滾動隱藏正常收合。
- **已同步兩份檔案**：確認 `freehandsss_dashboardV42.html` 同步複製至 `Freehandsss_dashboard_current.html`。
- **文件同步**：新增 1 篇 lesson（CSS transform 容器對 fixed 子元素 Containing Block 之影與 clipping 裁剪 pitfall）。

【交付前雙紀律自檢】
驗收：手機版 375px 滾動測試，確認底部半透明 Threads 導覽列常駐且沒有在向下滾動時消失；頂部 Supabase 狀態燈位置與綠色「33筆」徽章並列，無遮擋覆蓋；健康檢查 `fhs-health-check.js` 執行無代碼錯誤，結果為 PASS = ✅
Subagent：✅ 已使用（frontend-developer×2：第一輪處理 DOM 掛載移出以避免 transform 動態收合隱藏；第二輪修正 position 使其與綠色徽章自然並排，按計畫§1 派工矩陣 HTML 修改慣例）

## [2026-07-07] Session 150（續，Sonnet 5 執行）— 審計修復 Phase 1-3（生產 POS 止血）


S150 規劃期產出的審計修復計畫（[.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md](.fhs/reports/planning/2026-07-06_s150-audit-fix_implementation_plan.md)）經 Fat Mo 核准後，按建議序先執行 Phase 1-3（與 S148/S149 零檔案交集，優先止血生產 POS）：

- **Phase 0（唯讀基線）**：確認 migration 0048 仍最新；`ig_watchdog_alerts_kind_check` 現值僅允許 `not_created`/`created_incomplete`；orders 兩條 anon UPDATE 政策 qual 皆 `true`（等價，留 Phase 5 處理）；exec 4069 診斷（curl+jq 落 scratchpad）確認錯誤為 Telegram markdown 解析失敗（byte offset 568），`Write Alerts` 節點在此之前已成功寫入、`processedFolderIds` 標記邏輯在更早的 Code 節點完成——**資料夾未漏處理**，比規劃期預期樂觀，不觸發授權項 7 的補掃
- **Phase 1（F1）**：修復 IG 看門狗三顆按鈕（開訂單/複製訂號/標記已處理）onclick 屬性斷裂——`JSON.stringify()` 輸出雙引號嵌入同樣雙引號分隔的 HTML 屬性導致解析截斷；改手動單引號包裹（order_id/alert id 經 `normalizeOrderId()` 保證僅含英數+連字號，無需 escape）。`_igwCopyOrderId()` 加 `execCommand('copy')` textarea fallback + 1.5s 逾時保護（實測發現 `navigator.clipboard` 權限 pending 會永久卡住，非規劃期原案，屬 live 測試中新發現的防護需求）
- **Phase 2（F3）**：`#fhsSegWrapper`（全部/進行中/已完成 分頁）CSS 基樣式由 `display:none` 改 `display:block`，新增 `@media (min-width:768px)` 桌面樣式，767px 以下零改動。實測 1280px：進行中 74 列 + 已完成 6 列 = 全部 80 列完全吻合——修復前這 6 筆歸檔訂單在 Desktop 完全不可見
- **Phase 3（F2）**：新建 `fhs_write_expense_log` RPC（migration 0049，SECURITY DEFINER + 固定 search_path + GRANT anon/authenticated），修復記錄中心「支出記錄」tab 寫入 404 問題；前端 fallback 同步修正為使用同 IIFE 內的 `_FS_SB_URL`/`_FS_SB_ANON` 常數（原引用未定義的 `window._sbUrl`/`window._sbHdr`，是二層斷裂的根因之一）
- **文件同步**：`FHS_System_Logic_Overview.md` 新增 §5.6（expense_logs 修復）、§10.12（seg control desktop）、§11.4 補充（onclick 修復）；新增 2 篇 lessons（onclick 雙引號衝突 pitfall；前端呼叫 RPC 先探針再信任 pattern）
- **驗收**：guard fixtures 16/16 + health fixtures 12/12 皆 PASS 無回歸；code-reviewer（haiku）對 Phase 1-3 diff 審查 PASS（零阻塞問題，2 項非阻塞建議）；所有 live 探針資料（expense_logs probe、igwatch resolved 狀態）皆已復原/刪除零殘留
- **中止點**：Phase 4-6（verified_ok 正向記錄、orders anon 權限收斂、制度收尾）留待 S148/S149 完成後接續，執行者可直接續讀計畫檔 §4.5 起；本次未部署 NAS（`/upload-web`+`.deploy-ok` 留待 Fat Mo 批准）；git commit 尚未建立，留待 Fat Mo 檢視後定粒度

【交付前雙紀律自檢】
驗收：生產 HTML + schema 改動 — code-reviewer(haiku) PASS；guard 16/16 + health 12/12 無回歸；migration 0049 curl 探針 200 + UI 表單實跑 200；F3 desktop 篩選數字吻合（74+6=80）；所有 live 測試資料已清除零殘留 = ✅
Subagent：✅ 已使用（code-reviewer haiku×1：Phase 1-3 diff 品質 gate，按計畫§1 派工矩陣「HTML 改動品質 gate」慣例）；其餘（基線探查/程式碼修復/migration/live 驗證）為已知路徑定點操作，按 governance/02 §1 主對話直接執行

### 追加（同日）— 篩選面板 + Segmented Control 響應式重新設計（Fat Mo 截圖反饋）

Fat Mo 對 Phase 2（F3）成果反饋：Desktop 版「全部/進行中/已完成」置於表格下方不方便，附三張截圖提出四項具體要求。載入 `/arrange` skill 取方法論後執行：

- **R1**：`#fhsSegWrapper` 從表格上緣移入 `.review-filters-v2` 面板內，與 `.filter-toggle-bar`（篩選條件 toggle）同組包在新 `.filter-toggle-row` 內；Desktop 呈 `flex-direction:column` 上下疊放，緊貼篩選條件列
- **R2**：手機首次訪問（`localStorage['fhs_filter_open']` 無值）預設收縮篩選面板；Desktop 預設仍展開；已有使用者偏好一律優先
- **R3**：手機收縮態下 `.filter-toggle-row` 轉 `flex-direction:row`，隱藏「篩選條件」文字與已選提示（僅留 icon），`#fhsSegWrapper` 佔滿剩餘寬度（`flex:1`），與 icon 同一行左右並排
- **R4**：篩選欄位「年度+月份」「狀態+批次」各自包一層新 `.filter-pair-row`，手機版強制 `width:100%` 均分兩欄且改 label-上/控制項-下堆疊排版，保證同一行不受內容寬度影響而被擠到下一行
- 順手補 `#reviewFilterToggle` `aria-label="篩選條件"`（code-reviewer 建議項，圖示替代文字後的無障礙補強）

【交付前雙紀律自檢】
驗收：純響應式 CSS/HTML 佈局改動 — code-reviewer(haiku) PASS（零阻塞，1 項非阻塞 a11y 建議已同步採納）；guard 16/16 無回歸；preview 375px/1280px 雙尺寸實測：手機首訪確認預設收縮+icon 與 tabs 同行+展開後狀態批次同行；Desktop 確認 seg control 貼齊篩選列+80=74+6 篩選數字不變；console 零錯誤 = ✅
Subagent：✅ 已使用（code-reviewer haiku×1，同上慣例）；載入 `/arrange` skill 取版面/間距方法論（非派工，主對話直接依 skill 指引執行 CSS 重構）

### 追加（同日，第二輪）— Desktop 統一跟隨手機排位 + 搜尋/排序同行 + 排序選項精簡（Fat Mo 再次截圖反饋）

Fat Mo 看過第一輪重設計後再提四項要求：

- **R1'**：`.filter-toggle-row` 由「Desktop 上下疊/Mobile 同行」改為**全裝置統一同行**——移除 `@media (min-width:768px)` 例外，icon-only + tabs 同行規則變成基礎樣式（無條件套用），Desktop 視覺與 Mobile 一致
- **R2'/R3'**：`↕ 排序` 從 filter-row-secondary 搬到 filter-row-primary，與 `🔍 搜尋` 包成新 `.filter-pair-row`（比照年度+月份、狀態+批次同套配對機制），手機版同樣保證同行、與上方欄位對齊
- **R4'**：`↕ 排序` 下拉選單移除「成本」「利潤」「進度」三個 optgroup（純 UI 選項刪除，`applyReviewFilters()` 排序比較邏輯是通用 field/dir 解析、非逐選項寫死，無需同步刪程式碼；`⏰ 時限警示` optgroup 移至清單最頂，僅次於「預設」）

【交付前雙紀律自檢】
驗收：純響應式 CSS/HTML 佈局改動 + UI 選項刪減（無邏輯層改動）— code-reviewer 判斷同上輪對等改動性質、未重新派工（純位置搬移+CSS層級調整+靜態選項刪除，範圍與上輪相同、風險對等）；guard 16/16 無回歸；preview_inspect 量測 computed style 驗證（非螢幕截圖，因 preview_screenshot 本輪多次逾時，改用更精確的 inspect 量測）：Desktop 1280px `.filter-toggle-row` display:flex/flex-direction:row/`.filter-toggle-label` display:none 與 Mobile 375px 一致；搜尋(x≈902)與排序(x≈1166)、手機搜尋(x≈30-169)與排序(x≈204+)皆同一行左右並排；下拉選單文字序確認「預設→⏰時限警示→日期→單號→客人」；點選/切換皆零 console error = ✅
Subagent：❌ 未使用（沿用同 session 已建立的重構模式，範圍與風險對等前一輪已審查改動，主對話直接執行+量測驗證）

### 追加（同日，第三輪）— 移除重複標題 + 模式導覽列移至手機底部（仿 Threads，Fat Mo 第三次截圖反饋）

Fat Mo 指出兩個新問題並附截圖：(1) 手機/Desktop 下「📊 訂單總覽」大標題與 Top Bar「📋 訂單總覽」文字重疊；(2) 參考 Threads app 底部導覽列風格，建議把「新增/修改/訂單/財務/⚙️/🐶」按鈕列移到手機版底部：

- **重複標題移除**：刪除 `.review-header` 內的 `<h2>📊 訂單總覽</h2>`（與 Top Bar `#v40-top-order-id` 的「📋 訂單總覽」重複）；`#reviewCountBadge`（顯示「N 筆 · 時間」）搬到 Top Bar、緊接在 `#v40-top-order-id` 之後常駐顯示；因原容器 `#reviewModeContainer` 的 `display:none` 連帶遮蔽效果不再適用，於既有 `switchMode` 覆寫邏輯內補一行：離開 review 模式時顯式 `display:none` 隱藏 badge（S150 F5）
- **意外發現＋一併修復**：實測量測到手機 375px 下 `.fhs-top-bar__actions`（6 顆模式按鈕＋Supabase 狀態膠囊）需要 317px 寬度但只有 222px 可用空間——按鈕已被 `.fhs-top-bar` 的 `overflow:hidden` 裁切到螢幕外，這證實了 Fat Mo 提出底部導覽列需求的必要性（非純美觀考量）
- **底部導覽列（S150 F6）**：於既有 `@media(max-width:767px)` 內把 `.fhs-top-bar__actions` 改 `position:fixed;bottom:0`（仿 Threads 常駐底部列），新增 CSS 變數 `--mode-nav-height:52px`；純 CSS 重定位，未搬動任何 DOM 節點/HTML ID（6 顆按鈕 ID 與 `v41-supabase-toggle` 皆原地不動，只是視覺上被固定到底部）。既有的 `#v40-bottom-bar`（create/edit 模式限定的「返回總覽/審閱並完成」提交列）`bottom` 偏移量改為 `var(--mode-nav-height)`，與新導覽列上下疊放零重疊（實測 696-760px / 760-812px）；`body` 手機版 `padding-bottom` 相應加總兩者高度。Desktop（≥768px）完全不受影響（`.fhs-top-bar__actions` 仍 `position:static`）

【交付前雙紀律自檢】
驗收：涉及主導覽結構改動（風險等級較前兩輪高）— code-reviewer(haiku) PASS（零阻塞、零警告）：確認 10 個 contract-critical ID 全數原封不動；`reviewCountBadge` 顯示洩漏風險逐路徑排查（currentMode 初始為 null、無自動顯示路徑、renderReviewTable 為唯一顯示觸發點）；z-index 疊放序（導覽列 2000 > drawer 200，與既有 top-bar 疊 drawer 慣例一致，非新回歸）；觸控目標尺寸達標。guard 16/16 無回歸；preview 實測：手機 375px 導覽列釘在螢幕底部（y:760-812）、7 個項目零裁切；create 模式下雙層底部列疊放零重疊零間隙；Desktop 1280px 確認 `.fhs-top-bar__actions` 仍 `position:static` 未受影響；切換模式功能正常（finance 面板正確顯示、badge 正確隱藏）；console 零錯誤 = ✅
Subagent：✅ 已使用（code-reviewer haiku×1：本輪改動主導覽結構風險較高，明確請求仔細審查 z-index 疊放與 ID 完整性）

【交付前雙紀律自檢】
驗收：純響應式 CSS/HTML 佈局改動 — code-reviewer(haiku) PASS（零阻塞，1 項非阻塞 a11y 建議已同步採納）；guard 16/16 無回歸；preview 375px/1280px 雙尺寸實測：手機首訪確認預設收縮+icon 與 tabs 同行+展開後狀態批次同行；Desktop 確認 seg control 貼齊篩選列+80=74+6 篩選數字不變；console 零錯誤 = ✅
Subagent：✅ 已使用（code-reviewer haiku×1，同上慣例）；載入 `/arrange` skill 取版面/間距方法論（非派工，主對話直接依 skill 指引執行 CSS 重構）

## [2026-07-05] Session 147 — Phase 3 全域治理優化：方案書 + 15 項執行

`/rp` → `/cl-flow`（4 路 sonnet subagent 域掃描：制度層/藍圖知識層/財務六專檔/運行系統文檔，24+ 項發現）→ Step 3 fresh-context 抽驗（5 條指控，3 CONFIRMED/1修正/1推翻降級）→ 產出方案書，Fat Mo「全批准處理」後執行 15 項中的 14 項（詳見 [完成報告](.fhs/reports/completion/2026-07-05_s147-phase3-governance-optimization_completion_report.md)）：

- **P0（5項）**：current.html 生產版本認定 4 處矛盾修正（grep 實測 igwatch 標記確認 V42 內容已存在）；財務欄位拼法 `addon_cost_lights`→`addon_cost_light` + 章節引用修正；AGENTS.md §7 移除已退役 `/px-plan`/`/px-audit` 指令引用；Cost_Schema_v2/Pricing_Bible 對已退役 `Product_Bible_V3.7` 的權威引用改指向現行 Pricing_Bible §5；n8n/supabase README 更新至現況
- **P1（5項，1項標記待決）**：finance-gatekeeper 路由表補 3 份缺漏財務文件；FHS_Blueprint.md §7/§8 內容重寫（反映 Supabase Read/Write Lead）；IG Watchdog 規格互加交叉連結；CLAUDE.md 三紅線改摘要+連結消除全文重複；**成本文件家族審計逾期一項僅標記回報，未代為決策**
- **P2（6項）**：fhs-audit.md 自稱項目數 30→33（S145實測）；AGENTS.md Rule 3.11 token 數字修正（~300→實測~2,300）；CLAUDE.md 補 06_letter-to-future-sessions 路由；.fhs/notes/README.md 移除 58 行死內容；Cost_Schema_v2 版本號三處統一 v2.2.0；Blueprint↔System_Logic_Overview 互加 See-Also

全程零修改 migrations/n8n workflow/Dashboard HTML 本體，[G]運算邏輯稽核不觸發。

【交付前雙紀律自檢】
驗收：文件治理 — 逐項編輯後 grep 核對關鍵字無殘留；P0-1 版本判定附 grep 實測證據非猜測
Subagent：❌ 未使用（機械文件修正，範圍小可自行核對）；本輪掃描階段前置已派 4 個 sonnet 域掃描 + 1 個 fresh-context 抽驗 agent

### 追加（同日）— P1-3 三方審計 + Stage 3 CHECK 約束上線

Fat Mo 授權推進成本文件家族（Cost_Schema_v2/Operations/UI_Spec）審計：database-reviewer 初審 FAIL（3 Blocker）→ 修正 → 複審 PASS-with-fixes（複審抓出 F1 殘留，二次修正後 grep 清零）；code-reviewer、ui-designer 皆 PASS-with-fixes 並修正。核實後發現 Operations.md 描述的多數「Stage 3待辦」（0022a/0022b migration、Dashboard 23-key UI、n8n 時間窗互鎖）早已上線，真正缺口僅 2 項：CHECK 約束（本次完成）、n8n 共享鎖 RPC（留待下 session，因改動 live 訂單 workflow 需 opus+fresh-context 規格）。

**Migration `0048_cost_config_value_check_constraint` 已上線並 live 驗證**：`cost_configurations.config_value` 新增非負數字 CHECK 約束，套用前查詢確認 0 筆違反、套用後實測負數插入被拒（error 23514）。

【追加交付前雙紀律自檢】
驗收：財務/schema 變動 — live 查詢預檢 + apply_migration + pg_constraint 驗證 + 交易級負數插入實測（附 error code）+ 測試列未殘留確認
Subagent：三方審計 database-reviewer/code-reviewer(opus)/ui-designer(sonnet) + fresh-context database-reviewer 複審；CHECK 約束執行為單一 SQL 操作，主線程直接執行並自帶 live 驗證證據

## [2026-07-05] Session 146 — /fhs-slim 清理（learnings.md 輪轉 + 孤兒索引修復）

L1 健檢（S145 尾聲跑出）發現2項：`learnings.md` 51條超50條上限；孤兒 lesson 檔 `2026-07-05_git-checkout-carries-uncommitted-changes-silent-merge-noop.md` 未被 `INDEX.md` 索引。`/fhs-slim` 出方案經 Fat Mo 批准後執行：

1. **learnings.md 輪轉 51→50**：退役 Pitfall #7「IIFE 閉包函式 onclick 靜默失效」（2026-05-27，修復手法已是本專案標準慣例，未來復發風險低，判準比照 S144 退役先例）；Pitfalls #8-26 重編號為 #7-25，含內文行內標籤 #20→#19 同步修正、關聯 lesson 檔交叉引用 #21→#20 同步修正。
2. **INDEX.md 補孤兒索引**：於表格末尾新增該 lesson 檔一行索引記錄。

**驗證**：重跑 `fhs-health-check.js`，issue_count 2→0；guard fixtures 16/16 PASS 無回歸；分支 `feature/fhs-slim-s146` 完成後 `git merge --no-ff` 進 main（本次 merge 正確輸出 diffstat，驗證未重蹈 S144 git-checkout-carries-uncommitted-changes 教訓的覆轍）。

【交付前雙紀律自檢】
驗收：文件治理任務 — health fixtures 重跑 issue_count 2→0；guard fixtures 16/16 無回歸 = ✅
Subagent：❌ 未使用 — 2檔定點編輯+程式化重編號，範圍小可程式驗證，比照 governance/04 §1 主對話直接執行判準

## [2026-07-05] Session 145 — /fhs-audit 全量稽核 10 項待辦全面處理

`/fhs-audit` 全量30項稽核（17✅16🟡0🔴，見 [audit_2026-07-05.md](.fhs/reports/audits/system/audit_2026-07-05.md)）發現的10項🟡待辦，Fat Mo初步裁決交下一輪`/fhs-slim`或`/execute`，隨後改變主意要求本session全面處理。逐項處理如下：

1. **版本號批次同步**：`README.md`／`.fhs/ai/README.md`／9個subagent frontmatter／`FHS_Blueprint.md`／`FHS_Legacy_Migration_Notes.md`／`plan_0004_supabase_cost_migration.md` 全部 `compatible_with` 同步至 AGENTS.md v1.5.0；`README.md` 額外修正 Dashboard UI 版本聲明（V41→V42）。`verify_repo_map.sh`／`generate_version_manifest.py` 重跑確認 0 errors/0 warnings。
2. **scripts/ 47個沉積腳本歸檔**：核對每個候選檔無現行引用（`scratch_pull_and_save_workflow.js` 經查證仍在 `scripts/README.md` 有正式用途說明，排除在外，故實際46個）後 `git mv` 至新建 `archive/scripts-scratch-2026-07/`；新建 `archive/README.md`（repo-map 舊稱存在但實際不存在，一併補建）；`scripts/README.md` 補一段去向說明。
3. **移除孤立git worktree**：確認 `.claude/worktrees/elastic-gates-ee5944`（分支已完全併入main）無未提交變更後 `git worktree remove`；分支本體保留未刪除。
4. **`canonical_keys.yml` 3條過時regex修復**：`n8n_version` source_of_truth 改指向 AGENTS.md 並改抓 Workflow ID 格式（原抓「VX.Y.Z」格式已停用）；`supabase_role` pattern 欄序修正；`production_html` 移除已不存在的「穩定」二字要求。重跑 `semantic_audit.py` 確認 6/6 canonical keys 全部 `ok`（原3個 no_match）。
5. **`semantic_audit.py` 2個bug修復**：① `target.lstrip("./")` 誤用字元集合剝除而非前綴剝除，導致 `/.fhs/...` 類路徑被吃掉開頭的點造成假性孤兒，改為顯式前綴判斷；② `EXCLUDE_DIRS` 新增 `worktrees`，避免git worktree快照重複計數。修復後：deprecated hits 126→59、dangling links 1197→249（-79%）。剩餘249筆屬另一類MVP解析器限制（裸檔名無路徑前綴／`file://` URI／範本佔位符），非本次2個已知bug範圍，留待未來獨立評估。
6. **`docs/repo-map.md` 補列缺漏項**：新增 `docs/FHS_Knowledge_Map.md`／`docs/plan_0004_supabase_cost_migration.md`／`archive/` 下3個既存未列項（`freehandsss_financial_overview.html.deprecated`／`n8n_scripts/`／新建的`scripts-scratch-2026-07/`）；根目錄6個用途不明項目（`Temp 33/`／`.fhs-local/`／`.trash/`／`airtable-database/`／`scratch/`／`repomix-output.txt`）依 Fat Mo 裁決「只補文件不刪除」，逐一加註用途與gitignore狀態。
7. **`FHS_Knowledge_Map.md`／`knowledge-map.md` 互相cross-reference**：兩檔互加警語說明彼此用途差異（Obsidian圖譜索引 vs AI查詢路由表），降低命名相近造成的混淆風險。
8. **`todo.md` 優先級對齊**：「Plan 0004」項目優先級由🔴改為⚪，對齊 handoff.md MASTER表既有的低優先判定，避免同一件事在兩份準SSoT文件呈現矛盾優先級。
9. **V42 HTML `<title>` 標籤修正**：`freehandsss_dashboardV42.html` 的 `<title>` 由「V40 - Responsive Prototype」改為「V42 - Responsive Prototype」（替換三步計數驗證：改前count=1，改後舊字串count=0/新字串count=1）；內部設計系統註解（`V40 FHS Design Token System`）因描述的是token系統真實歷史命名而非目前版本聲明，判斷保留不動，避免引入新的不準確。
10. **`FHS_Prompts.md` 新增情境二十六**：補 `/fhs-check`（全系統健康檢查/壓力測試）路由，含與情境八（Internal Patrol，文件治理）的區別說明；`/rg` 比照 `/read`／`/execute` 屬明確slash指令直接呼叫類別，不另立情境條目（附理由註記於文件內）。version v1.9→v1.10。

**驗證**：guard fixtures 16/16 PASS 無回歸；health fixtures 12/12 PASS 無回歸；`verify_repo_map.sh`／`generate_version_manifest.py`／`semantic_audit.py` 三隻自動化工具全部重跑通過。live health check 額外發現1項本次修復範圍外的新問題（`learnings.md` 因本session稍早新增1條記錄達51條，超過50條上限）與1項既有孤兒lesson檔問題，均非本次10項任務範圍，留待下次 `/fhs-slim`。

## [2026-07-05] Session 145 — kgov SAFE_PATH_PATTERNS 補 auto-memory 外部路徑盲區

`scripts/hooks/post-tool-kgov.js`：`SAFE_PATH_PATTERNS` 原僅認 repo 內 `.fhs/memory/`，未認 auto-memory 實際外部路徑（S140/S141 已發現、範圍外未修），導致寫入 auto-memory 財務類記憶檔（如 `project_cost_calculation_rules.md`）時被誤判為財務邏輯變動觸發 [G] flag。修法：直接讀取 `fhs-health-check.js` 已用的同一份 `.fhs/tools/fhs-health-rules.json` 的 `auto_memory_dir.path`（顯式設定，不猜測 pattern），做前綴比對；讀取失敗 fail-open（不新增誤判）。手測驗證：auto-memory 路徑含財務詞不觸發（改前會誤觸發）；一般路徑含財務詞仍正確觸發（無回歸）；guard fixtures 16/16 PASS（未受影響的另一支 hook，僅確認連坐測試無誤）。

附帶：本 session 首次真實查詢驗證 `knowledge-map.md`（S144 新增）——本次任務屬性未落入既有 9 類任何一類（inline code comment/config note 記錄的已知 gap），符合路由表本身「只在新類別誕生時加行」設計，本次判定尚不足以構成新類別，暫不改表，留待未來累積更多同類查詢再評估。

## [2026-07-05] Session 144 — 知識工作流程健檢（查詢路由 + 模型分派文件對齊 + 敘事單源合約 + 降級交接膠囊）

新增 `.fhs/notes/knowledge-map.md` 查詢路由表；修正 governance/02 subagent 模型釘選表文件漂移；commit.md 新增敘事單源分級合約（治 S142/S143 MASTER 表 drift 根因）；governance/04 新增 T6 降級交接膠囊模板。guard 16/16 + health 12/12 無回歸。詳見完成記錄：[.fhs/reports/completion/2026-07-05_s144-knowledge-workflow-hygiene_completion_report.md](.fhs/reports/completion/2026-07-05_s144-knowledge-workflow-hygiene_completion_report.md)

---

## [2026-07-05] Session 143 — 衛生指令記憶負擔歸零（週期到期提醒 + 部署前置檢查）

**範圍**：`.fhs/tools/fhs-health-rules.json`、`scripts/hooks/fhs-health-check.js`（新增第6檢查）、`scripts/hooks/test/health-fixtures*`（10→12案）、`.fhs/ai/commands/upload-web.md` v1.1.0→v1.2.0 + `.claude/commands/upload-web.md`

**分支**：`feature/fhs-audit-cadence`（未合併，待 Fat Mo 確認）

### [FEAT] L1 第6檢查：週期稽核到期偵測
- `checkCadenceOverdue()`：讀 `/fhs-audit` 既有報告產物（`.fhs/reports/audits/system/audit_*.md`）**檔名日期**推斷上次執行時間（不用mtime避免git/sync污染，不建新marker機制），逾90天（governance/05 §7）才印提醒，找不到報告視為「從未執行」同樣提醒
- day-one 實測：現存最新報告 49 天前 < 90 天門檻，live 跑確認靜默，符合預期

### [FEAT] `/upload-web` Step 0 部署前置
- 預設先跑 `/fhs-check`（全系統功能壓力測試），FAIL 則停止部署；Fat Mo 可明示 skip（不做成硬性 exit 1，避免每次小部署都被迫跑重量級測試）

### [背景] 記憶負擔盤點
- 四支既有稽核指令（fhs-audit/fhs-check/guardian/error-eye）逐一檢視：`/guardian`、`/error-eye` 已被 prompt-router 關鍵詞覆蓋無缺口；真缺口只有 `/fhs-audit` 週期無提醒（本次補）與 `/fhs-check` 未掛部署前置（本次補）

### [TEST] fixtures 10→12
- 新增 11-cadence-overdue／12-cadence-fresh；後者證據檔在測試執行當下動態產生今日日期，避免套件未來自然變假陽性；12/12 PASS，guard 16/16 無回歸

詳見完成記錄：[.fhs/reports/completion/2026-07-05_s143-cadence-reminder_completion_report.md](.fhs/reports/completion/2026-07-05_s143-cadence-reminder_completion_report.md)

---

## [2026-07-05] Session 142 — FHS 三層式系統健康機制（L1偵測/L2清理/L3紀律）

**範圍**：`scripts/hooks/fhs-health-check.js`（新）、`.fhs/tools/fhs-health-rules.json`（新）、`scripts/hooks/session-start-sop.sh`（末尾掛載）、`.fhs/ai/commands/fhs-slim.md`（新）+ `.claude/commands/fhs-slim.md`（新）、`scripts/hooks/test/health-fixtures*`（新，10案）、`.fhs/ai/commands/fhs-audit.md`、`.fhs/ai/governance/05_maintenance-protocol.md`、`docs/FHS_Prompts.md`

**分支**：`feature/fhs-health-check`（未合併，待 Fat Mo 確認）

### [FEAT] L1 零 token 五病偵測
- `fhs-health-check.js`：SessionStart hook 末尾呼叫，零外部依賴，偵測過肥（體積/行數/條目數，各帶明確 unit）、沉積孤兒（索引↔實檔雙向比對）、過時漂移（複用 canonical_keys.yml，不信 frontmatter last_updated）、同名重複（basename跨路徑，排除backups/archive/vendor/health-fixtures）、歸檔斷鏈
- fail-open 三原則：全包 try-catch、永遠 exit 0、內部錯誤只落 `.fhs/.health-check-error.log`，絕不擋 session 啟動
- 正常沉默、異常 ≤2 行警示；live 實測 24ms（<2s 預算），首次上線即抓到 3 項真實問題（便攜塊超標/learnings超額/1個孤兒檔）

### [FEAT] L2 `/fhs-slim` 清理管道
- 讀 L1 報告 → 逐項核實+出方案（壓縮索引/歸檔/安全刪除/修正漂移/去重）→ 停等 Fat Mo 批准 → S141 執行紀律（備份→只歸檔不刪→每步一commit→視範圍派fresh-context核對）
- 與 `/fhs-audit`（30項深稽核）分界：/fhs-slim 為輕量快檢清理，互相在指令檔內註明，不重複造輪

### [TEST] 10 案測試夾具
- env var 沙盒隔離（`FHS_HEALTH_ROOT`/`FHS_HEALTH_RULES`/`FHS_HEALTH_REPORT_OUT`/`FHS_HEALTH_ERROR_LOG`），涵蓋健康沉默/五病各一/外部路徑讀取/canonical_keys.yml真檔解析/rules.json損毀fail-open/entries精確計數，10/10 PASS；guard fixtures 16/16 迴歸無破壞

詳見完成記錄：[.fhs/reports/completion/2026-07-05_s142-fhs-health-check-system_completion_report.md](.fhs/reports/completion/2026-07-05_s142-fhs-health-check-system_completion_report.md)

---

## [2026-07-04] Session 141 — 固定載入文件瘦身（Context Slimming）

**範圍**：`.fhs/memory/handoff.md`（便攜塊）、`.fhs/ai/commands/commit.md`（P0.7.1新增）、`CLAUDE.md`、`.fhs/ai/subagents/freehandsss/`（3檔bug修復）+ `~/.claude/agents/freehandsss/`（同步）、auto-memory 目錄（repo外）、`docs/repo-map.md`、`.fhs/memory/README.md`

**分支**：`feature/context-slimming`（未合併，待 Fat Mo 確認）

### [FEAT] 便攜塊瘦身 + 防回胖機制
- `handoff.md` 便攜塊動態段 7,787→5,066 bytes（−35%）：「✅已定決策」28條中25條壓縮為一行索引+連結（指向AGENTS.md/decisions.md/MASTER表既有記錄），3條無他處收錄者全文歸檔至新建 `archive/handoff-portable-block-decisions-pre-2026-07-04.md`；「🔬驗證」只留近3個session，較舊12項歸檔至 `archive/handoff-portable-block-verified-pre-2026-07-04.md`；「📋待辦」已完成項改指向下方MASTER表，去除同檔重複
- `commit.md` 新增 **P0.7.1**：便攜塊體積預算≤4,000 bytes，決策條目>20條時強制輪轉（治本，防止本次瘦身效果如CLAUDE.md舊聲稱般自然腐化回胖）

### [FIX] 過時數據與潛藏 bug
- `CLAUDE.md`：修正「hook快照~300 tokens」嚴重失真聲稱（實測膨脹至10倍以上）
- 3支subagent frontmatter（code-reviewer/frontend-developer/ui-designer）修復重複 `version:` YAML key（後者靜默覆蓋前者）
- auto-memory：MEMORY.md索引去重（`project_cost_calculation_rules.md`原索引兩次）；清理5個孤兒/過時檔（2個已確認合併未刪的舊feedback檔、2個從未索引的孤兒記錄、1個誤存的V41時代過時handoff.md快照）；目錄總量56,849→41,308 bytes（−27%）

### [VERIFY] 零損失稽核
- fresh-context subagent 對抗核對：28條決策+驗證/待辦交叉檢查+6個刪除檔理由，**38/38 PASS，0 FAIL**
- guard fixtures 16/16 回歸 PASS（無回歸）；hooks 語法全過；SessionStart hook 實跑輸出正常

詳見完成記錄：[.fhs/reports/completion/2026-07-04_s141-context-slimming_completion_report.md](.fhs/reports/completion/2026-07-04_s141-context-slimming_completion_report.md)

---

## [2026-07-04] Session 140 — 稽核修復（矛盾/死洞/session log 痛點）v2 落地

**範圍**：`scripts/hooks/pre-tool-guard.js`、`scripts/hooks/post-tool-kgov.js`、`scripts/hooks/prompt-router.js`、`scripts/hooks/test/guard-fixtures.json`、`.claude/settings.json`、`.gitignore`、`.fhs/ai/AGENTS.md`、`.fhs/notes/SOP_NOW.md`、`.fhs/ai/governance/`（00/02/03）、`.fhs/ai/subagents/freehandsss/`（7檔）+ `~/.claude/agents/freehandsss/`（同步）

### [FEAT] Guard/kgov 補洞
- R2 新增 `sb_secret_`（Supabase 新版 secret key 格式）偵測 pattern，S139 只補了 sbp_/JWT
- 新增 **R10**：攔截 AI 自行建立 `.fhs/.deploy-ok` 授權旗標（Write/Edit 與 Bash/PowerShell 兩變體）
- 新增 **deploy 授權旁路**：`.fhs/.deploy-ok` 存在且 10 分鐘 TTL 內 → R1/R9 放行一次 current.html 覆蓋，消耗 flag 並落審計至 `.fhs/notes/deploy-log.md`——解決過去「Fat Mo 口頭批准後 AI 仍永遠被硬攔截」的死鎖
- 新增 **R11-observe**：shell 寫入指令命中財務關鍵字 → warn-only 記錄至 `.fhs/.kgov-observe.log`（觀察期方案，暫不攔截）
- `post-tool-kgov.js`：`MCP_HIT_TOOLS` 固定 Set 改後綴匹配，修復 Desktop App claude.ai connector（UUID 前綴工具名）與最常用的 `execute_sql` 財務改動路徑從未觸發 [G] 稽核的兩個盲區
- Fixtures：12→16 組，全數 PASS

### [FIX] 文件矛盾與漂移對齊
- `AGENTS.md` §1 生產版聲明 V41→V42（與實測 hash 一致）
- Mid-Session 脈衝條文加「任務結束交接」豁免，消除與 §3 交接強制的字面矛盾
- `SOP_NOW.md` 版本號類行改指向單一真源；subagent 數量 8→9；ag-* 三指令補 DEPRECATED 標記
- `database-reviewer.md`/`finance-auditor.md` installed→master 反向回灌（消除反向 drift）
- 3 支殘留 `model:` 釘選改浮動 alias `haiku`
- `.gitignore` 補 `logs/`；`prompt-router.js` 清除死引用 `/px-audit`，`ui-ux-pro-max` 改為 `reference:` 欄位（非 Skill-tool 註冊項）

### [FEAT] 行為層治本（session log 挖掘 61 次打斷後的具體修法）
- `ui-designer.md`/`frontend-developer.md` 新增「意圖複述閘」：排版任務動手前先複述理解
- `governance/03_judgment-rubrics.md` 追加 2 條反例：視覺修復禁純讀碼宣告完成、斷言外部工具能力前必驗證
- `governance/02_model-dispatch.md` §7 追加 2 條實戰修正錄：guard 新規則的中文說明文字可能誤觸自身 pattern、長任務應主動分段報告

詳見完成記錄：[.fhs/reports/completion/2026-07-04_s140-guard-kgov-governance-hardening_completion_report.md](.fhs/reports/completion/2026-07-04_s140-guard-kgov-governance-hardening_completion_report.md)

---

## [2026-07-04] Session 139 — Harness 治理硬化執行（八維度分析→v2實施）

**範圍**：`.claude/settings.json`、`~/.claude/settings.json`、`.claude/settings.local.json`、`.env`、`scripts/hooks/pre-tool-guard.js`、`scripts/hooks/prompt-router.js`、`scripts/hooks/test/`（新建）、`.fhs/memory/handoff.md`（輪轉）、`.fhs/ai/subagents/freehandsss/`（6檔）+ `~/.claude/agents/freehandsss/`（同步）、`.cursorrules`、`.agents/workflows/`（3檔）、`~/.gemini/antigravity/mcp_config.json`

### [FEAT] guard.js 補洞（P0-2診斷項全數關閉）
- R2 新增 `sbp_`（Supabase token）與 `eyJ`（JWT）硬編碼偵測 pattern
- 新增 R9：Bash/PowerShell 指令內容含 `current.html` + 寫入類指令（cp/mv/sed -i/tee/重定向/Set-Content/Copy-Item 等）→ 攔截，補齊 R1 只查 Write/Edit file_path 的缺口
- R8 擴充支援 PowerShell `Remove-Item -Recurse -Force`
- `settings.json` PreToolUse matcher：`Write|Edit|Bash` → `Write|Edit|MultiEdit|PowerShell|Bash|NotebookEdit`
- 新建 `scripts/hooks/test/`（guard-fixtures.json 12組 + run-fixtures.js）作為特徵化回歸測試基線，12/12 PASS

### [FIX] 權限與密鑰治理
- `defaultMode`：`bypassPermissions` → `default`（專案+全域雙檔，Fat Mo 裁決 A1），需重啟 session 生效
- `.env` 新增 `SUPABASE_ACCESS_TOKEN`（單一真源文件化）；`settings.local.json` 移除冗餘硬編碼 `N8N_KEY`（已驗證 dotenv 路徑不受影響）
- `.mcp.json` 本體暫緩改動（OS環境變數未設定，貿然改會打斷本session使用中的Supabase MCP連線，列待辦）

### [FIX] Subagent 調度層
- 6支 subagent（database-reviewer/finance-auditor/frontend-developer/tdd-guide/ui-designer/blender-3d-modeler）刪除 `model:` frontmatter 行改為繼承（Fat Mo 裁決 A3，過期問題永久消失，取代重複釘選新ID）
- 清理 `~/.claude/agents/freehandsss/` 誤入的 2 個非 subagent 檔案（cl-flow.md/execute.md）

### [FIX] Router 與多腦橋接
- `prompt-router.js`：`finance-calculator`→`finance-gatekeeper`（Skill可呼叫名對齊）；架構類 route 移至審查類之前（原「架構顧問+審查」誤判案例重測後正確命中 opus）
- `.cursorrules` 修正 stale 路徑（`docs/SOP_NOW.md`→`.fhs/notes/SOP_NOW.md`）+ 補休眠藍圖聲明
- `.agents/workflows/` 三支 DEPRECATED 指令（ag-flow/ag-stitch-sync/ag-ui-import）補標記，與 `.claude/commands/` 側對齊
- `~/.gemini/antigravity/mcp_config.json` 去 BOM

### [MAINT] handoff.md 首次輪轉
- 3949 → 106 行，去除開頭 BOM（修復 SessionStart hook 動態抽取失效問題），備份至 `.fhs/memory/archive/handoff-full-until-2026-07-04.md`

### [VERIFY] Airtable PAT scope 查證
- 安全探測（PATCH 不存在 record，非破壞性）確認 AG 手中 Airtable PAT 對 `Main_Orders` **無寫入 scope**（403 INVALID_PERMISSIONS），原診斷疑慮 F-AG1 實測未成立

**完整報告**：`.fhs/reports/completion/2026-07-04_harness-hardening-execute_completion_report.md`

## [2026-07-04] Session 138 — docs/CHANGELOG.md 重複檔案清理

**範圍**：`docs/CHANGELOG.md`（刪除）、`docs/repo-map.md`、`.fhs/ai/FHS_Product_Cost_Operations.md`、`.fhs/notes/decisions.md`

### [CLEANUP] 過時分岔複本刪除

- **背景**：S137 記憶系統審視時意外發現 `docs/CHANGELOG.md`（298行，Session 63 建立）與根目錄 `Changelog.md`（持續更新）長期並存，另開本 session 處理
- **判定**：`docs/CHANGELOG.md` 最後條目停在 S130 Phase B（2026-07-01），S131-S137 六個 session 完全缺漏；frontmatter `last_updated: 2026-06-05` 比自己內文的 S130 條目還舊。確認為過時分岔複本，非獨立用途摘要版
- **引用檢查**：`docs/repo-map.md`、`README.md` 均無引用（孤兒檔案）；唯一活引用為 `.fhs/ai/FHS_Product_Cost_Operations.md` Stage 4 計畫表（未執行草案），已改指向根目錄 `Changelog.md`
- **執行**：改動前備份至 `.fhs/reports/backups/`，經 Fat Mo 確認後 `git rm -f docs/CHANGELOG.md`；`docs/repo-map.md` 補上該檔案缺席的樹狀圖條目（標 `[已刪除]`）
- **副產品發現**：`docs/repo-map.md` 本身此前未把 `docs/CHANGELOG.md` 列入樹狀圖——地圖本身不完整，不只是缺跨連結
- **learnings**：Pitfall #25 補建（frontmatter last_updated 可能比內容本身還舊，判斷停更需比對實際內文最新日期）

## [2026-07-04] Session 137 — Governance 治理層建立（Fable 5 立制度）+ Obsidian D1 推翻

**範圍**：`.fhs/ai/governance/`（新建）、`CLAUDE.md`、`docs/FHS_Knowledge_Map.md`、`.fhs/notes/decisions.md`、`.fhs/memory/learnings.md`、`.fhs/memory/lessons/`（6檔）、`.obsidian/plugins/`、`docs/repo-map.md`、`README.md`

### [FEAT] Governance 治理層新建（`.fhs/ai/governance/00-06`，7 檔）

- Fat Mo 明確要求「唯一一次用 Fable 5 的機會，把判斷力轉成弱模型可沿用制度」，交付：01 harness 診斷（token洩漏/失焦/出錯前三名）、02 模型調度守則（指揮官不下場+派工三件套+升降級規則+驗證不自驗）、03 判斷力 rubric（六組，附 FHS 史正反例）、04 派工模板×5、05 維護協議（權限矩陣+輪轉SOP）、06 給未來 session 的信
- fresh-context opus 對抗審查 PASS-with-fixes（2 中級 findings 已修正）
- `CLAUDE.md` 重寫為路由層（原檔備份於 `.fhs/ai/governance/backups/`）

### [ARCHITECTURE] Obsidian D1（2026-06-01 Session 51）技術限制推翻

- 原判定「`.fhs/` 為 dot-directory，Obsidian 永遠不可見」經 pilot 實測推翻：外掛 `hidden-folders-access` 白名單 `.fhs` 後，FileExplorer/Graph/metadata cache 正常索引，含大檔（handoff.md 3,918行）與多檔資料夾（lessons/ 70檔）皆無效能問題
- D2（三層記憶職責邊界：Notion 人類真相源/AI 唯一寫入 `.fhs/memory`/Obsidian 視覺層不參與衝突解析）**維持不變**，僅解除 D1 技術限制認定
- 補建 `[[wikilink]]`：`docs/FHS_Knowledge_Map.md`、governance 7 檔互連、`decisions.md` S51+新增D4條目、`learnings.md`↔`lessons/` 5 條配對（44條因證據不足寧缺勿配）
- 驗證：Graph View `path:.fhs` 篩選由「4 孤立點」變為「約12節點密集互連」

### [SYNC] 完成記錄 + repo-map + README

- `.fhs/reports/completion/2026-07-04_governance-layer-and-memory-system-audit_completion_report.md`
- `docs/repo-map.md` 加入 governance/ 目錄結構；`README.md` 資料夾結構表補一行

## [2026-07-04] Session 136 — IG 看門狗 Telegram 深連結 URL 修復

**範圍**：`scripts/ig-watchdog/build_n8n_workflow.cjs`、n8n workflow `FHS_IGWatchdog_DriveWatch`（D4LK6VrQbiXlju0V）

### [FIX] Telegram 深連結 URL 錯誤（Phase B NAS 實機確認後續發現）

- **症狀**：Telegram 深連結驗收待辦標示「需等實際 notify>0 觸發才能測」；唯讀診斷發現即使觸發，連結也會失敗（HTTP 401）
- **根因**：`Classify & Report` Code 節點硬編碼 `https://yanhei.synology.me:5006/web/Freehandsss_dashboard_current.html?view=igwatch&orderId=...`，port 5006 + `/web/` 路徑非對外實際服務網址（curl 實測 401）；正式公開網址為 `https://yanhei.synology.me/Freehandsss_dashboard_current.html`（curl 實測 200，同 S136 Fat Mo 實機驗收網址）
- **修復**：`build_n8n_workflow.cjs` 單一真源改正網址常數；GET→Python 字串替換→PUT 外科手術部署至正式 workflow（body 僅含 name/nodes/connections/settings 四欄）；versionId `683ed8e5`→`05740bb4`，active=True
- **驗證**：GET 回傳確認壞網址出現次數 0、正確網址 1；9 個帶 credential 節點（7 Google Drive + 2 Telegram）完整保留；curl 對修正後網址（含 `?view=igwatch&orderId=` 參數）實測 HTTP 200
- **前端**：deep-link 解析邏輯（`freehandsss_dashboardV42.html` L7810-7815）本身無誤，問題僅在 n8n 端組出的網址錯誤

## [2026-07-04] Session 134 — AGENTS.md v1.5.0：Desktop App 平台收斂 Phase 4（計劃完結）

**範圍**：`AGENTS.md`、`docs/FHS_Prompts.md`、`.fhs/ai/commands/{ag-flow,ag-stitch-sync,ag-ui-import,cl-flow}.md`、`.claude/commands/{ag-flow,ag-stitch-sync,ag-ui-import}.md`

### [CONSTITUTION] AGENTS.md v1.4.13 → v1.5.0：新增 §1.2 平台定位與多工具共存治理

- **Desktop App 主介面**：Code 分頁+Cowork 雙模式，實機探針 P1-P5 全通過，遷移成本趨近零
- **三模式決策卡**（`.fhs/notes/FHS_Mode_Card.md`）+ 單一寫者矩陣正式引用進憲法層
- **CLI/VSCode**：永久 fallback（非過渡）
- **Antigravity**：永久共存備援（無除役時間表，2026-07-03 決策）、入場條件、緊急寫入事後覆核義務
- **Cursor**：休眠藍圖（未安裝、C1 探針前置）
- **n8n 三腦**：休眠藍圖——與 `/cl-flow` 對照後確認不對等（`/cl-flow` 更優：裁決免費、直接落 repo、全套 hook 治理），workflow 保留停用

### [DEPRECATED] 指令族裁決

- `/ag-flow`：改用 `/cl-flow`（同等能力且免費）；AG 裁決需求請直開 Antigravity
- `/ag-stitch-sync` `/ag-ui-import`：`ui-designer` subagent 已原生擁有 `mcp__magic__21st_magic_component_builder`，不需 Antigravity 橋接
- `ag-plan.md`（A2 規格源）不受影響

### [SYNC] FHS_Prompts.md v1.7 → v1.8

- `compatible_with` 對齊 AGENTS v1.5.0；情境二十四（/ag-flow）加棄用標註改指 `/cl-flow`

**里程碑**：至此 Claude Desktop App 平台收斂計劃（Flow ID 2026-07-03-0014，執行依據 `cl-final-plan-v2.md` v2.3）Phase 0-4 全數完成。Phase 5（Antigravity 存檔）維持可選、永不強制。

## [2026-07-03] Session 134 — n8n 三腦介接規格交付（Phase 3.1）

**範圍**：`.fhs/reports/planning/fhs_n8n_3brain_spec.md`（新增，規劃文件，不涉業務代碼）

### [PLANNING] A1 GPT / A2 Gemini / A3 Claude 三腦 n8n workflow 規格

- 節點圖、檔案契約（`artifacts/{flow_id}/` 五檔案+狀態機）、寫入所有權規則、四項歷史地雷（Cloudflare/S121/S129/S127）、System Prompt 範例、成本表、Fat Mo 駁接檢查清單
- **誠實揭露**：Anthropic/OpenAI API 是否受 Cloudflare 指紋封鎖尚未實測（P10-B/C 待補），規格內建最小驗證步驟供駁接前先確認，不假設安全
- 設計原則：A3（Claude API）在此管道中只產草案，真正裁決仍在 Desktop Code 分頁——防止 API 端自審
- 定位：與現有 `scripts/cl-flow-runner.js`（2 腦版）互不排斥，依「電腦前」vs「手機外出」情境選用

## [2026-07-03] Session 134 — Claude Desktop App 平台收斂 Phase 0-2

**範圍**：AI 工作流平台收斂（不涉業務代碼）— `.claude/skills/`, `.fhs/notes/FHS_Mode_Card.md`, `.fhs/reports/planning/`, `claude_desktop_config.json`

### [WORKFLOW] Claude Desktop App 收斂為主介面，Antigravity 轉永久備援

- **定性**：收斂（加入 Desktop App 為主介面），非遷移/除役——Antigravity 與 Desktop App 技術上完全共存，無除役時間表
- **Phase 0**：11 項實機探針（P1–P8, P11 已測）——Code 分頁 5/5 hooks/commands/MCP/subagent/auto-memory 全通過，與 VSCode ext 完全等同；Cowork 需每 session 授權資料夾、不繼承 `.mcp.json`（需 remote connector）
- **Phase 1**：`.env` 補 OPENAI_API_KEY/ANTHROPIC_API_KEY；claude.ai Supabase remote connector 授權（Cowork+手機雙享）；`claude_desktop_config.json` 新建（n8n-mcp-server）
- **Phase 2**：Skills 收斂——22 支 `.gemini/skills` 複製至 `.claude/skills/`（原目錄凍結為 AG 快照）；`.fhs/ai/skills` 4 支橋接（finance-calculator 因 DEPRECATED、ui-ux-pro-max 因非 Skill 格式，均不橋接）；產出 `fhs_cowork_governance.md` + `FHS_Mode_Card.md`（單一寫者矩陣：治理/財務/生產檔僅 hook 守護側可寫）
- **Cursor**：條件式輕整合設計已備（v2.3），C1 探針確認未安裝/近期不用 → 整項擱置，休眠藍圖保留
- **影響使用方式**：新增 Skill 工具清單（26 支）；三模式決策卡為日後開工判斷依據；README/repo-map 已同步

## [2026-07-02] 🐛 Session 133 — IG 看門狗 tg2 invalid syntax 根因修復

**範圍**：`scripts/ig-watchdog/build_n8n_workflow.cjs`，n8n workflow `D4LK6VrQbiXlju0V`（versionId=683ed8e5）

### [FIX] tg2 Telegram `invalid syntax` — 複雜 JS 移出 expression evaluator

- **根因**：n8n expression evaluator（tmpl）不支援複雜 JS 鏈式語法（`.filter().map().join()`）→ 每次 Exec 4038/4046/4061/4062 全部 error；S129 的 emoji→ASCII 修法治標未治本
- **修復 1（expression 簡化）**：深連結邏輯從 tg2 Text 欄位移至 `Classify & Report` Code 節點，輸出 `telegramText` 欄位；tg2 改用 `={{ $('Classify & Report').first().json.telegramText }}` 簡單引用
- **修復 2（Write Alerts 容錯）**：Write Alerts 加 `continueOnFail: true`；防止 duplicate key（`ix_igwatch_alerts_dedup`）造成 workflow 中斷
- **驗證**：Exec #4065 手動 trigger success，Telegram 收到空摘要訊息（tg1 路線）；Write Alerts + tg2 error=none；Cron 已恢復 `0 6 * * *`
- **learnings**：Pitfall #28 補建（n8n expression evaluator 禁複雜 JS 鏈，必移 Code 節點）

---

## [2026-07-02] ✨ Session 132 — 概覽篩選 UI 四項優化

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`

### [FEAT] Task 1 — 手模擺設狀態篩選
- `#reviewStatus` 新增 `<optgroup label="── 手模擺設 ──">` 含 4 個選項（`hm_pending/hm_booked/hm_laser/hm_done`）
- `fetchGlobalReview`：`hm_*` 值不送 n8n URL，改為 client-side 篩選
- `applyReviewFilters()`：插入 hm_ 分支，以 `_getItemStatus()` 辨別 Category（擺設/木框/玻璃瓶）+ process_status 字串比對

### [FEAT] Task 2 — 重新載入後自動縮收篩選
- 重新載入按鈕 `onclick` 改為 `fhsRefreshAndCollapse()`
- `fhsRefreshAndCollapse()`：等待 `fetchGlobalReview` Promise resolve 後呼叫 `fhsCollapseFilter()`

### [FEAT] Task 3 — 全尺寸篩選摺疊 + localStorage 持久化
- `.filter-toggle-bar` 從 `display:none`（手機專用）改為 `display:flex`（全域常顯）
- `.filter-body` collapse CSS 移至全域（`max-height/overflow/transition`）
- localStorage `fhs_filter_open` 持久保存展開/收起狀態，下次載入自動還原
- `window.fhsCollapseFilter()` 暴露供外部呼叫

### [FEAT] Task 4 — 時限警示排序
- `#reviewSortSelect` 新增 `<option value="Deadline_asc">⏰ 時限警示 — 最緊迫優先</option>`
- `applyReviewFilters()` sort block 加入 `Deadline` case：按 `Appointment_Date` 升序，null 排末
- `updateAccSortStatus()` labels 加入 `Deadline:'時限警示'`

---

## [2026-07-02] 🐛 Session 131 — 簡化付款預設半訂按鈕狀態修正

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`

### [FIX] 簡化模式 auto-fill 後「全部半訂」按鈕未切換至「全部付清」
- **根因**：`_quickHalfFillAllSplits()` 在 `generate()` auto-fill 路徑（non-force）從不執行 `_depositMode = 'half'`；新訂單預設填入 $1190/$1190 但按鈕仍顯示「全部半訂」，操作語義不符
- **修復**：新增 `filledAny` flag 追蹤是否實際填了格；條件 `if (force)` → `if (force || (!window._fhsSplitRestoreSnapshot && filledAny))`
- **守衛**：`!window._fhsSplitRestoreSnapshot` 確保 S107 還原舊訂單時不誤觸（`_fhsSplitRestoreSnapshot != null` → 跳過 mode 更新）
- **修改位置**：`_quickHalfFillAllSplits()` L11607/L11620/L11627（+3 行）

---

## [2026-07-01] 🐛 Session 129 — IG 看門狗 tg2 emoji 亂碼修復

**範圍**：`scripts/ig-watchdog/build_n8n_workflow.cjs`，n8n workflow `D4LK6VrQbiXlju0V`（versionId=bb683165）

### [FIX] tg2 Telegram 訊息 emoji surrogate pair "invalid syntax"
- **根因**：Phase 3 深連結用 Python `json.dump(..., ensure_ascii=False)` 序列化含 🔗 emoji → CP950 環境生成 surrogate pair `\udcfx...`；n8n 求值 invalid syntax，Telegram 通知失敗（Exec 4038/4046 error）
- **修復**：`ensure_ascii=True` 強制 ASCII escape + 改用純文字 `>` 替代 🔗
- **新格式**：`> 0601234: https://.../current.html?view=igwatch&orderId=0601234`
- **learnings**：Pitfall #27 補建

---

## [2026-06-30] 🎨 Session 128 — Audit Ledger 財務視覺優化（成本扣減 inline badge + 品項明細重排版）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（CSS + JS），`.fhs/notes/FHS_System_Logic_Overview.md`

### [UX] ② 成本快照鏈：成本扣減 inline badge
- `n8nAdjItems` 保留結構化扣減陣列（含 `amount`/`desc`/`basis`）
- 各類別成本行旁顯示 **綠色 `(−$X)`**（`#2E9E5B`，節省語義，非成本紅色）
- 旁附小圓形 **ⓘ**（`fhsAudit_dedDot`），**點按才展開**解說含 `basis` 依據，預設收起
- 以關鍵字（手模/鎖匙扣/吊飾）將 n8n 扣減 note 對應到正確類別行；未對應者 fallback inline 顯示
- helper：`_dedBadge(keyword)` / `_costRow(label, costNum, keyword)` / `_consumedAdj` 防重複映射
- 頂部摘要卡「💰 成本扣減說明」維持總覽不變

### [UX] 品項明細重排版（4 項優化）
1. **分類色標頭**：P橙 `#FFF3E0/#E65100` / K藍 `#E3F2FD/#1565C0` / M紫 `#EDE7F6/#4527A0`（對齊 S126 簡化付款）
2. **固定次序**：手模擺設 → 鎖匙扣 → 頸鏈吊飾（對齊訂單總覽；組內按部位 rank 排序）
3. **左右手腳精簡標籤**：由 `item_key` 後綴 `_LH/_RH/_LF/_RF/_MAIN` 解析（`_limbName`）；非手模類附材質 hint（銀/金/鋼/鋁，`_matName`）
4. **刻字不顯示**：`[上排]LUCA` 等 `specification`/`engraving_text` 內容一律不顯示（非成本核對所需）
- 分類碼由 `item_key` 的 `_P_/_K_/_M_` 解析（`_catCode`），fallback `item_category` 關鍵字
- 新 CSS：`.fhsAudit_catHdr` / `.fhsAudit_matHint` / `.fhsAudit_itemFlat`
- 以訂單 0600721 真實 Supabase 資料 smoke test 驗證（node 渲染輸出 PASS）

---

## [2026-06-30] 🎨 Session 126 追加 — UX 細節修正（清除顏色、重疊Label、返回總覧按鈕）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（HTML + JS）

### [UX] ✕ 清除 按鈕改為淡紅色（已付訂金 + 未付尾數）
- 預設：`background:#FFEBEE; border:#EF9A9A; color:#C62828`（破壞性操作視覺語義）
- Hover：加深至 `#FFCDD2`

### [FIX] 簡化模式下「已付訂金」label 重疊問題
- `depositSectionLabel` 初始 `display:none`（簡化模式 grid 已有欄標題，label 冗餘）
- 切換到逐件模式 → label 顯示；切回簡化 → 隱藏
- `balanceLabelRow`（未付尾數標題列）同樣在簡化模式隱藏（上次 Issue 遺漏的完整修正）

### [UX] 手機底部「設定」按鈕改為「← 返回總覧」
- `switchMode('review')` 切換到訂單總覧
- 800ms 後定位至當前訂單列（`.order-row-cb[data-order-id]`）→ `scrollIntoView` + 黃色高亮 2 秒

---

## [2026-06-30] 🔧 Session 126 Issue 1+2 — 簡化模式 default + 全部半訂/付清同步修正

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（HTML + JS）

### [FIX] 簡化模式改為預設啟動（Issue 1）
- `window._fhsPaySimpMode = true`（原 false）
- HTML 初始狀態：`fhsPaySimp_view` visible，`depositSplitContainer`/`balanceSplitContainer` hidden
- `#fhsPaySimpToggle` 初始文字改「≡ 逐件」(藍 #1565C0)

### [FIX] 全部半訂/全部付清 與簡化視圖同步協調（Issue 2）
- 按鈕改為「動作語義」：按鈕顯示下次點擊將執行的操作（非當前狀態）
  - mode=`null`/`'full'` → 按鈕「全部半訂」(綠)；mode=`'half'` → 按鈕「全部付清」(藍)
- `_depositMode` 初始值改 `null`（原 `'half'`）
- `_quickHalfFillAllSplits` 自動填充（no force）不再設 `_depositMode` 也不觸發 `_syncGlobalDepositBtnUI`
  - 只有用戶手動點擊（`force=true`）才更新按鈕標籤
- 結果：載入訂單後按鈕永遠顯示「全部半訂」(綠)；點擊後正確填半價 → 按鈕切換為「全部付清」

---

## [2026-06-30] 🎨 Session 126 追加 — 簡化視圖 UX 優化（按鈕 + 排版）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（CSS + HTML + JS）

### [UX] 全部半訂/全部付清 合併為單一 toggle 按鈕
- 兩個獨立按鈕合併為 `#fhsDepositFillToggle` 單鍵切換，操作模式與 ⊞ 簡化/≡ 逐件 相同
- 半訂狀態：深灰 #37474F → 改綠 #388E3C（操作類視覺區分）；付清狀態：藍 #1565C0
- 新增 `_toggleDepositFillMode()` JS 函式；`_syncGlobalDepositBtnUI` 更新為單鍵邏輯
- ⊞ 簡化 按鈕推至右側（`margin-left:auto`），與操作類按鈕分組清晰

### [LAYOUT] 簡化視圖改為方案 A — 3 欄表格式
- `fhsPaySimp_grid` 改 `grid-template-columns: minmax(0,1.5fr) 1fr 1fr`
- catLabel 移至 col 1（同行排列），不再跨欄；標題行「已付訂金/未付尾數」永遠對齊 col 2/3
- 類別間加 `<hr class="fhsPaySimp_divider">` 分隔線
- input 加 `text-align:right`；移除 cellLabel/cellRow 包裝層

---

## [2026-06-30] 🔧 Session 126 追加 — 簡化付款 UI 三項修正

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（HTML + CSS + JS）

### [FIX] Fix 1 — 取消 ✏️ 編輯按鈕，改為直接點方格進入編輯
- 移除 6 個 `<button class="fhsPaySimp_editBtn">✏️</button>` HTML 元素
- 移除 `.fhsPaySimp_editBtn` CSS 規則；替換為 `.fhsPaySimp_input[readonly]:not([disabled]) { cursor: pointer; }`
- 6 個 `fhsPaySimp_input` 加 `onclick="_fhsSimpClickToEdit(this)"`
- 新增 `_fhsSimpClickToEdit(inp)` JS 函式（邏輯與原 `_fhsSimpEditToggle` 一致，但不需 btn 引數）

### [FIX] Fix 2 — 修正「已付訂金」/「未付尾數」標題與方格不對齊
- CSS grid 從 3 欄（`1fr 1fr 1fr`）改為 2 欄（`1fr 1fr`）
- 移除 header row 首格空白 `<div></div>` 佔位元素
- `.fhsPaySimp_catLabel` 已有 `grid-column: 1 / -1`，跨全寬，兩輸入框自然對齊兩欄標題

### [FIX] Fix 3 — 修復簡化模式下「清除」按鈕失效
- `_quickClearAllSplits(field)` 末尾加入：若 `_fhsPaySimpMode` 為 true，執行 `_fhsSimpCancelAlloc()` + `_fhsRefreshSimplifiedView()` 同步更新簡化檢視

---

## [2026-06-29] 🎨 Session 126 追加 — 付款 UI 標籤優化 + 鎖匙扣藍色

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（CSS 2 處 + HTML 2 處 + JS 2 處）

### [UX] 按鈕文字改為操作者語言
- `⊞ 三大類` → `⊞ 簡化`（切換到分類付款模式）
- `≡ 細分` → `≡ 逐件`（切換回逐件明細模式）
- confirm bar 警告文字「覆蓋現有細分」→「覆蓋現有逐件」

### [STYLE] 鎖匙扣（box-cat-K）配色改為藍色
- 原：`#ECEFF1` bg / `#37474F` 文字+邊框（灰）
- 改：`#E3F2FD` bg / `#1565C0` 文字+邊框（鋼藍）
- 同步更新 simpView catLabel K inline style

---

## [2026-06-29] 💬 Session 126 追加 — 三大類模式【付款資料】訊息格式

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（`_buildSplitIgLine` 單函式分支）
**流程**：`/cl-flow-fast`（flow 2026-06-29-2036）→ `/execute`

### [FEAT] IG 訊息【付款資料】跟隨三大類模式
- 三大類模式啟用時，Category A/B 訊息的付款行改為三類小計格式：
  - `pureNumeric=false`：`已付訂金：手模+配件$1190+鎖匙扣$1720+頸鏈吊飾$2980=$5890`
  - `pureNumeric=true`：`已付訂金：1190+1720+2980=$5890`
- 三類金額均為 0 時 fallback 回原逐件格式
- 細分模式（`_fhsPaySimpMode=false`）行為完全不變

---

## [2026-06-29] 🔢 Session 126 追加 — 三大類算式顯示（建議價組成）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（CSS + HTML + JS，純顯示層加法）
**流程**：`/cl-flow-fast`（flow 2026-06-29-1956）→ Option A 選定 → `/execute`

### [FEAT] 三大類類別標籤下顯示算式
- 每個類別標籤下新增灰色算式 sub-text（`fhsPaySimp_formula_P/K/M`）
- 算式顯示建議價組成：同值合併 `$860×4`，異值展開 `$2380+$860`，混合 `$860×2+$2380`
- 資料來源：`depositSplitContainer` 內 `.quick-half-btn[data-suggested]`（建議價，非已付值）
- 算式零值 box 自動過濾（data-suggested=0 不顯示）
- 長算式 `text-overflow: ellipsis` 防破版
- `_fhsRefreshSimplifiedView` 更新時同步刷新算式

---

## [2026-06-29] 💳 Session 126 — 付款 UI 簡化三大類模式（v2 唯讀鏡像 + 明示分攤）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（CSS + HTML + JS，純加法）
**流程**：`/cl-flow-fast`（flow 2026-06-28-2309）→ 八維度分析 v2 定案 → `/execute`

### [FEAT] 付款 UI 新增「⊞ 三大類」切換模式
- 「全部半訂」旁新增 **⊞ 三大類** / **≡ 細分** toggle 按鈕
- 切換後顯示三格×2（已付訂金/未付尾數）精簡輸入區，免逐部位（左手/右手/左腳/右腳）細分
- 三大類歸屬：① 手模擺設+配件（box-cat-P）② 鎖匙扣（box-cat-K）③ 頸鏈吊飾（box-cat-M）

### [DESIGN] v2 唯讀鏡像 + 明示式分攤（自我批評 3 弱點修正）
- **預設唯讀**：簡化框灰底只讀，顯示三類聚合現值（鏡像，非破壞）
- **明示編輯**：✏️ 按鈕解鎖該類，輸入後 inline 黃色確認條「⚠️ 將按整百比例重新分攤 N 件，覆蓋現有細分」→ 確認才分攤
- **聚焦守衛**：`_fhsRefreshSimplifiedView` 跳過 `document.activeElement`（防 auto 覆寫用戶輸入，S92 精神延伸）
- **無此類自動 disabled**：本單無該類 box → 對應格 disabled + 顯示「（無此類）」

### [ALGO] $100-unit 整百最大餘數分攤（`_fhsAllocateSimplified`）
- 先按 $100 單位依建議價比例 floor 分攤；餘額以 $100 步進補至最大小數部分 box；不足百剩餘補至同 box
- 零權重 fallback：等權整百分攤
- Σ 浮點修正守衛（`allocs[0] += diff`）
- **寫穿走 `dispatchEvent('input')`**→ 復用既有 `recalcSplitSum`/`serializeSplits`/deposit↔balance sync，序列化契約不變

### [COMPAT] 既有守衛全繼承
- `captureFormState`/`raw_form_state`/`#depositSplitData`/`#balanceSplitData` 零感知
- S92 isDefault 載入保護、S97 force、S101 restoreSplits、S107 `_fhsSplitRestoreSnapshot` 全繼承
- 新函式皆 `window.fn=fn` 暴露（P9 IIFE 規則）；`fhsPaySimp_input` 無 id/name/非 `.split-box-input`（防雙計）

### [VERIFY] Node smoke test 11/11 PASS
- T7 坐實：4件×$860，total=$1000 → [300,300,200,200]（整百且 Σ=1000）
- T2：混合權重 2380+4×860，$3000 → [1200,500,500,400,400] Σ=3000
- 零權重/單件/total=0/奇數尾差 全通

---

## [2026-06-26] 💰 Session 124 — Audit Ledger 財務呈現優化（三區塊分隔 + 品項可展開明細 + 數量誠實警示）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（CSS 1 處 + `buildAuditLedgerHtml` 5 處）、`.fhs/notes/FHS_System_Logic_Overview.md`（§九）
**流程**：`/cl-flow-fast`（flow 2026-06-25-1222）→ 路線① → `/upload-web` 升格部署

### [UI] 點1 — ①②③④ 區塊卡片化
- 四區塊各包入 `.fhsAudit_section`（圓角外框 + 色彩左邊條：①棕 ②橙 ③綠 ④灰 + 底色 + 間距），解決截圖中三區塊難以辨識問題

### [UI] 點2 — 品項成本小計可點按展開（降級版）
- 每筆品項成本小計改原生 `<details>/<summary>`，展開**只列真實存在欄位**（單件基礎成本/數量/>0 的繪圖打印環扣運費）
- 四欄全空時顯示「明細未記錄（n8n 未寫入）」，**禁止前端用 cost_configurations 自行重算拆解**（守成本單一真源）

### [UI] 點3 — 數量誠實警示（取代假乘法）
- `qty>1 && subtotal_cost == item_base_cost`（成本未隨件數累加）→ 紅色 `fhsAudit_qtyWarn`「疑漏算加購 N−1 件」
- **不顯示 `單件×數量=小計`**（DB 存值與真值皆非乘積，避免製造假數）

### [DATA] 點4 — Live 核實成本低估 bug（確認，待修）
- 截圖訂單 0600905/0600908「嬰兒鎖匙扣-不銹鋼-2飾(加購)×2」記 $185 **錯誤**，正解 ≈ $310（首件185 + 加購125）
- 全庫掃描：qty=2/3/4 多數仍只記 $185 = **n8n 成本計算未按件數累加**（歸 Task A，前端僅誠實揭露不回寫）
- 修復另開 `/cl-flow`（n8n + 歷史回填）

### [VERIFY] node 抽函式 smoke test
- mock 截圖訂單跑 `buildAuditLedgerHtml`：無語法錯 + 三卡片 + details 展開 + qty=2 觸發警示 + 空欄提示 + `<div>` 37/37 / `<details>` 2/2 平衡 = 全綠
- NAS 部署 current.html PASS：870,991 bytes，SHA256 `731CD79C29230DC8B716FDCFA67ABE6A21251FB2A09C3F2917382A623EF979C1`

---

## [2026-06-25] 📋 Session 124 — 綜合審計日誌 Phase A（audit_logs + Log Sheet 審計 tab）

**範圍**：`supabase/migrations/0044_audit_logs.sql`（新建）、`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（4 處編輯）

### [MIGRATION] 0044_audit_logs.sql（已部署 ✅）
- **audit_logs 表**：通用審計容器（id/created_at/log_type/action/actor/entity_type/entity_id/before_val/after_val/summary/source）
- **RLS**：anon SELECT only；anon 不可直接 INSERT（寫入只經 SECURITY DEFINER RPC）
- **索引**：`(log_type, created_at DESC)`、`(entity_id, created_at DESC)`、`(created_at DESC)`
- **RPC `fhs_query_audit_logs`**（6 params）：篩選查詢，GRANT EXECUTE TO anon, authenticated
- **`fhs_upsert_cost_config` 升級**（4-param overload）：在同一交易內 INSERT audit_logs（原子寫入，有改必有記錄）

### [HTML] freehandsss_dashboardV42.html
- **Edit 1**：Log Sheet tab bar 新增「📋 審計日誌」按鈕
- **Edit 2**：新增 `logTabAuditContent` div（篩選 UI：類別 / 訂號 / 日期範圍 + 查詢按鈕 + 結果列表）
- **Edit 3**：`saveSingleCostConfig` actor 改從 `localStorage.fhs_expense_operator` 讀取（取代硬編碼 'dashboard'）
- **Edit 4**：實作 Log Sheet 全部 JS（Session 69 遺留 HTML stub）：`switchLogTab`、`saveExpenseOperator`、`submitExpenseLog`、`loadExpenseLogs`、`loadAuditLogs`

### [PENDING] Phase B — 財務參數設定中心訂單層修改（下輪另批）
- 新 migration：`orders.cost_override_locked` + RPC `fhs_adjust_order_cost`
- 設定中心新增「指定訂號 → 訂單層成本修改」區塊
- Audit Ledger Modal：本單變更歷史（collapsible）

---

## [2026-06-25] 🐶 Session 122 — IG 看門狗 v3 Cron 驗收 PASS + Phase 1b 部署

**範圍**：`scripts/ig-watchdog/build_n8n_workflow.cjs`（wa1/tg2/alerts 加入 + Drive cred replace_all）、n8n workflow D4LK6VrQbiXlju0V（Phase 1b PUT，versionId=f881031c）

### [VERIFY] v3 Cron Exec 4012 PASS（2026-06-25 06:00 HKT）
- 16/16 nodes success；Fetch Orders 31筆；Classify & Report 送達 Telegram；23秒完成
- Phase 1b 決策門（S119 Q3）正式解鎖

### [FEAT] Phase 1b — n8n write node 部署（ig_watchdog_alerts POST）
- **wa1（Write Alerts）**：`Classify & Report` → HTTP POST → `ig_watchdog_alerts`（service_role key，Prefer: resolution=ignore-duplicates）；`alwaysOutputData=true`
- **tg2（Telegram Notify Data）**：wa1 後讀 `$('Classify & Report').first().json.summary` 送 Telegram
- **alerts array**：`Classify & Report` code 節點新增 alerts 構建（alert_date / order_id / kind / customer_name / snippet / thread / has_receipt / db_matched / raw）
- **Drive cred 修復**：build script 7 個 Google Drive 節點從 `credentials: {}` 改為真實 credential ID（replace_all）
- PUT HTTP 200；versionId=f881031c；19 節點；Drive cred 14/14；Telegram cred 4/4；undefined 0

---
## [2026-06-24] 🔧 Session 121 — IG 看門狗 v3 Supabase URL 修復（外科 GET→PUT）

**範圍**：`scripts/ig-watchdog/build_n8n_workflow.cjs`（.env loader 補建）、n8n workflow D4LK6VrQbiXlju0V（Supabase URL/key 外科 PUT 修復）

### [FIX] v3 Cron Exec 4009 根因診斷 + 外科修復
- **根因**：S117 build 時 `process.env.SUPABASE_URL/SUPABASE_ANON_KEY` 未從 `.env` 載入（未 dotenv），JS 字串拼接 `undefined + "/rest/v1/"` 得字面量 `"undefined/rest/v1/..."` 嵌入 workflow JSON
- **症狀**：Exec 4009（2026-06-24 06:00 HKT，v3 首次 Cron）35 秒後在 `Fetch Orders` 節點拋 `Invalid URL: undefined/rest/v1/...`；Telegram 未發出
- **外科手術**：GET 現有 workflow JSON → Python 替換 `undefined/rest/v1/` + `Bearer undefined` + apikey 空 key → 精簡 PUT body（`name/nodes/connections/settings` 四欄）→ PUT HTTP 200；versionId 更新至 `a2e6c8c7`；active=True；Drive cred 14/14 完整保留；undefined 殘留 = 0

### [FIX] build_n8n_workflow.cjs 補 .env loader
- 新增 6 行 .env 自載入邏輯（讀 `../../.env`，跳已設 env var），防未來 rebuild 再嵌 undefined

---
## [2026-06-23] 🔧 Session 120 — 鋁合金嬰兒層成本修正（Supabase live 修復）

**範圍**：Supabase `cost_configurations`（INSERT 1行）、`products`（UPDATE 40行）

### [FIX] 鋁合金嬰兒/大寶層 config key 補建 + products 錯值修正
- INSERT `material_cost_keychain_alloy` = $115（嬰兒/大寶，與 `material_cost_keychain_stainless` 同層對齊）
- UPDATE `嬰兒鎖匙扣 - 鋁合金` 所有飾數變體（20行）：$212 → **$185**（= 繪圖$60 + 物料$115 + 環扣$10）
- UPDATE `嬰兒(P)鎖匙扣 - 鋁合金` 所有飾數變體（20行）：$262 → **$245**（= 繪圖$120 + 物料$115 + 環扣$10）
- 診斷：原值 $212/$262 為 migration 0023 手填 flat 數字，反推物料 $142/$132 前後不一致；Fat Mo 確認應與不銹鋼同層（$115）
- Live 查詢確認：order_items 零鋁合金嬰兒訂單，無既有訂單需回改

---
## [2026-06-23] 🐶 Session 119 — IG 看門狗警報整合 Phase 1a+2（Supabase 持久化 + V42 igwatch 模式）

**範圍**：`supabase/migrations/0043_ig_watchdog_alerts.sql`（新增並已部署）、`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（igwatch 模式 10 項 HTML/JS 改動）、`docs/repo-map.md`（migration 0043 + V42 狀態更新）

### [FEAT] Supabase ig_watchdog_alerts 表（migration 0043）
- **新表** `public.ig_watchdog_alerts`：儲存 IG 看門狗 v3 每日警報（alert_date / order_id / kind / customer_name / snippet / thread / has_receipt / db_matched / raw / resolved 三欄）
- **冪等鍵**：expression UNIQUE INDEX `ix_igwatch_alerts_dedup (alert_date, thread, COALESCE(order_id,''), kind)`，允許 NULL order_id 參與唯一比對
- **RLS**：anon/authenticated 只讀 SELECT；無 anon INSERT policy（防偽造 alert）；service_role 預設 bypass（n8n 批量寫入用）
- **SECURITY DEFINER RPC** `fhs_resolve_ig_alert(uuid, boolean, text)`：V42 anon 前端唯一寫入點，只改 resolved/resolved_at/resolved_by 三欄，防橫向逾越
- **pg_cron TTL**：`delete-old-resolved-igwatch-alerts` 每日 03:00 UTC，清理已處理且 >90 天的警報（複用 S87 error_logs 模式）

### [FEAT] V42 igwatch 模式（IG 看門狗警報查看）
- **模式按鈕**：🐶 `modeIgWatchBtn`，整合至 mode switcher array + activeMap，符合 V42 現有 switchMode 模式管理
- **警報容器** `#igwatchModeContainer`：三 filter tab（未處理/已處理/全部）+ badge 計數器 + 狀態行 + 卡片列表
- **Lazy load**：`switchMode('igwatch')` 觸發 `setTimeout(loadIgWatchAlerts, 50)`，首次點擊才查 Supabase
- **kind-aware 動作**（v2 mapOrder pitfall 修正）：`created_incomplete` → `openOrderModal()`（訂單存在DB）；`not_created` → `_igwCopyOrderId()`（訂單**不**存在DB，禁用 openOrderModal 防靜默失敗）
- **resolve 回寫**：`_igwToggleResolve()` 呼叫 `sbRpc('fhs_resolve_ig_alert', ...)` + 樂觀更新，失敗 alert 不靜默吞
- **URL 深連結**：`?view=igwatch[&orderId=xxx]`，`window.onload` 解析自動切模式並觸發 `openOrderModal`（Phase 3 TG 訊息附連結用）
- **bottomBar 隱藏**：`igwatch` 模式正確隱藏 bottomBar/v40bbar（對齊 system/finance 模式行為）

### [BLOCKED] Phase 1b + Phase 3（依決策 Q3 延後）
- **Phase 1b**（n8n write node）：等待 2026-06-24 06:00 HKT v3 首次 Cron 驗收 PASS 後執行
- **Phase 3**（TG 深連結）：Phase 1b 完成後，在 `Classify & Report` node 加入 V42 URL 到 Telegram 訊息

---

## [2026-06-23] 🔧 Session 118 — handoff 交接機制 SSOT 化（v2 便攜塊 + 三漏洞修復）

**範圍**：`scripts/hooks/session-start-sop.sh`（v2 重寫）、`.fhs/memory/handoff.md`（頂部便攜塊新增 + 底部殭屍段 ARCHIVE）、`.fhs/notes/SOP_NOW.md`（版本格改指標）、`.fhs/ai/commands/commit.md`（P0.7 新增）、`.fhs/memory/learnings.md`（Pitfall #23）、`.fhs/notes/decisions.md`（Session 118 條目）

### [FIX] SessionStart Hook 三漏洞修復
- **漏洞 1（殭屍待辦）**：`session-start-sop.sh` 的 `awk '/^## 待辦/'` 匹配到 handoff.md line 3760 的 Session 63 前舊格式殭屍待辦（Anti-Idle Ping / pg_cron 等 Session 67/87 已完成項），真正「MASTER 持續待辦」用單 `#` 標題 hook 永遠讀不到。改以唯一 ` ```handoff ` fenced 塊動態段 awk 精確抽取，根治。
- **漏洞 2（SOP_NOW 版本過期）**：SOP_NOW.md 快照表仍寫 V41 production，實際 Session 115 升格 V42。改為版本指標（指向 handoff.md 便攜塊 + AGENTS.md），v2-C 版本收斂：版本字串只在一處維護。
- **漏洞 3（handoff 底部配置過期）**：底部 `## 待辦 ⏳ 項目` / `## 核心配置` 區塊仍顯示 V41 + 舊 versionId。已加 `[ARCHIVED 2026-06-23]` 標記並說明已由頂部便攜塊取代。

### [FEAT] v2 雙深度便攜塊（handoff.md 頂部）
- 新增 ` ```handoff ` fenced 塊，含六類不可省略欄位（目標/決策/驗證/待辦/下一步/地雷）
- `─── 便攜邊界` 分隔線實現雙深度切片：hook 只注入動態段（~120 tokens）；人類複製整塊（含靜態地雷，適合貼外部聊天）
- v2-A 過期偵測：hook 比對塊頭日期與今日，不符時印警告
- SSOT 原則：人類貼用版與 AI 自動注入版同源，結構上不可能 drift

### [FEAT] commit.md P0.7 防腐步驟
- 每次 `/commit` 強制更新便攜塊六類欄位 + 日期，解決 PX 3.3「沒人用」落地風險

## [2026-06-23] 🐶 Session 116 — IG 漏單看門狗 v3：訂號主鍵偵測（偵測模型反轉）

**範圍**：`scripts/ig-watchdog/lib/order-match.mjs`（新增）、`lib/order-match.test.mjs`（新增）、`lib/order-match.diffguard.test.mjs`（新增）、`scripts/ig-watchdog/build_n8n_workflow.cjs`（MODIFY）、`SOP.md`、`docs/repo-map.md`、`.env`（Gemini 模型）、`scripts/cl-flow-runner.js`（PX curl 修復）

### [FEAT] 偵測核心由「付款證據 🔴🟡⚪」反轉為「訂號比對：對話談成的訂單是否真的建進 Supabase」
- **核心反轉**：v1/v2 以客人付款證據為訊號、且**刻意排除商家自發的訂單確認**（Session 111 K 媽媽案）；v3 改以**訂單編號 order_id 為主鍵**，並**反轉納入商家發出的 V42 制式確認文本**（`Freehandsss 訂單確認(訂單編號# …)`）為主訊號
- **三分類**（Fat Mo 決策：情況 2 合併通知）：① V42制式+DB命中＝已建立(齊)靜默 ② 鬆散+DB命中＝資訊不齊→通知核對 ③ 有可信訂號+DB查無＝未建立→通知補單；另：弱訊號(成交語意無號)不即時警報、報價/草稿語意抑制
- **訂號 regex live 校準**（31 單真樣本）：實際格式＝leading-0 的 7–8 位數（`06xxxxx`/`05xxxxx`/`06001xxx`），非假設的 FHS- 前綴；錨定 `/(?<!\d)0\d{6,7}(?!\d)/` + 訂單上下文守衛，天然防撞 HK 電話（8 位起 2/3/5/6/9）/金額/日期
- **圖片收據佐證（方案 A）**：只標記 `hasReceipt` 存在性布林（DYI JSON photos metadata），**零下載零 OCR**，守媒體零下載 OOM 防護 + 隱私零外送紅線
- **單一真源 + diff-guard**：`build_n8n_workflow.cjs` build 時內嵌 `order-match.mjs` 原始碼（strip export，非手抄），`order-match.diffguard.test.mjs` 斷言 n8n 節點與 lib 逐字一致，根治雙處漂移
- **通知改雙側對照**：Telegram 文案訊息側 vs Supabase 側並列，Fat Mo 一眼判斷去 V42 補單
- **唯讀**：零寫業務表，不觸 captureFormState/raw_form_state/確收三欄/HTML ID；付款證據邏輯保留為 Phase 2（暫不計）
- **驗收**：單元測試 15/15 + diff-guard 1/1 PASS；6 情況功能模擬全部正確分類
- **⏳ 待部署**：n8n workflow（D4LK6VrQbiXlju0V）PUT 上線 + Google Drive credential 重掛 + 拋棄式副本端到端測試（Phase 3，待 Fat Mo 授權部署）

### [FIX] cl-flow-runner 雙 API 故障修復（附帶）
- **Gemini A2 過載**：`.env GEMINI_A2_MODEL_DEFAULT` `gemini-3.5-flash`→`gemini-2.5-flash`（不改代碼，Preference #6）
- **PX A1 socket hang up**：根因 Cloudflare 對 Node https/urllib 指紋 reset 只放行 curl；`callPerplexity` 改 curl 子程序，FULL 模式恢復

## [2026-06-20] 🔧 Session 112 — 鎖匙扣成本誤判事故根因排查 + 成本傳播 Phase 1 止血

**範圍**：`supabase/migrations/0042_drop_dead_recalc_and_cost_drift_check.sql`（新增並已部署）、`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（dev，showToast 擴充 + 存檔提示）、`docs/repo-map.md`、`.fhs/notes/FHS_System_Logic_Overview.md` §5.3/§5.4、`.fhs/ai/skills/finance-gatekeeper/SKILL.md`（v1.2.0→v1.3.0）

### [FIX] 訂單 06001008 鎖匙扣成本「185 vs 設定中心115」誤判 — 結論：185 本身正確，無需資料校正
- **觸發**：Fat Mo 將 `cost_configurations.material_cost_keychain_stainless` 改為 115，發現 `order_items.subtotal_cost` 仍顯示 185，懷疑成本未同步
- **根因查證**（live SQL + RPC 反編譯）：185 並非裸物料費，是組裝 base cost = 繪圖60（嬰兒S）+ 物料115（已是新值）+ 環扣10。誤判來自把「組裝結果」與「單一原子值」直接比對
- **真正發現的 bug**（次要但實質）：`cost_configurations` 變更**從無**自動回算 `products.total_base_cost` 的機制；本次數字剛好對純屬巧合（seed 本來就用 115 算的）。死碼 `recalculate_product_costs(text)` 引用 v1 schema 已不存在欄位，呼叫必報錯，從未真正工作過
- **附帶發現（獨立議題，未修復）**：`material_cost_keychain_alloy`（嬰兒層鋁合金物料原子）在 live `cost_configurations` 完全不存在 key，但對應 SKU（`嬰兒鎖匙扣 - 鋁合金`，base=212）確實在售，成本來源不明，待後續排查

### [FEAT] Phase 1 止血（v2 方案，刻意不蓋第二套成本組裝引擎，避免 recipe 脆弱風險）
- DROP 死碼 `recalculate_product_costs(text)`
- 新增唯讀 RPC `fhs_check_product_cost_drift()`：比對 `products.total_base_cost` 與 atom 組裝值，**範圍限定**僅嬰兒 S/P 不銹鋼鎖匙扣（40 SKU，已用 live 數據數學驗證公式，drift 全 0）；其餘 tier（家庭/成人/鋁合金/吊飾/立體擺設）公式未驗證，刻意不覆蓋
- V42 dev：`showToast()` 加可選 duration 參數（向後相容）；`fhs_upsert_cost_config` 存檔成功提示加註「products 表不會自動同步，請另行執行 drift 檢查」
- `Freehandsss_dashboard_current.html`（生產）**未改動**，依硬規則待另行授權升格

### [DOCS] 文件 drift 校正
- `FHS_System_Logic_Overview.md` §5.3 多個成本 key 記載值與 live 不符（`material_cost_keychain_stainless` 文件寫 $95 / live 115；`necklace_silver/gold` 文件寫 $260/$316 / live 均 465）已校正並補 §5.4 成本傳播鏈說明
- `finance-gatekeeper/SKILL.md` 路由表加 drift 檢查指引；§四補死碼移除記錄

### Phase 2（未排程）
- 成本組裝單一真源重構（收斂 `cost_configurations`/`products`/n8n 硬編碼 COST_MAP 三套並存表徵），另開 `/cl-flow`

## [2026-06-20] 🔧 Session 111 — IG 看門狗 v2 重建（修正 Session 110 v1 架構）+ cl-flow PX 靜默失敗修復

**範圍**：`scripts/ig-watchdog/build_n8n_workflow.cjs`（重寫）、`scripts/cl-flow-runner.js`（修復）、n8n workflow `FHS_IGWatchdog_DriveWatch`（重建，ID D4LK6VrQbiXlju0V）

### [FIX] IG 看門狗 v1 架構（Session 110）證偽，改建 v2
- **觸發**：Fat Mo 觀察「月走月壞」現象，要求先系統性了解 Meta DYI 運作模型再重估方案（`/cl-flow`，Flow ID 2026-06-20-0112）
- **v1 被推翻的兩個假設**：(1) Meta Drive 匯出是 ZIP——實測為**直接鏡射解壓後的資料夾樹**，無壓縮檔；(2) Google Drive Trigger 監測 root 可偵測新檔——實測**子資料夾內變動不觸發**，且每日新增的是「新資料夾」（instagram-*）非 root 下的「新檔案」，v1 從未在生產環境真正觸發過一次
- **Phase 0 實測（probe-then-delete，零殘留）**：確立 F1-F7 七項事實，詳見 `artifacts/2026-06-20-0112/cl-final-plan.md`。關鍵：Google Drive 節點原始 query 須 `searchMethod:'query'`+`queryString`（`filter.query` 會被靜默忽略）；`mimeType='application/json'` 排除媒體；`options.fields` 須陣列；無 parent 限定的全域 query 接多輸入節點下游會被「每輸入項執行一次」誤判為重複 bug（實為拓樸問題）；scoped 查詢零重複且 pairedItem 可靠，可逐層串接拿到 thread 名稱
- **v2 新架構**：Schedule Trigger（Cron 06:00 UTC）取代 Drive Trigger；移除 Is ZIP/Decompress；改「以每日匯出資料夾為工作單元 + scoped 逐層查詢」；新增 per-thread message timestamp cursor（`workflowStaticData`，非 Supabase migration）+ id 去重 + 90 分鐘靜止窗 + 健全計數器（掃描 thread/檔案數，讓異常數字能自我揭穿）
- **驗證**：拋棄式測試副本對真實資料端到端跑通，正確找到 1 個🟡候選並正確排除商家自填訊息誤判；7 個 Google Drive 節點 credential 已用已知 ID 透過 API 補回（修正前序「PUT 洗掉 credential 必須人工 UI 重指派」的判斷——ID 已知時可直接 API 補）
- **回滾**：n8n 停用/刪除 workflow 即可，零線上業務系統影響；零 Supabase migration、零業務表寫入

### [FIX] `scripts/cl-flow-runner.js` Perplexity 推理模型靜默回空白報告
- **根因**：`sonar-reasoning-pro` 推理模型在 `<think>` 階段消耗 `max_tokens`，舊值 `3072` 在複雜 prompt 下被吃光，導致 `message.content` 回空字串——HTTP 200 + `finish_reason:'stop'`，不拋錯，px-report.md 恆寫空白通過整條 Verdict 鏈
- **修復**：`max_tokens` 提高至 8000；resolve 前檢查空 content 視為失敗 throw，交 `withRetry` 重試
- **影響**：`/cl-flow`、`/ag-flow` 共用此函式皆受影響並已修復；`/cl-flow-fast --quick` 跳過 PX 不受影響

## [2026-06-19] 🆕 Session 110 — IG 漏單看門狗改全自動（方案C：全 NAS n8n 跑）

**範圍**：`scripts/ig-watchdog/`（刪 `server.mjs`，新增 `build_n8n_workflow.cjs`）、`SOP.md`、`scripts/README.md`、n8n workflow `FHS_IGWatchdog_DriveWatch`（新建）

### [FEAT] Session 108 看門狗由「人手匯出+本機常駐」升級為「IG 每日自動匯出+全 NAS 跑」
- **動機**：Fat Mo 要求「人手1鍵啟動後自動完成全程」。原規劃方案A（本機 server.mjs 常駐接收ZIP分析）已建好並端到端測試通過，但有「主機關機=分析暫停」的硬依賴
- **關鍵發現**：IG「下載你的資訊」支援目的地選 **Google Drive** + 頻率選 **每天**，使匯出本身變成零點擊全自動排程（非僅一鍵）；NAS n8n 實測 Execute Command/Code節點`require`/`fetch`/`process.env`被鎖，但 **Code 節點 `Buffer` 可用** + **Compression 節點可解壓 ZIP**（皆透過建臨時 webhook probe workflow 實測驗證，測完即刪）→ 證實可將 decoder.mjs/match.mjs 邏輯完整移植進 n8n Code 節點，無需任何本機常駐組件
- **新架構**：Google Drive Trigger（監測root，fileCreated）→ IF 過濾.zip → Download File → Compression 解壓 → Code「Parse Inbox」（mojibake解碼+thread分組，移植自decoder.mjs）→ HTTP Request×2查Supabase orders/sales_pipeline（anon key唯讀）→ Code「Classify & Report」（Levenshtein模糊比對+🔴🟡⚪分級，移植自match.mjs）→ Telegram Notify
- **踩坑記錄**：(1) NAS用`filesystem-v2`二進位儲存模式，Code節點讀binary不能用`.data`(base64)，需`await this.helpers.getBinaryDataBuffer(itemIndex,key)`；(2) HTTP Request節點對空陣列回應預設0 items會導致下游節點被跳過（n8n預設0輸入=不執行)，需設`alwaysOutputData:true`
- **驗證**：用既有19/19測試通過的fixtures，透過臨時webhook probe workflow跑完整鏈（Decompress→Parse→Fetch×2→Classify），結果🔴2🟡2與分類邏輯正確，測試完即刪除probe workflow
- **棄用清理**：刪`scripts/ig-watchdog/server.mjs`（方案A本機常駐伺服器）；移除已不需要的Windows防火牆8731埠規則（待Fat Mo以管理員權限移除，本工具無權限自動執行）
- **已知限制**：(1) 別名字典`ig_name_map.json`機制（v2 W1）未移植到NAS版，僅本機`index.mjs`保留；(2) 本機版`index.mjs`與NAS版Code節點邏輯重複維護於兩處，改規則需雙邊同步——已記錄於`build_n8n_workflow.cjs`頂部註解與SOP.md
- **回滾**：n8n停用/刪除`FHS_IGWatchdog_DriveWatch` workflow即可，零線上業務系統影響

## [2026-06-17] 🆕 Session 108 — IG 漏單看門狗（本地唯讀，DYI 路線）

**範圍**：`scripts/ig-watchdog/`（新增）、`.gitignore`（+3 行）、`docs/repo-map.md`、`scripts/README.md`

### [FEAT] IG 漏單看門狗 — 偵測「IG 有單但 Supabase 無紀錄」
- **背景**：IG Graph API `instagram_manage_messages` Advanced Access 需 Meta 商業驗證（BR/網站/業務帳單），FHS 三者皆無 → 即時 API 路線封死（前置 flow 2026-06-16-2012 已 cancelled）。改用 Meta 原生「下載你的資訊」(DYI) 匯出，唯一合法免驗證途徑（人工觸發、非即時）
- **架構**：100% 本地、唯讀外掛。解析 DYI inbox JSON → 與 Supabase `orders`+`sales_pipeline` 唯讀比對 → HTML 報告。**零寫入** Supabase/Airtable，不觸 captureFormState/raw_form_state/確收三欄
- **核心**：(1) `decoder.mjs` Meta mojibake 解碼（latin1→utf8 + U+FFFD 品質守衛）；(2) `match.mjs` CJK fuzzy（Levenshtein+子串，棄已停維護的 string-similarity）+ DM 訂金對 `orders.deposit`（非 total）+ orders∪pipeline 命中=非漏單；(3) v2 三機制：別名字典 `ig_name_map.json`、🔴🟡⚪ 訊號分層、覆蓋帳本 `coverage.json`
- **隱私**：客人 DM 與報告只存 `.fhs-local/ig-watchdog/`（.gitignore 封鎖）+ pre-commit hook 二級守衛（擋含 sender_name/participants 的 JSON）
- **驗收**：單元測試 19/19 PASS（decoder 7 + match 12）；離線 selftest 全鏈 PASS（5 thread → 🔴1/🟡1/matched1/pipeline1/skip1，mojibake 零亂碼）；git status 確認零私隱檔追蹤
- **技術選型**：純 JS (.mjs，零 build/零 runtime 依賴) + 精簡 hybrid（index + lib/decoder + lib/match）
- **規劃鏈**：`artifacts/2026-06-16-2330/cl-final-plan.md`（CONDITIONAL_READY，6 修正 C1-C6 全內化）
- **回滾**：刪 `scripts/ig-watchdog/` + `.fhs-local/` + 撤銷 .gitignore 相關行，秒級復原，零線上影響

## [2026-06-16] 🔧 Session 109 — 核對帳單 bottom-sheet 路由修復（選項 B）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（3 處：line 9385–9387 / 9467 / 14184）

### [FIX] 核對帳單功能鍵未跳轉「💰 財務」分頁
- **症狀**：手機 bottom-sheet 點「核對帳單」→ Modal 開啟但停在「📝 訊息文本」預設分頁，財務(Audit Ledger)分頁未啟動
- **根因**：`openOrderModal(orderId, catFilter)` 第二參數是 catFilter（'A'/'B'/undefined），非 tab 選擇器。Session 103 加捷徑時誤傳 `openOrderModal(orderId, 'finance')` → 'finance' 被當 catFilter（落 else=全訂單），分頁 active class 寫死在 text，且無任何 `switchModalTab('finance')` 呼叫 → 捷徑從未真正生效
- **修法（選項 B）**：`openOrderModal` 加第三參數 `initialTab`（line 9387）；DOM 同步 `innerHTML` 建好後 `if (initialTab && typeof switchModalTab==='function') switchModalTab(initialTab)`（line 9467）；btnAudit 改 `openOrderModal(orderId, '', 'finance')`（line 14184，catFilter 空=全訂單）
- **回歸**：11 個既有呼叫點未帶第三參數 → initialTab=undefined → 行為不變（grep 坐實零回歸）
- **驗收**：靜態 grep PASS；live 手機 bsSheet 互動 + NAS 重部署待 Fat Mo

## [2026-06-16] 🔧 Session 107 — split 還原快照隔離（0600900 全付重載錯顯修復）

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（6 處）

### [FIX] 付款拆分還原鏈污染根治（方案 A 快照隔離）
- **症狀**：訂單 0600900 按「全部付清」+同步後，DB 正確（deposit=2380, balance=0, raw_form_state.depositSplitData=`{"TEMP_P_MAIN##":2380}`），但重載 UI 錯顯 deposit=1190(半額)/balance=2380。Supabase live 查證確認**寫入鏈正常，純還原鏈 bug**
- **根因**：`restoreFormState` 多次 `generate()` 中，`generate()`(line 6398) 無條件呼 `_quickHalfFillAllSplits('deposit')`，把空 box 填半額並 `serializeSplits` 污染 hidden 欄；`renderPaymentSplits` prevData 優先讀污染的 box 值使存檔值被忽略（P33 時序升級版）；+80ms `restoreSplits` 讀已污染 hidden 欄 → 渲染錯值。Session 101 的 `innerHTML=''` 修復對此場景無效（未攔 hidden 欄污染）
- **修復**：新增 `window._fhsSplitRestoreSnapshot`，在任何 generate() 污染前快照存檔 split JSON 為**權威來源**，`renderPaymentSplits` 還原期以快照凌駕被污染的 box/hidden 欄；`restoreSplits` 以 `_fhsPaymentSyncing=true` 壓制 cross-field sync + finally 例外安全清快照；快照四點清除（還原起點/catch/restoreSplits finally/resetForm）
- **驗收**：code-reviewer G1–G8（G2 catch 清快照採納；G1/G4 經複核為誤報——終局 restoreSplits 權威、不呼 auto-fill）；live 視覺待 Fat Mo
- line 6486 / 6516 / 6632 / 10855 / 11160 / 11263–11270 / 4951

## [2026-06-16] 🔧 Session 107 — 成本設定 UI 修復 + 不銹鋼嬰兒物料新增

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（line 13638–13648）、Supabase `cost_configurations`

### [DATA] Supabase — 新增 material_cost_keychain_stainless（嬰兒/大寶）
- **根因**：cost_configurations 只有成人版不銹鋼（_adult），嬰兒/大寶版缺失，定價引擎 fallback 到 hardcoded 95
- **修復**：INSERT `material_cost_keychain_stainless`，display_name `鎖匙扣 - 不銹鋼物料（嬰兒/大寶）`，HKD 95，display_group `material_jewelry`
- **效果**：C. 飾品物料 從 7 → 8 條，UI 可直接調整嬰兒不銹鋼成本

### [UX] A. 繪圖成本 group header — 與 B/C/D/E/MISC 一致（可摺疊 + 預設摺疊）
- ⚠️ **反轉本 session 稍早決定**：稍早曾將 `drawing`（A 繪圖成本）特殊化為「永遠展開、不可收摺」（移除 onclick/cursor/chevron）。Fat Mo 回報此為 bug——A 區與其餘區塊行為不一致（缺摺疊 toggle）且預設展開。
- **根因**：`var isFirst = gKey === 'drawing'` 對 A 區條件式移除 onclick toggle、cursor:pointer、chevron，且 body 預設 `display:block`
- **修復**：移除 `isFirst` 特殊化，所有區塊統一（onclick toggle + chevron + cursor + body 預設 `display:none`）；onclick 字串與 B/C/D/E 既有實作完全一致
- line 13638–13648

### [DEPLOY] NAS 部署
- ⏳ **待重新部署**：原 SHA256 BE1CC03…（836,887 bytes）為「A 永遠展開」舊版，已因本次反轉失效；需 Fat Mo 視覺驗收後重新 /upload-web

## [2026-06-16] 🔧 Session 106 — P0 sysCheckN8n 雙軌修復

**範圍**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html`（line 7657–7684）

### [FIX] sysCheckN8n — 消除每次連線檢查消耗 Airtable quota
- **根因**：`sysCheckN8n()` ping `fetch-global-review?year=2099&month=01` 觸發 n8n `FHS_Query_GlobalReview` workflow → Airtable +2 calls/次；官方 6/16 實測 591/1000，按日均 37 calls 預測月底 ~1,109（超限）
- **修復**：改為雙軌 ping：`/healthz`（n8n 原生健康檢查，0 AT）+ Supabase `/rest/v1/`（0 AT）；`Promise.all` 並行，badge 三態（正常/部分/異常）
- **效果**：sysCheckN8n AT calls 從 +2/次 → 0；MCP 稽核確認 0 實際 AT 呼叫（近 10 session）

## [2026-06-15] 🔧 Session 104 — /upload-web 升格流程 v1.1.0

**範圍**：`.fhs/ai/commands/upload-web.md`（Master）、`.claude/commands/upload-web.md`、`.agents/workflows/upload-web.md`

### [FEAT] /upload-web 無參數升格流程（動態版本偵測）
- **變更**：`/upload-web`（無參數）預設行為從「上傳 V42 dev」改為「升格流程」
- **動態偵測**：自動掃描 `Freehandsss_Dashboard/` 找最高版本號 `freehandsss_dashboardV*.html`（PowerShell `Sort-Object`；Bash `sort -V | tail -1`）
- **流程**：偵測 → 二次確認 → cp → current → upload current（帶 `-Force`）
- **版本無關**：V43、V44 等日後新版本自動跟上，無需手動改指令
- **橋接版同步**：CL + AG 橋接版簡化流程均已更新
- **版本**：v1.0.0 → v1.1.0

## [2026-06-13] 🔧 Session 103 — Audit Ledger ② 成本快照修復（v2）

**範圍**：`freehandsss_dashboardV42.html` 2 函式修改（loadAuditLedger + buildAuditLedgerHtml）

### [FIX] ② 成本快照鏈 — 從四欄分解改為訂單層類別結構
- **根因**：Session 102 ② 區用 `drawing/printing/chain/shipping_cost` 四欄加總；79 item 中 72 個（91%）四欄全空（Task A 未完成），導致大多數訂單顯示 $0 或殘缺成本
- **修復**：改以 `orders.handmodel_cost / keychain_cost / necklace_cost`（30/30 populated）為主結構
- **Problem E 誠實呈現**：多件鎖匙扣/吊飾訂單 catSum > total_cost（運費共享扣減只套進 total_cost 未從類別欄扣）→ 新增「類別小計」→「(−$20) 運費共享扣減」→「n8n 總成本」三行對賬顯示
- **舊單待補錄**：item 層 subtotal_cost 全空時顯示藍色 `📋 舊訂單，品項分類明細待補錄` 信息條，非紅旗；有值時展示品項 subtotal 明細
- **fetch 升級**：orders fetch 加選 `handmodel_cost,keychain_cost,necklace_cost`；items fetch 加選 `subtotal_cost`
- **costMatch 修正**：移除基於四欄 vs total_cost 的假紅旗；保留確收鏈 + 利潤驗算兩個真實核查

### [STYLE] CSS
- 新增 `.fhsAudit_pendingNote`：藍色系 info 條，區分「待補錄」與真錯誤

## [2026-06-13] ✨ Session 102 — 訂單計算核對帳（Audit Ledger）

**範圍**：V42 `freehandsss_dashboardV42.html` 6 處修改；2 份治理文件更新

### [FEAT] 💰 財務 Tab — 完整計算核對帳（Audit Ledger）
- **替換**：舊 8 行簡單摘要 → 完整 4 區塊會計帳
- **① 確收鏈**：訂金+尾款+附加費=確收金額 ✓/✗ 逐行顯示，差額紅字標示
- **② 成本快照鏈**：每張訂單的每件品項展開 `drawing_cost / printing_cost / chain_cost / shipping_cost`（直讀 DB 四分量，不重演 G2/G3）
- **③ 利潤結算**：確收 − 成本 = 淨利潤（雙底線會計格式），KPI 口徑（淨利潤 − adjustment）
- **④ 建議售價對照**（弱化灰色）：`item_sale_price` per item，與確收偏差百分比
- **結論摘要卡**：綠色「✓ 核對通過」/ 紅色「✗ N 項偏差」，數據品質燈號
- **規則 ID 標籤**：每行附 `[G1]` `[G2]` 等藍色 badge

### [FEAT] 架構 — Lazy-load 模式（對齊 Mode 2 pattern）
- `switchModalTab('finance')` → 首次點擊觸發 `loadAuditLedger()`
- 雙路 Supabase fetch：`orders?n8n_adjustment_notes` + `order_items?...drawing_cost,...,item_sale_price`
- flag `_fhsAuditLoaded` 防重複載入，`openOrderModal` 重置

### [FEAT] 視覺系統（ui-designer Phase A, Session 102）
- 新增 CSS `fhsAudit_*` 命名空間（53 行 CSS 隔離，不污染全域）
- 金額：`tabular-nums monospace` 右對齊；負數括號 `(−$xx)` 紅 #E63946
- 三色語義：入帳棕 #B07D4C / 成本紅 #E63946 / 利潤橄欖綠 #558B2F
- 小計單線 / 總計雙線 / 利潤四點雙線（`border-bottom: 4px double #333`）
- 手機 `@media ≤767px`：字號縮減，禁點線引導，利潤大字 22→18px

### [DOCS] 治理文件
- `decisions.md`：新增 Session 102 設計決策記錄
- `FHS_System_Logic_Overview.md`：新增 kgov 同步點（n8n/RPC 變動時檢查 `buildAuditLedgerHtml`）

## [2026-06-13] 🔧 Session 101 — restoreSplits 容器清空修復 + 9 單校正核實

### [FIX] restoreSplits() — 載入舊訂單後 deposit/balance 顯示 $790 而非存檔值
- **根因**：`renderPaymentSplits` prevData 邏輯給既有 box 值最高優先，`#depositSplitData` 存檔值被 `if(prevData[k]===undefined)` 條件攔截忽略
- **修復**：`restoreSplits()` 在 render 前加 `depCont.innerHTML=''` / `balCont.innerHTML=''` 清空容器，確保 prevData 為空，存檔值 ($500/$0) 正確生效
- **影響**：僅 `restoreFormState` 80ms setTimeout 呼叫路徑，正常 generate() 定價路徑不受影響

### [DATA] 9 單歷史資料校正 — 核實已無需執行
- Session 89 n8n 修復後，9 單 final_sale_price 已於後續 sync 自動回正，Supabase live 查詢 drift=0，UPDATE 無需執行

## [2026-06-12] 🟢 Session 100 — 知識治理執行層落地（B1+B2+C2+D hooks）

**範圍**：12 項文件/制度/hooks 改動；AGENTS.md v1.4.12→v1.4.13

### [FEAT] B1 強制讀取注入
- `database-reviewer.md` v2.1.0→v2.2.0：啟動前置加 Step 4（§十按需讀取）
- `finance-auditor.md` v2.1.0→v2.2.0：啟動前置加 Step 3（§十按需讀取）
- `finance-gatekeeper/SKILL.md` v1.1.0→v1.2.0：路由表加 KPI/混合單/get_financial_* → §十
- `FHS_Finance_Bible.md` v1.1.0→v1.2.0：§十強制讀取清單加 §十指針

### [FEAT] B2 後效稽核深度優化
- `execute.md`（Master + Bridge）：新增 [G] 運算邏輯變動稽核觸發（supabase migration / n8n / calculatePricing / cost_configurations）；補強 [A] 物理特徵判定；[D] 宣告格式改 A/B/C/G
- `AGENTS.md` v1.4.13：Rule 3.16 任務型路由加 §十 RPC KPI 條目

### [FEAT] C2 Lessons 索引化
- `.fhs/memory/lessons/INDEX.md`：新建（59 個 lesson 一行式索引，強制新增規則）
- `.fhs/memory/README.md`：加 INDEX.md 唯一檢索入口指針

### [FEAT] D 知識自動捕捉 hooks
- `scripts/hooks/post-tool-kgov.js`：PostToolUse hook，命中 migration/財務欄位 → flag + [G] 提醒注入
- `scripts/hooks/stop-kgov.js`：Stop hook，session 結束守衛（HARD_BLOCK=false 第一階段）
- `.claude/settings.json`：PostToolUse + Stop hooks 註冊

- Subagent：❌ 純文件/制度改動，無需 subagent

---

## [2026-06-12] 🟢 Session 99 — Migration 0041 F4+F3 財務口徑完全對齊

**範圍**：supabase/migrations/0041_fix_unconfirmed_doublecount_and_trend_3layer.sql（新增）

### [FIX] F4 — unconfirmed 訂單 previous 期雙計修復
- 根因：`get_financial_kpis` previous 期 WHERE 含 `OR confirmed_at IS NULL`，unconfirmed 單同時計入 current 與 previous
- 修法：previous 期 WHERE 移除該條件，unconfirmed 單只計入 current
- 驗收：yearly/current previous 期消除 1 張 unconfirmed 單（-$5,680）；monthly previous 少 1 張

### [FIX] F3 — trend 圖 3-layer 口徑對齊（category 模式修正高估）
- 根因：`get_financial_charts` trend 用整筆 `final_sale_price`，混合單在 category='metal' 模式高估
- 修法：trend block 重構為 per-order eff_rev（先算 3-layer，再 GROUP BY 月份）
- 驗收：metal 趨勢各月值調低（混合單由全額 → 比例份額），與 KPI 口徑一致

- Subagent：❌ 未用

---

## [2026-06-12] 🟢 Session 99 — Migration 0040 Metal 混合單 3-layer + Charts 守衛

**範圍**：supabase/migrations/0040_fix_metal_3layer_and_charts_guards.sql（新增）

### [FIX] F1 — Metal 混合單收入缺漏修復（+$56,321.90）
- 根因：`get_financial_kpis` category='metal' WHERE 含 `AND o.handmodel_cost = 0`，19 張混合單被排除
- 修法：current/previous 兩期移除守衛；eff_rev 加 metal 3-layer 分支（Layer 1 item_sale_price / Layer 2 成本比例 / Layer 3 平均分）
- 驗收：yearly_metal.revenue $21,860 → $78,181.90（+$56,321.90）；orders 7 → 25

### [FIX] F2 — get_financial_charts 全面補 deleted_at IS NULL 守衛
- 根因：0036 只修 kpis qty 子查詢，charts 5 個查詢塊從未補守衛
- 修法：trend / category_revenue / handmodel_frame / handmodel_bottle / cost_breakdown 各補 `AND deleted_at IS NULL`

### [ENHANCE] data_quality 擴充 metal fallback 追蹤
- 新增 `metal_fallback_orders` + `metal_fallback_ids`，追蹤 metal Layer 2/3 使用率（yearly = 16 張）

### [PERF] F8 — 補回 STABLE 修飾詞
- 0038 重建時遺失 STABLE，0040 補回

- Subagent：❌ 未用（Supabase MCP apply_migration + execute_sql，主 context 完成）

---

## [2026-06-12] 🟢 Session 98 — 0038 migration 本地 SQL 補建

**範圍**：supabase/migrations/0038_update_rpc_item_sale_price_3layer.sql（新增）

### [INFRA] 0038 migration 本地 SQL 逆向重建
- 根因：migration 0038 當初直接 apply via Supabase MCP，未留本地 .sql 檔
- 方式：`list_migrations` 確認名稱 → `information_schema.routines` + `pg_proc` 取得 live 函數定義與簽名
- 內容：`get_financial_kpis` + `get_financial_charts` 兩函數完整定義（SECURITY DEFINER）
- 核心邏輯：3-layer fallback（item_sale_price → 成本比例 → 平均分）+ data_quality 混合單清單
- Subagent：❌ 未用（Supabase MCP 直查，主 context 建檔）

---

## [2026-06-12] 🟢 Session 96 — Split 守衛 $0 誤攔修復 + 0600103 同步確認

**範圍**：Freehandsss_Dashboard/freehandsss_dashboardV42.html（3 處 JS 改動）

### [FIX] syncToAirtable() split 守衛誤攔合法 $0 balance
- 根因：Session 93 守衛條件 `parseFloat(v) === 0` 把全付訂金場景（balance=$0）視為未填
- 修正：syncToAirtable() 主守衛 + deposit/balance input 清紅框條件各移除 `|| parseFloat(...) === 0`
- 行為：守衛只攔空格與 NaN；$0 為合法值，全付訂金單可正常同步

### [DATA] 0600103 raw_form_state 確認同步
- Supabase live 查詢確認 deposit=$600、raw_form_state depositSplitData=$600 完全一致
- Fat Mo 已手動載入→改 split→同步，兩端對齊，待辦正式關閉

---

## [2026-06-12] 🟢 Session 95 — 立體擺設款式切換 babyFillMode 殘留修復

**範圍**：Freehandsss_Dashboard/freehandsss_dashboardV42.html（1 處 JS 改動）

### [FIX] 玻璃瓶 → 木框切換後介面殘留玻璃瓶狀態
- 根因：`_applyGlassDefaults()` early-return 未重置 `babyFillMode`，
  切回木框後 `babyRestoreVisual()` 仍讀 `'glass_pending'`，嬰兒介面停留「全部待定」
- 修正：early-return 改為 if/else；else 分支加 `babyFillMode = 'all'; babyRestoreVisual();`
- 行為：木框 ↔ 玻璃瓶雙向切換現均正確還原各自預設介面

**授權**：Fat Mo /execute（/rp 精煉 + grep 坐實根因）

---

## [2026-06-12] 🟢 Session 94 — Split Box 互斥歸零邊界 + 全格按入清空

**範圍**：Freehandsss_Dashboard/freehandsss_dashboardV42.html（6 處 JS 改動）

### [FEAT] 互斥歸零邊界守衛（4 處 guard）
- 根因：用戶點入被歸0的格並輸入值後，另一方仍會再次觸發歸零，形成死鎖
- 修正：`_syncBalanceFromDeposit` items + necklace loop 加 `!isStandard && isDefault!=='true' → skip`
- 修正：`_syncDepositFromBalance` items + necklace loop 加 `isDefault!=='true' → skip`
- 行為：互斥歸零只對 `isDefault='true'`（尚未手動觸碰）的格有效；標準 sync 不受影響

### [UX] 全格按入清空（覆蓋 Session 93 Q1-A）
- 移除 deposit + balance focusin handler 的 `isDefault==='true'` 條件
- 所有 split-box-input 點入後無條件清空，方便操作者直接輸入新金額

**code-reviewer**：G1–G8 ALL PASS（8/8）；W1 待辦：balance focusout 補回邏輯缺失（非阻擋）

---

## [2026-06-12] 🟢 Session 93 — Split Box UX 小優化：Balance focusin + Sync Guard

**範圍**：Freehandsss_Dashboard/freehandsss_dashboardV42.html（3 處 JS 改動）

### [FIX] Balance split box focusin 缺失補建
- 根因：`balanceSplitContainer` 完全缺少 focusin 事件委派（deposit 已有，balance 無）
- 修正：新增 `_balCont.addEventListener('focusin', ...)` 鏡像 deposit 邏輯
- 行為：點入 `data-is-default='true'` 的預設格 → 立即清空，非預設格不動
- 使用 `_balanceMode='manual'`、`_syncGlobalBalanceBtnUI`、`_updateBoxBtnState`

### [FEAT] syncToAirtable() 前置 split 驗證守衛
- 新增驗證：`syncToAirtable()` 執行前遍歷 deposit + balance 所有 `.split-box-input`
- 任一格空/0/NaN → block 提交 + 紅框 `outline:2px solid #e63946` + inline `#_splitValidErr` 提示
- 全部有效才繼續同步流程

### [UX] 紅框自動清除 on valid input
- deposit/balance input listener：isTrusted 有效值輸入 → 清 outline
- 全部格均有效時自動隱藏 `#_splitValidErr` 錯誤提示

**code-reviewer**：G1–G8 ALL PASS（8/8）

---

## [2026-06-11] 🟠 Session 92 — V42 支付互斥歸零 + 品類切換顯示修正 + _quickHalfFillAllSplits 載入保護

**範圍**：Freehandsss_Dashboard/freehandsss_dashboardV42.html（6 處 JS 修改）+ Supabase SQL patch（0600103）

### [NEW] 支付分欄互斥歸零（非標準金額自動清零）
- 已付訂金或未付尾數輸入「非半訂、非全付」金額 → 另一方自動歸 0（灰色）
- 標準金額定義：`0`、`Math.ceil(calcPrice/2)`、`calcPrice`（per split box）
- `_syncBalanceFromDeposit()` 加 isStandard 判斷；新增 `_syncDepositFromBalance()` 雙向互斥
- `_fhsPaymentSyncing` guard 防循環；`recalcSplitSum` 雙向觸發

### [FIX] generate() else 分支補 output-preview-a.value 清空
- 根因：`enableP=false` 時 else 分支只 hide `preview-box-a`，未清 `output-preview-a.value`
- IG 訊息 modal（`_igpmRefresh`）讀到殘留舊手模文字，用戶體感 bug 未修
- 修正：else 分支補 `document.getElementById("output-preview-a").value = ""`

### [FIX] _quickHalfFillAllSplits 載入現有訂單保護
- 根因：定價引擎每次執行後無條件 auto-fill deposit 為半訂值，覆寫已載入訂單的存值
- 導致：用戶按同步 → n8n 讀 auto-fill 值 → Supabase 被覆寫（0600103 $500→$790 復原案例）
- 修正：加 skip guard `inp.value !== '' && inp.value !== '0' && inp.dataset.isDefault !== 'true'`
- 同步修正：`_addBox` oninput 補 `this.dataset.isDefault='false'`（手動輸入標記）

### [DATA PATCH] Supabase 0600103 財務欄位直接修正
- deposit=$500, balance=$0, final_sale_price=$500, net_profit=$265, item_sale_price=$500
- 原因：品類切換後曾為純鎖匙扣訂單，舊手模值 $1580/$790/$790 需人工校正

## [2026-06-11] 🔴 Session 90/91 — item_sale_price 3-layer 混合訂單收入精確分攤

**範圍**：Supabase migrations 0037+0038、n8n Mirror Prep、V42 HTML Finance tab

### [CRITICAL FIX] B1 手模收入虛高根治 — get_financial_kpis item_sale_price 3-layer fallback
- **根因**：混合訂單（手模 + 鎖匙扣）的整張 `final_sale_price` 被全額歸入手模收入，無按品項分攤
- **修正**：引入 `order_items.item_sale_price` 精確分帳欄位，RPC 3-layer fallback：
  - Layer 1：`item_sale_price`（balanceSplitData + depositSplitData 合計）
  - Layer 2：`final_sale_price × handmodel_cost / total_cost`（成本比例）
  - Layer 3：`final_sale_price / item_count`（平均分保底）
- **結果**：hm_revenue $77,906 → $29,812；kc_revenue 正確歸入 metal 分類 ✅
- Migration 0037（欄位 + 補填）+ 0038（RPC）smoke test PASS

### [NEW] n8n Mirror Prep — inline item_sale_price 解析 + sum validation
- 每次入帳即從 `balanceSplitData` + `depositSplitData` 解析 `item_sale_price`
- Sum validation：分帳總和與 `final_sale_price` 誤差 > $1 時 NULL（啟用 fallback）

### [NEW] V42 Finance tab — data_quality 橙色警示
- `foUpdateKPI()` 末段讀取 `FO_LIVE_DATA.data_quality.avg_split_orders`
- 17 張歷史混合訂單（pre-V42，無 balanceSplitData）缺精確分帳時顯示橙色 ⚠️ 警示 + 訂單 ID 列表

## [2026-06-11] 🟠 Session 89+ — B1 手模利潤比例分攤 + B6 手倒數量修復（migration 0035）

**範圍**：Supabase RPC 修改（無 Dashboard HTML / n8n 改動）

### [HIGH FIX] B6 手倒數量 — get_financial_kpis handmodel_qty
- `oi.item_key ILIKE '%木框%/%玻璃瓶%'` → `oi.product_sku ILIKE '%木框%/%玻璃瓶%'`
- item_key 格式 `{order_id}_{suffix}`，品名在 product_sku，原條件永遠不命中
- 結果：frame 3→11，bottle 0→4（yearly 2026）✅

### [HIGH FIX] B1 手模利潤 — get_financial_charts category_revenue 比例分攤
- 原：混合單整筆 `net_profit` 歸 `handmodel_cost > 0`（虛高 ~12×，$82,266）
- 新：`net_profit × item_cost / NULLIF(total_cost, 0)`（成本比例分攤）
- 同步修正 handmodel_frame/bottle：`SUM(final_sale_price)` → 比例分攤 + product_sku
- 結果：hm_profit $82,266→$24,349；kc_profit ~$0→$39,043 ✅
- migration 0035，smoke test PASS

## [2026-06-11] 🔴 Session 89 — B7 收款確收守護修復（n8n Mirror Prep）

**範圍**：n8n workflow 節點修改（無 Dashboard HTML 改動）

### [CRITICAL FIX] B7 收款確收守護 — final_sale_price 覆蓋問題根治

- **根因**：`Supabase Mirror Prep` 節點以 `Total_Revenue`（系統建議售價）寫入 `final_sale_price`，違反收款確收守護（AGENTS Rule 3 財務真理守護）
- **修復**：`final_sale_price = Deposit + Balance + Additional_Fee`（確收金額）
- **同步修正**：`net_profit = _confirmedRevenue - Total_Cost`（消除 `Final_Profit` 舊計算殘留）
- n8n Workflow `6Ljih0hSKr9RpYNm`，versionId `b91ef4f9`
- 備份：`.fhs/notes/aireports/n8n-mcp-backups/2026-06-11/6Ljih0hSKr9RpYNm/Supabase_Mirror_Prep.json`
- 影響 9 單歷史資料校正 SQL 已備妥，待 Fat Mo 授權執行

## [2026-06-11] 🚚 Session 88 — Delivery Reminder 上線 + 逾期舊單清理

**範圍**：n8n workflow 匯入、Supabase 資料更新（無 Dashboard HTML 改動）

### [INFRA] FHS_DeliveryReminder_DailyPush workflow 上線
- 透過 n8n REST API 直接匯入 `n8n/templates/fhs_delivery_reminder_push.json`
- Workflow ID: `0nSXy6fqo8EL1ABm`，已 Activate（每日 HKT 09:00 推送交貨期警報）
- Telegram credential `tSbXz97PKmdPpDNq` 自動對應，無需手動設定

### [DATA] 逾期舊單 process_status 修正
- 8 張逾期單（Gaeac/Akira/森蝶/Kathleen/KaLeiChan/DebbieHo/PrinceCheng/Angel）還原為 `製作中`
- Fat Mo 將自行逐一更新實際狀態

## [2026-06-11] 🔧 Session 86 — 系統維護：submodule 修正 + 記憶整合 + 基礎建設驗證

**範圍**：基礎建設維護（無 Dashboard HTML 改動，無 n8n 改動）

### [INFRA] perplexity-mcp-server submodule 修正
- 補建 `.gitmodules`（從未 commit，歷史缺口）
- submodule pointer 更新 `e27817b` → `762c9ac`（Hono API fix：`c.res.headers.set` → `c.header`）

### [MEMORY] learnings.md TD2 整合
- 74 條 → 50 條，退役 24 條（已入 AGENTS.md 硬規則的、Obsidian 工具特定、純 meta）
- 合併 4 個重複 Patterns 標題、2 個重複 Pitfalls 標題
- 新增獨立「財務核心」分類（5 條）

### [MEMORY] handoff.md MASTER 待辦機制
- 頂部新增「📋 MASTER 持續待辦」活文件區塊，解決 append-only 積壓漏洞
- 查核並核實 Session 84/85 已完成項目

### [PROCESS] commit.md P0.6 新增
- 新增「MASTER 待辦同步」強制步驟，根治每次 commit 後待辦不更新問題

### [VERIFY] Airtable 背景同步 ✅ PASS
- 最近 10 次 execution 全 success；`Create Main Order` / `Create Sub Items` 無 continueOnFail，6 月 API 額度重置無影響

### [VERIFY] pg_cron TTL ✅ 早已存在
- job `delete-old-error-logs`：`0 3 * * *`，DELETE 30d+ records，active=true

---

## [2026-06-11] 🚀 Session 85 — V42 升格生產 + 刻字寫入驗證閉環

**範圍**：`Freehandsss_dashboard_current.html`（V42 升格為生產版），NAS WebDAV 部署

### [DEPLOY] V42 → current 生產升格
- `freehandsss_dashboardV42.html` (769K) 覆蓋 `Freehandsss_dashboard_current.html`
- NAS Web Station 部署：SHA256 `3E5F8A47A619DF84AEA6DDFC9A7A805786EB141B2D25C2241ABE4A4B0D6C20B5`，三關驗證 PASS
- 公開端點：`https://yanhei.synology.me/Freehandsss_dashboard_current.html`

### [VERIFY] 鎖匙扣刻字寫入閉環確認
- 新單 test01 `test01_K_LH.engraving_text = "[上排]AB [下排]1234"` MCP 直查生產 DB 確認
- n8n Mirror Prep → sync_order_to_mirror RPC → engraving_text 完整落地

---

## [2026-06-10] 🎨 Session 84 — 訂單總覽成本/入帳細項：toggle 收摺 + 逐行對齊 + 配色一致

**範圍**：`freehandsss_dashboardV42.html`（成本/入帳/利潤欄渲染，僅 dev 基線；current 未動）

### [UX] 方案B — 成本細項改回 toggle-gated + 舊版風格
- `_pgcCostListDirect` 容器 `.cost-fin-col`→`.audit-fin-col`（沿用 `fhs-audit-on` toggle，與「🔍 顯示項目財務」聯動），span `.cost-fin-item`→`.audit-sku-profit`（舊版深藍粗體）
- 移除退役 `.cost-fin-col`/`.cost-fin-item` CSS
- 🐛 溜洞修復：分類標籤 `'銀飾'`→`'純銀頸鏈吊飾'`（原條件永不命中，頸鏈吊飾被錯標「配件」）

### [REFACTOR] 方案甲 D1-a — 拆 rowspan，財務細項逐行對齊產品明細
- 入帳/成本/利潤 從 `orderLeftColsHtml` 的 rowspan 合併格釋放，改為 forEach 內逐項 `<td>`（`_finCells`），與右側產品行同 `<tr>` 對齊
- `orderLeftColsHtml` 縮為 4 rowspan 欄（checkbox/單號/日期/客戶）；訂單總額移至 index===0 列上方
- `_pgcItems` 來源 `o.items`→`_renderItemsFinal`（對齊產品行同一陣列）
- ID 保留：`cost-cell`/`cost-val`/`profit-cell-${o.id}` 遷至 index===0 格 + 單行 fallback 格（live 成本回寫不斷）
- 廢棄堆疊字串 `_pgcCostListDirect`/`_pgcPriceList`/`_directCostItems`
- 欄數平衡（12 欄）；交貨期 `_dlvBadgeHtml`/dlvStatsCard 零波及

### [POLISH] 逐項配色與欄位語義一致
- 入帳逐項→棕 `#B07D4C`、成本逐項→紅 `#E63946`（inline override，weight 600 區分層級）；利潤逐項沿用 `_itPC`（正綠負紅）
- 未動全域 `.audit-sku-price`/`.audit-sku-profit` → line 8481 既有審計清單配色不受影響

### [FIX] toggleAuditMode 首按無反應（default 狀態連按 race）
- 根因：`fhs-audit-on` class 藏在 `preloadSuggestedPrices().then(_doRender)` 內，首按 map 空時要等 `sbFetch('products')` 網路往返才加 class → 視覺「沒反應」；不耐煩連按造成 class 與按鈕文字反相
- 修復：class **同步立即加**（成本/利潤逐項用 `item.Cost` 直算不需 SKU map，秒顯）；`preloadSuggestedPrices` 降為背景補入帳價，回來再 re-render（`.then` 內守衛 `fhsShowItemFinancials` 仍為 true 才 re-render，消除 race）；preload 失敗於其 catch 自處理，不卡 toggle

### [FIX] 單項訂單 入帳→進度 欄上方空白（方案甲回歸）
- 根因：方案甲把財務改 per-row `vertical-align:middle`；單項訂單列被左欄 rowspan 內容（刪除鈕+detail+dlv badge）撐高，middle 對齊使「入帳→進度」整段浮於垂直中央 → 上方留白
- 修復：入帳/成本/利潤 + 刻字/產品/批次/狀態 7 個 per-row `<td>` 一律 `vertical-align:middle`→`top`（財務/批次/狀態加 `padding-top:15px` 對齊左欄基線）；財務與產品同 top 對齊 → 方案甲逐行對齊維持
- fallback「無子項目」格保留 middle（空狀態無影響）

### [FIX] 鎖匙扣/吊飾刻字失效根治（engraving_text 持久化）
- 根因（git 考古 + Supabase REST 直查 + n8n 三層讀碼）：新單主寫入走 n8n `sync_order_to_mirror` RPC，該 RPC（0012→0028）order_items **從未含 engraving_text 欄** → 全 NULL；立體擺設靠 mapOrder 的 raw_form_state.pEngraving fallback 顯示，鎖匙扣/吊飾無 fallback → 失效。前端 sbSyncOrder（會寫 engraving_text）僅 webhook 失敗時 fallback。n8n Mirror Prep 更把刻字（item.Notes）誤塞 specification、無 engraving_text 欄。
- 修法 B（2 層）：
  - **n8n Supabase Mirror Prep**（已部署 + 自動備份）：items.map 補 `engraving_text`，category-gated（金屬鎖匙扣/純銀頸鏈吊飾取 item.Notes；手模走 raw_form_state.pEngraving 故排除）
  - **Supabase migration 0034**：`sync_order_to_mirror` 於 order_items INSERT/VALUES/ON CONFLICT 三處補 engraving_text（範本 0017 `NULLIF`；ON CONFLICT 用 COALESCE 防 null-wipe）⏳ 待 Fat Mo 執行
- 既有 test01/02（engraving_text 已 NULL）需 re-save 觸發 n8n 重寫回填

### [UX] 刻字再收窄至 70px + 還原立體擺設 TOP
- 刻字 th/td `min-width:88→70px`、td padding `8px 4px→8px 3px`
- engHtml 移除上一版的 `_tblIs立體` 分流，立體擺設刻字**還原** TOP badge（與 keychain/necklace 同 TOP/BOT 統一結構，`.review-eng-container` nowrap）
- 取捨：立體擺設長刻字（nowrap）會把該 cell 撐寬 > 70px，收窄僅對短刻字生效

### [UX] 批次/進度方框統一 + 僅單號/日期保留排序
- 任務1 方框統一：status select `width:90%`→`width:100%;max-width:92px`（對齊 batch input 92px）；進度欄 th `min-width:140→100px`（對齊批次欄）→ 兩方框等大
- 任務2 排序收斂：移除 客人/入帳/成本/利潤 4 個 th 的 `sort-th`/`data-sort`/`onclick`/`sort-arrow`（保留標題+style）；僅 單號(Order_ID) + 日期(Date) 保留排序；`sortReviewTable()` 函式不動

### [FIX] saveInlineEdit「準備同步...」徽章卡住不消失
- 根因：`setInd("⏳ 準備同步...")` 設在 `save-indicator-${recordId}-${itemIndex}`（含 index），但 `updateEntry` 未帶 `ItemIndex` → debounce timer 的 `e.ItemIndex` 永遠 undefined → 「同步中/✔已儲存/清除」全打在 `save-indicator-${recordId}`（order 級錯元素），item 級徽章永不清除
- 修復：`updateEntry` 補 `ItemIndex: itemIndex`（三處 indicator 查找命中正確 item 級元素）
- 附帶修：queue dedup 由不存在的 `Item_Record_ID` 改為 `_item_key + _field`（防同單多欄位/多項編輯互相覆蓋導致徽章殘留）

### [UX] 刻字再收窄 + 立體擺設刻字移 TOP + 批次顯示完整
- 任務1 刻字 th/td `min-width:110→88px`、td padding `8px 6px→8px 4px`
- 任務2 立體擺設刻字：`engHtml` 以 `_tblIs立體` 分流——只顯刻字文字（無 TOP label）、`white-space:normal`+`flex-wrap:wrap` 允許換行（解收窄↔長文字張力）；keychain/necklace TOP/BOT 維持 nowrap 同行
- 任務3 批次：cell `min-width:90→100px`、input `width:80%→100%`/`max-width:80→92px`（「第N批」完整顯示）

### [UX] 訂單總覽欄寬調整：單號不換行 + 刻字收窄 + TOP/BOT 同行
- 任務1 單號：`.review-jump-pill` 加 `white-space:nowrap`（"06001008 ➜" 不再內部換行）+ 單號 th `min-width:90px`→`110px`
- 任務2 刻字收窄：刻字 th `min-width:160px`→`110px`；刻字 td `min-width:140px`→`110px`、`padding:10px`→`8px 6px`
- 任務3 TOP/BOT 同行：`.review-eng-container` `flex-wrap:wrap`→`nowrap`、gap `10px`→`6px`（TOP 與 BOT badge 不再上下堆疊）
- 三項相連平衡：單號 +20px ↔ 刻字 −30~50px；nowrap eng-container 確保收窄後 TOP/BOT 仍同行

### [UX] 移除進度欄表頭排序
- 進度欄 `<th>`（line 3182）移除 `class="sort-th"`/`data-sort="Status"`/`onclick="sortReviewTable('Status')"`/`<span class="sort-arrow">`，保留 🚥 進度 文字 + style
- 其他欄（單號/日期/客人/入帳/成本/利潤）排序與 `sortReviewTable()` 函式不變；status 下拉不受影響

### [FIX] index>0 列孤兒虛線移除
- index>0 財務列的 `.audit-fin-col` 虛線分隔（上方無總額卻有線）以 inline `border-top:0;margin-top:0;padding-top:0` 覆蓋移除；index===0（總額列）虛線保留
- scoped 到 _finCells（`${index === 0 ? '' : ...}`），未動全域 `.audit-fin-col` CSS（保護其他用途）

> ⚠️ live 視覺對齊/配色/首按即時/單項無空白/虛線待 Fat Mo 實機確認（playwright 因需 Supabase live 資料無法於此環境量測）

---

## [2026-06-10] ✨ Session 83+++++++ — 時限徽章點擊跳回交貨期卡

**範圍**：`freehandsss_dashboardV42.html` 3 處

### [FEAT] 訂單列時限徽章可點擊，跳至 dlvStatsCard 對應類別
- `_dlvBadgeHtml()` 4 個 badge 加 cursor:pointer + onclick="jumpToDlvCard('color')"
- 新增 `jumpToDlvCard(color)`：設 `_dlvAutoExpand` flag → switchMode('system') → scroll to dlvStatsCard
- `renderDeliveryStatsCard()` 尾端消費 `_dlvAutoExpand` flag → toggleDlvExpand(_c)
- 時序安全：flag 在 auto-refresh 完成的 renderDeliveryStatsCard 內消費，無競態

---

## [2026-06-10] 🐛 Session 83++++++ — 時限徽章同步修復 + dlvStatsCard UX 優化

**範圍**：`freehandsss_dashboardV42.html` 2 處

### [FIX] patchFetchGlobalReview 補 fetchDeliveryMap 平行啟動
- 根因：Supabase-First 路徑的 patched fetchGlobalReview 完全繞過 fetchDeliveryMap()
- 導致 Bug1（改狀態後徽章不更新）+ Bug2（初始不顯示時限徽章）
- 修復：patched 函式開頭啟動 _dlvFetch = fetchDeliveryMap()，render 前 await

### [UX] dlvStatsCard 展開列移除詳情按鈕，改整列可點擊
- 移除"詳情"按鈕；.dlv-expand-item div 整體 onclick="openOrderModal(orderId)"
- "↗ 跳至"按鈕加 event.stopPropagation() 防止觸發行點擊

---

## [2026-06-10] 🗄️ Session 83+++++ — migration 0033 交貨期 item-level 自動豁免

**範圍**：Supabase migration 0033（VIEW 強化）；apply PASS

### [DB] v_delivery_reminders WHERE 新增 item-done 過濾
- 新條件：若訂單所有 order_items.process_status IN ('完成','已取件')，從警告 VIEW 排除
- 邏輯：保留 IF (無 items) OR (≥1 item NOT IN ('完成','已取件'))
- 補充 C1 安全規則（不自動改 orders.process_status）；Fat Mo 在任意明細介面標完成即自動解除
- 煙霧測試 PASS；FK order_items.order_fhs_id = orders.order_id 已驗證

---

## [2026-06-10] 🎨 Session 83++++ — dlv badge 顏色修正（三色語義對齊）

**範圍**：CSS 2 行

### [FIX] .dlv-badge-green / .dlv-badge-yellow 顏色
- green badge 舊：灰色 transparent/#9ca3af（W2 退讓設計被否定）→ 新：#dcfce7/#16a34a/#86efac
- yellow badge 微調：border 改 #fcd34d 更清晰
- 三色徽章現與統計塊紅/黃/綠語義完全對齊

---

## [2026-06-10] 🐛 Session 83++ — dlvStatsCard button 修復

**範圍**：`freehandsss_dashboardV42.html` 兩處 bug fix

### [FIX] 詳情 button 無反應
- `openOrderModal` 未 export 至 `window`，inline onclick 靜默失敗
- 修復：加 `window.openOrderModal = openOrderModal;`（line ~11942）

### [FIX] 跳至 button 顯示訂單總覽頂端而非目標訂單
- `jumpToReviewOrder` 的 `inView` 守衛跳過 `fetchGlobalReview`，review table DOM 未渲染，targetEl=null
- 修復：移除 inView 條件，永遠 force-call `fetchGlobalReview(true)` 確保 DOM 渲染後再 scroll

---

## [2026-06-10] ✨ Session 83+ — 交貨期統計卡強化（豐富資訊 + 跳至訂單）

**範圍**：`freehandsss_dashboardV42.html` 局部強化；code-reviewer G1–G8 PASS

### [FEAT] dlvStatsCard 展開清單強化
- `fetchDeliveryMap()` SELECT 新增 `start_date, sla_days` 欄位
- 每列顯示：訂單號 · 客戶名 · urgency文字 + **詳情**（openOrderModal）+ **↗ 跳至**（jumpToReviewOrder）
- 子列顯示：`起: YYYY-MM-DD → 到: YYYY-MM-DD · SLA N天`
- 新增 `jumpToReviewOrder(uuid, orderId)` — 清除全部 filter → `switchMode('review')` → 條件式 `fetchGlobalReview(true)` → scroll + `.dlv-jump-highlight` 2s 閃爍
- CSS 新增：`.dlv-expand-item-row`, `.dlv-expand-item-sub`, `.dlv-jump-btn`, `@keyframes dlvFlash`, `.dlv-jump-highlight`

---

## [2026-06-10] 🚚 Session 82/83 — 交貨期提示系統（P1+P2+P3+P4 全部完成）

**範圍**：Supabase migration + 前端 V42 UI + n8n template；code-reviewer G1–G8 PASS

### [DB] Supabase migration 0032 — v_delivery_reminders VIEW
- 建立 `v_delivery_reminders` VIEW（security_invoker=on，GRANT TO anon/authenticated）
- 90天 SLA（標準）/ 126天 SLA（玻璃瓶訂單，LATERAL JOIN 偵測 product_sku LIKE '玻璃瓶'）
- HKT 時區邊界：`timezone('Asia/Hong_Kong', now())::date`
- urgency 四色：`overdue`(紅) / `due_today`(紅) / `warn`(≤14天黃) / `normal`(>14天綠)
- 煙霧測試 PASS（0 bad-urgency rows）

### [FEAT] P2 — Dashboard V42 三色交貨期徽章
- `fetchDeliveryMap()` 平行於 `fetchGlobalReview()` 執行（W3 staleness fix）
- `_dlvBadgeHtml(orderId)` 注入桌面 `<td>` 及手機 `.acc-order-header-left`
- 紅=實心填色徽章（逾期/今日到期）/ 黃=實心（14天內）/ 綠=細邊框淺灰（正常，W2 視覺退讓）

### [FEAT] P4 — 設定頁交貨期統計卡
- `dlvStatsCard`：紅/黃/綠三色計數塊，點色塊展開該狀態訂單清單
- 清單項 `onclick="openOrderModal(uuid)"` 沿用原生 Modal
- `sysRefreshPanel()` 呼叫 `initDeliveryStatsCard()` 每次刷新

### [NEW] P3 — n8n 每日 Telegram 推送 template
- `n8n/templates/fhs_delivery_reminder_push.json`：Schedule `0 1 * * *` + HTTP Request Supabase + Code(格式化) + IF + Telegram
- 僅 overdue/due_today/warn 出現才推送，空清單靜默
- 沿用 Telegram credential `tSbXz97PKmdPpDNq`

---

## [2026-06-10] 🗄️ Session 81 — migration 0031 apply + 成本欄直讀 UI

**範圍**：Supabase migration（apply_migration MCP）+ 前端 UI（`freehandsss_dashboardV42.html`）

### [DB] Supabase apply_migration 0031_expense_logs
- `expense_logs` 表正式建立於 Supabase（via MCP apply_migration）
- 煙霧測試 PASS：table ✓ / CHECK constraint ✓ / RLS ✓

### [FIX] 訂單總覽成本欄 — 改用直讀 `it.Cost`
- 移除舊 `_pgcCostList`（以 SKU lookup + 💡 audit modal 顯示成本，依賴 PGC audit 資料）
- 新增 `_pgcCostListDirect`：直接讀 `order_items[].Cost`，依 Category 顯示中文標籤（手模/鎖匙扣/銀飾/配件）
- 新增 CSS `.cost-fin-col` / `.cost-fin-item`（12px 灰色分項列表，dashed 分隔線）

---

## [2026-06-10] ✨ V42 Session 80 — Log Sheet 記錄中心 Phase 1 + NAS 部署

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）+ Supabase migration；current.html 同步更新

### [FEAT] 📒 記錄中心 (Log Sheet) — 手動支出登記
- 新增 `#logSheetCard` 卡片（indigo `#6366F1`，置於 QA 中心前）
- 操作者簡稱輸入（`localStorage` 持久化，`saveExpenseOperator()`）
- 支出登記表單：日期 / 大分類（軟件支出/打印費/材料/運費/雜項）/ 項目說明 / 金額 / 備註
- 最近 50 筆記錄列表（`loadExpenseLogs()` + 🔄 刷新按鈕）
- 系統模式 `sysRefreshPanel` 呼叫 `initLogSheet()` 自動初始化

### [FEAT] Supabase migration 0031 — expense_logs 表
- `expense_logs`（id/log_type/entry_date/category/item_name/amount/remarks/operator/payload/created_at）
- RLS append-only（anon 可 SELECT + INSERT，不可 UPDATE/DELETE，審計不可篡改）
- `log_type` 欄位預留 universal log container 擴充能力
- 煙霧測試：table ✓ / CHECK constraint ✓ / RLS ✓

### [DEPLOY] V42 → current + NAS
- SHA256: `75995D258BB8C93A77B2ACDED9F5EAC54D613EB71AB785BA6800CFE2AA49C5B4`（771,876 bytes）
- URL: https://yanhei.synology.me/Freehandsss_dashboard_current.html

---

## [2026-06-10] 🐛 V42 Session 77 — per-box 按鈕狀態時序修復

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；current.html 不動

### [FIX] 點「全部付清」後「半」button 仍顯綠色
- **根本原因**：`_syncBalanceFromDeposit` 內 C4 的 `_updateBoxBtnState(balContainer, bk, 'half')` 在每次 deposit input 變動時觸發，覆蓋 `_quickFillAllSplits` 設定的 'full' 狀態
- **修復 R1/R2**：移除 `_syncBalanceFromDeposit` 兩個 loop 的 `_updateBoxBtnState` 呼叫（derive 時不應強設按鈕狀態）
- **修復 F1/F2**：`_quickFillAllSplits` 和 `_quickHalfFillAllSplits` 末尾加 `setTimeout(0)` 最終同步，確保 per-box active 狀態在所有同步 event dispatch 副鏈結束後才設定，不受干擾

---

## [2026-06-09] 🐛 V42 Session 76 — Balance 狀態機 + active 色改橄欖綠

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；current.html 不動

### [FIX] active 色 #1565C0 → #558B2F（橄欖綠）
- 精準 4 處替換：`#fhsHalfFillAllBtn` HTML 初始色、`_syncGlobalDepositBtnUI`、`_updateBoxBtnState`、`#fhsHalfFillAllBtnBal` HTML 初始色
- 系統藍（`--fhs-info`、Supabase banner）保留不動

### [FEAT] Balance 全域按鈕狀態機（鏡像 deposit 設計）
- `window._balanceMode = 'half'`（初始值）+ `_syncGlobalBalanceBtnUI()` 新函式
- `_quickHalfFillAllSplits('balance')` 末尾加 `_balanceMode='half'` + UI 同步
- `_quickFillAllSplits('balance')` 新增獨立 balance block：`_balanceMode='full'` + UI 同步 + inputs 色重設

### [FIX] Balance per-box 按鈕 active 狀態
- `_syncBalanceFromDeposit` items loop + necklace loop 末尾各補 `_updateBoxBtnState(balContainer, bk/'group.boxKey', 'half')`，balance 派生值後 per-box 按鈕即時顯示 active

---

## [2026-06-09] 🐛 V42 三視覺 Bug 修復（balance 按鈕 + per-box 顏色 + 藍色替換）

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；current.html 不動

### [FIX] Bug 1 — balance 行補「全部半訂」+ 灰色標記
- 未付尾數行補入 `#fhsHalfFillAllBtnBal`（全部半訂，藍色），與 `#fhsFullFillAllBtnBal`（全部付清）並排。
- `_syncBalanceFromDeposit()` 兩個 loop（items + necklace group）補 `color:#999` + `data-is-default='true'`，balance 預填值同樣顯示淺色。

### [FIX] Bug 2 — per-box「半」「全」按鈕 active 狀態顏色聯動
- 新增 `_updateBoxBtnState(container, boxKey, mode)` helper：'half'→藍；'full'→藍；'manual'→雙灰。
- 注入 5 個觸發點：`_quickHalfFillSplitBtn`、`_quickFillSplitBtn`、`_quickHalfFillAllSplits` forEach、`_quickFillAllSplits` forEach、`focusin` handler。

### [FIX] Bug 3 — 按鈕 active 色 `#E65100` → `#1565C0`（避免與產品分類橙色衝突）
- 精準修改 3 處：`#fhsHalfFillAllBtn` HTML 初始色、`_syncGlobalDepositBtnUI()` 邏輯、balance 全部付清按鈕移除 hover inline handler。
- 產品分類 `.box-cat-P`、badge、warning 的 `#E65100` 保留不動。

---

## [2026-06-09] ✨ V42 全部半訂 + 預填 + focus/blur UX

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；current.html 不動

### [FEAT] 全部半訂功能 + 智慧預填
- 新增「全部半訂」按鈕（`#fhsHalfFillAllBtn`）於頂部，對等「全部付清」（`#fhsFullFillAllBtn`）。
- `renderPaymentSplits` 後自動預填半付：所有 deposit 格填 `ceil(suggested/2)`，`color:#999`，`data-is-default=true`。
- `focusin`：操作員點擊預設值格 → 即時清空 + `color:#333` + mode='manual'。
- `focusout`：空值離開 → 還原半付預設 + `color:#999` + 重評估 mode。
- `window._depositMode = 'half'|'full'|'manual'` 追蹤狀態，`_syncGlobalDepositBtnUI()` 同步橘/灰色。
- ⏳ 待 Fat Mo Live 驗證：① 預設半付淺色 ② focus 清空 ③ blur 還原 ④ 全部付清→橘色切換。

---

## [2026-06-09] 💅 V42 支付按鈕文字改版（半/全疊排 + 移除全域頂部按鈕）

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；current.html 不動

### [UX] Split-box 按鈕重構 + 代碼清理
- 移除頂部 `#fhsHalfPayBtn` / `#fhsFullPayBtn` icon 按鈕（全域切換改為每格各自操作）。
- `_addBox()` 每格右側：SVG icon → 純文字「半」（上）+「全」（下），上下疊排 flex-column。
- 清除孤兒邏輯：`_applyPaymentMode()` + `_updateQuickPayBtnState()` + `window._paymentMode` + auto-apply 呼叫塊。
- `_quickFillSplitBtn` / `_quickHalfFillSplitBtn` 功能邏輯保留，改由每格文字按鈕直接觸發。
- ⏳ 待 Fat Mo Live 驗證：① 頂部無全域付款按鈕 ② 每格右側「半」上「全」下正確 ③ 點擊填入功能正常。

---

## [2026-06-09] 💅 V42 支付按鈕 Icon 改版（◑ ✓ SVG + 全部付清）

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；current.html 不動

### [UX] Payment split icon redesign
- `#fhsHalfPayBtn` / `#fhsFullPayBtn`：純 SVG icon-only（◑ / ✓），移除文字，加 `title` tooltip。
- `_addBox()` 每格：`⚡` → ✓ SVG（全付），並新增 ◑ SVG 半付按鈕（`.quick-half-btn`）。
- `照數填入` → `全部付清`（移除 ⚡ icon，保留文字純按鈕）。
- 新增 `_quickHalfFillSplitBtn(btn)`：填入 `Math.ceil(suggested/2)`，設 `_depositDirty=true`，掛 `window`。
- `_quickFillSplitBtn` 補 `_depositDirty=true`（全付也標記 dirty，防自動覆蓋）。
- SVG 常數 `FHS_SVG_FULL` / `FHS_SVG_HALF` 定義於 `renderPaymentSplits` 前。
- ⏳ 待 Fat Mo Live 驗證：① 頂部 ◑ ✓ icon 顯示正常 ② 每格兩個 icon 可點 ③ 半付 ceil 正確 ④ dirty flag 有效。

---

## [2026-06-09] ✨ V42 已付訂金「全付/半付」快速切換按鈕（default=半付）

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html`）；code-reviewer G1–G8 ALL PASS

### [FEAT] 全付/半付快速填入按鈕
- 新增 `#fhsHalfPayBtn`（½ 半付，預設 active 橘色）、`#fhsFullPayBtn`（全付）於「已付訂金」label row。
- 半付：每格 deposit = `Math.ceil(per_item_price/2)`；balance 自動衍生 `Math.floor`（`_syncBalanceFromDeposit()` 級聯）。
- 全付：每格 deposit = per_item_price；balance 自動歸 0。
- Default = 半付：報價算出且 `_fhsCostReady=true` 後自動預填（首載/每次切換商品）。
- Dirty flag：`e.isTrusted` 區分人工/程式輸入，操作員手動改值後停止自動覆蓋；點按鈕重置。
- Disabled gate：`_fhsCostReady=false` 時按鈕 disabled + opacity:0.4；成本載入後啟用。
- 奇數金額規則：已付 ceil、尾數 floor（ceil+floor=total，零差額）。
- V42 only，current.html 不動（晉升需另行授權）。
- ⏳ 待 Fat Mo Live 驗證：① 首載自動半付 ② 全付切換 ③ 手動覆蓋後 dirty 保護 ④ 奇數金額無差額。

---

## [2026-06-09] 💅 V42 玻璃瓶 嬰兒收合控件重構 + 模式按鈕對齊修復（3 點）

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html` + 同步 `Freehandsss_dashboard_current.html`，hash `7a8ab69a`）；code-reviewer G1–G8 ALL PASS

### [UX] 承上輪 glass_pending 收合控件再優化
- **Item 1 文案**：收合控件「↩ 收回全部待定」→「↩ 全部待定」。（註：與 glass_pending 單格「全部待定」同名異義——單格=展開、此鈕=收合；保留 ↩ 箭頭作收合暗示。）
- **Item 2 重構**：收合控件由「按鈕列上方動態插入連結 `babyGlassCollapseLink`」改為【嬰兒】標題列右側**靜態 button** `#babyGlassCollapseBtn`（比照父母/大寶列擺位）。移除動態 insertBefore 邏輯，顯隱集中於 `babyRestoreVisual()` 單一出口（`isGlassStyle && !isGlassPending`）。
- **Item 3 對齊 bug（真因，已修）**：模式按鈕變大/不等寬的真因＝ Task 2 那行 `btnRow.style.display = isGlassPending ? 'none' : ''`——非 glass_pending 時設**空字串清掉 inline `display:grid`**，使 `#babyModeBtnRow` 退回 `display:block`，4 欄 grid 崩潰、按鈕退化為塊級各自收縮（frontend-developer playwright 實測：V42 computed display=block / 寬 66·62·62·46px；V41=grid / 全 103px）。**修復**：改設回 `'grid'`。先前誤把問題當按鈕樣式、兩度誤判，最終靠 playwright 量測坐實。教訓：`style.display=''` ≠ 還原原值，會清除 inline 既有 display。
- ⏳ 待 Fat Mo Live 驗證：① 收合鈕在標題列右側、展開時才現 ② 模式按鈕恢復原始尺寸 ③ 桌面/手機兩端不擠壓不溢出。

---

## [2026-06-08] 💅 V42 玻璃瓶「嬰兒全部待定」單格 UI/UX 優化（4 點）

**範圍**：前端 UI/UX（`freehandsss_dashboardV42.html` + 同步 `Freehandsss_dashboard_current.html`，hash `ac93b4be`）

### [UX] glass_pending 單格四點優化
- **Task 1 文案**：單格「（點擊展開自訂）」→「（點擊展開編輯）」。
- **Task 2 fit size**：模式按鈕列外層加 `id="babyModeBtnRow"`，`babyRestoreVisual()` 於 glass_pending 時連同整列隱藏（原本只隱藏個別按鈕，殘留外層 grid 佔位 + margin 造成單格上方留白）。
- **Task 3 展開預設**：點單格 onclick 由 `babyFillMode='custom'`（空白自訂）改為 `babySetMode('left')`——進「一手一腳（左）」模式，左手+左腳=待定、右手右腳=無。
- **Task 4 回退**：玻璃瓶款式展開狀態於頂部顯示小連結「↩ 收回全部待定」（`#babyGlassCollapseLink`，動態建立），呼叫新函式 `babyReturnToGlassPending()` 重設四肢為待定並收摺回單格。
- 僅限 `pSubCat==='玻璃瓶款式'`；木框款式零影響。
- ⏳ 待 Fat Mo Live 驗證：① 單格上方無留白 ② 點擊展開進左手左腳 ③ 收回連結正常往返 ④ 桌面/手機兩端皆 fit。

---

## [2026-06-08] 🐛 修復 V42 default 介面成本設定載入卡死（async 載入後未重觸發）

**範圍**：bug 修復（`freehandsss_dashboardV42.html` + 同步 `Freehandsss_dashboard_current.html`）

### [BUGFIX] loadCostConfigurations 完成後未重觸發 generate() → 首載卡「成本設定載入中」
- **根因**：成本設定為**非同步**載入（`loadCostConfigurations()` 的 `_fsSelect` 打 Supabase）。首載時 `calculatePricing()` 在 `_fhsCostReady=false` 時已跑過一次，顯示「⏳ 成本設定載入中，請稍候再計算…」並 return；async 完成後雖設 `_fhsCostReady=true`（line 12366），但**沒有重新觸發計算**，畫面停在載入中，必須手動反覆切換訂單類型（觸發 `generate()`）才回復。
- **誤判修正**：初版誤以為是頂部 `if(!list)return`（W5 回歸）所致，但 `costConfigList` 為靜態元素（line 4084），`list` 永遠非 null，該守衛從不觸發 → 已還原原狀。
- **修復**：在 `.then` 設 `_fhsCostReady=true` 後，主動重觸發一次 `window.generate()`（全域，5422 宣告；內部呼 `calculatePricing()`）刷新報價顯示。包 try/catch 防破壞 ready 旗標；不遞迴（`calculatePricing` 只讀旗標、不回呼 `loadCostConfigurations`）。
- **同步**：current.html（= V42 生產基準）一併修復，兩檔 hash 一致 `6f44756f`。
- ⏳ 待 Fat Mo Live 驗證：reload V42 default 介面 → 報價應於成本載入完成後**自動**更新，毋須手動切換訂單類型。

---

## [2026-06-08] 🚀 新增 /upload-web 指令 — WebDAV 部署 Dashboard 至 NAS Web Station

**範圍**：新增指令（基礎設施部署），不改動任何業務代碼

### [FEAT] /upload-web 一鍵部署 + 三關驗證
- 新檔 `scripts/upload-web.ps1`：WebDAV over HTTPS（`yanhei.synology.me:5006` → `/web`）PUT 上傳 + 驗證（公開端點 HTTP 200 + Content-Length 比對 + SHA256 逐位元組）
- 新檔 `.fhs/ai/commands/upload-web.md`（Master v1.0.0）+ `.claude/commands/upload-web.md`（CL 橋接）
- 目標代稱：`V42`(預設)/`V41`/`V40`/`current`(生產版需 `-Force` + 二次確認)/字面檔名
- 憑證存 gitignored `.env`（`NAS_WEBDAV_URL`/`NAS_WEBDAV_USER`/`NAS_WEBDAV_PASS`），密碼永不回顯
- 後效同步：`FHS_Prompts.md` 情境二十五、`repo-map.md`、`decisions.md`、`SOP_NOW.md`
- **首次部署**：V42 已上線 `https://yanhei.synology.me/freehandsss_dashboardV42.html`（公開，已授權）

---

## [2026-06-08] 🧴 玻璃瓶款式 UI + IG 模板 Round 2 精修（V42）

**範圍**：前端精修（`freehandsss_dashboardV42.html`，開發基線）

### [POLISH] 玻璃瓶款式 UI 折疊單格 + IG 格式微調
- **UI 折疊**：新增 `glass_pending` babyFillMode — 切玻璃瓶時隱藏 4 按鈕列 + 4 肢下拉，改顯「全部待定」單格（`#babyGlassPendingCell`）；點擊展開 custom 模式
- **嬰兒預設**：`_applyGlassDefaults()` 中 4 肢值改為 `'待定'`（原 `'無'`），`babyFillMode = 'glass_pending'`
- **IG 格式**：`*倒BB：待定`（冒號前移除空格；`formatBabyLimbsInline()` glass_pending 時 early return `'待定'`）
- **IG 縮排**：`需另加100，...` 行移除 3 個前置空格（與 `⭐️如...` 行左對齊）
- **G1–G8 Gate**：ALL PASS（code-reviewer 稽核通過）

---

## [2026-06-08] 🧴 玻璃瓶款式差異化 UI 預設 + IG 訊息模板分流（V42）

**範圍**：前端行為改動（`freehandsss_dashboardV42.html`，開發基線）

### [FEAT] 玻璃瓶款式選擇時自動套用預設值
- 新增 `_applyGlassDefaults()` 函式（window 暴露）：`pSubCat` 切到 `玻璃瓶款式` 時：
  - 父母 toggle `en_parent` 自動 On
  - 嬰兒 4 肢清空（'無'）+ `babyFillMode = 'custom'`（資料於倒模當天填寫）
  - 底座顏色預設已為「待定」（`renderLimbGrid()` 原有行為）
- 守衛：`!== '玻璃瓶款式'` 即 return，木框款式零影響

### [FEAT] 玻璃瓶款式 IG 訊息模板分流（`buildCategoryA_v2` v2 格式）
- **倒BB 行**：玻璃瓶款式永遠輸出 `*倒BB ：`（含空值，資料待填）
- **父母行**：玻璃瓶款式改輸出 `*倒：爸媽各一手`（取代原 `*父母 ：左手/右手動態`）
- **底座行順序**：玻璃瓶款式底座行移至父母行之後
- **製程行**：玻璃瓶款式合併為單行 `製成品預十五至十八星期完成`（以 IG 訊息寬度自動換行）
- **花材聲明**：玻璃瓶款式移除 `⭐️花材會因批次不同，顏色會有所出入`
- **新增聲明**：玻璃瓶款式於 `⭐️作品不包照片` 後新增純文案：
  `⭐️如手腳超出已包玻璃瓶尺寸，` / `需另加100，訂購合適玻璃瓶尺寸`（不接成本鏈）
- 木框款式及 v1 原版格式完全不受影響

---

## [2026-06-08] 🛡️ Sync_Notion_Brain.js V2.1 韌性硬化

**範圍**：`scripts/Sync_Notion_Brain.js`（記憶引擎 Notion 同步）

### [FIX] 暫時性網路故障不再拖垮整批同步

- **根因**：原腳本對所有 fetch response 直接 `.json()`，無 `response.ok`/content-type guard、無重試 → 任一暫時性非-JSON 回應（閘道 HTML 錯誤頁）即以 `SyntaxError` 崩潰，丟失剩餘同步（Session 69 commit 時實際觸發）
- **修復**：新增 `notionRequest()` 統一包裝 — 檢查 `response.ok` + content-type JSON 驗證 + 指數退避重試（500/1000/2000ms）
- **逐項保護**：archive/push 迴圈逐項 try/catch，單項失敗記入 `failures[]` 不中斷整批，結尾輸出失敗摘要並 `exit(1)`
- **早退**：`NOTION_API_KEY` 缺失即 `exit(1)`
- **驗證**：`node -c` 語法 OK + 實跑全程通過 exit 0

---

## [2026-06-08] 🎨 立體擺設款式三組重排（V42 UI，取代框版）

**範圍**：前端輕量分組重排（`freehandsss_dashboardV42.html`，開發基線）

### [UI] 「立體擺設款式」內三組輕量分組（A→C→B）

- **取代**：移除前一版 `.casting-group` 實心框（佔空間令版面變窄），改輕量標題 + 細分隔線
- **三組順序**（Fat Mo 定 B&C 調轉）：
  - **A 組**：款式類型 + 底座顏色 + 客製化刻字（刻字由區塊最底上移至此）
  - **C 組**：倒模對象（嬰兒/父母/大寶）
  - **B 組**：加購配件（羊毛氈/燈飾）
- **`renderLimbGrid()` 拆分**：底座顏色/木框色款 → 新容器 `#baseColorContainer`（A 組）；嬰兒/父母/大寶 → `#limbContainer`（C 組），兩者不再同框
- **B 組標題隨款式顯隱**：`#ssAddonTitle` 由 `_syncAddonVisibility()` 控制（玻璃瓶顯示、木框隱藏），避免空標題孤兒
- **CSS**：`.casting-group`/`.casting-group-title` → `.ss-group-title` + `.ss-group-sep`（無 border box）
- **零改動**：既有 ID（`pSubCat`/`baseColor`/`woodStyle`/`pEngraving`/`w_wool_en`/`l_light_en`/`en_parent`/`box_parent`/`en_elder`/`box_elder`/`babyBtn_*`/`.limb-sel[data-who]`）全保留；captureFormState/payload/`data-who` 讀取未觸及
- **驗收**：playwright 三版渲染 PASS（玻璃瓶桌面/手機 + 木框桌面，木框正確隱藏加購標題）；⏳ 待 code-reviewer G2/G3

---

## [2026-06-07] 🔌 Supabase MCP 建立 + Test01 Live 驗收（Session 68）

**範圍**：基礎建設（MCP 設定，gitignored）+ Live 驗收

### [INFRA] Supabase MCP Server 上線

- **套件**：`@supabase/mcp-server-supabase@latest`（npx，Personal Access Token 驗證）
- **設定**：`.mcp.json` + `settings.local.json`（均 gitignored）
- **注意**：套件需 PAT（`--access-token`），非 Service Role Key

### [VERIFY] Session 66 TD-P-chargedPositions Live 驗收 — PASS

- **Test01 訂單**：木框套裝 (4肢) + 嬰兒不銹鋼鎖匙扣 4飾
- **P_MAIN drawing_cost = $0** ✓（修復確認，無虛假 $60）
- **K_LH drawing_cost = $0** ✓（W1 免畫圖正確）
- **total_cost = $335**（handmodel $210 + keychain $125 after -$60 deduction）✓

---

## [2026-06-07] ⚡ Anti-Idle Ping 部署（Session 67）

**範圍**：n8n 新 Workflow `FHS_Anti_Idle_Ping`（ID: `FxKHTDiYiUPnxvm6`）

### [INFRA] Supabase Free Tier 防暫停機制上線

- **目的**：防止 Supabase Free Tier 因 7 天無 API 請求自動暫停
- **設計**：Schedule Trigger（每 5 天 cron `0 1 */5 * *`）→ HTTP GET Supabase ping → IF statusCode 非 200-299 → Telegram 告警
- **驗證**：Supabase ping 端點直接測試回傳 HTTP 200 + 正確資料 ✓
- **Telegram**：告警發至 chat `7620524971`，訊息含 Supabase Dashboard 直連連結
- **狀態**：ACTIVE（n8n 已啟動，triggerCount: 1）

---

## [2026-06-07] 🐛 TD-P-chargedPositions 修復 — P_MAIN 畫圖費雙計問題（Session 66）

**範圍**：`freehandsss_dashboardV42.html` 前端顯示層

### [BUGFIX] calculatePricing() — P_MAIN 不再累積虛假畫圖費

- **根因**：`TEMP_P_MAIN` 無 `PartDesc`，W1 chargedPositions 追蹤被跳過，P_MAIN 錯誤進入 K/M drawing cost 分支，累積 ~$60 至 `totalDrawingCost`，混合訂單前端顯示成本虛高
- **修復**：`else if (!item.isAccessory)` 條件加入 `&& item.Order_Item_Key !== "TEMP_P_MAIN"`，P_MAIN 不走畫圖費計算，`item.FatMoCost = 0`
- **不影響**：W1 pre-population 仍正確防止 K/M 同部位雙收畫圖費；P_MAIN 成本 $210 由 n8n 從 Supabase `products.total_base_cost` 計算
- **改動點**：`Freehandsss_Dashboard/freehandsss_dashboardV42.html` line 5733

---

## [2026-06-07] 🐛 立體擺設 products.total_base_cost 修正（Session 65）

**範圍**：Supabase products 表資料層修正 + FHS_Pricing_Bible.md §6.2 補全

### [BUGFIX] migration 0030 — 立體擺設成本 $0 → $210

- **根因**：migration 0023 將 4 個立體擺設 SKU seeded 為 `total_base_cost=0`（placeholder），無後續 migration 或 RPC 補值，`fhs_sync_products_from_config()` 不覆蓋立體擺設。Smart Cache 讀 0 → n8n `handmodel_cost=0` → 所有立體擺設訂單成本少計 $210/單
- **修復**：`supabase/migrations/0030_fix_3d_frame_base_costs.sql`，UPDATE 4 SKU `total_base_cost = 210`（含煙霧測試）
- **確認依據**：Airtable Base_Costs（Drawing $60 + Printing $150）+ Supabase cost_configurations（material_cost_woodframe=210）+ V41 HTML 確認對話框（"立體擺設成本 $210 已計入"）三重確認
- **附帶發現（未修）**：chargedPositions Set 不追蹤 P_MAIN 肢，混合訂單前端顯示可能雙計繪圖費 → Task A 範疇

### [DOCS] FHS_Pricing_Bible.md §6.2 補全

- 新增立體擺設代表性數值：木框套裝/玻璃瓶套裝各一行（均 $210：Drawing $60 + Printing $150）
- 補充繪圖費說明（per set 非 per limb）+ 技術債 footnote

### ⚠️ Fat Mo 待執行

- 在 Supabase SQL Editor 執行 `0030_fix_3d_frame_base_costs.sql` → smoke test 全 PASS 後生效
- 執行後所有新立體擺設訂單 `handmodel_cost` 將正確計入 $210

---

## [2026-06-06] 🚧 V42 手機訂單總覽 WhatsApp/Threads 視覺觸控改造（Session 64）

**範圍**：`freehandsss_dashboardV42.html` 開發版（V41 凍結，不得改動）

### [FEATURE] 左滑手勢 + Threads 視覺系統
- **Lucide SVG sprite**（9 icons）：message-circle、send、square-pen、star、archive、trash-2、more-horizontal、undo-2、x；零外部依賴、MIT
- **左滑卡片（.swipe-row-wrapper）**：translateX -140px，方向鎖手勢引擎（8px 死區，MutationObserver 重綁），封存 + 更多兩鍵（暖米 #F0EBE4 + 暖灰 #E0D8CC）
- **Bottom-Sheet 行動選單**：`openBsSheet(orderId, displayId)` 從底部推出，手模 A / 金屬 B 標籤 badge 差異，5 個操作 + 刪除危險區（H2 正確函式簽名：openOrderModal(id,'A'/'B')、jumpToEditOrder(Order_ID)、openDeleteModal(id,Order_ID)）
- **Threads 單色視覺**：預設 `--fhs-text-secondary`，最愛啟動 `#F5B301`，刪除紅 `--fhs-danger`
- **Star 彈跳動畫**：`@keyframes fhsStarPop` scale 1.35 → 0.88 → 1.0，350ms spring
- **iOS Segmented Control**：`.fhs-seg-indicator` 滑動指示器，「進行中 / 已封存」分頁

### [FEATURE] 封存/最愛持久化（Supabase-First）
- **Supabase migration 0029**：`orders` 表新增 `is_archived`/`is_favorite` boolean（待 Fat Mo 在 SQL Editor 手動執行）
- **5 秒 Undo Toast**：封存後進度條倒數，Undo 取消佇列，逾時才 PATCH
- **H1 修正**：頁面卸載用 `fetch(keepalive:true)` 取代 `navigator.sendBeacon`（sendBeacon 只能 POST，不能 PATCH）
- **applyReviewFilters 包裹**：segmented 分頁過濾 + 最愛置頂排序，直接對 `window.globalOrders` slice 攔截

### [FIX] 手機版 emoji 按鈕隱藏
- `@media (max-width:767px)`: `.fhs-btn-order-detail`、`.acc-action-row` `display:none !important`（保留 HTML ID）

### [ARCH] V41 凍結 / V42 治理
- V41 凍結：decisions.md 記載，hotfix 須 cherry-pick
- V42 晉升 checklist：V1–V11 手機測試全綠 + 桌面回歸 + Fat Mo 授權 + diff 審查

---

## [2026-06-05] ✅ TD1 技術債清償：FHS_Pricing_Bible.md 搬移（Session 62）

**範圍**：純架構搬移，無業務邏輯變更

### [REFACTOR] FHS_Pricing_Bible.md 路徑遷移（.fhs/notes/ → .fhs/ai/）

- **搬移**：`FHS_Pricing_Bible.md` v1.1.0 從 `.fhs/notes/` 遷移至 `.fhs/ai/`（AI 規則層統一管理）
- **舊路徑刪除**：`.fhs/notes/FHS_Pricing_Bible.md` 已移除
- **引用更新（6 個檔案）**：`FHS_Finance_Bible.md`、`AGENTS.md`、`FHS_Prompts.md`、`repo-map.md`、`finance-gatekeeper/SKILL.md`、`FHS_Product_Bible_V3.7.md`
- **技術債備忘清除**：`finance-gatekeeper/SKILL.md` §五「Pricing Bible 位置不一致」條目移除
- **decisions.md**：補入 Session 62 架構決策記錄

---

## [2026-06-05] ✅ Telegram 待核算假警報修復（Session 61 — n8n V47.17）

**範圍**：n8n Calculate Profit & Pack Items 單節點修復

### [FIX] V47.17 — 收斂律警告降級，修復混合訂單 Telegram「待核算」假警報

**問題**：混合訂單（P_MAIN + 加購 K/M）提交後，Telegram 成本及利潤均顯示「待核算」。
**根因**：V47.16 收斂律自我檢查把警告推入 `zeroCostItems`，導致 `Has_Cost_Error = true`。W1 免畫圖使四分量合計 ≠ `products.total_base_cost`（兩個不同源成本系統），必然觸發假警報。
**修復**：收斂律警告移至 `n8nAdjustmentNotes`（純審計記錄），不再污染 `Has_Cost_Error`。

- n8n V47.16 → **V47.17** (LIVE)，versionId: `0c3a1293-bd46-4650-b920-b6d867f75551`

---

## [2026-06-05] ⚡ VT-1/2/3 吊飾運費扣減驗收 + 定價寶典文件升版（Session 61）

**範圍**：Supabase/Airtable 雙端數據稽核 + 驗收報告建立 + 定價寶典（Pricing Bible）文件升版

### [AUDIT] VT-1/2/3 吊飾運費扣減驗證
- **VT-1 (單件吊飾)** — **PASS**：確認訂單 `T730548` `total_cost` 為 `$635`，無異常扣減，`n8n_adjustment_notes` 無扣減欄位。
- **VT-2 (多件吊飾)** — **PASS**：確認訂單 `T584316` `total_cost` 為 `$530`，`n8n_cost_adjustments` 寫入 `-$105` (扣減式：(4-1)*$35 = $105)，`n8n_adjustment_notes` 完整寫入折扣依據與件數。
- **VT-3 (B1 歷史標靶)** — **FAIL (無資料)**：於 Supabase/Airtable 進行精確查詢，未查得 `$455` (3鎖匙扣) 與 `$1,335` (4吊飾) 實體訂單。核對 Session 54 B1 完成報告，確認此兩筆為前端 Playwright 模擬測例，未正式送出至資料庫。
- **報告產出**：已於 `.fhs/reports/2026-06-05_vt_charm_shipping_validation_report.md` 產出完整驗收報告。

### [DOC] FHS_Pricing_Bible.md v1.1.0 升版
- 補入 **§3.4 吊飾跨部位運費共享規則**，說明 `(count-1) * $35` 扣減邏輯與 n8n 扣除路徑，與鎖匙扣運費共享對齊，消除文件空白。

---

## [2026-06-05] ✅ Task A 四分量後台記帳落地 + 系統總論文件建立（Session 60）

**範圍**：前端 + n8n 三節點 + Supabase migration + 文件化

### [FEAT] Task A — 四分量後台記帳接通（n8n V47.16）

**白話**：把訂單成本拆成 4 個信封（畫圖/打印/鏈條/運費）分別記入 order_items，補上前幾 Phase 建好底層後欠缺的最後一條傳遞路線。

**改動點**：
- **V41 HTML** — `calculatePricing()`：補 per-item `ChainCost`
  - 吊飾：全訂單按 silverItems 順序奇偶位分配（奇=$100，偶=$0），含 qty>1 多件正確展開
  - 鎖匙扣：`ChainCost = ClaspCost`（$10×qty，已逐件算好）
- **V41 HTML** — payload injection（line 6299-6303）：補 `Printing_Cost / Chain_Cost / Shipping_Cost`
  - 現在 orderItemsArray 每件含完整四分量，傳給 n8n
- **n8n Parse Items & Generate SKU**（V47.16）：outputItems 透傳四欄 `Drawing/Printing/Chain/Shipping_Cost`
- **n8n Calculate Profit & Pack Items**（V47.16）：
  - packedItems 補四欄（從 originalItemData 讀取前端透傳值）
  - 新增收斂律自我檢查：`SUM(四欄毛值)−扣減 ≈ Total_Cost`，偏差>$1 則 zeroCostItems 警告
- **n8n Supabase Mirror Prep**（V47.16）：items mapping 補四欄（snake_case）
- **migration 0028**（`supabase/migrations/0028_sync_rpc_four_cost_columns.sql`）：
  - 更新 `sync_order_to_mirror` RPC，INSERT/UPDATE order_items 補寫四欄
  - COALESCE 保護：舊訂單 NULL 時不破壞既有資料
  - ⚠️ **需 Fat Mo 在 Supabase SQL Editor 執行**

**收斂律驗算**：
- V1 鎖匙扣3件：(120+285+30+60)−40 = **455 ✓**
- V2 吊飾4件：(60+1040+200+140)−105 = **1335 ✓**

### [DOC] FHS_System_Logic_Overview.md v1.0.0 建立

- 路徑：`.fhs/notes/FHS_System_Logic_Overview.md`
- 完整記錄：前端成本計算、售價公式、畫圖費豁免規則、n8n 節點流程、成本原子數值、IG 訊息邏輯、B1 驗收標靶、rollback 指引
- 讓任何新 session AI 或人員讀完即可理解整套系統

**⚠️ 待 Fat Mo 執行**：
1. Supabase SQL Editor 執行 `0028_sync_rpc_four_cost_columns.sql`
2. current.html 同步（授權後 `/execute` 更新）
3. VT-1/2 真實訂單驗收

---

## [2026-06-04] 🐛 W5-FIX: _fhsCostReady 永久 false + rp.md 注入層補丁 + Supabase-First 違規記錄

**範圍**：前端 bug 修復 + 制度層防護強化（Session 59）

### [BUG FIX] W5 競態守護設計缺陷修正（calculatePricing 永久顯示「成本設定載入中」）
- **根因**：`loadCostConfigurations()` 頂部有 `if (!list) return` 守衛，`costConfigList` DOM 元素只在 QA 模式面板存在，正常頁面載入時函式立即 return，`_fhsCostReady` 永遠不被設為 true
- **修正 1**：移動守衛至 `_fhsCostReady = true` 之後（先載入資料，再判斷是否渲染 DOM）
- **修正 2**：`init()` 新增 `loadCostConfigurations()` 呼叫，確保頁面啟動時預載成本設定
- V41 + current.html 雙檔同步（693,925 bytes）

### [RULE] rp.md FHS 自動注入層補丁（v2.3 語義修正）
- 新增觸發詞「驗證/查詢/VT/live data/查單/查訂單」→ 注入 Supabase-First + blocker 上報原則
- 修正「財務/成本/利潤」觸發詞注入前提（對齊 2026-06-03 收款確收守護語義修正）

### [PITFALL] Supabase-First 靜默降級違規記錄（2026-06-04 事故）
- learnings.md 新增：工具缺 Supabase MCP = blocker 上報，禁止靜默降級至 Airtable
- 持久記憶 feedback_supabase_first_enforcement.md 新建

---

## [2026-06-03] 🛡️ AGENTS.md v1.4.11 — Rule 3.16 任務型路由 + finance-gatekeeper v1.1.0 + finance-auditor v2.1.0

**範圍**：財務核心文件體系補完（制度層）

### AGENTS.md — Rule 3.16 任務型路由補入

- Rule 3.16 入口從「直接讀 Finance Bible」改為「先讀 finance-gatekeeper/SKILL.md 取路由，再讀對應文件」
- 補入任務型路由表：職責分工→Finance Bible §一；成本 key 數值→Cost Schema v2；售價/報價→Pricing Bible
- 觸發關鍵字補充「成本 key 數值」「售價公式」

### finance-gatekeeper/SKILL.md v1.0.0 → v1.1.0

- 查詢路由表：新增 L2a `FHS_Product_Cost_Schema_v2.md` 條目（成本 key 實際數值）；§6 條目拆分為組成邏輯（L2b）vs 實際數值（L2a）
- 權威階層：L2 拆分為 L2a（Cost Schema v2）+ L2b（Pricing Bible）
- §三第1條：「前端利潤最高真理」→「收款確收守護（v1.4.10）」語義修正
- §五（新增）：技術債備忘（Pricing Bible 位置 + Task A 路由更新觸發條件）

### finance-auditor.md v2.0.0 → v2.1.0

- compatible_with 升至 v1.4.10；n8n 版本更新至 V47.15
- Step 1 補入收款確收守護語義說明（Rule 3.16）
- 已知現況：靜態筆數改為動態查詢提示；補入 migration 0027 四分量欄說明

## [2026-06-03] ⚡ n8n V47.15 — B2 吊飾運費扣減補入

**節點**：`Calculate Profit & Pack Items`（Workflow 6Ljih0hSKr9RpYNm）
**versionId**：`25351131-44f2-4e95-8c22-fb856042bde8`

### 修正

- ✅ **[FIX] 吊飾運費扣減補入（B2 P0 Bug）**：新增 `charmItemCount` 累加吊飾件數（SUM qty，對稱 V47.14 鎖匙扣 P0 修正）；`charmShippingDeduction = (charmItemCount-1) × $35`；同步扣減 `totalBaseCost` 及 `necklaceCostTotal`；寫入 `N8n_Adjustment_Notes`。
- **影響**：吊飾多件訂單 `Total_Cost` / `Final_Profit` / `Necklace_Cost_Total` 現與前端 V41 一致。
- **不變**：單件吊飾訂單、鎖匙扣邏輯、其他所有欄位零改動。

### 架構補充說明（Phase 0 查證結論）

- Smart Cache Strategist V47.13 已是 Supabase-First（axios 查 `products.total_base_cost`），Airtable 為 fallback only——此問題已於 V47.13 解決，B2 無需另行處理。

## [2026-06-03] 🛡️ AGENTS.md v1.4.10 — 財務規則語義修正 + Rule 3.16

**事故修正**：AI 誤解「前端利潤最高真理」規則，將收款確收側語義錯誤延伸至成本估算側，導致 B2 設計方向錯誤。本次修正：
- **AGENTS.md v1.4.9 → v1.4.10**：「前端利潤最高真理」→「收款確收守護」，明確語義為 `final_sale_price`（Deposit+Balance+AdditionalFee 手輸確收金額）不可被 n8n 覆蓋；成本由 n8n 從 Supabase 計算。
- **Rule 3.16 新增**：財務規則前置讀取強制律——凡涉及財務規則解釋，必先讀 Finance Bible §一，禁依賴 AGENTS.md 摘要推斷。
- **learnings.md**：補入 2 條嚴重過失 pitfall（財務規則摘要誤讀 + 未讀源文件即判斷）。
- **decisions.md**：補入事故記錄。

## [2026-06-03] 🚀 current.html 同步（B1 Live 驗證通過）

V41 → current.html 同步（693,581 bytes）。B1 Live 驗證 V1–V4 + V-TRANSITION 全 PASS。

## [2026-06-03] ⚡ B1 — 吊飾/鎖匙扣成本引擎補完（Session 54）

**核心變化**：補入 calculatePricing() 缺失的 3 個成本分量（打印/鑄造費、基礎運費、鎖匙扣環扣），System_Total_Cost 公式達到 Finance Bible G2/G4 完整定義。B1 = 前端顯示權威化；n8n 信任前端+三端一致 deferred 至 B2。

### Dashboard V41 — calculatePricing 成本引擎補完
- ✅ **[NEW]** 打印/鑄造費（`_totalPrintingCost`）：吊飾銀=260/金=316（跨對象一致）；鎖匙扣成人=135/嬰兒=不銹鋼95/鋁合金122，全讀 `_cc.material_cost_*`（fallback 保留）
- ✅ **[NEW]** 基礎運費（`_totalBaseShipping`）：每件加，複用既有 deduction key 單價（吊飾$35/鎖匙扣$20）
- ✅ **[NEW]** 鎖匙扣環扣（`_totalKeychainClaspCost`）：每件 + `_cc.keychain_clasp_cost`（$10）
- ✅ **[FIX]** 成本公式：`Drawing + Printing + NecklaceChain + KeychainClasp + BaseShipping − ShippingDeduction`，驗算標靶 $455（嬰兒鎖匙扣3件）/ $1335（4件吊飾）
- ✅ **[FIX]** 修正 `calculatePricing()` 跨產品畫圖費減免（W1）：主商品套裝所選部位（嬰兒/父母/大寶）若非「無」，其對應的鎖匙扣/吊飾部位畫圖費現在會正確予以免除（解決自動化測試中 V1 被誤判為 $575 的問題，成功對齊標靶 $455）
- ✅ **[NEW]** Shadow log 增強：新增各分量明細輸出（printing/chain/clasp/baseShip/deduction）
- ✅ **[NEW]** B1 過渡標示：uiDetails 顯示「成本顯示已校正，後台回寫待 B2」

### Supabase Migration 0026
- ✅ **[UPDATE]** `material_cost_necklace_silver` 0→**260**；`material_cost_necklace_gold` 0→**316**
- ✅ **[NEW]** `material_cost_keychain_stainless_adult`=**135**；`material_cost_keychain_alloy_adult`=**135**（成人/家庭層）
- ✅ **[NEW]** `keychain_clasp_cost`=**10**（鎖匙扣環扣）
- ✅ **[FIX]** stainless/alloy display_name 補「（嬰兒）」標注
- ✅ **[FIX DOC]** FHS_Product_Cost_Schema_v2.md：移除錯誤的 `clasp_cost` 行（原為 Airtable column，非 config_key）；key 數 21→23

### 架構決策
- B1 = 純前端顯示校正（n8n 仍用 total_base_cost，三端一致留 B2）
- Phase 0 查證：n8n 完全不讀 System_Total_Cost（讀 Total_Base_Cost per item），B1 零回寫風險
- database-reviewer + code-reviewer Gate G1–G8 全 PASS

## [2026-06-02] ⚡ P1 — 成本邏輯憲法化（Session 53）

**核心變化**：前端 `calculatePricing()` 確立為唯一成本計算權威；原子成本從 Supabase `cost_configurations` 讀取，零 hardcode；n8n P0 shipping bug 修正。

### Dashboard V41 — calculatePricing 成本引擎重構
- ✅ **[W5]** `loadCostConfigurations()` 加入 `_fhsCostReady` ready 旗標；`calculatePricing()` 加入競態防護 guard（未載入時鎖計算，防 0 成本提交）
- ✅ **[W1]** 加入 `chargedPositions Set` 跨陣列同部位已畫圖追蹤；同部位跨產品（鎖匙扣+吊飾）第 2 件免畫圖費
- ✅ **[DE-HARDCODE]** 畫圖費 240/110/110/60 → 讀 `_cc.drawing_cost_*`（fallback 保留原值）；配件 accessories 不再意外計入畫圖費
- ✅ **[NEW]** 頸鏈成本：`Math.ceil(吊飾數/2) × _cc.necklace_chain_cost`（$100）計入 System_Total_Cost
- ✅ **[NEW]** 多件運費扣減：鎖匙扣 `(件數-1)×$20`、吊飾 `(件數-1)×$35`，全讀 config
- ✅ **[DE-HARDCODE]** 混合成員附加費 $300 → 讀 `_cc.mixed_member_surcharge`
- ✅ **[W4]** Shadow kill-switch `window.USE_LEGACY_COST_LOGIC`；新舊差值寫 `console.warn`

### Supabase Migration 0025
- ✅ **[NEW]** `0025_cost_atoms_seed.sql`：補入 3 個缺失 key（`necklace_chain_cost=100`、`charm_shipping_deduction_per_extra=35`、`mixed_member_surcharge=300`）
- ✅ **[FIX]** `keychain_shipping_deduction_per_extra` description 修正：語義從「行數」改為「件數 SUM(quantity)」

### n8n V47.14（已部署）
- ✅ **[FIX P0]** Calculate Profit & Pack Items：`keychainItemCount++`（行數）→ `+= Original_Qty`（件數），對齊 Finance Bible §2.5 P0 修正

### Schema 文件
- ✅ `FHS_Product_Cost_Schema_v2.md`：17 keys → 20 keys，新增 0025 三個 key 條目

**尚待 Fat Mo 執行**：Supabase SQL Editor 部署 `0025_cost_atoms_seed.sql` → 驗證 smoke test PASS

**尚待 Fat Mo 驗證（Live）**：V1–V10 驗收清單（W5 Slow-3G / W1 同部位免畫圖 / W2 #0600007=$455 / W4 shadow 比對）

**current.html 同步**：待 Live 驗證全通過後授權

---

## [2026-06-02] 🔧 P0 — Finance Bible G1–G7 位置依賴成本規則修正（Session 52）

**核心變化**：Finance Bible v1.1.0 → v1.2.0，修正長期缺失/錯誤的成本計算規則。

- ✅ **[FIX G1]** `FHS_Finance_Bible.md`：鎖匙扣運費扣減公式修正 `(行數-1)×$20` → `(總件數-1)×$20`（件數≠行數，舊公式是 BUG）
- ✅ **[FIX G1]** 同步修正吊飾「無扣減」錯誤標注 → 吊飾亦有 `(總件數-1)×$35` 扣減
- ✅ **[NEW G2]** 補入「同部位首件含畫圖費，第2件起免畫圖」位置依賴成本核心規則
- ✅ **[NEW G3]** 補入跨產品同部位免畫圖規則（鎖匙扣+吊飾同部位，後加者亦免畫圖）
- ✅ **[NEW G4]** 補入吊飾頸鏈奇偶規則（1鏈最多2飾，奇數件加頸鏈$100，偶數件免）
- ✅ **[NEW G5]** 補入吊飾運費扣減公式 `(總件數-1)×$35`
- ✅ **[FIX G6]** 釐清 Airtable Clasp欄位對吊飾=頸鏈（非扣夾），現行$100（舊$70已過時）
- ✅ **[NEW G7]** `.fhs/memory/learnings.md`：補入4條財務 pitfall 防止再遺忘
- ✅ 持久記憶已更新（`project_cost_calculation_rules.md` + `feedback_finance_rules_must_be_recorded.md`）

**驗算範例已固化（訂單 #0600007 鎖匙扣）**：左手×1 + 右手×2 → $185+$185+$125-$40 = **$455**

**下步**：P1 成本邏輯憲法化（獨立新 session）

---

## [2026-06-01] 📚 B 任務完成 — FHS 財務知識守門員建立（Session 50）

**核心變化**：財務知識從「三份文件並列宣稱唯一真理」整合為「兩層清晰架構 + 守門員」。

- ✅ **[NEW]** `.fhs/notes/FHS_Pricing_Bible.md` v1.0.0（L2 現行定價 HEAD）：合併 pricing_reference v2.0.0 + Product_Bible §0/§2.5，涵蓋所有售價公式、品牌禁止邏輯、繪圖成本、生產成本結構、折扣機制
- ✅ **[NEW]** `.fhs/ai/skills/finance-gatekeeper/SKILL.md` v1.0.0：任何財務任務前強制載入，提供查詢路由表 + L1/L2 衝突解決 + 5 條財務死線
- ✅ **[DEPRECATED]** `product_pricing_reference.md`：內容已移至 FHS_Pricing_Bible.md
- ✅ **[DEPRECATED]** `FHS_Product_Bible_V3.7.md`：多項定價規則已過時（Session 48 移除異部位費），品牌邏輯已移植
- ✅ **[DEPRECATED]** `finance-calculator/SKILL.md`：已整合至 finance-gatekeeper
- ✅ `FHS_Finance_Bible.md`：加 L1 Authority header + §十 加 Step 0（讀 gatekeeper 為強制前置）
- ✅ `finance-auditor.md`：啟動前置加 Step 0（讀 finance-gatekeeper SKILL）
- ✅ `repo-map.md` + `FHS_Prompts.md` 同步

**架構**：L1 Finance_Bible（架構不變量）← L2 FHS_Pricing_Bible（現行定價）← 守門員 SKILL（路由）

## [2026-05-31] 🧪 Phase 2+3 Live 驗證測試完成 — VT-P1~P4 計價驗證 + VT-U1~U6 UI 驗證（Session 49）

**驗證結果**：
- ✅ **10項驗證測試全數通過 (10/10 PASS)**：包含計價邏輯與付款拆分 UI 自動化驗證。
- ✅ **VT-P1 吊飾倒模計價**：確認 $1980/$2980/$4960 價格區間及 Right Foot 取消選取共 3 個之計價正確。
- ✅ **VT-P2 吊飾 P系列計價**：1個 $2280、2個 $3280、3個 $4920、4個 $6560 全數正確。
- ✅ **VT-P3 鎖匙扣**：左手/右腳/左腳無異部位費確認正確 ($860/$1720/$2580)。
- ✅ **VT-P4 925銀/金同價**：確認均為 $2280 正確。
- ✅ **VT-U1 吊飾兩部位合一格**：確認 M-only 與 P+M 均正確合併渲染為「頸鏈① 一對」。
- ✅ **VT-U2 3個吊飾顯示2格**：確認正確顯示「頸鏈① 一對」$2980 與「頸鏈② +1隻」$1980。
- ✅ **VT-U3 ⚡ 照數填入 + 清除**：確認點擊後自動填入及清除功能正確。
- ✅ **VT-U4 未付尾數金額自動計算**：手動鍵入 $500 訂金時，尾數自動計為 $3360 正確。
- ✅ **VT-U5 下張起始編號搬移確認**：確認從財務參數設定中心設定 `te099` 起始號能成功生成 `te00100`。
- ✅ **VT-U6 iPhone Drawer 設定頁空白確認**：手機端設定抽屜鏡像顯示為空殼，與 V41 設定對齊。

**自動化測試產出**：
- 腳本位置：`scratch/run_live_tests.js`
- 報告位置：`artifacts/live_verification_report.md`

---

## [2026-05-31] 🔧 T5 補強 — 同步出口收斂 + 按鈕引導文案（Session 49）

**修改**（`freehandsss_dashboardV41.html`）：
- 桌面 `syncBtn`（🚀 同步至後台）設 `display:none`，取消直接同步入口（ID 保留）
- 桌面 `btnReviewIgMsg`：「🔍 查閱訂單訊息」→「✅ 審閱並完成訂單」+ tooltip 說明流程
- 手機 `v40-bottom-bar`：移除獨立「🔍 查閱」，主按鈕 `v40-submit-btn` 改 `onclick=openIgPreviewModal()` + 文字「✅ 審閱並完成」（取消手機直接 syncToAirtable）
- 結果：桌面與手機統一，**唯一同步出口為查閱 Modal 內的「🚀 同步」**，強制先審閱

current.html 同步：✅ 684,563 bytes

---

## [2026-05-31] 🔧 T5 複製+同步流程重構 — 查閱訂單訊息 Modal 為唯一出口（Session 49）

**修改**（`freehandsss_dashboardV41.html`）：
- 移除主畫面 `btnCopyA`（複製手模）/ `btnCopyB`（複製金屬）的 show 邏輯（ID 保留、DOM 不刪）
- 移除手機版 `v40-bottom-bar` 的「📋 複製」按鈕
- 新增 `_fhsIgCopyState`（狀態機）+ `_updateIgCopyUI()`（按鈕 UI 同步）
- `igpmCopySegment` 複製後更新 `copiedA/B` 狀態並反映至按鈕文字
- `igpmSyncOnly` 同步後設 `synced=true`，igpmSync 鈕顯示「✅ 已同步」防雙重 sync
- `resetForm` 起始重置狀態機，確保新訂單恢復初始狀態

current.html 同步：✅ 684,597 bytes

---

## [2026-05-31] 🎨 Phase 3 介面優化 — 付款拆格頸鏈組化 + 三色分區 + 快捷填入 + 編號設定搬移（Session 48 Phase 3）

**修改**（`freehandsss_dashboardV41.html`）：
- **T0+T1** `renderPaymentSplits`：吊飾格改以 `necklace_N` boxKey 頸鏈組渲染（一對/+1隻）；舊 TEMP_M_* key 靜默忽略不崩潰
- **T2** 每格加 `⚡` 快捷填入建議金額按鈕（新增 `_quickFillSplitBtn`，window 暴露）
- **T3** 三色方案 A：報價明細分類標題（暖橙/鋼灰/銀紫）+ split-box label 底色
- **T4** `seqSetRow` 從訂單區 `fatmoConfigPanel` 移至 `financialSettingsCard` 底部
- `_syncBalanceFromDeposit`：補 necklace_N boxKey 同步邏輯（避免吊飾格 balance 不更新）
- `calculatePricing`：新增 `window.fhsNecklaceGroups` 陣列（每條頸鏈的 label/price/boxKey）

**已知限制**：`fatmoConfigPanel` 現為空殼，手機 Drawer settings tab 暫顯空（不影響主功能）

待同步：current.html（需 Fat Mo Live 驗證後授權）

---

## [2026-05-31] 🔧 吊飾售價計算修正 — 頸鏈組計價 + 移除錯誤費用（Session 48 Phase 2）

**修正 5 個 Bug**（`freehandsss_dashboardV41.html`，`calculatePricing()`）：
- **Bug 1** 移除 $1,000 首飾單購圖紙費（P系列每單虛增 $1,000）
- **Bug 2** P系列 qty=2 由 $3,080 修正為 $3,280
- **Bug 3+5** 吊飾改用「總吊飾數合併 → 頸鏈組計價」：
  - 倒模：1個=$1,980 / 2個=$2,980，之後每組重新計算
  - P系列：1個=$2,280 / 2個=$3,280；額外1個=$1,640 / 額外2個=$3,280
  - 多部位（如左手+右腳）合併計算，不再各自獨立定價
- **Bug 4** 移除異部位建模費 $100/$300（吊飾與鎖匙扣均不收）
- 925銀 / 925金 售價相同（維持現狀，代碼本已正確）

待同步：Phase 3（付款拆格 N格 UI）待 Fat Mo 確認；current.html 待授權

---

## [2026-05-31] 🔧 Category B IG 訊息【付款資料】格式修正 — 對齊 Category A pureNumeric 格式（Session 48）

**問題**：Category B（金屬產品）IG 訊息的付款行顯示帶品名標籤（`品名$金額+品名$金額=$總和`），與 Category A v2（pureNumeric 格式 `金額1+金額2=$總和`）不一致。

**修改**（`freehandsss_dashboardV41.html`）：
- 新增 `finInfoB` 變數，付款行改傳 `pureNumeric=true` 至 `_buildSplitIgLine()`
- `combinedB` 改用 `finInfoB`（原 `finInfo` 僅保留給 Category A v1，不受影響）
- 付款行 prefix 由 `未付產品尾數` 改為 `未付尾數`，對齊 Category A v2 命名

**影響範圍**：Category B IG 訊息預覽；Category A v1/v2 輸出不變；captureFormState 不動。

待同步：current.html（需 Fat Mo /execute 授權）

---

## [2026-05-30] 🏗️ Phase 2 指令精簡 — vendor 方法論移植 + 7 command 退役（Session 47）

**方法論移植（subagent 升級）**：
- `build-error-resolver` v1.0.0 → v1.1.0：description 加 root-cause-first；嵌入 4 階段根因調查協議 + Five-Whys 觸發條件（指向 systematic-debugging.md）；財務欄位豁免條款
- `code-reviewer` v1.1.0 → v1.2.0：新增 5 維度代碼分析框架（sequential-thinking 工具觸發）
- 兩個 subagent 同步至 `~/.claude/agents/freehandsss/`

**AGENTS.md v1.4.8 → v1.4.9**：新增 Rule 3.15「根因調查強制律」（含安全閥 + 財務豁免）

**刪除（共 15 個檔案）**：
- Master ×7：px-plan / px-audit / five / debug-guide / code-analysis / mermaid / tdd-guide（指令）
- CL橋接 ×7：同上
- AG橋接 ×1：px-plan

**更新**：FHS_Prompts.md（7 個情境改為 AI 自動執行說明）、repo-map.md（退役標記）、README.md（場景速查表）

設計決策：見 decisions.md [2026-05-30] Phase 2

---

## [2026-05-30] ♻️ Phase 1 指令精簡 — rp-flow 刪除 + ag-flow 新建 + 精煉內建（Session 46）

**刪除**：`rp-flow.md`（Master + CL×3 + AG×3，共 7 個檔）
**新建**：`ag-flow.md`（Master + CL + AG，共 3 個檔）
**修改**：`cl-flow.md` v2.2 / `cl-flow-fast.md` v1.1 — /rp 精煉內建為 Step 0
**修改**：`rp.md` v2.3 — 移除 rp-flow 引用，更新關係說明與 Compatibility Map

設計決策：
- /rp 精煉為所有管道的預設第一步（內建，不可跳過）
- 命名邏輯：指令名 = 最終裁決者（cl-flow=Claude / ag-flow=AG / rp=無裁決）
- rp-flow 三兄弟為純包裝糖，功能已由 cl-flow/cl-flow-fast/ag-flow 涵蓋

---

## [2026-05-30] 🚀 /rp-flow 精煉管道串聯 v1.0.0（Session 44c — 四變體/Gate/verdict批評/反奉承內建）

**新建檔案**：`.fhs/ai/commands/rp-flow.md`、`.claude/commands/rp-flow*.md` ×3、`.agents/workflows/rp-flow*.md` ×3

- **四變體**：`/rp-flow`（A1+A2+A3）/ `--review`（+Gate2）/ `-fast`（輕量）/ `-ag`（A1+A2，ag-plan 為裁決，跳過 A3）
- **Gate 1**：所有變體強制停，Fat Mo 審閱 XML 後 Y 才繼續
- **verdict_critique / plan_critique**：批評移至最終輸出層
- **/execute 永遠手動**：AI 絕不自動觸發，遵 execute.md 硬規則

**rp.md v2.2 補丁**：`<self_critique>` → `<structural_warning>` + FHS 資源目錄 + 反奉承守則內建

---

## [2026-05-30] ✏️ IG Modal 即時編輯（Session 45）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

- `igpmPreA`/`igpmPreB`：`<pre>` → `<textarea>`（可直接在 Modal 打字）
- `_igpmRefresh()` 改 `.value`；`igpmCopySegment` 讀 Modal textarea 複製已編輯文字
- CSS 加 `resize:vertical`/`:focus` 高亮；移除舊導流提示
- `output-preview-a/b`、`syncToAirtable`、`captureFormState` 全部不動
- current.html 同步（674,173 bytes）

---

## [2026-05-30] 🔧 /rp 指令升級 v2.2（Session 44 — 三變體/8維度掃描/Pipe模式/FHS自動注入）

**修改檔案**：`.fhs/ai/commands/rp.md`、`.claude/commands/rp.md`、`.agents/workflows/rp.md`、`docs/FHS_Prompts.md`、`docs/repo-map.md`

- **三變體**：`/rp`（標準）/ `/rp cl-flow`（Pipe 組裝）/ `/rp cl-flow-fast`（輕量），分別對應「精煉+掃描+批評 / 加 cl-flow 簡報停等 / 輕掃描跳批評」
- **8 維度掃描常駐**：perf / ux_mgmt / conflict / token / long_term / responsive / subagent_skill / history；其中 conflict / token / history 三維度強制 [相關]（有 [強制·低] 逃生門）
- **Pipe 模式**：`/rp cl-flow` 由用戶明確輸入觸發（不違反 Exempt 規則），開頭強制標頭防誤觸發，乾式組裝後停等 /execute
- **FHS 系統自動注入層**：5 個關鍵詞觸發固定前提注入（Supabase/n8n/Dashboard/訂單/財務），免 Fat Mo 每次手填
- **移除純文字版**：XML 本身即供審閱格式；PL 使用 Markdown 格式（非 XML）
- **自我批評封頂**：≤3 點 × 1 行；fast 變體跳過
- **Compatibility Map v2.2**：Exempt 禁 AI 主動建議，用戶明確 pipe 允許（語義不衝突）
- 動態 Pipe 判定（v2.2 弱點1修正）：改為讀取 commands/ 目錄存在性判定，不維護白名單

---

## [2026-05-30] ✨ IG Modal 三需求修正（flow 2026-05-30-1248）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

- **需求① Category A 付款行純價錢**：`_buildSplitIgLine` 加第 4 參數 `pureNumeric`；v2 呼叫傳 `true` → 純數字相加格式（如 `2380+860=$3240`）；v1 呼叫不傳，維持舊明細（C2 隔離）；Category B 不受影響
- **需求② Modal 複製鈕拆分**：移除舊「複製並同步」合併鈕；改「複製A(手模)」`#igpmCopyA` + 「複製B(金屬)」`#igpmCopyB` + 「同步」`#igpmSync` 三鈕；新增 `igpmCopySegment` / `igpmSyncOnly`，複製與同步解耦，零雙寫
- **需求③ Defer**：Modal 加導流提示「如需修改訊息文字，請至訂單總覽開啟訂單進行編輯」（saveOrderText 新單不適用）
- code-reviewer Gate G1–G8 全 PASS；current.html 同步（673,722 bytes）
- tooling 同步修復：`scripts/validate-ag-plan.js` 加 `require.main===module` 守衛（防 cl-flow-runner require 時誤觸發 exit）

---

## [2026-05-30] ⚙️ cl-flow 協調器強化（Session 43 — 模型配置化 + 格式守護 + context 優化）

**修改檔案**：`scripts/cl-flow-runner.js`、`scripts/validate-ag-plan.js`（新增）、`.env`、`.env.example`

- **Phase 1 — 模型配置化**：`callGemini()` 的模型 ID 從 hardcode `gemini-3.5-flash` 改為讀取 `process.env.GEMINI_A2_MODEL_DEFAULT`（fallback 至 `gemini-3.5-flash`）；`.env` 新增 `GEMINI_A2_MODEL_DEFAULT=gemini-3.5-flash`；`.env.example` 同步補入說明
- **Phase 3 — ag-plan 格式守護**：新增 `scripts/validate-ag-plan.js`（6 項必要 section 檢查 + checkbox + 檔案標記），`cl-flow-runner.js` 在 ag-plan 寫入後自動呼叫；格式不符時 WARN 繼續（不阻斷流程）
- **Phase 4 — repomix context 優先級**：repomix 指令從 dump 全倉庫改為 include 優先路徑（`scripts/`、`supabase/migrations/`、`SOP_NOW.md`、`handoff.md`），排除 `Obsidian/`，提升 AG Prompt signal/noise 比

---

## [2026-05-30] ✨ IG 訊息預覽 Modal 重設計（Session 42 — flow 2026-05-30-0240）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**UX 改動**：移除常駐固定預覽框架，改為按需彈窗查閱 IG 訊息。

- HTML：`preview-card` 加 `id="legacyPreviewCard" style="display:none;"`（隱藏舊框架；`output-preview-a/b` textarea **保留 DOM**，仍為 payload 唯一資料源）
- HTML：桌面 `#bottomActionBar` 新增 `#btnReviewIgMsg`（查閱訂單訊息）按鈕；手機 `#v40-bottom-bar` 新增「🔍 查閱」按鈕
- CSS：新增 `#igPreviewModalOverlay` / `#igPreviewModal` 樣式（桌面置中 Modal、手機 bottom-sheet）
- HTML：新增 IG Preview Modal（`#igPreviewModalOverlay`）含 A/B 分段 `<pre>` 區、`#igFmtToggleAModal` 格式切換、`#igPreviewModalCopySync` 複製並同步鈕
- JS（新 `<script>` IIFE）：`window.openIgPreviewModal()`（force-refresh generate + 讀 textarea 注入 Modal）/ `window.closeIgPreviewModal()` / `window.igpmToggleFmt()` / `window.igPreviewCopyAndSync()`（複用 copyMessageA/B + syncToAirtable，零新寫入路徑）
- code-reviewer Gate G1–G8 全 PASS
- current.html 同步完成（672,050 bytes）

---

## [2026-05-30] 🧹 編號模式 UI 簡化（Session 41e）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- HTML：移除「🛠️ 編號模式 (Fatmo 專屬)」標題行 + `btnIdModeRandom`/`btnIdModeSeq` 按鈕組；`seqSetRow` 預設 `display:flex`（不再隱藏）
- JS：`syncConfigUI` 簡化為只更新 `nextSeqIdInput.value`，並在內部強制 `mode='sequential'`；移除 `setIdMode` 函式
- `systemConfig.mode` 預設值 `"random"` → `"sequential"`（硬鎖，隨機模式徹底廢棄）
- Session 41d Fix A/B/C 不受影響（`nextSeqIdInput`/`saveSeqSettings`/`generateOrderID` 均保留）

---

## [2026-05-30] 🐛 Order_ID 亂碼修復 + 碰撞保護（Session 41d）

**根因**：`loadSystemConfig()` 在 Supabase mode (`fhs_supabase_read=1`) 下跳過 n8n config 讀取，sessionStorage cache 30 min 後過期 → 回退硬編碼 `mode:"random"` → 生成隨機 ID（如 `0614227`）。

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

- Fix A：`saveSeqSettings()` 同時寫 `localStorage('fhs_sysconfig_persistent')`（持久，無 TTL）
- Fix B：`loadSystemConfig()` Supabase mode 分支，讀 localStorage 持久設定，再 fallback 硬編碼 default
- Fix C：新增 `_checkIdExists(id)`（Supabase REST 靜默查詢）；`generateOrderID()` sequential mode 加碰撞迴圈（最多 50 次 +1），找到未用 ID 後更新 `systemConfig.last_id` 並持久化至 localStorage

---

## [2026-05-30] ✨ 介面優化 T1/T2/T3（Session 41c）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**T1 訂單類型預設值**：`resetForm()` 末尾 `_syncOrderTypeUI(false)` → `selectOrderType('yes')`，新增訂單預設「是 — 含取模服務」並自動開啟立體擺設；edit 模式靠 restoreFormState 覆蓋，舊單不受影響。

**T2 消除 number input 箭頭**：加入全域 CSS `::-webkit-spin-button { -webkit-appearance:none }` + `appearance:textfield`，覆蓋 WebKit/Firefox/標準，split-box-input 一併受惠。

**T3 羊毛氈/燈飾條件顯示**：兩個 `.part-item` 加 `id="woolAddonRow"/"lightAddonRow"` 預設 `display:none`；新增 `_syncAddonVisibility()` 函式（`pSubCat==='玻璃瓶款式'` 才顯示，切換回木框自動取消勾選）；掛入 `#pSubCat` onchange + `resetForm()` renderLimbGrid 後。P7 pitfall 安全：hide+uncheck → payload 不帶 addon。

---

## [2026-05-30] 🐛 已付訂金→未付尾數自動連動修復（Session 41b）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `recalcSplitSum('deposit')` 尾端加 `_syncBalanceFromDeposit()` 觸發
- 新增 `_syncBalanceFromDeposit()`：依 boxKey 1:1 對應，balance[item] = CalculatedPrice − deposit[item]（最低 0），再呼叫 `recalcSplitSum('balance')`
- 無遞迴風險（deposit → balance 單向）；零 migration；不動其他結構

---

## [2026-05-30] 💳 付款拆分 Phase 2 — item 級 N 格動態拆分（Session 41）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**架構決策**：
- D1=item 級（無上限方格，依 fhsCurrentPricingItems 逐項）
- D2=已付訂金＋未付尾數各 N 格
- D3=取代 Session 40 尾數算式字串，舊單 fallback 單格
- 已付全數（#depositFull）移除，釋放空間

**變更清單**：
- **移除**：`#depositFull` UI div、`onDepositFullInput/Blur`、`onBalanceInput`、Session 40 payload depositFull 邏輯
- **UI**：`#deposit`/`#balance` 改 `type=hidden`（numeric 總和）；新增 `#depositSplitContainer`/`#balanceSplitContainer`（動態方格）；新增 `#depositSplitData`/`#balanceSplitData`（hidden JSON，by-id 自動進 captureFormState）
- **CSS**：新增 `.payment-split-row`/`.split-box`/`.split-plus`/`.split-sum-display`（flex-wrap + 手機 75px 緊湊格）
- **JS 核心**：`_boxKey(item,index)`（boxKey=OIK#PartDesc#target）、`renderPaymentSplits(field)`（保留舊值、預填 CalculatedPrice）、`recalcSplitSum(field)`（只加總不重建 DOM）、`serializeSplits(field)`、`restoreSplits()`
- **整合**：pricing 引擎完成後呼叫 `renderPaymentSplits`；`restoreFormState` 尾 `setTimeout(restoreSplits,80)`；`generate()` 簡化取值；`buildCategoryA_v2` + `finInfo` 改 `_buildSplitIgLine()` 輸出 `品A$X+品B$Y=$總和` 格式
- **payload**：Deposit/Balance 回歸 `Number(el.value)||0`（hidden numeric）
- **送出前校驗**：auto-correct split sum → hidden value
- **code-reviewer Gate**：G1–G8 全 PASS ✅
- **零 migration**：明細存 raw_form_state，Supabase deposit/balance 維持數值

**未同步 current.html**：待 Fat Mo 授權

---

## [2026-05-29] 💳 付款結算欄位重構 Phase 1（Session 40）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`：
  - **UI**：新增 `#depositFull`（已付全數）欄位；`#deposit` label 改「已付訂金」；`#balance` 改 `type=text inputmode="text"`（支援計算式字串）；三欄均新增 eval-display span
  - **IG v2 預覽**：`buildCategoryA_v2` 新增 `depositFull` 參數，付款區改三行輸出（`*已付全數`、`*已付訂金`、`*未付尾數：算式=$總和`）
  - **IG v1 預覽**：`finInfo` 補入「已付全數」行；balance 以 evalSimpleMath 數值顯示
  - **generate()**：新增 `depFullEl / depositFull` 取值
  - **payload**：`Deposit` 改 D1 全數優先邏輯（full>0 取 full，否則取 deposit）；`Balance` 改用 `evalSimpleMath` 確保算式字串轉數值
  - **eval 函式**：新增 `onDepositFullInput/Blur`、`onBalanceInput`（算式即時顯示；balance blur 保留算式字串不覆寫）
  - **restoreFormState**：`_isFinField` 加入 `depositFull`（0→空 特例）
  - **Update_Note labelMap / moneyFields**：補入 `depositFull`

**設計決策（D1 預設）**：已付全數/訂金互斥，full>0 取 full，否則取 deposit；balance 保留算式字串不在 blur 覆寫。
**零 migration**：算式原始字串存於 `Raw_Form_State`，Supabase `balance` 欄維持數值。

**未同步 current.html**：待 Fat Mo 授權

---

## [2026-05-29] 🖼 Category A 手模擺設 IG 訊息新版格式 + 一鍵版本切換（Session 39）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`：
  - 新增全域 flag `igFormatVersionA`（'v1' 原版 / 'v2' 新版，預設 v2，localStorage 持久化）
  - 新增 `formatBabyLimbsInline()` / `formatLimbsInline()`（v2 專用 inline 手腳格式）
  - 新增 `buildCategoryA_v1()`（原版逐字保留）/ `buildCategoryA_v2()`（新版精簡格式）
  - 新增 `toggleIgFormatA()` + `#igFmtToggleA` 切換按鈕（preview-box-a 標題列）
  - `generate()` Category A 區塊改為雙版本分流；同步按鈕標籤

**v2 新版格式要點**（只影響 Category A 手模擺設，Category B 零影響）：
- 移除 `Freehandsss 訂單確認` 首行；訂單編號改全形括號無空格
- 移除 section headers（產品資訊/付款資料/免責聲明），客人名移至產品後
- 產品行 `*倒BB ：` / `*木框：` / `*相+聲頻：`(留空) / `*皮革刻制：`
- 免責改 ⭐️ bullet，新增「花材批次」「作品不包照片」，移除木框保養/感謝語
- 隔離設計：v2 不碰共用 custInfo/finInfo/disclaimer，B 段分割錨點仍正確

**Defer（列入待辦，下 session 優化設定後處理）**：
- 已付全數 / 已付訂金 拆兩行（目前 v2 維持單行 `*已付訂金/全數：$X`）
- 未付尾數計算式輸入欄（目前 v2 維持純數字 `*未付尾數：$X`）

**未同步 current.html**：待 Fat Mo 授權

---

## [2026-05-29] 🛠 Supabase 架構整固 + 中文 COMMENT 補全（Session 38）

**新增檔案**：
- `supabase/migrations/0023_main_products_seed.sql`（G4：30 個主力 SKU 靜態 seed，ON CONFLICT DO NOTHING）
- `supabase/migrations/0024_recalc_completed_at.sql`（G6：orders.last_recalc_completed_at + fhs_batch_recalc_execute v2）

**修改檔案**：
- `.fhs/ai/FHS_Finance_Bible.md`（G3：getItemCategory 示例 '銀飾' → '純銀頸鏈吊飾'，含表格同步）
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`（同步 V41，645,139 bytes）
- `.fhs/memory/handoff.md`（Session 38 完成記錄）

**Supabase 直接執行（SQL Editor）**：
- 驗證 Migration 0022a/0022b 已部署（欄位存在 + addon $30 確認）
- 補建 0020 缺漏 PART 2/3/4/5/6（financial_batch_logs + recalc_requested_at + 3 RPC）
- 補建 0022b 4-param 樂觀鎖 fhs_upsert_cost_config
- 刪除 `cost_configurations_v1`（解 FK + 重建 v_order_cost_breakdown v2.1）
- 執行 0023 主力產品 seed（30 SKUs）
- 執行 0024（last_recalc_completed_at 欄位 + RPC v2）
- 全表欄位中文 COMMENT 補全（orders / order_items / products / cost_configurations / financial_batch_logs / sales_pipeline / error_logs）
- ALTER VIEW security_invoker（消除 UNRESTRICTED 警告）

---

## [2026-05-29] 🔧 Smart Cache V47.13 — BASE_PREFIXES 補全（Session 37 hotfix）

**修改節點**：
- n8n `Smart Cache Strategist` V47.12 → V47.13（workflow `6Ljih0hSKr9RpYNm`）

**變更內容**：
- `BASE_PREFIXES` 補入 `成人(P)鎖匙扣 - 鋁合金` 和 `成人(P)吊飾 - 925金`（G1/G2 空缺修補）
- 此前兩個 SKU 走 exact-match fallback，現升為 prefix-match，支援未來衍生 SKU 變體

**觸發來源**：產品可追溯性稽核（5 層矩陣審計，2026-05-29）

---

## [2026-05-28] 💰 財務設定 Schema v2.1 上線（Session 37）

**新增檔案**：
- `supabase/migrations/0022a_cost_config_v2_schema.sql`（17-key schema：4 新欄位 + v1 key 遷移 + 11 新 key）
- `supabase/migrations/0022b_cost_config_v2_rpc.sql`（樂觀鎖 RPC + 3-param 重載 + fhs_sync_products_from_config）
- `.fhs/ai/FHS_Product_Cost_Schema_v2.md`（產品成本知識庫 Core 文件 §0-§9）
- `.fhs/ai/FHS_Product_Cost_UI_Spec.md`（Desktop + Mobile 財務設定 UI 規範）
- `.fhs/ai/FHS_Product_Cost_Operations.md`（RPC / 並發 / 回滾 SOP）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（`loadCostConfigurations` + `saveSingleCostConfig` + `_showCostConflictModal` v2.1 改寫）
- `.fhs/notes/addon_product_sop.md`（解除舊警告，v2.1 後 addon SKU 已存在 products 表）

**新功能**：
- 成本設定 UI 改為 5-GROUP accordion 分組顯示（17 欄位）
- `fhs_upsert_cost_config` 升級為 4-param 樂觀鎖版本（`SELECT FOR UPDATE` 消除 TOCTOU）
- 保留 3-param 舊簽名重載（向後相容）
- `fhs_sync_products_from_config` RPC：cost_config → products.total_base_cost 鏡像同步（advisory lock 防並發）
- 衝突 Modal：版本衝突時提供「重新載入」/「強制覆寫」兩個選項
- batch recalc 進行中時前端自動鎖定欄位 + banner 提示

**架構決策**：
- 加購配件 α 方案：SKU 直接存 products 表（0014/0019 已有，0022b 同步 $30）
- display_group γ 方案：schema-time 固定值（CHECK constraint），不需 RPC 傳入
- v1 key 重命名遷移（wool_felt_addon_cost → addon_cost_wool_felt 等）
- β 混型訂單（成人P+嬰兒S）Phase 2 defer

---

## [2026-05-28] 💰 財務批量重算工作流上線（Session 36）

**新增檔案**：
- `supabase/migrations/0021_batch_recalc_execute_rpc.sql`（`fhs_batch_recalc_execute` RPC）
- `scripts/deploy_batch_recalc_workflow.js`（n8n workflow 建立腳本）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（`_FS_N8N_WEBHOOK` 填入 URL）
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`（同步自 V41，637,625 bytes）

**新功能**：
- n8n `💰 Financial Batch Recalculate` workflow 上線（ID: `b31HncCglmXooM4F`）
- `fhs_batch_recalc_execute(UUID)` Supabase RPC：從 `products` 表重讀成本，套用 V47.12 邏輯，更新 `order_items` + `orders` 財務欄位，清除 `recalc_requested_at`
- `_FS_N8N_WEBHOOK` 已填入：`https://yanhei.synology.me:8443/webhook/fhs-financial-batch-recalc`

**架構**：
- Webhook → HTTP Request（call `fhs_batch_recalc_execute`）→ Respond（3 節點）
- `final_sale_price` 永遠不修改（前端真理守護）
- 鎖匙扣多件折扣 (N-1)×$20 同步套用（Product Bible V3.7 §2.5）
- 部分訂單失敗不影響其他訂單（逐筆 `EXCEPTION WHEN OTHERS`）

---

## [2026-05-27] 💰 財務設定系統實作（Session 34b — cl-flow 2026-05-27-2105）

**新增檔案**：
- `supabase/migrations/0020_financial_settings_system.sql`（cost_configurations + financial_batch_logs + recalc_requested_at + 3 RPC）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（11,006 行，+財務設定 Card UI + JS 模組）

**新功能**：
- ⚙️ 系統模式新增「💰 財務參數設定中心」Card（QA 中心之前）
- 成本參數即時讀寫（`cost_configurations` 表，6 個預設 key）
- 批量重算引擎（桌面限定，手機 CSS 隱藏）：範圍選擇 + 影響預估 + CONFIRM 安全鎖
- `window.getOrderCost(key, fallback)` 全域快取讀取函式（供訂單建立邏輯使用）
- `window._fhsCostConfig` 全域成本快取（進入系統模式時自動載入）
- `recalc_requested_at` 新欄位（避免觸發 0018 Airtable sync trigger）

**架構決策**：
- RPC 不直接呼叫 n8n（避免 pg_net 依賴）；前端 JS 在 RPC 成功後呼叫 n8n Webhook
- iPhone Drawer 唯讀（批量重算按鈕 `#batchRecalcSection` 手機隱藏）
- 所有 JS 嵌入 HTML，符合 AGENTS.md §3.1 單一檔案架構規則

**待 Fat Mo 操作**：
1. Supabase SQL Editor 執行 Migration 0020
2. 確認/更新 cost_configurations seed 成本數值（目前全 `0`）
3. 建立 n8n `💰 Financial Batch Recalculate` 工作流，提供 Webhook URL
4. A3 填入 `_FS_N8N_WEBHOOK` 後同步 current.html

---

## [2026-05-27] 🚀 Migrations 部署 + current.html 同步（Session 34）

**部署**：
- `supabase/migrations/0017_save_structured_items_rpc.sql` → Supabase ✅
- `supabase/migrations/0018_protect_overridden_text.sql` → Supabase ✅
- `supabase/migrations/0019_add_light_addon_product.sql` → Supabase ✅
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html` → V41 同步（619,006 bytes）✅

**生效功能**：Modal 3-tab + Mode 2 結構化明細編輯器 + inline 刻字編輯 + 燈飾加購配件支援

---

## [2026-05-27] 💡 燈飾加購配件完整整合（Session 33 — /new-product 五步流程）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（11 項改動：checkbox / 計價 / IG預覽+燈後綴 / webhook / dimensions / deriveCat / _isAddon+_addonType重構 / 雙Badge / _mode2ItemLabel I3修補）
- `supabase/migrations/0019_add_light_addon_product.sql`（新建，⚠ 待 Fat Mo 部署）
- `n8n/FHS_Core_OrderProcessor_live.json`（V47.12：Parse Items 燈飾 normalization + Calculate Profit getItemCategory 燈飾→配件）
- `.fhs/reports/planning/a2_implementation_plan.md`（C1 欄位修正記錄）

**架構升級**：
- `_woolKey` 單一假設 → `_isAddon()` + `_addonType()` 通用雙配件過濾（向後兼容）
- Smart Cache Strategist V47.12 已是 Supabase live query，migration 部署後自動命中，無需修改
- IG 預覽：燈飾顯示為 `底座顏色：仿古木+燈`（附在款式行），非獨立行

---

## [2026-05-27] ✨ 編輯系統 v2 雙模式重構（Session 32 — cl-flow 2026-05-27-1311）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（Modal 3-tab + Mode 2 + inline 刻字）
- `supabase/migrations/0017_save_structured_items_rpc.sql`（新建）
- `supabase/migrations/0018_protect_overridden_text.sql`（新建）
- `n8n/FHS_Core_OrderProcessor_live.json`（節點重命名 V47.11 + jsCode 備注）

**根因修復**：`saveOrderText()` 只 PATCH `orders.full_order_text`，不動 `order_items`；訂單總覽刻字欄讀自 `order_items.engraving_text`，文本編輯後總覽刻字不更新。

**新功能**：
- **3-tab Modal**：📝 訊息文本 / 🛠 訂單明細 / 💰 財務（替換原 `openOrderModal()`）
- **Mode 2 結構化明細編輯器**：Lazy-load `order_items`，逐 item 卡片編輯規格/刻字/數量，`save_structured_order_items` RPC 原子化寫入
- **`_prevItemMap` 保護**：RPC DELETE+INSERT 前快照 `batch_number`/`process_status`，COALESCE 還原
- **Dirty-diff**：`_hashMode2()` 比對，hash 不變禁用存按鈕
- **Mobile bottom sheet**：`@media (max-width:768px)` 底部錨定（90dvh，rounded top）
- **Inline 刻字快速編輯**（✏）：Desktop + Mobile 雙管線 `inlineEditEngraving()` → PATCH + 即時刷新
- **`fhsRegenBtn`**：Mode 1 ⚠ 已人工編輯 badge + 🔄 從明細重生，清除 `is_text_overridden`
- **n8n V47.11 DB-level guard**：`sync_order_to_mirror` ON CONFLICT CASE WHEN `is_text_overridden=true` 保留手動文本

**Migration**：
- `0017`：`save_structured_order_items` RPC（SECURITY DEFINER，返回含 `full_order_text`）
- `0018`：`sync_order_to_mirror` DROP-IN 替換，加 `is_text_overridden` guard

**Code-reviewer Gate**：G1–G9 全部 PASS；G3a（RPC return 缺 `full_order_text`）已修復

**⚠ 待部署**：migrations 0017+0018 需 Fat Mo 在 Supabase 套用；V41→current.html 同步需另行 `/execute` 授權

---

## [2026-05-27] 📐 PGC-ODAT 審計值欄位重排（Session 31.6）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html` + `Freehandsss_dashboard_current.html`

- 建議價 → 入帳欄下方（dashed 分隔線，每 item 一行，綠色）
- SKU成本 → 成本欄下方（每 item 一行，附 💡 對賬試算）
- 產品明細欄還原純淨 badges，移除 `.audit-fin` div
- `cost-val-${id}` span 保護：`updateFinancialsLocally` 精準更新值 span，不清除審計列

---

## [2026-05-27] 🔧 PGC-ODAT 三項 Bug Fix + UI 優化（Session 31.5）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html` + `Freehandsss_dashboard_current.html`（同步）

**Bug Fix**：
- **window scope 未暴露**：`toggleAuditMode`/`toggleItemDrawer`/`openAuditModal`/`closeAuditModal` 在 IIFE 閉包內，`onclick` 找不到函式 → 按鈕完全無反應。修復：加 `window.fn = fn` 四行暴露
- **toggle 不重繪**：`toggleAuditMode()` 只切換 CSS class，未重繪；map 空時烘入「—」永久顯示。修復：開啟時呼叫 `applyReviewFilters()` 重繪，保留現有篩選

**UI 優化（/rp 7 維度分析後）**：
- `#fhsToggleAuditBtn` 加 `title` tooltip（SKU建議價｜SKU建議利潤｜📋 SKU參考價，不含整單優惠／折讓）；Mobile 以 💰 drawer 標籤替代 hover
- `.audit-fin` 移除 label 文字 + footnote，只保留 `$值` 數值；改 flex-column 右對齊垂直堆疊
- `review-item-card` 改 flex space-between：badges 左、audit 值 右（對齊截圖排版）

---

## [2026-05-27] ✨ PGC-ODAT v3 Lite — 訂單總覽子項目成本與利潤稽核（Session 31）

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`

**新增功能**：
- **全域 SKU 價格 preload**：`preloadSuggestedPrices()` 在 `init()` 非同步執行，載入 products.sku/suggested_price/total_base_cost（~490 SKU）至 `fhsSuggestedPriceMap`，TTL 30 min，失敗時 degrade gracefully（隱藏 toggle 按鈕）
- **稽核模式 Toggle**：篩選列加入 `🔍 顯示項目財務` 按鈕，切換 `body.fhs-audit-on` CSS class（< 50 ms，不重 render），狀態持久化至 localStorage
- **Desktop 財務稽核列**：每個 item 的 product card 內注入 `.audit-fin` div，顯示「SKU建議價 / SKU建議利潤 + 📋不含整單優惠/折讓」，缺 SKU 顯示「—」
- **Mobile 💰 per-item drawer**：每個 acc-item-card 右側加 💰 icon，點擊展開 `.item-financial-drawer` 顯示同等財務資訊，不全展開（解決版面膨脹問題）
- **💡 對賬試算 Modal**（`#auditCalcModal`）：Desktop + Mobile 均有，顯示 SKU建議價、SKU建議利潤、訂單實收、訂單實際利潤、可能差異原因清單（Adjustment_Amount / 折扣推估）
- **mapOrder() 補 Product_SKU 欄位**：item return object 新增 `Product_SKU: it.product_sku || ''`，供前端 O(1) Map 查詢

**決策依據**：`.fhs/notes/decisions.md` [2026-05-27] PGC-ODAT v3 Lite 條目

---

## [2026-05-27] 🔧 Modal 編輯 UI 一致性修復（Session 30 — 3 項 bug fix）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（3 項修復）
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`（同步完成）

**Bug Fix 清單**：
- **Bug 1 — Review 表客名不更新**：`saveOrderText` 更新 `o.Customer_Name` 但 Review table 渲染 `o.Customer`（Supabase fetch 時映射 `customer_name → o.Customer`），改為同時更新 `o.Customer` + `o.Customer_Name`
- **Bug 2 — 金屬 modal 重開後顯示舊訊息**：用戶在手模段修改客名，`_extractOrderText(newText,'B')` 的金屬段仍含舊名。修復：`saveOrderText` 重建 `_fullCombined`（section text + 舊另一段），再由 `_fullCombined` 分派 A/B
- **Bug 3 — 編輯框顯示全文 vs 原始訊息只顯示段落不一致**：`enterEditMode` 接受 catFilter 參數，只載入對應段落文字；`saveOrderText` 在 catFilter 存在時從 cache 取舊另一段重組 `_fullCombined` 後再 PATCH，確保 DB `full_order_text` 完整保留兩段

---

## [2026-05-27] ✅ Modal Phase A 完整收尾（migrations 套用 + code fixes + current.html 同步）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（3 項 bug fix）
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`（同步完成）

**本次修復（/execute 授權）**：
- **SELECT query 補欄位**：新增 `is_text_overridden,full_order_text_a,full_order_text_b` 至 `sbFetchGlobalReview` 查詢（之前缺漏導致欄位永遠回傳 undefined）
- **saveOrderText PATCH 補全**：PATCH body 加入 `is_text_overridden: true` + `full_order_text_a/b`（_extractOrderText 派生）；local cache 同步更新 `Full_Order_Text_A/B`
- **sbSyncOrder orderRow 補全**：新建/更新訂單時寫入 `full_order_text_a/b`，確保分段欄位與主文字同步

**前序完成（2026-05-26 Session 28）**：
- migrations 0015/0016 由 Fat Mo 套用至 Supabase ✅

---

## [2026-05-26] ✨ Modal 訂單訊息編輯功能 Phase A（cl-flow 2026-05-26-0627）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `supabase/migrations/0015_add_is_text_overridden.sql`（新建）
- `supabase/migrations/0016_add_order_text_split_columns.sql`（新建）

**功能說明**：
- **✏️ 編輯模式**：Modal 新增「✏️ 編輯」按鈕，切換 textarea 編輯視圖
- **儲存至 Supabase**：PATCH `orders.full_order_text`，失敗時 toast 提示並保留 sessionStorage 草稿
- **Override Badge**：`is_text_overridden=true` 時顯示「✏ 已人工編輯」標籤
- **iOS 鍵盤處理**：`visualViewport.resize` 動態收縮 modal box 高度
- **`_extractOrderText()`**：按 `Freehandsss 訂單確認` 邊界做位置分割，手模 = parts[0]，金屬 = parts.slice(1)
- **catFilter 修正**：catFilter='A'/'B' 現正確顯示各自段落

---

## [2026-05-26] ✨ 訂單總覽詳情按鈕拆分（手模擺設 / 金屬產品）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html` + `Freehandsss_dashboard_current.html`

**功能說明**：
- Desktop：訂單編號欄的 📋 詳情按鈕依訂單 items 類別，條件顯示為「🖐 手模」和/或「🔗 金屬」兩個按鈕
- Mobile：accordion header 的 📋 按鈕同步替換為 🖐 / 🔗 emoji 按鈕（節省 header 空間）
- 新增 `_getOrderCatFlags(o)` 輔助函式：掃描 `o.items[]` 的 `Category` 欄位，回傳 `{hasA, hasB}`
  - hasA: 任一 item.Category === '立體擺設'
  - hasB: 任一 item.Category 非空、非 '立體擺設'、非 '配件'
- 擴展 `openOrderModal(orderId, catFilter)` 第二參數：
  - `catFilter='A'`：顯示 🖐 手模擺設 items（規格、刻字、批次、進度）+ 取模時間（綠色卡片）
  - `catFilter='B'`：顯示 🔗 金屬產品 items（規格、刻字、批次、進度、補打金額）
  - `catFilter=undefined`：維持原始行為（顯示 IG 原始訊息全文）
- Fallback：若 items 無明確分類，回退顯示原 📋 單一按鈕

---

## [2026-05-25] 🔧 a2_implementation_plan 六項修復（Edit Mode 防重、欄位連動、IG 預覽、利潤修補）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html` + `Freehandsss_dashboard_current.html`
- `scripts/repair/sync_0600701.js`（新建）
- `docs/repo-map.md`

**Items 1–2 — checkOrderIDDuplicate + updateSyncButtonState**：
- Edit mode 下若新單號 ≠ `editTargetOrderId` 即觸發重複檢查（原只在 create mode）
- n8n 回傳陣列時以 `Array.isArray(raw) ? raw[0] : raw` 解析（避免 `data.found = undefined`）
- `updateSyncButtonState` 改為全模式生效（非 create only），同步禁用手機 `#v40-submit-btn`

**Item 3 — syncToAirtable 預檢**：n8n fallback 同步補入陣列解析

**Item 4 — `_syncOrderTypeUI` 欄位連動**：
- 選「否（純金屬/吊飾）」時自動 `disabled = true` 約定日期 / 取模時間欄位（不清值，保留用戶輸入）
- 選「是」時 `disabled = false` 恢復可編輯
- `resetForm` 尾端補 `_syncOrderTypeUI(false)`；`restoreFormState` 在 `generate()` 前補 `_syncOrderTypeUI(enableP.checked)`
- `selectOrderType` 尾端補 `generate()` 確保 custInfo 預覽在 enableP 無變化時仍刷新

**Item 5 — IG 訊息預覽**：`custInfo` 改為條件式，`!hasP` 時完全移除「取模時間」行

**Item 6 — sync_0600701.js**：
- `scripts/repair/` 目錄建立
- Dry-run + --force 防護；執行前核查 product_sku 完整性；POST 後輸出 finance-auditor 驗收指引

---

## [2026-05-25] 🛡️ 實施計畫與報告路徑規範化及語系強固（AGENTS v1.4.8）

**修改檔案**：
- `.fhs/ai/AGENTS.md` (憲法層升級至 v1.4.8，補入 Rule 3.14 實施計畫細則與繁中要求)
- `.fhs/memory/learnings.md` (新增計畫儲存與語系違反 pitfalls)
- `Changelog.md` (記錄變更)

**主要變更**：
- **實施計畫路徑指引**：明確在 Rule 3.14 新增 A2 實施計畫實體路徑為 `d:\SynologyDrive\Free_handsss\freehandsss_dashboard\.fhs\reports\planning\a2_implementation_plan.md`，杜絕僅存於 `.gemini/antigravity/brain/` 內。
- **語系一致性要求**：明文規範所有正式報告、計畫與對話輸出必須 100% 遵循繁體中文原則。

---

## [2026-05-25] 🔢 財務訂單數修復：null confirmed_at 草稿單納入計算（26 vs 28 訂單差異釐清）

**修改檔案**：
- `supabase/rpc/get_financial_kpis.sql`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`（sync）

**主要變更**：
- **訂單 WHERE 修正**：`current` + `previous` 兩個區塊的主 WHERE 子句由 `confirmed_at BETWEEN ... AND ...` 改為 `(confirmed_at BETWEEN ... AND ... OR confirmed_at IS NULL) AND deleted_at IS NULL`，確保草稿單（0600106，confirmed_at = NULL）納入計算。
- **orders_inclusive 子查詢同步修正**：`current` + `previous` 兩個 `orders_inclusive` CASE 子查詢亦加入相同 null + deleted_at 過濾。
- **釐清 26 vs 28 差異**：Finance Mode 顯示 26 單為正確（2026 YTD）；Review Mode 28 單包含 2025 年訂單（0600100 Oct-2025 $3,980、0696216 Dec-2025 $4,920），設計上正確排除於財務年度視圖。
- **利潤缺口 $11,631 確認為預存問題**：訂單 0600701 `net_profit = NULL`（n8n 未處理），貢獻 $8,720 至收入但 $0 至利潤；其餘 $2,911 為 n8n 陳舊計算值差異，需 n8n 重新 sync 修復。

---

## [2026-05-25] 💰 財務 KPI 數據對齊修復（adjustment_amount + current tab MTD）

**修改檔案**：
- `supabase/rpc/get_financial_kpis.sql`
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**主要變更**：
- **Fix A — KPI 成本/利潤/利潤率公式修正**：`get_financial_kpis.sql` 的 `cost` 欄位改為 `SUM(total_cost) + SUM(adjustment_amount)`，`profit` 改為 `SUM(net_profit) - SUM(adjustment_amount)`，`margin` 分子同步更新。`previous` 區塊亦同步修正。根因：`net_profit = final_sale_price - total_cost`（不含 adjustment_amount），KPI 卡片成本比 Review Mode 明細表偏低，利潤偏高。
- **Fix B — "current" tab 修正為 MTD**：`sbFetchFinancial()` 中 kCurAll/kCurHm/kCurMt 的 RPC 呼叫從 `tab_mode:'yearly'` 改為 `tab_mode:'current'`（月初至今 vs 去年同期 MTD），消除 "current" tab 與 "yearly" tab 顯示相同數據的 Bug。
- **Phase 0 查驗結論**：n8n `Supabase Mirror Prep` 節點的 UPSERT payload 不含 `adjustment_amount`，確認此欄位不受 n8n 全量同步覆蓋，無 SSoT 衝突風險。

---

## [2026-05-25] 🔗 /rp 協議整合至指令工作流（Command Compatibility Map + Safety Boundaries）

**修改檔案**：
- `.fhs/ai/commands/rp.md`（新增 Command Compatibility Map）
- `.fhs/ai/commands/execute.md`（新增 Section 2.4 Safety Boundaries）
- `.fhs/ai/commands/new-product.md`（啟動前置補入複合 SKU /rp 建議）
- `docs/FHS_Prompts.md`（情境二十三：建議路由 + Exempt 清單）
- `docs/repo-map.md`（/rp 條目更新）

**主要變更**：
- **Command Compatibility Map**：7 條指令明確分類（Supported / Recommended / Exempt），`/error-eye`、`/commit`、`/cl-flow`、`/cl-flow-fast` 強制 Exempt，禁止 /rp 建議或攔截。
- **Section 2.4 — Safety Boundaries**：`/execute` 收到 /rp 精煉提示時，必須宣告 `<original_auth_scope>` 並嚴禁側道授權擴展。
- **建議路由（非強制攔截）**：情境二十三改為：複雜輸入時輸出一行建議，不自動重定向，Fat Mo 可直接忽略。
- **設計原則**：消除原計畫的 "auto-intercept" 設計，符合 Rule 3.11 Token 節約原則與最小摩擦偏好。

---

## [2026-05-25] 📍 同步指示下沉至訂單行（inline sync-indicator）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**主要變更**：
- **移除頂部 Banner 彈出**：`handleSyncPollingCheck` 及 `switchMode('review')` 內所有 `banner.style.display = 'flex'` 已移除；`#syncProgressBanner` HTML 元素保留但不再顯示。
- **inline sync-indicator**：`orderLeftColsHtml` 模板（L6635）新增 `<div id="sync-indicator-{o.id}">` 隱藏 div，內含 `.fhs-spin` 旋轉圓圈 + 「同步中」文字（11px，橙色），初始 `display:none`。
- **`_setSyncIndicator(orders, visible)` 輔助函式**：透過 `orders.find(o.Order_ID === targetId)?.id` 定位對應訂單行，輪詢中顯示，sync 確認完成後隱藏。
- **行為不變**：`checkSyncFinished` / `handleSyncPollingCheck` 判斷邏輯 / `silentPoll` 輪詢機制均不受影響。

---

## [2026-05-25] 🔇 輪詢靜默模式（silentPoll）— 等待 n8n 更新時保留表格資料

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**主要變更**：
- **silentPoll 參數**：為 `fetchGlobalReview(forceRefresh, silentPoll)` 新增第二參數，影響 n8n 路徑（L6186）及 Supabase patch（L9587）兩個函式定義。
- **輪詢路徑繞過 showLoader + tbody 清空**：當 `silentPoll=true` 時，跳過 `showLoader()` 及 `tbody.innerHTML` 清空動作，表格在輪詢期間保持舊資料可見，不再每 4 秒閃爍一次。
- **setInterval 傳入 silentPoll=true**：L3928 輪詢 callback 改為 `fetchGlobalReview(true, true)`，確保後台輪詢全程靜默。
- **行為不變部分**：`handleSyncPollingCheck` / `checkSyncFinished` / 20 秒 timeout / Banner 旋轉圖示均不受影響；用戶初次切入訂單總覽及手動「重新載入」仍走完整 showLoader 路徑。

---

## [2026-05-25] ⚙️ 修正篩選儲存與排序還原

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**主要變更**：
- **排序還原與載入修正**：修復了 `loadFilters()` 在載入時正確設置內存 `sortField` 與 `sortDir` 但渲染時被 table fetch callback 繞過、導致表格呈現未排序的 Bug。現在在 cache 命中及 fetch 成功後，均優先經由 `applyReviewFilters()` 進行排序和過濾後再渲染。
- **客戶端 Date/Month 篩選**：為了解決 Supabase 查詢中 `confirmed_at` 為空（草稿/新訂單）在月分/年度篩選中過度匹配，導致 May 訂單顯示在 January 篩選結果 the Bug，在 `applyReviewFilters` 中加上客戶端 Year/Month 篩選作為 secondary filtering。
- **時間排序強固**：引入了 `parseSafeDate` 輔助函式，使用正則安全解析並標準化 `DD/MM/YYYY` 等多種日期格式，確保 legacy 與新格式日期排序皆 100% 正確，解決了 Chrome 瀏覽器在解析 `DD/MM/YYYY` 格式時因 `Invalid Date` 導致的排序異常。
- **Status 屬性回補**：在 Supabase `mapOrder()` 輸出的物件中補上 `Status` 欄位，確保與 legacy 前端代碼對 `o.Status` 存取的相容性。

---

## [2026-05-24] 🔮 訂單總覽 4 項 UI 優化（F1–F4）

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**主要變更**：
- **F1 儲存篩選設定**：篩選列新增「💾 儲存篩選」按鈕 (`#fhsSaveFilterBtn`)，點擊後將年份/月份/狀態/批次/搜尋/排序/分類 chip 全部寫入 `localStorage('fhs_saved_filter')`；切換至訂單模式時自動呼叫 `loadFilters()` 還原所有篩選值（含 sort/chip 狀態），且只執行一次（`_fhsFiltersLoaded` flag 保護）。桌面/手機版均適用。
- **F2 備註格自動填滿**：`.review-notes-textarea` CSS 改為 `height:100%; min-height:80px; resize:none`，並配合 `td:has(>...)` 讓 `<td>` 高度追隨內容；`.acc-notes-textarea` 亦更新為 `min-height:60px; resize:none`，手機版格內備註填滿顯示。
- **F3 訂單詳情彈窗**：新增 `#fhsOrderModal`（`position:fixed` 全螢幕遮罩），點擊 📋 圖示後不發 API 請求，直接從 `globalOrders` 取得資料並以 3 個可折疊區塊呈現（💰 財務摘要預設收合 / 📦 產品明細預設展開 / 📝 備註預設收合）。支援點擊遮罩或 ESC 鍵關閉。
- **F4 手機版同步**：accordion header 新增 📋 按鈕（含 `event.stopPropagation()` 防止觸發展開/收合），F1 儲存篩選按鈕手機版全寬顯示。

---

## [2026-05-24] 💰 成本欄補打金額分拆顯示

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**主要變更**：
- **成本欄分拆顯示 (Cost Breakdown Display)**：訂單總覽「💰 成本」欄由合計金額改為分拆顯示。當 `Adjustment_Amount > 0` 時，桌面版顯示 `$基礎成本 + 橙色 +$X 補打` 兩行；手機 accordion 版顯示 `成本: $基礎成本 橙色 +$X`。無補打時顯示不變。
- **即時分拆更新 (`updateFinancialsLocally`)**：將 `textContent` 改為 `innerHTML`，使用戶在補打金額輸入框鍵入時，成本欄即時呈現分拆標籤，無需等待 blur/保存。

---

## [2026-05-24] 🚥 Category-Aware Progress Tracking & Financial Adjustments (SUPABASE SSoT Synchronization)

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`
- `scripts/scratch_validate_categories.js`

**主要變更**：
- **分類相關進度下拉選單 (Category-Aware Status Dropdowns)**：重構訂單總覽 (Review Mode) 表格與行動版折疊卡片中的狀態選擇器，依據商品類別（立體擺設 vs 鎖匙扣/純銀吊飾）動態過濾並呈現可選取狀態。立體擺設僅顯示 `已book日期`、`已取模`、`待交收`、`Done 已完成`；金屬/鎖匙扣則可選擇 `需進行補打` 等。
- **補打金額輸入欄位 UI 優化 (Replenishment Input UI Refinement)**：將桌面版與手機版的補打輸入框寬度從 55px/65px 調整為 80px，加入 4px 內邊距，邊框改為顯著的 `1px solid #ccc`，且**取消透明底色** (設為白底不透明背景 `#ffffff`)，極大改善了輸入框在深色/漸層背景下的可見度與點擊操作體驗。
- **即時財務計算 (Real-time Instant Financial Recalculations)**：
  - 新增 `updateFinancialsLocally(recordId, value)` 函式。
  - 將補打金額輸入框的事件綁定升級，新增 `oninput="updateFinancialsLocally('${o.id}', this.value)"`，當用戶在輸入框內鍵入任何字元時，同行/同卡片的成本與利潤欄位數值 (包含其正負值顏色) 立即同步即時更新，無須等待失焦或頁面重新載入。
- **產品明細排序邏輯強固 (Hardened Product Sort Priority)**：
  - 重構 `_cp` 排序函式，傳入整個 item 物件，並同時檢索 `Category`、`Product_Name` 以及 `Item_ID` (即 `item_key`)。
  - 當遇到資料庫中因字元編碼異常 (如 `??` 或 corrupted strings) 造成 Category 解析失敗時，自動退回以商品名稱 (如木框、鎖匙、純銀) 與 SKU 代號 (如 `_P_`、`_K_`、`_M_`) 進行精準映射。
  - 確保三大主產品 (0: 立體擺設 > 1: 鎖匙扣 > 2: 吊飾/純銀) 的優先排位順序在任何極端異常資料下均能保持絕對正確。
- **後台與 SSoT 資料流同步 (SSoT Sync & Data Mapping)**：
  - 更新 Supabase 讀取 `sbFetchGlobalReview` SQL SELECT 欄位以涵蓋 `adjustment_amount`，並由 `mapOrder` 在載入列表時進行資料綁定與復原。
  - 前端 `sbSyncOrder` payload 建構加入 `adjustment_amount`，確保後台 n8n 建立/更新訂單時數據一致性。
- **語法與 JS 例外修正 (Syntax & Runtime Error Fix)**：修復在 `saveInlineEdit` 中漏掉 of `finally` 區塊閉合花括號，消除了瀏覽器中的 `Unexpected token ','` 和 `handleSyncPollingCheck is not defined` 錯誤，確保 QA Playwright 測試 100% 綠燈通過。
- **測試驗證 (Validation & Test Gates)**：
  - 執行 Playwright 瀏覽器測試 `qa_v41_supabase.js` 通過 (**15 PASS / 0 FAIL**)。
  - 修正了分類驗證腳本 `scratch_validate_categories.js` 以容錯 corrupted sku 欄位，Gate 1.5 成功通過 (**PASS**)。

## [2026-05-23] 🔄 /commit v2.1.0 — 新增 Phase 1.5 Lesson Distillation 自動判斷清單

**修改檔案**：
- `.fhs/ai/commands/commit.md`（Master，v2.0.0 → v2.1.0）
- `.claude/commands/commit.md`（橋接版，description 同步）

**主要變更**：
- **[新增 Phase 1.5] Lesson Distillation 自動判斷**：將「詢問 Fat Mo 本次是否有 lesson」改為「自動判斷 + 清單式標準」。定義明確的三個分類判斷條件（Pattern / Pitfall / Preference），AI 可在 Phase 1.5 獨立判斷並決定是否寫入 `.fhs/memory/learnings.md`，無需每次詢問。避免操作員「判斷不到」的困擾，同時防止 learnings.md 變成模糊的知識庫。
- **判斷標準**：Pattern（多 session 驗證的技術模式） / Pitfall（handoff/pitfalls 記錄的已知坑 + 預防方案） / Preference（跨 session 的架構決策確認）。

---

## [2026-05-23] 📋 /new-product v1.1.0 — 三項 Gap 補強（Order 資料流保護）

**修改檔案**：
- `.fhs/ai/commands/new-product.md`（Master，v1.0.0 → v1.1.0）
- `.claude/commands/new-product.md`（橋接版，description 同步）

**主要變更**：
- **[Step 2 新增 2e] Smart Cache COST_MAP 核查**：要求在新產品融入時，明確確認 n8n Smart Cache Strategist 節點的 hardcoded COST_MAP 已含新 SKU 成本條目，防止新訂單成本計算返回 0（pitfalls P7 根因，handoff 待辦 #1）。
- **[Step 3 新增 3f] Review Mode 渲染驗證**：要求建立測試訂單後切換至訂單總覽，分別確認 Desktop `renderReviewTable` 與 Mobile `renderReviewAccordion` 正確顯示新產品的 category badge、款式名稱（`getProductDimensions`）、欄位明細，無 undefined 或空行。
- **[Step 5 新增 5f] 已有批次訂單 Edit Mode 重同步保留驗證**：新增 E2E test case：對已設定 batch_number 的訂單執行「Edit → 修改 → 重新同步」循環，並以 SQL 驗證 batch_number 100% 保留（對應 handoff Session #6 `_prevItemMap` 機制與 Session #8 `_sanitizeItemStatus`）。
- **Gate 條件更新**：Gate 2 / 3 / 5 各補充對應新子項目的 PASS 條件。

---

## [2026-05-23] 🐛 Complex SKU 成本計算修復 + 🚀 訂單重覆檢查與同步 UX 優化 (Complex SKU Cost Calc & Sync UX Optimization)

**修改檔案**：
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `n8n/FHS_Core_OrderProcessor_live.json`

**主要變更**：
- **複合成品成本計算 (Complex SKU PostgREST Filter Escaping)**：修復 n8n `Smart Cache Strategist` node 中 PostgREST 過濾器因為括號/特殊字元（如 "木框套裝 (4肢)"）導致的 URL 解析語法錯誤。修正為雙引號包裹過濾字串（e.g. `sku.like."FILTER*"`）防止語法崩潰，並加入 `typeof process !== 'undefined'` 以防止 n8n 沙箱內 `ReferenceError` 崩潰。
- **客戶端重覆單號檢查 (Client-side Duplicate ID Validation)**：在前端 Dashboard 儲存同步時，新增即時的單號重覆性檢查。優先採用 Supabase API 直連，若 Supabase 未啟用則使用 Webhook 回傳進行驗證，在確認無重覆單號時才允許發射 Webhook，有效避免數據重疊與覆寫。
- **同步進度條與自動輪詢機制 (Sync Progress Banner & Auto-Polling)**：於訂單總覽 (Review Mode) 新增同步進度提示條 (`#syncProgressBanner`)，提供視覺反饋（旋轉 spinner 與當前同步單號），並在切換至訂單頁面或同步成功後每 4 秒自動向 Supabase/Webhook 輪詢最新狀態（20秒超時），待後台 n8n 處理完成並更新金額與客戶名稱後自動關閉提示條並重新載入列表，提供流暢的 Optimistic UI 體驗。

---

## [2026-05-23] 📋 報告工作區強制規則與憲法 v1.4.7 升級 (AI Reports Workspace Rule & AGENTS v1.4.7)

**修改檔案**：
- `.fhs/ai/AGENTS.md` (憲法層升級至 v1.4.7，新增 Rule 3.14)
- `docs/repo-map.md` (修正並同步新增 `.fhs/reports/` 與其子目錄之結構描述)

**主要變更**：
- **新增報告工作區存放守護 (Rule 3.14)**：明文禁止 AI 將產出的正式報告、實施計劃（Plan）、審閱意見（Review）與任務完成報告（Completion Report）存放於專案外部（如 App Data 系統路徑 `~/.gemini/antigravity/brain/...`）。所有報告必須存放在專案 Workspace 內的指定目錄（如 `.fhs/reports/` 或 `.fhs/notes/`），以確保用戶可在 IDE 中透過 `@` 檔案選取器快速索引及檢索。
- **Repo Map 結構修正**：在 `docs/repo-map.md` 中修正原本寫錯的 `completion_reports` 位置，改為對齊真實檔案系統的 `.fhs/reports/` 分支結構。

---

## [2026-05-23] 🐛 訂單同步資料丟失修復 (Order Items Data Loss Fix)

**修改檔案**：
- `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `supabase/migrations/0013_sync_order_rpc_orphan_cleanup.sql`

**架構變更與 Bug 修復**：
- **雙寫競爭解耦 (Write Concurrency Decoupling)**：前端 Dashboard 在 n8n Webhook 呼叫成功時不再並發直寫 Supabase，`sbSyncOrder` 被限製為僅在 Webhook / 網絡故障時作為 Fallback 執行，消除了 Dashboard 與 n8n 背景任務的競爭條件。
- **時序提早注入 (Pre-enrichment Timing)**：在觸發 Webhook 前，將 UI 當前的 `_ui_process_status` 與 `_ui_batch_number` 注入 `orderItemsArray` 傳送給 n8n，保成了後台單一寫入源 (SSoT) 擁有完整的狀態與批次資訊。
- **Supabase RPC 孤兒清理與型別修正 (Orphan Cleanup & Type Cast)**：`sync_order_to_mirror` RPC 函式新增孤兒刪除邏輯以自動清除 UI 已被移除的商品明細。修復 `process_status` 的 ENUM 型別轉型 bug (`::order_status`)，防止 PostgreSQL 拋出 type mismatch 錯誤導致 transaction rollback。

---

## [2026-05-22] 🐛 n8n Supabase Mirror 沙箱 fetch 靜默失敗修復 + 雙端 migrations 部署驗證

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`
- `.fhs/notes/pitfalls.yaml`（新增 P6: n8n-sandbox-fetch-disallowed）
- `.fhs/ai/subagents/freehandsss/product-integration-validator.md`（Checklist C3）
- `.fhs/memory/learnings.md`（修正 n8n Code Node 限制）
- `.fhs/memory/handoff.md`（更新完成事項與待辦狀態）
- `docs/repo-map.md`（加入新 migrations 說明）
- `scripts/README.md`（加入 update_n8n_supabase_mirror.js 說明）
- `n8n/FHS_Core_OrderProcessor_live.json`（更新後的 n8n 備份檔）
- `supabase/migrations/0010_order_id_cascade_update.sql`
- `supabase/migrations/0011_rename_order_id_security_definer.sql`
- `scripts/update_n8n_supabase_mirror.js`

**根因與修復 (n8n sandbox fetch disallowed)**：
- **根因**：n8n 容器沙箱不支援 global `fetch` 且禁用 `https` 等內建 Node.js 模組，使得原本以 `fetch` 實作的 Supabase mirror 寫入與 RPC 重命名調用靜默報錯（ReferenceError: fetch is not defined），錯誤被 try-catch 吞掉，導致 Supabase 雙寫未真正執行。
- **修復**：利用 n8n 已授權的外部模組 `axios` 全面重構 `Mirror to Supabase` 和 `Mirror Delete to Supabase` Code Nodes（V47.10）。經 Webhook 模擬調用與 SQL 直查，Order ID 重命名已能正確執行且無 duplicated 資料。

**Supabase Migrations 部署**：
- 成功在 Supabase 套用 `0010` (ON UPDATE CASCADE) 與 `0011` (併發安全且支援 race condition 合併的 `rename_order_id` RPC)，消除 FK 衝突。

---

## [2026-05-21] 🔑 家庭合成鎖匙扣刻字欄重構 + 訂單總覽 3 Bug 修復 + V41 升版 current

**修改檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV41.html`、`Freehandsss_Dashboard/Freehandsss_dashboard_current.html`

**家庭合成鎖匙扣刻字欄重構**：
- 移除「上排(最多6字)」+ 「下排(最多8字)」兩個獨立輸入欄（id: k_family_top / k_family_bot）
- 新增單一「刻字」輸入欄（id: k_family_eng，無字數限制），對齊立體擺設款式設計
- 同步更新 `generate()` 預覽（上排/下排 → 刻字：text）與 Webhook Builder Notes 格式（移除 [上排]/[下排] wrapper）

**訂單總覽 3 Bug 修復（renderReviewTable + renderReviewAccordion）**：
- Bug 1 - 家庭 badge 底色透明：新增 `.badge-target-家庭` CSS 規則（橙色系 #FFF3E0）
- Bug 2 - 部位組合資訊缺失：從 `item.Engraving` 的 `合成:` 區段解析嬰兒/大寶部位，渲染 👶 嬰兒 + ✋/🦶 part badges（Desktop + iPhone）
- Bug 3 - 刻字欄顯示合成資訊：`_engStripped` / `_accEngStrip` 先 strip `| 合成:...`，純合成 Notes 顯示為 `—`（Desktop + iPhone）

**V41 升版 current**：`freehandsss_dashboardV41.html` → `Freehandsss_dashboard_current.html`

---

## [2026-05-21] 🛡️ 新產品跨層融入保護機制（pitfalls.yaml + product-integration-validator + /new-product）

**新增三個機制檔案**（源自 2026-05-19~21 Bug 修復循環學習）：

- `.fhs/notes/pitfalls.yaml`：Machine-readable 跨層整合 pitfall 知識庫，記錄 5 個已驗證失敗模式（P1 UUID-as-PATCH-key、P2 ENUM-information-loss、P3 PGRST102-mixed-keys、P4 RLS-silent-PATCH-fail、P5 IIFE-template-literal-syntax），每條含 `detection_rule` 欄位供自動掃描
- `.fhs/ai/subagents/freehandsss/product-integration-validator.md`：新 subagent v1.0.0，Haiku model，5 個 Checklist（UI↔ENUM、item_key↔deriveCat、n8n SKU 表、RLS 覆蓋、template literal 安全），PASS/FAIL 報告格式
- `.fhs/ai/commands/new-product.md`：/new-product skill，五步 atomic 流程（Supabase ENUM → n8n SKU 表 → Dashboard UI → RLS → 三端測試），含完整 Rollback Matrix 與已知例外表

**觸發條件**：[B] 制度層變動（新增 .fhs/ai/commands/ 指令 + subagent 規格）+ [C] /new-product 指令語義新增

---

## [2026-05-21] 📋 Subagent 稽核機制：execute.md [E] + commit.md Phase 1 強制欄

**修改指令層（Master 檔）**：
- `.fhs/ai/commands/execute.md`：新增 [E] Subagent 使用稽核 section
- `.fhs/ai/commands/commit.md`：Phase 1 Handoff step 補強

---

## [2026-05-21] 🚨 真因揭曉：FK 23503 殺死整批 INSERT

**根因**：Supabase `order_items.product_sku` 有 FK 約束 → `products(sku)`。「羊毛氈公仔 - 加購」不在 products 表 → 觸發 23503 Foreign Key Violation → **整個 batch INSERT rollback，所有 items 全部寫不入**（包括 P_MAIN / K / M）。

**Console 真實錯誤**：
```
POST .../order_items 409 Conflict
{"code":"23503","details":"Key is not present in table \"products\".",
 "message":"insert or update on table \"order_items\" violates foreign key constraint \"order_items_product_sku_fkey\""}
```

**修復 `freehandsss_dashboardV41.html` (sbSyncOrder line 8385)**：
- **撤回**前一輪錯誤新增的 `product_sku: item.Product_Name`
- mapOrder 已透過 `Order_Item_Key` (W_WOOL 後綴) + getProductDimensions pattern 識別商品類別，不依賴 `product_sku` 欄
- 副作用：Supabase order_items.product_sku 將為 NULL（如其他系統依賴此欄，需另外把「羊毛氈公仔 - 加購」加入 products 表）

**已知殘留風險**：
- n8n Mirror to Supabase 仍會嘗試寫 product_sku，遇 W_WOOL 會在迴圈中 throw（已寫的前序 items 留在 DB）
- 但 sbSyncOrder 緊接 DELETE + INSERT 全覆寫，最終狀態正確
- 若 `fhs_supabase_read != '1'`（sbSyncOrder 不跑），n8n 殘片會留在 DB

---

## [2026-05-21] 🧸 羊毛氈公仔 診斷 log 注入

**修改 `freehandsss_dashboardV41.html`**：
- Webhook builder (line 5430)：新增 `[FHS Diag W_WOOL]` console log，顯示 `enableP / w_wool_en` 兩個 guard 變數實值，並在 push 後 log key；guard 失敗時 console.warn
- renderReviewTable (line 6171)：新增 per-order item key 掃描 log，凡 `o.items` 含 W_WOOL key 即 console.log
- 目的：診斷「Review Mode 缺羊毛氈公仔」三段失效定位（form state / Supabase write / 前端讀取）

---

## [2026-05-21] 🧸 羊毛氈公仔 Supabase 三層修復（category / product_sku / badge）

**修改 `freehandsss_dashboardV41.html`**：
- Fix 1 (`_deriveCat`)：W_WOOL key 現返回 `'配件'`，`order_items.item_category` 不再空白
- Fix 2 (`sbSyncOrder` item mapper)：補寫 `product_sku: item.Product_Name`，`mapOrder` 讀回時 `Product_Name` 不再空白
- Fix 3 (`getProductDimensions`)：新增 `_W_WOOL / 羊毛氈` 分支，Review Mode badge 顯示 `🧸 羊毛氈公仔` 而非 `📦 其他`

## [2026-05-21] 🧸 羊毛氈公仔 webhook 寫入修復

**修改 `freehandsss_dashboardV41.html`**：
- 在 Webhook 提交函式的 `orderItemsArray` 構建器中加入 `W_WOOL` 項目，修復 `enableP + w_wool_en` 選購後，Supabase `order_items` 缺記錄、Review Mode 產品明細欄空白的問題
- 根因：舊 Category C（`enableW`）移除後，Webhook 層從未補上對應邏輯；定價函式（`buildOrderItemsForPricing()`）的 `isAccessory` + $680 邏輯本身正確，無需修改

---

## [2026-05-21] 🧸 羊毛氈公仔分類修正（Category C → 立體擺設款式）

**修改 `freehandsss_dashboardV41.html`**：
- 將「🧸 羊毛氈公仔 ($680)」從「🎀 配件加購 (Category C)」移至「🎨 立體擺設款式」，置於「客製化刻字」欄位之後
- 移除空的 Category C 區塊（toggle-row + `contentW` div）
- JS `buildOrderItemsForPricing()` 中 羊毛氈公仔 的外層 guard 從 `getValSafe('enableW')` 改為 `getValSafe('enableP')`，與新的 UI 歸屬一致

---

## [2026-05-20] /rp 通用指令新增 + 備註欄批次色 Bug 修復

**新增 `/rp` 通用 Prompt 重寫指令（CL / AG / PL 三端）**：
- 新建 `.fhs/ai/commands/rp.md`（Master）
- 新建 `.claude/commands/rp.md`（Claude Code Bridge）
- 新建 `.agents/workflows/rp.md`（Antigravity Bridge）
- 同步更新 `docs/FHS_Prompts.md`（情境二十三）、`docs/repo-map.md`、`.fhs/ai/commands/README.md`

**修復 `freehandsss_dashboardV41.html` 備註欄批次色 Bug**：
- 根因 A：備註欄 td 用 `o.Batch`（訂單層），但部分 Supabase 訂單 batch_number 只存在 item 層
  - 修復：`batchCol = getBatchColor(o.Batch || items[0].Batch || '')`（加 item 層 fallback）
- 根因 B：td `background-color:batchCol` 被 CSS `.review-notes-textarea { background:#ffffff }` 覆蓋
  - 修復：td 加 `padding:8px`，textarea inline `background:#ffffff` 強制白底，批次色以「相框」方式顯現

---

## [2026-05-20] Reflect→Think 閉環補強（learnings.md + /read 鉤入 + handoff 解封）

**新建 `.fhs/memory/learnings.md`**：
- 三節骨架（Patterns / Pitfalls / Preferences），上限 50 條，每條含日期來源
- 預填 9 條 distill 自 decisions.md 的示範條目

**修改 `.fhs/notes/SOP_NOW.md`**：
- 初始化步驟加入 Step 3「讀取 learnings.md」，原 Step 3 改為 Step 4
- 每 session /read 強制載入 pattern/pitfall/preference 至工作記憶

**修改 `.fhs/memory/handoff.md`**：
- 待辦清單封鎖文字從「嚴禁主動執行」微調為「寫入/執行需授權；引用 learnings.md 提示不需授權」
- 解除 2026-05-19 A2 越權修復時引入的過度封鎖，恢復 Reflect→Think 回灌路徑

**修改 `.fhs/ai/commands/commit.md`**：
- Phase 1 新增 Step 5：commit 結尾詢問 Fat Mo 是否 distill lesson，手動 append，無回應靜默跳過

---

## [2026-05-18] Telegram 三格分離 + n8n Supabase-First 重構 + Dashboard Update_Note 修復

**Telegram 訊息架構重構**：
- Pack Telegram Data 改為在 JS 內組裝完整 `Full_Message`（三格：新訂單/修改訂單/刪除訂單）
- 新訂單：完整商品清單（Sub_Items）+ 財務核算
- 修改訂單：精簡格式 + Update_Note（原本值 → 修改值）
- 刪除訂單：最簡格式（客人 + 單號 + 確認文字）
- Send Profit Report 改為 `={{ $json.Full_Message }}`

**n8n Supabase-First 拓撲**：
- 執行路徑：Mirror to Supabase → Pack Telegram Data → Send Profit Report
- 所有 Airtable 節點設 continueOnFail: true（背景執行，不阻斷 Telegram）
- Notify Telegram (Delete) Unicode 編碼修復

**Smart Cache Strategist V47.9**：
- 發現 NAS n8n Code 節點 `fetch()` 完全不可用（靜默失敗）
- 改用 26 種 base SKU 本地成本對照表 + prefix matching
- 解決鎖匙扣/吊飾 SKU 格式不符導致的成本 = 0 問題

**Dashboard Update_Note 修復**：
- `lastFetchedState` 時序 Bug：移到 `limb_sel_*` DOM 還原後截取（兩個 HTML 檔案）
- 格式升級：取模時間（hour + ampm 合拼）/ 顯示「原本: X → 修改: Y」
- 修改範圍：`Freehandsss_dashboard_current.html` + `freehandsss_dashboardV41.html`（Lines 4802, 5408-5426）

---

## [2026-05-18] Bug Fix — Telegram 真正根因修復（Read Cache File 阻塞）

**Bug #1 追加修復 — Telegram 通知失效（真正根因）**：
- **真正 Root Cause**：`Read Cache File` 節點嘗試讀取 `.n8n/data/products.json`；NAS 上該檔案不存在 → 節點即時報錯 → 整條執行鏈在 ~153ms 截斷 → `Pack Telegram Data` / `Send Profit Report` 永不觸發
- **修復**：`Batch SKU Collector` 節點頂部加入 file guard，自動探測 5 個可能路徑，若 `products.json` 不存在則建立空檔案，確保 `Read Cache File` 不再失敗
- n8n `Batch SKU Collector` versionId: `d5d30400`（backup: `.fhs/notes/aireports/n8n-mcp-backups/2026-05-17/`）

---

## [2026-05-17] Bug Fix — Telegram 失效 / Loader 訊息 / confirmed_at 混亂（V41 + n8n V47.6）

**Bug #1 修復 — Telegram 通知失效**：
- **Root Cause**：`Local Data Mapper` SKU 未命中時回傳 `id: null` → `Bind Main Order ID` 傳 `Product_ID: null` → `Create Sub Items` 向 Airtable 送 `[null]` linked record → API 拒絕 → 整條鏈截斷 → `Pack Telegram Data` 永不觸發
- n8n `Bind Main Order ID`：`Product_ID` 只在非 null 時加入 json；過濾無 `Order_Item_Key` 的項目
- n8n `Pack Telegram Data`：`$('Calculate Profit & Pack Items').first()` 改為 `.all()[0]?.json`，防 0-output 時 throw

**Bug #2 修復 — Loader 訊息錯誤**：
- Dashboard V41 Line 5221：`"正在同步數據至 Airtable..."` → `"正在同步數據至 Supabase + Airtable..."`

**Bug #3 修復 — confirmed_at / updated_at 混亂**：
- **Root Cause（雙側）**：Dashboard `sbSyncOrder` 每次都寫 `new Date().toISOString()` 到 `confirmed_at`；n8n `Mirror to Supabase` 對 edit 操作傳 `null` 清空 `confirmed_at`，並將 `process_status` 強制重置為 `'待確認'`
- Dashboard `sbSyncOrder`：新增 `mode` 參數（`'create'`/`'edit'`）；只在 `mode === 'create'` 時寫入 `confirmed_at`；`updated_at` 由 Supabase trigger `orders_updated_at` 自動處理
- n8n `Mirror to Supabase` V47.6：`confirmed_at` 僅在 `action === 'create'` 且有值時寫入；`process_status` 僅在 create 時設 `'待確認'`，edit 時保留現有狀態

**修改範圍**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（Lines 5221, 5441, 8061, 8087–8098）
- n8n FHS_Core_OrderProcessor：`Pack Telegram Data`、`Bind Main Order ID`、`Mirror to Supabase`

---

## [2026-05-17] /fhs-audit v2.1 + 全專案語義稽核大掃除

**制度層（憲法 + 指令系統）**：
- AGENTS.md §1 新增「數據主導權矩陣」表格，消除 Primary Lead / SSoT 並列歧義（Read/Write Lead = Supabase；Authoritative Snapshot 過渡 = Airtable）
- AGENTS.md L47 修改前必讀文件 `Triple_Sync_Field_Map.md` → `Quadruple_Sync_Field_Map.md`
- `.fhs/ai/commands/fhs-audit.md` v2.0 → **v2.1**：新增 Check 7「語義稽核」5 維深度檢測（D1 Stale / D2 Orphan / D3 Conflict / D4 Redundant / D5 Loops），總分由 25 → 30
- `.fhs/ai/commands/px-audit.md` L10 引用更新為 Quadruple_Sync

**新工具層（.fhs/tools/）**：
- `.fhs/tools/semantic_audit.py` MVP — 6 個 canonical key 追蹤、48 個 deprecated hits、273 個 dangling links、2 個 cycles 自動偵測
- `.fhs/tools/canonical_keys.yml` — 單一真理 key 清單（agents_version / n8n_version / ssot_owner / supabase_role / production_html / field_map_authority）
- `.fhs/tools/deprecated_terms.txt` — 已廢棄詞黑名單（Triple_Sync_Field_Map、三端同步/稽核/映射、v39-aom.md）

**版本字串大對齊**：
- n8n workflow 版本跨檔統一為 **V47.4**（修正 SOP_NOW V45.7.4 / MEMORY v47.3 漂移；以 decisions 2026-05-16 為真理來源）
- `SOP_NOW.md` 系統快照升 v1.4.6 / 2026-05-17 / V47.4
- `docs/FHS_Prompts.md` compatible_with v1.4.5 → v1.4.6
- AGENTS.md §1 內文版號補對齊 v1.4.6
- 自動記憶（MEMORY.md + project_v40_status.md）n8n 版本對齊 V47.4

**語義衝突修正**：
- `.cursorrules` L48 + L60：Triple_Sync → Quadruple_Sync（含三端→四端）
- `.fhs/notes/SOP_NOW.md` L44：「三端同步」→「四端同步」
- `.fhs/notes/decisions.md` L34 Supabase 就緒設計引用更新
- `.fhs/notes/decisions.md` 2026-05-04 條目加 ⚠️ SUPERSEDED 標籤（Airtable formula 保留決策已被 Supabase-First 取代）
- `.fhs/memory/handoff.md` Anti-Idle Ping 從「待辦」改為「部署驗證」（避免與 AGENTS.md §4 硬規則重複定義）
- `n8n/Quadruple_Sync_Field_Map.md` 新增段落「n8n 內部計算規則（非持久化）」描述 Shipping/Necklace_Deduction，完成 Triple_Sync 完整遷移

**結構清理**：
- `docs/repo-map.md` 新增 `.fhs/tools/` 條目；修正 ai_reports/ 描述（實際空目錄）
- `~/.claude/agents/freehandsss/FHS_Finance_Bible.md` 刪除（同步孤兒，非 subagent；source 目錄無此檔）

**為何重要**：
上一次 `/fhs-audit` 通過（結構稽核全綠），但 AGENTS.md 仍存在 6 處與 Supabase-First 矛盾的措辭。本次新增 Check 7 填補「純結構稽核 → 語義稽核」的能力缺口，杜絕未來「文件看似乾淨、實則內部矛盾」的隱性漂移。

## [2026-05-17] AGENTS.md v1.4.6 — Supabase-First 規則對齊修正

**制度層更新（憲法層 patch）**：
- **財務欄位計算職責分工**：明確寫入目標為 Supabase（Primary）→ Airtable（Fallback）；舊版未提 Supabase，AI 易誤判
- **雙寫隔離語義修正**：Supabase 改為主流程，Airtable 降為後備鏈路；舊版稱 Airtable 為「主流程」，與 Supabase-First 戰略矛盾
- **Subagent 路由 — database-reviewer**：`Triple_Sync` → `Quadruple_Sync` 欄位核查
- **Subagent 路由 — finance-auditor**：三端稽核 → 四端稽核（補入 Supabase）
- **系統真理庫**：Triple_Sync_Field_Map.md 標注 [已廢棄]，避免 AI 誤用殭屍 reference
- **Stitch 資產守護**：守護清單從 V36/V37/V40 更新為 V41（current 主核心）

## [2026-05-17] 訂單總覽 Filter/Sort + 批量操作工具列

**訂單總覽 Filter/Sort 功能**：
- 新增 `review-filters-v2` 篩選面板：年度/月份/狀態/批次/搜尋（Row 1）+ 類別 Chip 篩選 + 排序快選（Row 2）
- `applyReviewFilters()` 實現客戶端即時篩選（不重打 API）
- `sortReviewTable(field)` 支援所有欄位升降序排序
- `matchesOrderCategory(order, cat)` 按手模/鑰匙扣/頸鏈分類
- IIFE 事件綁定（修復 DOMContentLoaded 在 body 底部腳本中不觸發的 bug）
- 修復「無資料顯示」bug：applyReviewFilters 跨 script block 作用域問題，還原 fetch handler 直接調用 renderReviewTable

**批量操作工具列（#bulkActionBar）**：
- 舊 `#bulkDeleteBar`（僅刪除）升級為 `#bulkActionBar`（狀態 + 批次 + 刪除）
- `executeBulkStatusUpdate()` — 批量設定 Process_Status，POST 到 `update-order-meta` webhook
- `executeBulkBatchUpdate()` — 批量設定 Batch_Number，POST 到 `update-order-meta` webhook
- `executeBulkDelete()` — 現有功能保留，Supabase DELETE + n8n async 同步
- V41.html + current.html 同步更新

## [2026-05-16] Plan 0004 成本架構遷移完成 + Bug 6 根治

**Plan 0004 — Supabase 成本架構完整遷移**：
- Airtable API 月度 quota 耗盡（429），新建 `scripts/migrate_from_csv.js` 從 CSV 遷移
- 成功遷移：cost_configurations 28筆、products 489筆（含 cost_config_id 100% 連結）、orders 23筆、order_items 64筆
- 執行 `supabase/migrations/0004_cost_infrastructure.sql`：建立 `recalculate_product_costs()` function + `v_order_cost_breakdown` VIEW
- 驗證：cost_integrity ✓ matched 50筆，⚠ no product 15筆（歷史孤兒，可接受）

**Bug 6 根治 — Airtable 429 導致 Telegram 未執行**：
- 根因：`Smart Cache Strategist` Supabase 成功後，`Fetch Exact Base Cost`（Airtable 節點）仍執行 API 呼叫 → 月度 quota 耗盡 → 429 → workflow 中斷
- 修復：透過 n8n REST API PUT，設定 `Fetch Exact Base Cost` 節點 `onError: continueRegularOutput`、`continueOnFail: true`
- 效果：Airtable 429 不再中斷 workflow，Supabase 成本路徑正常，Telegram 正常發送

**Supabase Schema 中文欄位說明**：
- 新增 `supabase/migrations/0005_field_descriptions.sql`
- 為所有 table（cost_configurations、products、orders、order_items、sales_pipeline、error_logs）每個欄位補充中文 COMMENT，說明用途及跨表關聯

## [2026-05-15] Supabase-First Phase 1 + Bug 6 Rate Limit 修復

**n8n Smart Cache Strategist v47.2（Bug 6 修復）**：
- 根因：V47.1 停用 cache 後，每筆訂單都直打 Airtable API → 並發訂單觸發 Rate Limit 429 → Telegram 未執行
- 修復：偵測 `hasItems: true` 時加入 250ms async delay，防止並發爆 5 req/sec 上限
- 向後相容：無 SKU 訂單（hasItems: false）不受 delay 影響

**n8n Batch SKU Collector v40.6（Supabase-Ready 預備）**：
- 新增 `sku_list: string[]` 輸出（Supabase `get_base_cost_by_skus` RPC 所需格式）
- 保留 `batchFormula`（現有 Airtable 節點繼續使用，向後相容）
- Phase 2 切換時，n8n HTTP Request 節點直接讀取 `sku_list`，無需再改 Code node

**Supabase Phase 1 Infrastructure（新增檔案）**：
- `supabase/migrations/0003_base_cost_view_and_rpc.sql`：`v_products_with_costs` VIEW + `get_base_cost_by_skus` RPC
- `supabase/rpc/get_base_cost_by_skus.sql`：RPC 定義（參考文件，與 migration 一致）
- VIEW 欄位名稱刻意保留 Airtable 大寫慣例（`Product_Name`, `Total_Base_Cost`）→ n8n `Local Data Mapper` 零改動切換

**migrate_airtable_to_supabase.js 修復（database-reviewer 稽核後）**：
- P0-A Fix：`parseMoney()` 剝除 `$` 前綴，修復 Final_Sale_Price / Total_Cost / Net_Profit 全部歸零問題
- P1-A Fix：`parseDate()` 將 `"2026年1月20日"` 轉為 ISO `"2026-01-20"`，修復 PostgreSQL DATE 解析失敗
- P1-B Fix：新增 Base_Costs → cost_configurations 遷移段落（Step 0，先於 Product_Database 執行）
- P1-C Fix：`mapProduct` 讀取 `f.Main_Category`（原錯誤讀 `f.Category`）
- P1-D Fix：`mapProduct` 補齊 target_object / material / mode / item_per_set / suggested_price / markup_factor
- P2-A Fix：`mapOrderItem` 補入 reference_image_url + ai_suggestion 映射
- P2-B Fix：`mapOrderItem` 繼承父訂單 batch_number（透過 orderBatchMap）
- P2-C Fix：`mapOrderItem` 計算 subtotal_cost = item_base_cost × quantity
- P2-D Fix：products 遷移時解析 Linked_Base_Cost → cost_config_id UUID

**n8n Smart Cache Strategist v47.3（Supabase-First 成本查詢）**：
- 直接呼叫 Supabase RPC `get_base_cost_by_skus` via `fetch()`
- 成功時：將成本 map 存於輸出 `supabaseCosts`，並將 `batchFormula` 覆寫為 `RECORD_ID()='SUPABASE_SKIP'`（Airtable 節點返回空結果而非報錯，工作流不中斷）
- 失敗時：回退 Airtable 路徑（v47.2 延遲保護仍有效）

**n8n Local Data Mapper v40.6（Supabase-First 感知）**：
- 優先讀取 Smart Cache Strategist 的 `supabaseCosts`（Supabase 路徑）
- 若 `supabaseFetched: false`：回退讀取 Fetch Exact Base Cost Airtable 輸出
- 此修復連帶解決 Telegram 未發送問題（Airtable Rate Limit 不再中斷工作流）

**Fat Mo 待執行（SQL migration）**：
1. 在 Supabase SQL Editor 執行 `0003_base_cost_view_and_rpc.sql`
2. 確認 `products` 表 `total_base_cost` 已填入（488 SKU）
3. n8n UI 更新 Telegram 節點文字：「Upsert 至 Airtable」→「寫入 Supabase」

---

## [2026-05-15] Badge 顯示架構全面重構 + Bug 修復

**Badge 兩行佈局**：所有產品 badge 改為兩行顯示
- Row 1：類別 + 材質（鎖匙扣/純銀吊飾）或 類別 + 款式（立體擺設）
- Row 2：對象 + 部位 + 數量，或個別人物肢數 badges
- 技術實現：flex line-break（`flex-basis:100%;height:0`）分隔行

**個別人物肢數 Badges**（立體擺設）：
- 舊格式：一個黃色 badge `✋🦶 4肢`
- 新格式：每人獨立彩色 badge — `👶 嬰兒 4肢`（藍）、`👫 父母 2手`（粉）、`🧒 大寶 4肢`（綠）
- 資料結構：`LimbParts` JSON 陣列 `[{who, sum}]` 存入 mapOrder return object

**Bug Fix — 鎖匙扣 不銹鋼 badge 消失**：
- 根因：`product_name`（含 `不銹鋼`）未存入 Supabase `order_items`，`combinedSearch` 無法偵測材質
- 修復：`getProductDimensions` 加 category fallback（`金屬鎖匙扣` → `⚙️ 不銹鋼`，`吊飾/頸鏈` → `✨ 925銀`）

**Bug Fix — 木框 顯示舊格式**：
- 根因：舊訂單無 raw_form_state limb_sel 資料 → `LimbParts` 空 → 回退到 target badge + 黃色 count badge
- 修復：立體擺設一律隱藏 target badge；無 `LimbParts` 但有 `dimensions.count` 時，改顯示藍色 `👶 嬰兒 4肢` badge

**CSS 新增**：`.badge-target-父母`（粉紅）、`.badge-target-大寶`（綠色）

---

## [2026-05-14] Fix 4D 系列 + Overview Badge 全面修復

**Fix 4D-v1**（mapOrder）：P 款從 `raw_form_state.limb_sel_嬰兒_*` 派生肢數，但 key 名稱錯誤（用 lh/rh/lf/rf）→ 讀不到資料
**Fix 4D-v2**（mapOrder）：修正 key 為中文（左手/右手/左腳/右腳），同時加入父母角色

**Fix 4D-v3**（mapOrder）：排除「待定」→ 玻璃瓶大寶/父母 section 預設值為「待定」，被錯誤計入 → 8肢 → 無 pattern 匹配 → 空白
根因：嬰兒「待定」=有選取（顏色TBD），大寶/父母「待定」=section 預設空值。分兩層邏輯解決。

**Bug 1 UI**：total_cost/net_profit = 0 時顯示「待計算」取代 $0（n8n 未處理時避免誤解）

**Badge 清理**：
- 立體擺設有 count 時，不重複顯示 part（避免 ✋ 1手1腳 旁多餘 ✋）
- 立體擺設不顯示 x1 數量 badge（套裝不需要數量）
- Accordion renderer 補入 style + count badge 渲染

**getProductDimensions 擴展**：新增 1手1腳/2手/2腳/1手/1腳 pattern 偵測

---

## [2026-05-14] Fix 5C — Bug 5 真正根因修復（confirmed_at IS NULL 排除問題）

**Fix 5C**（line ~7594 `sbFetchGlobalReview`）：日期過濾改用 PostgREST `or(col.gte.X,col.is.null)` 語法
- 真正根因：PostgreSQL NULL 比較永遠返回 false → `confirmed_at.gte.YYYY-01-01` 排除所有 NULL confirmed_at 訂單
- Fix 5A 只解決新訂單，歷史訂單（NULL confirmed_at）仍被排除
- 修復：`qs['and']` 兩個條件均加 `or(...,confirmed_at.is.null)` → NULL 訂單同時顯示

---

## [2026-05-14] Fix 5A/5B + Fix 4 + Bug 6 根因確認

**Fix 5A**（line ~7350 `sbSyncOrder`）：`orderRow` 加入 `confirmed_at: new Date().toISOString()`
- 根因：confirmed_at 為 NULL → `sbFetchGlobalReview` 的日期 range filter 靜默排除所有新訂單
- 修復：每次 sbSyncOrder upsert 時設置當前時間（n8n 之後可覆蓋正確狀態日期）

**Fix 5B**（line ~7399 `sbSyncOrder` 末尾）：完成後 400ms 觸發 `fetchGlobalReview(true)`
- 根因：同步後 Overview 不自動更新，用戶需等 5 分鐘 auto-refresh 或手動刷新
- 修復：同步完成立即刷新 Overview，訂單即時可見

**Fix 4**（line ~7507 `mapOrder`）：P 產品從 `raw_form_state` 補充款式類型 + 刻字
- 根因：`item_key=TEMP_P_MAIN` 無法派生 pSubCat/pEngraving，Overview 顯示空白
- 修復：`_cat === '立體擺設'` 時從 `_rfs.pSubCat` 補 Specification，`_rfs.pEngraving` 補 Engraving

**Bug 6 根因確認（n8n 執行日誌）**：
- `Fetch Exact Base Cost` 節點觸發 Airtable API Rate Limit（30 req/sec），workflow 停止
- 後續 `Send Profit Report`（Telegram）節點完全未執行
- 影響執行：#3383, #3385, #3387, #3388（2026-05-13–14）
- 修復方向：n8n `Fetch Exact Base Cost` 節點加 retry / exponential backoff（下次 n8n session 處理）

---

## [2026-05-14] 新發現 Bug（待修復）— Overview + Telegram

**測試基礎**：test001–007 CRUD 全部 PASS；test-e1 人手測試成功

**Bug 4**（Overview P 款式不符）：`mapOrder` 只讀 `order_items.item_key`（TEMP_P_MAIN），不讀 `raw_form_state.pSubCat`，導致總覽欄位與編輯表單不一致。根因定位：`freehandsss_dashboardV41.html` line ~7402 `mapOrder()` 函數。

**Bug 5**（新增訂單後總覽需等 3 分鐘）：
- `sbSyncOrder.orderRow` 未帶 `confirmed_at` → Supabase 存 NULL → `sbFetchGlobalReview` 的 date range filter（`confirmed_at.gte.YYYY-MM-01`）靜默排除所有 NULL confirmed_at 訂單
- `sbSyncOrder` 完成後沒有觸發 `fetchGlobalReview(true)`
- 根因定位：line ~7347 `orderRow` 物件 + line ~7398 `sbSyncOrder` 末尾

**Bug 6**（無 Telegram 訊息）：需查 n8n 執行日誌，根因未定位

---

## [2026-05-13] Fix 4B/4C/pEngraving — 立體擺設全欄位還原修復

**執行依據**：Fat Mo `/execute` 授權（flow_id: 2026-05-13-2257）

**根本原因**：`reconstructOrderFromSupabase` 第二次 `restoreFormState(_synth)` 呼叫時，`renderLimbGrid()` 重建整個 `limbContainer` DOM，導致 `babyQuickColor`、`limb_sel_*`（全部肢體顏色）、`pEngraving`、`woodStyle`、`baseColor`、`en_parent`/`en_elder` 全部重設為預設值。

**修復內容（freehandsss_dashboardV41.html）**：
- **Fix 4B 擴展**（line ~4542）：`renderLimbGrid()` 後 loop re-apply 所有動態元素（`baseColor`、`woodStyle`、`babyQuickColor`、`babyCustomColor`、`en_parent`、`en_elder`）
- **Fix 4C 擴展**（line ~4866）：`restoreFormState(_synth)` 前從 `raw_form_state` carry over 所有無法從 `order_items` 派生的欄位，包含全部 `limb_sel_*` 鍵（最關鍵修復）
- **pEngraving save fix**（line ~4022）：立體擺設 push 補入 `Notes: pEngraving.value`，確保 Supabase `order_items.engraving_text` 不永遠為空

**待測試**：10 個 `test+數字` CRUD 訂單全套驗證（見 artifacts/2026-05-13-2257/cl-final-plan.md）

---

## [2026-05-13] Bug Fix + 架構文件 + fhs-bug-triage Skill

**執行依據**：Fat Mo `/execute` 授權

**代碼修復**：
- `sbSyncOrder()` 補入 `final_sale_price` 欄位（V41 line 7315）— 修復財務欄位同步後為 0 的 Bug
- 確認 sbSyncOrder 寫入邊界：9 個允許欄位（收款 + UI）/ 6 個禁止欄位（n8n SSoT 成本）

**架構文件**：
- `n8n/Quadruple_Sync_Field_Map.md` 升至 v1.1：成本計算雙層架構決策、sbSyncOrder 白名單、raw_form_state 解碼表
- `supabase/descriptions_comments.sql`：6 張表全欄位中文說明（Fat Mo 查閱用）

**Skill 新增**：
- `.fhs/ai/skills/fhs-bug-triage/SKILL.md`：5-Gate Completion Protocol
  - Gate 1 Code / Gate 2 DB / Gate 3 Exec / Gate 4 Verify / Gate 5 No-Regress
  - 防止「代碼已寫 ≠ Bug 已修復」的假完成模式

**Subagent 整合**：
- `build-error-resolver.md`：掛入 fhs-bug-triage skill，補充完成宣告前強制執行說明

**文件清理**：
- 刪除 5 份重複 Setup 文件，精簡 SUPABASE_RLS_SETUP.md，新增單一 Postmortem

**尚待 Fat Mo 手動執行**：
- Supabase SQL Editor 建立 4 個 RLS 寫入 Policy（見 `.fhs/setup/SUPABASE_RLS_SETUP.md`）

---

## [V41 Dashboard UI/UX Optimization] - 2026-05-11

**執行依據**：Fat Mo `/execute` 授權

**核心變更**：
- **Supabase 切換按鈕重構**：移除右下角遮擋行動版按鈕的浮動開關，整合至頂部狀態列。
- **狀態列整合**：改為「狀態晶片 (Status Chip)」樣式，具備綠色呼吸燈 (ON) 與中性灰 (OFF) 狀態。
- **響應式優化**：手機端自動隱藏標籤文字，保留圖示與狀態燈，提升操作空間。

**部署動作**：
- **發佈**：同步 `freehandsss_dashboardV41.html` 至 `Freehandsss_dashboard_current.html`。
- **狀態**：生產環境已更新，解決了按鈕遮擋的 UX 痛點。

---

---

## [Supabase Phase 3 — Dashboard V41 Supabase 讀取層] - 2026-05-10

**執行依據**：Fat Mo `/execute` 授權

**核心變更**：建立 `freehandsss_dashboardV41.html`，在 V40 基礎上注入 Supabase Read Layer。

**架構設計**：
- 寫入路徑不變（Dashboard → n8n webhook → Airtable + Supabase 雙寫）
- 讀取路徑新增 Supabase-first 選項，失敗自動 fallback → n8n webhook

**新功能**：
- Feature Flag 切換按鈕（右下角固定 pill，點擊切換，localStorage 持久化）
- `fetchGlobalReview` 攔截：PostgREST 直查 orders 表（支援年/月/狀態/搜尋篩選）
- `foFetchLive` 攔截：`get_order_summary` RPC 月/年彙總 → Financial Overview KPI
- Supabase 讀取失敗自動 fallback 至 n8n webhook，不中斷服務
- Source badge 顯示（📡 Supabase / ⚠️ n8n fallback）

**新增文件**：
- `Freehandsss_Dashboard/freehandsss_dashboardV41.html`（V40 + 258 行 Supabase 層）

---

## [Supabase Phase 2 — n8n 雙寫機制 + 歷史資料遷移] - 2026-05-10

**執行依據**：Fat Mo `/execute` 授權

**核心變更**：FHS_Core_OrderProcessor 工作流程加入 Supabase 並行雙寫，歷史資料遷移完成。

**n8n 新增節點（26 nodes）**：
- `Mirror to Supabase` (Code) — CREATE path 並行分支，接在 Create Sub Items 後
- `Mirror Delete to Supabase` (Code) — DELETE path 並行分支，接在 Delete Record 後
- Feature Flag：`supabase_mirror_enabled` Static Data（預設 ON）
- Supabase 失敗完全隔離，不影響 Airtable 主流程

**歷史資料遷移結果**：
- orders: 23 筆（Airtable 24 筆，1 筆重複 order_id 去重）
- order_items: 62 筆
- products: 489 筆

**新增文件**：
- `scripts/add_supabase_mirror_nodes.js` — n8n workflow 更新腳本
- `scripts/migrate_airtable_to_supabase.js` — 歷史資料遷移腳本
- `supabase/migrations/0002_add_deleted_at.sql` — orders 軟刪除欄位

**Fat Mo 待辦**：在 n8n 設定環境變數 `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`（Mirror 節點才能生效）

---

## [Supabase Phase 1b — Cloud Migration 執行完成] - 2026-05-10

**執行依據**：Fat Mo 提供 DB 密碼授權自動執行

**核心變更**：`run_supabase_migration.js` 透過 Session Pooler 連接 Supabase cloud，依序執行全部 6 個 SQL 文件。

**執行結果**：
- 6 Tables 建立成功：`orders`, `order_items`, `products`, `cost_configurations`, `sales_pipeline`, `error_logs`
- 4 RPC Functions 建立成功：`get_order_summary`, `get_profit_audit`, `get_recent_orders`, `get_products_by_category`
- RLS Policies 套用成功
- 連接方式：Session Pooler `aws-1-ap-northeast-1.pooler.supabase.com:5432`（IPv4 相容）

**新增工具**：`scripts/run_supabase_migration.js`

**下一步**：Phase 2 — n8n 雙寫機制建立

---

## [Supabase Phase 1 — Schema SQL 文件建立] - 2026-05-10

**執行依據**：Fat Mo `/execute` 授權

**核心變更**：建立 FHS Supabase 完整 Schema 文件（Migration + RLS + 4 個 RPC function）。含 database-reviewer 全部 P0/P1 修正。

**新增文件**（supabase/ 目錄，10 個文件）：
- `supabase/migrations/0001_initial_schema.sql` — 6 表 DDL，ENUM，UUID PK，all P0/P1 fixes
- `supabase/rls/rls_policies.sql` — anon read-only，service_role full，cost_configs internal
- `supabase/rpc/get_order_summary.sql` / `get_profit_audit.sql` / `get_recent_orders.sql` / `get_products_by_category.sql`
- `supabase/README.md`、`supabase/ANTI_IDLE_SETUP.md`、`.env.supabase.example`

**P0 關鍵修正**：
- `order_items.order_fhs_id VARCHAR(20)` FK（解決 n8n 無法直接寫入 UUID 問題）
- `orders.final_sale_price NOT NULL DEFAULT 0`（AGENTS.md 財務真理強制）

**Fat Mo 待辦**：建立 Supabase Free Tier 專案 → 執行 migration SQL → 設定 Anti-Idle ping

---

## [Supabase Phase 0 — 盤點與對齊 + AGENTS.md v1.4.4] - 2026-05-10

**執行依據**：Fat Mo `/execute` 授權（cl-flow 2026-05-09-2318 CONDITIONAL_READY）

**核心變更**：啟動 Supabase 永久雙系統共存計畫 Phase 0。完成 FHS 全系統盤點，產出四份文件，更新 AGENTS.md 加入 Supabase 四端共存規則。

**新增檔案**：
- `n8n/Airtable_Schema_Snapshot_2026-05.md` — Airtable 6 表 schema + Postgres DDL 草稿
- `n8n/N8N_Node_Interaction_Map.md` — n8n 24 nodes 互動圖 + 雙寫改造計畫
- `n8n/Quadruple_Sync_Field_Map.md` — 四端欄位映射（擴展 Triple_Sync）
- `.fhs/reports/completion/2026-05-10_supabase-phase-0_completion_report.md`

**修改檔案**：
- `.fhs/ai/AGENTS.md` v1.4.3 → v1.4.4（新增 Supabase 雙系統共存規則 7 條）
- `docs/repo-map.md`（更新 n8n/ 目錄條目）

**Fat Mo 確認決策**：Supabase Free Tier + 永久雙系統共存（不退役 Airtable）

---

## [Dashboard 嬰兒顏色與預設邏輯更新] - 2026-05-09

**執行依據**：Fat Mo `/execute` 授權（Dashboard 顏色與邏輯優化）

**核心變更**：
- **顏色選項擴充**：`colors` 陣列新增「粉紅色」、「藍色」，移除「粉紅及藍」複合選項。
- **自訂模式預設值機制**：修改 `babySetMode`，確保切換至「自訂 ↓」時，四肢顏色預設為「待定」。
- **報價與預覽一致性修復**：修正 `pricing` 與 `preview` 邏輯中對「待定」的過濾規則，確保其被計入有效肢體以計算正確價格（$2380）並在 IG 訊息中正確顯示。

**修改檔案**：
- `Freehandsss_Dashboard/freehandsss_dashboardV40.html` (V40.8 → V40.9)

---

## [finance-auditor Subagent v1.0.0 — 三端財務稽核員] - 2026-05-10

**執行依據**：Fat Mo `/execute` 授權（Option A：互動式 Live 驗證）

**核心變更**：

建立新 FHS Subagent `finance-auditor`，專門執行互動式 Live Airtable 三端財務驗證（Airtable ↔ n8n ↔ Dashboard），與現有財務工具（database-reviewer 靜態審查、/fhs-cost-audit 批次掃描）職責正交。

**新增檔案**：
- `.fhs/ai/subagents/freehandsss/finance-auditor.md` — v1.0.0（Single-file 內嵌 Python 邏輯，Supabase 就緒）
- `.fhs/reports/completion/2026-05-10_finance-auditor-subagent_completion_report.md`

**FHS_Prompts.md v1.4 → v1.5**：
- 情境五觸發詞收窄：移除「利潤」「Total Cost」，改為「財務規則確認」（靜態規則查詢，不涉及 Live 數據）
- 新增情境二十一：finance-auditor 互動式三端驗證觸發詞（「對帳」「Live 驗證」「Airtable 利潤驗證」「訂單成本比對」等）

**AGENTS.md 新增決定性路由規則**：
- `finance-auditor` 條目：Live Airtable 財務驗證 → 必須調用 finance-auditor，無例外

**設計決策（decisions.md）**：
- 三端架構清晰切割（Tier 1 Airtable / Tier 2 n8n / Tier 3 Dashboard 前端真理）
- Supabase 就緒：Tier 1 查詢層已抽象化，未來遷移只需替換連接方式，不改稽核邏輯
- 強制讀取 finance-calculator skill，不重複定義公式（省 token）

---

## [Subagent 決定性路由規則 + Skills 連接] - 2026-05-09

**執行依據**：Fat Mo 口頭授權（「1及2 均執行」）

**核心變更**：

將 subagent 調用從「軟性建議（proactively）」升級為「決定性強制規則」，並連接 agent definitions 與對應 skill 文件。

**AGENTS.md 新增 Subagent 決定性路由規則（8條）**：
覆蓋所有 FHS 專屬 subagent（frontend-developer、code-reviewer、ui-designer、build-error-resolver、database-reviewer、tdd-guide、blender-3d-modeler、Explore）。條件成立 → 必須調用，無例外。

**Agent Definition Skills 連接**：
- `build-error-resolver` → 強制載入 `systematic-debugging.md`（Iron Law：根因確認前禁止修復）
- `tdd-guide` → 強制載入 `test-driven-development.md`（禁止跳過 RED 階段）
- `database-reviewer` → 強制載入 `read-only-postgres.md` + `supabase-query.md`

---

## [FHS_Prompts 路由修復 + AGENTS.md 強制律] - 2026-05-09

**執行依據**：Fat Mo `/execute` 授權（Range B）

**核心變更**：

修復路由總機 `docs/FHS_Prompts.md` 的覆蓋缺口，並在 `AGENTS.md` 加入結構性防護，確保未來新增指令時路由不再靜默過期。

**FHS_Prompts.md v1.3 → v1.4**：
- 修正情境九：移除已廢除的「每10則對話自動存檔」觸發條件，改為「用戶輸入 checkpoint / 存檔」
- 新增情境十三：`/debug-guide`（代碼根因調查，與情境四 Error Eye 明確區分）
- 新增情境十四：`/tdd-guide`（測試驅動開發）
- 新增情境十五：`/five`（五個為什麼根因分析）
- 新增情境十六：`/fhs-cost-audit`（成本完整性稽核，與情境五財務審計明確區分）
- 新增情境十七：`/cl-flow-fast`（輕量快速規劃）
- 新增情境十八：`/db-query`（資料庫查詢）
- 新增情境十九：`/mermaid`（流程圖與架構圖）
- 新增情境二十：`/code-analysis`（代碼分析）

**AGENTS.md 新增規則**：
- 新增「FHS_Prompts.md 路由同步強制律」：凡新增或刪除 `.fhs/ai/commands/` 指令檔，必須同步更新 `docs/FHS_Prompts.md`，違反視為任務未完成。

**fhs-audit.md 更新**：
- A4-3 改為確定性覆蓋率檢查：逐一列出缺少 FHS_Prompts.md 路由條目的指令，輸出格式從「孤獨」改為「缺少路由」清單。

**版本資訊**：
- FHS_Prompts.md：v1.4（新）
- AGENTS.md：v1.4.3（規則內容新增，版本號不變）
- Dashboard / n8n：不變

---

## [Skill Import — superpowers + awesome-claude-code] - 2026-05-09

**執行依據**：Fat Mo `/execute` 授權（Flow 0152 + Flow 0206）

**核心變更**：

新增 `.fhs/ai/skills/vendor/` 目錄，引入來自 `obra/superpowers` 及 `hesreallyhim/awesome-claude-code` 的外部技能與指令，採 vendor-in 策略（複製至本地，不依賴外部 repo）。

**新增 Skills（Master 層）**：
- `.fhs/ai/skills/vendor/superpowers/test-driven-development.md` — TDD RED-GREEN-REFACTOR 強制機制
- `.fhs/ai/skills/vendor/superpowers/systematic-debugging.md` — 四階段根因調查法（Iron Law: 未完成 Phase 1 禁止修復）
- `.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md` — 唯讀 PostgreSQL/Supabase 查詢（10K row limit，write-block）
- `.fhs/ai/skills/vendor/awesome-cc/supabase-query.md` — Supabase Management API CLI（DDL/RLS/Storage）
- `.fhs/ai/skills/vendor/awesome-cc/hooks-setup-guide.md` — Dippy + parry hooks 安裝指南（待手動安裝）

**新增 Claude Code Commands（可立即使用）**：
- `/tdd-guide` — TDD 強制執行橋接
- `/debug-guide` — 系統化除錯橋接
- `/db-query` — Supabase/PostgreSQL 唯讀查詢橋接（解決 P-HIGH #2）
- `/five` — 五個為什麼根因分析
- `/mermaid` — SQL/Airtable schema → Mermaid 圖表
- `/code-analysis` — 多角度代碼深度分析

**版本資訊**：
- 前端 Dashboard：V40.8（不變）
- n8n Workflow：V45.7.4（不變）
- 憲法層：v1.4.3（不變）

---

## [freehandsss_dashboardV40.html IG 預覽格式調整] - 2026-05-08

**核心變更**：
- **`freehandsss_dashboardV40.html` IG 預覽格式調整**：
  - 更新 Category B 金屬產品（嬰兒、大寶、家庭組合）的 IG 預覽訊息輸出格式。
  - 將刻字內容排版從原本的一行改為分行，並加上獨立的「刻字」標題，以對齊客戶需求格式。
  - 動態調整 Category B 的區塊標題：若包含取模服務（`hasP` 為 true）則顯示為「【加購項目】」；若為純金屬/吊飾訂單（`hasP` 為 false）則顯示為「【單購項目】」。
  - 修正「刻字」與「上排/下排」文字的縮排對齊（加入 3 個半形空白），以確保輸出排版一致且美觀。

**版本資訊**：
- 前端 Dashboard：V40.8（不變）
- n8n Workflow：V45.7.4（不變）
- 憲法層：v1.4.3（不變）

## [Maintenance_Tools: audit_total_cost_integrity.py 詳細格式重構] - 2026-05-08

**核心變更**：
- **`Maintenance_Tools/audit_total_cost_integrity.py` 完整重構**：
  - 從簡單 rollup 比較轉換為訂單逐項明細報告格式
  - 新增 `fetch_order_items_batch(order_item_ids)`：批量讀取 Order_Items，分頁遍歷全表並過濾指定 ID，返回記錄 ID → 欄位字典映射
  - 新增 `build_detailed_report_section(rec)`：為單筆訂單產出詳細 markdown 段落，包含產品表、小計、跨部位扣減邏輯、最終成本、收入利潤
  - 修正欄位 ID：Appointment_Date `fldEJXnuXW5kgEgb0`、Order_Items 表 `tbljkptnNcUEyDRFH`
  - 解決 lookup/formula 欄位回傳陣列問題：型別檢查 + 首元素提取
  - 輸出報告格式與 `.fhs/notes/2026-05-04_cost_audit_detailed.md` 對齊
- **執行與驗證**：
  - 命令：`PYTHONIOENCODING=utf-8 python Maintenance_Tools/audit_total_cost_integrity.py`
  - 驗證結果：全 23 單成本核對通過（✅ 正常: 23, ⚠️ 待確認: 0）

**版本資訊**：
- n8n Workflow：V45.7.4（不變）
- 憲法層：v1.4.3（不變）

---

## [V40.9 — n8n 零成本防衛機制 + /fhs-cost-audit 指令] - 2026-05-07

**執行依據**：Fat Mo 授權（`/execute`）

**核心變更**：
- **n8n Node 14 "Calculate Profit & Pack Items" V40.6 → V40.9**：
  - 新增零成本 SKU 防衛機制：偵測 `Total_Base_Cost = $0` 的有效 SKU
  - 輸出 `Cost_Lookup_Warning`（警告文字）與 `Has_Cost_Error`（布林值）
  - 防止因 SKU 名稱查找失敗導致 Total_Cost 靜默偏低（如 Katkat 問題一根因）
- **Airtable Order_Items 公式修正**：
  - `Keychain_Cost` / `Handmodel_Cost` / `Necklace_Cost` 三個欄位公式移除錯誤的 `× Quantity`
  - 修正 Shirley 問題二：批次價 $290 × Quantity 2 = $580 → 正確 $290（已驗證）
- **新增 `/fhs-cost-audit` 指令**：
  - Master：`.fhs/ai/commands/fhs-cost-audit.md`
  - Bridge：`.claude/commands/fhs-cost-audit.md`
  - 觸發腳本：`python Maintenance_Tools/audit_total_cost_integrity.py`
- **新增 `Maintenance_Tools/audit_total_cost_integrity.py`**：
  - 掃描所有 Main_Orders，比對 Total_Cost 與 rollup 加總
  - 輸出報告至 `.fhs/notes/aireports/total_cost_audit_YYYY-MM-DD.md`

**版本資訊**：
- n8n Workflow：V40.9（Node 14 防衛升級）
- 憲法層：v1.4.3（不變）
- 指令系統：新增 `/fhs-cost-audit`

---

## [blender-3d-modeler v2.0.0 — Triage-first FDM Subagent] - 2026-05-07

**執行依據**：Fat Mo 授權（`/execute` — Flow 2026-05-07-1007）

**核心變更**：
- **blender-3d-modeler subagent v1.0.0 → v2.0.0**：
  - 新增 STL Triage 決策樹（REPAIR / REBUILD / HANDOFF）
  - 新增 FDM Printability Check（Bambu P1S 基準：壁厚 0.8mm、懸臂 45°）
  - 新增 HANDOFF 工具清單（Meshmixer / Fusion 360 / ZBrush 等）
  - 新增 3d/ 路徑規則（input / projects / output 三層）
  - 開放藝術建模、造型設計、美學調整能力（移出 Non-Goals）
  - 強化 Non-Goals 邊界（切片參數、支撐生成、多材料）
- **新增 3d/ 工作目錄**：heart-hand-cavity 專案已遷移至新路徑結構
- **MANIFEST.md**：blender-3d-modeler 版本號更新至 2.0.0

**版本資訊**：
- 憲法層：v1.4.3（不變）
- Subagents：7 個活躍（blender-3d-modeler 升至 v2.0.0）
- 3D 路徑：新增 `3d/` 目錄結構

---

## [AGENTS.md v1.4.3 - Session Initialization & Token Economy] - 2026-05-06

**執行依據**：Fat Mo 授權（`/execute` 指令）

**核心變更**：
- **新增 Rule 3.11「會話初始化與 Token 節約原則」**：
  - 制度化 Hook 系統的輕量快照機制（~300 tokens），優先於全量重載（~2000 tokens）
  - 明確澄清 Anti-Stale Timestamp Check 的範圍限制：**僅適用於 session 內的重複讀取，新 session 首次初始化不受限制**
  - 防止 LLM context 全新但被誤認為已讀的失憶風險
- **更新 `read.md`**：明確標示 `/read` 為「全量重載」指令，非日常初始化工具
- **刪除根目錄 `repomix-output.txt`**：移除大型文字檔減少 grep 雜訊

**版本資訊**：
- 憲法層：v1.4.3 (新增 Rule 3.11)
- UI 層：V40.8 (Stable)
- Subagents：8 個活躍

## [System Hygiene & Boundary Recognition] - 2026-05-06

**執行依據**：Fat Mo 授權（系統優化、冗贅清理與執行邊界校正）

**核心變更**：
- **執行邊界認知校正**：重新確認 `AGENTS.md` 行動綱領。未來任何涉及檔案寫入或刪除的操作，必須嚴格執行「規劃優先 → 產出 `ag-plan` → 等候授權」流程。
- **移除棄用資源**：
    - 強制刪除 `Maintenance_Tools/rebuild_index.py`、`rebuild_index.py`、`scripts/rebuild_index.py` (因系統索引已穩定，不再需要手動重建)。
    - 從 `docs/repo-map.md` 中清除所有與該指令相關的參照。
- **文檔與指令集維護**：
    - 更新 `scripts/README.md`，設立「Legacy 歷史資料遷移與校正腳本」區塊，歸檔四個過往處理 2026-Q1 數據的歷史腳本。
    - 更新 `.fhs/notes/SOP_NOW.md` 指令對照表，加入 `cl-flow-fast`、`ag-stitch-sync` 與 `ag-ui-import`。
    - 更新 `.fhs/ai/commands/README.md`，將 `cl-flow-fast` 加入指令集索引。
- **橋接機制補齊**：
    - 在 `.agents/workflows/` 新增 `ag-stitch-sync.md` 與 `ag-ui-import.md` 橋接檔，對齊 `.fhs/ai/commands/` 下的定義。

**版本資訊**：
- UI 層：V40.8 (Stable)
- 憲法層：v1.4.2
- Subagents：8 個活躍 (含新橋接指令支援)

## [V40.8 Dashboard UI/UX & Finance Optimization] - 2026-05-05

**執行依據**：Fat Mo 授權（UI/UX enhancements & financial logic alignment + Blender Automation）

**核心變更**：
- **移除嬰兒月齡邏輯**：移除「嬰兒月齡」輸入框與相關紅框警告，版面精簡化。
- **動態報價明細 (#priceBreakdown)**：在「系統精算建議報價」旁新增動態明細顯示（例：`$3240 (2380+860)`），並優化框架自動高度調整。
- **財務 UI/UX 智能預填**：
  - 「已付訂金/全數」欄位在無手動輸入時，預設自動顯示系統建議總價。
  - 欄位區分「佔位建議值（淺黑色）」與「手動輸入值（實黑色）」，提升視覺回饋。
- **IG 訊息分段預覽對比優化**：修正預覽卡片標題顏色為純白，解決在深藍背景下文字看不清楚的問題。
- **部署 Blender 3D 建模子代理 (Subagent)**：
  - 建立 `blender-3d-modeler`，封裝 MANIFOLD boolean、碎片清除、外殼放量、Z-slice 分析等 Python 建模配方。
  - 採用單檔案內嵌知識架構，確保 MCP 工具執行權限。

**版本資訊**：
- UI 層：V40.8
- 憲法層：v1.4.2
- Subagents：7 個活躍 (新增 Blender 建模專家)
- n8n Workflow：V45.7.4

## [V40.7 Dashboard Promotion to Stable Production] - 2026-05-05

**執行依據**：Fat Mo 授權（promote V40 to current）

**核心變更**：
- 將 `freehandsss_dashboardV40.html` (V40.7) 複製並覆蓋 `Freehandsss_dashboard_current.html`。
- V40.7 正式成為穩定生產版基準，具備 iPhone/Desktop 響應式設計、財務優化與 API 快取功能。

**文件同步**：
- `README.md` (root)：更新版本狀態、特性說明與最後更新日期 (2026-05-05)。
- `docs/repo-map.md`：更新檔案地圖，將 V40.7 標註為現役正式環境。
- `Freehandsss_Dashboard/README.md`：同步更新版本號 (V40.7) 與功能描述。
- `.fhs/notes/SOP_NOW.md`：更新系統快照，將 V40.7 列為穩定生產版，憲法層對齊至 v1.4.2。

**版本資訊**：
- UI 層：V40.7
- 憲法層：v1.4.2
- n8n Workflow：V45.7.4

## [Blender MCP 環境建置完成] - 2026-05-05

**執行依據**：Fat Mo 授權（安裝 Blender MCP 完整環境）

**Blender MCP 環境建置**：
- 確認 Blender 5.1.1 已安裝（`C:\Program Files\Blender Foundation\Blender 5.1\`）
- 安裝 uv 0.11.8（`C:\Users\Edwin\.local\bin\`）
- 下載並安裝 Blender MCP addon v1.2（blender_mcp_addon.py → Blender Preferences）
- Claude Code MCP server 設定完成（`claude mcp add blender`，已寫入 `~/.claude.json`）
- Blender ↔ Claude Code 連線測試通過（port 9876，status: ✅ Connected）

**注意**：每次開啟 Blender 需重新點「Connect to MCP server」（port 9876）

## [AGENTS.md v1.4.2 + Stitch 整合 + Dashboard 修正 + 成本分拆欄位] - 2026-05-03

**執行依據**：Fat Mo 授權（Stitch 解鎖 + execute）

**AGENTS.md 升級至 v1.4.2**：
- 新增「Stitch 資產守護」原則（禁止 Stitch 輸出未轉換直入主核心）
- 新增「Airtable 計算職責分工」原則（財務計算由 n8n 負責，Airtable formula 僅作展示輔助）

**Stitch → Antigravity 整合（Phase A–D 完成）**：
- 新增 `.fhs/ai/commands/ag-stitch-sync.md`、`.fhs/ai/commands/ag-ui-import.md`
- 更新 `ANTIGRAVITY.md`、`ui-designer.md`、`frontend-developer.md`、`commands/README.md`
- pending task 標記 COMPLETED，completion report 已存檔

**Dashboard Bug 修正 — IG 預覽「待定」遺漏**：
- `formatLimbs()` 移除 `&& !== "待定"` 過濾，【嬰兒】/【父母】/【大寶】待定值均正常顯示
- 同步修正 `freehandsss_dashboardV40.html` + `Freehandsss_dashboard_current.html`

**Airtable 成本分拆欄位建立**：
- Order_Items：新增 `Handmodel_Cost`、`Keychain_Cost`、`Necklace_Cost`（formula 欄位）
- Main_Orders：新增對應 3 個 Rollup 欄位（SUM）
- n8n Create Sub Items 節點待更新以直接寫入上述欄位（formula 方案受 lookup 限制）

**n8n 安全網確認**：
- Create Sub Items 節點確認已是純 upsert（matchingColumns: Order_Item_Key），待辦關閉

## [FHS Hook 自動化系統 v1.0.0 上線] - 2026-04-28

**執行依據**：Fat Mo `/execute` 授權（flow_id: 2026-04-28-1844）

**新增 Hook 執行層（3 個腳本）**：

- `scripts/hooks/session-start-sop.sh` — SessionStart hook：自動注入 SOP_NOW + handoff 摘要，取代手動 `/read`
- `scripts/hooks/prompt-router.js` — UserPromptSubmit hook：任務路由器，偵測 9 種任務類型並建議對應 subagent/skill/model
- `scripts/hooks/pre-tool-guard.js` — PreToolUse hook：AGENTS.md 硬規則守護，阻止 8 類違規操作

**Hook 配置**：

- `.claude/settings.json`（project-level）：新增 SessionStart + UserPromptSubmit + PreToolUse 三層 hooks

**沉積清理**：

- `C:\Users\Edwin\.claude\settings.json`（global）：~90 條一次性歷史許可 → 38 條 pattern-based 許可（減少 58%）

**文件同步**：

- `docs/repo-map.md`：新增 `scripts/hooks/` 目錄條目
- `scripts/README.md`：新增 hooks/ 子目錄說明與回滾方法

---

## [系統文檔一致性大掃除 — Deep Audit & Resync] - 2026-04-28

**執行依據**：Fat Mo `/execute` 授權（flow_id: 2026-04-28-0232）

**全域一致性修復**：

- **版本對齊**：根目錄 README 正式升級至 `V40` 開發主流，`AGENTS.md` 引用更正為 `v1.4.1`。
- **幽靈清理**：移除全域 README 中對已刪除指令 `/fhs-health` 與廢棄指令 `/reflect` 的所有參照。
- **錯字修正**：修正 `n8n-mcp-server` 備份路徑 `aireports` → `ai_reports` 拼寫錯誤。

**文檔補全**：

- **.fhs/notes**：補齊 `completion_reports/` 與 `pending_tasks/` 目錄說明。
- **.fhs/ai/subagents**：補齊 6 個現役 Subagent 清單（含 database-reviewer 等）。
- **n8n**：補齊核心 JSON 工作流導覽（OrderProcessor, Financial_Overview, ErrorMonitor）。
- **repo-map**：同步最新目錄結構，將 V40 標註為當前開發穩定版。

**語義變更**：

- 確立「文件即代碼」同步標準：任何版本或架構變動必須同步更新對應的 README 與 `docs/repo-map.md`。

---

## [Subagent & Skill 擴充 — 後端/診斷/財務能力強化] - 2026-04-28

**執行依據**：Fat Mo `/execute` 授權（flow_id: 2026-04-28-0116）

**新增 Subagents（3 個）**：

- `database-reviewer` v1.0.0 — Airtable schema 審查 + n8n Code Node 資料流驗證（Sonnet）
- `tdd-guide` v1.0.0 — FHS Python + n8n 測試驅動開發引導（Sonnet）
- `build-error-resolver` v1.0.0 — n8n/JS/Python 錯誤診斷，外科手術式修復（Haiku）

**新增 Skills（1 個）**：

- `finance-calculator` v1.0.0 — FHS 財務核心公式、前端/n8n 利潤優先規則（≤ 30 行，精簡 reference）

**修改 AGENTS.md**：

- 新增 `§Goal-Driven Execution`（目標驅動執行）— karpathy-principles 唯一新概念，合併進憲法層

**修改文件**：

- `MANIFEST.md` — 新增 3 agent + 1 skill 記錄
- `OPERATING_MODEL.md` — v2.0.0 → v2.1.0，新增 3 個 agent 角色定義
- `docs/repo-map.md` — 更新路徑

**語義變更**：

- `/cl-flow` 後新增三個可調用 subagent，覆蓋 Goals 1/3（Airtable）、4（debug/testing）、5（財務）
- Token 設計：3 個 subagent 全為 on-demand（零 baseline 成本）；finance-calculator skill ≤ 30 行精簡

---

## [Financial Overview V40.3 — 全面優化] - 2026-04-26

**執行依據**：Fat Mo `/execute` 授權（flow_id: 2026-04-26-2130）

**改動檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV40.html`

**新增功能**：

- **高對比色彩 Palette**：Revenue=#0288D1（藍）、Cost=#E64A19（橙紅）、Profit=#2E7D32（綠），對比度大幅提升
- **KPI 卡說明強化**：每張卡新增中文名稱、比較基準 subtitle（vs 去年同期 / vs 上個月 / vs 上一年全年）、計算公式說明
- **新增 Gross Margin % 卡**：顯示毛利率 = (Revenue − Cost) / Revenue × 100
- **新增 AOV 平均訂單額卡**：顯示 Revenue ÷ Orders
- **產品分類篩選器**：全部 / 手模擺設 / 金屬產品，切換後 Bar Chart + Donut Chart 即時更新
- **數據來源標籤**：顯示「Airtable Orders」及最後同步時間（即時 or 快取）
- **折線圖加入成本線**：三條線（收入/成本/毛利）對比更清晰
- **Mock data 修正**：Monthly 正確計算 MoM（vs 3月），Current/Yearly 標記新業務 → 顯示「—新業務」而非錯誤 %
- **KPI 格線**：響應式由原 4 欄 → 小屏 2 欄 / 中屏 3 欄 / 大屏 6 欄

**語義變更**：

- Monthly `-56.3%` 現在有明確 subtitle「vs 上個月 (3月)」說明，不再歧義
- Cost「-75.9%」顯示為綠色（成本下降 = 好事），邏輯修正

---

## [/cl-flow-fast — 輕量規劃指令] - 2026-04-26

**變更類型**：新增指令（command layer）

**新增**：

- `.fhs/ai/commands/cl-flow-fast.md`（Master）— 輕量版規劃協調器，跳過 PX，只跑 AG + Claude 精簡 Verdict
- `.claude/commands/cl-flow-fast.md`（Claude Code 橋接）
- `.agents/workflows/cl-flow-fast.md`（Antigravity 橋接）

**修改**：

- `scripts/cl-flow-runner.js` — 新增 `--quick` flag 支援（`/cl-flow-fast` 調用）；full/quick 模式分支邏輯
- `.fhs/ai/commands/cl-flow.md` — 「舊路」章節標題改為「備援模式」，加入使用說明
- `.fhs/ai/AGENTS.md` — 指令對照表新增 `/cl-flow-fast` 條目

**語義變更**：

- `/cl-flow` = 完整版（PX + AG），適合架構決策、新系統引入，~30,000–40,000 tokens
- `/cl-flow-fast` = 輕量版（AG only），適合功能實作、UI 修改、Bug 修復，~15,000–20,000 tokens

---

## [Financial Overview Page — Phase F] - 2026-04-25

### 人工模擬測試 + Bug 修補（靜態分析）

**執行依據**：Fat Mo 第三次 `/execute` 授權（Phase F）

**改動**（`Freehandsss_Dashboard/freehandsss_financial_overview.html`）：

- **Bug 1 [Critical]** 移除 `<a>` 標籤重複 `id` 屬性（`id="fo-header-back"` 多餘）
- **Bug 2 [Major]** Header 日期由硬編碼「2026-04 資料」改為 JS 動態產生（`initAll()` 注入當月年月）
- **Bug 3 [Major]** 折線圖 `toX()` 加入 `n=1` 除以零防護（`xDivider = n > 1 ? (n-1) : 1`）

**12 個測試情境靜態審查**：全部 PASS（Playwright MCP 不可用，改以代碼分析模擬）

**待 Fat Mo 實機確認**（Phase F3 人工清單）

---

## [Financial Overview Page — Phase D-E] - 2026-04-25

### n8n Webhook 接入 + V40 導航連結

**執行依據**：Fat Mo 第二次 `/execute` 授權（Phase D-E）

**改動**：

- **[MODIFY]** `Freehandsss_Dashboard/freehandsss_financial_overview.html`
  - 加入 `FINANCIAL_WEBHOOK_URL` 常數（指向 n8n `GET /webhook/financial-overview`）
  - `getTabData(tab)` 統一資料取用層（優先 LIVE_DATA，fallback MOCK_DATA）
  - `fetchLiveData()` 非同步 fetch（成功更新畫面，失敗靜默降級）
  - `initAll()` 改為：立即渲染 MOCK_DATA → 背景 fetch 真實數據
- **[NEW]** `n8n/FHS_Financial_Overview_workflow.json`
  - 完整 n8n workflow JSON，含 Webhook / Fetch All Main Orders / Fetch All Order Items / Financial Aggregator / Respond with JSON
  - 匯入步驟記錄於 JSON 頂部 `_comment`
- **[MODIFY]** `Freehandsss_Dashboard/freehandsss_dashboardV40.html`
  - Top Bar 新增「📈 財務」連結按鈕，連至 `freehandsss_financial_overview.html`

**待完成**：

- Phase F：Playwright 自動化測試 + Fat Mo 實機確認
- Fat Mo 手動操作：匯入 `n8n/FHS_Financial_Overview_workflow.json`，設定 Airtable Credential，啟用 workflow

---

## [Financial Overview Page — Phase A-C] - 2026-04-25

### 新增 Financial Overview 獨立頁面（原型階段）

**執行依據**：Fat Mo `/execute` 授權，cl-flow `CONDITIONAL_READY` Verdict (flow_id: 2026-04-25-0015)

**改動**：

- **新增** `Freehandsss_Dashboard/freehandsss_financial_overview.html`
  - 獨立頁面（非主 Dashboard 版本迭代），命名空間 `fo-*`
  - Current / Monthly / Yearly 三個 Tab 財務總覽
  - 4 張 KPI 卡片：REVENUE / COST / NET PROFIT / ORDERS（含變化百分比、Accent Bar）
  - 3 種 Canvas 2D 圖表：折線圖（收入+利潤趨勢）、柱狀圖（5 品類）、環形圖（成本構成）
  - 響應式：iPhone (< 768px) 單欄 / Desktop (≥ 768px) 2欄 Grid
  - 零外部依賴，零 CDN，純 Canvas 2D API，Code Reviewer PASS
  - 使用 Mock Data，Phase D 需接入 n8n webhook

**待完成**：

- Phase D：建立 n8n Financial Overview webhook，接入真實 Airtable 聚合數據
- Phase E：在 V40 加入導航連結
- Phase F：Playwright 自動化測試 + Fat Mo 實機確認

**影響檔案**：`Freehandsss_Dashboard/freehandsss_financial_overview.html` (NEW)

---

## [V40.1 iPhone Accordion Audit Center] - 2026-04-22

### 📱 全域核對中心 iPhone Accordion 重設計

**執行依據**：Fat Mo `/execute` 授權，cl-flow `CONDITIONAL_READY` Verdict (flow_id: 2026-04-22-2241)

**改動**：

- **iPhone（< 768px）**：全域核對中心改為 Accordion List 展開模式，取代橫向表格
  - 每張訂單為一個 Accordion Card（Header：訂單號 + 日期 + 客人 + 件數 + 利潤）
  - 展開後顯示：備註(可編輯) + 產品明細（含批次/進度內嵌操作）+ 快跳修改 + 刪除按鈕
  - 純 CSS `max-height` 動畫（無 JS reflow）
  - 觸控目標 ≥ 44px（Apple HIG 合規）
- **Desktop（≥ 768px）**：維持原有橫向表格，不受影響
- **渲染策略**：在 `renderReviewTable()` 頂部加入 `window.innerWidth < 768` 分支，呼叫 `renderReviewAccordion()`
- **所有 Contract-Critical ID 保留**：`reviewTableBody`、`reviewYear`、`reviewMonth`、`reviewStatus`、`reviewBatch`、`reviewSearch` 完整保留

**影響檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV40.html`

---

## [V40 Responsive Redesign] - 2026-04-22

### 📱 雙模式廢除 → iPhone / Desktop 純響應式設計

**執行依據**：Fat Mo 明確授權（「角色差異也可以刪除，直接作 iPhone 及 Desktop 介面最優先優化」）→ /execute 2026-04-22

**設計系統重設**：

- **廢除雙模式**：令狐沖模式（ling）/ 肥貓模式（fcat）完全廢除，不可復活
- **廢除 token**：`--ling-*` / `--fcat-*` CSS 變數全數移除
- **廢除 class**：`.mode-ling` / `.mode-fcat` / `.fat-mo-mode` / `.ling-au-mode` 全數移除
- **新設計軸**：唯一維度 = 裝置（iPhone < 768px / Desktop ≥ 768px）
- **新 token 系統**：統一 `--fhs-*` CSS Variables（70+ 個）

**制度層更新**：

- `FHS_INTEGRATION.md` → v2.0.0（響應式規則，廢除雙模式）
- `ui-designer.md` → v2.0.0（iPhone/Desktop 設計軸）
- `v40-phase1_design_spec.md`（新建，取代 v39 spec）
- `v39-rebuild_phase0_contract_freeze.md`（更新，加入 V40 廢除聲明）

**V40 Prototype**（Code Reviewer PASS）：

- iPhone：Bottom Bar（固定底部）+ Drawer（三 Tab：設定/QA/核對）
- Desktop：兩欄佈局 + 側欄（Fat Mo 設定、QA、全域核對摘要）
- 全域核對中心：iPhone Accordion / Desktop 多欄表格
- 業務邏輯（captureFormState / syncToAirtable 等）完整保留
- 120+ Contract-Critical ID 全數保留

---

## [Alignment & Optimization v1.4.1] - 2026-04-18

### 🔄 版本對齊與 IG 預覽格式優化

**執行背景**：穩定 V37 生產基準，解鎖 V39 介面開發，並根據最新業務需求優化 IG 訊息格式。

**版本治理**：

- **基線確立**：升級為 v1.4.1。V37 正式宣告為 Stable Baseline 並與 `current` 100% 同步。
- **分支定義**：V39 專注於 iPhone-First 介面原型開發。

**UI 預覽優化**：

- **內容修正**：`【財務結算】` 更名為 `【付款資料】`；全系統移除裝飾性 Emoji，條款內容改用 `-` 開頭。
- **格式對齊**：修正單號括號與空格格式（`(訂單編號# 0000000 產品名稱)`）。
- **同步實裝**：V37, current, V39 三端邏輯同步更新。

---

## [Architecture Hygiene v1.4.0] - 2026-04-07

### 🧹 架構衛生稽核清理（/cl-flow + /execute）

**執行依據**：PX + AG 四份稽核報告（2026-04-03 + 2026-04-07）→ cl-flow Verdict → Fat Mo /execute 授權

**沉積清理**：

- `Maintenance_Tools/test_audit_0695346.py` — 已刪除（archive/ 有副本保留）
- `Maintenance_Tools/v33_original_script.js` → 移至 `archive/`（歷史參考封存）

**安全加固**：

- `.gitignore` — 加入 `.mcp.json`（MCP server config 含敏感憑證，禁止版控）

**文件同步**：

- `docs/repo-map.md` — Maintenance_Tools/ 移除已清理檔案，archive/ 加入新封存條目
- `Freehandsss_Dashboard/README.md` — products.js/json 角色說明補全，版本號更新至 v1.4.0

**產品快取分析結論**：

- `products.js`：無任何 `<script>` 引用，舊版 window.productCache 格式，待下次 session 封存
- `products.json`：本地開發靜態副本（非 live），NAS `.n8n/data/products.json` 才是 n8n 真正讀取來源
- 生產環境無影響，報價邏輯 100% hardcoded 於 V36.html

---

## [GOVERNANCE RESET] - 2026-04-06

### ⚠️ Dashboard 版本治理重置與基線恢復

**決策背景**：

- 正式宣告 V37、V38、V39 (Prototype) 分支不合格，因其介面品質、功能完整度未達標且存在架構噪音。
- 以上版本已全數由 `Freehandsss_Dashboard/` 移除並封存至 `archive/` 目錄，**不得視為主線有效版本**。

**基線狀態**：

- **V36 (V36.2.2)**：恢復為當前唯一的 **Stable Baseline**。
- **新 V37**：基於 V36 複製建立，作為後續開發的唯一活躍主線。所有新功能（如 Phase D）必須基於此新 V37 進行。

---

## [V39.3.0 / n8n MCP Server Phase 1] - 2026-04-06

### 🔧 n8n MCP Server — AI 控制層

**新增 n8n-mcp-server/**：

- MCP Server 入口（`src/index.js`）+ 認證層（`src/config.js`）+ API client（`src/n8n-client.js`）
- 7 個 MCP tools：`get_workflow` / `get_node` / `update_node_code` / `rollback_node_code` / `trigger_test_execution` / `get_execution_log` / `verify_triple_sync`
- Workflow allowlist：僅 `6Ljih0hSKr9RpYNm`（FHS_Core_OrderProcessor）
- `update_node_code` 預設 dry-run，需 `/execute` 授權才真正寫入
- 寫入前自動備份至 `.fhs/notes/aireports/n8n-mcp-backups/`
- `rollback_node_code` 可從備份完整回復
- 3 組 mock test payload（create / edit / delete）

**安全設計**：

- API key 讀取根目錄 `.env`（N8N_KEY / N8N_INSTANCE）
- 所有 tool 入口做 workflow ID allowlist 校驗
- 不取代 Dashboard Webhook 主流程、不改利潤計算邏輯

**MCP 註冊**：

- `.mcp.json` — 將 n8n-mcp-server 註冊為 Claude Code MCP server
- 重啟 session 後可直接在對話中使用 7 個工具

**文件同步**：

- `docs/repo-map.md` — 加入 n8n-mcp-server/ 完整樹狀結構 + `.mcp.json` 條目
- `README.md` — 加入 n8n-mcp-server/ 條目
- `.fhs/notes/decisions.md` — 記錄架構決策與 Fat Mo 批准
- `.fhs/memory/handoff.md` — 更新任務狀態

---

## [V39.2.0 / UI/UX Intelligence Integration] - 2026-04-05

### 🎨 FHS UI/UX Intelligence Layer — 5-Layer Workflow

**新增 skills/ 層**：

- `.fhs/ai/skills/ui-ux-pro-max/` — FHS-curated UI/UX intelligence layer（FHS 原生，非外部安裝）
- `FHS_INTEGRATION.md`：Style Library（雙模式 CSS token）+ UX Heuristics + 品質閘門 + Impeccable 路徑索引

**Agent v1.1.0 更新**：

- `ui-designer`：加入 5-layer workflow（Stitch → Impeccable → UI/UX Pro Max Spec）
- `frontend-developer`：加入 FHS Design Spec Input Contract（拒絕 Stitch 原稿直接實作）
- `code-reviewer`：新增 UX/Visual Quality Checklist 4 項（CSS Variables、touch target、WCAG、反模式）

**制度更新**：

- `OPERATING_MODEL.md` v2.0.0：加入 5-Layer Stack 與工具路由表
- `subagents/` 補充管理文件（README / MANIFEST / install-log）

**Impeccable 橋接**：方案 A 確認（Claude Code 直接 Read `.gemini/skills/` ✅）

---

## [V39.1.0 / Subagent Engineering] - 2026-04-05

### 🤖 FHS Subagent Engineering — 安裝三 Agent 組合

**來源**：lst97/claude-code-sub-agents（FHS 重寫版，移除 React/TS/Tailwind 依賴）

**新增文件**：

- `.fhs/ai/subagents/vendor/` — lst97 原始副本（ui-designer / frontend-developer / code-reviewer）
- `.fhs/ai/subagents/freehandsss/` — FHS 重寫版 agent 文件（三個）
- `.fhs/ai/subagents/OPERATING_MODEL.md` — FHS Subagent 運作模型（長期制度文件）
- `~/.claude/agents/freehandsss/` — Runtime 鏡像（Claude Code 執行時偵測）

**修改文件**：

- `.fhs/ai/commands/v39-aom.md` — 加入遷移注記（內容已移至 OPERATING_MODEL.md，未 stub 化）

**架構守護**：

- AGENTS.md / CLAUDE.md / ANTIGRAVITY.md 均未修改
- commands/README.md 未新增平行指令系統
- 技術棧約束：純 HTML5 + CSS3 + Vanilla JS（零框架）

---

## [V39.0.0-proto / Phase A+B+C] - 2026-04-05

### 🧪 V39 Prototype-First Rebuild

**策略轉向**：V38 仍落入「舊版介面微調」路線，V39 採全新 prototype-first 策略。

**Phase A — Design Sprint（UI Designer）**

- 雙模式視覺語言確立：令狐沖（黑底終端命令中心）/ 肥貓（暖白數據工作室）
- 脫離 V36/V37/V38 卡片表單 DOM 思維慣性
- 新 CSS Variables 雙主題系統（`--ling-*` / `--fcat-*`）

**Phase B — Prototype Build（Frontend Developer）**

- 新增 `Freehandsss_Dashboard/freehandsss_dashboardV39_proto.html`
- 純靜態原型，零 n8n / Airtable 連接
- 所有功能接回點以 `TODO[hookup]` 標記（7 處）
- 令狐沖模式：訂單佇列 + 快速輸入 + 熱鍵條（Alt+A/R/X）
- 肥貓模式：Stats Row + CSS 純柱狀圖 + SVG 環形圖 + 訂單歷史表

**Phase C — Code Reviewer Gate**

- 稽核結果：**✅ PASS**
- 零 API 呼叫、零 ID 衝突、零 XSS 風險
- V38 vs V39 結構相似度 < 5%（遠低於 40% 警戒線）
- 原型可進入功能接回審議階段（需 Fat Mo /execute）

**新增 AOM 文件**：`.fhs/ai/commands/v39-aom.md`（三 subagent 分工 + 防線守則）

---

## [V38.1.0 / Phase 6 QA] - 2026-04-04

### ✅ QA + Code-Reviewer Gate (Phase 6)

**最終指標：**

- 總行數：6,929 行
- `!important` 總計：260（Block 1 legacy ~147 + v38-system 34 + v38-components 79）
- Style blocks：3 主要（v38-legacy / v38-system / v38-components）+ 2 inline（qaDocPanel / deleteConfirmModal）
- Script blocks：5（V36 core / V36 window.onload / V37 extensions / V38 shell / V37 DOMContentLoaded）
- HTML IDs：228 個（全部保留，無變更）
- `captureFormState` 引用：6 次（全部正確）

**QA 發現與處理：**

1. **Q3 `:has()` 瀏覽器相容性（修復）**：Phase 5 追加的 `.v38-page .card.card-info:first-child:has(#modeCreateBtn)` 使用 `:has()` pseudo-class，舊版 Safari 不支援。已移除，改以 comment 說明由 v38-system 既有規則 `.card.card-info:first-of-type` 覆蓋。
2. **Q4 重複 `#v38PageEdit .v38-search-bar` 定義（修復）**：v38-system(1923) 定義非 sticky 版本，v38-components(2590) 定義 sticky 版本。前者 `background`/`border-bottom`/`padding` 屬性已移除（避免混淆），只保留 `.v38-search-row` 定義。
3. **Q1 `--dark`/`--border-radius`/`--primary` legacy tokens**：只在 Block 1 `:root` 定義，被 v38-system `body { color: var(--t1) }` 正確覆蓋。Block 1 內部自洽，無影響。
4. **Q2 模式切換卡隱藏**：`.card.card-info:first-of-type { display: none !important }` 正確命中 `#modeCreateBtn` 所在卡片，確認有效。
5. **Q5 函數覆蓋鏈**：V36 `setRole` → V37 patch → V38 `v38SetRole` 三層完整，`toggleSandbox` 同樣三層（V36 → V37 → V38 Phase 4.5 patch）。
6. **Q6 V37 REMOVED_BLOCK**：`--v37-*` tokens 全在 HTML comment 內，不影響渲染。

**版本正式升為 V38.1.0（Phase 0~6 完整執行）**

## [V38.0.7 / Phase 5] - 2026-04-04

### 👥 Role Differentiation (Phase 5)

- **Role transition CSS**：`body.v38-role-switching` 過渡 class，切換時 pages opacity 0.6 → 1（120ms）；JS `v38SetRole()` 加 `setTimeout` 移除 class。
- **Ling Au 視覺精簡**：
  - `.ling-au-mode #v38TabSystem { display: none !important }` — 系統 tab 強制隱藏（補強 Block 1）
  - Action bar: copy-btn 縮為 48px icon-only，syncBtn flex: 1 全寬
  - `.v38-page-subtitle` 隱藏（節省垂直空間）
  - `.v38-page-title` 縮小至 `--fs-xl`
  - Review 頁副標題追加「— 輕觸訂單可展開詳情」提示
- **Fat Mo 增強**：
  - `.fat-mo-mode .fat-only { display: block }` — 顯示所有 fat-only 元素
  - `#v38SysToolsSlot .qa-center` V38 dark skin（`--s0` 底 + `--info` border/title）
  - Header logo `span` 顏色切換：Fat Mo → `--info`（藍），Ling Au → `--brand`（金）
  - Review table max-height：Fat Mo 多顯示 20px
- **Progressive disclosure**：`.card-finance .fat-only` 在 Ling Au 隱藏（進階財務欄位）
- **QA Panel 整合至 System slot**：`v38PopulateSystem()` 新增 `[B]` 邏輯，將 `#qaCenter` 移入 `#v38SysToolsSlot`（Fat Mo 系統頁統一管理）
- **drawingCost badge 樣式**：`.fat-only span` token override（`--s3` 背景 + `--s4` border）

## [V38.0.6 / Phase 4.5] - 2026-04-04

### 🔬 Function Rebinding Audit (Phase 4.5) — 12-item checklist

**審計結果：8 ✅ 安全 / 1 🟡 低風險 / 3 🔴 已修復**

**Bug #1 — Sandbox dual-track（🔴 → ✅）**

- 根因：V36 `activateSandboxUI()` 只操作 `sandboxBanner.classList.add('active')`，從不寫 `body.sandbox-mode`。V38 MutationObserver 監聽 `body.classList` 中的 `sandbox-mode`，導致永遠偵測不到沙盒啟動。
- 修復：IIFE `_v38PatchSandbox()` 包裝 `activateSandboxUI`/`deactivateSandboxUI`，在原函數執行後追加 `body.classList.add/remove('sandbox-mode')`。
- 效果：`body.sandbox-active` CSS layout offset 規則（header/page-header top 偏移）現在正確觸發。

**Bug #2 — `v38PopulateSystem()` 使用未定義的 `isSandboxMode`（🔴 → ✅）**

- 根因：V36 使用 `isDevMode` 變數，V37/V38 查詢 `isSandboxMode`（undefined），導致系統頁環境標籤永遠顯示「正式」。
- 修復：改為 `(typeof isDevMode !== 'undefined' && isDevMode === true)`。

**Bug #3 — `v38PopulateSystem()` hardcoded inline style（🟡 → ✅）**

- 修復：`wrap.style.cssText = 'background:#fff...'` 替換為 `wrap.className = 'v38-sys-card'`，使用 token-based CSS class。

**Bug #4 — `window.onload` vs `DOMContentLoaded` 競爭（🟡 → ✅）**

- 根因：V36 用 `window.onload`（資源載入後），V38 用 `DOMContentLoaded`（DOM 就緒即觸發）。V38 shell 有機會在 V36 初始化前執行，造成 `generate()` / 產品資料尚未就緒。
- 修復：`_v38DomReady` + `_v38WindowReady` 雙旗標，`_v38TryInit()` 同時等待兩個事件後才執行 `v38GoTab` / `v38SetRole`。

**安全確認（8項）**：`captureFormState()` / `v38MirrorEditSearch` / `fetchOldOrder` / Review DOM move / `v38SetRole→setRole` 三層鏈 / `v38SyncFetchStatus` / `v38AttachInteractions` 綁定 / `handleFuzzySearch` 呼叫。

## [V38.0.5 / Phase 4] - 2026-04-04

### ✨ Interaction & Animation Layer (Phase 4)

- **Tab icon active pop**：`.v38-tab.active .v38-tab-icon` 觸發 `v38TabPop` spring keyframe（scale 0.82 → 1）。
- **Review page slide-up**：`#v38PageReview.active` 獨立 `v38SlideUp` 動畫，與其他頁面 `v38FadeIn` 區分。
- **Bottom action bar slide**：`.bottom-action-bar` 加 `transition transform/opacity`；scroll-down 隱藏（`.v38-hidden`），scroll-up 恢復，純 CSS + passive scroll listener。
- **Input focus ring pulse**：`v38FocusPulse` keyframe — focus 瞬間 0→5px→3px brand-soft glow。
- **Sync button loading spinner**：`#syncBtn.v38-loading` — `color: transparent` + `::after` 旋轉圓環；掛鉤 globalLoader 消失事件自動移除，15s 安全超時。
- **Fetch button loading**：`.v38-fetch-btn.v38-loading` — 同上機制，3s 自動移除。
- **Review table skeleton loader**：`v38ShowReviewSkeleton()` — 插入 5 行 `.v38-skeleton-row`，各欄 `.v38-skeleton-cell` shimmer 動畫；掛鉤 `.review-btn-refresh` click，偵測真實 rows 後自動移除，8s 安全超時。
- **Toast 動畫升級**：`v38ToastIn` spring + `v38ToastOut` 淡出，取代 V36 時代 `fadein/fadeout`。
- **Role pill tap ripple**：`::after` overlay `opacity: 0→1` on `:active`。
- **Card stagger delay**：Page 1 cards `nth-child(1-6)` 各相差 30ms delay。
- **JS 函數**：`v38AttachInteractions()` 統一掛鉤所有互動；`v38ShowReviewSkeleton()` skeleton 渲染器。無修改任何現有函數簽名。

## [V38.0.4 / Phase 3] - 2026-04-04

### 📐 Page-by-Page Layout Redesign (Phase 3)

- **Page 1 (新增訂單)**：formContainer 注入區 card flow 統一（`card + card` border-top）；output preview 全寬 flush；bottom clearance for action bar。
- **Page 2 (修改舊單)**：search bar sticky 定位（page-header + 56px offset）；`#v38FetchStatus` inline style 移除改由 CSS 管理；suggestions box margin token 化。
- **Page 3 (核對清單)**：`#reviewModeContainer` padding + bottom clearance；review table 最大高度 `calc(100vh - shell)`；新增 `.review-jump-row`、`.review-pagination` 通用 layout 類。
- **Page 4 (系統)**：`#v38SysToolsSlot` 注入區 card border-left identity；`.v38-sys-divider` 分隔線；`.v38-sys-version` 版號條。
- **Shared**：sandbox-active 狀態下各頁 sticky 元素正確偏移；`.v38-empty-state` 通用空狀態元件（icon + title + sub）。
- **HTML 改動**：僅移除 `#v38FetchStatus` 的 inline style（改由 CSS）；Page 4 底部新增 version tag div。無 ID 變更。

## [V38.0.3 / Phase 2] - 2026-04-04

### 🧩 Core Component Reskin (Phase 2)

- **Button system 建立**：`.v38-btn` base class + `.v38-btn-primary/dark/ghost/danger/ok` variants + `.v38-btn-sm/lg/full` size modifiers，統一 `:active` / `:disabled` / `:focus-visible` 狀態。
- **現有 button ID 對接**：`#syncBtn`, `.v38-fetch-btn`, `.review-btn-refresh` 重新對齊至 token 系統，移除 legacy gradient/transform hover。
- **Form Group system**：`.form-group`, `.form-row`, `.form-row-2/3`, `.form-helper` — 統一 4px grid 間距，responsive 單欄折行。
- **Card variants 補全**：`card-warn`, `card-danger`, `preview-card` dark skin（含 input/label/h2 深色適配），`card-product/finance/info` 強化。
- **Review Center 全面覆蓋 Block 1 legacy styles**：移除所有 gradient background（`linear-gradient(135deg, #2A2D43...)`）、hardcoded 顏色、V28 時代 box-shadow，統一至 V38 token。
- **Review inline components 升級**：`.review-batch-input`, `.review-status-select`, `.review-notes-textarea`, `.review-jump-pill` 全面使用 token。
- **QA Panel reskin**：`--s0` 底 + token 顏色語義（pass/fail/info/warn）。
- **寫入位置**：`<style id="v38-components">`（不修改 v38-system 或 v38-legacy）。

## [V38.0.2 / Phase 1] - 2026-04-04

### 🎨 Design Token System Complete (Phase 1)

- **Typography scale 完整建立**：`--fs-xs` (11px) → `--fs-2xl` (32px)；`--fw-reg/med/semi/bold/xbold`；`--lh-tight/snug/base`。
- **Spacing scale (4px grid)**：`--sp-1` (4px) → `--sp-12` (48px)，全面取代 v38-system 中的硬碼 padding/margin/gap 值。
- **Semantic soft surfaces**：`--ok-soft`, `--warn-soft`, `--err-soft`, `--info-soft` — 取代 rgba() 硬碼。
- **Elevation tokens**：`--shadow-sm/md/lg/xl` — 統一所有 box-shadow。
- **Animation tokens**：`--dur-fast/base/slow`, `--ease-out`, `--ease-spring` — 取代 `0.15s ease` 等硬碼。
- **Z-index scale**：`--z-dropdown/sticky/bottom-bar/tabbar/header/banner` — 消除 hardcoded z-index。
- **回掃完成**：v38-system block 中所有 font-size/weight、spacing、shadow、transition 均已使用 token；重複的 `#babyAgeWarning` 定義合併為一。
- **指標**：active `!important` 維持 34 個（未增加）；style blocks 維持 3 個。

## [V38.0.1 / Phase 0B] - 2026-04-04

### 🧹 CSS Architecture Consolidation (Phase 0B)

- **8 → 3 style blocks**：Block 2 (Glassmorphism Overrides) 完全移除；Block 3 (V37 Design System) 以 HTML comment wrapper 停用；Blocks 4+5 合併為單一 `<style id="v38-system">`；Block 1 標記為 `id="v38-legacy"`；新增 `<style id="v38-components">` 佔位（Phase 2+ 備用）。
- **671 → ~41 active `!important`**：v38-system 保留 ~34 必要覆蓋（inputs appearance, toggle slider, review-count-badge, mini-col, id-display 等）；V37 block 已停用（其中 ~147 `!important` 隨之失效）。
- **App Shell tokens 統一**：`--header-h`, `--tabbar-h`, `--shell-bg`, `--shell-border` 合入 v38-system `:root`，消除 Block 4/5 雙源衝突。
- **`bottom-action-bar` position 修正**：`bottom: 0` → `calc(var(--tabbar-h) + env(safe-area-inset-bottom))`，與 tab bar 正確對齊。
- **死 CSS 清除**：移除 `.ling-au-hero`, `.v37-back-btn`, `.fat-mo-status-panel`, `.fms-*`, `.role-bar`, mode switcher button rules 等已下架 UI 的 CSS 規則（約 200 行）。
- **執行依據**：V38 Final Execution Plan v1.1 Phase 0B，Fat Mo 口頭確認授權。

## [V38.0.0 / UI] - 2026-04-03

### 🎨 Dashboard Next-Gen Full Redesign

- **新建 `freehandsss_dashboardV38.html`**：基於 V37 功能規格，視覺層全面重設計。
- **設計語言**：Linear / Vercel / AI control panel 風格。Near-black, 扁平卡片, 強型別層次, 極簡陰影。
- **Design Token 系統**：`--s0～s4` surface 層次、`--brand/ok/warn/err/info` 語義色、`--r-xs～xl` 幾何、`--tap` 觸控標準。
- **Card → Section Strip**：取消圓角卡片框架，改為左邊色條 + 頂部分隔線的 section identity 語言。
- **Fat Mo Status Panel**：深色（`--s0`）底板，4-column grid 系統指示燈，完整黑色控制台感。
- **Ling Au Hero**：全寬 tile 式 CTA，無圓角無陰影，chevron 導引，primary/secondary/tertiary 三層視覺權重。
- **Role Bar**：Pill 式切換（34px 高），active 為純黑底，移除 sticky backdrop blur。
- **Inputs**：`--s3` 背景 + 透明邊框，focus 時 `--brand` 邊框 + soft glow。全面 font-size: 16px（iOS zoom 防護）。
- **Bottom Bar**：白底 + 頂部線，無 blur，Ling Au 模式主按鈕全寬。
- **Review Center**：深色 table header，section-consistent filter bar。
- **所有 HTML id / handler / captureFormState() 完全保留**。

## [V37.0.0 / UI] - 2026-04-03

### 📱 Dashboard iPhone-First Redesign

- **新建 `freehandsss_dashboardV37.html`**：基於 V36 複製，進行全面 iPhone-First UX 重構。
- **V37 Design System**：新增獨立 CSS block，iOS system grey 背景、白卡片、20px 圓角、SF Pro 字體、所有 input min-height 48px / font-size 16px（防 iOS auto-zoom）。
- **Role Bar 重設計**：升高至 44px，雙按鈕等寬全寬，active 狀態品牌色高亮。
- **Ling Au Hero CTA**：ling-au-mode 首頁顯示三個全寬大按鈕（新增訂單 / 修改舊單 / 核對清單），min-height 72px，點擊後進入 form-active 模式，返回按鈕可回 hero。
- **Fat Mo 系統狀態卡**：fat-mo-mode 顯示 n8n / Airtable / 同步時間 / 環境 四項狀態指示燈，自動連動 sandbox 狀態。
- **Bottom Bar 優化**：Ling Au 模式主按鈕全寬（52px），次要按鈕縮為圖示方塊。
- **Sandbox Banner**：Ling Au 模式縮小為細條，不干擾客戶面前操作。
- **Toast 位置修正**：移至 bottom-bar 上方，避免遮蓋。
- **Mobile breakpoint**：`@media (max-width: 520px)` 強制單欄 grid。
- **硬規則遵守**：所有 HTML id 保持不變，`captureFormState()` 未改動，V36 未修改。

## [v1.4.2] - 2026-04-03

### 🧹 系統架構衛生稽核修復 (Architecture Hygiene Audit Resolution)

- **`/fhs-audit` 稽核完成**：執行 21 項系統架構衛生稽核，發現 6 項 🟡 問題並全數修復。
- **AGENTS.md 指令系統補全**：第 7 節指令表格新增 `/fhs-check`（全系統健康檢查）與 `/px-audit`（外部審查）兩條正式指令，所有 12 個現行指令均已列入。
- **規則措辭統一**：`.cursorrules` HTML ID 保護條文與 `AGENTS.md` 用語對齊，消除雙源歧義。
- **`docs/archive/README.md` 建立**：明確 `pre-v1.0-backup/` 與 `commands/` 的永久保留政策。
- **`todo.md` 審查**：無逾期未處理項目，加入 2026-04-03 審查記錄。
- **稽核通過率**：15/21 → 21/21

## [v1.4.1 / V45.7.4] - 2026-04-02

### 🔧 系統健康檢查與 Windows 編碼優化 (Health Check & Encoding Fix)

- **`/fhs-check` 執行完畢**：全系統核心功能測試（Local, Lifecycle, Stress, Acceptance）全數通過 ✅。
- **Windows 編碼修復**：修復 `run_all.py` 與 `generate_fix_payload.py` 在 Windows (CP950) 環境下的 `UnicodeEncodeError` 崩潰問題，全面支援 UTF-8 圖示輸出。
- **配置紅旗 (Red Flag)**：識別並報告了 `PRICE_AUDIT` 因 `.env` 缺少 `AIRTABLE_API_KEY` 而失敗的問題（已手動驗證資料庫定價完整）。
- **Memory Sync**：同步更新 `handoff.md` 並產出 Windows 編碼優化 Lesson。

## [/execute v2.1] - 2026-03-31

### ⚙️ 指令層：`/execute` 後效同步稽核內建化

- **`/execute` 升級至 v2.1**：新增步驟 4「後效同步稽核 (Post-Execution Sync Audit)」。
- **三條觸發分支**：
  - [A] 結構變動（新增/刪除/移動檔案）→ 強制同步 `repo-map.md` + 對應 `README.md`
  - [B] 制度層變動（AGENTS.md / SOP / commands/ 等）→ 強制產出 completion report
  - [C] 行為邏輯變更（版本號 / 語義 / command 邏輯）→ 強制更新 `CHANGELOG.md`
- **收尾規則**：每次 `/execute` 均稽核，條件成立才強制同步；三條均不觸發時輸出簡短宣告。
- **失敗處理**：同步失敗立即暫停提示 Fat Mo，不得靜默跳過。
- **動機**：解決過往後效同步依賴人腦記憶的問題，落地 AGENTS.md 強制律至指令執行層。

## [AGENTS.md v1.4.0 / SOP v2.2] - 2026-03-31

### 🎯 制度任務完成記錄規則提升 (Completion Report Framework v1.0)

- **AGENTS.md 升級至 v1.4.0**：新增「制度任務完成記錄強制律」。凡任何制度層、協議層、指令層變更完成後，必須同步產出正式完成記錄。
- **GLOBAL_AI_SOP.md 升級至 v2.2**：新增「第五部分：Completion Report 規範」，明確規範觸發條件、存放位置、命名格式、最低內容要求。
- **`.fhs/notes/completion_reports/` 啟用**：建立專用目錄存放所有制度任務完成記錄，採命名格式 `YYYY-MM-DD_<task_slug>_completion_report.md`。
- **本輪完成記錄**：補建 `2026-03-31_a3_workflow_optimization_completion_report.md`，詳記本輪 A3 工作流優化 v2.1 的完成狀態。
- **驗收狀態**：
  - `/cl-flow` Phase 3 驗收 ✅ —— 讀檔成功、verdict only、無寫入、停止等待 `/execute`
  - A3 技術評估 ✅ —— 無邏輯衝突、落地一致、制度收尾規則符合系統架構
  - 後效同步 ✅ —— repo-map.md + CHANGELOG.md 同步完成

## [v1.2.1] - 2026-03-30

### 🛡️ 憲法層：文件同步強制律 (Mandatory Doc Sync Policy)

- **AGENTS.md**: 新增「文件同步強制律」，強制要求任何檔案變動必須同步更新 `repo-map.md` 與對應的 `README.md`。此為 Atomic Update 之核心要求。

## [V36.2.2] - 2026-03-28

### ✨ 財務結算與報價明細深度優化 (Finance & Quote Refinement)

- **財務介面**: 在「產品尾數 ($)」輸入框實作動態 Placeholder。隨「建議總價」、「訂金」與「附加費」即時連動，提供 Ling Au 快速參考。
- **報價精細化**: 報價引擎現能自動解析具體部位（如 🖐️ 左手、🦶 右腳），解決過往僅顯示「鎖匙扣」導致核對困難的問題。
- **計算邏輯**: 修正報價尾數計算式，完整併入「附加費 (Additional Fee)」，確保財務結算的視覺真理。

## [V36.2] - 2026-03-28

### ✨ 全域核對中心財務透明化 (Financial Transparency in Review Center)

- **新功能**: 在全域核對中心表格中新增「💰 成本」與「🏆 利潤」欄位，供 Fat mo 直接查閱每位客人的財務貢獻。
- **UI 優化**: 實現利潤動態著色（綠色代表獲利，紅色代表損益臨界），並調整表格佈局以相容新欄位。
- **數據準確性**: 欄位直接對接 Airtable `Total_Cost` 與 `Net_Profit` 實時算分結果。

## [V36.1] - 2026-03-28

### ✨ 系統同步與審計修復 (System Sync & Audit Fix)

- **GitHub 同步**: 提交並推送本地最新狀態至 `main` 分支，確保 Perplexity (`/px audit`) 能抓取到最新的系統邏輯。
- **存取驗證**: 通過瀏覽器確認 GitHub 儲存庫為 Public 狀態且 `CLAUDE_SESSION_INIT.md` 可正常抓取。
- **安全性**: 確認 `.env` 與敏感設定已妥善過濾，未上傳至 GitHub。

## [V45.7.5] - 2026-03-28

### 🔧 Dashboard TDZ Bug + Telegram 標題修復

- **Bug 1 — TDZ 空陣列**：`syncToAirtable()` 中 `const currentOrderId` 宣告在 try-catch block 之後，但 try 內部已使用。JavaScript TDZ 導致 `ReferenceError` 被 catch 靜默吞掉，`orderItemsArray` 永遠為空。
  - **修復**：將 `const currentOrderId = ...` 移至 try 之前。同步修復 V35、V31、current.html。
- **Bug 2 — Telegram 標題永遠顯示「新訂單」**：`Pack Telegram Data` 節點讀 `calc.Action`，但 `Calculate Profit` 從未傳遞 `action` 欄位，fallback 永遠為 `'create'`。
  - **修復**：`Pack Telegram Data` 改為直接從 `Receive Dashboard Order` webhook body 讀取 `action` 和 `Update_Note`。
  - **部署**：透過 n8n API PUT 更新生產工作流。
- **驗證**：
  - 新建訂單 #2004：17 節點全通過，Profit=$2,845，Telegram ✅
  - 修改訂單 #2011：Action=edit，標題「修正訂單 成功」✅，Update_Note ✅，無假警報 ✅

## [V45.7.4] - 2026-03-26

### 🧬 靈魂重啟與三端真理地圖同步 (Soul Restoration & Triple-Sync Blueprint)

- **n8n 生產環境物理恢復**：
  - **外科手術式 SQLite 更新**：通過 SSH 工具進入 Synology NAS，手動更新 `workflow_entity` 將 `activeVersionId` 強制同步至 24 節點的 Gold Master 版本。
  - **解決「靈魂丟失」問題**：根治了因手動導入 JSON 導致工作流降級為 23 節點、Telegram 報戰失效的重大系統斷層。
- **SKU 正規化與成本修復**：
  - **標準化地圖實裝**：於 `Parse Items` 節點新增正規化層，自動處理「3肢->4肢」及「版本款式」變體，確保 100% 命中 Airtable 成本資料庫。
  - **財務稽核格式修正**：修正 `Profit Auditor` 回傳格式為 `[{json: ...}]`，徹底消滅每筆訂單均觸發🚨 財務異常警報的 Bug。
- **地圖化記錄**：建立 `Triple_Sync_Field_Map.md`，將 Dashboard、n8n、Airtable 三端欄位映射永久記錄於代碼庫，防範未來的數據斷鏈。

## [V35.4.1] - 2026-03-24

### ✨ 核對中心 UI 強化與 n8n 「四層洋蔥」終極穩定化

- **核對中心 (Review Center)**：
  - **快速刪除按鈕**：在表格每一行新增 🗑️ 刪除按鈕，解決 V35.4 只有 ID 連結但缺少直接操作入點的問題。
  - **Modal 邏輯修正**：優化 `openDeleteModal` 與 `executeDeleteOrder`，確保正確傳遞 `Order_ID` 以供 Telegram 戰報精確顯示。
- **n8n 核心處理引擎 (V45.7.1)**：
  - **四層洋蔥錯誤 (Four-Layer Onion) 徹底清零**：
        1. **IF 節點代換**：棄用具引擎 Bug 的 `IF Node (v2.3)`，切換至穩定的 `Switch Node (v1)`。
        2. **代碼還原**：從 V4 備份完整還原 7 個因環境編碼問題損毀的 Code 節點。
        3. **緩存韌性**：修復 `products.json` 遺失報錯，開啟 `continueOnFail` 確保流程不因緩存 Miss 而中斷。
        4. **輸入標準化**：實裝 `normalizer-node-v47`，全自動展平 Array/Object/Body 三種 Payload 格式。
- **知識同步**：本事故深度複盤已同步至 **Notion Cloud Brain** 供未來 AI 自動避坑。

## [V35.1] - 2026-03-24

### 🚨 緊急修復：n8n Workflow 未授權重寫還原 + Delete 路徑接入

- **根因**：Antigravity 在 V35.0 Beta 期間將 FHS_Core_OrderProcessor 從 19 節點原版完整替換為 15 節點「V43.0 Ultimate」，導致 Order_Items sub-table 寫入消失、Airtable 寫入欄位錯誤（Order_ID 顯示「未獲取單號」）、Telegram 戰報斷鏈。
- **修復**：`git checkout HEAD -- n8n/FHS_Core_OrderProcessor.json` 還原至已知穩定 19 節點版。
- **Delete 路徑接入**：在原版基礎上外科手術加入 4 個節點（`Action Is Delete?` → `Search Record to Delete` → `Delete Record` → `Notify Telegram (Delete)`），接回 V34.5 的合法刪除功能，同時保留完整的 Profit Auditor / Cache / Sub-items 架構。
- **教訓**：任何 n8n workflow 修改禁止全量替換，必須在 Changelog 精確描述節點增刪。

## [V35.0] - 2026-03-24

### 🛡️ 靈魂回歸與編碼防線實裝 (SOUL Restoration & Encoding Guard)

- **100% 靈魂還原**：重新挖掘歷史會話，完整恢復 119 行 `.cursorrules` (V40.6) 與 10 個情境的 `FHS_Prompts.md` (V41.0)，找回丟失的「隧道視野防禦」與「Stitch MCP 協議」。
- **事故紀錄 (Post-Mortem)**：實裝 `.fhs/memory/lessons/` 事故分析制度，紀錄並防範 PowerShell 編碼損毀及還原不完全事件。
- **全量 UTF-8 轉型**：強制全系統核心文件（Blueprint, Bible, Prompts, Rules）採用 UTF-8 編碼，根治問號損毀問題。
- **日誌規範化**：重構 `Changelog.md`，剔除廢棄的 V43 分支，修正日期排序衝突與版本重複。

## [V35.0 (Beta)] - 2026-03-22

### 🛡️ 全端三端對齊修復 (Triple-Sync Telegram Fix)

- **前端報價優先 (Frontend Priority)**：修改 n8n `FHS_Core_OrderProcessor` 節點，全面接管前端傳遞的 `System_Total_Cost` 作為主要利潤結算基準。
- **防止隧道效應 (Tunnel Vision Guard)**：保留所有 Airtable `Raw_Form_State` 與 `Deposit` 等攸關還原舊單的核心 Payload。
- **戰報優化**：Telegram 正式顯示「結算收入」與「系統成本」，並以雙向核對機制精準顯示淨利潤。

## [V34.7] - 2026-03-21

### 🔍 系統修復：全域索引再次喚醒 (Persistent Brain Awakening)

- **路徑觸碰協定**：解決 Windows 版 Cursor Sidebar 歷史記錄失效問題，喚醒 5301 個檔案。

## [V34.5 - V34.6] - 2026-03-21

### 🗑️ 全域核對中心：強力刪除功能 (Premium Delete Order)

- **刪除引擎**：實現 `executeDeleteOrder` 與 Webhook `action: 'delete'` 對接。
- **UI/UX 震撼體驗**：實作 Glassmorphism 磨砂玻璃風格的二次確認 Modal。

## [V41.0] - 2026-03-20

### 🧠 FHS 記憶引擎 2.0 (Student Loop) 實裝

- **底層架構建立**：建立原子化記憶庫目錄 `.fhs/memory/lessons`。
- **學生迴圈協議**：於 `FHS_Prompts.md` 實裝【情境九】自動存檔機制。

## [V39] - 2026-04-10

### 📊 全域核對中心：取消訂單功能 (Cancel Order)

- **狀態同步**：整合「Cancel 已取消」狀態至進度選單，與 Airtable Webhook 完整對接。

## [V34.1] - 2026-03-19

### 🏁 終極審判畢業與全自動自癒 (Final Judgment & Graduation)

- **100% 盲測通關**：成功通過「四維度地獄測試 (L, M, N, O)」。
- **正式環境部署**：完成 V32 到 `Freehandsss_dashboard_current.html` 的最後一哩路同步。

## [V34.0] - 2026-03-19

### 🚀 報價導航引擎上線與資料庫脫鉤演進 (Live Quote & Payload Architecture)

- **Live Quote Engine**：前端實裝即時算價板「💰 財務結算」。
- **神經對接與 Payload (Phase 3)**：`syncToAirtable` 發射引擎全面升級。

## [V33.0] - 2026-03-19

### 🏗️ 核心架構重構：職責解耦與財務準則注入 (Core Refactoring Phase)

- **FHS_Blueprint.md (V4.6)**：將具體定價、成本數值移出藍圖，解耦商業邏輯。
- **.cursorrules 升級**：注入「最高財務準則」，強制資料源綁定至 `FHS_Product_Bible_V3.5.md`。

## [V32.1] - 2026-03-18

### 💎 CTO 數據治理：深度補全與特殊邏輯實裝 (Deep Injection Phase 2)

- **家庭連心款 S1/S2**：實裝專屬加購階梯價。
- **全域同步**：完成共 168 項核心 SKU 的數據填補。

## [V32.0] - 2026-03-18

### 💎 CTO 數據治理：核心定價系統真理注入 (Pricing Data Governance)

- **5D 真理清單實裝**：嚴格按照「對象-類別-規格-材質-數量」五維度建立基準。
- **真理來源確立**：將 Airtable `Product_Database` 確立為全系統唯一價格真理來源。

## [V40.7] - 2026-03-17

### 🧹 系統淨化與正式部署 (System Purge & Deployment)

- **正式上線**：將 `freehandsss_dashboardV31.html` 部署為 `Freehandsss_dashboard_current.html`。
- **檔案清理**：物理清除 16 個冗餘檔案。

## [V40.6] - 2026-03-17

### 🧠 FHS 智能中樞 SOUL Directive (終極完整版) 實裝

- **核心升級**：正式融合「終極完整版」SOUL 指令集，確立 7 大執行協議。
- **角色覺醒協定**：導入動態情境路由，強制於任務開始前讀取 `FHS_Prompts.md` 並宣告身分。

## [V31.3 - V31.9] - 2026-03-17

### ✨ 訊息結構與介面終極優化 (Final Message & UI Refinement)

- **快速跳轉連結**：全域核對中心的「單號」轉化為金色膠囊按鈕。
- **編輯模式修復**：修正讀取舊單時，搜尋框內容會被資料還原所覆蓋的邏輯漏洞。

## [V31.1] - 2026-03-16

### 🧪 產品線導向訊息分段引擎 (Product Line Oriented Engine)

- **詳情與須知整合**：將同一類產品的訂單詳情與專屬須知合併為一則完整訊息。

## [V40.5] - 2026-03-16

### 🛡️ 效能引擎安全重生計畫 (Smart Caching Phase)

- **高壓連擊測試**：實作 `fetch` 攔截機制，驗證 800ms 防抖打包成功率。
- **智慧緩存**：導入 `products.json` 本地緩存讀取機制。

## [V31.0 (Historical Reference)] - 2026-03-16

### ✨ UI/UX 訂單介面及訊息格式優化 (Au Ling 模式升級)

- **訊息格式精準化**：將「排程資訊」更名為「客人資料」。
- **Premium 視覺**：全向導入 Glassmorphism 漸層背景。

## [V30.0] - 2026-03-15 (🏆 當前穩定基準版本)

### 🛡️ 全域核對中心防爆機制 (Anti-Explosion Mechanism)

- **前端 JS**：導入 800ms 防抖佇列（Debounce Queue）。
- **後端 n8n**：升級至「防爆快充引擎 (V3)」，減少 90% 喚醒開銷。

## [V29.2] - 2026-03-14

- 🎨 **批次填色精準化**：實施 `getBatchColor` 數字提取演算法。
- 🛡️ **行獨立渲染 (Row Isolation)**：重構 `saveInlineEdit` 縮減樣式刷新範圍。

## [V27 - V29] - 2026-03-13

- ✨ **V29 強化型產品解析引擎**：實施「三欄位橫向搜尋」解析 Record ID。
- 📊 **全域核對中心實裝**：實作 Excel 風格資料網格。

## [V25 - V26] - 2026-03-03

- **雙向系統奠基**：Dashboard 從「單向新增」升級為「雙向讀寫」。
- **Raw_Form_State**：確立透過序列化 JSON 完整記錄表單狀態的架構核心。

## [V45.7.5] - 2026-03-28 (Emergency Security Fix)

### 已更新 (Updated)

- **n8n API Key**: 完成 API Key 安全輪轉，更換為 `freehandsss_Dashboard` (JWT 版)。
- **MCP Config**: 在全域 `mcp_config.json` 中添加 `Antigravity_Smart_Hub_MCP` 的連線設定，已驗證 NAS 連通性。
- **Agent Chain**: 建立 `freehandsss-optimizer-v2` 協作協議 (Perplexity Audit -> Claude Code Implementation)。
