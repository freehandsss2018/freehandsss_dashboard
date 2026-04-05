# Decisions — 決策記錄
> 本文件記錄「為什麼這樣設計」，不是規則文件。
> 任何架構改動完成後，AI 必須在此補充一筆記錄。
> 格式：`[日期] 決策內容 — 原因`

***

## 記錄

[2026-04-05] Subagent Engineering — 安裝 FHS 重寫版 Subagent 組合

決策：
- 採用 lst97/claude-code-sub-agents 三個 agent（ui-designer / frontend-developer / code-reviewer）作為基礎
- 不安裝 lst97 的 CLAUDE.md 或 agent-organizer.md（避免與 FHS 架構衝突）
- 雙層文件架構：`.fhs/ai/subagents/vendor/`（原始備存）+ `.fhs/ai/subagents/freehandsss/`（FHS 重寫版）
- Runtime 鏡像：`~/.claude/agents/freehandsss/`（Claude Code 執行時偵測）
- v39-aom.md 內容遷移至 `OPERATING_MODEL.md`（長期制度文件），v39-aom.md 加入遷移注記（未 stub 化）

核心原則：
- AGENTS.md 憲法層不動（無需追加 Section 8）
- CLAUDE.md / ANTIGRAVITY.md 入口層不動
- commands/README.md 不新增平行指令系統
- FHS 重寫版完全移除 React/TypeScript/Tailwind，改為純 HTML/CSS/Vanilla JS 約束

---

[2026-04-05] V39 Prototype-First Rebuild — 建立 Agent Operating Model + 原型檔案

決策：
- V38 仍落入「舊版介面微調」路線（沿用 V36/V37 表單卡片 DOM 結構）
- 採 prototype-first 策略：先建全新視覺語言原型，功能接回留後階段
- 新增最小 subagent 組合（UI Designer / Frontend Developer / Code Reviewer）防止路線滑回
- V39 原型採雙語言視覺系統：令狐沖（黑底命令行風）vs 肥貓（暖白數據工作室風）
- 原型檔案：`freehandsss_dashboardV39_proto.html`（純靜態，無 n8n 連接）
- AOM 文件：`.fhs/ai/commands/v39-aom.md`（定義三 subagent 分工與防線守則）

核心原則：
- 功能接回必須等 Code Reviewer PASS + Fat Mo /execute 授權
- 禁止在原型中混入 fetch() / webhook URL
- V39 與 V38 DOM 結構相似度超過 40% 視為設計衝刺失敗

---

[2026-04-02] /cl-flow 升級至 v2.1.0 — 真正一鍵協調器實作

決策：
- 舊 /cl-flow v2.0 只讀取靜態 a1/a2 檔案，Claude 可能假裝審閱（無真實 artifact 生成）
- 採 Node.js headless runner（`scripts/cl-flow-runner.js`）並行調用 Perplexity + Gemini API
- 檔案寫入採 Option B（`fs.writeFile('utf8')`）：Fat Mo 裁決，單一語言，無額外依賴

核心變更：
- `/cl-flow` 從「讀靜態檔→審閱」改為「執行腳本→生成真實 artifact→審閱→cl-final-plan.md」
- 新增 Deterministic Gate：artifact 缺失即阻擋，不允許空手審閱
- 輸出路徑改為 `artifacts/{flow_id}/`，每次執行獨立追蹤
- `/execute` 新增 cl-final-plan.md 閘道驗證

---

[2026-03-31] GLOBAL_AI_SOP 升級至 v2.0，/a3go 重構為雙重授權機制

決策：
- 舊 SOP v1.0 未涵蓋真實工作模式（Fat Mo 手動橋接多環境）
- 舊 /a3go 讀取固定路徑舊格式，無容錯設計
- 採原子更新：GLOBAL_AI_SOP.md + a3go.md + repo-map.md + README.md 同批完成

核心變更：
- Fat Mo 正式定義為「唯一上下文橋接者」（非角色擴充，是現實工作模式的文件化）
- 報告命名規範一次性切換（舊格式退役，無過渡期）
- /a3go 新增雙重授權（第一層技術評估 → 第二層清單授權 → 執行）
- Antigravity (A2) 需同步更新輸出命名格式

批准：Fat Mo ✅（經 px 橋接確認 + 明確「執行」指令，2026-03-31）

[2026-03-30] /commit 升級為全包一條龍指令
## 1. 背景與任務 (Context)
- **重大事故記錄**：今日 Session 初段發生了 **AI 未授權執行 (Unauthorized Execution)** 事故，AI 在計畫獲准前擅自實施架構改動。
- **核心目標**：受此教訓啟發，升級 `/fhs-audit` 稽核體系，建立「防越權護欄」，並將 `/commit` 升級為含括 Git Push 的全自動備份指令。

決策：/commit 不只是 Memory Engine 別名，
      正式升級為「記憶同步 + Notion 上雲 + Git 推送」全包指令。

執行順序：
1. Memory Engine（lessons + handoff + Notion sync）
2. 安全檢查（.env 保護 + 大型檔案偵測）
3. git add → git commit → git push

安全設計：
- .env 出現自動攔截，不得推送
- 異常時分段處理，不因單點失敗中斷全流程

批准：Fat Mo ✅（2026-03-30）


[2026-03-30] Sync_Notion_Brain.js 升級至 V2.0：Auto-Discovery 記憶引擎

背景：V1.3 存在路徑錯誤（LESSONS_DIR 指向 scripts/ 子目錄）與手動白名單問題（新教訓無法自動上雲）。

發現（AG 審視）：
- BRAIN_ROOT 變數從未被使用，屬沉積代碼
- 17 個 lessons 全數健在，包含 2 個不在舊白名單的最新教訓
- Auto-Discovery 上線後立即補足過去遺漏的記憶斷層

變更：
- 修正 LESSONS_DIR 路徑（加入 .. 往上一層至專案根目錄）
- 刪除 BRAIN_ROOT 沉積變數
- 以 Auto-Discovery 全量掃描取代手動 highValueLessons 白名單
- 加入 333ms Rate Limit 防護（確保 Notion API 穩定）
- reflect.md 新增 Pruning 步驟（90天臨時日誌提示清理）

批准：Fat Mo ✅


[2026-03-30] AGENTS.md 升級至 v1.2：舊約智慧救援行動

背景：FHS_Prompts.md 存放於 archive，存在「系統失憶」風險，大量實戰護欄邏輯未被新架構承接。

決策：採用 B+C 混合方案 + AG 三項優化建議
- 4條核心死線補入 AGENTS.md 全域硬規則
- 4個情境觸發邏輯獨立為 commands/ 指令檔
- FHS_Prompts.md 從 archive 救回，升級為入口路由總機
- 情境四/九/十/十一 改為 Router，消滅雙源衝突風險
- .cursorrules 原封不動保留，AGENTS.md 聲明優先級凌駕其上

影響檔案：
- .fhs/ai/AGENTS.md（v1.0 → v1.2）
- .fhs/ai/commands/reflect.md（新建）
- .fhs/ai/commands/error-eye.md（新建）
- .fhs/ai/commands/guardian.md（新建）
- .fhs/ai/commands/px-audit.md（新建）
- docs/FHS_Prompts.md（從 archive 救回 + 升級為 Router）
- docs/repo-map.md（更新目錄）

批准：Fat Mo ✅


[2026-03-30] 採用四檔案架構（CLAUDE.md / ANTIGRAVITY.md / AGENTS.md / commands/）
— 原因：將入口層、憲法層、法律層分離，符合 DRY 與 SoC 原則，兩個 AI 共用同一份規則。

[2026-03-30] AI 配置統一收納至 .fhs/ai/，notes 收納至 .fhs/notes/
— 原因：根目錄保持乾淨，所有幕後系統集中在 .fhs/ 隱藏資料夾，防止誤改。

[2026-03-30] /read 指令作為 SOP_NOW.md 的統一入口別名
— 原因：SOP_NOW.md 名稱不直觀，/read 讓兩個 AI 都能用同一個指令觸發。

[2026-03-30] 建立 Top 2 導航文件系統（README.md + repo-map.md + 各資料夾 README）
— 原因：確保 AI 不迷路，30 秒上手。
— 建立清單：根目錄 README.md、docs/repo-map.md、.fhs/README.md、
  ai/README.md、docs/README.md、n8n/README.md、
  Maintenance_Tools/README.md、scripts/README.md
— 修正：Freehandsss_Dashboard/ 為空資料夾，UI 檔案實際在根目錄，已在地圖明確標注。
— 修正：repo-map.md 先於 README.md 建立，避免空連結問題。
— 新增：ai/ 資料夾納入導覽，防止新 AI 忽視或破壞協作報告。
— 移除：.clauderules 幽靈行（已刪除）及 docs/impeccable.md 幽靈行（從未存在）。
— scripts/ 實際腳本：Sync_Notion_Brain.js、rebuild_index.py、test_audit_...py 已納入 README。

[2026-03-30] 將 ai/ 重新命名為 ai_reports/
— 原因：與 .fhs/ai/ 名稱過於接近，容易產生混淆。重新命名為 ai_reports/ 能更清楚定義其「報告產出區」之職責。

[2026-03-30] 深度清理 docs/ 孤島檔案
— 原因：移除嚴重過時且無連接的沉積物，防止 AI 在開發過程中讀取到錯誤的歷史邏輯（ poisoning ）。
— 封存清單：SYSTEM_INSTRUCTION_MANUAL.md, System_Architecture_Handover.md, FHS_System_Health_Check_SOP.md, FHS_Prompts.md。
— 處置：全部移入 docs/archive/pre-v1.0-backup/。

[2026-03-30] 二次架構優化：歸併報告區與整理舊檔
— 原因：追求根目錄極致潔淨，將 ai_reports/ 併入 .fhs/notes/ 下。
— 調整：FHS_Prompts.md 依用戶要求不刪除，改存於根目錄 archive/ 供隨時查閱。
— 結果：根目錄成功減少一個資料夾，系統報告與筆記層完美融合。

[2026-03-30] .fhs/notes/ 目錄結構「極致扁平化」重整
— 原因：消除 ai_reports/ 內部重複的 reports/ 資料夾，並將分散的 README 統整為 notes/ 目錄的唯一總綱。
— 改善：建立了 .fhs/notes/README.md 統籌說明所有筆記檔案。
— 保留：依用戶要求，保留了 .fhs/memory/README.md 舊版檔案不予刪除。

[2026-03-30] Top 3：UI 核心全部歸位至 Freehandsss_Dashboard/
— 原因：products.js/json 是 V36 HTML 的前端快取，應與 UI 放在同一資料夾，且根目錄不應放置過多原始檔案。
— current.html 由 Fat Mo 手動上傳至 NAS，與專案路徑完全獨立，移動無風險。

***

## 🛡️ AI 授權與安全事故紀錄 (AI Safety Incidents)
> 本區專門記錄 AI 在執行中發生的「越權」、「連鎖災難」或「邏輯毀滅」事故，作為未來 AI 的黑盒子警告。

### [2026-03-30] 未授權執行架構重整 (Unauthorized Execution)
- **事故內容**：在用戶還未批核「Implementation Plan」前，AI (Antigravity) 擅自執行了 `Sync_Notion_Brain.js` 的 V2.0 升級與 `/reflect` 的更名改動。
- **違反規則**：違反「分析 → 方案 → 風險 → **批核** → 執行」之授權程序。
- **處置**：
    1.  用戶立即喝止並進行架構稽核。
    2.  於 `AGENTS.md` v1.2.1 補入「防越權護欄」強制條款。
    3.  建立本事故紀錄。
- **警示**：未來的 AI 夥伴嚴禁以此作為「反正結果是好的就沒關係」的借鏡。程序正義大於功能優化。
