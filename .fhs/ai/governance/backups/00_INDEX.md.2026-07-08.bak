# FHS Governance — 索引

> **建立**：2026-07-04（Session 137，Fable 5 立制度 session）
> **目的**：把高階模型的調度判斷力外化成弱模型（Sonnet 等級）可執行的制度。
> **載入方式**：按 `CLAUDE.md` 路由表情境載入單檔，**不要一次全讀**（那正是 01 診斷的 token 洩漏模式）。

| 檔案 | 內容 | Version | 狀態 |
|---|---|---|---|
| [[01_diagnosis]] | Harness 診斷：token 洩漏 / 失焦 / 出錯 前三名 + 修法依據 | v1.0.1 | ✅ 2026-07-04（含對抗審查修正）|
| [[02_model-dispatch]] | 模型調度守則：指揮官不下場、派工三件套、model 對照表、升降級、驗證不自驗 | v1.0.2 | ✅ 2026-07-04（S140 §7 追加 3 條）|
| [[03_judgment-rubrics]] | 判斷力外化：升級/完成/問人/換路/品質底線 五組 rubric，每條附正反例 | v1.0.1 | ✅ 2026-07-04（S140 追加 2 條反例）|
| [[04_delegation-templates]] | 派工 prompt 模板 ×5（搜尋/實作/重構/研究/審查），填空即用 | v1.0.1 | ✅ 2026-07-04（含對抗審查修正）|
| [[05_maintenance-protocol]] | 維護協議：權限矩陣、教訓落點、精簡觸發、備份規則 | v1.0.0 | ✅ 2026-07-04 |
| [[06_letter-to-future-sessions]] | 給未來 session 的信：三件最重要的事 + 制度退化模式與預防 | —（信件體） | ✅ 2026-07-04 |
| `.fhs/ai/governance/backups/` | 修改既有檔案前的備份副本（帶日期） | — | — |

**與既有制度的關係**（誰管什麼，不重疊）：
- `AGENTS.md` = 憲法：業務硬規則（財務真理、HTML ID、raw_form_state、平台定位）。governance 不重複、不凌駕。
- `.fhs/ai/commands/` = 指令層：任務流程（/cl-flow、/execute、/commit…）。governance 管的是「怎麼派工、怎麼驗收」，與流程正交。
- [[learnings]] = 領域教訓（FHS 業務/技術 pitfall，50 條上限）。**調度/流程層教訓不寫那裡**，寫 [[02_model-dispatch]] §7 實戰修正錄（分工詳見 [[05_maintenance-protocol]]）。
- `~/.claude/.../memory/`（auto-memory）= Claude Code 自動記憶，跨 session 個人層。與 governance 檔重疊時以 governance 檔為準（可被 review，auto-memory 不可）。
