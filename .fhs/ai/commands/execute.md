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
   觸發條件（任一）：新增 / 刪除 / 移動任何檔案或目錄；或任何檔案用途 / 定位改變
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

   **[D] 稽核宣告格式**
   完成稽核後，僅輸出「成立」的項目及已執行的同步動作。
   未觸發的條件不輸出，保持收尾精簡。
   若三項均不成立，輸出：「後效同步稽核完成：A/B/C 均不觸發。」
   若同步動作執行失敗，立即暫停並提示 Fat Mo，不得靜默跳過。

   **[E] Subagent 使用稽核（每次 /execute 均必填）**
   無論是否使用 subagent，每次完成後必須在交付摘要及 handoff.md session 條目末尾附上以下格式：

   ```
   **Subagent 使用記錄**
   | 項目 | 內容 |
   |------|------|
   | Router 建議 | `<subagent_name>` 或「無建議」 |
   | 實際使用 | ✅ `<name>` — 委託：`<task>` 或 ❌ 未使用（原因：`<reason>`） |
   | 遵從 Router | ✅ 遵從 / ❌ 未遵從（原因：`<reason>`） |
   ```

   填寫規則：
   - Router 建議欄：從 session 啟動時的 `[FHS Router]` hook 輸出取得建議的 subagent 名稱
   - 實際使用欄：若使用了 Agent tool 則填 ✅ + subagent 名稱 + 委託摘要；若未使用則填 ❌ + 理由（如「直接修復更高效」「任務不需要 subagent 能力」）
   - 遵從 Router 欄：若 Router 建議的 subagent 實際有被啟用，則 ✅；否則 ❌ + 理由
