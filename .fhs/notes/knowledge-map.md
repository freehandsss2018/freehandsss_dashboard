# Knowledge Map — 知識檢索路由表

> ⚠️ **與 `docs/FHS_Knowledge_Map.md` 不同**（命名相近，2026-07-05 `/fhs-audit` S145 標註）：本檔是 **AI 查詢路由表**（按檔案類別，回答「這類問題該去哪找」）；`docs/FHS_Knowledge_Map.md` 是 **Obsidian wikilink 圖譜索引**（給 Graph View 用，人類視覺化導覽）。兩者職責不重疊，互不取代。
>
> **用途**：回答「這個舊知識/決策/教訓該去哪找」，不是「規則本體」。
> **維護規則**：只在**新檔案類別誕生**時加一行（預期頻率~每季）；**禁止**列個別檔案/日期——那是路由表自己會漂移的病灶，見 [[../ai/governance/01_diagnosis]]。
> Added: 2026-07-05（Session 144，知識工作流程健檢 M1'）

---

| 我想找… | 去這個類別（按檔名/日期 Grep，不要全讀） |
|---|---|
| 某個架構決策「為什麼」這樣定 | `.fhs/notes/decisions.md`（Grep 決策關鍵詞或 D 編號） |
| 某個 session 具體做了什麼、怎麼驗收的 | `.fhs/reports/completion/YYYY-MM-DD_*_completion_report.md`（Grep 檔名日期/slug） |
| 某個功能的逐版本變更歷史 | `Changelog.md`（Grep 版本號或關鍵詞） |
| 某個踩過的坑、避雷方法 | `.fhs/memory/learnings.md`（Pattern/Pitfall/Preference 三類） |
| 工具/harness 環境怪癖（非業務財務邏輯） | auto-memory 索引 `MEMORY.md`（外部路徑，見 `.fhs/tools/fhs-health-rules.json` 的 `auto_memory_dir`） |
| 某次 `/cl-flow` 規劃全過程（PX/AG/Verdict） | `artifacts/{flow_id}/`（按資料夾日期時間戳） |
| 當前系統現況快照（版本/待辦/驗證狀態） | `.fhs/memory/handoff.md` 頂部便攜塊（只讀前120行） |
| 制度層規則怎麼運作（派工/模型/巨檔紀律） | `.fhs/ai/governance/00_INDEX.md` 先查索引再進對應章節 |
| 某條 session 的逐條敘事（誰做了什麼、按時間序） | `.fhs/notes/session-log.md`（Grep session 編號，只窗口讀） |
| 自己（AI）用量模式、哪些 prompt 該做 skill/hook | `/fhs-usage-audit`（審 transcript 行為，與文件衛生 `/fhs-slim` 正交），快照見 `.fhs/memory/usage-audit/` |
| V42 排版鐵律（rowspan 對齊/字體/Loader/quick-jump pill） | `.fhs/ai/skills/ui-ux-pro-max/FHS_INTEGRATION.md` Section 六（唯一明文居所；業務背景則在 auto-memory，session 自動載入不需查詢） |

**判準**：查到的是「當前狀態」→ 便攜塊；查到的是「怎麼做/怎麼派工」→ governance；查到的是「過去某次事件的完整來龍去脈」→ 對應完成報告或 decisions.md；查到的是「反覆驗證的通則」→ learnings.md。四者互不重疊，找錯類別是最常見的查詢失敗模式。

## 外部框架吸收書籤（2026-07-07，S152）

| 資源 | 用途 |
|---|---|
| `artifacts/2026-07-07-1851-skills-research/` | 十大 coding-agent skills 框架原文研究筆記+統一裁決表（00-verdict-summary.md） |
| Awesome Agent Skills（VoltAgent/awesome-agent-skills，1,497+ skills 索引） | 通用 skill 目錄查找；治理/財務/POS 類已確認查無 |
| Vercel web-interface-guidelines（`ui-ux-pro-max/FHS_INTEGRATION.md` Section 五） | 框架無關前端品質規則全表 |
