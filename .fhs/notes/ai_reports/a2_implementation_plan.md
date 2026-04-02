# A2 Implementation Plan: Architecture Hygiene Execution (AG-Plan)
**Date:** 2026-04-03
**Agent:** A2 (Core Planner / Antigravity)

## 1. 目標與範圍 (Goal & Scope)
落實 2026-04-03 稽核報告中提出的 5 項建議，優化系統衛生並統一指令路由。

## 2. 擬議修改檔案清單 (Proposed Changes)

### 2.1 刪除與清理 [CLEANUP]
*   **[DELETE]** `repomix-output.txt` (根目錄沉積檔)
*   **[MOVE]** `.fhs/ai/commands/a3go.md` -> `docs/archive/commands/a3go.md`
*   **[MOVE]** `.fhs/ai/commands/reflect.md` -> `docs/archive/commands/reflect.md`

### 2.2 文件更新 [MODIFY]
*   **[MODIFY]** `docs/repo-map.md`:
    - 加入 `.claude/` 資料夾描述。
    - 加入 `.fhs/notes/ai_reports/` 與 `.fhs/notes/completion_reports/`。
*   **[MODIFY]** `scripts/README.md`:
    - 移除已不存在的 `test_audit_0695346.py`。
*   **[MODIFY]** `docs/FHS_Prompts.md`:
    - 升級版本至 v1.3。
    - 新增 **【情境十二：全自動規劃流 (/cl-flow)】**。
    - 更新【情境九】對 `/commit` 指令的描述（移除 reflect 引用）。

## 3. 實施步驟 (Implementation Steps)

1.  **Phase 1: 檔案物理清理** (刪除與移動)。
2.  **Phase 2: 文檔同步更新** (repo-map 與 scripts README)。
3.  **Phase 3: 路由協議升級** (FHS_Prompts v1.3)。

## 4. 驗證與自查 (Verification)
*   執行 `ls` 確認 `repomix-output.txt` 已消失。
*   檢查 `FHS_Prompts.md` 版本號與連結是否正確。
*   執行一次 `/read` 確認新路由加載正常。

---
**Status:** `READY_FOR_EXECUTION`
**Notice:** 本計畫需等待 Fat Mo 核准後，透過 `/execute` 執行。
