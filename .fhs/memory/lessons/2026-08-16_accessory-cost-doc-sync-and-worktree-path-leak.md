# 2026-08-16 — accessory_cost 文件補漏 + Git Worktree 絕對路徑事故

## 背景

Fat Mo 指令：D64 修復 `sync_order_to_mirror` RPC 嘅 `accessory_cost` 回歸時，grep sweep 發現一個更早、獨立嘅文件缺口（2026-07-25 `accessory_cost` 首次導入時遺留，同 D64 RPC 回歸無關）——`finance-auditor.md`、`database-reviewer.md` 兩個 subagent 定義檔案，以及 `FHS_Pricing_Bible.md` §8，成本分類彙總公式/SKU 推導表/NULL 檢查清單/報告範本全部只列三分類（`handmodel_cost`/`keychain_cost`/`necklace_cost`），從未納入 `accessory_cost` 第四分類。

## 執行內容

1. 依 finance-gatekeeper §三B 前置紀律：完整方程式先行（讀 migration 0079/0080 定案 rollup 公式）→ 對齊已驗證先例（`FHS_Finance_Bible.md` 既有正確定義）→ grep sweep 全 repo 掃 `handmodel_cost.*keychain_cost.*necklace_cost` pattern。
2. 補齊 Fat Mo 指名嘅 3 份文件（finance-auditor.md 5處、database-reviewer.md 5處、Pricing Bible §8）。
3. grep sweep 額外揪出 3 個唔喺原指名清單、但屬 §三B 第4步「必查清單」硬性要求嘅缺口：`FHS_Finance_Bible.md`（L1，§九驗證公式同 §三內部自相矛盾，一個已喺 D46 補過一個冇）、`finance-gatekeeper/SKILL.md`（§三死線第2條）、`n8n/Quadruple_Sync_Field_Map.md`（禁止寫入表）。
4. 派 fresh-context subagent 獨立覆核全部 7 份文件——**第一輪覆核失敗**（詳見下方事故段落），第二輪 7/7 PASS，一個版本號漏升已修。
5. 額外發現 2 個確認嘅獨立 bug，唔喺本次範圍內修，各自 `spawn_task` 交獨立 session：
   - Dashboard `loadMode2Items()`（`current.html`/`V42.html` 約第12162行）REST select 漏咗 `accessory_cost`
   - `scripts/hooks/pre-tool-guard.js`/`post-tool-kgov.js` 兩個財務內容偵測 regex 未包含 `accessory_cost`

## 事故：Git Worktree 絕對路徑漏前綴，全部改動一開始落錯主倉

**根因**：Session 由第一個 Read tool call 開始，就用「主倉根路徑」（`D:\...\freehandsss_dashboard\<relpath>`）起頭嘅絕對路徑，完全冇加 system prompt 明確指定嘅 `Primary working directory` 前綴（`D:\...\freehandsss_dashboard\.claude\worktrees\<worktree-name>\<relpath>`）。因為 worktree 同主倉係同一 repo 嘅兩個獨立 checkout，主倉路徑本身真實存在，Read/Edit/Grep 全部靜默成功、冇任何錯誤訊息——連續 7 個檔案、20+ 次 Edit 呼叫全部落錯咗去主倉（`main` branch），worktree（正確嘅 feature branch `claude/wonderful-lamport-197904`）全程零改動。

**發現過程**：派第一個 fresh-context subagent 做獨立覆核時，同一個路徑構造錯誤重演——subagent 冇被明確指定絕對路徑，佢自己都讀主倉、見主倉 `git status` 乾淨、匯報「全部改動都唔存在」。呢個「假失敗」報告反而揭發咗真正問題（主 agent 自己嘅路徑錯），並非揭發文件本身有漏洞。

**修復**：
1. 分別確認主倉嗰批改動（`.fhs/ai/FHS_Finance_Bible.md` 等 7 個檔）100% 屬本 session 自己造成（`git status --short` 逐項核對，冇夾埋第三方未 commit 改動）。
2. `cp` 逐個檔案內容搬去正確嘅 worktree 路徑。
3. `git checkout -- <files>`（精準列檔名，唔用 `git checkout .`）將主倉逐檔還原返原本已 commit 嘅狀態。
4. 重新驗證兩邊 `git status`：worktree 有齊7個改動、主倉乾淨。
5. 重派 fresh-context subagent，呢次 prompt 明確寫低完整絕對路徑並要求佢用 `git branch --show-current` 自證先開始查——第二輪 7/7 PASS。

**制度落盤**：
- 個人 auto-memory `feedback_worktree_bash_cd_path_leak.md` 已擴充「變體B」（原記錄只有 cd 觸發嘅變體A）。
- 本 repo `learnings/tooling.md` Pitfall #6（`@tooling +governance`）。
- `learnings/governance.md` Pitfall #6：finance-gatekeeper §三B 必查清單本身有盲點（未列 subagent 定義檔），建議補加待 Fat Mo 確認（未自行改動，因 05_maintenance-protocol.md 權限矩陣未明確覆蓋此檔）。

## Subagent 使用記錄

✅ 兩次 fresh-context `general-purpose` Agent 獨立覆核（第一次因主 agent 自己路徑錯誤而誤報失敗，第二次成功 7/7 PASS）；✅ 兩次 `spawn_task` 分派範圍外發現（Dashboard select 缺口、hook regex 缺口）。
