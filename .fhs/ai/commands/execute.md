# /execute

**用途 (Purpose)**：唯一准許執行修改代碼的指令。授權 A3 (Claude) 根據 Verdict 報告正式執行實作。
**對應 Agent**：A3 (Claude Code 專用指令)
**Added in**：v2.0 (2026-03-31)

---

## 預期行為 (Expected Behavior)

1. **執行前確認**：
   - 確認 Fat Mo 明確發出 `/execute` 指令（不可由 AI 自行串接調用）。
   - **若前序為 `/cl-flow` 流程**（有 `artifacts/` 資料夾）：
     - 找出最新的 `artifacts/{flow_id}/cl-final-plan.md`
     - 確認 `state.json` 中 `execution_status: "locked"` 已就位
     - 確認 `cl-final-plan.md` 中 Verdict 為 `APPROVED_READY` 或 Fat Mo 明確口頭批准
     - 不得重新規劃，不得重跑 PX 或 AG
   - **若前序為舊版 `/cl-flow` 流程**（無 artifacts/）：
     - 確認 `.fhs/reports/planning/a3_execution_verdict.md` 存在且非空。

2. **執行約束 (Strict Execution)**：
   - 重新列出準備修改的檔案。
   - **僅執行** Verdict 報告中已批准的內容，禁止超範圍修改。
   - 逐階段回報進度，不得靜默完成。

   **2.4 Safety Boundaries for Refined Prompts**
   若執行 payload 源自 `/rp` 重寫後的提示：
   - AI 必須在執行前明確宣告 `<original_auth_scope>`（基於用戶原始訊息劃定）
   - 修改邊界必須嚴格符合 `<original_auth_scope>`，任何側道擴展（如「順便重構無關模組」）均嚴禁
   - `/rp` 精煉提示只能讓表達更清晰，不得擴大授權範圍

3. **完成後動作**：
   - 執行完畢後，確保符合三端守護原則。
   - 若為重大更新，需提醒 Fat Mo 是否要進行 `/commit`。

4. **後效同步稽核 (Post-Execution Sync Audit)**：

   每次 `/execute` 完成後，必須逐項核查以下三個觸發條件。
   條件成立 → 對應同步為強制；未完成 = 任務不得視為正式收尾。

   **[A] 結構變動稽核**
   觸發條件（任一，以 git status 物理特徵為準）：
   - 新增任何檔案（git status 顯示 `?? <path>` 或 `A  <path>`）
   - 刪除任何檔案（git status 顯示 `D  <path>`）
   - 移動任何檔案（git status 顯示 `R  <old> → <new>`）
   → 強制更新 `docs/repo-map.md`
   → 強制更新對應層級 `README.md`

   **[B] 制度層變動稽核**
   觸發條件（任一）：修改 `AGENTS.md` / `GLOBAL_AI_SOP.md` / `.fhs/ai/commands/` 內任何指令檔 / `README` / `repo-map` / workflow 文件 / 任何制度層、協議層、指令層之變更
   → 強制在 `.fhs/reports/completion/` 產出正式完成記錄
   → 命名格式：`YYYY-MM-DD_<task_slug>_completion_report.md`

   **[C] CHANGELOG 稽核**
   觸發條件（任一）：版本號變更 / 流程語義變更 / command 行為邏輯改變 / 重大制度規則變更 / 會影響未來使用方式的行為調整
   → 強制更新 `CHANGELOG.md`
   ⚠️ 純 typo、純文案潤飾、非語義性重寫，不觸發

   **[G] 運算邏輯變動稽核**
   觸發條件（任一，以 diff 物理特徵為準）：
   - `supabase/migrations/*.sql` 含 `CREATE OR REPLACE FUNCTION` 或財務欄位語義變動
   - n8n Calculate/Mirror 節點代碼變動（透過 `mcp__n8n-mcp-server__update_node_code`）
   - Dashboard `calculatePricing` 或財務相關 JS 函式修改
   - `cost_configurations` 表資料值變動
   → 強制同步更新 `.fhs/notes/FHS_System_Logic_Overview.md` 對應章節
   → 核查 `.fhs/ai/skills/finance-gatekeeper/SKILL.md` 路由表是否需加行
   → 稽核宣告須附「G 觸發：已更新 §X」

   **[D] 稽核宣告格式**
   完成稽核後，僅輸出「成立」的項目及已執行的同步動作。
   未觸發的條件不輸出，保持收尾精簡。
   若四項均不成立，輸出：「後效同步稽核完成：A/B/C/G 均不觸發。」
   若同步動作執行失敗，立即暫停並提示 Fat Mo，不得靜默跳過。

   **[E] 雙紀律自檢（每次 /execute 均必填，Rule 3.17）**
   無論是否使用 subagent，每次完成後必須在交付摘要及 handoff.md session 條目末尾附上以下格式：

   ```
   【交付前雙紀律自檢】
   驗收：[任務型對應驗證 + 結果 PASS/FAIL/不適用+具體理由]
   Subagent：[前置評估了什麼 + 派了誰/沒派 + 理由]
   ```

   驗收行有效標準（任務型分流，詳見 AGENTS Rule 3.17）：
   - 財務/成本 → `finance-auditor` live 三端，附訂單號（口算/口稱 = 無效）
   - 文件治理 → ≤2 跳盲測（3 問）或斷鏈數 = 0 附 log（「已完成」無證據 = 無效）
   - 代碼/HTML → `code-reviewer` G1–G8 Gate 報告（肉眼確認 = 無效）
   - n8n → execution log 或 `trigger_test_execution` log（未觸發測試 = 無效）
   - 純文件搬移 → 引用同步清單（N 個檔各一行確認）
   - 純規劃 → 「待 /execute；驗收於執行後」

   Subagent 行填寫規則：
   - 記錄前置評估結果（哪些 subagent 被考慮 + 為何用/不用）
   - 若使用了 Agent tool 則填 ✅ + subagent 名稱 + 委託摘要
   - 若未使用則填 ❌ + 理由（如「直接修復更高效」「任務不需要 subagent 能力」）

   **[F] FHS_Prompts.md 同步稽核（每次 /execute 均必查）**

   觸發條件（任一成立即強制執行）：
   - `AGENTS.md` 新增任何 Rule
   - `.fhs/ai/commands/` 有增刪
   - `.fhs/ai/` 新增或刪除 L2 文件
   - 核心業務語義修正（財務術語定義 / 產品身份定義 / §0 規則改變）

   執行動作：
   → 稽核 `docs/FHS_Prompts.md` 對應情境，補觸發詞或新增情境
   → 更新 `compatible_with` + `last_updated` + `最後稽核: S[session號]`
   → 在交付摘要中記錄「[F] 觸發：已更新」或「[F] 不觸發：[理由]」

   ⚠️ [F] 未執行或「最後稽核」未更新 = 任務不得視為正式收尾（與 [B] 同等強制力）
