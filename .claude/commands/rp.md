---
description: 將原始問題重寫為結構化 XML Prompt，並分析改寫效果 (Claude Code Bridge)
---

# /rp (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/rp.md](/.fhs/ai/commands/rp.md)

### 簡化流程：
1. 提取 `/rp` 後面的原始問題文字
2. 重寫為 XML Tag 結構化 Prompt（context / objective / constraints / expected_output）
3. 分析改寫的結構改善點（2–4 點）
4. 輸出去 Tag 的純文字版本供直接使用

### 防守檢查：
- ✅ 不修改任何專案檔案
- ✅ 不執行任何 shell 命令
- ✅ 純文字輸出，無副作用
