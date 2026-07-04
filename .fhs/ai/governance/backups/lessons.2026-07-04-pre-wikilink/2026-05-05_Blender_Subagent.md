# FHS Lesson - 2026-05-05: Blender 3D Modeler Subagent Architecture

## 📋 任務背景
為了將心形手模建模的複雜 Python 腳本（Boolean, Cleanup, Shelling, Z-slice）標準化並實現 AI 自動化執行，我們需要建立一個專屬的 Subagent。

## 💡 關鍵教訓 (Learnings)

### 1. 工具執行權限 (Tool Execution Capability)
- **問題**：原本考慮使用 `skill` 存放知識，`subagent` 負責邏輯。但發現 `skill` 僅為 RAG 知識庫，無法直接執行 Blender MCP 工具。
- **解決方案**：採用 **Single-file Embedded Architecture**。將 Python 建模配方直接寫入 subagent 的系統提示詞（System Prompt）中。
- **優點**：Subagent 具備完整的 Context 並能直接呼叫 `blender.execute_python`，減少跨檔案調用失敗的機率。

### 2. 模型選擇的影響
- **觀察**：只有具備工具權限的模型（如 `claude-3-5-sonnet`）才能有效操作 Blender MCP。
- **規範**：在 `MANIFEST.md` 中明確標註該 agent 需使用 sonnet 系列模型。

### 3. Python 配方封裝化
- **實踐**：將常用的 Blender 操作封裝為具備變數參數的 Python Template，能大幅提升 AI 寫代碼的成功率。
- **配方清單**：
  - K1: Manifold Boolean
  - K2: Debris Cleanup (Area-based)
  - K3: Shell Thickness (Offset)
  - K4: Z-slice Analysis (Volume calculation)

## 🛠️ 未來優化建議
- 如果配方數量超過 10 個，應考慮將配方抽離至 `.fhs/ai/recipes/` 目錄，並在 subagent 中使用 `view_file` 讀取，以節省 Token 消耗。

---
**Status**: 🚀 Deployed & Verified
**Related Flow**: 2026-05-05-2300
