---
name: FHS Subagent Operating Model
version: 2.0.0
created: 2026-04-05
updated: 2026-04-05
migrated_from: .fhs/ai/commands/v39-aom.md
scope: V39+ Prototype-First Rebuild（長期制度文件）
---

# FHS Subagent Operating Model

> 本文件定義 FHS 系統的 Subagent 組合、分工邊界與工作流程。
> 從 V39 起生效，適用於所有後續版本迭代。
> 所有 agents 仍須遵守 AGENTS.md 全域硬規則，本文件不得凌駕憲法層。
>
> **v2.0.0 更新**：加入 5-Layer Intelligence Stack 定義與工具路由表。

---

## 背景與動機

V38 仍落入「舊版介面微調」路線——以 V36/V37 的表單卡片結構為基礎，在原有 DOM 架構上疊加樣式。
V39 的核心轉變：**原型先行，功能後接**。介面設計必須脫離現有 HTML 結構的思維慣性，
從使用者操作流程出發，重新定義視覺語言與互動模型。

---

## 5-Layer Intelligence Stack

```
Layer 1: IDEATION — Stitch (magic MCP)
  工具：mcp__magic__21st_magic_component_builder
  由誰執行：ui-designer（Phase A 開始時）
  輸出：3-5 個 layout candidates（HTML/CSS snippets，含 DOM 結構說明）

Layer 2: REFINEMENT — Impeccable
  工具：Read .gemini/skills/frontend-design/reference/*.md（方案 A，已驗證）
  由誰執行：ui-designer（Stitch 輸出後）
  輸出：設計批評摘要 + 最優方向篩選

Layer 3: SPEC — FHS-Curated UI/UX Intelligence Layer
  工具：Read .fhs/ai/skills/ui-ux-pro-max/FHS_INTEGRATION.md
  由誰執行：ui-designer（Refinement 後）
  輸出：FHS Design Spec（正式交接文件）

Layer 4: IMPLEMENTATION — frontend-developer
  輸入：Layer 3 的 FHS Design Spec（非 Stitch 原稿）
  輸出：freehandsss_dashboardV[N]_proto.html

Layer 5: QUALITY GATE — code-reviewer
  稽核：FHS Audit Checklist + UX/Visual Quality Checklist
  輸出：PASS/FAIL + 稽核報告
```

## 工具路由表

| Phase | Layer | 工具/資源 | 執行 agent |
|-------|-------|---------|-----------|
| A — Design Sprint | 1 Ideation | magic MCP（Stitch） | ui-designer |
| A — Design Sprint | 2 Refinement | `.gemini/skills/frontend-design/reference/` | ui-designer |
| A — Design Sprint | 3 Spec | `.fhs/ai/skills/ui-ux-pro-max/FHS_INTEGRATION.md` | ui-designer |
| B — Prototype Build | 4 Implementation | Write/Edit 工具 | frontend-developer |
| C — Quality Gate | 5 Quality Gate | FHS Audit + UX Checklist | code-reviewer |

## 標準三階段工作流（Prototype-First）

```
Phase A: Design Sprint (ui-designer)
  → Layer 1-3 依序執行
  → 輸出：FHS Design Spec（交接給 frontend-developer）

Phase B: Prototype Build (frontend-developer)
  → Layer 4 執行
  → 輸入：FHS Design Spec（必須）
  → 輸出：純 HTML/CSS/JS 原型，無 n8n 連接，靜態資料模擬

Phase C: Quality Gate (code-reviewer)
  → Layer 5 執行
  → 稽核原型品質、AGENTS.md 合規、UX/Visual 品質
  → 通過後，Fat Mo 授權進入「功能接回」階段
```

> ⚠️ 功能接回（n8n webhook、Airtable 連接）必須等待 Phase C 通過 + Fat Mo `/execute` 授權。
> 任何 agent 不得在 Phase B 原型中混入真實 API 呼叫。

---

## Agent 角色定義

### ui-designer
**角色定位**：FHS 視覺架構師，負責定義「長什麼樣子」
**文件位置**：`.fhs/ai/subagents/freehandsss/ui-designer.md`
**Runtime**：`~/.claude/agents/freehandsss/ui-designer.md`

**職責範圍**：
- 定義雙模式（令狐沖 / 肥貓）的視覺語言與設計原則
- 制定色彩系統、排版規範、間距系統、CSS Variables 命名規範
- 繪製 wireframe 與組件清單
- 確保設計脫離 V36/V37/V38 的卡片表單思維慣性

**使用時機**：每個新 Phase 開始前（Phase A 入口）

**禁止範圍**：
- 不寫任何功能性 JavaScript
- 不接觸 n8n / Airtable 資料結構
- 不修改任何現有主檔

---

### frontend-developer
**角色定位**：FHS 原型實作者，負責把設計轉化為可運行的 HTML 原型
**文件位置**：`.fhs/ai/subagents/freehandsss/frontend-developer.md`
**Runtime**：`~/.claude/agents/freehandsss/frontend-developer.md`

**職責範圍**：
- 依照 ui-designer 的設計規範，編寫 `freehandsss_dashboardV[N]_proto.html`
- 使用靜態 / 模擬資料（hardcoded JSON），不發任何 HTTP 請求
- 確保原型可在瀏覽器直接開啟（`file://` 協議可用）
- 實作所有視覺互動，按鈕點擊不觸發真實 webhook
- 維護乾淨的代碼結構，預留 `TODO[hookup]` 標記

**使用時機**：ui-designer 完成 Phase A 輸出後

**禁止範圍**：
- 不修改 `current.html` / V36 / V37 / V38（硬規則）
- 不加入任何 `fetch()` / `XMLHttpRequest` / webhook 呼叫
- 不硬編碼任何真實 API key

---

### code-reviewer
**角色定位**：FHS 品質守門員，負責「這個原型能不能進入功能接回」
**文件位置**：`.fhs/ai/subagents/freehandsss/code-reviewer.md`
**Runtime**：`~/.claude/agents/freehandsss/code-reviewer.md`

**職責範圍**：
- 稽核 prototype HTML 是否符合 AGENTS.md 硬規則
- 檢查 HTML ID 命名是否與現有 n8n webhook 掛鉤衝突
- 評估代碼品質：無全域變數污染、無 XSS 風險、無意外 API 呼叫
- 確認原型與前版本差異度（防止滑回「微調」路線）
- 產出稽核報告：PASS / FAIL + 修改要求清單

**使用時機**：frontend-developer 完成原型後（Phase C 入口）

**禁止範圍**：
- 不直接修改任何檔案（唯讀稽核）
- 不自行宣告「功能接回已批准」（必須等 Fat Mo `/execute`）

---

### database-reviewer
**角色定位**：FHS Airtable Schema 審查員與 n8n 資料流驗證員
**文件位置**：`.fhs/ai/subagents/freehandsss/database-reviewer.md`
**Runtime**：`~/.claude/agents/freehandsss/database-reviewer.md`
**Model**：claude-sonnet-4-6

**職責範圍**：
- Airtable 欄位類型、命名規範稽核
- n8n Code Node `[{json:{}}]` 格式驗證
- SKU 正規化一致性審查
- Triple_Sync 三端欄位映射正確性確認
- 財務欄位守護（遵守 AGENTS.md §財務真理守護）

**使用時機**：修改 Airtable schema、審查 n8n Code Node、財務審計前

**禁止範圍**：
- 不直接修改任何業務代碼（唯讀稽核）
- 不自行宣告「同步已完成」

---

### tdd-guide
**角色定位**：FHS 測試驅動開發專家
**文件位置**：`.fhs/ai/subagents/freehandsss/tdd-guide.md`
**Runtime**：`~/.claude/agents/freehandsss/tdd-guide.md`
**Model**：claude-sonnet-4-6

**職責範圍**：
- 引導 Red-Green-Refactor 測試循環
- `Maintenance_Tools/` Python 測試腳本規劃
- n8n Code Node 測試用例設計
- 財務計算邊界情況測試（profit=0 例外情況）

**使用時機**：新增 Maintenance_Tools 腳本、修復 Python 測試、規劃 n8n 測試策略

**禁止範圍**：
- 不修改 `captureFormState()`
- 不在測試中 mock Airtable 回傳值

---

### build-error-resolver
**角色定位**：FHS 錯誤診斷專家（外科手術式修復）
**文件位置**：`.fhs/ai/subagents/freehandsss/build-error-resolver.md`
**Runtime**：`~/.claude/agents/freehandsss/build-error-resolver.md`
**Model**：claude-haiku-4-5-20251001（快速診斷，低成本）

**職責範圍**：
- n8n workflow execution 錯誤診斷
- Dashboard JavaScript TDZ/runtime 錯誤定位
- Python 測試腳本崩潰分析
- 最小修復方案建議（不超範圍修改）

**使用時機**：任何 workflow 失敗、JS 錯誤、Python crash

**禁止範圍**：
- 不修改 `captureFormState()` 或 `Raw_Form_State`
- 不變更 HTML Input/Button ID
- 不借錯誤修復名義重構相鄰代碼

---

## 其他協作角色

### Stitch（視覺原型生成器）
- Phase A 期間生成多個設計方向的視覺候選
- 輸出為**參考設計**，不可直接作為正式原型（需經 frontend-developer 整合）
- Stitch 不了解 FHS 業務規則，輸出必須由 ui-designer 審核後才使用

### Impeccable（設計技能包）
- 作為 ui-designer 的參考框架（色彩理論、排版規則、設計批評）
- Phase A 期間提供設計 critique（第三方設計觀點）
- Gemini 環境的設計技能，不直接執行代碼

### Claude Code A3（系統協調者）
- 協調 ui-designer → frontend-developer → code-reviewer 的工作流
- 確保 AGENTS.md 硬規則在整個流程中被遵守
- 唯一有權執行 Write/Edit 到正式檔案的角色（在 `/execute` 授權後）
- 維護 `docs/repo-map.md`、`Changelog.md`、`decisions.md` 的同步

---

## Runtime 同步規則

FHS 重寫版文件位置：`.fhs/ai/subagents/freehandsss/`
Claude Code Runtime 位置：`~/.claude/agents/freehandsss/`

**同步時機**：每次 `/execute` 執行時，由 A3 確認兩處版本一致。
**Rollback**：刪除 `~/.claude/agents/freehandsss/` 即可停用 runtime，專案文件不受影響。

---

## 防線：防止滑回「微調」路線

以下任一情況視為警戒信號，需停下並重新定向：

1. **原型 HTML 結構與前版本超過 40% 相似** → code-reviewer FAIL，要求重新 Phase A
2. **原型中出現 `captureFormState()` 呼叫** → 立即停止
3. **原型中出現任何 `fetch()` 或 webhook URL** → code-reviewer FAIL
4. **ui-designer 直接從前版本複製 CSS 超過 20 條規則** → 重啟 Phase A

---

## 版本歷史

| 版本 | 日期 | 說明 |
|------|------|------|
| 1.0.0 | 2026-04-05 | 初版，從 v39-aom.md 遷移，擴充為長期制度文件 |
| 2.0.0 | 2026-04-05 | 加入 5-Layer Intelligence Stack、工具路由表；整合 Stitch/Impeccable/UI/UX Pro Max |
| 2.1.0 | 2026-04-28 | 新增 3 個後端/診斷 agents：database-reviewer、tdd-guide、build-error-resolver（Flow 2026-04-28-0116）|

---

*本文件由 Claude Code A3 產出，2026-04-05*
*授權來源：Fat Mo /execute — Subagent Engineering Implementation*
