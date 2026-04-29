# GLOBAL AI COLLABORATION SOP v2.2

## 跨環境多代理協作與安全協議 (Universal Edition)

> **版本：** v2.2
> **升級日期：** 2026-03-31
> **前版：** v2.1（2026-03-31）

本協議整合 **Perplexity (外部分析)**、**Gemini/Antigravity (本地規劃)** 與 **Claude Code (精準執行)** 的優勢，
並明確定義 **Fat Mo 作為唯一上下文橋接者** 的協作模式，建立安全、高效的跨環境開發協議。

---

## 🏛️ 第一部分：核心角色定義 (Agent Roles)

### 1. Agent 1 (A1): The Outer Brain (Perplexity)

- **職能**：外部分析與技術趨勢審計
- **邊界**：僅能存取 GitHub 上的「已同步代碼」及外部技術資料庫
- **產出命名**：
  - `a1_audit_report.md`（A1 審計報告）
  - `a1_implementation_plan.md`（A1 實施建議，選用）
- **產出路徑**：`.fhs/notes/ai_reports/`（**必須正式落盤，不接受 artifact 代替**）
- **價值**：跨專案的客觀視角，防止開發者陷入局部細節

### 2. Agent 2 (A2): The Core Planner (Gemini / Antigravity)

- **職能**：本地優化與實施規劃
- **邊界**：具備本地全方位的讀取權限（.env、歷史日誌、私有腳本、NAS 數據）
- **產出命名**：
  - `a2_implementation_plan.md`（A2 本地實施計畫）
- **產出路徑**：`.fhs/notes/ai_reports/`（**必須正式落盤，不接受 artifact 代替**）
- **價值**：將 A1 的外部方案轉化為 100% 適合當前環境的實施計畫

> ⚠️ **Artifacts 陷阱警告**：若 A2 不明確指定寫入路徑，報告可能被存為隱藏 artifact（如 `.gemini/antigravity/brain/`），導致 A3 找不到檔案。
> **A2 的每份正式報告，必須透過絕對路徑直接寫入 `.fhs/notes/ai_reports/`，不得以 artifact 代替。**

### 3. Fat Mo: The Bridge（唯一上下文橋接者）

- **職能**：跨環境信息橋接與最終授權者
- **職責**：
  - 將 A1/A2 的報告傳遞給 A3
  - 必要時將報告送至其他 AI（px Web）做額外審視
  - 下達最終執行授權（唯一有效方式：輸入 `/execute`）
- **限制**：A1/A2 不直接溝通；所有跨環境信息流必須經由 Fat Mo 橋接
- **最終承認者**：任一 agent 的結論，不得自動視為 Fat Mo 已確認。只有 Fat Mo 明確輸入 `/execute`，才視為正式授權執行。

### 4. Agent 3 (A3): The Executor (Claude Code)

- **職能**：技術把關與精準執行
- **邊界**：具備最高權限的腳本執行與代碼寫入能力
- **產出命名**：
  - `a3_execution_verdict.md`（A3 裁決報告，存放於 `.fhs/notes/ai_reports/`）
- **價值**：確保代碼最後一哩路的品質，並作為 A2 規劃方案的技術守門員

---

## 🛡️ 第二部分：安全鎖與權限邊界 (Security Locks)

### 1. 執行權限鎖 (Execution Lock)

- **A2 禁令**：嚴禁直接修改專案主檔案。所有變更必須先產出 Markdown 提案
- **解鎖條件**：除非 Fat Mo 明確輸入 `/execute`，否則任何 Agent 不得調用寫入工具

### 2. 雙重授權條款 (Dual Authorization)

- **第一層（審查報告）**：A3 讀取 A1/A2 報告後，輸出技術可行性評估與完整 verdict，暫停等待 Fat Mo
- **第二層（執行授權）**：Fat Mo 明確輸入 `/execute`，A3 才可根據 verdict 清單執行寫入
- **未列入清單的文件嚴禁修改**

### 3. NO-TOUCH GUARDRAIL（審查期禁止寫入）

> 在 `/cl-flow`（審查與產出 verdict）階段，絕對禁止使用任何會修改檔案、建立新檔、覆寫內容、刪除內容的工具或操作。
> 若 A3 在此階段發生任何實際寫入行為，應視為嚴重違規，必須立即停止並回報 Fat Mo。

### 4. 跨環境上下文條款 (Cross-Environment Context)

- A3 接收來自 Fat Mo 橋接的 A1/A2 報告時，視為**草案資訊**
- A3 必須交叉比對本地代碼庫的實際狀態，不得僅憑轉述內容執行
- 若報告描述與本地實際不符，A3 必須回報差異，等待 Fat Mo 裁決

### 5. 優化校驗鎖 (Optimization Audit Lock)

- A3 執行前必須對 A2 提案進行技術可行性評估（效能、衝撞、維護性）
- 若發現誤診或低效，A3 有權在執行前回報修正建議

---

## 📂 第三部分：報告命名規範 (Naming Convention)

為防止同名碰撞，所有 AI 產出報告採以下命名規範：

| Agent | 報告類型 | 命名格式 | 存放位置 |
|-------|---------|---------|---------|
| A1 | 審計報告 | `a1_audit_report.md` | `.fhs/notes/ai_reports/` |
| A1 | 實施建議（選用） | `a1_implementation_plan.md` | `.fhs/notes/ai_reports/` |
| A2 | 本地實施計畫 | `a2_implementation_plan.md` | `.fhs/notes/ai_reports/` |
| A3 | 裁決報告 | `a3_execution_verdict.md` | `.fhs/notes/ai_reports/` |

> ❌ **舊格式已退役**：`audit_report.md.resolved`、`implementation_plan.md.resolved` — 不再讀取，不得產出
> ❌ **不接受 artifact 代替正式落盤檔案** — 所有報告必須以實體 `.md` 檔案存在於上述路徑

---

## ⚡ 第四部分：指令系統 (Command System)

### 正式指令命名（v2.1）

| 指令 | 中文說明 | 執行方 | 備註 |
|------|---------|-------|------|
| `/px-plan` | px 出 plan | Perplexity | 外部分析，產出 `a1_implementation_plan.md` |
| `/ag-plan` | ag 出 plan | Antigravity | 本地規劃，產出 `a2_implementation_plan.md` |
| `/cl-plan` | cl 出 plan | Claude | Claude 產出計畫 |
| `/cl-review` | cl 給我審視報告 | Claude | 技術審視，不執行寫入 |
| `/cl-flow` | cl 給我最終報告 | Claude | 讀取 A1/A2 → 產出 verdict → 停止等待 |
| `/execute` | 同意執行 / 可以執行 | Fat Mo 下達，Claude 執行 | 唯一正式執行入口 |

### `/cl-flow` 觸發流程

```text
Fat Mo 輸入 /cl-flow（或 /a3go）
    ↓
A3 檢查 .fhs/notes/ai_reports/a1_implementation_plan.md
    → 不存在：立即停止
    → 存在但為空：等待 5 秒，重試一次；仍空：停止
A3 檢查 .fhs/notes/ai_reports/a2_implementation_plan.md（同上）
    ↓ A1 ✅ A2 ✅
A3 讀取兩份報告，執行技術評估
    ↓
A3 產出 a3_execution_verdict.md（含 [MODIFY]/[NEW]/[DELETE] 清單）
    ↓
⏸️ 停止。等待 Fat Mo 輸入 /execute
```

### `/execute` 觸發流程

```text
Fat Mo 輸入 /execute
    ↓
A3 讀取 a3_execution_verdict.md
    ↓
A3 重新列出所有執行項目
    ↓
逐 phase 執行，每完成一項立即回報
    ↓
完成後寫入 decisions.md + handoff.md
```

---

## 📋 第五部分：Completion Report 規範

### 適用觸發條件

當任務屬於以下任一類型時，完成後必須建立 completion report：

- 制度變更（規則新增、規則修改）
- AGENTS.md 或 GLOBAL_AI_SOP.md 更新
- `.fhs/ai/commands/` 指令檔新增或修改
- SOP 更新（本文件版本升級）
- README / repo-map.md 同步更新

### 存放位置與命名格式

| 項目 | 規範 |
|------|------|
| **存放路徑** | `.fhs/notes/completion_reports/` |
| **命名格式** | `YYYY-MM-DD_<task_slug>_completion_report.md` |
| **命名範例** | `2026-03-31_a3_workflow_optimization_completion_report.md` |

### 最低內容要求

每份 completion report 必須包含以下欄位：

1. **任務名稱**
2. **日期**
3. **發起方**
4. **執行方**
5. **任務目的**
6. **修改 / 新增檔案清單**（含操作類型：[MODIFY] / [NEW] / [DELETE]）
7. **驗收結果**
8. **未完成事項**（若無則寫「無」）
9. **最終狀態**：`DONE` / `PARTIAL` / `FAILED`

### 強制性聲明

若未產出正式 completion report，該任務視為未正式收尾，Fat Mo 有權要求重做。
此規範適用於所有 AI / agents，無例外。

---

## 🏁 第六部分：實施聲明

本協議為全域標準，適用於所有 AI 代理（Claude Code、Antigravity、Perplexity）。

部署方式：放置於 `docs/GLOBAL_AI_SOP.md`，並於各 Agent 初始化 Context 中載入。

> **新進代理請優先閱讀本協議。**
> **本專案遵循 GLOBAL_AI_SOP v2.2，所有 Agent 協作均受本協議約束。**
