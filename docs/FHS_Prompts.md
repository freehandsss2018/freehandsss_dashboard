---
name: FHS Business Scenarios Library
version: v1.8
compatible_with: AGENTS.md v1.5.0
last_updated: 2026-07-04
last_audited_session: S134
description: Business situation detection and command routing for AI execution
---

# FHS 業務情境劇本庫 (Scenarios Library) - v1.8
>
> 最後更新：2026-07-04（v1.8 S134 同步：情境二十四 `/ag-flow` 標註 [DEPRECATED]，改指 `/cl-flow`；AGENTS v1.5.0，Desktop App 平台收斂 Phase 4）
> 使命：確保 AI 在任何業務場景下都能「帶腦執行」，而非盲目修改。
> 定位：業務入口路由總機——負責偵測情境並調用對應 command 執行。
>
> **⚠️ 同步觸發**：AGENTS Rule 新增 / `.fhs/ai/commands/` 增刪 / `.fhs/ai/` L2 文件增刪 / 核心業務語義修正 → 必須同步更新本文件（觸發機制見 AGENTS.md 文件同步強制律 + execute.md [F] 項）。

---

## 【情境一：訂單建立 (POS Mode)】

- 觸發：用戶提及「新單」「下單」「報價」「POS」
此情境旨在為 Mobile phone 介面創造流暢的下單體驗。
- **動作準則**：鎖定 5D SKU 查找，自動從資料庫提取價格。
- **回覆要求**：生成的訊息必須精準分段、具備 Emoji 引導、並剔除冗餘數據。

## 【情境二：修改舊單 (Edit/Upsert Mode)】

- 觸發：用戶提及「改單」「修改」「舊單」「Upsert」
處理 `handoff.md` 中的 Raw_Form_State。
- **核心邏輯**：100% 還原表單選項，修改後執行 Upsert 同步。

## 【情境三：全域核對中心 (Global Review)】

- 觸發：用戶提及「核對」「全域」「Global Review」
處理大數據網格的渲染與搜尋。
- **核心邏輯**：優先處理 `vertical-align: top;` 與 `<td rowspan>` 對齊。

## 【情境四：錯誤監控與診斷 (Error Eye)】

觸發：用戶提及「錯誤」「Error Log」「異常」「診斷」「掛了」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/error-eye.md。

## 【情境五：財務規則確認 (Financial Rules)】

- 觸發：用戶提及「財務規則」「n8n 利潤規則」「auditPassed 格式」「前端利潤守護」「KPI」「混合單」「3-layer」「get_financial_kpis」「get_financial_charts」「category 收入」「RPC 財務」
> ⚠️ 邊界說明：此情境處理**靜態財務規則確認**（n8n 節點格式、利潤守護規則）。若需 Live Airtable 數據查詢或三端比對，請走**情境二十一（finance-auditor）**。
處理 `System_Total_Cost` 與利潤結算**規則**。
- **收款確收守護**：操作者手動輸入的 `final_sale_price`（Deposit + Balance + Additional_Fee）為絕對真理，n8n 嚴禁重算這三個確收欄位。成本側（`total_cost`）由 n8n 從 Supabase 計算，屬估算快照。詳見 AGENTS.md 財務真理守護。
- **n8n 代碼輸出規範**：強制執行 `[{json: {auditPassed: true...}}]` 格式，嚴禁回傳裸物件。
- **SKU 對齊**：執行審計前，必須調用 `Parse Items` 正規化地圖。
- **RPC KPI / 混合單 3-layer**：涉及 `get_financial_kpis` / `get_financial_charts` / category 模式收入分攤時，必須先讀 `.fhs/notes/FHS_System_Logic_Overview.md §十`（RPC 財務計算層 SSoT，Session 99 建立）。

## 【情境六：產品定價與商業邏輯更新 (Bible Sync)】

- 觸發（三叉路由，依問題性質選一）：
  - 「定價」「售價」「多少錢」「報價」「Bible」→ **定價**：讀 `.fhs/ai/FHS_Pricing_Bible.md`（L2 現行定價 HEAD）
  - 「成本」「cost」「這值多少成本」→ **成本**：讀 `.fhs/ai/FHS_Product_Cost_Schema_v2.md`
  - 「產品定義」「這是什麼產品」「§0」「WHAT」「這個產品的結構」→ **產品身份**：讀 `.fhs/ai/FHS_Product_Definition.md`（L2 產品身份 SSoT）
- **查詢路由**：先讀 `.fhs/ai/skills/finance-gatekeeper/SKILL.md` 確認讀哪份文件。
- **注意**：`FHS_Product_Bible_V3.7.md` 已退役，定義層已遷至 `FHS_Product_Definition.md`，定價已遷至 `FHS_Pricing_Bible.md`，勿引用舊檔。

## 【情境七：Stitch UI 翻新協議】

- 觸發：用戶提及「UI」「介面」「翻新」「Mobile phone 介面」

Mobile phone 介面專屬設計準則（強制執行）：

- 觸控區最小 44px（iPad / iPhone 操作防呆）
- 所有非同步操作必須包裹 showLoader() / hideLoader()
- 關鍵操作（刪單、清空、提交）必須有二次確認 Modal
- 錯誤訊息必須顯示強烈紅色警示，不能只寫 console.log

禁忌（不得觸碰）：

- HTML 結構中的 data-id 與 id 屬性
- captureFormState() 序列化邏輯
- 任何 onclick / onchange 事件綁定

## 【情境八：內部巡邏與一致性檢查 (Internal Patrol)】

- 觸發：用戶提及「巡邏」「一致性」「冗餘」「清理」「fhs-audit」「kgov」「知識治理」「Product_Definition」「doc-gov」
- **動作**：執行內部巡邏，檢查是否存在孤立檔案、過時版本或路由斷層。
- **kgov 觸發**：識別為 FHS 知識治理框架（Session 63）再優化任務 → 稽核 `.fhs/ai/FHS_Product_Definition.md` + `FHS_Pricing_Bible.md §10` + `AGENTS Rule 3.17` + `/new-product Step 6`。
- **執行邏輯**：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/fhs-audit.md。

## 【情境九：記憶引擎 3.0 (Memory Engine)】

觸發：用戶輸入「checkpoint」「存檔」或明確宣告結束 session
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/commit.md。
> 備註：舊指令別名 `/reflect` 已退役，統一使用 `/commit`。
> ⚠️ 「每 10 則對話自動存檔」規則已在 AGENTS.md v1.4.1 廢除，AI 不得在無明確觸發的情況下單獨寫入 handoff.md。

## 【情境十：全端守護與防重災稽核 (The Guardian)】

觸發：用戶提及「大改」「重構」「多個節點」「翻新」「重寫」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/guardian.md。

## 【情境十一：外部研究與系統審查 (Perplexity 外部研究)】

觸發：輸入 /px audit 或 /px 審查，或需要第三方外部視角
執行邏輯：Perplexity 外部研究已內建至 `/cl-flow` A1 階段，執行 `/cl-flow [任務]` 即自動觸發。若需單獨外部研究，使用 `/cl-flow` 並告知「只需 PX 報告」。指令 `/px-audit` 已退役（2026-05-30）。

## 【情境十二：全自動規劃流 (The Planning Triad)】

觸發：用戶提及「規劃」「開發新功能」「大規模修改」「流程優化」
執行邏輯：全系統進入 v2.1.0 核心開發模式。

1. 執行 `/cl-flow [任務]`（A1 Perplexity 外部研究 + A2 本地計畫 + A3 Verdict，三段全自動並行）
2. 等待 Fat Mo 審閱 cl-final-plan.md，確認後輸入 `/execute`
3. `/execute` 完成後 Step 6 強制雙紀律自檢（Rule 3.17）再收尾
- **新產品上線**：走 `/new-product`（6步 atomic 流程，含 Step 6 kgov 知識落盤）
指令說明詳見：.fhs/ai/commands/cl-flow.md。

---

## 【情境十三：代碼根因調查 (Debug / Root Cause)】

觸發：用戶提及「除錯」「找 bug」「根因」「測試失敗」「test failure」「root cause」
> 與情境四的區別：情境四處理 n8n/系統層錯誤監控；此情境處理代碼邏輯層的 root cause 調查。
執行邏輯：**AI 自動執行**（Rule 3.15）。遇任何 bug/錯誤/測試失敗，build-error-resolver subagent 強制走 4 階段根因調查法（`.fhs/ai/skills/vendor/superpowers/systematic-debugging.md`），在確認根因前禁止提出修復方案。若系統層錯誤（n8n log/Dashboard JS），優先調用 `build-error-resolver` subagent。指令 `/debug-guide` 已退役（2026-05-30），方法論已內建。

## 【情境十四：測試驅動開發 (TDD Guide)】

觸發：用戶提及「TDD」「測試驅動」「先寫測試」「test first」「寫測試再實作」
執行邏輯：調用 `tdd-guide` **subagent**（`.fhs/ai/subagents/freehandsss/tdd-guide.md`）執行 RED-GREEN-REFACTOR 循環。配套技能：`.fhs/ai/skills/vendor/superpowers/test-driven-development.md`。指令 `/tdd-guide` 已退役（2026-05-30），以同名 subagent 取代。

## 【情境十五：五個為什麼根因分析 (Five Whys)】

觸發：用戶提及「為什麼」「五個為什麼」「five whys」「根因分析」「系統性原因」
執行邏輯：**AI 自動執行**（Rule 3.15）。Five-Whys 追問法已內建至 `build-error-resolver` subagent 的根因調查協議，遇到「不知道為什麼」或「已試過 2+ 修復仍失敗」時自動觸發。指令 `/five` 已退役（2026-05-30），方法論已內建至 subagent。

## 【情境十六：財務成本完整性稽核 (Cost Audit)】

觸發：用戶提及「成本稽核」「cost audit」「Total_Cost 對帳」「rollup 比對」「成本完整性」
> 與情境五的區別：情境五處理一般財務數據審計；此情境專門執行 Total_Cost vs rollup 的結構性比對。
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/fhs-cost-audit.md。

## 【情境十七：輕量快速規劃 (Fast Planning)】

觸發：用戶提及「快速規劃」「輕量版規劃」「功能實作」「UI 修改」「bug fix 規劃」「跳過 PX」
> 與情境十二的區別：情境十二跑完整 PX+AG+CL 三段流程；此情境跳過 PX，只跑 AG → 精簡 Verdict，適合功能實作、UI 修改、Bug 修復。
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/cl-flow-fast.md（或直接執行 `/cl-flow-fast [任務]`）。精煉已內建為 Step 0，不可跳過。

## 【情境十八：資料庫查詢 (DB Query)】

觸發：用戶提及「查詢資料庫」「Supabase 查詢」「Postgres」「SQL 查詢」「read-only 查詢」
執行邏輯：此情境已獨立為專屬指令，請立即載入並嚴格執行 .fhs/ai/commands/db-query.md。
配套技能：`.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md`、`.fhs/ai/skills/vendor/awesome-cc/supabase-query.md`

## 【情境十九：流程圖與架構圖 (Mermaid)】

觸發：用戶提及「流程圖」「架構圖」「diagram」「mermaid」「畫圖」「視覺化流程」
執行邏輯：Claude 原生執行（無需指令）。直接告知需要什麼圖（ER 圖 / 流程圖 / 序列圖）及資料來源（schema / n8n workflow / 系統描述），Claude 自動生成 Mermaid 語法。範本參見 `.fhs/ai/skills/vendor/awesome-cc/`。指令 `/mermaid` 已退役（2026-05-30）。

## 【情境二十：代碼分析 (Code Analysis)】

觸發：用戶提及「代碼分析」「code analysis」「程式碼品質」「重構分析」「技術債」「code review」
執行邏輯：**AI 自動執行**。`code-reviewer` subagent 內建 5 維度分析框架（結構 / 邏輯正確性 / 效能 / 安全 / 可維護性），使用 `mcp__sequential-thinking` 工具逐維度分析，稽核任何代碼時自動覆蓋全部維度。指令 `/code-analysis` 已退役（2026-05-30），方法論已內建至 subagent。

## 【情境二十一：三端財務稽核 (Finance Auditor)】

觸發：用戶提及「對帳」「Live 驗證」「Airtable 利潤驗證」「訂單成本比對」「三端財務」「財務稽核」「Total_Cost 不對」「利潤差異」「成本差了」
> 與情境五的區別：情境五處理靜態財務規則確認（n8n 格式、利潤守護規則）；此情境**查詢 Live Airtable 數據**，執行三端（Airtable↔n8n↔Dashboard）互動式驗證。
> 與情境十六的區別：情境十六跑全域批次 Python 腳本掃描；此情境針對**指定訂單的互動式深入稽核**。
> ⚠️ 若差異來自 `final_sale_price` vs 系統建議價（`__System_Final_Sale_Price`），請先走**情境二十二**查 `admin_notes`，確認非授權優惠後才在此情境執行三端比對。
執行邏輯：此情境已獨立為 Subagent，請立即調用 `finance-auditor` Subagent 執行三端財務稽核。
配套 Skills：`.fhs/ai/skills/finance-gatekeeper/SKILL.md`（查詢路由 + 5 條死線）、`.fhs/ai/skills/vendor/awesome-cc/read-only-postgres.md`（Supabase 就緒）

## 【情境二十二：定價差異與授權優惠調查 (Pricing Concession Audit)】

觸發：用戶提及「售價不對」「系統價格不一樣」「final_sale_price 差異」「授權優惠」「定價優惠」「為何成交價不同」「建議售價」「系統報價不符」
> 與情境二十一的區別：情境二十一核對三端財務數據；此情境專門處理 `final_sale_price` vs `__System_Final_Sale_Price` 的差異根因調查。
> 與情境六的區別：情境六處理定價規則更新（Bible Sync）；此情境處理**已存在訂單**的成交價與系統建議價差異的事後調查。
執行邏輯：
1. **先查 `admin_notes`** — 若含優惠說明，差異為授權決定，非錯誤，停止調查並告知用戶
2. 若 `admin_notes` 為空，從 `raw_form_state.__System_Final_Sale_Price`（系統建議）
   與 `deposit + balance + additional_fee`（實際收款）對比，計算差額來源
3. 定價計算根源：`calculatePricing()` → `processTierPricing()`
   位置：`Freehandsss_Dashboard/Freehandsss_dashboard_current.html` lines 4276–4339
4. 跨部位（cross-part）觸發條件：P模式 metalItem[index>0] 且 `!standaloneSurchargePaid` → +$300 附加費
   同部位多件：按 Product Bible V3.7 §2 tier 表查累計定價（不重置）
5. 若確認為未記錄的授權優惠：補寫 `admin_notes`，必要時開 Migration 更新 Supabase
參考：`.fhs/memory/lessons/2026-05-16_order_0600802_pricing_concession.md`（訂單 0600802 完整案例）

---

## 【情境二十三：Prompt 結構化重寫 (/rp) v2.3】

- 觸發：用戶輸入 `/rp [問題]`、`/rp cl-flow [task]`、`/rp cl-flow-fast [task]`、「幫我重寫這個問題」、「結構化我的提問」
- 執行邏輯：載入並遵循 `.fhs/ai/commands/rp.md`（v2.3）
- 平台：CL / AG / PL 三端通用（PL 使用 Markdown 格式，非 XML）

三變體路由：

| 指令 | 用途 | 輸出 |
|------|------|------|
| `/rp [task]` | 標準精煉：8維度掃描 + structural_warning | XML 供審閱，停 |
| `/rp cl-flow [task]` | Pipe 乾式組裝：精煉 + cl-flow 簡報 | XML + 簡報，停（手動跑 cl-flow）|
| `/rp cl-flow-fast [task]` | 輕量 Pipe：精煉輕掃描 + fast 簡報 | XML 精簡，停 |

- **structural_warning**：取代自我批評，只在真實結構問題時出現
- **反奉承守則**：內建於 rp.md，用戶無需每次輸入「專業」「不奉承」
- **資源目錄**：subagent_skill 維度從 FHS 資源目錄對號入座，不靠 AI 猜

---

## 【情境二十四：/ag-flow AG 裁決管道 (v1.0.0)】⚠️ [DEPRECATED 2026-07-04]

> **改用 `/cl-flow`**——Desktop App 內 Claude（Pro 訂閱，免費）裁決已覆蓋同等能力，直接落 repo 並銜接 `/execute`。
> 若真的想要 AG（Gemini）作最終裁決，請直接開 Antigravity 原生操作，不透過此橋接指令。詳見 `.fhs/ai/commands/ag-flow.md` 頂部棄用說明。

- 觸發：用戶輸入 `/ag-flow [task]`
- 執行邏輯：載入並遵循 `.fhs/ai/commands/ag-flow.md`（v1.0.0）
- 平台：CL / AG

管道路由：

| 指令 | 精煉 | A1 PX | A2 ag-plan | A3 Claude | 裁決者 |
|------|:---:|:-----:|:----------:|:---------:|--------|
| `/ag-flow` | ✅ 內建 | ✅ | ✅ 裁決 | ❌ | AG |

- **Gate 1**：強制停，Fat Mo 審閱精煉 XML 後回 Y 才繼續
- **plan_critique**：ag-plan 產出後輸出真實批評（有內容才批評）
- **/execute 永遠手動**：AI 不自動觸發，遵 execute.md 硬規則
- **精煉已內建**：不需手動先跑 /rp，Step 0 自動執行

---

## 【情境二十五：部署 Dashboard 至 NAS Web（/upload-web）(v1.0.0)】

- 觸發詞：「上傳 V42 / 上傳到 web / 部署到 NAS / 上傳 dashboard / upload web / 推上 web folder / 放到 web station」
- 執行邏輯：載入並遵循 `.fhs/ai/commands/upload-web.md`（或直接 `/upload-web [目標]`）
- 平台：CL + AG 雙端通用（需本機 shell + curl + WebDAV；2026-06-08 Fat Mo 授權開放 AG）
- 通道：WebDAV over HTTPS（`yanhei.synology.me:5006` → `/web`）；憑證存 gitignored `.env`
- 護欄：`current` 生產版需二次確認 + `-Force`；密碼永不回顯；驗證三關（HTTP 200 + 大小 + SHA256）

---

## 更新協議

當以下情況發生時，必須更新本文件對應情境：

- 業務規則改變（價格、SKU 邏輯、加購規則）
- 新增業務流程（新情境）
- 系統發生新災難並修復後（補充防護邏輯）
- AGENTS.md 全域硬規則新增時（同步對齊）
- commands/ 下任何指令檔更新時（Router 指向不得過時）


---
[[FHS_Knowledge_Map]]
