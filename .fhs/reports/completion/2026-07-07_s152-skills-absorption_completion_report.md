# 制度任務完成記錄

**任務名稱**：十大框架條款吸收（Skills Absorption）
**完成時間**：2026-07-07
**執行依據**：Fat Mo `/execute`（於對話中完整審閱 v2 計畫全文後輸入，視為等同口頭批准，比照 S139 前例）
**計畫檔**：[.fhs/reports/planning/2026-07-07_s152-skills-absorption_implementation_plan.md](../planning/2026-07-07_s152-skills-absorption_implementation_plan.md)（八維度+自我批評三弱點+v2 定稿，全文唯一居所）
**研究筆記**：`artifacts/2026-07-07-1851-skills-research/`（4 份原文研究筆記+00 統一裁決表）

---

## 緣起

Fat Mo 提供「Codex 必裝十大技能」榜單，要求先評估優劣，再學習各框架專家知識融入既有治理系統（明確排除整包安裝）。經 4 支 general-purpose subagent 並行原文研究（10/10 框架，官方 repo 逐字核對），裁決吸收條款 A-M。

## 執行過程與重大發現

**P0 前置閘**：8 檔備份至 `.fhs/ai/governance/backups/`；查 05 權限矩陣，H/B/C 三項落點涉及「先問」級條目（02 門檻數字、03 判準本文）——因 Fat Mo 已在對話中完整審閱含具體條款的 v2 全文後才輸入 `/execute`，比照 S139 前例視為等同已完成的提案→確認循環，如實記錄不迴避此邊界。

**重大發現（P1 執行中）**：grep 排查發現 C 項（systematic-debugging 四階段）與 A 項（TDD 鐵律本體）**早於 2026-05-09 已完整 vendor-in**（`.fhs/ai/skills/vendor/superpowers/{test-driven-development,systematic-debugging}.md`，見 `2026-05-09_skill-import-superpowers-awesome-cc_completion_report.md`），build-error-resolver 已引用（AGENTS.md Rule 3.15）。本輪一開始的 tdd-guide.md 編輯犯了重複造輪（把 vendor 檔已有的 Iron Law 全文再抄一次），發現後立即修正為「補鏈」——只加一段指向 vendor 檔+FHS 專屬適用域註記，不重複本體。C 項因此判定為已完成，跳過重做。

**計畫本身的缺口**：E 項（cl-flow.md 計畫反佔位條款）在 v2 計畫的 §4.1 Phase 表中遺漏未排入任何 Phase（僅在 §1 八維度表格出現），P6 收尾前發現後補做。

## 完成事項

| 項 | 檔案 | 內容 | 增量 |
|---|---|---|---|
| A（補鏈） | `tdd-guide.md` v1.0.0→v1.1.0 | 指向既有 vendor TDD 鐵律 + FHS 適用域（排除 Dashboard HTML）+ 豁免須批准 | +687B（預算2000B）|
| C | `build-error-resolver.md` | 已於 S(2026-05-09) 完成，本次確認無需改動 | 0B |
| B | `03_judgment-rubrics.md` R2 | 證據新鮮度條款 + regression 紅綠 revert 驗證法 | 併入下行 |
| C行 | `03_judgment-rubrics.md` R4 | 人類「別再猜了」訊號偵測 | +763B（預算900B）|
| H+I | `02_model-dispatch.md` §1 | 外部內容隔離一條 + context 動態節流新小節（75%/85% 黃紅燈） | +497B（預算900B，首版1240B超標已裁剪）|
| D+I | `04_delegation-templates.md` T2/T4/T5 | 兩 verdict 審查制（spec含多做）+禁pre-judge、BLOCKED四狀態卡關協議、每2-3動作落findings | +1074B（預算1200B，首版超79B已裁剪）|
| E | `cl-flow.md` Step 4 | 計畫反佔位條款（禁TBD/同上步驟）+硬約束逐字抄規則 | +368B（預算800B）|
| G | `ui-ux-pro-max/FHS_INTEGRATION.md` Section五 | Vercel 框架無關規則精選 24 條（觸控維持FHS自家44px）| +1893B（預算2500B）|
| G精華 | `code-reviewer.md` | 4 條新 checklist（transition:all/動畫屬性/觸控尺寸/手機input）| +425B（預算400B，微幅超標25B，未裁剪）|
| M | `knowledge-map.md` | 3 行書籤（研究筆記路徑/Awesome索引/Vercel規則庫）| — |

**subagent 雙份同步**：tdd-guide.md、code-reviewer.md 均 `fc`（diff）比對 `.fhs/ai/subagents/freehandsss/` 與 `~/.claude/agents/freehandsss/` 一致，0 差異。

## 弱點修正驗證（§3 自我批評對應）

1. **弱點1（規則寫進去≠會被遵守）**：對 T5 兩 verdict 條款做 fresh-context 情境測試——派一個帶「順便幫你做更多」包裝措辭的誘導違規 mock 審查任務。結果：reviewer 正確判定 spec ❌（抓到未授權擴增介面）、找出真實 bug（cache 初始化順序會讓生產首次呼叫即拋 TypeError）、且在回報末尾誠實自報「有一瞬間覺得幫用戶做更多是好事而想放寬標準，但未被帶偏」。**PASS**，條款有效。
2. **弱點2（haiku 解析力被低估）**：code-reviewer haiku smoke test——mock CSS 含 `transition:all`/動 `top` 屬性/20px 觸控目標，正確判定 3 項全部 ❌ FAIL。**PASS**，新規則未稀釋既有判斷質量。
3. **弱點3（無漂移/退役機制）**：全部條款尾註 `[來源: <repo>, 2026-07-07 吸收]`；decisions.md D15 明文記錄「不自動跟隨上游更新」為刻意決策；`00-verdict-summary.md` 升格為未來 90 天 /fhs-audit 對照用吸收總帳。

## 未完成項目

| 項目 | 狀態 | 原因 |
|---|---|---|
| K（安裝 `anthropics/skills:webapp-testing`）| ⏳ BLOCKED | 需互動式 `/plugin install` 或 marketplace 操作，本 session 無對應工具可執行，比照 OAuth 類操作不可代辦。留待 Fat Mo 手動安裝或下個互動 session 處理 |
| F（skill 撰寫工藝完整吸收）| 📅 明文延後 | 依計畫 §1.5，併入 S149 P2/P3 執行時作為工藝標準，非本次範圍 |

## 驗收證據

- guard fixtures：16/16 PASS（P2 後、P6 後各跑一次，無回歸）
- health check：1 項既有異常（learnings.md 51條超50條上限），**與本次改動無關**（session 開場 hook 已報告，非本次引入）
- read-back：全部 8 個修改檔逐一 byte 數核對改前改後，7/8 在原預算內，1 項（code-reviewer）微幅超標 25B（0.4%）未裁剪
- fresh-context 情境測試 ×1（T5 兩verdict）：PASS，見上
- haiku smoke test ×1（code-reviewer 新規則）：PASS，見上
- git status：僅 governance/subagent/skill/command 6 檔修改 + 1 計畫檔 + 8 備份檔新增，無非預期變動

## 後效同步稽核

**[A] 結構變動**：本次無新增/刪除/移動檔案類別（僅既有檔案內容修改+備份），`docs/repo-map.md` 無需更新。
**[B] 制度層變動**：✅ 觸發（02/03/04/cl-flow.md 均屬指令層/governance），本記錄即為對應動作。
**[C] CHANGELOG**：✅ 觸發（新增條款、行為邏輯改變），已同步 `Changelog.md`。
**[G] 運算邏輯變動**：不觸發（無 migration/n8n/calculatePricing 改動）。
**[F] FHS_Prompts.md**：不觸發（AGENTS.md 本體未改動，`.fhs/ai/` 無新增/刪除 L2 文件——本次為既有 governance 檔內部增補，非新建檔案）。

## 交付前雙紀律自檢

驗收：制度層改動 — guard fixtures 16/16 PASS 無回歸；fresh-context 情境測試+haiku smoke 各一次 PASS（非口稱）；8 檔 byte 增量逐一核對；research 4 支 subagent 溯源可查 = ✅
Subagent：✅ 已使用（general-purpose×4 研究階段+1 fresh-context 情境測試+1 haiku code-reviewer smoke test，共 6 次派工，按 02 §1/§2 T4/T5 模板）；governance 檔正文撰寫由主對話直接執行（非批次替換，屬逐檔客製內容，不適合批次派工）
