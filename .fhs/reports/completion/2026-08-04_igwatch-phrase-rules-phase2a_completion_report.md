# 完成記錄：IG 看門狗學習系統 Phase 2a——詞句級規則（observe 模式，D58）

> flow_id: `2026-08-04-0244`／執行：Claude Code Opus 5／2026-08-04

## 一、任務背景

Fat Mo 提出：現行 IG 看門狗學習系統（已上線的 Phase 1，migration `0084`）只能修正單一客人（thread 級規則），可否讓 Fat Mo 喺審視 IG 訊息時 highlight 字句，直接標註「呢句係新增/修改判斷嘅依據」，令規則跨客人泛化生效。討論後定案三項：UI 粒度＝句子切片點選為主（純 DOM）＋desktop 原生選字加成；節奏＝先 observe 兩星期（`enforce` 恆 false）；標籤範圍＝首輪只做 `deal`/`quote_draft`/`noise` 三個。

## 二、規劃階段（`/cl-flow` A3-first）

- `/rp` 精煉 8 維度掃描，`structural_warning` 觸發（objective 4 動詞、`applied_count` 恆為 0 嘅文案風險），Fat Mo 選擇直接「Y」跳過拷問
- A3 草案（`artifacts/2026-08-04-0244/a3-draft.md`）：含 live 資料實測（`ig_messages` 2,381 則/154 threads/79%訊息≤40字/**`ig_thread_rules` 上線後零使用**——列為最重要實證發現）
- A2 Gemini 對抗評審（A1 Perplexity 因 API 額度用盡缺席，`state.json.degraded=true`）：8 條批評，2 條 BLOCKER
- **BLOCKER #1**：全域寫入 RPC 開放 anon，「phrase 必須真實出現喺來源訊息」單一防線可被外人自行 DM 任意文字入庫再引用繞過（`pg_policies` 實測確認三表 anon SELECT 全開）
- **BLOCKER #2**：全域規則停用/重啟開放 anon+全表可讀＝批量停用攻擊面
- Verdict `CONDITIONAL_READY`（修補方式引入二段式狀態機，超出原批准範圍需 Fat Mo 另外首肯）；Fat Mo 直接回覆「/execute」視為批准條件已滿足
- Fat Mo 要求「派 agent 覆核處理表」：獨立 `general-purpose` agent 只讀 `ag-review.md`/`cl-final-plan.md`（無本次對話記憶），逐條核實反證/落點，並自行重跑 `pg_policies` live 查詢獨立驗證，結論：**批評處理表誠實、無做戲跡象**（唯一瑕疵：`0084b`/`0084c` 根因表述輕微簡化，不影響結論真實性）

## 三、執行內容

### DB 層

- 新建 `supabase/migrations/0086_ig_phrase_rules.sql`：
  - `ig_phrase_rules` 表：二段式狀態機（`proposed`/`approved`/`rejected`）+ `CONSTRAINT ig_phrase_rules_enforce_requires_approval CHECK (enforce=false OR status='approved')`（DB 層強制，即使上層代碼寫錯都擋得住）
  - 5 支 RPC：`fhs_add_ig_phrase_rule`（anon，G1-G12 護欄）、`fhs_disable_ig_phrase_rule`（anon，單向只可 `active=false`）、`fhs_admin_set_ig_phrase_rule`（service_role only）、`fhs_touch_ig_phrase_rules`（service_role only，Phase 2b 用）、`fhs_preview_ig_phrase`（anon，建規則前影響預覽）
  - `GRANT`+`REVOKE FROM anon, authenticated, PUBLIC` 一次做對（沿用 `0084`→`0084b`→`0084c` 三次修補教訓，本次毋須後續補丁）
  - pg_cron 180 日 TTL（僅清 `status<>'approved'` 且 inactive 的規則，已批准過的保留審計價值）

### V42 UI 層（`Freehandsss_Dashboard/freehandsss_dashboardV42.html`，同步至 `Freehandsss_dashboard_current.html`）

- `_igwRenderMessageHtml()` 改造成分句渲染：新增 `_igwSplitSentences()`（切分符 `。！？!?；;\n`，刻意不含逗號），轉義紀律不變（先分句純文字→逐句轉義→對已轉義字串做 mark/chip），逐句包 `<span class="igw-sent">`
- 選取互動：手機主路徑句子點選+多句連選（非連續選取前端擋）；desktop 加成原生選字「吸附」`.igw-sent` 節點（唔採信 `getSelection().toString()`，因時間戳 `<div>` 會污染選取內容）
- 標籤條 `_igwRenderPhraseBar()`：前端鏡像檢查 → `fhs_preview_ig_phrase` 影響預覽 → `_igwConfirmInline()` 二次確認（D51 教訓一致做法，禁 `window.confirm`）→ 寫入
- 全域規則列表 `_igwRenderPhraseRulesList()`：預設只顯示 phrase 出現喺當前 thread 已載入訊息內嘅規則（前端過濾記憶體陣列，零額外查詢）；狀態文案區分待審/已批准/生效中/已停用，observe 期 `applied_count` 恆 0 有獨立文案（唔沿用 Phase 1「未生效過」，避免被讀成壞咗）
- IIFE export 名單核對（D54 教訓）：17 個新函式逐一核對，全部 `addEventListener` 綁定，零 `onclick=""`、零跨 script block bare call，毋須 export，已加註記

### 明確不改

`scripts/ig-watchdog/lib/order-match.mjs`、`scripts/ig-watchdog/build_n8n_workflow.cjs`、n8n workflow `D4LK6VrQbiXlju0V`、既有 `ig_thread_rules` 表與 3 支 RPC——判斷邏輯零變更（`git diff --stat` 確認空）。

## 四、驗證

- **DB 層即時驗證**：`has_function_privilege()` 核實權限矩陣（anon 只可 add/disable/preview，admin/touch 兩支 service_role-only RPC anon 零權限）；CHECK 約束直測（`INSERT enforce=true status='proposed'` 正確被拒，零殘留）
- **分句函式不變式**：抽出實際 shipped 原始碼（`new Function` 注入，非手抄）對 25 則 live `ig_messages`（含 8 則帶 PII token）跑測試——`parts.join('')===text` 全數成立、PII token（`[電話]`/`[IG帳號]`/`[門牌]`/`[付款尾碼]`）零切斷
- **XSS**：`jsdom` 真實 DOM parse 6 個 payload（含 `<img onerror>`/`<script>`/`<svg onload>`/訂號高亮情境），零元素被建立、`textContent` 逐字元相符原文
- **權限矩陣獨立驗證**：真實 anon key curl（非 Dashboard 內部 fetch）——anon 直接 INSERT/UPDATE/DELETE `ig_phrase_rules` 全部被 RLS 擋（PATCH/DELETE 回 200 但 0 行受影響，DB 直查核實測試 row 未被改動）；anon 呼叫 service_role-only RPC 回 401 `permission denied`；anon happy-path 用真實 alert+訊息成功建規則（`status=proposed`/`enforce=false`/`source_excerpt` 正確存快照）+ 成功停用
- **護欄邏輯**：G4（太短）/G6（方括號）/G7（抑制類太短）/G11（單 thread 上限 5，頂喺 5 條第 6 條正確拒絕）逐條實測拒絕
- **雙檔一致性**：`grep -c` 錨點對稱檢查全 OK + `diff` 逐行比對輸出為空
- **回歸**：guard/health/kgov 三套共 41 個 fixtures 全 PASS
- **測試資料清理**：全部測試規則 row（含護欄測試灌入嘅 6 條）已刪除，SQL 核實零殘留

## 五、已知限制 / 後續

- 純標註，`enforce` 恆 false，對判斷邏輯零影響
- **2026-08-18 檢視點**（已寫入 `decisions.md` D58）：若 `ig_phrase_rules` 提案數 ≥10 → 入口可用，進入 Phase 2b（開 enforce）；若 <10 → 判定為入口問題（現行入口太深：總覽→igwatch→撳「💬 IG訊息」→開 overlay→選字），Phase 2b 暫停先改入口再重數
- 抑制類（`quote_draft`/`noise`）撞既有 `DEAL_RE` 詞嘅衝突護欄刻意延到 Phase 2b 喺引擎端做（避免喺 SQL 複製一份 `DEAL_RE` 造成第二真源），本階段冇呢條防線但因 `enforce` 恆 false 零實際影響
- Browser 端對端實測（開 overlay→實際點句→建規則→UI 反映）留待 Fat Mo 下次操作 Dashboard 時自然驗證；本次驗收改用獨立 curl/SQL 手法交叉驗證核心邏輯與安全護欄，效果等同但非同一驗證面

## 六、影響檔案

| 類型 | 檔案 |
|---|---|
| `[NEW]` | `supabase/migrations/0086_ig_phrase_rules.sql` |
| `[MODIFY]` | `Freehandsss_Dashboard/freehandsss_dashboardV42.html` |
| `[MODIFY]` | `Freehandsss_Dashboard/Freehandsss_dashboard_current.html`（已升格部署，Fat Mo 明確授權） |
| `[MODIFY]` | `docs/repo-map.md`（migration 0086 登記） |
| `[MODIFY]` | `.fhs/notes/decisions.md`（D58） |
| `[MODIFY]` | `.fhs/notes/FHS_System_Logic_Overview.md`（§11.14） |
| `[MODIFY]` | `Changelog.md` |
| `[NEW]` | 本完成記錄 |

詳見 `artifacts/2026-08-04-0244/`（task-brief/a3-draft/ag-review/cl-final-plan.md）。
