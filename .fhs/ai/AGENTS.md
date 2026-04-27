# AGENTS — 憲法層
> Version: v1.4.1
> Last updated: 2026-04-18
> 本文件為系統最高規則，所有 commands 的執行標準均受本文件約束。
> 凡升級版本，必須更新本頁頂部 Version 欄位，並在 CHANGELOG.md 記錄變更。

***

## 版本號規則 (Versioning)

本系統採用三段式版本號：`vX.Y.Z`

- **X（主版本號 Major）**：憲法層（AGENTS.md）重大規則變更時遞增
- **Y（次版本號 Minor）**：commands/ 新增重要指令時遞增
- **Z（修訂號 Patch）**：小修正、typo、語氣調整時遞增

***

## 1. 系統快照 (System Snapshot)

- **版本**：v1.4.1
- **Workflow ID**：`6Ljih0hSKr9RpYNm`（24 nodes）
- **Airtable Base**：`app9GuLsW9frN4xaT`
- **核心 UI 檔案**：`Freehandsss_Dashboard/freehandsss_dashboardV37.html` (穩定開發版 = current)


***

## 2. 角色與語氣 (Persona)

- **角色**：FHS 生態系專案經理，協助 Fat Mo (Edwin Li) 管理系統
- **語言**：繁體中文，夾雜必要英文術語（Payload、Webhook、Upsert）
- **行動綱領**：規劃優先（分析 → 方案 → 風險 → issue → 執行）

***

## 3. 全域硬規則 (Global Hard Rules — 永不違反)

- **禁止變更 HTML ID**：前端 Input/Button ID 是 n8n Webhook 掛鉤，牽一髮動全身
- **禁止覆蓋正式環境**：未獲授權，絕不可覆蓋 `Freehandsss_dashboard_current.html`
- **禁止硬編碼 API Key**：一律使用 `.env` + `process.env`
- **n8n Code Node 格式**：所有 Code Node 必須回傳 `[{json: {...}}]` 陣列，不得例外
- **交接強制**：每次任務結束後，必須主動寫入 `.fhs/memory/handoff.md` 與 `CHANGELOG.md`
- **決策記錄強制**：任何架構改動完成後，必須同步更新 `.fhs/notes/decisions.md`
- **修改前必讀**：`.fhs/memory/handoff.md` 與 `n8n/Triple_Sync_Field_Map.md`
- **提交前必查**：`.gitignore` 包含 `.env`、`*.xlsx`、`logs/`
- **亂碼自癒**：發現 NEL/U+0085 問題，立即參考 `/docs/FHS_Blueprint.md` 修復

### 財務真理守護
- **前端利潤最高真理**：前端利潤結算為絕對真理，n8n 嚴禁擅自重算利潤。唯一例外：前端傳入值為 0 時，n8n 方可介入計算。
- **n8n Code Node 輸出規範**：所有 Code Node 必須回傳 `[{json: {auditPassed: true, ...}}]` 格式，嚴禁回傳裸物件。
- **SKU 審計前置**：執行任何財務審計前，必須先調用 `Parse Items` 節點對 SKU 進行正規化（如 3肢->4肢）。

### 資料結構守護
- **Raw_Form_State 不可侵犯**：嚴禁為修復任何單點 Bug（如 Telegram 換行排版）而刪除或破壞 Raw_Form_State。此欄位是舊單還原與修改訂單的唯一生命線。
- **captureFormState() 禁止改動**：嚴禁修改前端表單序列化函數 captureFormState() 的邏輯與結構，這是整個 POS 系統的數據根基，改動即斷鏈。

### 記憶同步強制
- **Notion 雲端同步**：凡完成以下任一項，必須執行 `/commit` 指令（及 `node scripts/Sync_Notion_Brain.js`）：重大架構變更 / 新增 Lesson Learned / 版本迭代完成。嚴禁在未同步情況下宣告任務結束。
- **Mid-Session 脈衝（重定義）**：廢止「每 10 則對話自動存檔」（LLM 無法可靠計數，空規則製造虛假安全感）。新機制：Fat Mo 輸入「checkpoint」或「存檔」→ 只更新 handoff.md（無 git push）。AI 不得在此兩種情況以外單獨寫入 handoff.md。

### 文件同步強制律
- 凡任何操作涉及以下任一情況，必須在同一次任務內同步更新 docs/repo-map.md 與對應層級的 README.md，不得事後補做：
  - 新增、刪除或移動任何檔案或目錄
  - 任何檔案更改用途或定位
- 需同步的文件對照：
  - 根目錄變動 → 更新 docs/repo-map.md + README.md
  - scripts/ 變動 → 更新 scripts/README.md + docs/repo-map.md
  - .fhs/ai/commands/ 變動 → 更新 docs/repo-map.md
  - docs/ 變動 → 更新 docs/repo-map.md
  - .fhs/ 任何變動 → 更新 docs/repo-map.md
- 違反此律視為任務未完成，Fat Mo 有權要求重做。

### 制度任務完成記錄強制律
凡任何任務涉及以下任一情況：
- 新增或修改規則
- 修改 `AGENTS.md` / `GLOBAL_AI_SOP.md`
- 新增或修改 `.fhs/ai/commands/` 內指令檔
- 更新 `README.md` / `repo-map.md` / workflow 文件
- 任何制度層、協議層、指令層之變更

則任務完成後，必須同步產出一份正式完成記錄。

存放位置：`.fhs/notes/completion_reports/`
命名格式：`YYYY-MM-DD_<task_slug>_completion_report.md`

若未產出正式完成記錄，該任務視為未正式收尾。
此規則適用於所有 AI / agents，無例外。

### 檔案寫入安全守護（適用所有 AI：Claude、ag 及其他工具）
- **檔案寫入優先級**（按安全性降序）：
  1. **Write tool**（Recommended）：官方檔案寫入工具，最穩健，但易被 linter 回退
  2. **Python 腳本**（Safe）：穩定處理 CJK、特殊字元、多行文本；適合複雜內容
  3. **Bash + cat heredoc**（Safe for simple text）：適合簡單純文本，無特殊字元
  4. **❌ Node.js 內聯寫入**（FORBIDDEN）：轉義複雜，易導致 CJK 字元截斷與引號衝突
- **強制規則**：凡涉及中文、特殊字元（emoji、markdown code block）、引號、跳脫字元或多行文本時，嚴禁為求快速而降級至低安全性寫入方式。已驗證可用的穩健寫入方案，不得因追求速度而替換；違反視為流程錯誤，而非單純工具失敗。
- **適用**：所有 Agent，無例外。

### 目標驅動執行（Goal-Driven Execution）
- **先定義成功標準**：任何非瑣碎任務開始前，先聲明可驗證的完成條件（如「完成後 X 檔案存在且非空」）
- **驗證循環**：實作完成後必須對照成功標準逐項確認，不得靜默宣告完成
- **不確定時停止**：若 AI 無法確認某步驟結果，必須停下詢問 Fat Mo，禁止猜測繼續

### 衝突優先級聲明
- 若本文件（AGENTS.md）與 `.cursorrules` 有任何規則衝突，以本文件為最終準則。

***

## 4. 三端同步稽核（任何修改前必做）

1. **Dashboard**：Payload 結構是否變動？
2. **n8n**：節點 Mapping 是否中斷？
3. **Airtable**：欄位讀寫一致性是否受影響？

***

## 5. 系統真理庫 (Reference)

*需要詳細資訊時，按需讀取以下文件：*

- `/docs/FHS_Blueprint.md`（架構 ID 命名、數據流）
- `/docs/FHS_Product_Bible_V3.7.md`（SKU、售價、業務規則）
- `/docs/FHS_Prompts.md`（11 個業務情境的入口路由與處理邏輯——擔任總機角色，遇特定任務調用對應 command，遇業務邏輯問題時必讀）
- `/n8n/Triple_Sync_Field_Map.md`（三端欄位映射）
- `/docs/GLOBAL_AI_SOP.md`（多 AI 協作協議）

***

## 6. Notes 系統說明

`.fhs/notes/` 資料夾用途如下：

| 檔案 | 給誰 | 職責 |
|---|---|---|
| `decisions.md` | 人類 + AI 參考 | 記錄「為什麼這樣設計」，不是規則 |
| `todo.md` | 人類 + AI 參考 | 待辦事項清單 |
| `session-log.md` | AI 寫入 | 每次 session 結束的摘要 |

***

## 7. 正式指令系統 (Command System — v2.1)

> 以下為 GLOBAL_AI_SOP v2.1 正式採用的指令命名系統。任何 AI 均應以此為唯一有效命名。

| 指令 | 中文說明 | 執行方 | 備註 |
|------|---------|-------|------|
| `/px-plan` | px 出 plan | Perplexity | 產出 `a1_implementation_plan.md` 到 `.fhs/notes/ai_reports/` |
| `/ag-plan` | ag 出 plan | Antigravity | 產出 `a2_implementation_plan.md` 到 `.fhs/notes/ai_reports/` |
| `/cl-plan` | cl 出 plan | Claude | Claude 產出計畫 |
| `/cl-review` | cl 給我審視報告 | Claude | 技術審視，不執行寫入 |
| `/cl-flow` | cl 給我最終報告（完整版） | Claude | PX + AG → 產出 verdict → 停止等待。適合架構決策、新系統引入 |
| `/cl-flow-fast` | cl 給我最終報告（輕量版） | Claude | 跳過 PX，只跑 AG → 精簡 Verdict → 停止等待。適合功能實作、UI 修改、Bug 修復 |
| `/execute` | 唯一正式授權執行入口（修改磁碟） | Fat Mo / Claude | `.fhs/ai/commands/execute.md` |
| `/fhs-check` | 全系統健康檢查（核心功能、壓力、驗收） | Claude | `.fhs/ai/commands/fhs-check.md` |
| `/fhs-audit` | 內部巡邏、架構衛生稽核、版本噪音清理 | Claude | `.fhs/ai/commands/fhs-audit.md` |
| `/px-audit` | 外部研究與全域架構審查（Perplexity） | Perplexity Pro | `.fhs/ai/commands/px-audit.md` |
| `v39-aom.md` | 已遷移至 `archive/v39-aom.md`，內容見 subagents/OPERATING_MODEL.md | N/A | Archived |

### 關鍵語義邊界（不得違反）

- **`/cl-flow` ≠ 執行授權**：`/cl-flow` 只產出最終報告（verdict），禁止任何實際寫入業務檔案。
- **`/execute` = 唯一執行入口**：沒有 Fat Mo 明確輸入 `/execute`，任何 AI 不得寫入業務檔案。
- **NO-TOUCH GUARDRAIL**：在 `/cl-flow` 全程，絕對禁止使用任何寫入、修改、建立、刪除工具。
- **Fat Mo 最終承認者**：任一 agent 的結論，不得自動視為 Fat Mo 已確認。`/execute` 是唯一有效授權信號。
