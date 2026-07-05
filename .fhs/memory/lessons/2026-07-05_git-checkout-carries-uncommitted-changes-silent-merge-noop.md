# Git checkout 攜帶未提交修改，導致 feature branch merge 靜默空合併

**日期**：2026-07-05（Session 144）
**來源**：知識工作流程健檢任務執行完 `/execute` 後，merge `feature/knowledge-workflow-hygiene` 進 main 時發現

## 問題

用 Edit/Write 工具對 8 個檔案做修改前，先 `git checkout -b feature/knowledge-workflow-hygiene` 建了分支，但完成所有編輯後**忘記 `git add` + `git commit`**，就直接對 Fat Mo 回報「已在分支上完成」。Fat Mo 確認後執行 `git checkout main && git merge feature/knowledge-workflow-hygiene --no-ff`，git 回報 `Already up to date. Already up to date.`——一次看似正常的空操作，實際上是**這條分支從頭到尾沒有任何獨立 commit**，跟 main 完全相同。

## 根因

`git checkout <branch>` 只要目標分支的檔案內容跟工作區未提交修改不衝突，就會**允許未提交的修改原封不動跟著切過去**，不會報錯也不會提示。所以「建分支→編輯→checkout main→merge」這個順序，看起來每一步都成功，唯一的破綻是 merge 訊息異常地平淡（`Already up to date` 而非正常合併應有的 diffstat 輸出）。

## 診斷步驟

1. 注意到 `git merge --no-ff` 對一個「應該有實質改動」的分支回報 `Already up to date`——這是不正常的，正常 `--no-ff` merge 應輸出檔案異動統計。
2. `git log feature/knowledge-workflow-hygiene --oneline -3` 確認該分支最新 commit 跟 main 完全相同，證實零獨立 commit。
3. `git status --porcelain` 確認所有預期的 8 個檔案改動仍以「未提交」狀態存在於工作區（未遺失，只是沒進版本控制）。

## 修復

`git checkout feature/knowledge-workflow-hygiene`（未提交修改跟著回去）→ `git add` 8 個檔案 → `git commit` → `git checkout main` → 重跑 `git merge --no-ff`（這次才是真正的合併，輸出正確 diffstat）。

## 可複用教訓

**「建了分支」≠「東西已經進分支」**。用 Edit/Write 工具做完一批改動後，只要打算切分支或宣告完工，**先 commit 再說**——不要等到 merge 前才做。判斷 merge 是否為空操作的訊號：`--no-ff` 模式下若輸出只有 `Already up to date`（沒有 diffstat），必須立即 `git log <branch> --oneline` 核對該分支是否真有獨立 commit，不能只看「merge 指令沒報錯」就當作合併成功。

見 [[2026-07-05_git-checkout-carries-uncommitted-changes-silent-merge-noop]] learnings.md Pitfall #21（新增，因 #21 起原有 Pitfall 需檢視是否需退役維持 50 條上限）。
