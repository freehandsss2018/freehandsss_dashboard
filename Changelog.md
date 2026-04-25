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
