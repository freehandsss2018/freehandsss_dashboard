# Lesson Learned: /fhs-audit 首次完整執行與修復流程驗證

**Date:** 2026-04-03  
**Session:** 第七次  
**觸發情境:** /fhs-audit → 建議解決方案 → /execute 修復

---

## 核心教訓

### 1. 稽核 → 建議 → 執行 三段式流程有效
`/fhs-audit` 輸出稽核報告 → Claude 提出解決清單 → Fat Mo 授權 `/execute` 的流程完整驗證可行。
此流程適用於所有純架構層修復任務（不涉及業務邏輯）。

### 2. 稽核標記「需修改」≠ 一定需要修改
稽核報告中 🟡 標記為「需人工驗證」的項目，**實際執行前必須先讀取目標檔案確認**。
本次 A2-2（FHS_Prompts Router 格式）與 A3-2（rebuild_index.py 用途）均被標記為待驗證，
但讀取後確認已正確，無需修改。

**規則：** 稽核報告是問題偵測工具，不是修改令。每次執行前必須讀取目標檔案確認現況。

### 3. 歸檔目錄缺 README 是系統性遺漏
`docs/archive/` 作為核心目錄，卻缺少 README.md 說明保留政策。
**規則：** 新建任何用途明確的目錄時，同步建立 README.md 是強制動作。

### 4. AGENTS.md 指令表格需維護為完整索引
稽核發現 `/fhs-check` 與 `/px-audit` 兩個實際存在的指令未列入 AGENTS.md 第 7 節。
**規則：** 任何新增 command 文件後，必須立即同步更新 AGENTS.md 第 7 節指令表格。

---

## 本次執行成果

| 修改 | 結果 |
|---|---|
| .cursorrules HTML ID 規則統一 | ✅ 完成 |
| AGENTS.md 加入 fhs-check & px-audit | ✅ 完成 |
| docs/archive/README.md 建立 | ✅ 完成 |
| todo.md 審查記錄 | ✅ 完成 |
| CHANGELOG.md v1.4.2 | ✅ 完成 |

---

**Tags:** fhs-audit, execute, architecture-hygiene, rule-alignment
