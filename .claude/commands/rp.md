---
description: 將原始問題重寫為結構化 XML Prompt，並分析改寫效果 (Claude Code Bridge)
---

# /rp (Claude Code Bridge)

> **引導說明**：本檔案為橋接版，實際邏輯定義在 Master 檔案。

**執行步驟**：
請立即讀取並嚴格遵循以下 Master 指令定義：
[/.fhs/ai/commands/rp.md](/.fhs/ai/commands/rp.md)

## 三變體簡化流程

**`/rp [task]`（標準）**：

1. 識別模式（標準 vs Pipe）
2. 重寫為 XML（context / objective / constraints / architecture_scan 8維度 / expected_output）
3. `<structural_warning>`（有問題才出現，無問題省略）
4. 不輸出純文字版，XML 即供審閱格式

**`/rp cl-flow [task]`（Pipe 乾式組裝）**：

1. 同上 1–3
2. 額外輸出「cl-flow-ready 簡報」後停止（乾式，不自動觸發 cl-flow）

**`/rp cl-flow-fast [task]`（輕量）**：

1. 精煉 + 輕掃描，跳過 structural_warning 判斷
2. XML 精簡版後停止

> 若要自動串聯管道，請改用 `/rp-flow` 系列指令。

## 防守檢查

- ✅ 不修改任何專案檔案（絕對禁止）
- ✅ 不執行任何 shell 命令
- ✅ Pipe 模式必須在開頭標示：`【模式：pipe → <指令名>，不自動執行】`
- ✅ conflict / token / history 三維度強制標 [相關]
- ✅ 輸出守則永遠生效：不奉承、不軟化、不套模板
