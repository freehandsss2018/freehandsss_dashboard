# GLOBAL AI COLLABORATION SOP v1.0
## 🚀 3-Step 專業開發與安全協議 (Universal Edition)

本協議旨在整合 **Perplexity (外部分析)**、**Gemini/Antigravity (本地規劃)** 與 **Claude Code (精準執行)** 的優勢，建立一個安全、高效且互補的開發環境。

---

## 🏛️ 第一部分：核心角色定義 (Agent Roles)

### 1. Agent 1: The Outer Brain (Perplexity)
- **職能**：**外部分析與技術趨勢審計**。
- **邊界**：僅能存取 GitHub 上的「已同步代碼」及外部技術資料庫。
- **產出**：Markdown 格式的原始審計報告。
- **價值**：跨專案的客觀視角，防止開發者陷入局部細節。

### 2. Agent 2: The Core Planner (Gemini / Antigravity)
- **職能**：**本地優化與實施規劃**。
- **邊界**：具備本地全方位的讀取權限（.env, 歷史日誌, 私有腳本, NAS 數據）。
- **產出**：[PROPOSAL] 優化提案與 Step 3 執行指令。
- **價值**：將 A1 的虛擬方案轉化為 100% 適合當前環境的實施計劃。

### 3. Agent 3: The Executor (Claude Code)
- **職能**：**專職執行與代碼覆核**。
- **邊界**：具備最高權限的腳本執行與代碼寫入能力。
- **價值**：確保代碼最後一哩路的品質，並作為 A2 規劃方案的「技術守門員」。

---

## 🛡️ 第二部分：安全鎖與權限邊界 (Security Locks)

### 1. 執行權限鎖 (Execution Lock)
- **Agent 2 禁令**：**嚴禁直接修改專案主檔案**。所有變更必須先產出 Markdown 提案。
- **解鎖條件**：除非用戶明確下達「A3 GO」或「Hand off」指令，否則 A2 不得調用寫入工具。

### 2. 優化校驗鎖 (Optimization Audit Lock)
- **Agent 3 職責**：執行前必須對 A2 的提案進行技術可行性評估（效能、衝撞、維護性）。
- **衝突處理**：若 A3 發現 A2 的提案有誤診或低效，有權在執行前回報修正。

---

## ⚡ 第三部分：一鍵移交快捷指令 (Command Shortcuts)

為方便跨 Agent 移交，推薦定義以下別名（需在各專案的 `SESSION_INIT.md` 中引用）：

- **`A3 GO`** / **`handover A3`**
  - **實際指令 (A3 必須按此順序執行)**：
    1. 執行 `ls -lt C:/Users/Edwin/.gemini/antigravity/brain/` 取得最新 session 目錄（第一行）
    2. 讀取 `{latest_session}/audit_report.md.resolved`（A1 外部審計報告）
    3. 讀取 `{latest_session}/implementation_plan.md.resolved`（A2 本地實施計劃）
    4. **回報確認**：「已讀取 A1：[路徑] ✅  已讀取 A2：[路徑] ✅」
    5. 執行 Step 3 技術可行性評估，聚焦：Maintenance、Simplicity、Zero Conflict

---

## 📂 第四部分：文檔存儲標準 (Standard Documentation)

所有中間產物建議存儲於以下目錄：
- `/ai_audit_reports/`：存放 A3 技術評估報告（輸出端）。
- `C:/Users/Edwin/.gemini/antigravity/brain/{session-id}/`：A1/A2 報告由 Antigravity 管理於此（輸入端，勿混淆）。
- `GLOBAL_AI_SOP.md`：本協議的主體。

---
🏁 **本協議為全域標準。部署時只需將其放置於專案根目錄，並載入至各 Agent 的初始化 Context 中。**
