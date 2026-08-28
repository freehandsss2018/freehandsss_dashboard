# Learnings — 分桶索引與制度說明

> 由單檔 `.fhs/memory/learnings.md`（50 條硬上限）分桶重構而來（2026-08-03，flow `2026-08-03-2003`，`/cl-flow` Verdict: `CONDITIONAL_READY`）。
> 本檔為**唯一制度說明居所**：配額表 / tag 語法 / pointer 機制 / 退役 checklist / 退役登記冊，全部在此，不分散到各桶檔。
> 各桶檔只放教訓內容本身，不重複本檔說明（避免兩處各寫一份而漂移）。

---

## 1. 這是什麼、為什麼要分桶

原設計：單一檔案、全檔 50 條硬上限，唯一載入點是 `/read` 初始化 Step 3（全量載入）。
實測發現的病灶：一般 session 依賴 hook 快照、不常執行 `/read` 全量重載，導致大部分 session 的工作記憶內教訓條目數為零——教訓寫了但從未真正被讀取應用。同時，全檔 34% 的體積是退役附註與制度說明，並非教訓本體，卻每次全量載入。

分桶後的設計：
- 教訓按**領域**（非任務掃描維度）分成 6 個獨立檔案，各自獨立配額，總配額由 50 提升為 115。
- 一個自動化路由機制（見專案的 prompt 路由 hook）依任務內容判斷相關領域，按需注入對應桶檔全文到工作記憶——教訓從「靠記得去讀」變成「相關時自動在場」。
- 跨領域的教訓，全文只保留在一個「主桶」，其他相關「副桶」只放一行自動生成的指標（pointer），不複製全文——避免同一份知識散落多處各自修改而失去單一真源。
- 退役附註與制度說明移到本索引檔，不再隨教訓內容一起被自動注入。

## 2. 六個桶與配額

| 桶 | 檔案 | 範圍 | 目前條數 | 配額上限 |
|---|---|---|---|---|
| Supabase | [supabase.md](supabase.md) | Postgres / PostgREST / RLS / migration / RPC 權限 | 14 | 20 |
| Frontend | [frontend.md](frontend.md) | 主應用前端 HTML/JS（表單、渲染、狀態管理） | 18 | 25 |
| Finance | [finance.md](finance.md) | 定價 / 成本 / SKU / 財務計算規則 | 5 | 20 |
| n8n | [n8n.md](n8n.md) | Workflow 節點、payload、API 限制 | 10 | 20 |
| Governance | [governance.md](governance.md) | 治理制度、多代理協作、文件生命週期 | 8 | 15 |
| Tooling | [tooling.md](tooling.md) | 開發工具、第三方整合、harness 怪癖 | 7 | 15 |
| **合計** | — | — | **60 主文 + 15 個跨桶指標** | **115** |

> 配額初值為「現況條數 × 約 2.3」的粗略估算，非依歷史增長率精算。**應每季健檢（見專案的定期維護協議）重新檢視是否合理，非一次性定值。**

## 3. 單條格式規格

```markdown
7. 【高頻⚠️】**標題（粗體，簡短）**：內文 — 源自 <日期/session來源> `@主桶 [+副桶...]` [[選填wikilink]] <!-- v:YYYY-MM-DD 或 unknown -->
```

| 元素 | 規則 |
|---|---|
| `N.` | 每個桶檔內，按其小節（Patterns/Pitfalls/Preferences/其他）各自從 1 連續編號 |
| `【高頻⚠️】` | 保留既有標記，代表歷史上多次復發、優先度較高的條目 |
| `@主桶` | 該條全文所在的桶（恰好一個，反引號包裹） |
| `+副桶` | 該條與其他桶相關時的標註（零到多個），觸發副桶生成一行 pointer |
| `<!-- v:YYYY-MM-DD -->` | 最後複驗日期。優先取條目「源自」欄位本身的 ISO 日期；若原文只有 session 編號無日期，填 `v:unknown` |

**Tag 解析規則（供任何自動化腳本遵循）**：`@`/`+` 標記必須被反引號包裹、緊接在桶名清單白名單內（`supabase`/`frontend`/`finance`/`n8n`/`governance`/`tooling`），且位於 `— 源自` 之後、`[[wikilink]]` 之前的區段——避免與內文本身可能出現的 `@套件名` 或算式 `a + b` 混淆。

## 4. 跨桶指標（Pointer）機制

一條教訓若同時與多個領域相關，**全文只放在主桶**；副桶檔尾固定生成的 `POINTERS` 區塊只放一行連結，指回主桶的標題：

```markdown
<!-- POINTERS:BEGIN — 本區由生成腳本產生，禁止人手編輯 -->
### 跨領域指標（全文在別桶）
- → `n8n.md` #1 n8n + sbSyncOrder 雙寫競態
<!-- POINTERS:END -->
```

- pointer 行以 `- →` 開頭，**不以數字開頭**——確保不會被條目計數的正則誤算入配額。
- pointer 由主桶條目的 `@/+` tag 自動推導生成，禁止人手直接編輯 `POINTERS:BEGIN`–`POINTERS:END` 區塊；若該區塊被偵測到含正式編號條目（`^\d+\.\s` 格式），生成腳本必須拒絕覆寫並報錯，防止誤將真教訓寫入該區而被下次生成靜默清空。
- 目前跨桶指標共 8 個，涉及 8 條主文（供對照：分別位於 supabase↔n8n、n8n↔frontend、finance↔frontend、finance↔supabase、finance↔n8n、supabase↔frontend 之間）。

## 5. 退役 Checklist（五類，唔符合任一類就唔准退役）

任何教訓要從桶檔移除（退役），必須明確符合以下五類之一，並在退役附註中指明是哪一類；**「配額壓力大，隨便揀一條刪」不是有效理由**。

1. **已升格為更高層規則**：教訓內容已寫入專案憲法層/硬規則文件，成為強制執行的規則本身，不再需要靠記憶提醒。
2. **已結構性修復**：修復手法已固化成代碼本身的行為（如某函式必然執行某步驟），機制本身即是防護，非操作紀律。
3. **已在其他文件有更完整記錄**：同一教訓在別處（如個人記憶系統、專屬技術文件）有更詳盡且不會過時的版本，此處純重複佔位。
4. **已被更新條目覆蓋**：新條目以更近期案例、更詳細機制描述了同一類問題，舊條目資訊量被完全涵蓋。
5. **一次性事故且低復發風險**：問題本質是單次意外（如手誤寫錯一個 URL），非會反覆出現的模式。

> 若一條教訓的退役理由**不屬於以上任何一類**——例如純粹因為「本桶滿咗要讓位」——應優先考慮：(a) 该條合併精簡而非整條刪除，或 (b) 向配額管理者申請提升該桶配額，而非刪除仍然有效的知識。

## 6. 教訓落盤品質門檻（stage-3，逐字保留原制度條文）

> 教訓從發生到可複用有五個階段。實測：模型最常在第 1 階段就退出——把「失敗筆記＋未驗證的猜測」當成教訓落盤，污染規則庫，讓之後每個 session 照著錯的猜測辦事。
>
> **硬規則**：寫入本目錄任一桶檔的教訓，必須是**已過第 3 階段**的產物。自檢一句話：**「這條教訓的診斷，是用什麼證據核實的？」**答不出 = 還是猜測，不准落盤為規則。
>
> 未過第 3 階段的猜測，應落到專案的「未解待驗證」暫存節（不入本目錄）。
>
> - ✅ **正例**：一個逾時類問題，若在早期階段就落盤，教訓會寫成「timeout 太短，調大」；實際做了對照實驗才發現真根因是網路層攔截，最終規則與最初猜測**方向完全相反**。
> - ❌ **反例**：「又失敗了，大概是不穩定，教訓：加 retry」——零證據直接落盤。下個 session 照做加 retry，真根因繼續存在，且多了一層掩蓋症狀的 retry。

## 7. 與其他知識庫的邊界（可攜性劃線）

| | 本目錄（learnings/） | 個人記憶系統（auto-memory，本機路徑） |
|---|---|---|
| 是否入版本控制、跟 repo 走 | ✅ | ❌ 僅存於本機 |
| 換機 / 換人 / 換專案時 | 跟隨 repo 一併存在 | 不會自動存在 |
| 可否隨治理模板攜出到新專案 | ✅ | ❌ |
| 載入機制 | 由本 repo 的路由 hook 按任務領域自動注入 | 由使用者環境層自動 recall，repo 本身無法控制 |

**判準**：一條知識若同時跟這個 repo 的流程有關（即使是工具/harness 層的怪癖，只要是在此 repo 的工作流程中撞到），就該留在本目錄——即使表面看起來像「純工具問題」（見 `tooling.md`）。個人記憶系統只保留與本 repo 無關的純個人偏好或跨專案通則。

> 已知技術債：個人記憶系統目前仍有一些純屬本 repo 業務知識的條目尚未歸位過來，這是獨立於本次重構的另案工作，不在本次範圍內處理。

## 8. 退役登記冊（原檔頭與內文全部 📌 附註，逐字保留）

> 以下內容原樣搬自 `.fhs/memory/learnings.md`，僅供追溯「某條教訓當初為何被移除、去了哪裡」，**不會被路由 hook 注入**。

### 8.0 原檔頭制度說明（歷次整理記錄）

> 由 /commit 結尾手動 distill，每條上限 150 字元含日期來源。
> 全檔上限 50 條；超過時必須合併或退役，嚴禁變成第二份 decisions.md。
> 新條目須過 stage-3 驗證門檻（診斷有核實證據）；未驗證的猜測落 todo.md「未解待驗證」節，不入本檔。
> 由 /read Phase 2.5 載入至工作記憶。
> 上次整理：2026-08-03（`/fhs-slim` 觸發，55→50超預算5條全數退役純降額度：Pitfall #10/#17/#28/#33 + Preference #4，全部已在別處有完整記錄或已升格憲法層規則，非對等替換）；歷史：2026-07-22（Session 187續XIII `/commit` Lesson Distillation，對等替換：退役 Pitfall #14「前端client-side Set刷新即清空陷阱」— 已完整記錄於 Logic_Overview.md §10.9，換入本次新教訓「v_delivery_reminders view 遺漏 is_archived 權威旗標」）；歷史：2026-07-21（Session 187 對等替換：退役 Pitfall #20「git checkout 靜默攜帶未提交修改」— 通用 Git 行為非 FHS 專屬操作紀律，換入本次新教訓「運費扣減率 config 被誤複用做加項成本」）；S185 54→50超預算4條全數退役、S171 對等替換、S170 51→50、S168 51→50、S167 51→50、S166 51→50、S158 51→50、S146 51→50、S144 對等替換、S143 對等替換、S142 51→50、S136 59→49

### 8.1 Patterns 區段退役記錄

> 📌 **退役**（Session 136）：kgov 知識治理框架 Pattern 已升格為憲法層規則，完整定義見 `AGENTS.md`（Session 63/100），不再需要於此重複記錄。
>
> 📌 **退役**（Session 143，`/commit` Lesson Distillation，全檔滿50條需替換）：「Supabase MCP 掉線用 Management API 繞過」——與 auto-memory `reference_supabase_mcp_dropout_workaround.md` 內容重複，該處為專屬記錄，此處純占位，退役騰出額度給本次新教訓。

### 8.2 財務核心區段退役記錄

> 📌 **退役**（D49/cl-flow 2026-07-28-1121，`/commit` Lesson Distillation，全檔滿50條達上限）：「同部位首件含畫圖費，第2件起免畫圖」（原此列#2，2026-06-02）——規則本身未變，但實作機制已由「粗略描述」升級為結構化欄位（`position_code`/`drawing_waived`/`drawing_charged_count`），完整公式+跨對象獨立字串處理已記錄於 `FHS_Product_Cost_Schema_v2.md` §10.4，此處純重複佔位；退役騰出額度給本次新教訓（n8n多節點鏈新增payload欄位必須逐節點檢查轉發，非只改頭尾兩端）。

### 8.3 Pitfalls 區段退役記錄

> 📌 **退役**（Session 136）：①「Smart Cache COST_MAP 硬編碼遺漏」已補入 `/new-product` Step 2.e 程序強制執行，不再需要靠此記錄提醒；②「單一配件 filter 假設靜默失效」已被 Pattern #6（`_isAddon()`/`_addonType()` 架構）永久取代；③「generate() else 分支忘記清值」為窄範圍一次性 bug，已修復且此函式模式無再犯風險。
>
> 📌 **退役**（Session 142，`/fhs-slim` 觸發，全檔滿50條上限）：「try-catch 靜默吞掉 TDZ 錯誤」——條目本身無 session/日期來源（僅標「源自 memory」），同一教訓已完整記錄於 auto-memory `feedback_tdz_silent_catch.md`，此處純重複佔位，退役騰出額度。
>
> 📌 **退役**（Session 144，`/commit` Lesson Distillation，全檔滿50條需對等替換）：「Shell hook 勿用通用標題抓取」（原 Pitfall #21，Session 118）——修復已是結構性（fence tag 格式已固化進 handoff.md 設計本身），非需要每次靠記憶提醒的操作紀律，未來復發風險低，退役騰出額度給本次新教訓（git checkout 攜帶未提交修改導致 merge 空操作）。
>
> 📌 **退役**（Session 146，`/fhs-slim` 觸發，全檔滿51條超50上限）：「IIFE 閉包函式 onclick 靜默失效」（原 Pitfall #7，Session 2026-05-27）——修復手法（IIFE 末尾明確 `window.fn = fn` 暴露）已是本專案標準寫法慣例，非需靠記憶提醒的操作紀律，未來復發風險低，退役騰出額度使全檔回落至50條上限（本輪無新教訓對等替換）。
>
> 📌 **退役**（Session 168，`/commit` Lesson Distillation，全檔滿51條超50上限）：「n8n Code 節點內嵌 dashboard 網址禁憑印象寫死」（原 Pitfall #21，Session 136）——一次性歷史事故（硬編碼錯誤內網 URL），正確公開網址已永久記錄於 `decisions.md`，非需靠記憶提醒的操作紀律，未來復發風險低，退役騰出額度給本次新教訓（RLS 政策移除稽核 grep 盲點 + anon 寫入靜默 2xx 失敗）。
>
> 📌 **退役**（Session 171，`/commit` Lesson Distillation，全檔滿51條超50上限）：「hook 判斷路徑是否安全不可靠 regex 猜測外部路徑」（原 Pitfall #24，Session 145）——修復已是結構性（改讀 `fhs-health-rules.json` 顯式設定值，非需靠記憶提醒的操作紀律），未來復發風險低，退役騰出額度給本次新教訓（PostgREST `ignore-duplicates` 缺 `on_conflict` 冪等假象）。
>
> 📌 **退役**（Session 185，`/fhs-slim`，全檔滿54條超50上限）：「[G] 判準已於S148對齊execute.md diff物理特徵」（原 Pitfall #25，Session 147/S148）——核實 `scripts/hooks/post-tool-kgov.js`（L8/139/191/201/214）證實此判準已結構化寫死於 hook 程式碼本身（真值表直接判斷，非文件約定），非需記憶提醒的操作紀律；「顏色bug純讀碼查不全」（原 Pitfall #26，S157/S159）——與 auto-memory `feedback_visual_bug_measure_not_guess.md` 完全重複且該處記錄更詳盡（含兩案例+4條How-to-apply），此處純占位。兩項退役無新教訓對等替換，純降額度。
>
> 📌 **退役**（Session 187續XIII，`/commit` Lesson Distillation，全檔滿50條達上限）：「前端 client-side Set 刷新即清空陷阱」（原 Pitfall #14，Session 105）——修復手法（`sbFetchGlobalReview` 後重建 `_fhsArchivedIds`）已完整記錄於 `.fhs/notes/FHS_System_Logic_Overview.md` §10.9（含順序陷阱細節），此處純重複佔位；退役騰出額度給本次新教訓（`v_delivery_reminders` view 遺漏 `is_archived` 權威旗標，主題同屬「已完成訂單狀態判斷」領域，對等替換）。
>
> 📌 **退役**（Session 189，`/commit` Lesson Distillation，全檔滿50條達上限）：「cl-flow runner Perplexity 推理模型靜默空白」（原 Pitfall #16，Session 110）——修復已是結構性（`max_tokens`參數已永久調高+空content視為失敗已寫入runner程式碼本身），非需記憶提醒的操作紀律，未來復發風險低，退役騰出額度給本次新教訓（新增表欄位須同步檢查所有前端fetch select list）。
>
> 📌 **退役**（2026-08-03，`/fhs-slim`，全檔滿55條超50上限，四項一次過）：①「新增 order_items 欄位必須同步 n8n 寫入鏈」（原 Pitfall #10，Session 84）——同主題已被 #40（前端fetch select list同步）+ #41（n8n多節點鏈逐節點轉發）以更詳細、更近期案例覆蓋，此條純重複佔位；②「order_items 成本是組裝值非單一原子」（原 Pitfall #17，Session 112）——全文已完整記錄於 `.fhs/memory/lessons/2026-06-20_keychain-cost-drift-misdiagnosis-and-propagation-gap.md`，且其「drift工具範圍有限」描述已過時（Phase 2 起 `fhs_check_product_cost_drift()` 已覆蓋全品類，見 finance-gatekeeper SKILL.md），保留反而誤導；③「`.fhs/.deploy-ok` 旗標內容必須是純ISO timestamp字串」（原 Pitfall #28，Session 167）——與 `.fhs/memory/handoff.md` 便攜塊「⚠️易猜錯」(11) 完全重複且後者更詳盡（含consume-once補充），此處純占位；④「item_base_cost假警示/加購鎖匙扣成本誤判」（原 Pitfall #33，Session 176）——全文已完整記錄於 auto-memory `project_keychain_addon_qty_cost_bug.md`（含D37修正史，較此處更完整）。四項退役無新教訓對等替換，純降額度（55→51，另見 Preferences 段落退役第5項降至50）。

### 8.4 Preferences 區段退役記錄

> 📌 **退役**（Session 176，`/commit` Lesson Distillation，全檔滿51條超50上限）：「最小改動優先」（原 Preference #2，多次 cl-flow 對話）——原則已內化為 Claude Code 系統層級指令本身的預設行為（「不要新增超出任務所需的功能/重構/抽象」），非 FHS 專屬需記憶提醒的操作紀律，退役騰出額度給本次新教訓（多代理管道評審 vs 作者角色分工）。
>
> 📌 **退役**（Session 167，`/commit` Lesson Distillation，全檔滿50條達上限）：「自我遞迴陷阱：健檢工具測試夾具被自身掃描邏輯掃到」（原 Pitfall #24，Session 142）——修復已是結構性（`fhs-health-check.js` 已內建排除測試夾具目錄），非需記憶提醒的操作紀律，退役騰出額度給本次新教訓（`.fhs/.deploy-ok` 旗標內容格式）。
>
> 📌 **退役**（Session 158，接續 S154/S148 Phase 0 慣例，全檔滿50條達上限）：「UI toggle 標籤用操作者語言」（原 Preference #9，S126）——經 S132/S153 等多個 UI session 反覆遵循已成本專案設計慣例，無需靠記憶提醒，窄場景低復發風險，退役騰出額度。
>
> 📌 **退役**（Session 166，`/commit` Lesson Distillation，維持50條上限）：「反奉承守則內建於指令設計」（原 Preference #5，S05-30）——守則本身已寫入 Master 指令設計自動生效（該教訓自述之機制即為永久修復），非需記憶提醒的操作紀律，退役騰出額度給本次新教訓（3D打印v0範圍降級決策）。
>
> 📌 **退役**（Session 161，`/commit` Lesson Distillation，全檔滿52條超50上限）：①「n8n PUT credential ID已知可直接補回」（原 Pattern #10，Session 111）——單一 credential 修復episode 早已結案，無持續復發風險；②「付款 split UX 清空/污染雙雷」（原 Pitfall #12，Session 97/107）——`_fhsPaymentSyncing` guard 已是結構性永久修復，機制本身即防護，非需記憶提醒的操作紀律；③「cl-flow A2 模型策略統一 gemini-3.5-flash」（原 Preference #6，Session 05-30）——env-var 切換機制本身已是慣例基礎設施，該教訓已內化於機制設計。三項退役騰出額度給本次新教訓（3D打印鎖匙扣生產規格）。
>
> 📌 **退役**（Session 154/S148，Phase 0 `/fhs-slim`，全檔滿51條超50上限）：「Toggle 按鈕用動作語義」（原 Preference #10，S126）——已是本專案 POS UI 的設計慣例，無需靠記憶提醒，窄場景低復發風險，退役騰出額度給 S148 Phase 2 改寫 Pitfall #26 的空間。
>
> 📌 **退役**（Session 166，`/fhs-slim` 觸發，全檔滿51條超50上限）：「橋接版禁止含邏輯」（原 Preference #3，S05-19）——該規則已升格為治理層成文規則，完整定義見 `.fhs/notes/SOP_NOW.md` §同步更新規則第2點，不再需要於此重複記錄（比照 Session 136 kgov 退役先例）。
>
> 📌 **退役**（Session 185，`/fhs-slim`，全檔滿54條超50上限）：「3D打印鎖匙扣生產規格」（原 Preference #11，S161）同「3D打印v0範圍降級」（原 Preference #12，S166）——兩項均與 auto-memory `project_3d_print_pipeline.md` 完全重複且該處記錄更完整（含 Fat Mo 原話+方案書連結），此處純占位，退役騰出額度（無新教訓對等替換，純降額度）。
>
> 📌 **退役**（2026-08-03，`/fhs-slim`，全檔滿55條超50上限，五項一次過之第5項）：「表單新增 input 前必評估 captureFormState + n8n payload 影響」（原 Preference #4，Session 2026-05-29）——`captureFormState()` 保護已升格為 `AGENTS.md` §3 全域硬規則（憲法層級「captureFormState() 禁止改動：此函式是整個 POS 系統的數據根基」），比照 Session 136 kgov Pattern 退役先例，不再需要於此重複記錄。

---

## 9. 遷移記錄

- **2026-08-03**（flow `2026-08-03-2003`）：由單檔 `learnings.md`（50 條）分桶重構為本目錄 6 桶結構。內容 100% 保留（re-file，非重寫）；22 段退役附註 + 檔頭制度說明搬入本檔 §8；三重機械執法（health-rules / post-tool-kgov T6 / pre-tool-guard R12）與路由注入機制的接回，見 `decisions.md` 對應條目。
