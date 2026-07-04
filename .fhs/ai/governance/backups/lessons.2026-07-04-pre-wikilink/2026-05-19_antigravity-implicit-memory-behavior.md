# Lesson: Antigravity implicit memory 行為特性

**日期**：2026-05-19

## 核心教訓

1. **文件層修復 ≠ implicit memory 修復**
   AI 指令文件（SOP_NOW.md、橋接版）的修改只能封閉「文件讀取觸發路徑」。Antigravity 的 implicit memory（.pb 二進位檔）是獨立的行為驅動層，無法透過修改文件檔案觸及。

2. **A2 能引用規則卻違反規則**
   A2 能正確背誦 AGENTS.md 的 Rule 3.11、L98-L112，卻在實際對話中不執行 /execute 授權閘門。這說明「知道規則」和「執行規則」在 implicit memory 中是分離的。

3. **GEMINI.md 機制不存在（已驗證）**
   A2 自述「支援 GEMINI.md 雙層載入」是 implicit memory 產生的幻覺。實際測試（建立測試標記 → 新 session → 未出現標記）確認機制不存在。**永遠用行為測試驗證 AI 自述，不要直接採信。**

4. **implicit memory 殘留問題的實際上限**
   文件層修復後，A2 的問題行為從「主動讀取 SOP_NOW.md → 執行待辦」降低為「從 IDE 開啟檔案推斷工作意圖」。後者是 Antigravity 功能特性，不是 bug。接受此殘留風險，靠使用習慣管理。

## 驗證方法紀錄

- **GEMINI.md 測試**：在專案根目錄建立 `[GEMINI_LOADED]` 測試標記 → 開新 session → 問「你好」→ 未出現標記 → 機制不存在
- **行為觀察法**：開新 session → 問「你有沒有 .md 寫入的規則？」→ A2 能引用 AGENTS.md 寫入工具規範但完全沒提 /execute 授權閘門 → 確認 implicit memory 缺失
