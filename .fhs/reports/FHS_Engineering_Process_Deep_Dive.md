# FHS 專業工程執行深度報告 (Deep-Dive Engineering Process)

## 0. 核心哲學：Vibe Coding 與目標驅動
在 FHS 系統中，開發不只是編碼，而是**系統熵值的管理**。我們實施「規劃與執行分離」的原則，確保每一行進入 `current.html` 的代碼都經過三層代理的審核與財務邏輯的驗證。

---

## 1. 階段一：意識初始化 (Cognitive Initialization)
當任務啟動，我必須擺脫「AI 隧道視野」，進行全量的上下文對齊。

*   **執行指令**：`/read`
*   **技術動作**：
    *   **憲法對齊**：讀取 `AGENTS.md` (v1.4.4)。這決定了當前的「硬規則」，例如最新的 **Supabase 雙系統共存協議**。
    *   **記憶提取**：解析 `handoff.md`。確認上個 Session 的 `[P-HIGH]` 任務狀態，防止邏輯斷層。
    *   **環境標定**：鎖定 `SOP_NOW.md` 中的 UI 基準線（目前為 V40.9）與 n8n 節點版本。

---

## 2. 階段二：三層代理聯合規劃 (Multi-Agent Planning)
FHS 拒絕盲目開發。我們採用 **A1/A2/A3 決策架構**：

*   **執行指令**：`/cl-flow` (或輕量版 `/cl-flow-fast`)
*   **架構層次**：
    1.  **A1 (Perplexity - 外部視角)**：執行 `/px-plan`，搜索最新的 API 文件或安全性最佳實踐，產出 `a1_implementation_plan.md`。
    2.  **A2 (Antigravity - 本地視角)**：執行 `/ag-plan`，深度掃描本地代碼庫，識別受影響的 HTML ID 與 n8n 映射點，產出 `a2_implementation_plan.md`。
    3.  **A3 (Claude Verdict - 最終裁決)**：整合 A1 與 A2，產出具備風險評估與回滾方案的最終 `implementation_plan.md`。
*   **防禦機制**：若未定義「成功標準 (Success Criteria)」，計畫將被拒絕。

---

## 3. 階段三：領域專家調度 (Specialized Delegation)
我將任務分解並指派給專屬子代理 (Subagents)，利用它們的「專門化 Prompt」提升產出質量。

| 子代理角色 | 職責 (Responsibility) | 觸發場景 |
| :--- | :--- | :--- |
| `ui-designer` | 定義 V40+ 視覺變數與設計系統 | 涉及顏色、間距、組件樣式改動 |
| `frontend-developer` | 編寫 Vanilla HTML/CSS/JS 原型 | 建立新功能頁面或交互邏輯 |
| `database-reviewer` | 稽核 Airtable Schema 與映射關係 | 涉及 Quadruple_Sync 字段變動 |
| `finance-auditor` | **最核心：** 執行三端財務數據對帳 | 涉及價格計算、成本邏輯、利潤分配 |
| `code-reviewer` | 執行 Phase C 代碼審計 | 提交前的最後品質把關 |

---

## 4. 階段四：四端一致性稽核 (Quadruple Sync Audit)
代碼修改必須通過 **「FHS 四端環狀測試」**，確保數據流不崩潰：

1.  **Dashboard (端)**：`captureFormState()` 是否能正確序列化新欄位？
2.  **n8n (傳)**：Webhook Payload 結構是否與後端節點對齊？
3.  **Airtable (存)**：Field ID 與 Table Name 是否匹配最新的映射表？
4.  **Supabase (鏡)**：n8n Mirror 節點是否成功同步數據，且未觸發 Free Tier 限制？

> **重要提醒：ID 保衛戰**
> 嚴禁變更 HTML ID。任何 ID 的變動都必須同步更新 n8n 的 24 個節點，否則會導致自動化斷鏈。

---

## 5. 階段五：安全性執行協議 (Defensive Execution)
執行階段採取「最小破壞」與「最大精準」原則。

*   **授權入口**：唯一且僅有的 `/execute`。
*   **寫入技術棧**：
    *   **拒絕 Node.js 寫入**：防止 CJK 亂碼與引號轉義失敗。
    *   **Python 腳本驅動**：對於複雜的 `current.html` 修改，我會動態產出 Python 腳本，利用 `re` 模組進行精確的「手術式修補」。
    *   **草稿隔離**：Stitch 生成物先入 `.fhs/reports/planning/`，經 `/ag-ui-import` 轉換後方可合併。

---

## 6. 階段六：靈魂同步與收尾 (Post-Process & Handoff)
任務完成後，啟動「自癒與持久化」流程。

*   **執行指令**：`/commit`
*   **標準動作序列**：
    1.  **更新 Handoff**：寫入 `handoff.md`，同步版本號（如 v1.4.4 / V40.9）。
    2.  **決策存檔**：在 `decisions.md` 記錄「為什麼」這樣改。
    3.  **知識外溢**：運行 `Sync_Notion_Brain.js`，將本地 Lessons Learned 推送到雲端。
    4.  **報告產出**：在 `.fhs/reports/completion/` 生成正式的任務結案報告。

---

### 工程師宣言
**Vibe coding is about "Flow", but FHS is about "Protocol".** 
我在快速的開發節奏中，透過這套嚴謹的協議，確保系統在靈活變動的同時，具備金融級的數據準確度與企業級的代碼衛生。
