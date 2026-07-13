# Worktree/branch mismatch 導致 migration 檔名衝突（S171 續，2026-07-13）

## 背景

執行「修復 `Write Alerts` 節點 `on_conflict` 缺陷」任務時（見 `FHS_System_Logic_Overview.md` §11.9、`decisions.md` D33），session 被指派在 git worktree（`.claude\worktrees\brave-jennings-a47074`，分支 `claude/brave-jennings-a47074`）下工作，但所有 Bash/Write/Edit 呼叫實際都用了主 checkout 的絕對路徑（`D:\...\freehandsss_dashboard`，分支 `main`），直到快跑完（migration 已 apply 到 live Supabase、n8n 已 PUT 部署）才因 fresh-context code-reviewer 抓出「migration 編號 0054 重複」才發現走錯目錄。

## 根因

1. **路徑習慣慣性**：對話開場的 git status 顯示了 worktree 路徑，但實際下指令時憑印象/慣性用了「主 repo」這個更熟悉的路徑字串，兩者外觀相似（只差一段 `.claude\worktrees\<name>` 後綴），沒有每次呼叫前核對 `pwd`/`git branch --show-current`。
2. **併行協作沒有偵測**：另一個 session（或使用者本人）在同一時段直接對 `main` 分支 commit 了一整段「P2b」工作（`c4b934a`），恰好用掉了 `0054`/`0055` 這兩個 migration 編號——而本 session 稽核 migration 編號時，是照 session 開場 handoff 便攜塊的「P2b 排隊未執行」舊快照認定 0054 空號，而非即時 `ls supabase/migrations/` 核對檔案系統當下真實狀態。

## 影響範圍與為何沒有更糟

- **Live Supabase 未受影響**：`apply_migration` 用 timestamp-based version（如 `20260713091833`），不看檔名數字前綴，故即使本地檔名衝突，實際套用到生產環境的 migration 版本沒有衝突或覆寫。
- **Live n8n 未受影響**：PUT 部署的是「當下建置出的 JSON 內容」，內容正確（`on_conflict` 參數對），與所在 checkout 的 git 分支狀態無關。
- **唯一實際受損的是本地檔案系統/git 狀態**：主 checkout 多了一個不該存在的 untracked migration 檔 + 一個 modified build script（未 commit，未推送，未影響其他人）；worktree 分支落後 main 一個 commit（P2b），若不同步就繼續在舊分支上加新 commit，未來合併回 main 時會產生非必要的分叉。

## 修復動作

1. `git merge --ff-only main`（在 worktree 內）把 worktree 分支快轉到 main 最新 commit（純 fast-forward，worktree 本身無未提交修改，安全操作，無資料遺失風險）。
2. 把兩個誤植的檔案改動（build script 的 URL 修改、新 migration SQL）重新在正確的 worktree 路徑下套用，migration 編號因 0054/0055 已被 P2b 佔用而改為 **0056**。
3. `git checkout -- <file>` + `rm` 把主 checkout 恢復回乾淨的已 commit 狀態（這是自己這個 session 造成的誤植，非使用者既有工作，故可安全清理；清理前已用 `git status --short` 確認主 checkout 除了這兩處以外沒有其他未提交異動）。
4. Worktree 本身沒有 `.env`（被 `.gitignore` 排除，`git worktree add` 不會複製 untracked 檔案），導致本地建置腳本一度讀到 `SUPABASE_URL=undefined`——從主 checkout 複製一份 `.env` 過去解決（純本地便利檔，不進 git）。

## 教訓（給未來 session）

- **多 session / 多 worktree 併行時，任何會寫檔案或跑會影響檔案系統的指令之前，先確認 `pwd` 或所用絕對路徑，是否確實落在「這次任務被指派的那個 worktree」**，尤其當使用者環境明確列出「你正在 worktree 中操作」時——不要因為主 repo 路徑看起來更「正常」就無意識地用它。
- **Migration 編號不可信任記憶或 session 開場快照**：套用/建立新 migration 前，永遠先即時 `ls supabase/migrations/` 核對檔案系統當下真實狀態，尤其在已知有其他 session 可能併行工作的專案（本專案 handoff.md 常見「S171 續」「另一 session 同步 commit」等併行跡象）。
- **Supabase migration 用 timestamp 而非檔名數字前綴做版本控制，是此類意外的天然防線**——但這只保護了「生產環境資料庫版本一致性」，不保護「本地 repo 檔案命名整潔」，兩者是獨立的失敗模式，不能互相替代驗收。
- Fresh-context code-reviewer（哪怕只是 haiku 等級）在此案例中是唯一抓出這個問題的機制——自我驗收（同一 session 檢查自己剛做的事）很可能因為「我以為我在正確目錄」的錯誤前提從未觸發懷疑。這再次印證 CLAUDE.md 紅線「驗收不自驗」的價值，即使任務本身看似與「巨檔/財務/schema」無直接關聯，只要涉及 migration/n8n 部署就該套用。

## 相關

- `FHS_System_Logic_Overview.md` §11.9（Write Alerts on_conflict 修復本體記錄）
- `decisions.md` D33
- `.fhs/memory/lessons/INDEX.md` 2026-07-05 條目（`git checkout` 靜默攜帶未提交修改跨分支）——同屬「git 操作前先核對當下狀態」家族教訓，可對照參考。
