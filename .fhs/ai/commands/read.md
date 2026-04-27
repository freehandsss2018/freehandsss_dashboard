# /read

**用途 (Purpose)**：初始化 AI 記憶體，進行環境與進度同步。
本指令是 `/.fhs/notes/SOP_NOW.md` 的統一入口別名，
讓 Claude Code 與 Antigravity 都能用同一個指令觸發。
**Added in**：v1.0
**Updated**：2026-04-25（路徑防守機制）

---

## 執行步驟（嚴格順序）

### 步驟 1：路徑驗證（防守機制）
檢查以下檔案是否存在，**按優先級順序**：
1. `/.fhs/notes/SOP_NOW.md` ← **主路徑**（必須存在）
2. `/.fhs/notes/handoff.md` ← 上次 session 狀態（可選）
3. `/.fhs/memory/MEMORY.md` ← 持久記憶索引（可選）

若主路徑檔案不存在，停止執行並回報確切位置。

### 步驟 2：讀取與同步
按以下優先級讀取（忽略不存在的檔案）：
1. `/.fhs/notes/SOP_NOW.md` — 系統快照與初始化需求
2. `/.fhs/notes/handoff.md` — 上次 session 交接狀態
3. `/.fhs/ai/AGENTS.md`（前 100 行）— 確認憲法版本號

### 步驟 3：狀態輸出
輸出純文字報告，包含：
- ✅/❌ 各檔案讀取狀態（SOP_NOW / handoff / AGENTS）
- 當前憲法版本號（如 v1.4.1）
- 當前 UI 穩定版本（如 V37 / V40）
- 當前 n8n Workflow ID（6Ljih0hSKr9RpYNm）
- 未解決的待辦項（若 handoff.md 存在）

---

## 防守機制（避免重複此問題）

**禁止假設檔案位置**：
- ❌ 不要猜測根目錄是否有 `SOP_NOW.md`
- ✅ 必須先檢查 `/.fhs/notes/SOP_NOW.md` 是否存在
- 若不存在，回報確切路徑與 git 歷史建議

**異常處理**：
- 若 `/.fhs/notes/SOP_NOW.md` 不存在：
  ```
  ❌ SOP_NOW.md 未找到於 /.fhs/notes/SOP_NOW.md
  檢查 git 歷史…
  ```
- 若其他檔案不存在：略過，不中斷流程

---

## 副作用 (Side Effects)
- 是否寫檔：**否**
- 是否修改現有檔案：**絕對禁止**
- 是否執行 shell 命令檢查路徑：**允許**（git log / find）
