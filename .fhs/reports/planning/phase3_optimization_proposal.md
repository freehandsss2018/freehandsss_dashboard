---
name: phase3_optimization_proposal
version: v1.0.0
compatible_with: AGENTS.md v1.5.0
status: proposed
last_updated: 2026-07-05
description: FHS Phase 3 全域治理優化方案書 — 八域跨檔結構與 token 經濟審視，P0/P1/P2 整改建議
---

# Phase 3 優化方案書 — 全域治理結構審視

> 來源：`/cl-flow` flow_id `2026-07-05-1912`，四路 sonnet subagent 域掃描（制度層/藍圖知識層/財務六專檔/運行系統文檔），共 24+ 項具體發現。
> 只出方案，未修改任何既有檔案。證據原文見 [phase3_evidence_appendix.md](phase3_evidence_appendix.md)。
> 本次**不重跑** S145 `/fhs-audit` 已覆蓋的 16 項單檔衛生問題（版本號批次同步、scripts/ 沉積腳本、孤立 worktree 等），只聚焦其未觸及的跨檔語意層級問題。

---

## 1. 八域現況摘要表

> 與 `.fhs/notes/knowledge-map.md` 的差異：knowledge-map 是「查詢路由表」（按問題類型找去哪查）；下表是「現況健康度快照」（按檔案域列狀態與問題數），兩者服務不同目的，不重複造表。

| 域 | 核心檔案 | 規模 | 現況 | 本次發現數 |
|---|---|---|---|---|
| 制度層 | AGENTS.md + governance×7 + CLAUDE.md + commands/ | ~800+ 行 | 憲法 v1.5.0，7 檔 governance S144-145 新建 | 6 |
| 藍圖+知識層 | FHS_Blueprint.md + System_Logic_Overview.md + 2×知識索引 | ~820 行 | Blueprint v4.8(2026-06-05)，Overview v1.0.0(S60) | 6 |
| 財務六專檔 | Finance/Pricing Bible + Product_Definition + Cost_Schema_v2/Operations/UI_Spec | ~1,824 行 | 3 檔已定案(6/5-6/26)，3 檔卡 draft 逾5週 | 9 |
| 運行系統文檔 | n8n/supabase/Dashboard/scripts README + IG Watchdog 報告 + 47 個 migration | 分散 | 多份 README 落後於現行版本 1-2 月以上 | 6 |

**五類分布**：重複 6、斷鏈 10、過時 8、token浪費 5、管理盲區 10（發現常跨多類，加總 > 24）。

---

## 2. 治理可攜性設計約束（全案通用前提）

對接 [[project_governance_portability_plan]]（Fat Mo 既定計畫：治理系統未來拆為可攜模板）。本方案書所有 P0/P1 建議遵守：

- **不綁死本專案路徑命名**：修法優先改「規則/連結」而非「重寫敘事內容」，敘事重寫留給內容擁有者
- **能被 fhs-health 規則化的問題**（死連結、版本號比對）應收編進 `.fhs/tools/fhs-health-rules.json`，而非本次人工修一次就結束——一次性修復 + 規則化偵測兩件事都要做，否則問題會復發
- **財務類發現一律先過 [[project_kgov]]** 路由，不在本方案書內直接定案財務文件的版本升級或退役

---

## 3. P0 — 高優先（主動誤導風險，建議立即處理）

### P0-1 生產版本認定三處互相矛盾（Step 3 抽驗擴大範圍）
`Freehandsss_Dashboard/README.md:11` 稱 current.html「正式生產環境 = V42」；同檔 `:15` 卻把 V42 本體標為「開發基線」（非生產）；`:27` 又稱「UI 層：V42 (Active Production)」；`docs/repo-map.md:106` 則稱 current.html「內容與 V41 一致」。**不只兩檔矛盾，README.md 內部 3 處 + repo-map 共 4 處標籤互打架**。（證據 D2，Step 3 ✅ CONFIRMED 並擴大範圍）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 低（核對「current.html 實際版本」+ 同步 README 3 處與 repo-map 1 處，共 4 處一致化） | 高——避免部署/驗收時誤判 igwatch 等 V42 功能是否已上線 | 非 fhs-health 可測（需人工核對「哪個是真」），核對後可把「版本一致性」規則化進 fhs-health |

### P0-2 財務欄位命名+章節引用雙重錯誤
`addon_cost_lights`（Product_Definition）vs `addon_cost_light`（Cost_Schema_v2/Operations，含實際 SQL migration UPDATE 語句）；`Product_Definition:152` 引用 Cost_Schema_v2 §6（實際是運費），加購實際在 §7。（證據 C2/C6，Step 3 ✅ CONFIRMED：確認皆為正式 schema/DB key 而非註解範例）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 低（改 1-2 處拼法 + 1 處章節號） | 高——真實查詢欄位錯誤風險，財務資料完整性 | 屬 [[project_kgov]] 財務知識治理範疇，本方案書只標記不代裁；執行需過 finance-gatekeeper 路由確認哪個拼法為準 |

### P0-3 憲法引用已退役指令
`AGENTS.md §7` 仍列 `/px-plan`、`/px-audit` 為有效指令並指向不存在的檔案；`commands/README.md` 已明載兩者 2026-05-30 退役。（證據 A2，Step 3 ✅ CONFIRMED：`ls commands/` 實測確認兩檔不存在）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 低（刪 2 行引用或加退役標註） | 中高——憲法層公信力，避免新 session 依錯誤指令行事 | **觸及 AGENTS.md 本體，屬憲法層修改**，需 Fat Mo 逐項裁決（見 §6），非 fhs-health/kgov/fhs-slim 可代勞 |

### P0-4 成本文件引用已退役權威
`Cost_Schema_v2` 與 `Pricing_Bible` 仍引用已被 `Finance_Bible` 明文退役的 `FHS_Product_Bible_V3.7.md` 為 Drawing Cost 權威。（證據 C1）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 低（改 2 處引用指向現行權威） | 高——避免定價計算誤用已退役依據 | 屬 [[project_kgov]] 範疇，需財務裁決者確認現行 Drawing Cost 權威實際出處 |

### P0-5 運行系統 README 嚴重過時
`n8n/README.md` 缺 IG Watchdog workflow；`supabase/README.md` migration 清單停在 0001（實際 0047），漏列 `ig_watchdog_alerts`、`audit_logs` 等結構表。（證據 D1/D5）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 中（2 檔內容補寫，非僅連結修復） | 高——這兩份是外部系統的第一入口，過時會直接誤導部署判斷 | 純文件內容更新，不觸憲法/財務裁決，可直接排入一般維護工單 |

---

## 4. P1 — 中優先（結構性問題，建議下一輪處理）

> P1-3（原編號，Blueprint vs System_Logic_Overview「無權威標示」）經 Step 3 抽驗 **❌ NOT CONFIRMED**：Blueprint 開頭（11-18行）已有明確權威聲明「本文件是全系統核心邏輯與技術規格真相」，且 `finance-gatekeeper/SKILL.md` 路由表已將 RPC/KPI 財務計算細節分流至 System_Logic_Overview §十。原指控「完全沒有互相參照/權威聲明」不成立，已降級移至 P2-6（見 §5）。

### P1-1 finance-gatekeeper 路由表覆蓋不全 + 權威敘事不統一
路由表完全未提 `Product_Definition`/`Operations`/`UI_Spec` 三檔，依路由表查詢會漏讀；且 Finance_Bible／Cost_Schema_v2／Pricing_Bible 對「誰是權威」（文件 vs 代碼）框架互不一致。（證據 C7/C8/C9，Step 3 ✅ CONFIRMED：路由表全文 Grep 三檔名確認零匹配）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 中（路由表補 3 行 + 一次性裁定權威敘事統一詞彙） | 高——這是財務查詢「查不全」的根因，比表面的命名不一致更關鍵 | 屬 [[project_kgov]] 核心職責，建議整案轉交 kgov 框架下處理，本方案書只標記優先級 |

### P1-2 FHS_Blueprint.md 內容層級過時
§7 仍以 Airtable 為主要資料架構，§8 監控系統缺財務 RPC 層描述——非僅版本標籤問題，是敘事內容本身落後於現行 Supabase-First 架構。（證據 B1/B2）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 高（需重寫 §7/§8 兩節，非單行修補） | 中——Blueprint 讀者較少（B3 顯示它已是 AI 路由孤兒），但人類新人 onboarding 仍可能誤讀 | 非 fhs-health 可自動測（語意判斷），需內容擁有者一次性重寫；重寫後可把「架構關鍵詞」納入 fhs-health 的 canonical_keys 偵測 |

### P1-3 成本文件家族卡 draft 逾 5 週
`Cost_Schema_v2`/`Operations`/`UI_Spec` 三檔仍標「pending audit」，與其餘三份已定案財務文件產生語義漂移窗口。（證據 C3）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 不定（取決於 Fat Mo 是否要推進審計，非文件治理可代為決定） | 高——這是財務知識的「未完成狀態」被當作現行依據使用的風險 | 屬 [[project_kgov]] 決策範疇，本方案書只標記逾期，不建議自行變更 status |

### P1-4 IG Watchdog 規格分散三處無單一入口
2 份 completion report + `scripts/ig-watchdog/SOP.md`，且 SOP.md 只被 scripts/README.md 連結，n8n/README.md 未連過去；另有第三份完成報告未在原掃描白名單但實際存在。（證據 D3/D4）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 低（補 1-2 行交叉連結，不需搬移內容） | 中高——現行系統上線中的功能，規格可發現性直接影響未來維護速度 | 純文件連結修復，不觸憲法/財務，可直接執行 |

### P1-5 CLAUDE.md 與 02_model-dispatch 三紅線全文重複
非「一處定義+連結」而是兩處都寫完整清單，未來若三紅線內容變動需同步改兩處。（證據 A1）

| 工作量 | 收益 | 邊界 |
|---|---|---|
| 低（CLAUDE.md 改為摘要+連結，governance 保留全文） | 中——降低未來修改時漏改一處的風險，非當前有錯誤 | 屬 05_maintenance-protocol 權限矩陣管轄，修改 CLAUDE.md/governance 需依該協議走 |

---

## 5. P2 — 低優先（衛生性，可併入下次例行維護）

| # | 問題 | 證據 | 邊界說明 |
|---|---|---|---|
| P2-1 | `fhs-audit.md` 自稱「30項」vs S145 實測 33 項不一致 | A3 | 應收編進 fhs-health 規則化偵測（自我聲明數字 vs 實測結果比對），非本次人工修 |
| P2-2 | `AGENTS.md Rule 3.11` token 數字（~300）與 `CLAUDE.md`（~2,300）矛盾 | A5 | **觸及 AGENTS.md 本體**，需 Fat Mo 裁決（見 §6）；修正後應規則化防止再漂移 |
| P2-3 | `06_letter-to-future-sessions.md` 在 CLAUDE.md 路由表不可達（孤兒） | A4 | 屬 05_maintenance-protocol 管轄；純新增一行路由，低風險 |
| P2-4 | 版本標記衛生批次：`.fhs/notes/README.md` 57 行死內容 + `Cost_Schema_v2` 檔名/frontmatter/內文三套版本號不同步 | B5/C5 | 屬 fhs-slim 下次執行範圍（文件衛生批次清理），非本方案書單獨處理 |
| P2-5 | Migration 命名無法揭露財務 RPC 反覆修補的因果鏈（0035-0041 六連發、0022a/b 斷裂編號） | D6 | 建議：未來建立「migration 意圖索引」一次性文件，非急件，觀察即可 |
| P2-6（降級） | Blueprint 與 System_Logic_Overview 架構描述段落重疊——**兩者均有定位聲明與路由分工，非權威缺失**；建議僅互加 See-Also 交叉連結降低雙寫維護成本 | B4，Step 3 修正 | 純標註層級，優先級低於原判斷；不觸憲法/財務，可直接執行或併入下次例行維護 |

---

## 6. 憲法層觸及項標記（需 Fat Mo 逐項裁決）

以下 2 項直接修改 `AGENTS.md` 本體，依 05_maintenance-protocol 權限矩陣，不得由 AI 自行執行，須逐項裁決：

- **P0-3**：刪除/標註 §7 `/px-plan`、`/px-audit` 死指令引用
- **P2-2**：修正 Rule 3.11 token 數字（~300 → 實測 ~2,300），與 CLAUDE.md 現行數字對齊

其餘 P0/P1/P2 項目均為 governance/docs/財務專檔/運行系統文檔層級，不觸憲法本體，可依各自邊界欄位所述路徑處理。

---

## 7. 與既有機制的邊界矩陣

| 機制 | 覆蓋層級 | 是否介入 token 經濟 | 職責角色 |
|---|---|---|---|
| **fhs-health**（L1） | 單檔格式/連結/版本字串（機械可判定） | 是——L1 零 token 偵測即為 token 經濟工具本體 | 偵測（自動化腳本，非審核/執行） |
| **kgov** | 財務知識文件層（六專檔 SSoT/路由/裁決） | 否——管知識正確性與路由，不管載入成本 | 審核＋裁決（財務規則變更需經此框架） |
| **fhs-slim** | 文件衛生批次（learnings 輪轉/孤兒索引） | 是——清理目的即為降低 session 載入雜訊 | 執行（批次清理動作，非審核） |
| **本方案書** | 跨檔語意層級（重複/斷鏈/過時的一次性盤點） | 是——核心目的即 token 經濟 | 診斷＋排序（不執行、不裁決，僅產出優先級建議） |

**分工原則**：本方案書發現若屬「機械可判定」（如 P0-1 版本字串矛盾、P2-1 自稱數字不符）→ 修復後應回饋規則化進 fhs-health，避免同類問題只能靠人工重複抓；若屬「財務知識文件」（C 域全部發現）→ 處置權在 kgov，本方案書不越權定案；若屬「衛生批次」（P2-4 死內容/版本號）→ 併入 fhs-slim 下次執行範圍。四者互不重疊：fhs-health 偵測、kgov 裁決、fhs-slim 執行、本方案書診斷排序。

**§2 過時判準補充說明**：Phase 3.5（2026-05-16）確立的 frontmatter `compatible_with` 版本比對標準，適用於「標籤層級」過時判定（如 P2-2 Rule 3.11 數字、C5 版本號三套不同步）；但本次 P0-5、P1-2、B1/B2 等「內容層級」過時（文件內容描述的架構事實已與現行決策不符，例如 Blueprint 仍以 Airtable 為主流敘事）無法單靠標籤比對抓出，需對照現行已定決策（如 Supabase-First）做語意核實——此為在既有標準之上的必要延伸，非另立判準，已於證據附錄逐條列出比對依據。

---

## 8. 後續狀態

`status: proposed`。經 Fat Mo 逐項裁決後，個別 P0 項目執行完成應更新本檔 `status: executed` 並按 commit.md P1.6 敘事單源合約歸檔；未採納項目標註理由後可歸檔存查，不需保留在 active 路徑。
