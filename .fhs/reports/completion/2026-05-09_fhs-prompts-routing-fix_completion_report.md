# 完成記錄：FHS_Prompts 路由修復 + AGENTS.md 強制律

**日期**：2026-05-09
**授權**：Fat Mo `/execute`（Range B）
**執行方**：Claude (A3)

---

## 任務摘要

修復路由總機 `docs/FHS_Prompts.md` 的覆蓋缺口，並在制度層加入防護，確保未來不再靜默過期。

## 變更清單

| 操作 | 檔案 | 說明 |
|------|------|------|
| MODIFY | `docs/FHS_Prompts.md` | v1.3 → v1.4：修正情境九，新增情境十三～二十 |
| MODIFY | `.fhs/ai/AGENTS.md` | 新增「FHS_Prompts.md 路由同步強制律」 |
| MODIFY | `.fhs/ai/commands/fhs-audit.md` | A4-3 改為確定性覆蓋率檢查 |
| MODIFY | `.fhs/notes/todo.md` | 關閉 V37/V39 過期條目 |
| MODIFY | `CHANGELOG.md` | 記錄本次變更 |

## 修復內容

### FHS_Prompts.md 情境九修正
舊觸發條件「每10則對話自動存檔」已在 AGENTS.md v1.4.1 廢除，但 FHS_Prompts.md 未同步更新。
→ 現已修正為「用戶輸入 checkpoint / 存檔」。

### 新增情境（十三～二十）
對應 2026-05-09 Session B 新增的 6 個指令（/tdd-guide、/debug-guide、/db-query、/five、/mermaid、/code-analysis）及原本缺失的 /fhs-cost-audit 和 /cl-flow-fast，共 8 個路由條目。

### AGENTS.md 新增強制律
在「文件同步強制律」之前新增「FHS_Prompts.md 路由同步強制律」，確保結構性防護：未來新增指令必須同步更新路由，否則任務不得視為完成。

### fhs-audit.md A4-3 強化
從「確認是否被引用」（模糊）改為「逐一對照 FHS_Prompts.md，輸出缺失路由清單」（確定性）。這樣每次 /fhs-audit 都能自動偵測路由覆蓋率。

## 驗證清單

- [x] FHS_Prompts.md 版本號已更新至 v1.4
- [x] 情境九舊規則已移除並加入廢除說明
- [x] 情境十三～二十均含觸發關鍵詞 + 執行邏輯指向
- [x] /debug-guide 與 /error-eye 的路由區分已明確標注
- [x] /fhs-cost-audit 與 情境五 的路由區分已明確標注
- [x] AGENTS.md 強制律位置正確（文件同步強制律之前）
- [x] fhs-audit.md A4-3 輸出格式已更新
- [x] todo.md 過期條目已關閉
- [x] CHANGELOG.md 已更新
