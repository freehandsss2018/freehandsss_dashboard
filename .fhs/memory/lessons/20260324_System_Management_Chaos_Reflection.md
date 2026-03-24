# 深度反思：20260324 系統管理混亂與防禦計畫 (System Management Chaos)

## ❌ 亂象成因剖析 (Root Cause of Chaos)
1. **版本號幻覺 (Version Hallucination)**：
   - 之前在某些會話中，AI 錯誤地將 V34 推導為 V43，並在 `Changelog.md` 中留下了大量虛假的 V43 紀錄。這源於 AI 未能在任務開始前「錨定」日誌中的真實版本序號，而是憑藉模糊的遞增邏輯進行推測。
2. **上下文斷裂 (Context Fragmentation)**：
   - 在多個會話（Cursor / Antigravity / Claude）交替時，AI 對「單一真理來源」的尊重度降低。例如在修復問號問題時，僅優先解決「可讀性」，卻忽視了「內容完整度」，這是一種「應及式思維」而非「架構式思維」。
3. **工具副作用與非標準字元注入 (NEL/Truncation/Typo/Mojibake/Sync)**：
   - **Notion 同步遺漏 (Sync Omission)**：雖然 `FHS_Prompts.md` 提及了 Notion 同步，但 AI 在執行時將其視為「非阻塞動作」或「Session 結尾動作」，導致在單次 Task 結束時未主動觸發。這反映了對「三端對齊（本地-後台-雲端）」中「雲端端」執行優先級的認知不足。
   - **V35.html 大規模損毀 (Mojibake)**：這源於 `patch_pricing.py` 中的 `latin-1` 回退陷阱。
   - **人為/遞迴錯誤**：在重構 `Changelog` 時發生截斷錯誤（Smart-），在還原 `Blueprint` 時保留了拼寫錯誤 (Dashbaord)。這反映了在「大容量遷移」時缺乏對邊界字元的二次稽核。

## 🛡️ 防止再發方案 (Prevention Plan)

## 🎓 AI 協同深度學習總結 (Learning Synthesis)

1. **編碼即憲法 (Encoding is Law)**：
   - **痛點**：絕對不能將 `latin-1` 作為回退讀取。它是字元損毀的根源。
   - **學會**：讀取中文文件失敗時應主動報錯，而非私自回退至單位元編碼。所有寫入必須顯式宣告 `utf-8` 並使用二進位模式校驗。
2. **錨定事實而不腦補 (Anchoring vs. Guessing)**：
   - **痛點**：AI 易產生版本號遞增的「偽邏輯」（如 V34 -> V43），造成日誌斷裂。
   - **學會**：日誌文件是時間線的唯一真理。動手前先讀日誌，嚴禁憑「模糊記憶」跳號開發。
3. **質重於量，完整即安全 (Completeness equals Safety)**：
   - **痛點**：在災難恢復中，AI 傾向於「寫出能跑的東西」，而非「找回原有的東西」。
   - **學會**：規則文件的縮水（119 -> 14 行）是比亂碼更嚴重的事故。必須建立「行數稽核」機制。
4. **字元潔淨度監控 (NEL/Zombie Code)**：
   - **痛點**：看不到的控制碼（U+0085）會引導 AI 產生解析偏移。
   - **學會**：將「非法字元掃描」納入重大更新後的標準驗收程序。

## 🛡️ 未來 AI 執行 SOP (Mandatory AI Protocol)
> [!IMPORTANT]
> 1. **任務啟動**：先 Grep `Changelog` 目標版本。
> 2. **規則變更**：讀取 `.cursorrules` 宣告現有協議。
> 3. **文件恢復**：對比歷史 Archive 與當前文件的 `?` 數量比例及行數。
> 4. **完成存檔**：確認無以 `-` 或 `?` 結尾的異常字元。

### 1. 「日誌錨定」協議 (Changelog Anchoring)
- **硬性規定**：任何任務（Task）啟動、任何版本更迭前，AI **必須**先讀取 `Changelog.md` 最後 20 行。
- **目標**：物理確認當前真實版本號 (Current Version: V35.0)，嚴禁擅自跳號或重建平行分支。

### 2. 「靈魂恢復」完整度稽核 (SOUL Fidelity Audit)
- **硬性規定**：當 `.cursorrules` 或 `FHS_Prompts.md` 受損需還原時，AI 必須：
  - 執行「全域歷史挖掘」(Global History Mining)。
  - 比對還原後的文件行數是否接近 **119 行 (Rules)** 與 **10 個場景 (Prompts)**。
  - 若差異巨大，必須主動警示用戶，嚴禁以「輕量化/重編」替代「恢復」。

### 3. 「三端存活」定期巡邏 (Periodic Patrol)
- **硬性規定**：每當完成一個 Milestone，AI 應執行一次全域巡邏，檢查：
  - 檔案編碼是否仍為 UTF-8。
  - `Changelog.md` 是否維持嚴格的倒序邏輯。
  - 有無產生 `*.old`, `*.bak` 等冗餘檔案夾雜於工作區。

### 4. 編碼守衛 (Encoding Guard)
- **硬性規定**：所有文件寫入操作必須強制使用 Python 腳本並顯式宣告 `encoding='utf-8'`，全面棄用 PowerShell 的 `Set-Content`。

---
*Fat Mo，以上協議已正式寫入 `lessons/` 與 `.cursorrules` 的防線。我會以「全端架構稽核員」的身分嚴格執行。*
