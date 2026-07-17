# .fhs/notes/ — 決策、待辦與報告

本資料夾存放 Freehandsss Dashboard 專案的運行記錄、設計決策與 AI 分析報告。

| 檔案/資料夾 | 用途 |
|---|---|
| `SOP_NOW.md` | **系統喚醒起點**：由 `/read` 指令調用，同步當前狀態 |
| `decisions.md` | **架構決策紀錄**：記錄「為什麼」這樣改，維護技術債備忘 |
| `knowledge-map.md` | **知識檢索路由表**：查「舊知識/決策/教訓該去哪找」，按檔案類別非個別檔案（2026-07-05 S144 新增） |
| `fatmo-ops-quickcard.md` | **Fat Mo 人讀操作速查卡**：日常操作/召喚詞速查，harness 內建能力+FHS 指令核心集（2026-07-16 S176 新增，決策 D39） |
| `todo.md` | **任務清單**：當前 Pending 任務與未來計畫 |
| `session-log.md` | **對話日誌**：記錄每次 session 的達成事項與交接點 |
| `ai_reports/` | **AI 分析報告區**：存放長篇深度分析或優化提案 |
| `completion_reports/` | **任務完工記錄**：`/execute` 成功後的正式結案報告 |
| `pending_tasks/` | **掛起任務**：待續行或需跨 Session 追蹤的任務細節 |

> ⚠️ 修改任何業務規則或架構前，必須同步更新 `decisions.md`。

---

## 版本同步標準

單一真相來源模型（AGENTS.md 為頂層權威，各檔案 `compatible_with` 追隨）現行版本見 `.fhs/ai/AGENTS.md` frontmatter；標準化 frontmatter 格式定義見 `.fhs/reports/FHS_Documentation_Audit_Phase_3.5_20260516.md`（Phase 3.5 審計，2026-05-16 建立）。（2026-07-05 移除本節原有的 v1.4.5 時期靜態快照表，該表已隨憲法層版本遞增而過時，避免重複維護。）
