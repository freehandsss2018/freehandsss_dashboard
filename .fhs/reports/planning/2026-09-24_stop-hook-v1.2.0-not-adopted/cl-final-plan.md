# Verdict — 2026-09-24-0651（D83-follow：Stop hook 補 Edit/Write 偵測）

## 1. 判決
**CONDITIONAL_READY**（BLOCKER #1 被拒絕，依規最高 CONDITIONAL_READY；拒絕有實證，見下表。Fat Mo 可派 fresh-context agent 抽查該條。）
AG 評審模型：gemini-3.6-flash（3.8-flash 兩次 503 後自動 fallback，state.json `degraded:false`，完整評審）。

## 2. 批評處理表
| 批評 | Severity | 裁決 | 證據／落點 |
|---|---|---|---|
| #1 重播需 `transcriptJsonlToHookPayload()` 轉換，否則 TypeError 假放行 | BLOCKER | **拒絕** | 前提事實錯誤。hook 並非收 `tools/assistant_response` payload：`stop-finance-auditor.js:165-167` 只從 stdin 取 `transcript_path`，再 `evaluate(readEntries(path))` 直接吃 raw jsonl 條目（`isPromptEntry/toolUses/assistantText` 本就按 `type:'user'/'assistant'`、`message.content[].tool_use` 的 API 結構寫）。夾具 runner `run-finance-stop-fixtures.js:124-` 已有 `argv[2]` 真實 transcript 重播，D83 已用同法重播 44 個 prompt 邊界並成功攔截「改和不改前端有什麼影響」輪（decisions.md L23）。無需轉換器。**吸收其合理內核**：重播驗收另加「hook 進程級」一次——把真實 transcript 截到目標輪後寫暫存檔，`spawnSync(HOOK, {transcript_path})`，確認 stdout 為 `decision:block`，證明整條 stdin→readEntries→evaluate 路徑而非只驗純函數。 |
| #2 MultiEdit/非字串輸入缺型態防禦 | MAJOR | **採納** | 落點：新增 `writtenText(tu)` 輔助：`typeof === 'string'` 才取；`Array.isArray(input.edits)` 才遍歷；其餘降級空字串。理由：`financeSignal` 內拋錯會被 L184 頂層 catch 靜默放行＝整輪偵測失效（假放行）。新增夾具 J7（`new_string:null`）、J8（`edits` 非陣列）→ 不崩且判定正確。 |
| #3 LOG_DOCS 純檔名末端比對過寬 | MAJOR | **部分採納** | 採納「限定路徑範圍」：條款②改為 `[\\/]\.fhs[\\/](notes[\\/]decisions|memory[\\/]handoff)\.md$` 或 repo 根 `[\\/](Changelog\|CHANGELOG)\.md$`（實測根目錄同時追蹤 `Changelog.md`／`CHANGELOG.md`，兩者都收），正則已跨 `\`／`/`，worktree 絕對路徑亦命中。夾具 J9：`node_modules/x/decisions.md` 與 `scripts/hooks/test/health-fixtures/…/handoff.md` → 放行（health-fixtures 已證實存在同名 handoff.md，正好是誤殺實例）。**拒絕子論點**：「`decisions.md.tmp` 會繞過」——`$` 錨定使 `.tmp` 後綴不命中，但 `.tmp` 檔本身不是目標檔，不算繞過；`path.normalize()` 亦不需要，因正則已同時接受兩種分隔符且不依賴相對／絕對。 |
| #4 豁免／依據標記作用域不明（回覆文字 vs 寫入內容） | MAJOR | **採納** | 現況：`CITES_AUDITOR`／`WAIVER_MARK` 只掃 `assistantText`（hook L133、L142），寫入 `new_string` 內的標記不計。此定義保留並明文寫入 v1.2.0 頭註。理由：若寫入內容內的標記也算，AI 可在被審查的檔案自身塞豁免＝自我放行。落點：夾具 K1（標記只在 new_string、回覆無標記 → 仍攔截）、K2（標記在回覆文字 → 放行），取代原 J5/J6 的含糊說法。 |
| #5 排除 old_string 令「清空財務紀錄」放行 | MINOR | **拒絕（附誠實記錄）** | 反證：handoff.md／decisions.md 的 Edit 常態以含財務欄位的舊段落做 `old_string` 錨點並替換（每次便攜塊輪轉、D83 handoff 更新皆如此），若 `old_string` 含 FIN_COLUMNS 即觸發，誤觸率近乎 100%，正是 A2 批評 #3（D83）警告的「逼 AI 濫用豁免」。純刪除財務紀錄屬修復路徑之一（如剔除錯誤結論），且 git 可回溯。**不隱瞞**：此盲區保留，寫入 D84「未覆蓋面」：①純刪除 ②Bash／Python 寫檔（transcript 內 fix2.py 即此類）③subagent 側鏈代寫 ④豁免理由真偽無法機驗。 |

## 3. 執行確認清單（最多 10 項）
- [ ] `scripts/hooks/stop-finance-auditor.js` → v1.2.0：`financeSignal` 加 Write/Edit/MultiEdit 兩條款＋`writtenText()` 型態防禦＋路徑正則限定（FIN_DOCS 增補 `FHS_Cost_System_Overview`）；頭註寫明「標記只認回覆文字」「不掃 old_string」「已知未覆蓋面」。
- [ ] `scripts/hooks/test/run-finance-stop-fixtures.js` → 新增 H1-H6（同義變體，攔截）、J1-J9（邊界，放行；含 old_string 排除、型態防禦、路徑限定）、K1-K2（標記作用域）＋P5 進程級真實轉錄截斷；既有 35 不退化。
- [ ] 真實重播：`node scripts/hooks/test/run-finance-stop-fixtures.js <275997f1…jsonl>` v1.1.0 vs v1.2.0 對照，列出 no-signal→block 翻轉輪次，並統計 44 個 prompt 邊界新增攔截數（＝誤觸率實測）；核對含錯誤4 字句輪次（idx 2099／2190 所屬 turn）在翻轉集內。若含該字句之輪次**不**在翻轉集內，須如實記錄並停下回報，不得調整規則去遷就。
- [ ] 驗收派 fresh-context agent 獨立重跑夾具＋重播（第三紅線；本改動非財務數字，不派 finance-auditor）。
- [ ] `.fhs/notes/decisions.md` 新增 D84（含批評處理摘要＋未覆蓋面四項）。
- [ ] `.fhs/memory/handoff.md`：清除 D83-follow 待辦，補 D84 一句；`Changelog.md` 加條目。
- [ ] `.fhs/reports/completion/2026-09-24_finance-stop-hook-write-signal_completion_report.md`（新）。
- [ ] 部署：hook 為 repo 內 `scripts/hooks/`，`.claude/settings.json` 接線不變；主倉需 merge 此 worktree 分支後才對其他 session 生效（worktree 內先跑通測試）。

## 4. 批准提示
輸入 `/execute` 開始執行。
