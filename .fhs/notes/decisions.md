# Decisions — 決策記錄
> 本文件記錄「為什麼這樣設計」，不是規則文件。
> 任何架構改動完成後，AI 必須在此補充一筆記錄。
> 格式：`[日期] 決策內容 — 原因`

[2026-06-07] (Session 67) Anti-Idle Ping 部署 — n8n 防閒置 Workflow

決策：建立獨立 n8n Workflow `FHS_Anti_Idle_Ping`（ID: `FxKHTDiYiUPnxvm6`），每 5 天 ping Supabase 一次。
原因：FHS 使用 Supabase Free Tier，7 天無 API 請求自動暫停。頻率選 5 天（非 6 天）以留安全邊際，避免時區/月份邊界引起誤差。
設計：Schedule Trigger `0 1 */5 * *` → HTTP GET `products?select=id&limit=1`（continueOnFail:true, fullResponse:true）→ IF statusCode 非 200-299 → Telegram 告警至 chat 7620524971。
Telegram credential：複用現有 "Telegram account"（ID: tSbXz97PKmdPpDNq）。

[2026-06-07] (Session 67) R1 關閉 — 立體擺設款式管理 UI 降級決策

決策：`addNewFrameStyle` 功能不實作。木框色款 / 底座顏色選項維持硬編碼於 HTML（`#woodStyle` / `#baseColor` select），按需由 Claude Code 直接加 `<option>`。
原因：款式新增頻率極低（預計 < 每季一次），建動態管理系統（migration + RPC + 動態渲染）的複雜度遠超收益。R1 風險（雙 POST 無事務保護）因功能不實作而自動消滅。
影響：零代碼改動；Fat Mo 需新增款式時直接告知 Claude Code，1 行 HTML 即可完成。

[2026-06-07] (Session 66) TD-P-chargedPositions 修復 — P_MAIN 排除 drawing cost 分支

決策：在 `calculatePricing()` 的 `else if (!item.isAccessory)` 條件加入 `&& item.Order_Item_Key !== "TEMP_P_MAIN"`，讓 TEMP_P_MAIN 不進入 K/M 畫圖費計算分支。
原因：P_MAIN 無 `PartDesc`（空字串），`_posKey = ""`，W1 chargedPositions 追蹤被跳過，P_MAIN 錯誤算出 `baseDrawing ≈ $60` 並累積至 `totalDrawingCost`；前端成本顯示虛高。P_MAIN 的 $210 成本由 n8n 從 Supabase `products.total_base_cost` 取得，前端不需重算。
影響：W1 pre-population 不變（仍正確防止 K/M 同部位雙收畫圖費）；`item.FatMoCost = 0` for P_MAIN。
改動點：`Freehandsss_Dashboard/freehandsss_dashboardV42.html` line 5733（1 行）。

[2026-06-07] (Session 65 補充) V42 正式成為開發基線

決策：下一個 session 起，所有開發改動一律在 `freehandsss_dashboardV42.html` 進行。V41 為當前穩定生產版本（current.html 指向），V42 為開發版。
原因：V42 已通過 code-reviewer G1–G8 Gate（Session 64），具備足夠品質作為開發基線。
晉升條件不變：V42 → current.html 仍需 V1–V11 手機測試全綠 + 桌面回歸 + Fat Mo 授權 + diff 審查。

[2026-06-07] (Session 65) migration 0030 — 立體擺設 products.total_base_cost 修正（$0 → $210）

決策：寫入 migration 0030_fix_3d_frame_base_costs.sql，UPDATE products.total_base_cost = 210 for all 4 立體擺設 SKUs（木框套裝 4肢/2肢、玻璃瓶套裝 4肢/2肢）。
原因：migration 0023 以 placeholder=0 seeded 4 個 SKU，`fhs_sync_products_from_config()` 不覆蓋立體擺設；Smart Cache 讀 0 → n8n handmodel_cost=0 → 所有立體擺設訂單成本少計 $210/單，財務數據不準確（用戶報告根因）。三重確認：Airtable Base_Costs（Drawing $60 + Printing $150 = $210）+ Supabase cost_configurations（material_cost_woodframe=210）+ V41 HTML 確認對話框（"立體擺設成本 $210 已計入"）。
改動點：supabase/migrations/0030_fix_3d_frame_base_costs.sql [NEW]；FHS_Pricing_Bible.md §6.2 補入立體擺設代表性數值（2 行 + 技術債 footnote）；learnings.md 新增 Pitfall 2026-06-07。
附帶發現（未修）：chargedPositions Set 不追蹤 P_MAIN 肢（PartDesc 空字串），混合訂單前端顯示可能雙計繪圖費 — Task A 範疇。
四分量收斂警告：migration 0030 後，P_MAIN 四分量送 Drawing=$60/Printing=$0，products.total_base_cost=210，delta=$150 觸發 n8nAdjustmentNotes 警告（非 zeroCostItems），不影響 Has_Cost_Error。

[2026-06-06] (Session 64) V42 開發版建立 + V41 凍結宣告

決策：建立 freehandsss_dashboardV42.html（從 V41 複製為基線，694,941 bytes）作為手機訂單總覽視覺觸控改造的開發版本。
V41 於 V42 開發期間正式凍結：任何 hotfix 若需回流，必須同步 cherry-pick 至 V42，不得直接改 V41。
V42 晉升 current.html 門檻：手機 V1–V11 驗證清單全綠 + 桌面回歸通過 + Fat Mo 授權 + diff 審查，缺一不可。
改動點：Freehandsss_Dashboard/freehandsss_dashboardV42.html [NEW]；repo-map.md 補 V41/V42 條目。

[2026-06-05] (Session 62) FHS_Pricing_Bible.md 搬移至 .fhs/ai/

決策：將 `FHS_Pricing_Bible.md`（L2 定價聖經）從 `.fhs/notes/` 搬移至 `.fhs/ai/`。
原因：L2b 定價文件的架構語義與 L1 Finance Bible 同屬 AI 行為授權文件層，應並排於 `.fhs/ai/`，而非混入 notes 筆記層。
改動點：新路徑 `.fhs/ai/FHS_Pricing_Bible.md`；舊路徑 `.fhs/notes/FHS_Pricing_Bible.md` 已刪除。
更新引用：FHS_Finance_Bible.md / AGENTS.md / FHS_Prompts.md / repo-map.md / finance-gatekeeper/SKILL.md / FHS_Product_Bible_V3.7.md 共 6 個檔案。
finance-gatekeeper/SKILL.md §五技術債備忘中的 Pricing Bible 位置不一致條目已移除（技術債清償）。

[2026-06-05] (Session 60) Task A 四分量後台記帳 — 前端透傳策略採用

決策：四分量（drawing/printing/chain/shipping_cost）由前端 calculatePricing() 算好後透傳，n8n 接收並寫入 order_items。
原因：(1) cost_configurations 原子成本已在前幾個 Phase 建好；(2) calculatePricing() 已從 Supabase 讀原子成本計算四分量；
(3) n8n 拿不到部位級資料，無法重算 drawing 豁免邏輯（最高頻財務雷）；
(4) 此策略等同正式啟動「n8n 信任前端成本分量」——與「收款確收守護」不衝的。
「products.total_base_cost 改 roll-up」列 Deferred，本期只接通最後一條傳遞路線。
改動點：V41 HTML calculatePricing()/payload，n8n Parse Items/Calculate Profit/Supabase Mirror Prep，migration 0028 RPC。
⚠️ migration 0028 需 Fat Mo 在 Supabase SQL Editor 執行後生效。

[2026-06-03] (Session 57) B2 範疇修正 — 四分量歸 Task A，B2 收尾為 TRANSITION 標示

決策：B2 範疇從「前端傳四分量 → n8n 信任回寫」修正為「TRANSITION 標示收尾 + 四分量移交 Task A」。
原因：Finance Bible §一職責分工確立成本側由 n8n 計算（非前端傳入），「n8n 信任前端成本」違反 Rule 3.16。
四分量拆解（drawing/printing/chain/shipping per-item）本質是 Task A 顆粒化 roll-up 的一部分，
在 migration 0023 偽顆粒地基上重算位置規則會製造第二套 G2/G3/G4 邏輯，drift 風險高。
執行項：V41 TRANSITION 標示更新（橘字警告→中性灰色估算提示）；migration 0027 檔頭正名為 Task A 資產；
per-item 拆行規範（Q1 chain 奇偶、Q2 shipping 毛值）寫入 Task A handoff。
current.html 同步待 Fat Mo 授權 `/execute` 後執行。

---

[2026-06-03] (Session 55) B1 成本引擎驗證與跨產品免畫圖費 Bug 修復

決策：修復 `calculatePricing()` 中 `chargedPositions` 沒有自動寫入主商品套裝肢體部位的 Bug。現在當 `enableP` 為 true 時，主套裝中選擇的肢體部位（非「無」者）會自動被加入已畫圖部位追蹤。
原因：此 Bug 導致加購鎖匙扣/吊飾部位在主套裝中已選時仍被重複收取畫圖費，使得自動化驗證 V1 計價出現 $575 而非預期標靶 $455。修正後 V1 ($455)、V2 ($1335) 及 B1 標籤全數通過自動化驗證，並已同步更新 `current.html`。

[2026-06-03] (Session 54) B1 成本引擎補完 — calculatePricing() 成本公式達到 Finance Bible 完整定義

決策：補入 calculatePricing() 三個缺失分量（打印費 Printing、基礎運費 BaseShipping、鎖匙扣環扣 KeychainClasp），公式改為 Drawing+Printing+NecklaceChain+KeychainClasp+BaseShipping−ShippingDeduction。
關鍵發現：Phase 0 查證確認 n8n 完全不讀 System_Total_Cost（讀 per-item Total_Base_Cost），B1 = 純前端顯示層，零回寫風險。
B1/B2 邊界：前端顯示校正 = B1；n8n 信任前端+四分量 payload+三端一致 = B2（待 Live 驗證後啟動）。
material_cost_* 命名語義（= 打印費）deferred 至 PRM v2 P2 命名規範設計。
文件修正：FHS_Product_Cost_Schema_v2.md 移除錯誤的 `clasp_cost` config_key 行（原為 Airtable per-product column）；key 數 21→23。
decisions.md 生效日記錄：material_cost_necklace_silver/gold 由 0→260/316，自 2026-06-03 起反映實際打印成本；跨期財務分析需分段看待。

---

[2026-06-02] (Session 52) Finance Bible G1–G6 成本規則修正 — 位置依賴成本邏輯首次正式落盤

決策：將 Fat Mo 多次口頭說明但從未記錄的鎖匙扣/吊飾成本計算規則，正式寫入 Finance Bible v1.2.0。
核心修正：① 運費扣減公式改為總件數（非行數）② 同部位首件含畫圖第2件免畫圖 ③ 吊飾頸鏈奇偶規則 ④ Clasp=頸鏈$100。
原因：規則未落盤導致每 session AI 重新算錯，屬財務核心嚴重錯誤。
後效：learnings.md 補4條 pitfall；持久記憶已固化；PRM 路線圖啟動（P0完成，P1待下 session）。

---

[2026-06-01] (Session 51) Obsidian 整合架構決策 — D1 vault 範圍 + D2 三層記憶職責邊界

決策：

**D1：Vault 範圍 = repo root (freehandsss_dashboard/)**
- 保持根 .obsidian/ 配置（Phase 0 已 commit，不回頭）
- 理由：docs/FHS_Blueprint.md 等核心知識文件需在 Obsidian Graph 可視範圍內
- ⚠️ 已知平台限制（不可配置）：Obsidian 預設隱藏所有 dot-directory（.fhs/、.claude/、.agents/ 等），.fhs/ 整層對 Obsidian 永遠不可見；Obsidian Graph 只能顯示 docs/ 及根目錄的 .md 文件
- MOC hub 必須放在 docs/（非 .fhs/），否則 Obsidian 看不到
- repomix ignore 已設 .obsidian/（AI token 邊界確立，不可回退）
- .gitignore 已排除 workspace*.json + graph.json（機器特定，非協作層）

**D2：三層記憶職責邊界**
| 層 | 寫入責任 | 衝突優先級 | AI 存取 |
|---|---------|-----------|---------|
| Notion（雲端 SSoT） | Fat Mo 手動 + AI via Sync_Notion_Brain.js | 最高（人類真相源） | 唯寫（腳本），不直接讀 |
| Obsidian（本地視覺化） | Fat Mo 手動建立筆記 | 不參與衝突解析 | **永不寫入**（視覺層） |
| .fhs/memory（AI 工作記憶） | AI 唯一（handoff/learnings/lessons） | 最低（working memory，可過期） | 讀+寫（AI 主要操作層） |

衝突規則：.fhs/memory 衝突 Notion → Notion 為準；Obsidian .md 不參與衝突解析（非授權來源）。
AI 存取邊界：AI 讀取 .fhs/memory/ + .fhs/notes/ + docs/（via repomix）；AI 永不讀取或寫入 .obsidian/ 配置及 Obsidian 專屬筆記位置。

原因：docs/ 知識文件為核心業務知識（Product Bible / Blueprint），Obsidian 作視覺圖譜需能看見全域知識層；三層職責清晰切割防止記憶碎片化（AI 只維護 .fhs/memory，不污染 Obsidian 或 Notion 直接存取）

***

[2026-05-31] (Session 50) 財務三層顆粒化成本架構：方向裁定 + A/B 分流

決策：
- **採納 Fat Mo 三層顆粒化邏輯**（base_cost → total_base_cost roll-up → 客人實境結合）；標準 BOM bottom-up costing，方向正確
- **判定病灶**：現行 `products.total_base_cost`（migration 0023 硬編碼 flat 值）為「偽顆粒」，與 Finance_Bible/pricing_reference 聲稱的「Drawing+Printing+Clasp+Shipping 累加」不符 → Fat Mo 直覺「根基不健全」成立
- **執行分流**：B（財務知識守門員）先行 → A（三層架構落實）移新 session（B 是 A 維護地基；token 限制）
- **A 接盤包**：`.fhs/reports/planning/2026-05-31_A_granular_cost_architecture_handoff.md`
- **硬約束**：禁 Postgres trigger/generated column 重算成本；Layer 2 歷史快照不可變

原因：無單一真相源（3 份文件並列宣稱權威），A 改完仍會「被忘記」；故先建 B 地基

***

[2026-05-30] Phase 2 指令精簡 — vendor 技能方法論移植至 subagent + 刪 7 冗餘 command

決策：
- **設計錯誤修正**：2026-05-09 從 superpowers + awesome-cc 導入的技能被包裝成 slash command（用戶觸發），設計意圖應為 AI 自動執行；本次修正包裝層
- **方法論移植**：systematic-debugging（4 階段根因法）+ five-whys → build-error-resolver subagent；code-analysis 5 維度 → code-reviewer subagent（sequential-thinking 工具）
- **Rule 3.15**：遇 bug/錯誤必先根因調查，禁在根因確認前提修復方案；財務欄位豁免
- **刪除 7 command**：px-plan / px-audit / five / debug-guide / code-analysis / mermaid / tdd-guide（指令）
- **保留不動**：rg / db-query / error-eye / fhs-check / fhs-audit / guardian / fhs-cost-audit / ag-stitch-sync / ag-ui-import（各有獨立用途）
- **速查表**：README.md 改寫為場景索引，解決「用時想不起用哪個」痛點

***

[2026-05-30] Phase 1 指令精簡 — 刪 rp-flow，精煉內建，新建 ag-flow

決策：
- **精煉內建**：/rp 精煉為 cl-flow / cl-flow-fast / ag-flow 的預設 Step 0，不可跳過，不需手動呼叫
- **命名邏輯**：指令名 = 最終裁決者（cl-flow=Claude / ag-flow=AG / rp=只精煉不裁決）
- **刪除 rp-flow 三兄弟**：純包裝糖，今天才建，依賴 cl-flow 地基，地基已吸收功能後包裝層冗餘
- **ag-flow 取代 rp-flow-ag**：PX+AG 管道、AG 裁決、精煉內建，語義更直白

***

[2026-05-30] /rp-flow 精煉管道串聯 v1.0.0 — 四變體/Gate/批評移位/反奉承內建

決策：
- **批評移至最終輸出層**：/rp 初步無參照物，強制批評等於表演；verdict_critique / plan_critique 在 Verdict/ag-plan 產出後才有真實缺陷可批評
- **Gate 1 強制停（非 timeout 自動繼續）**：Gate 1 的目的是防止錯方向浪費 cl-flow token，強制停比 timeout 更有效；Gate 2 僅 --review 變體，避免讓「全自動」名不符實
- **/rp-flow-ag = A1+A2（ag-plan 為裁決）**：ag-plan 收到 PX 研究後直接出方案，Fat Mo 自行判斷，跳過 A3 Claude 合成層；適合任務清晰、信任 ag-plan 輸出的場景
- **反奉承守則內建**：用戶每次輸「不奉承」是設計缺口，守則寫入 rp.md 永遠生效
- **資源目錄靜態快照**：subagent_skill 維度從目錄對號入座，不依賴 AI session context 猜測

***

[2026-05-30] /rp 指令升級 v2.2 — 三變體/8維度掃描/Pipe模式

決策：
- **Pipe 模式 vs Exempt 衝突**：Exempt 禁的是 AI 主動建議，用戶明確輸入 `/rp cl-flow` 屬用戶最高授權，語義不同，允許。Pipe 模式發生在 cl-flow A1 研究之前，職責不重疊。
- **8 維度掃描用「清單 + 地板」**：8 維度每次必點名（不遺忘），但 conflict/token/history 三維設強制地板（可用 [強制·低] 逃生門），其餘可 N/A。避免全強制導致 token 違反 Rule 3.11。
- **移除純文字版**：Fat Mo 明確要 XML 供審閱，純文字版是重複輸出，對 PL 另設 Markdown 格式。
- **自我批評封頂 ≤3×1行**：防止 overhead，fast 變體跳過以符合輕量定位。
- **FHS 自動注入層**：5 個關鍵詞觸發固定系統前提注入，減少 Fat Mo 手填 context 負擔。

***

[2026-05-30] `_buildSplitIgLine` pureNumeric 參數設計（flow 2026-05-30-1248）

決策：
- **加第 4 參數而非分叉函式**：`_buildSplitIgLine` 被 v1/v2 共 4 處呼叫，若分叉為兩函式須改 4 處呼叫端 + 維護兩版本。參數化只需在函式本體加分支、v2 呼叫端傳 `true`，v1 不傳即維持舊行為，改動最小（C2 原則）。
- **保留 `=$總和`（多格時）**：純數字 `2380+860+100=$3240` 兼顧簡潔與對帳可讀性；Q1 架構裁決：顯示與 payload 同一管線，不可只改顯示。
- **需求③ defer**：`saveOrderText` 是 Review Mode 專用 PATCH（需既有 order_id），新單無 Supabase row 不適用；保留 Review Mode 為唯一文字編輯入口，避免兩套編輯 UI 維護負擔。

***

## 記錄

[2026-05-30] IG 訊息預覽 Modal — 架構決策（flow 2026-05-30-0240）

決策：
- **`output-preview-a/b` textarea 隱藏不移除**：兩個 textarea 同時是顯示層與 payload 資料源（L6025–6026 `Full_Order_Text` 讀其 `.value`）。只把外層 `preview-card` 隱藏，textarea 留 DOM，live-update 邏輯照常寫入。移除即導致同步出空訂單（C1 致命風險）。
- **Modal 讀 textarea `.value`（不另建格式化邏輯）**：保證 Modal 顯示與 payload 內容 bit-by-bit 一致（PX 風險1），無需維護第二套格式化管線。
- **「複製並同步」純複用 `copyMessageA/B + syncToAirtable`**：零新寫入路徑，不引入雙寫競態（PX 風險3），沿用既有 banner + 輪詢反饋機制。
- **技術債標記（V42 Gate）**：`output-preview` 顯示層兼資料層耦合屬技術債。觸發解耦條件：當需支援 Category C **或** Supabase SSoT 正式翻轉啟動時，payload 改讀 captureFormState/結構化資料，textarea 轉為純顯示。

[2026-05-29] Category A IG 訊息雙版本格式 — 架構決策

決策：
- **版本切換用 flag + localStorage，非分支兩個 HTML**：以 `igFormatVersionA`（v1/v2）單一 flag 控制，原版邏輯逐字保留於 `buildCategoryA_v1()`，可一鍵還原。原因：避免維護兩份 HTML、保留隨時切回原版能力。
- **v2 不修改共用 custInfo/finInfo/disclaimer**：這三區塊 Category A、B 共用。v2 改為在 build 函式內自建 A 專屬區塊，確保 Category B 輸出 100% 不受影響。原因：硬隔離，防止改 A 波及 B。
- **不改 formatBabyLimbs() / formatLimbs()，另建 inline 版**：原函式回傳含【嬰兒】header 多行格式，Review/還原可能依賴。v2 另建 `formatBabyLimbsInline()` 回傳「二手二腳（色）」單行。原因：避免動到既有渲染依賴。
- **付款拆行 / 未付尾數計算式 defer**：v2 範例需兩行付款 + 加數式，但現有表單無對應欄位。Fat Mo 決定下 session 優化設定後再處理，本次 v2 維持單行純數字。原因：避免提前新增 input 影響 captureFormState 與 n8n payload。
- **日期沿用 YYYY/MM/DD**：v2 只改前綴 `*倒模日期時間:`，不轉 16/4 10:30 風格。原因：零轉換風險。

[2026-05-28] 財務設定 Schema v2.1 — 架構決策

決策：
- **加購配件 α 方案（addon → products 表）**：羊毛氈 / 燈飾 SKU 存 products.total_base_cost，解除舊 FK violation 風險，所有成本從同一表查。
- **display_group γ 方案（schema-time 固定）**：6 個分組值以 CHECK constraint 寫入，不透過 RPC 傳入，避免 fhs_upsert_cost_config 需改介面。
- **樂觀鎖 SELECT FOR UPDATE**：替代 SELECT + ON CONFLICT 兩步方案，消除 TOCTOU 競爭。保留 3-param 舊簽名重載向後相容。
- **fhs_sync_products_from_config GRANT TO service_role**：此 RPC 寫 products，不應開放 anon。前端不直接呼叫，由 batch recalc 前置觸發。
- **v1 key 重命名遷移（不 DELETE）**：wool_felt_addon_cost → addon_cost_wool_felt 等，保留歷史記錄，只改名不砍。
- **β 混型訂單 Phase 2 defer**：成人P + 嬰兒S 組合成本計算複雜度高，目前由 Fat Mo 手動調整 net_profit，Phase 2 才建模。
- **衝突 Modal 雙選項**：「重新載入 / 強制覆寫」，解決同裝置雙分頁死鎖問題（只有重載會形成無限循環）。

原因：
- 三份 subagent 審計（database-reviewer / ui-designer / code-reviewer）發現 8 個 Critical，均已修補後才進入 Stage 3。
- 直觀管理原則（Fat Mo 需求）：所有產品成本單一查詢位置（products 表），不跨表。

批准：Fat Mo ✅（/execute → 「go」2026-05-28 Session 37）

---

[2026-05-27] 編輯系統 v2 雙模式重構 — 架構決策

決策：
- **Mode 1 保留（文本快照編輯）**：`saveOrderText` 不改行為；`is_text_overridden = true` flag 防止 n8n 下次 sync 覆蓋手動文本。
- **Mode 2 新增（order_items 結構化編輯）**：`save_structured_order_items` RPC（SECURITY DEFINER）原子化 DELETE+INSERT；完成後清除 `is_text_overridden = false`，重新開放 n8n regeneration。
- **n8n guard 落 DB 層（migration 0018）而非 Code Node**：NAS n8n Code Node 不支援 `fetch()`（P6），guard 寫在 `sync_order_to_mirror` ON CONFLICT CASE WHEN，不受 sandbox 限制。
- **Dirty-diff 去重**：`_hashMode2()` 字串 hash 比對，hash 相同禁止 POST，節省 DB write 和 token。
- **Lazy-load（`_fhsMode2Loaded` flag）**：Mode 2 items 只在 tab 首次點擊時 fetch，避免每次開 modal 多一次 DB 讀。
- **`_prevItemMap` 保護（Session 6 Bug A 模式複用）**：DELETE 前快照 `batch_number`/`process_status`，COALESCE 還原；保護既有批次資料不被 Mode 2 save 清空。
- **V47.11 節點重命名 + jsCode 備注**：本地 JSON 備份更新；實際保護在 DB 層（migration 0018）。
- **Mobile bottom sheet（`@media max-width:768px`）**：`align-items:flex-end` + `border-radius:16px 16px 0 0`，直接 CSS 不加 JS resize 邏輯。
- **code-reviewer gate G1–G10**：G3a（RPC return 缺 `full_order_text`）審查中發現，已修復。

原因：
- **Root bug**：`saveOrderText` → `orders.full_order_text` only；總覽刻字讀 `order_items.engraving_text` → 兩表不同步，Mode 2 解決從源頭改 `order_items`。
- **NAS限制**：fetch/process.env 在 n8n Code Node 靜默失敗，DB-level guard 是唯一可靠方案。
- **單人系統**：無多用戶競爭，客戶端 `_sbSyncInFlight` 鎖已足夠（不需 DB-level lock）。
- **Sunset path**：Mode 2 為 v3.0 materialized view 鋪路（v3 計畫見 `.fhs/reports/planning/v3_materialized_view_plan.md`）。

批准：Fat Mo ✅（/execute 2026-05-27 Session 32）

***

[2026-05-27] PGC-ODAT v3 Lite 架構決策 — 訂單總覽子項目成本與利潤稽核（折中方案）

決策：
- **採折中方案（v2 + v3.A 對賬 modal）**，不採 v3 全升級。
- **v2 核心**：preload `products` 表（sku/suggested_price/cost，~490 筆，flat Map 結構）至全域 `fhsSuggestedPriceMap`，cache TTL 30 min；CSS class toggle（`body.fhs-audit-on`）切換顯示，不重 render；Desktop 財務子列 + Mobile 💰 per-item drawer。
- **v3.A 對賬 modal**：每行項目右側加 💡 icon，點擊展開 modal 顯示「SKU建議價 / 實付推估 / 可能差異原因 candidates」，即時計算，不固化欄位。
- **捨棄 v3.B（nested Map）**：products 表當前無 `tier_json`/`effective_date`，YAGNI 原則，未來需要時再改（5 分鐘工作）。
- **捨棄 v3.C（Hybrid sync / Supabase user_preferences）**：單人系統，多裝置 toggle 不一致不是痛點；引入新表增加複雜度與失敗路徑，不值得。
- **Phase 1 策略（漸進三階段）**：Phase 1 = SKU 建議價/利潤 + 免責註腳（不含整單優惠/折讓）；Phase 2 = 實付分攤欄（系統折扣規則完善後）；Phase 3 = 差異欄 + 自動歸因。
- **開發版原則**：所有改動在 `freehandsss_dashboardV41.html`，驗收後由 Fat Mo /execute 授權同步 current。

原因：
- **C 過度設計**：Fat Mo 為單人操作，localStorage 已滿足跨 session toggle 持久化需求。
- **B 超前設計**：products 表結構在可見未來無 tier/effective_date，nested Map 為假設需求付出真實複雜度。
- **A 解真實痛點**：系統未完善期間實付 ≠ SKU建議價的差異原因眾多（舊客優惠/手工折讓/Tier），對賬 modal 以「候選原因清單」方式呈現，不強行計算攤分，符合「系統未完善 → 漸進改善」的現實。

批准：Fat Mo ✅（2026-05-27 確認折中方案）

***

[2026-05-22] Order_ID Rename Race Condition 根治 — AG 架構分析 + Migration 0011 落地

決策：
- **架構性 timing bug**：`responseMode: "onReceived"` 導致前端 sbSyncOrder 在 n8n rename RPC 前到達，造成 409。修復層選擇在資料庫（merge-on-collision）而非更改 n8n responseMode（影響 UX）。
- **Migration 0011**：`rename_order_id` 升版，加入 `FOR UPDATE` row-level lock（防止 concurrent deadlock）、merge-on-collision 邏輯（若兩者同時存在則合併關鍵欄位並刪除舊 ghost row）、SECURITY DEFINER（anon/service_role 均可呼叫）、冪等（重複呼叫安全）。
- **Frontend V41.2**：`effectiveOrderId = New_Order_ID || orderId`，sbSyncOrder 所有 Supabase 操作改用 effectiveOrderId；pre-fetch 保留 product_sku 避免 FK 23503。
- **知識沉澱**：race condition pattern 寫入 `build-error-resolver.md`，未來相似問題可直接索引。

原因：n8n responseMode 架構問題無法從程式碼審查發現，需要 AG 跨層分析；資料庫層修復比 workflow 層修復更穩健（不影響響應速度，且可冪等重試）。

批准：Fat Mo ✅（AG 方案 + /execute 授權 2026-05-22）

***

[2026-05-22] Order_ID 修改功能三端修復 — Frontend + Supabase + n8n

決策：
- **Frontend `New_Order_ID` 欄位**：edit mode 下 payload 新增 `New_Order_ID`（currentOrderId），`Order_ID` 保持 editTargetOrderId（WHERE clause anchor 不變）。`editTargetOrderId` 不在 `onIdInputBlur()` 更新，保持不可變，避免邏輯矛盾。
- **Supabase migration 0010**：`order_items.order_fhs_id` FK 加 `ON UPDATE CASCADE`；新建 `rename_order_id(old_id, new_id)` RPC，在一個 transaction 內先更新 item_key prefix，再更新 orders.order_id（CASCADE 自動更新 order_fhs_id）。
- **n8n Mirror_to_Supabase V47.7**：偵測 `New_Order_ID`，若存在則先調用 RPC，RPC 完成後 `orderId` 改為新值，後續 orders/order_items upsert 用新 ID。`process_status` / `batch_number` 在 RPC 內完全不觸碰。

原因：Order_ID 是 orders 表的 unique key（非 UUID PK），order_items 有 FK 指向它。直接 PATCH 觸發 FK violation；delete + reinsert 會清空製作進度；item_key 含 order_id prefix，ON UPDATE CASCADE 不會自動修復，需 RPC 顯式更新。

批准：Fat Mo ✅（2026-05-22 授權執行）

***

[2026-05-21] Subagent 稽核機制新增 — execute.md + commit.md + handoff.md 標準化

決策：
- **execute.md [E] 欄位新增**：每次 `/execute` 完成後必填「Subagent 使用記錄」表格（Router 建議 / 實際使用 / 遵從 Router），無論是否使用 subagent 均必填。
- **commit.md Phase 1 強制欄**：handoff.md 每個 session 完成事項末尾強制附上 [E] 表格。
- **向後不兼容舊 session**：舊 session 記錄補填「不詳（舊格式 session，標準化前）」，不強制補齊 Router 建議。

原因：FHS Router hook 在每個 session 啟動時已建議 subagent，但沒有任何報告欄位記錄是否遵從，導致 Fat Mo 無法審計 subagent 使用率與 Router 的有效性。

批准：Fat Mo ✅（2026-05-21 授權執行）

---

[2026-05-21] Bug 修復：修改訂單後批次/進度重置 + W_WOOL 舊資料 pipe 格式渲染問題

決策：
- **sbSyncOrder DELETE+INSERT 加護盾**：修改訂單前先 fetch 舊 `order_items` 的 `{item_key → batch_number, process_status}` 映射，DELETE 後 INSERT 時按 `item_key` 回填，防止已儲存的批次/進度被覆蓋。限制：只能保留 `item_key` 完全相同的 item（新舊格式不同的訂單不受保護）。
- **_woolKey 擴展 pipe 格式偵測**：`_woolKey` 和 `_accWoolKey` 改為雙重檢查（`_W_WOOL` 後綴 OR `'羊毛氈'` 字串），覆蓋 n8n 舊格式 `item_key = '0696216 | 羊毛氈公仔 - 加購'` 的偵測失敗問題。

原因：n8n 存入 Supabase 的舊格式 item_key 是 pipe format，`_cleanKey` 邏輯 → `Order_Item_Key = ''`，`Item_ID = '0696216 | 羊毛氈公仔 - 加購'` 不含 `_W_WOOL`，導致 `_hasWool = false`，W_WOOL 渲染為獨立 row 且 Row 1 無 badge。

批准：Fat Mo ✅（2026-05-21 授權執行）

---

[2026-05-21] 加購配件（W_WOOL 羊毛氈公仔）渲染架構決策 — 建立 addon_product_sop.md

決策：
- **加購配件不獨立成 Review Mode row**：改以 inline badge 合併至父產品（立體擺設）同列，`_woolKey`/`_hasWool`/`_renderItemsFinal` 模式在 `renderReviewTable` 和 `renderReviewAccordion` 兩個渲染函式中同步實作。
- **sbSyncOrder 禁止寫 product_sku**：加購配件 Product_Name 不在 Supabase `products` 表，強行寫入會觸發 FK 23503，導致整批 INSERT rollback（所有 item 全失敗）。移除後問題解除。
- **Order_Item_Key 後綴作為唯一識別**：`_W_WOOL` 後綴同時作為 `_deriveCat`、`getProductDimensions`、渲染分離的識別依據，不依賴 Product_Name 字串（Supabase 不儲存 Product_Name）。
- **SOP 文件化**：建立 `.fhs/notes/addon_product_sop.md`，含四個必改位置與 checklist，供 subagent 日後新增同類加購配件時參照。

原因：羊毛氈公仔是首個「加購型配件」產品，其架構問題（FK 衝突 + 渲染分離）屬可預期重複出現的 pattern，需要 SOP 固化，避免每次新加配件都要重新 debug。

批准：Fat Mo ✅（2026-05-21 授權執行）

---

[2026-05-20] 補 Reflect→Think 閉環 — 新建 learnings.md + 鉤入 /read + 解 handoff 封鎖

決策：
- **新建 `.fhs/memory/learnings.md`**：三節骨架（Patterns / Pitfalls / Preferences），上限 50 條。職責與 decisions.md（事件記錄）正交，learnings.md 只存 distill 後的可複用規律，不重複事件細節。
- **SOP_NOW.md 初始化步驟加入 Step 3**：每 session /read 強制載入 learnings.md，讓歷史教訓在工作記憶中可見。
- **handoff.md 封鎖文字微調**：2026-05-19 修 A2 越權 bug 後的封鎖過度（「嚴禁主動執行」誤擴張至「嚴禁主動引用」），本次修正為「寫入/執行需授權，引用 learnings.md 提示不需授權」。
- **commit.md Phase 1 加 Step 5**：每次 commit 結尾詢問 Fat Mo 是否有 lesson 要 distill，手動 append，無回應靜默跳過，零 LLM 自動化成本。

原因：FHS 有大量 Reflect artifact（decisions.md 488 行、handoff.md、lessons/、CHANGELOG.md）但缺乏「下一個 session 主動引用」機制。gstack Reflect→Think 閉環的核心是 persistent learning 回灌，最小實作是一份壓縮的 learnings.md + /read 鉤入。

批准：Fat Mo ✅（2026-05-20 授權執行）

---

[2026-05-18] Telegram 通知分格 + Dashboard 部位誤報 Bug Fix

決策：
- **Telegram 三格分離**：`Pack Telegram Data`（n8n）改為在 JS 內組裝完整 `Full_Message`，`Send Profit Report` 只輸出 `={{ $json.Full_Message }}`。新訂單顯示完整商品清單（`Sub_Items`），修改訂單只顯示財務核算 + `Update_Note`，刪除訂單顯示最精簡格式。
- **Dashboard Update_Note 部位誤報修復**：`lastFetchedState` 從 Airtable 讀回時不含 `limb_sel_*` 鍵，比較時 `"true" !== undefined` 導致所有 body parts 被誤標為已變動。修復：加 `if (!(k in lastFetchedState)) continue` + `String()` 型別正規化。受影響文件：`freehandsss_dashboardV41.html` + `Freehandsss_dashboard_current.html` Line 5417。
- **n8n Pack Telegram Data 雙 🔄 修復**：`Update_Note` 本身已帶 `🔄 更新項目:` 前綴，移除模板中多加的 `🔄 ` 避免重複。

批准：Fat Mo ✅（2026-05-18）

---

[2026-05-17] 介面分流術語語意大清洗 — 取消 Ling Au / Fat Mo 介面標準命名

決策：
- **術語替換範圍**：僅針對「UI 介面模式」命名，管理員身份的 Fat Mo 稱呼保留不動。
- **替換對照**：`Ling Au 行動端模式 / Ling Au 模式` → `📱 Mobile phone 介面模式`；`Fat Mo 桌面端模式 / Fat Mo 模式` → `💻 Desktop 介面`。
- **受影響文件**：`docs/DESIGN.md`、`docs/FHS_Blueprint.md`、`docs/FHS_Prompts.md`、`docs/FHS_Product_Bible_V3.7.md`（共 9 處替換）。
- **根因**：舊術語白紙黑字寫入設計文件，每次新 session AI 讀取文件後都會重新載入舊術語，導致術語不斷回調；唯有在源頭清洗才能徹底防止。
- **GLOBAL_AI_SOP.md**：不在本次清洗範圍，管理員 Fat Mo 身份保留。

批准：Fat Mo ✅（2026-05-17 授權執行）

---

[2026-05-16] Supabase-First 財務遷移 — n8n V47.4 + Finance Bible + 四端架構完成

決策：
- **n8n `Calculate Profit & Pack Items` 升級 V47.4**：新增 `getItemCategory(sku)` 函數推導 item_category（木框/玻璃瓶→立體擺設，鎖匙扣→金屬鎖匙扣，吊飾→銀飾）。每個 packed item 新增 `Item_Category`、`Handmodel_Cost`、`Keychain_Cost`、`Necklace_Cost`。訂單層新增 `Handmodel_Cost_Total`、`Keychain_Cost_Total`、`Necklace_Cost_Total`。鎖匙扣運費扣減同步套用至 `keychainCostTotal`。
- **n8n `Mirror to Supabase` 升級 V47.4**：orders upsert 補入 `deposit`、`balance`、`additional_fee`、`full_order_text`、`handmodel_cost`、`keychain_cost`、`necklace_cost`。order_items upsert 修正 `product_sku`（從 hardcoded null 改為 `item.Product_Name || null`）並新增 `item_category`、`handmodel_cost`、`keychain_cost`、`necklace_cost`、`subtotal_cost`、`specification`。
- **建立 `.fhs/ai/FHS_Finance_Bible.md` v1.0.0**：統一財務計算聖經，10 節涵蓋雙層成本架構、SKU映射、節點職責、驗證公式、反模式。所有涉及財務的 subagent 強制在執行前讀取此文件。
- **subagent 升級至 v2.0.0**：`database-reviewer` 和 `finance-auditor` 均升級，加入 Finance Bible 強制前置讀取（Phase 0），將 Triple Sync 欄位地圖參照改為 Quadruple Sync，`finance-auditor` 架構從三端升為四端（新增 Supabase 為 Tier 1 主導）。
- **雙層成本架構確認**：Layer 1（Supabase View 動態）提供即時報價，Layer 2（n8n 靜態寫入）保存歷史快照。Supabase trigger/generated column 嚴禁計算財務欄位。

根因修正（C0.5）：
- 23 筆 Supabase 歷史訂單 `handmodel/keychain/necklace_cost = NULL`：根因是 Mirror to Supabase 節點從未包含這些欄位，已在 V47.4 修正。歷史訂單需另行 backfill（待 Airtable quota 重置後）。
- 2 筆 order_items `product_sku = NULL`：order 0600100 特殊品（立體擺設 + 金屿扣/腳）因無標準 SKU 匹配，NULL 屬正確行為，無需修正。

批准：Fat Mo ✅（2026-05-16 授權處理）

---

[2026-05-10] finance-auditor Subagent v1.0.0 — 三端財務稽核員建立

決策：
- **建立 `finance-auditor` subagent**（不升級 database-reviewer）：database-reviewer 職責為靜態 Schema/Code 審查，finance-auditor 職責為 Live Airtable 動態數據驗證，兩者正交。
- **Single-file 內嵌 Python 邏輯**：與 `build-error-resolver`、`blender-3d-modeler` 同模式，避免雙層架構增加維護成本。
- **強制讀取 `finance-calculator` skill**：公式不重複定義，節省 token，finance-calculator 作為共用 reference layer。
- **三端架構清晰切割**：Tier 1 Airtable（數據源）→ Tier 2 n8n（計算引擎）→ Tier 3 Dashboard（前端真理）。前端 profit ≠ 0 時為絕對真理，finance-auditor 強制遵守 AGENTS.md §財務真理守護。
- **Supabase 就緒設計**：Phase 3 Tier 1 查詢層已文件化替換路徑（Airtable MCP → read-only-postgres skill），欄位名稱對齊 Quadruple_Sync_Field_Map.md，遷移時只需替換連接方式，不改稽核邏輯。
- **FHS_Prompts.md 情境五觸發詞收窄**：「利潤」「Total Cost」移出情境五，改為「財務規則確認」入口；Live 驗證統一走情境二十一。
- **AGENTS.md 新增決定性路由規則**：Live Airtable 財務驗證觸發時強制調用 finance-auditor，不得由 Claude 直接處理。

批准：Fat Mo ✅（2026-05-10 /execute）

---

[2026-05-07] n8n V40.9 零成本防衛 + Airtable 公式修正 + /fhs-cost-audit 指令

決策：
- **Airtable 公式反模式修正**：Keychain_Cost / Handmodel_Cost / Necklace_Cost 三個 rollup 公式原有 `× Quantity` 錯誤，導致批次 SKU（如 $290/2件）成本翻倍。修正為直接 `SUM(Item_BaseCost)`，與 AGENTS.md 架構規則（Airtable 公式僅供展示輔助）對齊。
- **n8n Node 14 零成本防衛**：加入 `zeroCostItems` 陣列，偵測 Total_Base_Cost = $0 的有效 SKU，輸出 `Cost_Lookup_Warning` 與 `Has_Cost_Error`。防止 SKU 名稱查找失敗時 Total_Cost 靜默為 $0（Katkat 問題一類型根因）。
- **新增 `/fhs-cost-audit` 指令**：定期執行 `audit_total_cost_integrity.py` 比對 Total_Cost 與各類目 rollup 總和，異常自動分類為 CRITICAL / WARN / OK。與 `/fhs-audit`（架構衛生）、`/fhs-check`（功能測試）職責不重疊。

批准：Fat Mo ✅（2026-05-07 /execute）

---

[2026-05-07] blender-3d-modeler v2.0.0 — 升級為 Triage-first 工程型 subagent

決策：
- v1.0.0 的問題：角色定義過窄（只有 4 個配方），無 Triage 邏輯，無 I/O 合約，無 failure handling
- v2.0.0 升級：新增 STL Triage 決策樹（REPAIR/REBUILD/HANDOFF）、FDM printability check、HANDOFF 工具清單
- **開放藝術建模**：Fat Mo 明確確認藝術設計/造型設計/美學調整均在能力範圍內（原 Non-Goals 錯誤限制）
- **新增 3d/ 路徑規則**：`3d/input/`（上傳）/ `3d/projects/{slug}/`（工作檔）/ `3d/output/{slug}/`（列印用 STL），提升專案組織層次
- Triage 閾值：non_manifold_edges < 50 → REPAIR；≥ 50 → REBUILD（保守設定，寧可多問不擅自修）

批准：Fat Mo ✅（2026-05-07 /execute — Flow 2026-05-07-1007）

---

[2026-05-05] blender-3d-modeler subagent — 採用 Single-file 內嵌知識設計

決策：
- **不採用** AG 計劃的 skill + subagent 雙層架構（`BlenderAdvancedModeling` skill + `BlenderModelPro` subagent）
- **採用** 單一 subagent 檔案，將所有已驗證的 Python 配方嵌入同一個 .md（與 `build-error-resolver.md` 相同模式）
- Model 選用 `claude-sonnet-4-6`（需要工具執行能力，Haiku 功能不足）

原因：
- 此任務需要工具執行能力（`mcp__blender__execute_blender_code`），skill 只是純知識 reference layer，無執行能力
- 雙層架構增加維護成本，且 FHS 最小化原則要求避免過度拆分
- 單一 subagent 內嵌知識可確保配方「記憶」隨 agent 一起部署，不依賴額外 skill 讀取

知識來源：2026-05-05 心形凹槽手模 Blender session 實際驗證配方（MANIFOLD boolean / 浮空碎片清除 / 外殼放量 / Z-slice 分析）

批准：Fat Mo ✅（2026-05-05 /execute — Flow 2026-05-05-2300）

---

[2026-05-04] Order_Items 成本分類欄位計算方式確認（formula 保留）

> ⚠️ **SUPERSEDED**：本決策已於 **2026-05-13 Supabase-First 策略 (AGENTS.md v1.4.5+)** 與 **2026-05-17 AGENTS.md v1.4.6 §財務真理守護「財務欄位計算職責分工」** 取代。
> 現行規則：核心財務欄位（含 Handmodel/Keychain/Necklace_Cost）必須由 n8n 計算後寫入 **Supabase (Primary)** 並鏡像至 Airtable (Fallback)。Airtable formula 僅作展示輔助，非權威來源。
> 保留此條目作為歷史記錄。

決策（已 Superseded）：
- 保留 `Handmodel_Cost`、`Keychain_Cost`、`Necklace_Cost` 為 Airtable formula 欄位（不改 number）
- 原因：公式已修復（無紅三角），且 formula 可即時反映 Product_Link 成本異動，n8n 寫入反而無此優勢

**計算邏輯（供日後轉移其他 Database 用）**

三個欄位共用相同邏輯，差異僅在類別關鍵字：

```
IF(
  FIND("{類別}", ARRAYJOIN({Item_Category}, ",")),
  SUM({Item_BaseCost}) * {Quantity},
  0
)
```

| 欄位 | 類別關鍵字 | 說明 |
|------|-----------|------|
| Handmodel_Cost | `立體擺設` | Item_Category 含此字串時，計算 Item_BaseCost × Quantity |
| Keychain_Cost | `金屬鎖匙扣` | 同上 |
| Necklace_Cost | `純銀頸鏈` | 同上（注意：關鍵字為「純銀頸鏈」，非全名「純銀頸鏈吊飾」） |

**依賴欄位**：
- `Item_Category`：multipleLookupValues，透過 `Product_Link → Main_Category` 取得
- `Item_BaseCost`：multipleLookupValues，透過 `Product_Link → Total_Base_Cost` 取得
- `Quantity`：number，由 n8n 或 Dashboard 直接寫入

**轉移注意**：
- 若目標 DB 不支援 lookup array，需先在 n8n 解析 `Item_Category`，改為 conditional 寫入

批准：Fat Mo ✅（2026-05-04）

---

[2026-05-04] 鎖匙扣跨部位運費扣減規則建立 + Node 14 V40.6 部署

決策：
- Node 14 "Calculate Profit & Pack Items" 更新至 V40.6：加入 `keychainItemCount` 訂單層計算邏輯
- 訂單層扣減規則：`(鎖匙扣 Order_Items 件數 − 1) × $20`，僅在件數 > 1 時生效
- 規則記錄於 `docs/FHS_Product_Bible_V3.7.md` §2.5
- 11 筆 Airtable Main_Orders 歷史記錄修正（Total_Cost & Net_Profit，合計差異 −$260）
- `n8n-mcp-server/src/n8n-client.js` PUT sanitization 修正（解決 HTTP 400 錯誤）
原因：不同部位的鎖匙扣（如 LH + RH）在同一訂單共用同一批次運費，舊 Node 7 只計算同 SKU qty>1 的 item 層扣減，跨 item 的訂單層扣減從未實作，導致 11 筆歷史訂單 Total_Cost 低估共 $260。
批准：Fat Mo ✅（2026-05-04）

---

[2026-05-03] Airtable 成本分拆欄位建立 + n8n 財務計算職責確立

決策：
- 在 Order_Items 新增 3 個成本分類欄位：Handmodel_Cost（立體擺設）、Keychain_Cost（金屬鎖匙扣）、Necklace_Cost（純銀頸鏈吊飾）
- 在 Main_Orders 新增 3 個對應 Rollup 欄位（SUM）
- 確立原則：上述欄位由 n8n 計算並直接寫入，不使用 Airtable formula
- AGENTS.md 升級至 v1.4.2，新增「Airtable 計算職責分工」規則
原因：Airtable formula 無法可靠處理 multipleLookupValues 陣列計算（會出現紅色三角形錯誤）。n8n 在處理訂單時已知商品類別，由 n8n 計算成本分類更穩定可靠。
批准：Fat Mo ✅（2026-05-03）

---

[2026-05-03] Stitch → Antigravity 整合完成 — 建立 UI 設計工具管線

決策：
- 將 Google Stitch MCP 整合至 Antigravity 設計工作流，建立標準化轉換管線
- 新增 `/ag-stitch-sync` 指令：讓 Antigravity 開啟並擷取 Stitch 生成的 UI snippet
- 新增 `/ag-ui-import` 指令：將確認後的 UI snippet 去除外部依賴，轉為 Vanilla HTML/CSS
- 更新 AGENTS.md Section 3 加入「Stitch 資產守護」原則
- 更新 ANTIGRAVITY.md 加入 Stitch MCP 使用入口
- 更新 ui-designer.md / frontend-developer.md 明確 Stitch 工作邊界
原因：系統缺乏 Stitch 明確工作流，導致設計工具整合不完整。Fat Mo 授權解除 A2 寫入鎖並執行整合（2026-05-03）。
批准：Fat Mo ✅（2026-05-03）

---

[2026-04-28] V40.4 同步至 current（生產環境正式切換）

決策：
- 將 `freehandsss_dashboardV40.html` 複製至 `Freehandsss_dashboard_current.html`
- 更新 `README.md` 與 `Freehandsss_Dashboard/README.md` 版本標記
- 當前生產版本 = V40.4（響應式設計 + API 快取）
- V36 降級為「舊版穩定基準」（備份參考用）
原因：V40.4 已完成響應式重設計、財務模式整合、API 優化等全部功能。經過充分測試，已達生產就緒。

[2026-04-28] Airtable API 配額優化 — 5分鐘快取層 + sessionStorage

決策：
- 在 `fetchGlobalReview()` 加入 client-side 5分鐘 sessionStorage 快取
- 同一查詢條件（year/month/status/batch/search）5 分鐘內不重複呼叫 n8n/Airtable
- 在 `loadSystemConfig()` 加入 30分鐘 sessionStorage 快取
- 保留 `forceRefresh` 參數供手動刷新
- n8n 端快取（FHS_Query_GlobalReview_cached.json）已設計但暫緩部署，client-side 方案已足夠
原因：April 2026 Airtable API 用量 ~1138 次，超出免費配額 1000 次。根因是開發期間每次頁面加載都觸發 API 呼叫。Client-side 快取可即時生效且不需修改後端工作流。

[2026-04-28] 新增 3 subagents + 1 skill — FHS 後端/診斷/財務執行能力強化

決策：
- 從三個 GitHub 來源（agency-agents ~150個、andrej-karpathy-skills 4原則、everything-claude-code ~36 agents）中精選 5 個模組
- 安裝 database-reviewer（Sonnet）、tdd-guide（Sonnet）、build-error-resolver（Haiku）三個 subagent
- 安裝 finance-calculator skill（≤ 30 行精簡版）
- karpathy-principles 不建獨立 skill — 唯一新概念「Goal-Driven Execution」合併進 AGENTS.md，避免重複 context 消耗
原因：
- FHS 系統缺乏 Airtable schema 審查、測試驅動、自動化 debug 能力
- 選擇 on-demand subagent 模式（非 hook 模式）以確保零 baseline token 成本
- 排除 ECC hooks/rules/commands 系統（與雙系統 bridge pattern 不相容）
- 排除 150+ 不相關 agent（marketing/sales/語言特定）

[2026-04-26] 新增 Order_Confirm_Date 欄位 — 記錄每月銷售統計

決策：
- 在 Airtable Main_Orders 新增 `Order_Confirm_Date`（date, ISO 格式）欄位
- 17 筆舊訂單以 Excel 日期欄填入；4 筆已有訂單以 Appointment_Date 填入
- Dashboard（current + V40）同步按鈕 payload 加入 `Order_Confirm_Date = 當日日期`，僅 `create` 模式送出，`edit` 模式不覆寫
- n8n FHS_Core_OrderProcessor 兩個 Create Main Order upsert 節點加入欄位映射 `={{ $json.Order_Confirm_Date || null }}`
原因：Fat Mo 需要按月份統計銷售，Appointment_Date 是取模日（未來），不適合作收入確認日；改用 confirm 日（訂單建立當日）更準確。

[2026-04-25] 系統檔案衛生清理 — 刪除孤立/過期/冗餘檔案

決策：
- 刪除 `repomix-output.txt`（4.9 MB 生成物，非版本控制對象）並加入 .gitignore
- 刪除 `.fhs/memory/system_status.json`（2026-03-28 凍結，handoff.md 已完全取代）
- 刪除廢棄 worktree `.claude/worktrees/wizardly-mendel/`（最後活動 2026-04-05，無進行中工作）
- 刪除孤立工作流 `.agents/workflows/freehandsss-optimizer-v2.md`（未被任何系統引用）
- 歸檔 `n8n/create_fo_workflow.js` 與 `create_fo_workflow_v2.js` 至 `archive/n8n_scripts/`，只保留最新 v3
- 清理 `artifacts/` 舊運行記錄（保留最近 5 次，刪除 2026-04-02 的 4 個目錄）
原因：深度健康稽核（4 並行 Agent）發現上述冗餘，Fat Mo 授權全部執行。回收空間 ~7.5 MB。

---

[2026-04-25] Financial Overview V40.2 整合完成

決策：
- `freehandsss_dashboardV40.html` 新增財務模式（`switchMode('finance')`），通過 Top Bar 📈 按鈕進入
- 獨立財務頁 `freehandsss_financial_overview.html` 標記 DEPRECATED，移入 archive/
- n8n Financial Overview Workflow 部署：Webhook → Fetch Orders → Collect → Fetch Items → Merge → Aggregator → JSON（順序管道）
- Webhook URL：`https://yanhei.synology.me:8443/webhook/financial-overview-fhs`
- 版本定義為 V40.2（V40 = 響應式重構，V40.1 = Accordion Audit Center，V40.2 = Financial Overview 整合）
原因：財務數據需直接嵌入主 Dashboard，獨立頁面造成導航割裂。Live 驗證通過（4月真實數據）。

---

[2026-04-22] V40 iPhone Accordion Audit Center（V40.1）

決策：
- Audit Center 採用 iPhone Accordion 設計（展開/收合），44px touch targets
- 使用 `data-accordion-group` 屬性做 ID 命名空間隔離（避免與 V37 遺留 ID 衝突）
- CSS animation 使用 `max-height` + `overflow: hidden` 方案（原生 details/summary 無法精確控制動畫）
- Code Reviewer PASS 確認，定義為 V40.1 milestone
原因：iPhone 使用者需要更緊湊的 Audit Center，原 V40 全展開佈局在小螢幕佔用過多空間。

---

[2026-04-22] V40 響應式重構完成 — 廢除雙模式設計

決策：
- 廢除 V39 的「Ling Au / Fat Mo 雙模式」設計概念（角色切換器），改為純響應式系統
- 設計軸：`< 768px` → iPhone 優先佈局，`≥ 768px` → Desktop 佈局，一套 HTML 自動適配
- ui-designer.md 升級至 v2.0.0，FHS_INTEGRATION.md 升級至 v2.0.0，移除所有雙模式參照
- V39 proto 標記 DEPRECATED，移入 `Freehandsss_Dashboard/archive/`
- V40 Code Reviewer PASS，正式成為活躍開發版本
原因：雙模式增加維護複雜度，且 Fat Mo 確認無需 Ling Au 專屬 UI。響應式設計更具可擴展性。

---

[2026-04-06] /fhs-audit 稽核修復 — 文件衛生清理

決策：
- v39-aom.md 從 commands/ 移至 archive/（已 Deprecated，避免孤獨檔案殘留）
- repo-map.md 補全 Maintenance_Tools/ 完整檔案清單（原先僅列 run_all.py）
- README.md 版本號同步至 v1.4.0（原為 v1.3.1，與 AGENTS.md 不一致）
原因：/fhs-audit 21 項稽核發現 6 項待修，Fat Mo 授權全部執行。

---

[2026-04-06] Dashboard 版本治理與重置 — 恢復 V36 為 Stable Baseline

決策：
- 正式宣佈 V37、V38、V39 (舊版) 為不合格版本，存在功能缺失與介面品質不達標問題。
- 處置：將上述失效版本全部移入 `Freehandsss_Dashboard/archive/`，不再作為開發或生產基準。
- 恢復 V36 為目前最新穩定版本 (Stable Baseline)，作為所有後續開發的基準。
- 建立新的 V37 (由 V36 複製產生)，定義為唯一的活躍開發版本 (Development Version)。
- 所有新功能、修正與實驗性改動必須基於此新 V37 進行。

核心原則：
- 嚴格遵守版本遞增邏輯，非經批准不得跳版或混用失效版本。
- 保持 `Freehandsss_dashboard_current.html` 與 Stable Baseline (V36) 的同步。

批准：Fat Mo ✅（2026-04-06）

---

[2026-04-06] n8n MCP Server — 建立 AI 控制層（Phase 1）

決策：
- 新建 `n8n-mcp-server/` 作為 AI 與 n8n 之間的專屬控制層
- Phase 1 僅支援 FHS_Core_OrderProcessor（Workflow ID: 6Ljih0hSKr9RpYNm）
- 放在 dashboard repo 內作為子目錄，不獨立 repo
- n8n API key 共用根目錄 `.env`（變數名 N8N_KEY / N8N_INSTANCE）
- 備份路徑：`.fhs/memory/backups/n8n-mcp/{date}/{workflowId}/{nodeName}.json`
- `update_node_code` 預設 dry-run，需 `/execute` 授權才真正 PUT
- 寫入前自動備份 + `rollback_node_code` 回滾機制
- 測試執行僅接受 mock payload（mock_create/edit/delete_order.json）
- workflow allowlist 硬編碼於 config.js，Phase 1 僅允許 `6Ljih0hSKr9RpYNm`
- **狀態更新 (2026-04-06)**: 環境初始化完成，`zod` 驗證層已整合，`get_workflow` 通過遠端連通性測試。工具集正式進入可用狀態。
- **MCP 註冊 (2026-04-06)**: 建立根目錄 `.mcp.json`，將 n8n-mcp-server 註冊為 Claude Code MCP server（command: `node src/index.js`, cwd: `n8n-mcp-server`）。重啟 session 後即可在對話中直接呼叫 7 個工具。

核心原則：
- 不取代既有 Dashboard Webhook 主流程
- 不改寫利潤計算主邏輯
- 三端同步驗證（verify_triple_sync）制度化
- 所有里程碑須通過 CL-FLOW

批准：Fat Mo ✅（2026-04-06 /execute）

---

[2026-04-05] UI/UX Intelligence Integration — 整合 Stitch + Impeccable + FHS-curated UI/UX layer

決策：
- 採用 5-Layer Intelligence Stack（Ideation/Refinement/Spec/Implementation/Quality Gate）
- Impeccable 橋接方案 A：Claude Code 直接 Read `.gemini/skills/frontend-design/reference/`（已驗證可行）
- UI/UX Pro Max 改為 FHS-native 建立（非外部 repo mirror），命名為「FHS-curated UI/UX intelligence layer, inspired by UI/UX Pro Max principles」
- skills/ 層設計為 reference layer（不安裝至 `~/.claude/agents/`，不含 YAML frontmatter）
- OPERATING_MODEL.md 更新至 v2.0.0，加入 5-layer stack 與工具路由表
- 3 個 FHS agent 更新至 v1.1.0（加入 5-layer workflow / Input Contract / UX checklist）

核心原則：
- 不修改 AGENTS.md / CLAUDE.md / ANTIGRAVITY.md
- 不新增平行指令系統
- skills/ 層可獨立 rollback（不影響 subagents/）

---

[2026-04-05] Subagent Engineering — 安裝 FHS 重寫版 Subagent 組合

決策：
- 採用 lst97/claude-code-sub-agents 三個 agent（ui-designer / frontend-developer / code-reviewer）作為基礎
- 不安裝 lst97 的 CLAUDE.md 或 agent-organizer.md（避免與 FHS 架構衝突）
- 雙層文件架構：`.fhs/ai/subagents/vendor/`（原始備存）+ `.fhs/ai/subagents/freehandsss/`（FHS 重寫版）
- Runtime 鏡像：`~/.claude/agents/freehandsss/`（Claude Code 執行時偵測）
- v39-aom.md 內容遷移至 `OPERATING_MODEL.md`（長期制度文件），v39-aom.md 加入遷移注記（未 stub 化）

核心原則：
- AGENTS.md 憲法層不動（無需追加 Section 8）
- CLAUDE.md / ANTIGRAVITY.md 入口層不動
- commands/README.md 不新增平行指令系統
- FHS 重寫版完全移除 React/TypeScript/Tailwind，改為純 HTML/CSS/Vanilla JS 約束

---

[2026-04-05] V39 Prototype-First Rebuild — 建立 Agent Operating Model + 原型檔案

決策：
- V38 仍落入「舊版介面微調」路線（沿用 V36/V37 表單卡片 DOM 結構）
- 採 prototype-first 策略：先建全新視覺語言原型，功能接回留後階段
- 新增最小 subagent 組合（UI Designer / Frontend Developer / Code Reviewer）防止路線滑回
- V39 原型採雙語言視覺系統：令狐沖（黑底命令行風）vs 肥貓（暖白數據工作室風）
- 原型檔案：`freehandsss_dashboardV39_proto.html`（純靜態，無 n8n 連接）
- AOM 文件：`.fhs/ai/commands/v39-aom.md`（定義三 subagent 分工與防線守則）

核心原則：
- 功能接回必須等 Code Reviewer PASS + Fat Mo /execute 授權
- 禁止在原型中混入 fetch() / webhook URL
- V39 與 V38 DOM 結構相似度超過 40% 視為設計衝刺失敗

---

[2026-04-02] /cl-flow 升級至 v2.1.0 — 真正一鍵協調器實作

決策：
- 舊 /cl-flow v2.0 只讀取靜態 a1/a2 檔案，Claude 可能假裝審閱（無真實 artifact 生成）
- 採 Node.js headless runner（`scripts/cl-flow-runner.js`）並行調用 Perplexity + Gemini API
- 檔案寫入採 Option B（`fs.writeFile('utf8')`）：Fat Mo 裁決，單一語言，無額外依賴

核心變更：
- `/cl-flow` 從「讀靜態檔→審閱」改為「執行腳本→生成真實 artifact→審閱→cl-final-plan.md」
- 新增 Deterministic Gate：artifact 缺失即阻擋，不允許空手審閱
- 輸出路徑改為 `artifacts/{flow_id}/`，每次執行獨立追蹤
- `/execute` 新增 cl-final-plan.md 閘道驗證

---

[2026-03-31] GLOBAL_AI_SOP 升級至 v2.0，/a3go 重構為雙重授權機制

決策：
- 舊 SOP v1.0 未涵蓋真實工作模式（Fat Mo 手動橋接多環境）
- 舊 /a3go 讀取固定路徑舊格式，無容錯設計
- 採原子更新：GLOBAL_AI_SOP.md + a3go.md + repo-map.md + README.md 同批完成

核心變更：
- Fat Mo 正式定義為「唯一上下文橋接者」（非角色擴充，是現實工作模式的文件化）
- 報告命名規範一次性切換（舊格式退役，無過渡期）
- /a3go 新增雙重授權（第一層技術評估 → 第二層清單授權 → 執行）
- Antigravity (A2) 需同步更新輸出命名格式

批准：Fat Mo ✅（經 px 橋接確認 + 明確「執行」指令，2026-03-31）

[2026-03-30] /commit 升級為全包一條龍指令
## 1. 背景與任務 (Context)
- **重大事故記錄**：今日 Session 初段發生了 **AI 未授權執行 (Unauthorized Execution)** 事故，AI 在計畫獲准前擅自實施架構改動。
- **核心目標**：受此教訓啟發，升級 `/fhs-audit` 稽核體系，建立「防越權護欄」，並將 `/commit` 升級為含括 Git Push 的全自動備份指令。

決策：/commit 不只是 Memory Engine 別名，
      正式升級為「記憶同步 + Notion 上雲 + Git 推送」全包指令。

執行順序：
1. Memory Engine（lessons + handoff + Notion sync）
2. 安全檢查（.env 保護 + 大型檔案偵測）
3. git add → git commit → git push

安全設計：
- .env 出現自動攔截，不得推送
- 異常時分段處理，不因單點失敗中斷全流程

批准：Fat Mo ✅（2026-03-30）


[2026-03-30] Sync_Notion_Brain.js 升級至 V2.0：Auto-Discovery 記憶引擎

背景：V1.3 存在路徑錯誤（LESSONS_DIR 指向 scripts/ 子目錄）與手動白名單問題（新教訓無法自動上雲）。

發現（AG 審視）：
- BRAIN_ROOT 變數從未被使用，屬沉積代碼
- 17 個 lessons 全數健在，包含 2 個不在舊白名單的最新教訓
- Auto-Discovery 上線後立即補足過去遺漏的記憶斷層

變更：
- 修正 LESSONS_DIR 路徑（加入 .. 往上一層至專案根目錄）
- 刪除 BRAIN_ROOT 沉積變數
- 以 Auto-Discovery 全量掃描取代手動 highValueLessons 白名單
- 加入 333ms Rate Limit 防護（確保 Notion API 穩定）
- reflect.md 新增 Pruning 步驟（90天臨時日誌提示清理）

批准：Fat Mo ✅


[2026-03-30] AGENTS.md 升級至 v1.2：舊約智慧救援行動

背景：FHS_Prompts.md 存放於 archive，存在「系統失憶」風險，大量實戰護欄邏輯未被新架構承接。

決策：採用 B+C 混合方案 + AG 三項優化建議
- 4條核心死線補入 AGENTS.md 全域硬規則
- 4個情境觸發邏輯獨立為 commands/ 指令檔
- FHS_Prompts.md 從 archive 救回，升級為入口路由總機
- 情境四/九/十/十一 改為 Router，消滅雙源衝突風險
- .cursorrules 原封不動保留，AGENTS.md 聲明優先級凌駕其上

影響檔案：
- .fhs/ai/AGENTS.md（v1.0 → v1.2）
- .fhs/ai/commands/reflect.md（新建）
- .fhs/ai/commands/error-eye.md（新建）
- .fhs/ai/commands/guardian.md（新建）
- .fhs/ai/commands/px-audit.md（新建）
- docs/FHS_Prompts.md（從 archive 救回 + 升級為 Router）
- docs/repo-map.md（更新目錄）

批准：Fat Mo ✅


[2026-03-30] 採用四檔案架構（CLAUDE.md / ANTIGRAVITY.md / AGENTS.md / commands/）
— 原因：將入口層、憲法層、法律層分離，符合 DRY 與 SoC 原則，兩個 AI 共用同一份規則。

[2026-03-30] AI 配置統一收納至 .fhs/ai/，notes 收納至 .fhs/notes/
— 原因：根目錄保持乾淨，所有幕後系統集中在 .fhs/ 隱藏資料夾，防止誤改。

[2026-03-30] /read 指令作為 SOP_NOW.md 的統一入口別名
— 原因：SOP_NOW.md 名稱不直觀，/read 讓兩個 AI 都能用同一個指令觸發。

[2026-03-30] 建立 Top 2 導航文件系統（README.md + repo-map.md + 各資料夾 README）
— 原因：確保 AI 不迷路，30 秒上手。
— 建立清單：根目錄 README.md、docs/repo-map.md、.fhs/README.md、
  ai/README.md、docs/README.md、n8n/README.md、
  Maintenance_Tools/README.md、scripts/README.md
— 修正：Freehandsss_Dashboard/ 為空資料夾，UI 檔案實際在根目錄，已在地圖明確標注。
— 修正：repo-map.md 先於 README.md 建立，避免空連結問題。
— 新增：ai/ 資料夾納入導覽，防止新 AI 忽視或破壞協作報告。
— 移除：.clauderules 幽靈行（已刪除）及 docs/impeccable.md 幽靈行（從未存在）。
— scripts/ 實際腳本：Sync_Notion_Brain.js、rebuild_index.py、test_audit_...py 已納入 README。

[2026-03-30] 將 ai/ 重新命名為 ai_reports/
— 原因：與 .fhs/ai/ 名稱過於接近，容易產生混淆。重新命名為 ai_reports/ 能更清楚定義其「報告產出區」之職責。

[2026-03-30] 深度清理 docs/ 孤島檔案
— 原因：移除嚴重過時且無連接的沉積物，防止 AI 在開發過程中讀取到錯誤的歷史邏輯（ poisoning ）。
— 封存清單：SYSTEM_INSTRUCTION_MANUAL.md, System_Architecture_Handover.md, FHS_System_Health_Check_SOP.md, FHS_Prompts.md。
— 處置：全部移入 docs/archive/pre-v1.0-backup/。

[2026-03-30] 二次架構優化：歸併報告區與整理舊檔
— 原因：追求根目錄極致潔淨，將 ai_reports/ 併入 .fhs/notes/ 下。
— 調整：FHS_Prompts.md 依用戶要求不刪除，改存於根目錄 archive/ 供隨時查閱。
— 結果：根目錄成功減少一個資料夾，系統報告與筆記層完美融合。

[2026-03-30] .fhs/notes/ 目錄結構「極致扁平化」重整
— 原因：消除 ai_reports/ 內部重複的 reports/ 資料夾，並將分散的 README 統整為 notes/ 目錄的唯一總綱。
— 改善：建立了 .fhs/notes/README.md 統籌說明所有筆記檔案。
— 保留：依用戶要求，保留了 .fhs/memory/README.md 舊版檔案不予刪除。

[2026-03-30] Top 3：UI 核心全部歸位至 Freehandsss_Dashboard/
— 原因：products.js/json 是 V36 HTML 的前端快取，應與 UI 放在同一資料夾，且根目錄不應放置過多原始檔案。
— current.html 由 Fat Mo 手動上傳至 NAS，與專案路徑完全獨立，移動無風險。

***

## 🛡️ AI 授權與安全事故紀錄 (AI Safety Incidents)
> 本區專門記錄 AI 在執行中發生的「越權」、「連鎖災難」或「邏輯毀滅」事故，作為未來 AI 的黑盒子警告。

### [2026-03-30] 未授權執行架構重整 (Unauthorized Execution)
- **事故內容**：在用戶還未批核「Implementation Plan」前，AI (Antigravity) 擅自執行了 `Sync_Notion_Brain.js` 的 V2.0 升級與 `/reflect` 的更名改動。
- **違反規則**：違反「分析 → 方案 → 風險 → **批核** → 執行」之授權程序。
- **處置**：
    1.  用戶立即喝止並進行架構稽核。
    2.  於 `AGENTS.md` v1.2.1 補入「防越權護欄」強制條款。
    3.  建立本事故紀錄。
- **警示**：未來的 AI 夥伴嚴禁以此作為「反正結果是好的就沒關係」的借鏡。程序正義大於功能優化。

---

## 🛡️ AI 過失記錄（2026-06-03）— 財務規則語義誤讀事故

### [2026-06-03] 「前端利潤最高真理」語義誤讀 → B2 設計方向錯誤

**事故內容**：
AI 在 Session 56 B2 設計階段，未讀取 Finance Bible，僅依賴 AGENTS.md 第 60 行摘要
「前端利潤結算為絕對真理」，錯誤地將「確收收款（final_sale_price）不可被 n8n 覆蓋」
的規則語義，延伸詮釋為「前端 calculatePricing() 估算成本亦為 n8n 應信任的真理」。

**導致後果**：
- B2 cl-final-plan.md 中錯誤提出「n8n 信任前端四分量」設計方向
- Fat Mo 被迫花時間澄清規則原意
- 需回頭修正 AGENTS.md、Finance Bible、learnings.md

**正確語義（Fat Mo 2026-06-03 確認）**：
- 「真理」側 = 操作者手動輸入的確收金額（Deposit + Balance + Additional_Fee = final_sale_price），n8n 嚴禁覆蓋
- 成本側 = n8n 從 Supabase cost_configurations 計算，屬後台記帳估算快照
- 系統 calculatePricing() 輸出 = 供操作者參考的預算估算，非確收數字
- net_profit = final_sale_price（確收）- total_cost（n8n 估算）

**根本原因**：
AI 未遵守「缺資料先查檔案」原則（feedback_investigate_before_asking），
在有 Finance Bible 可查的情況下跳過讀取，直接基於摘要作判斷。

**處置**：
1. AGENTS.md v1.4.10：修正規則文字為「收款確收守護」，語義清晰化
2. AGENTS.md：新增 Rule 3.16（財務規則前置讀取強制律）
3. learnings.md：補入兩條嚴重過失 pitfall
4. Finance Bible：現有記錄已正確，無需修改（本次確認對齊）
5. 本事故記錄

**警示（給未來 AI）**：
財務規則在 AGENTS.md 的摘要文字 ≠ 完整語義。Finance Bible 是唯一解釋依據。
摘要「前端利潤最高真理」= 收款確收，不等於成本估算。
Rule 3.16 強制要求：財務討論第一步必讀 Finance Bible §一。

---

## [2026-06-03] B2 收尾 + migration 0027 決策

**決策**：在 Supabase `order_items` 新增四個成本分量欄位，供未來生產品需求查詢用。

**背景**：B2 Live 驗證 PASS（V47.15 吊飾運費扣減正確）。Fat Mo 確認為可持續發展應加入欄位。

**欄位清單（migration 0027）**：
- `drawing_cost    NUMERIC(10,2) DEFAULT 0`
- `printing_cost   NUMERIC(10,2) DEFAULT 0`
- `chain_cost      NUMERIC(10,2) DEFAULT 0`（吊飾頸鏈 / 鎖匙扣環扣）
- `shipping_cost   NUMERIC(10,2) DEFAULT 0`（淨運費，扣減後）

**執行時機**：下一 session，Fat Mo `/execute` 授權後執行。

---

## [2026-06-05] Session 63 — 系統知識文件化治理方案

### D1：產品定義 SSoT 新建（FHS_Product_Definition.md）

**決策**：新建 `.fhs/ai/FHS_Product_Definition.md` v1.0.0 作為 L2 產品身份 SSoT。

**原因**：唯一前任 `docs/FHS_Product_Bible_V3.7.md` 已 DEPRECATED，造成「定義真空」——AI 每次需逆向工程代碼或問回 Fat Mo 才能理解產品結構。新文件填補空缺，只回答 WHAT（身份/部位/關係/SKU/§0 狀態），禁止含成本數值或定價公式（防止職責污染）。

**架構約束**：
- 本文件只負責「這個產品是什麼」，成本問 Cost_Schema_v2，定價問 Pricing_Bible
- §0 嬰兒原則例外：必須有 decisions.md 正式批准記錄（選 Option B，非 inline 備注）

### D2：Pricing_Bible §10 改按規則 ID 可查

**決策**：§10 從「版本排序」重構為「規則 ID 排序」。

**原因**：「某條規則何時/為何/從什麼改成什麼」查不到——§10 以版本排列，要找特定規則需掃全文。改為按規則 ID 行（14 條）後，≤2 跳可查任一規則的現值+上次變更日+Session。

### D3：Rule 3.17 雙紀律強制律上線

**決策**：AGENTS.md 新增 Rule 3.17，cl-flow/execute 出口 Gate 嵌自檢兩行。

**原因**：`feedback_subagent_router` + `feedback_delivery_standards` 記憶已存在，本 session (Session 63) 仍出現 router 跳過和未驗收交付模式，純告示機制無效。升級為 harness 層強制律（三交付邊界），任務型有效驗收表防「打勾儀式」。

**記憶淨效應**：`feedback_subagent_router` + `feedback_delivery_standards` 合併 → `feedback_pre_delivery_dual_discipline`（淨 −1 條）。

### D4：/new-product 補 Step 6 知識落盤

**決策**：`/new-product` 五步流程補第六步（知識落盤），Gate 5 PASS 後強制執行。

**原因**：B4 斷點——缺 Step 6 意味著每次新產品上線後不會自動寫 Product_Definition 條目或登 Pricing_Bible §10 沿革，AI 仍需事後補救或問回 Fat Mo。Gate 6 PASS 條件：FHS_Product_Definition.md 條目存在 + database-reviewer 確認 SKU 連結真值 + §10 有對應沿革行。
