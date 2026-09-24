# AG Review (A2 — adversarial critique of A3 draft)

**Flow ID**: 2026-09-24-0651
**Generated**: 2026-09-23T22:52:59.931Z
**Model**: gemini-3.6-flash

---

## 批評 #1
- **標的**：草案第 2.4 節（真實 transcript 重播驗收）
- **Severity**：BLOCKER
- **問題**：Transcript 重播邏輯存在格式不匹配漏洞。`.jsonl` 紀錄檔內的原始條目為 Anthropic Claude API 的 `assistant` / `tool_use` JSON 結構，而 `stop-finance-auditor.js` 接收的是由 Stop Hook 觸發器（`.claude/settings.json`）構造的 Hook Payload 格式（含 `tools`、`assistant_response`、`transcript` 等特定 key）。若直接以 `evaluate()` 讀取 `.jsonl` 輸入至 Hook 測試函數，會因欄位缺失（如找不到 `payload.tools` 或結構不同）導致全數拋出 TypeError 假放行，無法真實驗證「no-signal → block」的翻轉。
- **建議**：重播腳本必須實作 `transcriptJsonlToHookPayload()` 轉換適配器，將 raw API jsonl 條目嚴格轉譯為 Stop Hook 規範 Payload 後才可傳入測試。

---

## 批評 #2
- **標的**：草案第 2.1 節（條款②寫入內容提取）
- **Severity**：MAJOR
- **問題**：Payload 解析缺乏防禦性型態檢查，存在運行時崩潰風險。`MultiEdit` 工具的 `edits` 陣列項，或非預期無效輸入（如 `new_string` 為 `null`/`undefined` 或非字串型態）時，草案直接進行字串串接與 `.includes()` 檢查，會引發 `TypeError: Cannot read properties of undefined`。在 Stop Hook 中未捕獲的例外可能導致 Hook 異常中止或邏輯失效。
- **建議**：提取 `content` / `new_string` 時必須加上型態防禦（例如 `typeof === 'string'`）及 `Array.isArray(edits)` 的安全鏈接，確保非字串輸入安全降級為空字串處理。

---

## 批評 #3
- **標的**：草案第 2.1 節（`LOG_DOCS` 比對）與第 3 節（風險 4）
- **Severity**：MAJOR
- **問題**：`LOG_DOCS` 採用純檔名末端比對 `/(decisions\.md|Changelog\.md|handoff\.md)$/i` 範圍過寬且過於脆弱。這會造成：1) 誤殺：修改專案中任意第三方套件或測試夾具內的 `decisions.md` 都會被強制套用財務攔截；2) 繞過：若路徑附帶相對路徑標記或臨時檔名（如 `.fhs/notes/decisions.md.tmp`），正則將無法準確歸一化。
- **建議**：必須先以 `path.normalize()` 歸一化路徑，並限定相對路徑必須起於 `.fhs/` 相關目錄（如 `.fhs/notes/` 或 `.fhs/memory/`）才觸發 `LOG_DOCS` 條款。

---

## 批評 #4
- **標的**：草案第 2.3 節（夾具 J5/J6 豁免邏輯）
- **Severity**：MAJOR
- **問題**：豁免標籤（`【依據：finance-auditor ...】`）的搜尋目標作用域定義模糊。草案未明確說明該標籤是從「Assistant 回覆文字（`assistant_response`）」尋找，還是從「寫入檔案的內容（`new_string`）」尋找。若寫入 `decisions.md` 的 `new_string` 包含豁免標籤但對話文字未提及，或反之對話有提及但檔內未寫，現有 Hook 會出現雙重標準判斷，導致夾具測試產生不確定性。
- **建議**：明確規範豁免標籤比對範圍（應同時或優先比對 `assistant_response`），並於夾具中分拆「對話含標籤」與「檔案內容含標籤」兩種獨立邊界測試。

---

## 批評 #5
- **標的**：草案第 2.1 節（條款②不掃 `old_string`）與第 3 節（風險 2）
- **Severity**：MINOR
- **問題**：完全排除 `old_string` 會留下「惡意/錯誤抹除財務審計紀錄」的安全盲區。若 LLM 執行一個 `Edit` 動作將 `decisions.md` 內包含 `FIN_COLUMNS` 的財務裁決段落全部清空（即 `old_string` 含財務欄位，`new_string` 為空或不含財務欄位），按此草案會判定為 `no-signal` 放行，導致關鍵財務決策被無聲刪除而不受審查。
- **建議**：對 `LOG_DOCS` 的 Edit 動作，當 `old_string` 包含 `FIN_COLUMNS` 但 `new_string` 移除該欄位時，應獨立標記為「財務紀錄變更/刪除訊號」而非直接放行。
