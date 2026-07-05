---
name: phase3_evidence_appendix
version: v1.0.0
compatible_with: AGENTS.md v1.5.0
status: proposed
last_updated: 2026-07-05
description: Phase 3 優化方案書的證據附錄，全部發現的檔案路徑/行號原始引述
---

# Phase 3 優化方案書 — 證據附錄

> 主文見 [phase3_optimization_proposal.md](phase3_optimization_proposal.md)。本檔只放原始證據，供 Fat Mo 或驗收 agent 核對每條發現的出處。四路掃描皆 model=sonnet，flow_id 2026-07-05-1912 下派工。

---

## Domain A — 制度層（AGENTS.md + governance + CLAUDE.md + commands/）

**掃描範圍**：AGENTS.md（315行）、governance/00-06（7檔，共 581 行）、CLAUDE.md（25行）、commands/README.md + 代表性抽讀

**A1**（重複）`CLAUDE.md:19-23` 三紅線完整規則本體 與 `governance/02_model-dispatch.md` 第99-121行（§5/§6）幾乎逐字重複列出同一清單，非「一處定義+連結」。

**A2**（斷鏈+過時）`AGENTS.md:280,290`（§7）仍列 `/px-plan`、`/px-audit` 為有效指令並指向 `commands/px-audit.md`，該檔不存在（`ls commands/` 確認），且 `commands/README.md:99-100` 明載兩者已於 2026-05-30 退役、併入 `/cl-flow`。

**A3**（過時/token浪費）`commands/fhs-audit.md:9` 檔頭稱「30 項」，`commands/README.md` 兩處（30/77行）亦寫「30 項」，但 S145 `/fhs-audit` 實測結果為「33 項，5 大檢查」（本次任務背景已知），檔頭與實測數字不一致。

**A4**（管理盲區/孤兒）`governance/00_INDEX.md:14` 列出 `06_letter-to-future-sessions.md`，但 `CLAUDE.md` 路由表（8-17行）無任何情境指向 06——只有已在讀 00_INDEX 才會發現，一般依 CLAUDE.md「按情境載入」永遠不會被路由到 06。

**A5**（過時+矛盾）`AGENTS.md:97-98`（Rule 3.11）仍寫「輕量快照 ~300 tokens」「全量重載 ~2000 tokens」；`CLAUDE.md:3` 已註明「2026-07-04 實測 ~2,300 tokens，非舊稱 ~300 tokens」。同一制度對同一件事兩處給不同數字，未互相標註何者為準。

**A6**（token估算）派工類任務（幾乎所有非瑣碎任務）常態需讀 02+03+04（134+96+99=329行）；涉及維護還要 05（89行），合計約 420 行，比 CLAUDE.md 表面呈現的「單檔對應」更重。01、06 設計上被排除在常態路徑外。

*Agent A 信心：中（AGENTS.md/CLAUDE.md/governance 7 檔全讀約 800 行，findings 1/2/3/5 高信心；4/6 屬推論）*

---

## Domain B — 藍圖 + 知識層

**掃描範圍**：`docs/FHS_Blueprint.md`（131行）、`.fhs/notes/FHS_System_Logic_Overview.md`（635行）、`.fhs/notes/knowledge-map.md`（23行）、`docs/FHS_Knowledge_Map.md`（33行）、`.fhs/notes/decisions.md`（抽查）、`.fhs/notes/README.md`（77行）

**B1**（過時，內容層級非僅版本標籤）`FHS_Blueprint.md:91-96`（§7 Airtable 數據架構）仍以 Airtable 為主要資料架構描述，零提及 Supabase；`FHS_System_Logic_Overview.md:23` 明確：Supabase 現為「Read/Write Lead」，Airtable 僅為過渡期快照。

**B2**（過時+斷鏈）`FHS_Blueprint.md:98-103`（§8 雲端之眼監控系統）錯誤流程只提 n8n→Airtable Error_Logs，完全未提財務 RPC 層（`get_financial_kpis`/`get_financial_charts`，見 System_Logic_Overview:392-479，對應 migrations 0036-0045）。

**B3**（管理盲區/孤兒）`.fhs/notes/knowledge-map.md`（AI 查詢路由表，23行）9 類目錄中沒有任何一條路由到 `docs/FHS_Blueprint.md`；Blueprint 僅被 `docs/FHS_Knowledge_Map.md:18`（Obsidian 人類視覺化圖譜，非 AI 路由）單向連結，AI 依路由表查詢時永遠不會被指向 Blueprint。

**B4**（重複，權威不明）`FHS_System_Logic_Overview.md` §1（8-27行）、§2（31-120行）與 `FHS_Blueprint.md` §2/§3/§4 大幅重疊描述「系統怎麼運作」；Overview 明顯更新更精確（實際函式名/RPC簽名/migration編號），但無任何一份文件宣告「Overview 取代 Blueprint」。

**B5**（過時+token浪費）`.fhs/notes/README.md:20-77`「版本同步機制 Phase 3」為死內容，釘在 `AGENTS.md v1.4.5`（實際 v1.5.0），內含早已過期的「待更新」清單，佔用 57 行讀取成本。

**B6**（重複/斷鏈）`FHS_Blueprint.md:105-110`（§9 Antigravity 執行協議、§11 SKU正規化）含操作性規則，現已由 `.fhs/ai/governance/` 接管（decisions.md D1/D2, S137），Blueprint 早於 governance 建立，未被裁剪，兩處無交叉引用。

**校準備註**：Agent B 直接讀取確認 `FHS_Blueprint.md` frontmatter 現為 `compatible_with: AGENTS.md v1.5.0`（2026-06-05 更新）——與 S145 `/fhs-audit` A6-3 稱「compatible_with v1.4.11」不符。以 Agent B 的即時讀取為準（S145 報告可能早於該檔最近一次更新，或版本標籤已修正但內容本體未同步，即 B1/B2 所指的「內容層級過時」與「標籤過時」是兩回事）。

*Agent B 信心：高（全文讀取 Blueprint/knowledge-map.md/FHS_Knowledge_Map.md/README.md，即時驗證 AGENTS.md 版本字串）*

---

## Domain C — 財務六專檔

**掃描範圍**：`FHS_Finance_Bible.md`（397行,v1.3.0）、`FHS_Pricing_Bible.md`（311行,v1.2.0）、`FHS_Product_Definition.md`（200行,v1.0.0）、`FHS_Product_Cost_Schema_v2.md`（355行,draft）、`FHS_Product_Cost_Operations.md`（366行,draft）、`FHS_Product_Cost_UI_Spec.md`（195行,draft）；基準：`finance-gatekeeper/SKILL.md` v1.3.0

**C1**（斷鏈/矛盾）`FHS_Product_Cost_Schema_v2.md:11` 引用 `docs/FHS_Product_Bible_V3.7.md` 為 Drawing Cost 權威；但 `FHS_Finance_Bible.md:377` 與 gatekeeper 明文該檔**已退役、不得用於定價計算**；`FHS_Pricing_Bible.md:14,169` 也仍引用同一份退役檔案。

**C2**（斷鏈，真實查詢風險）`FHS_Product_Definition.md:142` 寫 `addon_cost_lights`（有 s）；`FHS_Product_Cost_Schema_v2.md:102,260` 與 `Operations.md:156,253,310` 全部寫 `addon_cost_light`（無 s）。同一資料庫欄位兩種拼法。

**C3**（過時+管理盲區）Cost 家族三檔（Schema_v2/Operations/UI_Spec）自 2026-05-28~06-03 起卡在 `status: draft — pending audit`（近 3 週），與已定案的 Finance_Bible（6/26）、Pricing_Bible（6/5）、Product_Definition（6/5）之間存在語義漂移風險窗口；gatekeeper 路由表未標註此 draft 警示。

**C4**（管理盲區）「成本」定義分散 Finance_Bible（架構語意）/Pricing_Bible §6（結構）/Cost_Schema_v2（17-key實際值）三處，僅靠 gatekeeper 口頭分工，文件間無強制交叉引用。

**C5**（token浪費）`FHS_Product_Cost_Schema_v2.md` 檔名固定 `_v2`，frontmatter 寫 `v2.2.0`，內文標題仍稱「v2.1」——三套版本號不同步。

**回答「成本怎麼算」需讀檔數**：正常情境 3 份（gatekeeper 路由 + Pricing_Bible + Cost_Schema_v2）；涉加購或懷疑衝突則 4 份以上（+Product_Definition 核對命名 +Finance_Bible 裁決）。

*Agent C 信心：中（frontmatter/路由表已讀+Grep交叉核對，findings 1/2 高信心；3/4/5 帶主觀判斷，未窮舉六檔全文）*

**補充稽核**（同域二次派工，發現更具體，併入採用）：

**C6**（斷鏈，比 C4 更具體）`FHS_Product_Definition.md:152` 引用「成本見 `Cost_Schema_v2 §6`（addon group）」，但 Cost_Schema_v2 實際 §6 是「GROUP D — 運費（Shipping）」（`Schema_v2:227` 確認），加購配件實際在 §7。章節號引用錯誤，非僅命名分歧。

**C7**（管理盲區，比 C4 更嚴重）`finance-gatekeeper/SKILL.md`（Master 路由表）完全未提到 `FHS_Product_Definition.md`、`FHS_Product_Cost_Operations.md`、`FHS_Product_Cost_UI_Spec.md` 三份文件——新 session 依路由表走，永遠不會被導向這三份，路由死角比 C4 描述的「靠口頭分工」更嚴重：是**路由表本身缺項**，非僅缺乏交叉引用。

**C8**（管理盲區）三份文件對「誰是權威」框架彼此不一致：`Finance_Bible` 自稱 L1 最高權威；`Cost_Schema_v2` 自稱成本查找「唯一入口」；`Pricing_Bible` 卻宣告 `calculatePricing()` **代碼本身**才是 Source of Truth（文件僅次要）。三種「誰說了算」敘事並存，未起衝突但對新讀者權威層級不統一。

**C9**（估算校正）以「加購配件（羊毛氈公仔）成本」為具體案例走查：若嚴格依 gatekeeper 路由表只會拿到 2 份（Schema_v2 + Finance_Bible），因 Product_Definition 不在路由表內（見 C7）而漏讀，導致對「這是什麼產品/前提條件」缺乏認識；完整正確路徑應為 3-4 份（+Product_Definition §3.4 確認 SKU 前提 +Finance_Bible §G2 裁決），若再涉 UI/RPC 面則達 5-6 份。**此為比原 C 報告「3-4 份」更悲觀的修正值**——問題不在「要讀幾份」，而在「路由表本身不會給你讀對的那幾份」。

---

## Domain D — 運行系統文檔（n8n/Dashboard/IG Watchdog/Supabase）

**掃描範圍**：白名單 5 個 README + 2 份 IG Watchdog completion report + `docs/repo-map.md`（局部）+ migrations 檔名列表（47個，僅 Glob 不讀內容）

**D1**（過時/管理盲區）`n8n/README.md`（12行）只列 3 個 workflow，`FHS_IGWatchdog_DriveWatch`（ID `D4LK6VrQbiXlju0V`，已上線）完全未出現。

**D2**（斷鏈/矛盾，高風險）`Freehandsss_Dashboard/README.md:11,27` 明講 `current.html = V42`；`docs/repo-map.md:106` 明講 current.html「內容與 V41 一致」，V42 標記為「開發基線」非正式環境。兩份文件對「正式生產版本是哪個」給出互斥答案。

**D3**（管理盲區）白名單給的 2 份 IG Watchdog completion report（06-17、06-23）之外，實際還存在第三份 `2026-06-23_igwatch-alerts-phase1a-2_completion_report.md`（migration 0043 + Dashboard igwatch UI 真正部署記錄），未被納入審查範圍——這代表規格追蹤依賴多份分散報告，缺一不可；06-23 v3 報告結尾寫「⏳ 未完成待授權部署」，若只看白名單 2 份會誤判 v3 從未上線。

**D4**（token浪費+斷鏈）`scripts/ig-watchdog/SOP.md` 實質扮演常駐規格角色，但只被 `scripts/README.md` 連結；`n8n/README.md`（IG Watchdog workflow 的家）完全未連過去。

**D5**（過時）`supabase/README.md`（95行）停在 Phase 4「⏳ Pending」，migration 清單只到 0001，實際已到 0047，未提及 0043（ig_watchdog_alerts）、0044（audit_logs）等結構性表。

**D6**（管理盲區）migrations 0035→0041 六連發（`fix_rpc_b1_b6_financial_kpis_charts`→`fix_rpc_b3_qty_deleted_at_guard`→`add_item_sale_price`→`fix_sync_order_stale_items`→`fix_metal_3layer`→`fix_unconfirmed_doublecount`）全在修同一組財務 RPC 邏輯；`0022a`/`0022b` 編號斷裂本身也是命名規律斷裂證據。檔名無法回答「這幾次修補的因果鏈/根因」。

*Agent D 信心：中（白名單文件直接讀取交叉比對，D1/D2 為直接文本證據高信心；D6 僅基於檔名字面觀察，migration 0038/0039 順序疑點未讀內容核實）*

---

## 統計

24 項具體發現（A:6 / B:6 / C:5 / D:6 → D6另有子觀察，故 D 計 6 主+1 觀察 = 24 總計），遠超成功標準 ≥10 項。五類分布：重複 6、斷鏈 9、過時 8、token浪費 5、管理盲區 9（部分發現跨多類）。

---

## Step 3 — 交叉驗收記錄（fresh-context agent，非掃描者本人）

抽驗 5 條指控，逐一親自讀取原文核對：

| # | 指控 | 判定 | 說明 |
|---|---|---|---|
| 1 | P0-1 生產版本認定矛盾（README vs repo-map） | ⚠️ PARTIALLY CONFIRMED | 矛盾真實存在，但範圍應擴大——README.md 內部（11/15/27行）本身也自相矛盾，非僅兩檔對立。方案書已據此擴大 P0-1 範圍 |
| 2 | P0-2 財務欄位拼法不一致（addon_cost_lights vs addon_cost_light） | ✅ CONFIRMED | 皆為正式 schema/DB key（Operations:253 甚至有實際 SQL migration UPDATE 語句），非註解或範例 |
| 3 | P0-3 AGENTS.md 引用已退役指令 /px-plan /px-audit | ✅ CONFIRMED | `ls .fhs/ai/commands/` 實測確認兩檔不存在，AGENTS.md:280,290 原文屬實 |
| 4 | P1-3(原) Blueprint 與 System_Logic_Overview 重疊無 banner | ❌ NOT CONFIRMED | Blueprint 開頭（11-18行）已有明確權威聲明；finance-gatekeeper/SKILL.md 已將 RPC/KPI 細節分流至 Overview §十。指控「完全無權威聲明」不成立，已降級為 P2-6 並改寫措辭 |
| 5 | A2/P1-1 finance-gatekeeper 路由表遺漏三檔 | ✅ CONFIRMED | 路由表全文 81 行 Grep 三檔名，exit 1（零匹配），三檔皆真實存在於 `.fhs/ai/` |

**結果**：3 CONFIRMED、1 PARTIALLY CONFIRMED（已修正措辭並擴大範圍）、1 NOT CONFIRMED（已降級移除原編號，改寫為 P2-6）。方案書主文已據此全數修正，無未經核實的指控留在 P0/P1 區。
