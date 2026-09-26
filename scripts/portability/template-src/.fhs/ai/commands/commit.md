# /commit — 驗收後提交

**依賴**：Git、專案 `.fhs/ai/AGENTS.md`、`.fhs/memory/handoff.md`；可選 `.fhs/notes/decisions.md`、`docs/repo-map.md`、`CHANGELOG.md`。
**不可攜平台**：無；遠端推送只在專案已設定 remote 且得到授權時執行。

1. 讀 `git status --short` 與 diff，辨認本次範圍、未追蹤檔及其他人改動。確認驗收證據，未完成的必要測試先補做。
2. 做文件同步檢查：結構變更對 repo map/README，行為變更對 CHANGELOG，跨 session 狀態對 handoff；決策只寫入已確定事項。便攜摘要保持精簡，明細放在其對應章節。
3. 搜尋意外憑證、私密資料、產物快取及不該納入的檔案。只 stage 本次任務檔案，核對 `git diff --cached`；不可用一條全量 stage 命令掩蓋範圍。
4. 用描述改動的訊息提交。若 hook 拒絕，讀完整錯誤並修復原因；不得繞過檢查。提交後記錄完整 SHA。
5. 如本次包含推送授權，先確認遠端及目標分支，再正常 push；不強推。以 `git ls-remote` 或等效遠端查詢核對 SHA。部署或合併按專案另訂流程，不從 `/commit` 名稱推定授權。
6. 回報提交 SHA、分支、測試、文件同步、推送結果與留待跟進事項。失敗時保留現場，說明哪一步未完成。
