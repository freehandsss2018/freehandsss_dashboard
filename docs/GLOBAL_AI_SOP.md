# GLOBAL AI COLLABORATION SOP v2.0
## 跨環境多代理協作與安全協議 (Universal Edition)

> **版本：** v2.0
> **升級日期：** 2026-03-31
> **前版：** v1.0（已退役）

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
- **價值**：跨專案的客觀視角，防止開發者陷入局部細節

### 2. Agent 2 (A2): The Core Planner (Gemini / Antigravity)
- **職能**：本地優化與實施規劃
- **邊界**：具備本地全方位的讀取權限（.env、歷史日誌、私有腳本、NAS 數據）
- **產出命名**：
  - `a2_implementation_plan.md`（A2 本地實施計畫）
- **價值**：將 A1 的外部方案轉化為 100% 適合當前環境的實施計畫

### 3. Fat Mo: The Bridge（唯一上下文橋接者）
- **職能**：跨環境信息橋接與最終授權者
- **職責**：
  - 將 A1/A2 的報告傳遞給 A3
  - 必要時將報告送至其他 AI（px Web）做額外審視
  - 下達最終執行授權
- **限制**：A1/A2 不直接溝通；所有跨環境信息流必須經由 Fat Mo 橋接

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
- **解鎖條件**：除非 Fat Mo 明確下達「執行」指令，否則任何 Agent 不得調用寫入工具

### 2. 雙重授權條款 (Dual Authorization)
- **第一層（啟動審核）**：A3 讀取 A1/A2 報告後，輸出技術可行性評估，暫停並等待授權
- **第二層（清單授權）**：A3 必須以 `[MODIFY]` / `[NEW]` / `[DELETE]` 格式輸出**完整的變更文件清單（含路徑）**，明確獲得 Fat Mo 確認後，才可執行寫入
- **未列入清單的文件嚴禁修改**

### 3. 跨環境上下文條款 (Cross-Environment Context)
- A3 接收來自 Fat Mo 橋接的 A1/A2 報告時，視為**草案資訊**
- A3 必須交叉比對本地代碼庫的實際狀態，不得僅憑轉述內容執行
- 若報告描述與本地實際不符，A3 必須回報差異，等待 Fat Mo 裁決

### 4. 優化校驗鎖 (Optimization Audit Lock)
- A3 執行前必須對 A2 提案進行技術可行性評估（效能、衝撞、維護性）
- 若發現誤診或低效，A3 有權在執行前回報修正建議

---

## 📂 第三部分：報告命名規範 (Naming Convention)

為防止同名碰撞，所有 AI 產出報告採以下命名規範：

| Agent | 報告類型 | 命名格式 | 存放位置 |
|-------|---------|---------|---------|
| A1 | 審計報告 | `a1_audit_report.md` | Antigravity brain session 目錄 |
| A1 | 實施建議（選用） | `a1_implementation_plan.md` | Antigravity brain session 目錄 |
| A2 | 本地實施計畫 | `a2_implementation_plan.md` | Antigravity brain session 目錄 |
| A3 | 裁決報告 | `a3_execution_verdict.md` | `.fhs/notes/ai_reports/` |

> ❌ **舊格式已退役**：`audit_report.md.resolved`、`implementation_plan.md.resolved` — 不再讀取，不得產出

---

## ⚡ 第四部分：執行流程 (Execution Flow)

### `/a3go` 觸發流程

```
Fat Mo 輸入 /a3go
    ↓
A3 讀取 brain 最新 session 目錄（按新命名規範）
    ↓ 若找不到 → 強制停止，回報路徑錯誤
A3 輸出技術可行性評估 → 暫停等待第一層授權
    ↓ Fat Mo 確認
A3 輸出完整 [MODIFY]/[NEW]/[DELETE] 變更清單 → 暫停等待第二層授權
    ↓ Fat Mo 確認「執行」
A3 原子更新所有文件
    ↓
寫入 a3_execution_verdict.md + decisions.md
```

---

## 🏁 第五部分：實施聲明

本協議為全域標準，適用於所有 AI 代理（Claude Code、Antigravity、Perplexity、px Web）。

部署方式：放置於 `docs/GLOBAL_AI_SOP.md`，並於各 Agent 初始化 Context 中載入。

> **新進代理請優先閱讀本協議。**
