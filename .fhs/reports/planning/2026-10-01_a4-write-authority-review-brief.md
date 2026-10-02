# 交新 session `/8d` 審視：A4（Codex）寫入權規則重設

> 撰寫：A3（Claude Code），2026-10-01。性質：**審視輸入報告，非決策**。本檔唔改任何規則；結論須由新 session 經 `/8d` 分析後，按 `05_maintenance-protocol.md` 提案格式交 Fat Mo 拍板。

## 1. Fat Mo 原話（2026-10-01）

> 「我叫 A4 就執行，代表授權它處理，不再代表衝突：AGENTS.md §7 規則 7 規定 A4（Codex）只審不改。因為其實這原意是執行 /cl-flow-g 是用的，但有時基於 usage limit 或各 model 特質，這規則變得很麻煩及限制。」

## 2. 現行條文（原文位置）

- `AGENTS.md` §7 角色表：A4 GPT＝「**只審不改**；無裁決權」。
- §7 規則 7：「A4 不得執行任何寫入類指令（`/execute`、`/commit`、`/upload-web`、`/db-query`、`/new-product` 等）。同一時間只容許一個主要寫入者。」
- §7 規則 9：D101 有時效例外指針（已失效）。
- `decisions.md` D98／D99（A4 定位、/cl-flow-g）、D101、D102（兩次一次性例外，同日連開）。
- `.fhs/ai/commands/a4-review.md`、`cl-flow-g.md`（A4 審查流程）。

## 3. 觀察到嘅摩擦（證據）

1. **同一日兩次開例外**（D101、D102）：每次都要拷問→落 decisions→改／唔改 AGENTS 指針→失效條款，行政成本高於修復本身。
2. **規則原意 vs 實際用途錯位**：「只審不改」係為 `/cl-flow-g` 嘅獨立審查（審者≠作者）而設；Fat Mo 實際亦會將 A4 當**替代實作者**用（Claude usage limit、Codex 對某類 bug 更擅長）。
3. **規則 9 寫明「不得援引做其他任務」**，令每次都要新編號，D 號膨脹。

## 4. 必須保留嘅保護（審視時唔可以丟）

| 保護 | 為何存在 |
|---|---|
| 審者≠作者 | A4 寫嘅代碼，A4 唔可以自己審；需 A3 或另一 fresh-context 審（Rule 3.17「驗收不自驗」） |
| 單一寫者 | 同一時間兩個 agent 改同一檔會互相覆寫（§7 規則 7 後半） |
| Codex 寫入不經 hook 守護 | §7 規則 3：Codex 端 hook 未證明生效 → 財務守衛、kgov、`.deploy-ok` 機制全部旁路 |
| 生產部署／資料庫／財務 | `current.html` 授權、`finance-auditor` 必派、migration 落 repo 等硬規則 |

## 5. 候選方案（供 `/8d` 評估，A3 未裁決）

- **方案 α：角色由任務決定**——A4 預設「只審」；Fat Mo 明確說「交 A4 執行／叫 A4 做」即視為授權 A4 為**本任務實作者**，此時 A3 自動轉為審查者。固定護欄：獨立 worktree／分支、不部署、不碰 DB／n8n／財務檔、不執行寫入類指令、A3 逐行審 diff＋測試。毋須逐次開 D 號，只需喺任務報告記錄。
- **方案 β：白名單常設例外**——A4 可寫範圍常設白名單（例：`Freehandsss_Dashboard/*.html` dev 版＋`scripts/tests/`），白名單外仍需逐次批。
- **方案 γ：維持現狀**，但將例外流程簡化成一行模板（不改 AGENTS，只在 decisions 追加）。

## 6. 請 `/8d` 重點檢查

1. α 嘅「Fat Mo 明確說」判定：點樣防 A3／A4 從間接文字推斷授權（參照 §3 `.deploy-ok` 只認直接回覆嘅寫法）。
2. A4 實作時 Codex 不經 hook：哪些硬規則會失守？需否在交付包強制列「A4 不可碰清單」？
3. 對 `/cl-flow-g`、`a4-review.md` 報告效力三級（§7 規則 2）嘅連鎖影響：A4 做作者時，誰做獨立審查？效力級別點寫？
4. `CLAUDE.md` 路由表、根 `AGENTS.md`、`ANTIGRAVITY.md`、`fatmo-ops-quickcard.md` 需同步嘅指針。
5. D101／D102 例外條款同 §7 規則 9 嘅收尾（保留歷史 vs 改指針）。

## 7. 輸出要求

新 session 產出：現行條文原文 → 建議新條文 → 動機 → 影響面（`05_maintenance-protocol.md` §提案格式）；等 Fat Mo 確認先改 AGENTS.md（憲法層改動需 Fat Mo 確認＋版本號＋CHANGELOG）。
