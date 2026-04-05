# Lesson: FHS Subagent Engineering — lst97 Agent 整合經驗

**日期**：2026-04-05
**任務**：將 lst97/claude-code-sub-agents 三個 agent 整合進 FHS 架構

---

## 關鍵教訓

### 1. 雙層文件架構是正確策略
vendor/（原始備存）+ freehandsss/（重寫版）+ runtime mirror 三層分離，
讓 rollback 只需刪除 `~/.claude/agents/freehandsss/`，不影響任何專案文件。

### 2. /cl-flow 多輪 review 的價值
本次經歷：初版 → v2 修訂（4項修正）→ Pre-Execution Test → /execute。
每輪 review 都發現了真實問題（v39-aom.md 直接 stub 風險、rollback 路徑誤寫 `~/.fhs/`）。
高風險制度任務值得多輪 review，不是浪費時間。

### 3. 憲法層守護的實際操作
「原則不改 AGENTS.md，必要時只追加最小段落」的分級政策有效：
本次執行最終判斷無需追加 Section 8（Claude Code 可自行路由），
AGENTS.md 完全未動——符合最小侵入原則。

### 4. lst97 文件的 WebFetch 摘要問題
frontend-developer.md 和 code-reviewer.md 第一次 WebFetch 被摘要，
需第二次明確要求「verbatim output」，或改用 curl 直接取得原始內容。
**下次取 GitHub raw 文件，優先用 curl，不用 WebFetch。**

### 5. v39-aom.md 三步驟遷移有效
Step 1（建新文件）→ Step 2（加遷移注記）→ Step 3（依賴核查後降級）
比直接 stub 化安全得多。依賴核查（grep）只花 30 秒，值得做。

---

## 系統狀態

- **新增 runtime agents**：`~/.claude/agents/freehandsss/` 含 3 個可用 agent
- **可立即調用**：freehandsss/ui-designer、freehandsss/frontend-developer、freehandsss/code-reviewer
- **v39-aom.md**：已降級為 stub，制度正文在 OPERATING_MODEL.md
