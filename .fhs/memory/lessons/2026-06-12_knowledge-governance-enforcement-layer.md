# Lesson: 知識治理強制執行層（Session 99-100）

**日期**：2026-06-12
**類型**：Pattern + Pitfall
**來源**：Session 99 根因分析 → Session 100 修復

---

## Pitfall（反覆踩到的雷）

**問題**：邏輯改動不觸發文件更新義務，導致「已修文件」與「已改邏輯」脫節。

Session 90/91 引入 3-layer revenue fallback 後，Session 99 再次犯同類計算錯誤（metal 混合單收入缺漏 -$56,321.90）。根因：3-layer 邏輯從未寫入任何強制讀取路徑，未來 AI 不知道它的存在。

**觸發條件**：改了 Supabase migration / RPC 函式 / 財務 JS，但沒有同步更新 SSoT 文件。

---

## Pattern（修復方案）

三層防禦同時落地：

1. **B1 強制前置讀取**：在 4 個知識入口（database-reviewer、finance-auditor、SKILL.md、Finance Bible）加入 §十按需讀取指令。
2. **B2 [G] 觸發稽核**：`execute.md` 新增 [G] 運算邏輯變動觸發，diff 命中 SQL CREATE OR REPLACE FUNCTION / n8n 節點 / calculatePricing / cost_configurations 時強制更新 SSoT。
3. **D hooks 自動捕捉**：`post-tool-kgov.js`（PostToolUse）命中時寫 flag + 注入提醒；`stop-kgov.js`（Stop）session 結束時檢查 flag（HARD_BLOCK=false 第一階段）。

**清除機制**：更新 `FHS_System_Logic_Overview.md §十` 或 `lessons/INDEX.md` 後 flag 自動清除。

---

## 誠實限制

Hook 驗「有無改動」，不驗「內容是否正確」。品質仍依賴 Rule 3.17 + 人工抽查。

> 若誤觸（非財務任務）：`rm .fhs/.kgov-pending`（Bash）或 `del .fhs\.kgov-pending`（Windows）
