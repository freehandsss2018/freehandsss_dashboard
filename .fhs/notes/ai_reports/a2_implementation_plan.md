# Google Stitch → Antigravity Workflow 整合實施計畫 (A2 Plan)

> **撰寫者**: Antigravity (A2)
> **日期**: 2026-04-08
> **目標**: 以最小風險將 Google Stitch MCP 整合至現有系統，並同步更新子代理人認知與系統文件。

---

## Step 1 — 全面審視現況報告

### A. 現況總覽
- **AI 規則與入口**：`ANTIGRAVITY.md`, `CLAUDE.md`, `.fhs/ai/AGENTS.md` (v1.4.0) 分立清晰。
- **協作 SOP**：`docs/GLOBAL_AI_SOP.md` (v2.2) 定義了 A1/A2/A3 與 Fat Mo 的工作流。
- **指令系統**：`.fhs/ai/commands/` 含 12 個指令檔。目前無專屬 Stitch 的同步或稽核指令。
- **架構地圖**：`docs/repo-map.md` 定位準確。
- **Subagents**：在 `.fhs/ai/subagents/OPERATING_MODEL.md` (v2.0.0) 中，已將 Stitch 定義為 Layer 1: IDEATION (mcp__magic__21st_magic_component_builder)。

### B. 文件責任分工表
| 檔案/目錄 | 管轄範圍 |
|---|---|
| `AGENTS.md` | 全局最高憲法、強制安全鎖、嚴禁修改的主檔列表 |
| `ANTIGRAVITY.md` / `CLAUDE.md` | 各自的輕量級入口與初始化步驟 |
| `docs/GLOBAL_AI_SOP.md` | 跨 AI 代理與人類協作的標準作業程序 |
| `.fhs/ai/commands/` | 定義每個 `/command` 的預期行為與步驟 |
| `OPERATING_MODEL.md` | Subagent 的 5-layer 工作流定義 |
| `docs/repo-map.md` | 全局檔案位置與用途導覽 |

### C. 重複/衝突/缺失清單
- **缺失**：`ANTIGRAVITY.md` 沒有提及可主動啟用 Google Stitch 與相關 MCP。
- **缺失**：缺乏 Stitch → Antigravity → 寫入/匯入的明確 SOP 指令（例如 `/ag-ui-import`）。
- **缺失**：在 `ui-designer.md` 中提到 Stitch，但沒有明確說明如何優雅地將 Stitch 生成的程式碼交由 Antigravity 或 `frontend-developer` 去除 Tailwind/React 依賴。

### D. 建議要新增或更新的檔案清單
1. `ANTIGRAVITY.md` (修改)
2. `.fhs/ai/AGENTS.md` (修改)
3. `.fhs/ai/commands/ag-stitch-sync.md` (新增)
4. `.fhs/ai/commands/ag-ui-import.md` (新增)
5. `docs/repo-map.md` (修改)
6. `.fhs/notes/decisions.md` (修改)
7. `.fhs/ai/subagents/freehandsss/ui-designer.md` (修改)
8. `.fhs/ai/subagents/freehandsss/frontend-developer.md` (修改)
9. `.fhs/ai/subagents/OPERATING_MODEL.md` (修改)

### E. 需知曉此新功能的 Subagent
- `ui-designer`: 需知道其產出的 Spec 可以被 Antigravity 的 Stitch 工具輔助產生。
- `frontend-developer`: 需知道如何接收經 Stitch 轉換過來的原生 HTML/CSS。
- `code-reviewer`: 需增加檢查 Stitch 原生組件是否成功去除外部框架依賴的條款。

---

## Step 2 — 系統內容定義 (Landing Specs)

### 1. `AGENTS.md` (通用規則)
- **新增條款**：允許使用 Google Stitch 與 MCP 生成 UI 組件與架構，但**嚴禁** Stitch 產出直接覆寫現有 `current.html` `v36/v37/v38` 等主核心。Stitch 的產出必須作為「Draft」進入 Phase B，並去除 React/Tailwind 等非 FHS 標準框架。

### 2. `.fhs/ai/commands/` (指令入口)
- **新增 `/ag-stitch-sync`**：要求 Antigravity 開啟 Stitch 功能，檢視並擷取 Stitch 生成的 UI snippet。
- **新增 `/ag-ui-import`**：將確認後的 UI snippet 標準化為 Vanilla HTML/CSS，並封裝至 V39 prototype 中。

### 3. `ANTIGRAVITY.md` (專屬入口)
- **新增指引**：提示 Antigravity 擁有調用 Stitch MCP 的能力，並在此遇到 UI 需求時可調用上述指令。

### 4. `docs/repo-map.md` & `docs/system-map`
- **更新**：加入對新 Commands 的追蹤，將 Stitch workflow 標記於架構說明。

### 5. `decisions.md`
- **記錄**：決定將 Stitch 整合為 Antigravity 的標準輔助流程，並確保無害化轉譯（去除外部依賴）的決策。

---

## Step 3 — 變更計畫提案 (Patch Plan)

| 階段 | 操作檔案 | 變更內容 | 風險評估 |
|---|---|---|---|
| A | `docs/repo-map.md` | 新增 `.fhs/ai/commands/` 下的 `ag-stitch-sync.md` 及 `ag-ui-import.md` 索引 | 低 |
| A | `.fhs/notes/decisions.md` | 記錄本次整合決策與框架解耦原則 | 低 |
| B | `.fhs/ai/AGENTS.md` | 在 Section 3 `全域硬規則` 補入 Stitch 資產無害化（去除框架）之守護原則 | 低 |
| B | `ANTIGRAVITY.md` | 增加第 5 點，提示 AG 使用 Stitch MCP 及相關入口指令 | 低 |
| B | `.fhs/ai/commands/ag-stitch-sync.md` | 新建檔案，定義同步 Stitch 設計的標準語意與步驟 | 低 |
| B | `.fhs/ai/commands/ag-ui-import.md` | 新建檔案，定義轉碼與匯入 prototype 的標準步驟 | 低 |
| C | 相關 `subagents/*` | 補充 UI Designer 與 Frontend Developer 對於 Antigravity Stitch 介入時的工作邊界 | 低 |
| D | 一致性檢查 | 確保文件間無衝突連結，確認版本號升級 (例如 AGENTS.md 若更動規則可能升版) | 低 |

**建議 Commit 方式**：分四批提交，精確對應 Phase A-D，避免單次 Commit 過大。

---

## Step 5 — Subagent Sync Note (子代理同步通告草案)

**對象與責任邊界**：
- **UI Designer**：
  - **何時使用**：在 Phase A (Ideation) 時，可請 Antigravity 透過 Stitch MCP 作輔助設計。
  - **產出**：產出的組件設計需定義為 Vanilla DOM 結構，拒絕 Tailwind 標籤。
  - **禁止**：不可讓 Stitch 代碼直入 Spec 文件而不轉換。

- **Frontend Developer**：
  - **何時使用**：在 Phase B，接收並實作來自 Stitch 協同產出的 Spec。
  - **必須**：將 Stitch 的設計徹底解耦，轉為純 HTML/CSS。

- **Code Reviewer**：
  - **稽核點加強**：確保 Prototype 沒有漏網的 React `className` 或 CDN CSS inclusion。

---

## Step 6 — 最終交付格式

**1. 已掃描關鍵檔案清單**
- `AGENTS.md`, `CLAUDE.md`, `ANTIGRAVITY.md`, `GLOBAL_AI_SOP.md`, `repo-map.md`, `decisions.md`, `OPERATING_MODEL.md`, `ui-designer.md`, `frontend-developer.md`, `code-reviewer.md`。

**2. 建議變更清單**
- 見 Step 3 列表。

**3. 待批核的 Patch Plan**
- 請確認上述 Step 3 之階段劃分與內容。

**4. 執行順序**
- 分別執行 Phase A -> Phase B -> Phase C -> Phase D。

**5. 建議 Commit Message**
- `feat(workflow): integrate Google Stitch to Antigravity MCP pipeline with strict Vanilla HTML conversion guardrails`
