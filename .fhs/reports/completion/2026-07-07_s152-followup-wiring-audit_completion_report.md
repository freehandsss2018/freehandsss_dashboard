# 制度任務完成記錄

**任務名稱**：S152 接線稽核與三項裁決執行（Wiring Audit Follow-up）
**完成時間**：2026-07-07
**執行依據**：Fat Mo 明確裁決「123」（三項待裁決建議全批）
**關聯**：S152 十大框架條款吸收（[.fhs/reports/completion/2026-07-07_s152-skills-absorption_completion_report.md](2026-07-07_s152-skills-absorption_completion_report.md)）的後續補鏈

---

## 緣起

S152 完成後 Fat Mo 追問「有沒有同樣的無讀者/無觸發點/重複沉積/衝突情況」，先自查發現兩宗（ui-designer 未接 Vercel 規則、code-reviewer 重複觸控規則），已於前一輪修復。本輪派 general-purpose subagent 做全系統接線稽核，主對話對關鍵發現逐一第一手複核後，產出三項待裁決建議，Fat Mo 全批。

## 完成事項

### 1. AGENTS.md Rule 3.15 熔斷數字澄清

**問題**：憲法層寫「3 次根因假設全部失敗」，governance/02/03 已明文兩輪熔斷，弱模型易混讀為同一計數軸。
**修復**：Rule 3.15 加括號註記——「此為根因**假設迭代**次數；修復**重試**輪次仍受 `governance/02` 兩輪熔斷約束——兩者是不同軸，不可互代」。不改動數字本體，只消歧義。

### 2. `vendor/awesome-cc/hooks-setup-guide.md` 孤兒歸檔

**問題**：稽核確認無任何活文件引用（Dippy/parry hooks 從未安裝，S139 權限模式已定案）。
**修復**：`cp` 至 `.fhs/reports/backups/hooks-setup-guide.md.2026-07-07-archived.md`，原檔刪除（`git rm --cached` + `rm`）。git 歷史仍保留原檔完整記錄。

### 3. `prompt-router.js` 補三支缺漏 subagent 觸發規則

**問題**：9 支 subagent 中 finance-auditor / product-integration-validator / blender-3d-modeler 未進自動路由表，雖有其他兜底掛載點，但少了「事前提醒」層。
**修復**：新增三條路由規則。**執行中發現真實 bug**：新增規則放在陣列尾端時，因 router 邏輯是「first match wins」，「財務稽核」的「稽核」字樣被更早的 Quality Review 路由搶先攔截、「新sku」的「sku」字樣被更早的 Database 路由搶先攔截——只有 Blender 規則（無關鍵字重疊）生效。修正：把 Financial Audit 規則移到 Quality Review 之前、New Product 規則移到 Database 之前，比照既有 Complex Architecture 路由的排序註解慣例（該路由本身就有一行註解「移至 Quality Review 之前，避免『架構審查』類 prompt 被審查關鍵詞先攔截」，本次是同一模式的重現，本應在新增當下就想到，此為過程疏漏）。

## 驗收證據

- 第一手複核：`grep` 確認 router 覆蓋名單、`sed` 確認 AGENTS.md 原文、`diff` 迴圈逐一核對 9 支 subagent 雙份一致性（發現並修復 6 支 `compatible_with` 戳記漂移，已在前一輪 commit）
- router 實跑測試：5 條 prompt（3 新+2 舊）全部正確路由，含修正後的財務稽核/新SKU 兩條原本失效的規則
- guard fixtures：16/16 PASS，無回歸
- git 歷史保留：`hooks-setup-guide.md` 刪除前已 `git rm --cached`+備份，可追溯

## 後效同步稽核

**[A]** 結構變動：`hooks-setup-guide.md` 刪除 → `docs/repo-map.md` 需標記 `[已刪除，見 .fhs/reports/backups/]`（下方執行）。
**[B]** ✅ 觸發（AGENTS.md 憲法層修改），本記錄即對應動作。
**[C]** ✅ 觸發（router 行為變化），已同步 Changelog.md。
**[G]** 不觸發。
**[F]** 不觸發（AGENTS.md 修改屬既有 Rule 3.15 澄清註記，非新增 Rule；`.fhs/ai/` 無新增/刪除 L2 文件——vendor 子檔刪除不算 L2）。

## 交付前雙紀律自檢

驗收：制度層改動（AGENTS.md+router.js+vendor歸檔）— router 實跑5條測試PASS（含抓到並修復的真實bug）；guard16/16無回歸；9支subagent diff全量驗證 = ✅
Subagent：✅ 已使用（general-purpose×1 接線稽核，33次工具調用）；三項裁決修復由主對話直接執行（定點小改動，不適合批次派工）
